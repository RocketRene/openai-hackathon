"""IdeaLab authentication; credentials and tokens are held only in memory."""

import json
import re
import uuid
from string import Formatter
from urllib.parse import quote, urlencode, urlsplit, unquote
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener

from .endpoints import ENDPOINTS, UNRESOLVED


class APIError(Exception):
    """A sanitized API failure, optionally carrying an HTTP status."""

    def __init__(self, message, status=None):
        super().__init__(message)
        self.status = status


class _NoRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class IdeaLabClient:
    """IdeaLab API client. Use call() for the documented endpoint catalog."""

    BASE_URL = "https://api.inno-com.org/v1"

    def __init__(self, *, timeout=20):
        self.timeout = timeout
        self._access_token = None
        self._refresh_token = None
        self._opener = build_opener(_NoRedirects())

    @property
    def authenticated(self):
        return self._access_token is not None

    def _request(self, method, path, body=None, *, authenticated=False,
                 query=None, response="json", content_type=None):
        self._validate_path(path)
        if response not in {"json", "text", "bytes"}:
            raise ValueError("Response must be json, text, or bytes.")
        headers = {"Accept": "application/json", "User-Agent": "okhttp/5.5.0"}
        if response != "json":
            headers["Accept"] = "*/*"
        if authenticated:
            if not self.authenticated:
                raise APIError("Log in first.")
            headers["Authorization"] = f"Bearer {self._access_token}"
        data = None
        if body is not None:
            headers["Content-Type"] = content_type or "application/json"
            data = body if isinstance(body, bytes) else json.dumps(body).encode("utf-8")
        suffix = urlencode({k: v for k, v in (query or {}).items() if v is not None}, doseq=True)
        url = f"{self.BASE_URL}/{path}" + (f"?{suffix}" if suffix else "")
        request = Request(url, data=data, headers=headers, method=method)
        try:
            with self._opener.open(request, timeout=self.timeout) as http_response:
                raw = http_response.read()
        except HTTPError as exc:
            status = exc.code
            exc.close()
            raise APIError(f"{method} {path} failed (HTTP {status}).", status) from None
        except (URLError, TimeoutError, OSError):
            raise APIError(f"{method} {path} failed: connection error or timeout.") from None
        try:
            if response == "bytes":
                return raw
            if response == "text":
                return raw.decode("utf-8-sig")
            return json.loads(raw) if raw else None
        except (ValueError, UnicodeError):
            raise APIError(f"{method} {path} returned invalid {response}.") from None

    @staticmethod
    def _validate_path(path):
        if not isinstance(path, str) or not path or path.startswith("/"):
            raise ValueError("Provide a nonempty relative API path.")
        parts = urlsplit(path)
        decoded = unquote(path)
        if (parts.scheme or parts.netloc or parts.query or parts.fragment
                or "?" in path or "#" in path or "\\" in decoded
                or any(ord(c) < 32 for c in decoded)
                or any(p in {".", ".."} for p in decoded.split("/"))):
            raise ValueError("Invalid API path; pass query parameters separately.")

    def call(self, endpoint, *, body=None, query=None, path=None, **path_params):
        """Call a catalog endpoint; JSON bodies are passed through unchanged.

        Unknown body schemas must come from verified API information. Unresolved
        endpoints require an explicit path. Inferred routes remain unverified.
        """
        spec = ENDPOINTS.get(endpoint) or UNRESOLVED.get(endpoint)
        if spec is None:
            raise ValueError(f"Unknown endpoint: {endpoint}")
        if endpoint in UNRESOLVED:
            if not path:
                raise ValueError(f"{endpoint} requires a verified path; the reference omits it.")
            if path_params:
                raise ValueError("Use a complete path for unresolved endpoints.")
        else:
            if path is not None:
                raise ValueError("Cannot override a catalog endpoint path.")
            required = {name for _, name, _, _ in Formatter().parse(spec.path) if name}
            if set(path_params) != required:
                raise ValueError(f"{endpoint} requires path parameters: {sorted(required)}")
            if any(v is None or str(v) in {"", ".", ".."} for v in path_params.values()):
                raise ValueError("Path parameters must be nonempty IDs.")
            path = spec.path.format(**{k: quote(str(v), safe="") for k, v in path_params.items()})
        if spec.body and not isinstance(body, dict):
            raise ValueError("Provide a JSON object body explicitly ({} for an empty body).")
        if not spec.body and body is not None:
            raise ValueError("This endpoint does not accept a body.")
        return self._request(spec.method, path, body, query=query,
                             response=spec.response, authenticated=spec.authenticated)

    def candidates(self, *, page=1, limit=20, role=None, interests=None, segment=None):
        if page < 1 or not 1 <= limit <= 50:
            raise ValueError("Page must be positive and limit must be between 1 and 50.")
        return self.call("candidates", query={"page": page, "limit": limit, "role": role,
                         "interest": interests, "segment": segment})

    def profile(self, profile_id):
        return self.call("profile", id=profile_id)

    def upload_avatar(self, jpeg, *, field_name, method="POST"):
        """Upload JPEG bytes. Multipart field name is absent from the reference."""
        if method not in {"POST", "PUT"}:
            raise ValueError("Avatar method must be POST or PUT.")
        if not isinstance(jpeg, bytes) or not jpeg.startswith(b"\xff\xd8\xff"):
            raise ValueError("Provide JPEG bytes.")
        if not re.fullmatch(r"[A-Za-z0-9_-]+", field_name):
            raise ValueError("Invalid multipart field name.")
        boundary = uuid.uuid4().hex
        data = (f'--{boundary}\r\nContent-Disposition: form-data; name="{field_name}"; '
                'filename="avatar.jpg"\r\nContent-Type: image/jpeg\r\n\r\n').encode()
        data += jpeg + f"\r\n--{boundary}--\r\n".encode()
        return self._request(method, "profiles/me/avatar", data, authenticated=True,
                             content_type=f"multipart/form-data; boundary={boundary}")

    def chat(self):
        """Open the chat socket; callers own its lifecycle and message protocol."""
        if not self.authenticated:
            raise APIError("Log in first.")
        try:
            from websockets.sync.client import connect
        except ImportError:
            raise APIError("Install the package with its [chat] extra to use WebSockets.") from None
        try:
            return connect(self.BASE_URL.replace("https://", "wss://", 1) + "/ws/chat",
                           additional_headers={"Authorization": f"Bearer {self._access_token}"},
                           open_timeout=self.timeout, user_agent_header="okhttp/5.5.0")
        except Exception:
            raise APIError("Chat WebSocket connection failed.") from None

    def _set_tokens(self, result):
        if not isinstance(result, dict) or not all(
            isinstance(result.get(key), str) and result[key]
            for key in ("access_token", "refresh_token")
        ):
            self._access_token = self._refresh_token = None
            raise APIError("Authentication response is missing valid tokens.")
        self._access_token = result["access_token"]
        self._refresh_token = result["refresh_token"]

    def login(self, email, password):
        if not email or not password:
            raise ValueError("Email and password are required.")
        self._access_token = self._refresh_token = None
        self._set_tokens(self._request("POST", "auth/login", {"email": email, "password": password}))

    def me(self):
        """Return your profile JSON. Call refresh() if your access token expires."""
        return self._request("GET", "profiles/me", authenticated=True)

    def refresh(self):
        """Rotate tokens once; never automatically retry single-use refresh tokens."""
        if not self._refresh_token:
            raise APIError("Log in first.")
        token = self._refresh_token
        self._access_token = self._refresh_token = None
        self._set_tokens(self._request("POST", "auth/refresh", {"refresh_token": token}))

    def logout(self):
        if not self._refresh_token:
            return
        try:
            self._request("POST", "auth/logout", {"refresh_token": self._refresh_token}, authenticated=True)
        finally:
            self._access_token = self._refresh_token = None
