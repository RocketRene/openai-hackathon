/**
 * POST /api/match/rank – Ranking aller Kandidat:innen für die Nutzer:in.
 * ---------------------------------------------------------------
 * Body  { userContext: UserContext | null, limit?: number, networkRole?: NetworkRole }
 * 200   { items: (MatchResult & { name, headline, photoUrl, networkRole })[], total, limit }
 *       items sind nach Score absteigend sortiert (rankCandidates aus src/lib/matching.ts).
 *       limit: Default 10, maximal 50. networkRole filtert die Kandidat:innen vorab.
 * 400   { error } – Body kein JSON / networkRole ungültig
 *
 * Rein regelbasiert, kein LLM – funktioniert immer ohne OPENAI_API_KEY.
 * userContext === null → minimaler lokaler Default (user-context.ts ist "use client").
 */

import { NextResponse } from "next/server";
import { getProfiles } from "@/lib/data";
import { rankCandidates } from "@/lib/matching";
import type { MatchResult, NetworkRole, Profile, UserContext } from "@/lib/types";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const NETWORK_ROLES: readonly NetworkRole[] = ["cofounder", "investor", "mentor", "talent", "expert"];

type RankedItem = MatchResult & Pick<Profile, "name" | "headline" | "photoUrl" | "networkRole">;

/** Minimaler Default, wenn kein userContext mitkommt (Gast-Modus). */
function defaultUserContext(): UserContext {
  return {
    name: "Gast",
    lookingFor: ["cofounder", "investor", "mentor"],
    lookingForRoles: [],
    verticals: [],
    idea: "",
    openToIdeas: true,
    strengths: [],
    dims: { vision: 5, design: 5, tech: 5, detail: 5, execution: 5 },
    completedInterview: false,
    updatedAt: new Date().toISOString(),
  };
}

/** Tolerant: fehlende Felder werden aus dem Default ergänzt, Arrays abgesichert. */
function normalizeUserContext(input: unknown): UserContext {
  const base = defaultUserContext();
  if (!input || typeof input !== "object") return base;
  const raw = input as Partial<UserContext>;
  return {
    ...base,
    ...raw,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name : base.name,
    lookingFor: Array.isArray(raw.lookingFor) ? raw.lookingFor : base.lookingFor,
    lookingForRoles: Array.isArray(raw.lookingForRoles) ? raw.lookingForRoles : base.lookingForRoles,
    verticals: Array.isArray(raw.verticals) ? raw.verticals : base.verticals,
    strengths: Array.isArray(raw.strengths) ? raw.strengths : base.strengths,
    idea: typeof raw.idea === "string" ? raw.idea : base.idea,
    dims: raw.dims && typeof raw.dims === "object" ? { ...base.dims, ...raw.dims } : base.dims,
  };
}

function parseLimit(input: unknown): number {
  const n = typeof input === "number" ? input : typeof input === "string" ? Number.parseInt(input, 10) : NaN;
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.floor(n));
}

function isNetworkRole(value: unknown): value is NetworkRole {
  return typeof value === "string" && (NETWORK_ROLES as readonly string[]).includes(value);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Body muss JSON sein: { userContext, limit?, networkRole? }." },
      { status: 400 },
    );
  }

  const { userContext, limit, networkRole } = (body && typeof body === "object" ? body : {}) as {
    userContext?: unknown;
    limit?: unknown;
    networkRole?: unknown;
  };

  if (networkRole !== undefined && networkRole !== null && networkRole !== "" && !isNetworkRole(networkRole)) {
    return NextResponse.json(
      { error: `networkRole ungültig. Erlaubt: ${NETWORK_ROLES.join(", ")}.` },
      { status: 400 },
    );
  }

  const user = normalizeUserContext(userContext);
  const maxItems = parseLimit(limit);
  const profiles = isNetworkRole(networkRole)
    ? getProfiles().filter((p) => p.networkRole === networkRole)
    : getProfiles();
  const byId = new Map(profiles.map((p) => [p.id, p]));

  const items: RankedItem[] = rankCandidates(user, profiles)
    .slice(0, maxItems)
    .flatMap((match) => {
      const profile = byId.get(match.profileId);
      if (!profile) return [];
      return [
        {
          ...match,
          name: profile.name,
          headline: profile.headline,
          photoUrl: profile.photoUrl,
          networkRole: profile.networkRole,
        },
      ];
    });

  return NextResponse.json({ items, total: profiles.length, limit: maxItems });
}
