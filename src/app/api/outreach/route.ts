/**
 * POST /api/outreach
 * Body: { profileId: string, userContext: UserContext | null, channel: "email" | "linkedin" }
 * → OutreachDraft
 *
 * Mit OPENAI_API_KEY: LLM-Entwurf (Responses API, Structured Outputs), generatedBy "llm".
 * Ohne Key oder bei Fehlern: regelbasiertes Template, generatedBy "template" – nie 500.
 * Owner: Paket "outreach" (docs/PARALLEL-WORK.md).
 */
import { NextResponse } from "next/server";
import OpenAI from "openai";

import { getProfile } from "@/lib/data";
import {
  OUTREACH_JSON_SCHEMA,
  buildOutreachTemplate,
  finalizeLlmDraft,
  outreachSystemPrompt,
  outreachUserPrompt,
  type OutreachChannel,
} from "@/lib/outreach";
import type { FounderDims, FounderRole, NetworkRole, Stage, UserContext } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Minimaler Default-Kontext (Server). src/lib/user-context.ts ist "use client" und darf hier
 * nicht importiert werden – Werte entsprechen DEFAULT_USER_CONTEXT dort.
 */
const DEFAULT_SERVER_USER_CONTEXT: UserContext = {
  name: "",
  headline: "",
  linkedinUrl: "",
  founderRole: undefined,
  lookingFor: ["cofounder"],
  lookingForRoles: [],
  verticals: [],
  stage: "idea",
  idea: "",
  openToIdeas: false,
  strengths: [],
  dims: { vision: 5, design: 5, tech: 5, detail: 5, execution: 5 },
  notes: "",
  completedInterview: false,
  updatedAt: new Date(0).toISOString(),
};

const NETWORK_ROLES: readonly NetworkRole[] = ["cofounder", "investor", "mentor", "talent", "expert"];
const FOUNDER_ROLES: readonly FounderRole[] = ["tech", "commercial", "product", "design", "operations", "domain-expert"];
const STAGES: readonly Stage[] = ["idea", "pre-seed", "seed", "series-a", "growth"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0) : [];
}

function pickFrom<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

function normalizeDims(value: unknown, fallback: FounderDims): FounderDims {
  if (!isRecord(value)) return fallback;
  const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(10, v)) : d);
  return {
    vision: num(value.vision, fallback.vision),
    design: num(value.design, fallback.design),
    tech: num(value.tech, fallback.tech),
    detail: num(value.detail, fallback.detail),
    execution: num(value.execution, fallback.execution),
  };
}

/** Macht aus beliebigem Client-Input einen vollständigen UserContext (null → Default). */
function normalizeUserContext(input: unknown): UserContext {
  const base = DEFAULT_SERVER_USER_CONTEXT;
  if (!isRecord(input)) return base;
  const str = (v: unknown, d: string) => (typeof v === "string" ? v : d);
  const lookingFor = stringList(input.lookingFor).filter((r): r is NetworkRole => (NETWORK_ROLES as readonly string[]).includes(r));
  const lookingForRoles = stringList(input.lookingForRoles).filter((r): r is FounderRole => (FOUNDER_ROLES as readonly string[]).includes(r));
  return {
    name: str(input.name, base.name),
    headline: str(input.headline, base.headline ?? ""),
    linkedinUrl: str(input.linkedinUrl, base.linkedinUrl ?? ""),
    founderRole: pickFrom(input.founderRole, FOUNDER_ROLES),
    lookingFor: lookingFor.length ? lookingFor : base.lookingFor,
    lookingForRoles,
    verticals: stringList(input.verticals).map((v) => v.toLowerCase()),
    stage: pickFrom(input.stage, STAGES) ?? base.stage,
    idea: str(input.idea, base.idea),
    openToIdeas: typeof input.openToIdeas === "boolean" ? input.openToIdeas : base.openToIdeas,
    strengths: stringList(input.strengths),
    dims: normalizeDims(input.dims, base.dims),
    notes: str(input.notes, base.notes ?? ""),
    completedInterview: typeof input.completedInterview === "boolean" ? input.completedInterview : base.completedInterview,
    updatedAt: str(input.updatedAt, base.updatedAt),
  };
}

function parseChannel(value: unknown): OutreachChannel | null {
  if (value === undefined || value === null || value === "") return "email";
  return value === "email" || value === "linkedin" ? value : null;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Request-Body (JSON erwartet)." }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: "Request-Body muss ein JSON-Objekt sein." }, { status: 400 });
  }

  const profileId = typeof body.profileId === "string" ? body.profileId.trim() : "";
  if (!profileId) {
    return NextResponse.json({ error: "profileId fehlt." }, { status: 400 });
  }

  const channel = parseChannel(body.channel);
  if (!channel) {
    return NextResponse.json({ error: 'channel muss "email" oder "linkedin" sein.' }, { status: 400 });
  }

  const profile = getProfile(profileId);
  if (!profile) {
    return NextResponse.json({ error: `Profil "${profileId}" nicht gefunden.` }, { status: 404 });
  }

  const user = normalizeUserContext(body.userContext);
  const template = buildOutreachTemplate(user, profile, channel);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(template);
  }

  try {
    const client = new OpenAI({ apiKey });
    const model = process.env.OPENAI_TEXT_MODEL ?? "gpt-5-mini";
    const isReasoningModel = /^(gpt-5|o\d)/i.test(model);

    const response = await client.responses.create({
      model,
      instructions: outreachSystemPrompt(),
      input: outreachUserPrompt(user, profile, channel),
      ...(isReasoningModel ? { reasoning: { effort: "low" as const } } : {}),
      text: {
        format: {
          type: "json_schema",
          name: "outreach_draft",
          strict: true,
          schema: OUTREACH_JSON_SCHEMA,
        },
      },
    });

    const parsed: unknown = JSON.parse(response.output_text);
    const draft = finalizeLlmDraft(parsed, template);
    return NextResponse.json(draft ?? template);
  } catch (error) {
    console.error("[api/outreach] LLM-Pfad fehlgeschlagen, Template-Fallback:", error);
    return NextResponse.json(template);
  }
}
