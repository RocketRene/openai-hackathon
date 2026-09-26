import argparse
import getpass
import json
import os
import sys

from . import APIError, IdeaLabClient
from .candidates import find_candidate_linkedin
from .endpoints import ENDPOINTS, UNRESOLVED
from .export import export_all_profiles


def main():
    parser = argparse.ArgumentParser(description="Log in to IdeaLab and verify profile access.")
    parser.add_argument("--email", default=os.environ.get("IDEALAB_EMAIL", "renekuhn@posteo.de"))
    parser.add_argument("--check-refresh", action="store_true", help="Also verify token rotation")
    parser.add_argument("--list-endpoints", action="store_true", help="List endpoints without logging in")
    parser.add_argument("--linkedin", action="store_true", help="Look up candidate LinkedIn URLs")
    parser.add_argument("--export-all", action="store_true", help="Export all candidates with full profile details")
    parser.add_argument("--resume", action="store_true", help="Resume an existing --export-all output")
    parser.add_argument("--page", type=int, default=1)
    parser.add_argument("--pages", type=int, default=1, help="Maximum candidate pages to inspect")
    parser.add_argument("--limit", type=int, default=20, help="Candidates per page (1–50)")
    parser.add_argument("--role")
    parser.add_argument("--interest", action="append", help="Repeat to filter by multiple interests")
    parser.add_argument("--segment", choices=["complement"])
    parser.add_argument("--output", help="Save candidate JSON to this file instead of stdout")
    args = parser.parse_args()
    if args.list_endpoints:
        for name, spec in {**ENDPOINTS, **UNRESOLVED}.items():
            print(f"{name}: {spec.method} {spec.path or '<requires verified path>'}"
                  + (" [inferred]" if spec.inferred else ""))
        print("Special methods: login, me, refresh, logout, upload_avatar, chat")
        return 0
    if args.page < 1 or args.pages < 1 or not 1 <= args.limit <= 50:
        parser.error("Pages must be positive and limit must be between 1 and 50.")
    if args.output and not (args.linkedin or args.export_all):
        parser.error("--output requires --linkedin or --export-all")
    if args.export_all and (not args.output or args.linkedin or args.role or args.interest or args.segment):
        parser.error("--export-all requires --output and cannot be combined with --linkedin or filters")
    if args.resume and not args.export_all:
        parser.error("--resume requires --export-all")
    client = IdeaLabClient()
    try:
        password = os.environ.get("IDEALAB_PASSWORD") or getpass.getpass("IdeaLab password: ")
        client.login(args.email, password)
        del password
        print("Login successful.", file=sys.stderr)
        try:
            client.me()
            print("Authenticated profile request successful.", file=sys.stderr)
            if args.check_refresh:
                client.refresh()
                client.me()
                print("Token refresh and subsequent profile request successful.", file=sys.stderr)
            if args.linkedin:
                records = find_candidate_linkedin(client, start_page=args.page, pages=args.pages,
                    limit=args.limit, role=args.role, interests=args.interest, segment=args.segment)
                data = json.dumps(records, ensure_ascii=False, indent=2) + "\n"
                if args.output:
                    output = os.path.abspath(args.output)
                    # Exclusive creation avoids overwriting an existing export or following a symlink.
                    fd = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                    with os.fdopen(fd, "w", encoding="utf-8") as file:
                        file.write(data)
                    print(f"Saved {output}", file=sys.stderr)
                else:
                    print(data, end="")
                found = sum(row["status"] == "found" for row in records)
                print(f"Found {found} LinkedIn URLs among {len(records)} checked candidates.", file=sys.stderr)
            if args.export_all:
                document = export_all_profiles(client, args.output, resume=args.resume,
                    progress=lambda message: print(message, file=sys.stderr, flush=True))
                print(json.dumps(document["summary"]), file=sys.stderr)
                print(f"Saved {os.path.abspath(args.output)}", file=sys.stderr)
        finally:
            client.logout()
        print("Logged out; no tokens saved.", file=sys.stderr)
        return 0
    except (APIError, ValueError, EOFError, OSError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("\nCancelled.", file=sys.stderr)
        return 130


if __name__ == "__main__":
    sys.exit(main())
