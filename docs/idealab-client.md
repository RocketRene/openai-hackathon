# IdeaLab API client

Python 3.10+ client for the IdeaLab API at `https://api.inno-com.org/v1`.
HTTP operations have no runtime dependencies. Passwords are prompted without
echo; credentials and tokens stay in memory. Optional WebSocket support uses
`websockets`.

## Find candidate LinkedIn profiles

```sh
cd /Users/rene/github.com/RocketRene/openai-hackathon
python3 -m idealab_login --linkedin --pages 1 --limit 20
```

The email defaults to `renekuhn@posteo.de`. Override it with `--email` or
`IDEALAB_EMAIL`. Automation can supply `IDEALAB_PASSWORD` through a secret manager.
The command logs out when finished. Status goes to stderr and JSON to stdout.

Candidate summaries do **not** include LinkedIn links. The lookup fetches
`GET /v1/profiles/{id}` for each candidate and reads `linkedin_url`. It validates
LinkedIn profile URL hosts and removes tracking parameters. It does not search
LinkedIn or guess identities. A missing link is reported as `not_provided`;
inaccessible profiles are marked separately. Other errors, including rate limits,
stop the lookup. Page results are deduplicated and the number of profile lookups
is bounded by `--pages * --limit` (limit must be 1–50).

Optional filters: `--role student`, repeated `--interest artificial-intelligence`,
`--segment complement`, and `--page 2`. Filters use the API's own vocabulary.

Save a new export (existing files are never overwritten):

```sh
python3 -m idealab_login --linkedin --pages 2 --limit 20 \
  --output /Users/rene/github.com/RocketRene/openai-hackathon/exports/candidate-linkedin-next.json
```

Create the output directory first if needed. Exports contain only candidate ID,
name, company, role, link, lookup status, and source route. Export files are
created with mode 0600. The directory
`/Users/rene/github.com/RocketRene/openai-hackathon/exports/` is ignored by Git.

## Use the package

```python
from getpass import getpass
from idealab_login import IdeaLabClient
from idealab_login.candidates import find_candidate_linkedin

client = IdeaLabClient()
client.login("renekuhn@posteo.de", getpass("Password: "))
try:
    candidates = client.candidates(page=1, limit=20)
    profile = client.profile(candidates["data"][0]["id"])
    linkedin = profile.get("linkedin_url")
    records = find_candidate_linkedin(client, pages=1, limit=20)
    sessions = client.call("sessions")
    connections = client.call("connections", query={"status": "accepted"})
    calendar_text = client.call("calendar")
finally:
    client.logout()
```

Every catalog endpoint is available through `client.call(name, **options)`:

- `id=...` and `offer_id=...` fill URL-encoded path parameters.
- `query={...}` supplies query parameters; lists become repeated keys.
- `body={...}` supplies JSON verbatim. Write operations require an explicit
  object, including `{}` for an empty body. The source does not specify full
  DTO schemas, so the client does not invent fields or accept/decline semantics.
- Inferred routes are marked in the catalog and are not guaranteed to exist.
- Unresolved routes require `path="verified/relative/path"`. External URLs,
  traversal, query strings in paths, and HTTP redirects are rejected.

For example, `client.call("update_profile", body={"bio": "..."})` updates your
profile, and `client.call("swipe", body={"subject_profile_id": "...",
"direction": "like"})` performs a swipe. Calling write endpoints has real effects;
the live verification only exercised reads and the authentication lifecycle.

`client.upload_avatar(jpeg_bytes, field_name="verified_field", method="POST")`
supports multipart JPEG uploads with POST or PUT. The exact multipart field name
is absent from the reference and must be supplied by the caller.

`client.chat()` returns a synchronous WebSocket connection to `/v1/ws/chat` using
Bearer authentication. Use it as a context manager. The application message
protocol is undocumented; no message commands are invented or sent automatically.
Install the optional dependency with the package's `[chat]` extra.

`client.refresh()` explicitly rotates tokens; it is never automatically retried.
Use it when an authenticated request fails with `APIError.status == 401`, then
retry that request if appropriate. A failed refresh clears local tokens because
the server may already have consumed the old refresh token. Clients are intended
for sequential use, not shared concurrent token refreshes. ETag caching is not
implemented; reads fetch the current response.

## Installation and tests

```sh
python3 -m venv /Users/rene/github.com/RocketRene/openai-hackathon/.venv
/Users/rene/github.com/RocketRene/openai-hackathon/.venv/bin/python -m pip install '/Users/rene/github.com/RocketRene/openai-hackathon[chat]'
/Users/rene/github.com/RocketRene/openai-hackathon/.venv/bin/idealab-login --list-endpoints
cd /Users/rene/github.com/RocketRene/openai-hackathon
python3 -m unittest discover -s /Users/rene/github.com/RocketRene/openai-hackathon/tests -v
```

Omit `[chat]` for HTTP-only use. `python3 -m idealab_login --check-refresh` verifies
login, profile access, refresh, subsequent profile access, and logout.

## Endpoint coverage and verification

