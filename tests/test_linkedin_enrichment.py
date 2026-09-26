import asyncio
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import AsyncMock, patch

from idealab_login.enrich_linkedin import (
    EnrichmentError, Progress, file_lock, parse_profile, prepare,
    process_profiles, save_document, success_record,
)

URL = 'https://www.linkedin.com/in/example'


def response(username='example'):
    return {'content': [{'type': 'text', 'text': json.dumps({'id': 42, 'username': username, 'skills': ['Python']})}]}


def document():
    return {'format': 'idealab-enriched-profiles-v1', 'profiles': [
        {'id': 'one', 'linkedin_url': URL, 'profile': {'bio': 'Original bio'}},
        {'id': 'two', 'linkedin_url': None, 'profile': {}},
    ]}


class ParsingTests(unittest.TestCase):
    def test_text_and_structured_results(self):
        self.assertEqual(parse_profile(response(), URL)['id'], 42)
        structured = {'structuredContent': {'data': {'id': 42, 'username': 'example'}}}
        self.assertEqual(parse_profile(structured, URL)['id'], 42)

    def test_rejects_mismatch(self):
        with self.assertRaises(EnrichmentError) as caught:
            parse_profile(response('someone-else'), URL)
        self.assertEqual(caught.exception.kind, 'profile_identity_mismatch')

    def test_quota_is_not_profile_data(self):
        with self.assertRaises(EnrichmentError) as caught:
            parse_profile({'isError': True, 'content': [{'type': 'text', 'text': 'Monthly quota exceeded secret-key'}]}, URL)
        self.assertTrue(caught.exception.fatal)
        self.assertNotIn('secret', str(caught.exception))

    def test_empty_and_error_responses_fail(self):
        for payload in ({}, {'status': False, 'message': 'Profile not found'}, {'message': 'unknown error'}):
            with self.assertRaises(EnrichmentError):
                parse_profile({'structuredContent': payload}, URL)

    def test_resume_and_no_link(self):
        data = document()
        self.assertEqual(len(prepare(data)), 1)
        self.assertEqual(data['profiles'][1]['linkedin_enrichment']['status'], 'skipped')
        data['profiles'][0]['linkedin_enrichment'] = success_record(URL, parse_profile(response(), URL))
        self.assertEqual(prepare(data), [])

    def test_progress_includes_bar_counts_elapsed_and_remaining(self):
        stream = io.StringIO()
        progress = Progress(10, stream=stream)
        progress.done = 2
        progress.render()
        output = stream.getvalue()
        self.assertIn('20.0%', output)
        self.assertIn('2/10', output)
        self.assertIn('Rest ~', output)
        self.assertIn('Zeit ', output)

    def test_lock_prevents_second_writer(self):
        with tempfile.TemporaryDirectory() as directory:
            with file_lock(Path(directory) / 'data.json'):
                with self.assertRaises(ValueError):
                    with file_lock(Path(directory) / 'data.json'):
                        pass


