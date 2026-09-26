import io
import json
import unittest
from unittest.mock import Mock, MagicMock
from urllib.error import HTTPError

from idealab_login import APIError, IdeaLabClient, _NoRedirects
from idealab_login.candidates import find_candidate_linkedin, linkedin_url


class ClientTests(unittest.TestCase):
    def setUp(self):
        self.client = IdeaLabClient()
        self.client._access_token = "secret-access"
        self.client._refresh_token = "secret-refresh"
        self.client._opener = MagicMock()

    def respond(self, value):
        raw = value if isinstance(value, bytes) else json.dumps(value).encode()
        self.client._opener.open.return_value.__enter__.return_value.read.return_value = raw

    def test_query_encoding_and_authorization(self):
        self.respond({"data": []})
        self.client.candidates(interests=["AI & ML", "founders"], role="student")
        req = self.client._opener.open.call_args.args[0]
        self.assertIn("interest=AI+%26+ML&interest=founders", req.full_url)
        self.assertEqual(req.get_header("Authorization"), "Bearer secret-access")

    def test_ids_cannot_inject_queries(self):
        self.respond({})
        self.client.profile("a/b?x=1")
        self.assertTrue(self.client._opener.open.call_args.args[0].full_url.endswith("a%2Fb%3Fx%3D1"))
        for path in ["https://evil.test", "//evil.test", "../auth", "%2e%2e/auth", "a?token=secret"]:
            with self.assertRaises(ValueError):
                self.client.call("register_push", path=path, body={})

    def test_unknown_path_and_missing_body_fail_before_network(self):
        with self.assertRaises(ValueError):
            self.client.call("forgot_password", body={"email": "test@example.com"})
        with self.assertRaises(ValueError):
            self.client.call("create_meeting")
        with self.assertRaises(ValueError):
            self.client.call("delete_connection", id=".")
        self.client._opener.open.assert_not_called()

    def test_non_json_calendar(self):
        self.respond(b"BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n")
        self.assertTrue(self.client.call("calendar").startswith("BEGIN:VCALENDAR"))

    def test_multipart(self):
        self.respond({})
        self.client.upload_avatar(b"\xff\xd8\xffjpeg", field_name="photo", method="PUT")
        req = self.client._opener.open.call_args.args[0]
        self.assertEqual(req.method, "PUT")
        self.assertIn(b'name="photo"', req.data)
        self.assertIn(b"Content-Type: image/jpeg", req.data)
        self.assertIn("multipart/form-data; boundary=", req.get_header("Content-type"))

    def test_errors_do_not_expose_response_or_token(self):
        self.client._opener.open.side_effect = HTTPError("url", 403, "secret", {}, io.BytesIO(b"secret-access"))
        with self.assertRaises(APIError) as caught:
            self.client.profile("123")
        self.assertEqual(caught.exception.status, 403)
        self.assertNotIn("secret", str(caught.exception))

    def test_rotation_and_failed_refresh_clear_tokens(self):
        self.respond({"access_token": "new-access", "refresh_token": "new-refresh"})
        self.client.refresh()
        self.assertEqual(self.client._refresh_token, "new-refresh")
        self.assertEqual(json.loads(self.client._opener.open.call_args.args[0].data), {"refresh_token": "secret-refresh"})
        self.client._opener.open.side_effect = TimeoutError()
        with self.assertRaises(APIError):
            self.client.refresh()
        self.assertFalse(self.client.authenticated)
        self.assertIsNone(self.client._refresh_token)

    def test_redirects_not_followed(self):
        self.assertIsNone(_NoRedirects().redirect_request(None, None, 302, "", {}, "https://evil.test"))

    def test_mutation_body_passes_through(self):
        self.respond(None)
        self.client.call("update_meeting", id="meeting-1", body={"title": "Example"})
        req = self.client._opener.open.call_args.args[0]
        self.assertEqual(req.method, "PATCH")
        self.assertEqual(json.loads(req.data), {"title": "Example"})


class CandidateTests(unittest.TestCase):
    def test_link_validation(self):
        self.assertEqual(linkedin_url("https://www.linkedin.com/in/example/?utm_source=x"),
                         "https://www.linkedin.com/in/example")
        for url in [None, "https://linkedin.com.evil.test/in/x", "https://evil.test/in/x",
                    "https://linkedin.com/company/x", "https://secret@linkedin.com/in/x"]:
            self.assertIsNone(linkedin_url(url))

    def test_paging_and_missing_private_profiles(self):
        client = Mock()
        client.candidates.side_effect = [
            {"data": [{"id": "1"}, {"id": "2"}], "total": 3},
            {"data": [{"id": "3"}], "total": 3},
        ]
        client.profile.side_effect = [{"linkedin_url": "https://linkedin.com/in/one?utm=x"},
                                      {"linkedin_url": None}, APIError("Forbidden", 403)]
        rows = find_candidate_linkedin(client, pages=10, limit=2)
        self.assertEqual([row["status"] for row in rows], ["found", "not_provided", "profile_http_403"])
        self.assertEqual(client.candidates.call_count, 2)

    def test_repeating_pages_stop_and_deduplicate(self):
        client = Mock()
        client.candidates.return_value = {"data": [{"id": "1"}], "total": 1000}
        client.profile.return_value = {}
        self.assertEqual(len(find_candidate_linkedin(client, pages=5)), 1)
        self.assertEqual(client.profile.call_count, 1)
        self.assertEqual(client.candidates.call_count, 2)

    def test_rate_limits_stop_immediately(self):
        client = Mock()
        client.candidates.return_value = {"data": [{"id": "1"}, {"id": "2"}]}
        client.profile.side_effect = APIError("Rate limited", 429)
        with self.assertRaises(APIError):
            find_candidate_linkedin(client)
        self.assertEqual(client.profile.call_count, 1)

    def test_server_ignoring_limit_cannot_exceed_bound(self):
        client = Mock()
        client.candidates.return_value = {"data": [{"id": str(i)} for i in range(10)]}
        client.profile.return_value = {}
        self.assertEqual(len(find_candidate_linkedin(client, pages=1, limit=2)), 2)


if __name__ == "__main__":
    unittest.main()
