"""Bounded candidate lookups using LinkedIn links provided by IdeaLab."""
from urllib.parse import urlsplit, urlunsplit

from . import APIError


def linkedin_url(value):
    """Accept LinkedIn profile URLs only and strip tracking query parameters."""
    if not isinstance(value, str):
        return None
    try:
        parts = urlsplit(value.strip())
        host = (parts.hostname or "").lower()
        if (parts.scheme not in {"https", "http"} or parts.username or parts.password
                or parts.port not in {None, 80, 443}
                or not (host == "linkedin.com" or host.endswith(".linkedin.com"))
                or not parts.path.startswith("/in/") or not parts.path[4:].strip("/")):
            return None
        return urlunsplit(("https", host, parts.path.rstrip("/"), "", ""))
    except ValueError:
        return None


def find_candidate_linkedin(client, *, start_page=1, pages=1, limit=20,
                            role=None, interests=None, segment=None):
    """Return minimal records, including missing links and inaccessible profiles.

    Read-only, sequential, and bounded by pages * limit. Stop on API failures
    other than individual profile 403/404 responses. Never search or guess URLs.
    """
    if start_page < 1 or pages < 1 or not 1 <= limit <= 50:
        raise ValueError("Pages must be positive and limit must be between 1 and 50.")
    records, seen = [], set()
    for page in range(start_page, start_page + pages):
        result = client.candidates(page=page, limit=limit, role=role,
                                   interests=interests, segment=segment)
        if not isinstance(result, dict) or not isinstance(result.get("data"), list):
            raise APIError("Candidate response must contain a data list.")
        items = result["data"]
        if not items:
            break
        new_ids = 0
        for candidate in items[:limit]:
            if not isinstance(candidate, dict) or not candidate.get("id"):
                raise APIError("Candidate record has no profile ID.")
            profile_id = str(candidate["id"])
            if profile_id in seen:
                continue
            seen.add(profile_id)
            new_ids += 1
            record = {"id": profile_id, "display_name": candidate.get("display_name"),
                      "company": candidate.get("company"), "role": candidate.get("role"),
                      "linkedin_url": None, "source": f"profiles/{profile_id}"}
            try:
                profile = client.profile(profile_id)
            except APIError as exc:
                if exc.status not in {403, 404}:
                    raise
                record["status"] = f"profile_http_{exc.status}"
            else:
                if not isinstance(profile, dict):
                    raise APIError("Profile response must be a JSON object.")
                raw = profile.get("linkedin_url")
                record["linkedin_url"] = linkedin_url(raw)
                record["status"] = ("found" if record["linkedin_url"] else
                                    "invalid_linkedin_url" if raw else "not_provided")
            records.append(record)
        total = result.get("total")
        if not new_ids or (isinstance(total, int) and page * limit >= total):
            break
    return records
