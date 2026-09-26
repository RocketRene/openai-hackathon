"""Resumable export of all candidates enriched with their API profile details."""
import json
import os
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

from . import APIError
from .candidates import linkedin_url


def _now():
    return datetime.now(timezone.utc).isoformat()


def _save(path, document):
    path = Path(path)
    fd, temporary = tempfile.mkstemp(prefix='.idealab-', suffix='.json', dir=path.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as file:
            json.dump(document, file, ensure_ascii=False, indent=2)
            file.write('\n')
            file.flush()
            os.fsync(file.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def _read(operation):
    for attempt in range(3):
        try:
            return operation()
        except APIError as exc:
            if attempt == 2 or (exc.status is not None and exc.status not in {429, 500, 502, 503, 504}):
                raise
            time.sleep(2 ** (attempt + 1))


def export_all_profiles(client, output, *, resume=False, progress=None):
    """Export every listed candidate; retain raw list and profile data.

    Resuming skips successfully fetched or inaccessible profiles, retries other
    failures, and resumes pagination after the last saved page. No LinkedIn pages
    are fetched: enrichment is from the full IdeaLab profile endpoint only.
    """
    path = Path(output).resolve()
    if path.exists():
        if not resume:
            raise ValueError('Output exists; use resume=True to continue that export.')
        document = json.loads(path.read_text(encoding='utf-8'))
        if document.get('format') != 'idealab-enriched-profiles-v1':
            raise ValueError('Not an IdeaLab enriched profile export.')
    else:
        document = {'format': 'idealab-enriched-profiles-v1', 'source': client.BASE_URL,
                    'started_at': _now(), 'updated_at': _now(), 'complete': False,
                    'discovery_complete': False, 'next_page': 1, 'page_size': 50,
                    'api_total': None, 'profiles': []}
        _save(path, document)
    records = document['profiles']
    seen = {row['id'] for row in records}

    def save():
        document['updated_at'] = _now()
        document['summary'] = {
            'candidates': len(records),
            'enriched': sum(row['status'] == 'enriched' for row in records),
            'linkedin_urls': sum(bool(row.get('linkedin_url')) for row in records),
            'inaccessible': sum(row['status'] == 'inaccessible' for row in records),
            'failed': sum(row['status'] == 'failed' for row in records),
            'pending': sum(row['status'] == 'pending' for row in records),
        }
        _save(path, document)

    try:
        while not document['discovery_complete']:
            page = document['next_page']
            result = _read(lambda: client.candidates(page=page, limit=document['page_size']))
            if not isinstance(result, dict) or not isinstance(result.get('data'), list):
                raise APIError('Candidate response must contain a data list.')
            items = result['data']
            total = result.get('total')
            document['api_total'] = total
            new_count = 0
            for candidate in items:
                if not isinstance(candidate, dict) or not candidate.get('id'):
                    raise APIError('Candidate record is missing its ID.')
                profile_id = str(candidate['id'])
                if profile_id not in seen:
                    seen.add(profile_id)
                    new_count += 1
                    records.append({'id': profile_id, 'candidate': candidate, 'profile': None,
                                    'linkedin_url': None, 'status': 'pending'})
            document['next_page'] = page + 1
            document['discovery_complete'] = not items or (isinstance(total, int) and len(seen) >= total)
            if items and not new_count and not document['discovery_complete']:
                raise APIError('Pagination repeated without reaching the reported total.')
            save()
            if progress:
                progress(f'Discovered {len(records)} candidates (API total: {total}).')
        for index, row in enumerate(records):
            if row['status'] in {'enriched', 'inaccessible'}:
                continue
            try:
                profile = _read(lambda: client.profile(row['id']))
                if not isinstance(profile, dict) or str(profile.get('id')) != row['id']:
                    raise APIError('Profile response ID does not match the candidate.')
            except APIError as exc:
                row['status'] = 'inaccessible' if exc.status in {403, 404} else 'failed'
                row['error'] = {'http_status': exc.status, 'message': str(exc)}
                if row['status'] == 'failed':
                    raise
            else:
                row.update(profile=profile, linkedin_url=linkedin_url(profile.get('linkedin_url')),
                           status='enriched', fetched_at=_now())
                row.pop('error', None)
            if (index + 1) % 20 == 0:
                save()
                if progress:
                    progress(f'Processed {index + 1}/{len(records)} profiles; '
                             f'{document["summary"]["linkedin_urls"]} LinkedIn URLs.')
        document['complete'] = all(row['status'] in {'enriched', 'inaccessible'} for row in records)
        return document
    finally:
        save()
