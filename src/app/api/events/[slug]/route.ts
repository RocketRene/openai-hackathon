/**
 * GET /api/events/[slug] – ein Event samt Teilnehmer:innen.
 * Antwort: { event: Event, attendees: Profile[] } (200) oder { error: string } (404).
 * Header: Cache-Control: public, max-age=60 (Daten sind statisch importiert).
 */
import { NextResponse } from "next/server";

import { getEvent, getProfilesForEvent } from "@/lib/data";
import type { Event, Profile } from "@/lib/types";

const CACHE_HEADERS = { "Cache-Control": "public, max-age=60" } as const;

interface EventDetailResponse {
  event: Event;
  attendees: Profile[];
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = getEvent(slug);

  if (!event) {
    return NextResponse.json(
      { error: `Event "${slug}" nicht gefunden.` },
      { status: 404, headers: CACHE_HEADERS },
    );
  }

  const body: EventDetailResponse = { event, attendees: getProfilesForEvent(slug) };
  return NextResponse.json<EventDetailResponse>(body, { headers: CACHE_HEADERS });
}
