/**
 * GET /api/health – Status-Endpunkt für die Einstellungsseite.
 * Contract (docs/PARALLEL-WORK.md): { openaiConfigured, profiles, events } + Modelle und Quellen.
 */
import { NextResponse } from "next/server";
import { getEvents, getProfiles } from "@/lib/data";

export const dynamic = "force-dynamic";

type SourceType = "linkedin" | "conference" | "mock" | "manual";

export async function GET() {
  const profiles = getProfiles();
  const sources: Record<SourceType, number> = { linkedin: 0, conference: 0, mock: 0, manual: 0 };
  for (const profile of profiles) {
    const type = profile.source?.type;
    if (type && type in sources) sources[type] += 1;
  }

  return NextResponse.json({
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    textModel: process.env.OPENAI_TEXT_MODEL ?? "gpt-5-mini",
    realtimeModel: process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime",
    profiles: profiles.length,
    events: getEvents().length,
    sources,
  });
}