The catalog below covers every complete HTTP route in the supplied reference.
Authentication, multipart avatar upload, and WebSocket chat have dedicated methods.
Password setup/verification/reset, push registration, and reminder settings lack
full paths in the reference; these six operations cannot be considered fully
implemented until their paths and payloads are verified. Inferred workshop offer
paths and other inferred operations also need server validation. Write operations,
avatar upload, and WebSocket chat have not been exercised against production.

Live verification on 2026-09-26 confirmed the authentication lifecycle, candidate
listing, and profile detail access. The API reported 569 candidates; the first 20
were checked and 9 had valid LinkedIn URLs. These are API-provided links, not
independently verified LinkedIn identities.

Source reference:
`/Users/rene/github.com/RocketRene/openai-hackathon/idealab_api_doku.md`.
Implementation catalog:
`/Users/rene/github.com/RocketRene/openai-hackathon/idealab_login/endpoints.py`.

| Client call name | Method | API path | Evidence |
|---|---|---|---|
| `profile` | GET | `profiles/{id}` | Documented |
| `update_profile` | PATCH | `profiles/me` | Inferred |
| `block_profile` | POST | `profiles/{id}/block` | Documented |
| `report_profile` | POST | `profiles/{id}/report` | Documented |
| `tickets` | GET | `me/tickets` | Documented |
| `export_data` | GET | `me/export` | Documented |
| `request_export` | POST | `me/export` | Documented |
| `candidates` | GET | `matching/candidates` | Documented |
| `swipe` | POST | `matching/swipes` | Documented |
| `likes` | GET | `matching/likes` | Documented |
| `matching_jobs` | GET | `matching/jobs` | Documented |
| `job_swipe` | POST | `matching/job-swipes` | Documented |
| `job_swipes` | GET | `matching/job-swipes` | Documented |
| `connections` | GET | `connections` | Documented |
| `create_connection` | POST | `connections` | Documented |
| `update_connection` | PATCH | `connections/{id}` | Documented |
| `delete_connection` | DELETE | `connections/{id}` | Documented |
| `meetings` | GET | `meetings` | Documented |
| `create_meeting` | POST | `meetings` | Documented |
| `meeting` | GET | `meetings/{id}` | Documented |
| `update_meeting` | PATCH | `meetings/{id}` | Documented |
| `meeting_suggestions` | GET | `meetings/suggestions` | Inferred |
| `meeting_suggestion` | GET | `meetings/suggestions/{id}` | Inferred |
| `message` | GET | `messages/{id}` | Documented |
| `update_message` | PATCH | `messages/{id}` | Documented |
| `inbox` | GET | `device-inbox/messages` | Documented |
| `ack_inbox` | POST | `device-inbox/messages/ack` | Inferred |
| `read_inbox` | POST | `device-inbox/messages/read` | Inferred |
| `app_config` | GET | `app-config` | Documented |
| `formats` | GET | `formats` | Documented |
| `partners` | GET | `partners` | Documented |
| `speakers` | GET | `speakers` | Documented |
| `stages` | GET | `stages` | Documented |
| `sessions` | GET | `sessions` | Documented |
| `session` | GET | `sessions/{id}` | Documented |
| `saved_sessions` | GET | `saved-sessions` | Documented |
| `calendar` | GET | `saved-sessions/calendar.ics` | Documented |
| `workshops` | GET | `workshops` | Documented |
| `register_workshop` | POST | `workshops/{id}/registration` | Documented |
| `join_workshop_offer` | POST | `workshops/{id}/offers/{offer_id}/join` | Inferred |
| `accept_workshop_offer` | POST | `workshops/{id}/offers/{offer_id}/accept` | Inferred |
| `decline_workshop_offer` | POST | `workshops/{id}/offers/{offer_id}/decline` | Inferred |
| `jobs` | GET | `jobs` | Documented |
| `job` | GET | `jobs/{id}` | Documented |
| `stories` | GET | `stories` | Documented |
| `story_view_state` | POST | `stories/{id}/view-state` | Documented |
| `floorplans` | GET | `venue/floorplans` | Documented |
| `venue_route` | GET | `venue/route` | Documented |
| `calculate_venue_route` | POST | `venue/route` | Documented |
| `onboarding_roles` | GET | `onboarding/roles` | Documented |
| `unread_count` | GET | `notifications/unread-count` | Documented |
| `read_all_notifications` | POST | `notifications/read-all` | Documented |
| `developer_banner` | GET | `menu/developer-banner` | Documented |
| `transportation_connection` | POST | `support/transportation/connection` | Documented |
| `request_code` | POST | `caller-supplied` | Path missing |
| `verify_code` | POST | `caller-supplied` | Path missing |
| `forgot_password` | POST | `caller-supplied` | Path missing |
| `register_push` | POST | `caller-supplied` | Path missing |
| `reminder_settings` | GET | `caller-supplied` | Path missing |
| `update_reminder_settings` | PATCH | `caller-supplied` | Path missing |

## Export all profiles into one JSON file

```sh
cd /Users/rene/github.com/RocketRene/openai-hackathon
python3 -m idealab_login --export-all \
  --output /Users/rene/github.com/RocketRene/openai-hackathon/exports/all-enriched-profiles.json
```