class ProcessingTests(unittest.IsolatedAsyncioTestCase):
    async def test_saves_in_same_json_preserves_original_and_deduplicates(self):
        data = document()
        data['profiles'].append({'id': 'duplicate', 'linkedin_url': URL})
        pending = prepare(data)
        fetch = AsyncMock(return_value=response())
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'all.json'
            await process_profiles(data, path, pending, fetch, Progress(2, stream=io.StringIO()))
            saved = json.loads(path.read_text())
            self.assertEqual(saved['profiles'][0]['profile']['bio'], 'Original bio')
            self.assertEqual(saved['profiles'][0]['linkedin_enrichment']['data']['skills'], ['Python'])
            self.assertTrue(saved['linkedin_enrichment']['complete'])
            self.assertEqual(fetch.await_count, 1)
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)

    async def test_rate_limit_retries_then_succeeds(self):
        data = document()
        fetch = AsyncMock(side_effect=[EnrichmentError('rate_limited', retryable=True, fatal=True), response()])
        with tempfile.TemporaryDirectory() as directory, patch('idealab_login.enrich_linkedin.asyncio.sleep', new_callable=AsyncMock):
            await process_profiles(data, Path(directory) / 'all.json', prepare(data), fetch,
                                   Progress(1, stream=io.StringIO()))
        self.assertEqual(fetch.await_count, 2)
        self.assertEqual(data['profiles'][0]['linkedin_enrichment']['status'], 'enriched')

    async def test_quota_stops_and_checkpoints(self):
        data = document()
        fetch = AsyncMock(side_effect=EnrichmentError('quota_or_subscription', fatal=True))
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'all.json'
            with self.assertRaises(EnrichmentError):
                await process_profiles(data, path, prepare(data), fetch, Progress(1, stream=io.StringIO()))
            saved = json.loads(path.read_text())
            self.assertFalse(saved['linkedin_enrichment']['complete'])
            self.assertEqual(saved['linkedin_enrichment']['counts']['failed'], 1)
            self.assertEqual(fetch.await_count, 1)

    async def test_cancel_preserves_previously_saved_profiles(self):
        data = document()
        data['profiles'].append({'id': 'next', 'linkedin_url': URL + '-two'})
        fetch = AsyncMock(side_effect=[response(), asyncio.CancelledError()])
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'all.json'
            with self.assertRaises(asyncio.CancelledError):
                await process_profiles(data, path, prepare(data), fetch, Progress(2, stream=io.StringIO()), requests_per_minute=1e9)
            saved = json.loads(path.read_text())
            self.assertEqual(saved['linkedin_enrichment']['counts']['enriched'], 1)
            self.assertEqual(saved['profiles'][0]['linkedin_enrichment']['data']['id'], 42)


class HTTPClientTests(unittest.TestCase):
    def test_direct_http_headers_and_encoded_profile_url(self):
        from unittest.mock import MagicMock
        from idealab_login.enrich_linkedin import RapidAPIClient, ENDPOINT, PROVIDER
        client = RapidAPIClient('test-secret')
        client._opener = MagicMock()
        client._opener.open.return_value.__enter__.return_value.read.return_value = b'{"id":42,"username":"example"}'
        data = client.profile(URL + '?tracking=1')
        request = client._opener.open.call_args.args[0]
        self.assertTrue(request.full_url.startswith(ENDPOINT + '?url='))
        self.assertNotIn('tracking', request.full_url)
        self.assertEqual(request.get_header('X-rapidapi-key'), 'test-secret')
        self.assertEqual(request.get_header('X-rapidapi-host'), PROVIDER)
        self.assertEqual(parse_profile(data, URL)['id'], 42)

    def test_http_quota_error_is_sanitized(self):
        from unittest.mock import MagicMock
        from urllib.error import HTTPError
        from idealab_login.enrich_linkedin import RapidAPIClient
        client = RapidAPIClient('test-secret')
        client._opener = MagicMock()
        client._opener.open.side_effect = HTTPError(URL, 429, 'secret', {}, io.BytesIO(b'monthly quota exceeded test-secret'))
        with self.assertRaises(EnrichmentError) as caught:
            client.profile(URL)
        self.assertEqual(caught.exception.kind, 'quota_or_subscription')
        self.assertNotIn('test-secret', str(caught.exception))

    def test_key_from_environment_needs_no_mcp_config(self):
        from idealab_login.enrich_linkedin import load_api_key
        with patch.dict('os.environ', {'RAPIDAPI_KEY': 'environment-secret'}):
            self.assertEqual(load_api_key(Path('/nonexistent/config.toml'), 'missing'), 'environment-secret')

    def test_key_from_existing_config(self):
        from idealab_login.enrich_linkedin import load_api_key
        with tempfile.TemporaryDirectory() as directory, patch.dict('os.environ', {}, clear=True):
            config = Path(directory) / 'config.toml'
            config.write_text('[mcp_servers.rapidapi-linkedin]\ncommand="npx"\nargs=["--header", "x-api-key: test-secret"]\n')
            self.assertEqual(load_api_key(config, 'rapidapi-linkedin'), 'test-secret')
