/**
 * GET /api/events – alle Events aus src/data/events.json, jeweils erweitert um
 * `attendeeCount` (Anzahl Profile, deren `events` den Slug enthält).
 * Antwort: Array<Event & { attendeeCount: number }>.
 * Header: Cache-Control: public, max-age=60 (Daten sind statisch importiert).
 */
import { NextResponse } from "next/server";

import { getEvents, getProfilesForEvent } from "@/lib/data";
import type { Event } from "@/lib/types";

const CACHE_HEADERS = { "Cache-Control": "public, max-age=60" } as const;

type EventWithAttendeeCount = Event & { attendeeCount: number };

export async function GET() {
  const events: EventWithAttendeeCount[] = getEvents().map((event) => ({
    ...event,
    attendeeCount: getProfilesForEvent(event.slug).length,
  }));

  return NextResponse.json<EventWithAttendeeCount[]>(events, { headers: CACHE_HEADERS });
}