Add `--resume` when that file already exists to continue an interrupted export.
The full export uses the verified server limit of 50 candidates per page,
retains every candidate summary and full profile response, and adds a normalized
`linkedin_url`. Top-level metadata includes timestamps, the API-reported total,
completion status, and counts of enriched, inaccessible, failed, pending, and
LinkedIn-linked profiles. The export only covers candidates visible to the
logged-in account, not every account in the service.

Writes are atomic and restricted to file mode 0600. Progress is saved after each
candidate page, after every 20 profile lookups, and when the process exits through
normal error handling. Interrupted lookups can resume without refetching completed
profiles. Transient read failures are retried at most twice with backoff; terminal
failures preserve progress. No LinkedIn pages or external enrichment services are
queried. The original LinkedIn field remains in the raw `profile` object.

The live read-endpoint smoke check passed 19 of 22 calls. `likes` and `inbox`
returned HTTP 422 with the documented parameters; `meeting_suggestions` returned
HTTP 500. Those routes are exposed but are not claimed to work with the supplied
reference alone. Results:
`/Users/rene/github.com/RocketRene/openai-hackathon/exports/api-smoke-results.json`.

Full export completed on 2026-09-26: 569 unique candidates, all 569 full profiles
enriched successfully, 254 valid LinkedIn URLs, and no failed or inaccessible
profiles. The other 315 profiles have no valid LinkedIn URL in the API data.
File: `/Users/rene/github.com/RocketRene/openai-hackathon/exports/all-enriched-profiles.json`.

## Enrich LinkedIn data through the MCP

Install the optional client dependency once:

```sh
/Users/rene/github.com/RocketRene/openai-hackathon/.venv/bin/python -m pip install -e '/Users/rene/github.com/RocketRene/openai-hackathon[enrich]'
```

Run or resume enrichment of the same JSON file:

```sh
/Users/rene/github.com/RocketRene/openai-hackathon/.venv/bin/idealab-enrich-linkedin \
  --file /Users/rene/github.com/RocketRene/openai-hackathon/exports/all-enriched-profiles.json
```

Implementation:
`/Users/rene/github.com/RocketRene/openai-hackathon/idealab_login/enrich_linkedin.py`.

The script reads the `rapidapi-linkedin` stdio MCP configuration from
`/Users/rene/.codex/config.toml`, launches its configured bridge, and calls
`Get_Profile_Data_By_URL` using the MCP Python SDK. The API key stays in that
local configuration. No credential is embedded in the source or exported JSON.
Bridge stderr is suppressed because it can include authentication headers.

The terminal displays a progress bar, completed/total counts for this run,
elapsed time, estimated remaining time, and failures. The ETA appears after the
first completed profile and includes observed request/backoff time. Redirected
output prints progress every ten seconds rather than terminal control sequences.

Each record gains `linkedin_enrichment`, containing status, provider, tool,
source URL, retrieval timestamp, and the complete returned `data` object
(experience, education, skills, headline, summary, etc., where available).
Original IdeaLab fields remain intact. A top-level `linkedin_enrichment` object
tracks counts and run status. The older `complete` and `summary` fields describe
the original IdeaLab export; LinkedIn completion has its own metadata.

Every completed response is atomically saved back to the same file. Successful
profiles are skipped automatically on subsequent runs, identical URLs reuse
results, and a file lock prevents two enrichment instances from writing at once.
Ctrl+C stops the run; the same command resumes it. A response arriving exactly
during interruption may need to be fetched again. Failed entries are retried on
a later run; there is no unconditional refresh of successful records.

Profiles without a valid LinkedIn URL are marked `skipped`. No name-based identity
search is performed. Responses with a different LinkedIn username are marked as
failed for review instead of being attached to the candidate. Quota/subscription
and authentication errors stop the batch with saved progress. Rate-limit responses
receive bounded backoff; no new subscription or upgrade is performed. Requests
consume the configured provider plan's allowance.

Options:

- `--dry-run`: show pending counts without API calls or changes to the JSON.
- `--limit 5`: process at most five pending profiles.
- `--requests-per-minute 30`: set a maximum start rate (default 60; requests are sequential).
- `--retries 2`: retry transient provider errors twice (default).
- `--timeout 90`: MCP request timeout in seconds (default).
- `--config /absolute/path/config.toml --server name`: use another stdio MCP configuration.

Tests cover response parsing, identity mismatches, quota handling, retry behavior,
checkpointing, resume, deduplication, preserved source fields, locks, and progress
formatting.

## Voya: React Co-Founder Studio

Die lokale React-App verbindet die vorhandenen Profile mit einem Text- und
Realtime-Sprachagenten, Merkliste und Interviewvorbereitung. Einstieg und
Konfiguration: [Voya-Dokumentation](/Users/rene/github.com/RocketRene/openai-hackathon/web/README.md).

```sh
cd /Users/rene/github.com/RocketRene/openai-hackathon/web
npm run dev
```

Danach http://localhost:5173 öffnen. Der optionale Cloudflare-RealtimeKit-Raum
benötigt einen eigenen Teilnehmertoken; der KI-Sprachagent läuft über OpenAI.
