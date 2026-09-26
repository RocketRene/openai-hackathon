"""Enrich the existing JSON with direct HTTPS calls to RapidAPI."""
import argparse
import asyncio
from collections import Counter
from contextlib import contextmanager
import fcntl
import json
import os
from pathlib import Path
import sys
import time
from urllib.parse import unquote, urlsplit, urlencode
from urllib.request import Request, build_opener
from urllib.error import HTTPError, URLError

from . import _NoRedirects
from .candidates import linkedin_url
from .export import _now, _save

TOOL = 'Get_Profile_Data_By_URL'
PROVIDER = 'linkedin-data-api.p.rapidapi.com'
ENDPOINT = f'https://{PROVIDER}/get-profile-data-by-url'
DEFAULT_FILE = Path(__file__).resolve().parent.parent / 'exports' / 'all-enriched-profiles.json'


class EnrichmentError(Exception):
    def __init__(self, kind, *, retryable=False, fatal=False):
        super().__init__(kind)
        self.kind, self.retryable, self.fatal = kind, retryable, fatal


def provider_error(text):
    """Classify provider errors without saving possibly sensitive raw messages."""
    text = text.lower()
    if any(word in text for word in ('quota', 'subscription', 'subscribe', 'credit', 'payment', 'billing', 'monthly', 'daily limit')):
        return EnrichmentError('quota_or_subscription', fatal=True)
    if any(word in text for word in ('401', '403', 'unauthorized', 'forbidden', 'invalid api key')):
        return EnrichmentError('authentication_or_access', fatal=True)
    if any(word in text for word in ('429', 'rate limit', 'too many requests')):
        return EnrichmentError('rate_limited', retryable=True, fatal=True)
    if any(word in text for word in ('404', 'not found', 'does not exist', 'private profile')):
        return EnrichmentError('profile_unavailable')
    if any(word in text for word in ('500', '502', '503', '504', 'timeout', 'timed out', 'temporarily')):
        return EnrichmentError('provider_unavailable', retryable=True)
    return EnrichmentError('provider_error')


def parse_profile(result, url):
    """Handle direct HTTP JSON (or prior MCP results) and validate identity."""
    if hasattr(result, 'model_dump'):
        result = result.model_dump(mode='json', by_alias=True)
    if not isinstance(result, dict):
        raise EnrichmentError('invalid_profile_response')
    texts = [block.get('text', '') for block in result.get('content', []) if block.get('type') == 'text']
    if result.get('isError'):
        raise provider_error(' '.join(texts))
    data = result if not any(k in result for k in ('content', 'structuredContent', 'isError')) else result.get('structuredContent')
    if not isinstance(data, dict):
        data = None
        for text in texts:
            try:
                candidate = json.loads(text)
            except ValueError:
                continue
            if isinstance(candidate, dict):
                data = candidate
                break
    if not isinstance(data, dict):
        raise provider_error(' '.join(texts))
    if data.get('success') is False or data.get('status') is False or data.get('error'):
        raise provider_error(json.dumps(data))
    if isinstance(data.get('data'), dict):
        data = data['data']
    if not data.get('username') or not (data.get('id') or data.get('urn')):
        raise provider_error(json.dumps(data))
    expected = unquote(urlsplit(url).path).strip('/').split('/')[-1].casefold()
    if unquote(str(data['username'])).casefold() != expected:
        raise EnrichmentError('profile_identity_mismatch')
    return data


def success_record(url, data):
    return {'status': 'enriched', 'source_url': url, 'provider': PROVIDER,
            'endpoint': ENDPOINT, 'transport': 'https', 'fetched_at': _now(), 'data': data}


def prepare(document):
    if document.get('format') != 'idealab-enriched-profiles-v1' or not isinstance(document.get('profiles'), list):
        raise ValueError('Expected an idealab-enriched-profiles-v1 JSON file.')
    pending = []
    for row in document['profiles']:
        url = linkedin_url(row.get('linkedin_url') or (row.get('profile') or {}).get('linkedin_url'))
        previous = row.get('linkedin_enrichment') or {}
        if not url:
            row['linkedin_enrichment'] = {'status': 'skipped', 'reason': 'no_valid_linkedin_url'}
        elif (previous.get('status') == 'enriched' and previous.get('source_url') == url
              and isinstance(previous.get('data'), dict) and previous['data'].get('username')):
            continue
        else:
            if previous.get('status') == 'enriched':
                row['linkedin_enrichment'] = {'status': 'pending', 'source_url': url}
            pending.append((row, url))
    return pending


