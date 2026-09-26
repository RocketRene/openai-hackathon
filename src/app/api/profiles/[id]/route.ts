/**
 * GET /api/profiles/[id] – ein einzelnes Profil (id = Slug, z. B. "max-mustermann").
 * Antwort: Profile (200) oder { error: string } (404).
 * Header: Cache-Control: public, max-age=60 (Daten sind statisch importiert).
 */
import { NextResponse } from "next/server";

import { getProfile } from "@/lib/data";

const CACHE_HEADERS = { "Cache-Control": "public, max-age=60" } as const;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = getProfile(id);

  if (!profile) {
    return NextResponse.json(
      { error: `Profil "${id}" nicht gefunden.` },
      { status: 404, headers: CACHE_HEADERS },
    );
  }

  return NextResponse.json(profile, { headers: CACHE_HEADERS });
}
