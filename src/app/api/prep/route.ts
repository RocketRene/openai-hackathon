/**
 * POST /api/prep – Gesprächsvorbereitung für ein Profil.
 * Body: { profileId: string, userContext: UserContext | null } → PrepPack
 * Mit OPENAI_API_KEY: LLM (Structured Outputs), sonst bzw. bei Fehlern: Template-Fallback.
 * Owner: Paket "prep" (docs/PARALLEL-WORK.md).
 */
import { NextResponse } from "next/server";
import OpenAI from "openai";

import { getProfile } from "@/lib/data";
import { PREP_JSON_SCHEMA, buildPrepTemplate, normalizePrepPack, prepSystemPrompt, prepUserPrompt } from "@/lib/prep";
import {
  FOUNDER_DIM_KEYS,
  type FounderDimKey,
  type FounderRole,
  type NetworkRole,
  type PrepPack,
  type Profile,
  type UserContext,
} from "@/lib/types";

export const maxDuration = 60;

const NETWORK_ROLES: readonly NetworkRole[] = ["cofounder", "investor", "mentor", "talent", "expert"];
const FOUNDER_ROLES: readonly FounderRole[] = ["tech", "commercial", "product", "design", "operations", "domain-expert"];

/**
 * Minimaler Default, wenn kein Nutzer-Kontext mitgeschickt wird (z. B. Onboarding übersprungen).
 * Bewusst lokal – src/lib/user-context.ts ist "use client" und darf hier nicht importiert werden.
 */
const FALLBACK_USER_CONTEXT: UserContext = {
  name: "",
  headline: "",
  founderRole: undefined,
  lookingFor: [],
  lookingForRoles: [],
  verticals: [],
  stage: undefined,
  idea: "",
  openToIdeas: true,
  strengths: [],
  dims: { vision: 5, design: 5, tech: 5, detail: 5, execution: 5 },
  notes: "",
  completedInterview: false,
  updatedAt: new Date(0).toISOString(),
};

function stringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];
}

/** Macht aus beliebigem Client-Input einen vollständigen, ungefährlichen UserContext. */
function normalizeUserContext(input: unknown): UserContext {
  if (!input || typeof input !== "object") return FALLBACK_USER_CONTEXT;
  const raw = input as Partial<Record<keyof UserContext, unknown>>;

  const dims = { ...FALLBACK_USER_CONTEXT.dims };
  const rawDims = (raw.dims && typeof raw.dims === "object" ? raw.dims : {}) as Partial<Record<FounderDimKey, unknown>>;
  for (const k of FOUNDER_DIM_KEYS) {
    const v = rawDims[k];
    if (typeof v === "number" && Number.isFinite(v)) dims[k] = Math.max(0, Math.min(10, v));
  }

  return {
    ...FALLBACK_USER_CONTEXT,
    ...(raw as Partial<UserContext>),
    name: typeof raw.name === "string" ? raw.name : "",
    headline: typeof raw.headline === "string" ? raw.headline : "",
    idea: typeof raw.idea === "string" ? raw.idea : "",
    notes: typeof raw.notes === "string" ? raw.notes : "",
    founderRole: FOUNDER_ROLES.find((r) => r === raw.founderRole),
    lookingFor: stringArray(raw.lookingFor).filter((r): r is NetworkRole => (NETWORK_ROLES as readonly string[]).includes(r)),
    lookingForRoles: stringArray(raw.lookingForRoles).filter((r): r is FounderRole =>
      (FOUNDER_ROLES as readonly string[]).includes(r),
    ),
    verticals: stringArray(raw.verticals),
    strengths: stringArray(raw.strengths),
    openToIdeas: typeof raw.openToIdeas === "boolean" ? raw.openToIdeas : FALLBACK_USER_CONTEXT.openToIdeas,
    dims,
  };
}

async function generateWithLlm(apiKey: string, user: UserContext, profile: Profile, template: PrepPack): Promise<PrepPack> {
  const client = new OpenAI({ apiKey, timeout: 45_000, maxRetries: 1 });
  const model = process.env.OPENAI_TEXT_MODEL ?? "gpt-5-mini";
  // Reasoning-Modelle (gpt-5*, o*) auf "low" drosseln – Prep soll in Sekunden da sein, nicht in Minuten.
  const isReasoningModel = /^(gpt-5|o\d)/i.test(model);

  const response = await client.responses.create({
    model,
    instructions: prepSystemPrompt(),
    input: prepUserPrompt(user, profile),
    ...(isReasoningModel ? { reasoning: { effort: "low" as const } } : {}),
    text: {
      format: {
        type: "json_schema",
        name: "prep_pack",
        strict: true,
        schema: PREP_JSON_SCHEMA,
      },
    },
  });

  const parsed: unknown = JSON.parse(response.output_text);
  return normalizePrepPack(parsed, template, "llm");
}

export async function POST(req: Request) {
  let body: { profileId?: unknown; userContext?: unknown };
  try {
    body = (await req.json()) as { profileId?: unknown; userContext?: unknown };
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const profileId = typeof body?.profileId === "string" ? body.profileId.trim() : "";
  if (!profileId) {
    return NextResponse.json({ error: "profileId fehlt." }, { status: 400 });
  }

  const profile = getProfile(profileId);
  if (!profile) {
    return NextResponse.json({ error: `Profil „${profileId}“ nicht gefunden.` }, { status: 404 });
  }

  const user = normalizeUserContext(body.userContext);
  const template = buildPrepTemplate(user, profile);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(template);
  }

  try {
    const pack = await generateWithLlm(apiKey, user, profile, template);
    return NextResponse.json(pack);
  } catch (err) {
    console.warn("[api/prep] LLM fehlgeschlagen, Template-Fallback:", err instanceof Error ? err.message : err);
    return NextResponse.json(template);
  }
}