def save_document(path, document, *, run_status):
    counts = Counter((row.get('linkedin_enrichment') or {}).get('status', 'pending') for row in document['profiles'])
    document['linkedin_enrichment'] = {
        'provider': PROVIDER, 'endpoint': ENDPOINT, 'transport': 'https', 'updated_at': _now(), 'run_status': run_status,
        'complete': counts['pending'] == 0 and counts['failed'] == 0,
        'counts': {key: counts[key] for key in ('enriched', 'skipped', 'failed', 'pending')},
    }
    document['updated_at'] = _now()
    _save(path, document)


@contextmanager
def file_lock(path):
    lock_path = str(path) + '.linkedin.lock'
    fd = os.open(lock_path, os.O_RDWR | os.O_CREAT, 0o600)
    try:
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise ValueError('Another enrichment process is already using this file.') from None
        yield
    finally:
        os.close(fd)


def duration(seconds):
    if seconds is None:
        return '--:--'
    seconds = max(0, int(seconds))
    hours, seconds = divmod(seconds, 3600)
    minutes, seconds = divmod(seconds, 60)
    return f'{hours:02d}:{minutes:02d}:{seconds:02d}'


class Progress:
    def __init__(self, total, *, stream=None):
        self.total, self.done, self.errors = total, 0, 0
        self.stream = stream or sys.stderr
        self.start = time.monotonic()
        self.note = 'Starte HTTP-Abrufe'
        self.stopped = False

    def render(self):
        elapsed = time.monotonic() - self.start
        eta = elapsed / self.done * (self.total - self.done) if self.done else None
        fraction = self.done / self.total if self.total else 1
        filled = int(fraction * 24)
        line = (f'[{"#" * filled}{"-" * (24 - filled)}] {fraction:6.1%} '
                f'{self.done}/{self.total} | Zeit {duration(elapsed)} | Rest ~{duration(eta)} '
                f'| Fehler {self.errors} | {self.note}')
        tty = self.stream.isatty()
        print(('\r\033[2K' if tty else '') + line, end='' if tty else '\n', file=self.stream, flush=True)

    async def run(self):
        while not self.stopped:
            self.render()
            await asyncio.sleep(0.5 if self.stream.isatty() else 10)

    def finish(self):
        self.stopped = True
        self.render()
        if self.stream.isatty():
            print(file=self.stream)


async def process_profiles(document, path, pending, fetch, progress, *, requests_per_minute=60, retries=2):
    """Checkpoint after each response; retry only transient read failures."""
    next_request = 0.0
    cache = {row['linkedin_enrichment']['source_url']: row['linkedin_enrichment']
             for row in document['profiles']
             if (row.get('linkedin_enrichment') or {}).get('status') == 'enriched'}
    for row, url in pending:
        if url in cache:
            row['linkedin_enrichment'] = dict(cache[url])
        else:
            for attempt in range(retries + 1):
                wait = max(0, next_request - time.monotonic())
                if wait:
                    progress.note = 'Warte auf nächstes Anfragefenster'
                    await asyncio.sleep(wait)
                progress.note = f'Profil {progress.done + 1} abrufen'
                next_request = time.monotonic() + 60 / requests_per_minute
                try:
                    result = await fetch(url)
                    data = parse_profile(result, url)
                except asyncio.CancelledError:
                    raise
                except Exception as exc:
                    error = exc if isinstance(exc, EnrichmentError) else EnrichmentError('http_transport_error', fatal=True)
                    if error.retryable and attempt < retries:
                        pause = 30 * (attempt + 1) if error.kind == 'rate_limited' else 2 ** (attempt + 1)
                        progress.note = f'{error.kind}; neuer Versuch in {pause}s'
                        await asyncio.sleep(pause)
                        continue
                    row['linkedin_enrichment'] = {
                        'status': 'failed', 'source_url': url, 'provider': PROVIDER, 'endpoint': ENDPOINT,
                        'attempted_at': _now(), 'error': error.kind,
                    }
                    progress.errors += 1
                    save_document(path, document, run_status='blocked' if error.fatal else 'running')
                    if error.fatal:
                        raise error
                    break
                else:
                    row['linkedin_enrichment'] = success_record(url, data)
                    cache[url] = row['linkedin_enrichment']
                    break
        progress.done += 1
        save_document(path, document, run_status='running')


def load_api_key(config_path, name):
    if os.environ.get('RAPIDAPI_KEY'):
        return os.environ['RAPIDAPI_KEY']
    try:
        import tomllib
    except ImportError:
        import tomli as tomllib
    config = tomllib.loads(config_path.read_text())
    server = config.get('mcp_servers', {}).get(name)
    if not server:
        raise ValueError(f'No API key configured for {name!r} in {config_path}.')
    for arg in server.get('args', []):
        header, separator, value = arg.partition(':')
        if separator and header.lower().strip() in {'x-api-key', 'x-rapidapi-key'}:
            key = value.strip()
            if key.startswith('${') and key.endswith('}'):
                variable = key[2:-1]
                key = os.environ.get(variable) or server.get('env', {}).get(variable, '')
            if key:
                return key
    raise ValueError('Set RAPIDAPI_KEY or configure the rapidapi-linkedin API key.')


