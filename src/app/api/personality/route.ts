/**
 * POST /api/personality – Body `{ profileId }` → `Personality`.
 * ---------------------------------------------------------------
 * Mit OPENAI_API_KEY: Ableitung per Responses API (JSON-Schema-Ausgabe) aus Headline, About,
 * Erfahrung und Skills. Ohne Key oder bei jedem Fehler: regelbasierter Fallback aus
 * src/lib/personality.ts. Antwortet immer 200 mit valider Personality; 404 bei unbekannter
 * profileId, 400 nur bei nicht parsebarem Body.
 */
import { NextResponse } from "next/server";
import OpenAI from "openai";

import { getProfile } from "@/lib/data";
import { PERSONALITY_GUIDE, PERSONALITY_TYPES, isPersonalityType, personalityFromProfile } from "@/lib/personality";
import type { Personality, Profile } from "@/lib/types";

const LLM_TIMEOUT_MS = 25_000;
const DEFAULT_MODEL = "gpt-5-mini";

/** Strict-Schema für Structured Outputs: alle Felder required, keine Zusatzfelder. */
const PERSONALITY_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["type", "summary", "traits", "communicationStyle", "outreachTips", "avoid"],
  properties: {
    type: {
      type: "string",
      enum: [...PERSONALITY_TYPES],
      description: "Der Persönlichkeitstyp, der am besten passt.",
    },
    summary: {
      type: "string",
      description: "Genau ein Satz auf Deutsch, der den Typ dieser Person beschreibt und ihren Vornamen nennt.",
    },
    traits: {
      type: "array",
      items: { type: "string" },
      description: "3–5 prägnante Eigenschaften (Deutsch, je 1–4 Wörter).",
    },
    communicationStyle: {
      type: "string",
      description: "1–2 Sätze: Wie man mit dieser Person kommunizieren sollte (Ton, Länge, Fokus).",
    },
    outreachTips: {
      type: "array",
      items: { type: "string" },
      description: "3–5 konkrete Do's für die erste Nachricht oder das erste Gespräch, bezogen auf dieses Profil.",
    },
    avoid: {
      type: "array",
      items: { type: "string" },
      description: "2–4 konkrete Don'ts für den Kontakt mit dieser Person.",
    },
  },
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body. Erwartet: { profileId: string }" }, { status: 400 });
  }

  const profileId = readProfileId(body);
  const profile = profileId ? getProfile(profileId) : undefined;
  if (!profile) {
    return NextResponse.json({ error: `Profil nicht gefunden: ${profileId || "(keine profileId)"}` }, { status: 404 });
  }

  const fallback = personalityFromProfile(profile);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json<Personality>(fallback);
  }

  try {
    const llm = await deriveWithOpenAI(profile, fallback, apiKey);
    return NextResponse.json<Personality>(llm ?? fallback);
  } catch (error) {
    console.warn(
      "[api/personality] LLM-Ableitung fehlgeschlagen, nutze Regel-Fallback:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json<Personality>(fallback);
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function readProfileId(body: unknown): string {
  if (typeof body !== "object" || body === null) return "";
  const value = (body as Record<string, unknown>).profileId;
  return typeof value === "string" ? value.trim() : "";
}

/** gpt-5-Familie und o-Modelle unterstützen `reasoning`; andere Modelle lehnen den Parameter ab. */
function isReasoningModel(model: string): boolean {
  return /^(gpt-5|o[1-9])/i.test(model);
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function buildInstructions(): string {
  const typeLines = PERSONALITY_TYPES.map((type) => {
    const g = PERSONALITY_GUIDE[type];
    return `- ${type} (${g.label}): ${g.description} Kommunikation: ${g.communicationStyle}`;
  }).join("\n");

  return [
    "Du bist Coach für Startup-Networking. Du ordnest eine Person anhand ihres (LinkedIn-)Profils einem von fünf",
    "Persönlichkeitstypen zu und erklärst einer Gründer:in, wie sie diese Person am besten anschreibt und wie ein",
    "erstes Gespräch gut läuft.",
    "",
    "Die fünf Typen:",
    typeLines,
    "",
    "Regeln:",
    "- Antworte ausschließlich auf Deutsch. Duze die lesende Gründer:in; sprich über die Person in der dritten Person mit Vornamen.",
    "- summary: genau ein Satz mit dem Vornamen, der den Typ und das Warum (aus dem Profil) benennt.",
    "- traits: 3–5 Stichworte. communicationStyle: 1–2 Sätze zu Ton, Länge und Fokus.",
    "- outreachTips: 3–5 konkrete, umsetzbare Do's für die erste Nachricht oder das erste Gespräch – mit Bezug auf",
    "  Firma, Rolle oder Themen aus dem Profil. avoid: 2–4 konkrete Don'ts.",
    "- Nichts erfinden, was nicht im Profil steht. Keine Floskeln, keine Wiederholung des Profils.",
    "- Der Heuristik-Vorschlag ist nur ein Hinweis – entscheide selbst anhand des Profils.",
  ].join("\n");
}

function buildInput(profile: Profile, hint: Personality): string {
  const experience = profile.experience
    .slice(0, 8)
    .map((e) => {
      const period = [e.start, e.end ?? "heute"].filter(Boolean).join("–");
      const desc = e.description ? ` – ${truncate(e.description, 200)}` : "";
      return `- ${e.title} @ ${e.company}${period ? ` (${period})` : ""}${desc}`;
    })
    .join("\n");

  const lines = [
    `Name: ${profile.name}`,
    `Headline: ${profile.headline || "(keine)"}`,
    `Rolle im Ökosystem: ${profile.networkRole}${profile.founderRole ? ` (Team-Rolle: ${profile.founderRole})` : ""}`,
    profile.stage ? `Stage: ${profile.stage}` : "",
    `Über mich: ${profile.about ? truncate(profile.about, 1500) : "(leer)"}`,
    `Erfahrung:\n${experience || "- (keine Angaben)"}`,
    `Skills: ${profile.skills.slice(0, 30).join(", ") || "(keine)"}`,
    `Tags/Interessen: ${(profile.tags ?? []).slice(0, 20).join(", ") || "(keine)"}`,
    `Verticals: ${profile.verticals.join(", ") || "(keine)"}`,
    `Sucht: ${profile.lookingFor.join(", ") || "(keine Angabe)"}`,
    "",
    `Heuristik-Vorschlag (regelbasiert, darf abweichen): ${hint.type}`,
  ];
  return lines.filter((l) => l !== "").join("\n");
}

async function deriveWithOpenAI(profile: Profile, hint: Personality, apiKey: string): Promise<Personality | null> {
  const client = new OpenAI({ apiKey, maxRetries: 1, timeout: LLM_TIMEOUT_MS });
  const model = process.env.OPENAI_TEXT_MODEL ?? DEFAULT_MODEL;

  const params: OpenAI.Responses.ResponseCreateParamsNonStreaming = {
    model,
    instructions: buildInstructions(),
    input: buildInput(profile, hint),
    text: {
      format: {
        type: "json_schema",
        name: "personality",
        strict: true,
        schema: PERSONALITY_JSON_SCHEMA,
      },
    },
  };
  if (isReasoningModel(model)) {
    params.reasoning = { effort: "low" };
  }

  const response = await client.responses.create(params);
  const raw = response.output_text?.trim();
  if (!raw) return null;

  return normalizePersonality(JSON.parse(raw), hint);
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function asStringList(value: unknown, fallback: string[], max: number): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const list = value.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((v) => v.trim());
  return list.length > 0 ? list.slice(0, max) : [...fallback];
}

/** Macht aus der (theoretisch beliebigen) LLM-Antwort garantiert eine valide Personality. */
function normalizePersonality(parsed: unknown, hint: Personality): Personality {
  if (typeof parsed !== "object" || parsed === null) return hint;
  const p = parsed as Record<string, unknown>;
  const type = isPersonalityType(p.type) ? p.type : hint.type;
  const guide = PERSONALITY_GUIDE[type];
  return {
    type,
    summary: asString(p.summary, hint.summary),
    traits: asStringList(p.traits, guide.traits, 6),
    communicationStyle: asString(p.communicationStyle, guide.communicationStyle),
    outreachTips: asStringList(p.outreachTips, guide.outreachTips, 6),
    avoid: asStringList(p.avoid, guide.avoid, 5),
  };
}
