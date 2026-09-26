"""Routes reconstructed from the APK; inferred routes are explicitly marked."""
from dataclasses import dataclass


@dataclass(frozen=True)
class Endpoint:
    method: str
    path: str
    body: bool = False
    inferred: bool = False
    response: str = "json"
    authenticated: bool = True


ENDPOINTS = {
    "profile": Endpoint("GET", "profiles/{id}"),
    "update_profile": Endpoint("PATCH", "profiles/me", body=True, inferred=True),
    "block_profile": Endpoint("POST", "profiles/{id}/block", body=True),
    "report_profile": Endpoint("POST", "profiles/{id}/report", body=True),
    "tickets": Endpoint("GET", "me/tickets"),
    "export_data": Endpoint("GET", "me/export"),
    "request_export": Endpoint("POST", "me/export", body=True),
    "candidates": Endpoint("GET", "matching/candidates"),
    "swipe": Endpoint("POST", "matching/swipes", body=True),
    "likes": Endpoint("GET", "matching/likes"),
    "matching_jobs": Endpoint("GET", "matching/jobs"),
    "job_swipe": Endpoint("POST", "matching/job-swipes", body=True),
    "job_swipes": Endpoint("GET", "matching/job-swipes"),
    "connections": Endpoint("GET", "connections"),
    "create_connection": Endpoint("POST", "connections", body=True),
    "update_connection": Endpoint("PATCH", "connections/{id}", body=True),
    "delete_connection": Endpoint("DELETE", "connections/{id}"),
    "meetings": Endpoint("GET", "meetings"),
    "create_meeting": Endpoint("POST", "meetings", body=True),
    "meeting": Endpoint("GET", "meetings/{id}"),
    "update_meeting": Endpoint("PATCH", "meetings/{id}", body=True),
    "meeting_suggestions": Endpoint("GET", "meetings/suggestions", inferred=True),
    "meeting_suggestion": Endpoint("GET", "meetings/suggestions/{id}", inferred=True),
    "message": Endpoint("GET", "messages/{id}"),
    "update_message": Endpoint("PATCH", "messages/{id}", body=True),
    "inbox": Endpoint("GET", "device-inbox/messages"),
    "ack_inbox": Endpoint("POST", "device-inbox/messages/ack", body=True, inferred=True),
    "read_inbox": Endpoint("POST", "device-inbox/messages/read", body=True, inferred=True),
    "app_config": Endpoint("GET", "app-config"),
    "formats": Endpoint("GET", "formats"),
    "partners": Endpoint("GET", "partners"),
    "speakers": Endpoint("GET", "speakers"),
    "stages": Endpoint("GET", "stages"),
    "sessions": Endpoint("GET", "sessions"),
    "session": Endpoint("GET", "sessions/{id}"),
    "saved_sessions": Endpoint("GET", "saved-sessions"),
    "calendar": Endpoint("GET", "saved-sessions/calendar.ics", response="text"),
    "workshops": Endpoint("GET", "workshops"),
    "register_workshop": Endpoint("POST", "workshops/{id}/registration", body=True),
    "join_workshop_offer": Endpoint("POST", "workshops/{id}/offers/{offer_id}/join", body=True, inferred=True),
    "accept_workshop_offer": Endpoint("POST", "workshops/{id}/offers/{offer_id}/accept", body=True, inferred=True),
    "decline_workshop_offer": Endpoint("POST", "workshops/{id}/offers/{offer_id}/decline", body=True, inferred=True),
    "jobs": Endpoint("GET", "jobs"),
    "job": Endpoint("GET", "jobs/{id}"),
    "stories": Endpoint("GET", "stories"),
    "story_view_state": Endpoint("POST", "stories/{id}/view-state", body=True),
    "floorplans": Endpoint("GET", "venue/floorplans"),
    "venue_route": Endpoint("GET", "venue/route"),
    "calculate_venue_route": Endpoint("POST", "venue/route", body=True),
    "onboarding_roles": Endpoint("GET", "onboarding/roles"),
    "unread_count": Endpoint("GET", "notifications/unread-count"),
    "read_all_notifications": Endpoint("POST", "notifications/read-all", body=True),
    "developer_banner": Endpoint("GET", "menu/developer-banner"),
    "transportation_connection": Endpoint("POST", "support/transportation/connection", body=True),
}

# Full routes are absent from the supplied reference. The caller must supply a
# verified relative path; inventing likely paths could trigger unintended actions.
UNRESOLVED = {
    "request_code": Endpoint("POST", "", body=True, inferred=True, authenticated=False),
    "verify_code": Endpoint("POST", "", body=True, inferred=True, authenticated=False),
    "forgot_password": Endpoint("POST", "", body=True, inferred=True, authenticated=False),
    "register_push": Endpoint("POST", "", body=True, inferred=True),
    "reminder_settings": Endpoint("GET", "", inferred=True),
    "update_reminder_settings": Endpoint("PATCH", "", body=True, inferred=True),
}