class RapidAPIClient:
    """Fixed-origin HTTP client; key is never sent to LinkedIn or redirects."""
    def __init__(self, key, *, timeout=90):
        self._key = key
        self.timeout = timeout
        self._opener = build_opener(_NoRedirects())

    def profile(self, url):
        url = linkedin_url(url)
        if not url:
            raise ValueError('A valid LinkedIn profile URL is required.')
        request = Request(ENDPOINT + '?' + urlencode({'url': url}), headers={
            'X-RapidAPI-Key': self._key, 'X-RapidAPI-Host': PROVIDER,
            'Accept': 'application/json', 'User-Agent': 'idealab-login/0.2.0',
        })
        try:
            with self._opener.open(request, timeout=self.timeout) as response:
                raw = response.read()
        except HTTPError as exc:
            status = exc.code
            with exc:
                detail = exc.read().decode('utf-8', errors='replace')
            raise provider_error(f'{status} {detail}') from None
        except (URLError, OSError, TimeoutError):
            raise EnrichmentError('http_connection_error', retryable=True, fatal=True) from None
        try:
            return json.loads(raw)
        except (ValueError, UnicodeError):
            raise EnrichmentError('invalid_json_response') from None


async def run(args, document, pending):
    client = RapidAPIClient(load_api_key(args.config, args.server), timeout=args.timeout)
    progress = Progress(len(pending))
    ticker = asyncio.create_task(progress.run())
    state = 'interrupted'
    try:
        async def fetch(url):
            return await asyncio.to_thread(client.profile, url)

        await process_profiles(document, args.file, pending, fetch, progress,
                               requests_per_minute=args.requests_per_minute, retries=args.retries)
        state = 'finished'
    except EnrichmentError:
        state = 'blocked'
        raise
    finally:
        save_document(args.file, document, run_status=state)
        progress.note = 'Fertig' if state == 'finished' else 'Gestoppt; Fortschritt gespeichert'
        ticker.cancel()
        try:
            await ticker
        except asyncio.CancelledError:
            pass
        progress.finish()


def main():
    parser = argparse.ArgumentParser(description='Enrich candidate JSON via direct RapidAPI HTTPS calls; resumes automatically.')
    parser.add_argument('--file', type=Path, default=DEFAULT_FILE)
    parser.add_argument('--config', type=Path, default=Path.home() / '.codex' / 'config.toml')
    parser.add_argument('--server', default='rapidapi-linkedin')
    parser.add_argument('--limit', type=int, help='Maximum pending profiles for this run')
    parser.add_argument('--requests-per-minute', type=float, default=60)
    parser.add_argument('--retries', type=int, default=2)
    parser.add_argument('--timeout', type=float, default=90)
    parser.add_argument('--dry-run', action='store_true', help='Show counts without changing JSON or calling the API')
    args = parser.parse_args()
    args.file = args.file.expanduser().resolve()
    args.config = args.config.expanduser().resolve()
    if args.limit is not None and args.limit < 1:
        parser.error('--limit must be positive')
    if args.requests_per_minute <= 0 or args.timeout <= 0 or args.retries < 0:
        parser.error('Rate/timeout must be positive; retries must be nonnegative')
    try:
        with file_lock(args.file):
            document = json.loads(args.file.read_text(encoding='utf-8'))
            pending = prepare(document)
            count = len(pending)
            if args.limit:
                pending = pending[:args.limit]
            print(f'{len(document["profiles"])} Profile; {count} LinkedIn-Abrufe offen; {len(pending)} in diesem Lauf.', file=sys.stderr)
            if args.dry_run:
                return 0
            save_document(args.file, document, run_status='ready')
            if pending:
                asyncio.run(run(args, document, pending))
            else:
                save_document(args.file, document, run_status='finished')
            print(f'Gespeichert: {args.file}', file=sys.stderr)
            print(json.dumps(document['linkedin_enrichment']['counts']), file=sys.stderr)
            return 1 if document['linkedin_enrichment']['counts']['failed'] else 0
    except KeyboardInterrupt:
        print('\nAbgebrochen. Derselbe Aufruf setzt den Lauf fort.', file=sys.stderr)
        return 130
    except Exception as exc:
        # Never print raw transport errors, which could contain credentials.
        kind = exc.kind if isinstance(exc, EnrichmentError) else type(exc).__name__
        print(f'Anreicherung gestoppt ({kind}). Fortschritt bleibt erhalten; Konfiguration/Quota prüfen und erneut starten.', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
