/**
 * POST /api/match – Match-Score plus Erklärung für EIN Profil.
 * ---------------------------------------------------------------
 * Contract (docs/PARALLEL-WORK.md):
 *   Body  { profileId: string, userContext: UserContext | null }
 *   200   MatchResult & { explanation: string }   (explanation: Deutsch, 2–4 Sätze)
 *   400   { error } – profileId fehlt / Body kein JSON
 *   404   { error } – Profil unbekannt
 *
 * Score kommt regelbasiert aus `scoreMatch` (src/lib/matching.ts). Die Erklärung
 * schreibt mit OPENAI_API_KEY das Text-Modell (Responses API); ohne Key oder bei
 * API-Fehler wird sie aus reasons/risks zusammengesetzt (Demo-Sicherheit, kein 500).
 *
 * userContext === null → minimaler lokaler Default. `src/lib/user-context.ts` ist
 * "use client" und darf hier nicht importiert werden.
 */

import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getProfile } from "@/lib/data";
import { scoreMatch } from "@/lib/matching";
import type { MatchResult, Profile, UserContext } from "@/lib/types";

export const dynamic = "force-dynamic";

const OPENAI_TIMEOUT_MS = 12_000;

const INSTRUCTIONS = [
  "Du bist der Matching-Assistent von FounderRadar, einer App, die Gründer:innen die richtigen Kontakte",
  "(Co-Founder, Investor:innen, Mentor:innen, Talente) auf Konferenzen zeigt.",
  "Du bekommst als JSON: den Kontext der Nutzer:in (user), ein Kontaktprofil (profile) und ein regelbasiertes",
  "Match-Ergebnis (match: Score 0–100, reasons, risks, complementarity).",
  "Schreibe auf Deutsch eine Erklärung in 2 bis 4 Sätzen, warum dieser Kontakt für die Nutzer:in passt oder nicht:",
  "die wichtigsten Gründe und Risiken in natürlicher Sprache, Anrede „du“, keine erfundenen Fakten – nur was im JSON steht.",
  "Der letzte Satz ist ein konkreter Gesprächseinstieg und beginnt mit „Gesprächseinstieg:“.",
  "Fließtext ohne Markdown, ohne Aufzählungszeichen, ohne Überschriften, ohne Nennung des Scores als Zahl.",
].join(" ");

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

function firstName(profile: Profile): string {
  return profile.name.split(" ")[0] || profile.name;
}

function stripDot(text: string): string {
  return text.trim().replace(/\.$/, "");
}

/** Konkreter Gesprächseinstieg aus den Profildaten (Fallback ohne LLM). */
function openerFor(profile: Profile, user: UserContext): string {
  const name = firstName(profile);
  const shared = profile.verticals.find((v) => user.verticals.includes(v));
  if (shared) {
    return `Frag ${name}, was gerade im Bereich ${shared} am meisten Energie kostet – da habt ihr gemeinsamen Boden.`;
  }
  const exp = profile.experience[0];
  if (exp?.title && exp.company) {
    return `Knüpf an die Zeit als ${exp.title} bei ${exp.company} an und frag, welches Learning daraus heute am wichtigsten ist.`;
  }
  if (profile.lookingFor.length > 0) {
    return `Sprich direkt an, dass ${name} „${profile.lookingFor[0]}“ sucht, und erzähl in zwei Sätzen, wie deine Idee dazu passt.`;
  }
  return `Stell deine Idee in einem Satz vor und frag ${name}, woran sie oder er gerade arbeitet.`;
}

/** Erklärung aus reasons/risks zusammensetzen – 2 bis 4 Sätze, Deutsch. */
function templateExplanation(profile: Profile, match: MatchResult, user: UserContext): string {
  const verdict =
    match.score >= 70 ? "ein sehr starkes Match" : match.score >= 45 ? "ein solides Match" : "eher ein schwaches Match";
  const sentences: string[] = [`${profile.name} (${profile.headline}) ist für dich ${verdict}.`];
  if (match.reasons.length > 0) {
    sentences.push(`Dafür spricht: ${match.reasons.slice(0, 3).map((r) => stripDot(r.detail)).join("; ")}.`);
  }
  if (match.risks.length > 0) {
    sentences.push(`Zu beachten: ${match.risks.slice(0, 2).map(stripDot).join("; ")}.`);
  }
  sentences.push(`Gesprächseinstieg: ${openerFor(profile, user)}`);
  return sentences.join(" ");
}

/** Kompakter Ausschnitt fürs LLM – kein Roh-Export, keine E-Mail. */
function llmInput(profile: Profile, match: MatchResult, user: UserContext): string {
  return JSON.stringify(
    {
      user: {
        name: user.name,
        headline: user.headline,
        founderRole: user.founderRole,
        lookingFor: user.lookingFor,
        lookingForRoles: user.lookingForRoles,
        verticals: user.verticals,
        stage: user.stage,
        idea: user.idea,
        openToIdeas: user.openToIdeas,
        strengths: user.strengths,
        dims: user.dims,
        notes: user.notes,
      },
      profile: {
        name: profile.name,
        headline: profile.headline,
        location: profile.location,
        about: profile.about.slice(0, 600),
        networkRole: profile.networkRole,
        founderRole: profile.founderRole,
        lookingFor: profile.lookingFor,
        verticals: profile.verticals,
        stage: profile.stage,
        skills: profile.skills.slice(0, 10),
        experience: profile.experience.slice(0, 3).map((e) => ({ title: e.title, company: e.company })),
        dims: profile.dims,
        personality: {
          type: profile.personality.type,
          summary: profile.personality.summary,
          communicationStyle: profile.personality.communicationStyle,
        },
      },
      match,
    },
    null,
    2,
  );
}

async function llmExplanation(profile: Profile, match: MatchResult, user: UserContext): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const client = new OpenAI({ apiKey, timeout: OPENAI_TIMEOUT_MS, maxRetries: 1 });
    const response = await client.responses.create({
      model: process.env.OPENAI_TEXT_MODEL ?? "gpt-5-mini",
      instructions: INSTRUCTIONS,
      input: llmInput(profile, match, user),
    });
    const text = response.output_text.trim();
    return text.length > 0 ? text : null;
  } catch (error) {
    console.warn(
      "[api/match] OpenAI-Erklärung fehlgeschlagen, nutze Template:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body muss JSON sein: { profileId, userContext }." }, { status: 400 });
  }

  const { profileId, userContext } = (body && typeof body === "object" ? body : {}) as {
    profileId?: unknown;
    userContext?: unknown;
  };

  if (typeof profileId !== "string" || profileId.trim() === "") {
    return NextResponse.json({ error: "profileId fehlt." }, { status: 400 });
  }

  const profile = getProfile(profileId);
  if (!profile) {
    return NextResponse.json({ error: `Profil "${profileId}" nicht gefunden.` }, { status: 404 });
  }

  const user = normalizeUserContext(userContext);
  const match = scoreMatch(user, profile);
  const llmText = await llmExplanation(profile, match, user);

  // generatedBy folgt der Konvention von OutreachDraft/PrepPack (Zusatzfeld, Contract bleibt erfüllt).
  const result: MatchResult & { explanation: string; generatedBy: "template" | "llm" } = {
    ...match,
    explanation: llmText ?? templateExplanation(profile, match, user),
    generatedBy: llmText ? "llm" : "template",
  };
  return NextResponse.json(result);
}
