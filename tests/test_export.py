import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock

from idealab_login import APIError
from idealab_login.export import export_all_profiles


class ExportTests(unittest.TestCase):
    def test_export_retains_details_and_can_resume_without_refetching(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'all.json'
            client = Mock(BASE_URL='https://api.inno-com.org/v1')
            client.candidates.return_value = {'data': [{'id': 'a', 'display_name': 'A'}], 'total': 1}
            client.profile.return_value = {'id': 'a', 'linkedin_url': 'https://linkedin.com/in/a?utm=x', 'bio': 'Example'}
            result = export_all_profiles(client, path)
            self.assertTrue(result['complete'])
            self.assertEqual(result['profiles'][0]['profile']['bio'], 'Example')
            self.assertEqual(result['summary']['linkedin_urls'], 1)
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            self.assertEqual(json.loads(path.read_text())['summary'], result['summary'])
            export_all_profiles(client, path, resume=True)
            self.assertEqual(client.profile.call_count, 1)
            with self.assertRaises(ValueError):
                export_all_profiles(client, path)

    def test_failed_export_saves_progress_and_resumes(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'all.json'
            client = Mock(BASE_URL='https://api.inno-com.org/v1')
            client.candidates.return_value = {'data': [{'id': 'a'}, {'id': 'b'}], 'total': 2}
            client.profile.side_effect = [{'id': 'a'}, APIError('Expired', 401)]
            with self.assertRaises(APIError):
                export_all_profiles(client, path)
            saved = json.loads(path.read_text())
            self.assertFalse(saved['complete'])
            self.assertEqual(saved['summary']['enriched'], 1)
            client.profile.side_effect = None
            client.profile.return_value = {'id': 'b'}
            result = export_all_profiles(client, path, resume=True)
            self.assertTrue(result['complete'])
            self.assertEqual(result['summary']['enriched'], 2)
            self.assertNotIn('error', result['profiles'][1])

    def test_wrong_profile_id_is_not_attached(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'all.json'
            client = Mock(BASE_URL='https://api.inno-com.org/v1')
            client.candidates.return_value = {'data': [{'id': 'a'}], 'total': 1}
            client.profile.return_value = {'id': 'b'}
            with self.assertRaises(APIError):
                export_all_profiles(client, path)
            self.assertIsNone(json.loads(path.read_text())['profiles'][0]['profile'])
