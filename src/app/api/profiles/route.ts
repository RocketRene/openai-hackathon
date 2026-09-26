/**
 * GET /api/profiles – Profil-Suche mit Filtern, Paging und Facetten.
 * ---------------------------------------------------------------
 * Query-Parameter (alle optional):
 *   query        Freitext (Name, Headline, Skills, Verticals, Erfahrung …)
 *   networkRole  cofounder | investor | mentor | talent | expert
 *   founderRole  tech | commercial | product | design | operations | domain-expert
 *   personality  visionary | builder | operator | connector | analyst
 *   stage        idea | pre-seed | seed | series-a | growth
 *   vertical     z. B. "fintech" (Kleinschreibung, Vokabular siehe docs/PARALLEL-WORK.md)
 *   event        Event-Slug aus src/data/events.json, z. B. "idealab-2026"
 *   limit        Treffer pro Seite, Default 50, max. 600
 *   offset       Start-Index, Default 0
 *   sort         "name" (A–Z) | "-name" (Z–A); ohne Angabe: Reihenfolge des Daten-Gateways
 *   format       "array" → Antwort ist ein reines Profile[] (siehe unten)
 *
 * Ungültige Enum-Werte werden ignoriert (der Filter entfällt), nie 400.
 *
 * Antwort-Formen:
 *   Default – Erweiterung des Contracts aus docs/PARALLEL-WORK.md:
 *     { items: Profile[], total: number,
 *       facets: { networkRole, founderRole, personality, verticals, events } }
 *     items  = die Seite (limit/offset), total = Anzahl aller Treffer,
 *     facets = Zählungen über ALLE Treffer vor dem Paging, je Record<string, number>,
 *              absteigend nach Häufigkeit sortiert (für Filter-Dropdowns).
 *   ?format=array – Contract-kompatibel: Profile[] (dieselbe Seite wie `items`).
 *     Wer alle Treffer braucht, gibt `limit=600` mit.
 *
 * Header: Cache-Control: public, max-age=60 (Daten sind statisch importiert).
 */
import { type NextRequest, NextResponse } from "next/server";

import { searchProfiles } from "@/lib/data";
import {
  PERSONALITY_LABELS,
  type FounderRole,
  type NetworkRole,
  type PersonalityType,
  type Profile,
  type ProfileFilters,
  type Stage,
} from "@/lib/types";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 600;
const MAX_QUERY_LENGTH = 200;
const CACHE_HEADERS = { "Cache-Control": "public, max-age=60" } as const;

const NETWORK_ROLES = [
  "cofounder",
  "investor",
  "mentor",
  "talent",
  "expert",
] as const satisfies readonly NetworkRole[];
const FOUNDER_ROLES = [
  "tech",
  "commercial",
  "product",
  "design",
  "operations",
  "domain-expert",
] as const satisfies readonly FounderRole[];
const STAGES = ["idea", "pre-seed", "seed", "series-a", "growth"] as const satisfies readonly Stage[];
const PERSONALITY_TYPES = Object.keys(PERSONALITY_LABELS) as PersonalityType[];

type SortKey = "name" | "-name";
const SORT_KEYS = ["name", "-name"] as const satisfies readonly SortKey[];

/** Facetten: Zählung je Wert über alle Treffer (vor Paging). */
interface ProfileFacets {
  networkRole: Record<string, number>;
  founderRole: Record<string, number>;
  personality: Record<string, number>;
  verticals: Record<string, number>;
  events: Record<string, number>;
}

interface ProfilesResponse {
  items: Profile[];
  total: number;
  facets: ProfileFacets;
}

function parseEnum<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  if (value === null) return undefined;
  const v = value.trim().toLowerCase();
  return (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

function parseText(value: string | null, maxLength = MAX_QUERY_LENGTH): string | undefined {
  const v = value?.trim();
  return v ? v.slice(0, maxLength) : undefined;
}

function parseIntParam(value: string | null, fallback: number, min: number, max: number): number {
  if (value === null || value.trim() === "") return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function countBy(values: Iterable<string | undefined>): Record<string, number> {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return Object.fromEntries(
    [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de")),
  );
}

function buildFacets(profiles: Profile[]): ProfileFacets {
  return {
    networkRole: countBy(profiles.map((p) => p.networkRole)),
    founderRole: countBy(profiles.map((p) => p.founderRole)),
    personality: countBy(profiles.map((p) => p.personality?.type)),
    verticals: countBy(profiles.flatMap((p) => p.verticals ?? [])),
    events: countBy(profiles.flatMap((p) => p.events ?? [])),
  };
}

function sortProfiles(profiles: Profile[], sort: SortKey | undefined): Profile[] {
  if (!sort) return profiles;
  const direction = sort.startsWith("-") ? -1 : 1;
  return [...profiles].sort((a, b) => direction * a.name.localeCompare(b.name, "de"));
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const filters: ProfileFilters = {
    query: parseText(sp.get("query")),
    networkRole: parseEnum(sp.get("networkRole"), NETWORK_ROLES),
    founderRole: parseEnum(sp.get("founderRole"), FOUNDER_ROLES),
    personality: parseEnum(sp.get("personality"), PERSONALITY_TYPES),
    stage: parseEnum(sp.get("stage"), STAGES),
    vertical: parseText(sp.get("vertical"))?.toLowerCase(),
    event: parseText(sp.get("event"))?.toLowerCase(),
  };
  const limit = parseIntParam(sp.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT);
  const offset = parseIntParam(sp.get("offset"), 0, 0, Number.MAX_SAFE_INTEGER);
  const sort = parseEnum(sp.get("sort"), SORT_KEYS);
  const asArray = sp.get("format")?.trim().toLowerCase() === "array";

  const matches = sortProfiles(searchProfiles(filters), sort);
  const items = matches.slice(offset, offset + limit);

  if (asArray) {
    return NextResponse.json<Profile[]>(items, { headers: CACHE_HEADERS });
  }

  const body: ProfilesResponse = {
    items,
    total: matches.length,
    facets: buildFacets(matches),
  };
  return NextResponse.json<ProfilesResponse>(body, { headers: CACHE_HEADERS });
}
