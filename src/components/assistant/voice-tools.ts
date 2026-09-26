/**
 * Tools des Voice-Agents (OpenAI Agents SDK).
 * ---------------------------------------------------------------
 * Paket "voice-agent". Läuft nur im Browser (Client-Component), weil der
 * Nutzer-Kontext in localStorage liegt. Daten ausschließlich über src/lib/data.ts.
 *
 * SDK-Eigenheit: `tool()` ist per Default strict – alle Felder sind "required".
 * Optionale Felder deshalb als `.nullable()` (nicht `.optional()`), das Modell
 * schickt dann `null`.
 */
import { tool } from "@openai/agents/realtime";
import { z } from "zod";

import { findProfileByName, getEvents, getProfile, getProfiles, getProfilesForEvent, searchProfiles } from "@/lib/data";
import { rankCandidates } from "@/lib/matching";
import { DEFAULT_USER_CONTEXT, loadUserContext, patchUserContext } from "@/lib/user-context";
import { PERSONALITY_LABELS, type Profile, type UiAction, type UserContext } from "@/lib/types";
import { LIKELY_QUESTIONS_BY_ROLE } from "./voice-prompts";

export interface VoiceToolsContext {
  /** Leitet UI-Aktionen (Profil anzeigen, Liste anzeigen, Kontext-Update) an die Seite weiter. */
  emit: (action: UiAction) => void;
}

const NETWORK_ROLE = z.enum(["cofounder", "investor", "mentor", "talent", "expert"]);
const FOUNDER_ROLE = z.enum(["tech", "commercial", "product", "design", "operations", "domain-expert"]);
const STAGE = z.enum(["idea", "pre-seed", "seed", "series-a", "growth"]);

const DIM = z.number().min(0).max(10).nullable();

/* ------------------------------------------------------------------ */
/* Helfer                                                              */
/* ------------------------------------------------------------------ */

function truncate(text: string | undefined, max: number): string {
  if (!text) return "";
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** Kompakter Listeneintrag – reicht dem Modell, um Namen zu nennen und zu begründen. */
function compactListEntry(p: Profile) {
  return {
    id: p.id,
    name: p.name,
    headline: p.headline,
    location: p.location,
    networkRole: p.networkRole,
    founderRole: p.founderRole ?? null,
    verticals: p.verticals ?? [],
    lookingFor: p.lookingFor ?? [],
    stage: p.stage ?? null,
    personality: p.personality ? PERSONALITY_LABELS[p.personality.type] ?? p.personality.type : null,
  };
}

/** Kompaktes Vollprofil für show_candidate. */
function compactProfile(p: Profile) {
  const personality = p.personality;
  return {
    ...compactListEntry(p),
    about: truncate(p.about, 400),
    experience: (p.experience ?? [])
      .slice(0, 4)
      .map((e) => `${e.title} @ ${e.company}${e.start ? ` (${e.start}${e.end ? `–${e.end}` : "–heute"})` : ""}`),
    education: (p.education ?? [])
      .slice(0, 2)
      .map((e) => [e.degree, e.field, e.school].filter(Boolean).join(", "))
      .filter(Boolean),
    skills: (p.skills ?? []).slice(0, 10),
    personalityDetails: personality
      ? {
          type: personality.type,
          label: PERSONALITY_LABELS[personality.type] ?? personality.type,
          summary: personality.summary,
          traits: personality.traits ?? [],
          communicationStyle: personality.communicationStyle,
          outreachTips: (personality.outreachTips ?? []).slice(0, 3),
          avoid: (personality.avoid ?? []).slice(0, 3),
        }
      : null,
    events: p.events ?? [],
    linkedinUrl: p.linkedinUrl ?? null,
    likelyWantsToKnow: LIKELY_QUESTIONS_BY_ROLE[p.networkRole] ?? null,
  };
}

function compactUserContext(ctx: UserContext) {
  return {
    name: ctx.name,
    founderRole: ctx.founderRole ?? null,
    lookingFor: ctx.lookingFor,
    lookingForRoles: ctx.lookingForRoles,
    verticals: ctx.verticals,
    stage: ctx.stage ?? null,
    idea: ctx.idea,
    openToIdeas: ctx.openToIdeas,
    strengths: ctx.strengths,
    dims: ctx.dims,
    notes: ctx.notes ?? "",
    completedInterview: ctx.completedInterview,
  };
}

const LEADING_FILLER = /^(den|die|der|das|dem|des|mal|bitte|doch|herrn?|frau|an|auf)\s+/i;

/** „guck dir mal den Max an“ → „Max“ */
function normalizeName(input: string): string {
  let q = input.replace(/[.,!?"'„“‚‘]/g, " ").replace(/\s+/g, " ").trim();
  let prev = "";
  while (prev !== q) {
    prev = q;
    q = q.replace(LEADING_FILLER, "").trim();
  }
  return q;
}

/** Findet Profile per ID, Name oder einzelnen Namensbestandteilen. */
function resolveProfiles(nameOrId: string): Profile[] {
  const raw = nameOrId.trim();
  if (!raw) return [];

  const byId = getProfile(raw) ?? getProfile(raw.toLowerCase());
  if (byId) return [byId];

  const q = normalizeName(raw);
  if (!q) return [];

  let hits = findProfileByName(q);

  // Exakter Namenstreffer gewinnt, wenn es mehrere Teiltreffer gibt („Max“ vs. „Max Mustermann“).
  if (hits.length > 1) {
    const exact = hits.filter((p) => p.name.toLowerCase() === q.toLowerCase());
    if (exact.length === 1) return exact;
  }

  if (hits.length === 0) {
    // Token-Fallback: „Max Muster“ → alle Tokens müssen im Namen vorkommen, sonst mindestens eines.
    const tokens = q
      .toLowerCase()
      .split(" ")
      .filter((t) => t.length >= 3);
    if (tokens.length > 0) {
      const all = getProfiles();
      hits = all.filter((p) => {
        const n = p.name.toLowerCase();
        return tokens.every((t) => n.includes(t));
      });
      if (hits.length === 0 && tokens.length > 1) {
        hits = all.filter((p) => {
          const n = p.name.toLowerCase();
          return tokens.some((t) => n.includes(t));
        });
      }
    }
  }
  return hits;
}

function asJson(value: unknown): string {
  return JSON.stringify(value);
}

/* ------------------------------------------------------------------ */
/* Tools                                                               */
/* ------------------------------------------------------------------ */

export function createVoiceTools(ctx: VoiceToolsContext) {
  const showCandidate = tool({
    name: "show_candidate",
    description:
      "Zeigt das Profil einer Person live im Dashboard an – z. B. wenn die Nutzer:in sagt „guck dir mal den Max an“ oder „zeig mir Lisa“. Liefert das Profil kompakt zurück (Hintergrund, Persönlichkeitstyp, was die Person wissen will). Bei mehreren Treffern kommt eine Auswahl-Liste: dann kurz nachfragen, wen genau.",
    parameters: z.object({
      nameOrId: z
        .string()
        .describe("Vor- und/oder Nachname oder die Profil-ID (Slug), so wie die Nutzer:in die Person genannt hat"),
    }),
    execute: async ({ nameOrId }) => {
      const hits = resolveProfiles(nameOrId);

      if (hits.length === 1) {
        const p = hits[0];
        ctx.emit({ type: "show_candidate", profileId: p.id });
        return asJson({ status: "shown", profile: compactProfile(p) });
      }

      if (hits.length > 1) {
        const shortlist = hits.slice(0, 8);
        ctx.emit({ type: "show_candidates", profileIds: shortlist.map((p) => p.id) });
        return asJson({
          status: "ambiguous",
          hint: "Mehrere Treffer – frag die Nutzer:in kurz, wen genau sie meint (Nachname oder Firma).",
          total: hits.length,
          candidates: shortlist.map(compactListEntry),
        });
      }

      return asJson({
        status: "not_found",
        hint: `Niemand mit dem Namen „${nameOrId}“ gefunden. Frag nach Nachname oder Firma, oder nutze search_candidates mit einem Suchbegriff.`,
      });
    },
  });

  const searchCandidates = tool({
    name: "search_candidates",
    description:
      "Durchsucht alle Kontakte (Co-Founder, Investor:innen, Mentor:innen, Talente, Expert:innen) nach Freitext und Filtern und zeigt die Treffer im Dashboard. Nicht genutzte Filter als null übergeben.",
    parameters: z.object({
      query: z
        .string()
        .nullable()
        .describe("Freitext über Name, Headline, Skills, Firma, Ort, Verticals – null, wenn kein Suchbegriff"),
      networkRole: NETWORK_ROLE.nullable().describe(
        "Rolle im Ökosystem: cofounder, investor, mentor, talent oder expert – null für alle",
      ),
      founderRole: FOUNDER_ROLE.nullable().describe(
        "Team-Rolle (bei Co-Foundern/Talenten): tech, commercial, product, design, operations, domain-expert – null für alle",
      ),
      vertical: z
        .string()
        .nullable()
        .describe("Vertical in Kleinschreibung, z. B. fintech, healthtech, ai, b2b saas, climate – null für alle"),
      limit: z.number().int().min(1).max(10).nullable().describe("Maximale Trefferzahl, Standard 5"),
    }),
    execute: async (input) => {
      const limit = input.limit ?? 5;
      const results = searchProfiles({
        query: input.query ?? undefined,
        networkRole: input.networkRole ?? undefined,
        founderRole: input.founderRole ?? undefined,
        vertical: input.vertical?.trim().toLowerCase() || undefined,
      });

      // Wenn ein Nutzer-Kontext existiert, nach Match-Score sortieren.
      const user = loadUserContext();
      let ordered = results;
      if (user && results.length > 1) {
        const byId = new Map(results.map((p) => [p.id, p] as const));
        ordered = rankCandidates(user, results).flatMap((r) => {
          const p = byId.get(r.profileId);
          return p ? [p] : [];
        });
      }

      const top = ordered.slice(0, limit);
      if (top.length > 0) {
        ctx.emit({ type: "show_candidates", profileIds: top.map((p) => p.id) });
      }

      return asJson({
        status: top.length > 0 ? "ok" : "empty",
        total: results.length,
        shown: top.length,
        candidates: top.map(compactListEntry),
        hint:
          top.length === 0
            ? "Keine Treffer. Filter lockern (z. B. Vertical weglassen) oder anderen Suchbegriff probieren."
            : "Nenne höchstens drei Namen laut und biete an, mehr zu zeigen oder ein Profil zu öffnen.",
      });
    },
  });

  const saveUserContext = tool({
    name: "save_user_context",
    description:
      "Speichert, was du über die Nutzer:in gelernt hast (Rolle, was gesucht wird, Vertical, Idee, Stärken, Stage …). Nur die neuen oder geänderten Felder übergeben, alles andere null. Listen ersetzen den bisherigen Wert komplett – also immer die vollständige Liste schicken.",
    parameters: z.object({
      name: z.string().nullable().describe("Name der Nutzer:in"),
      headline: z.string().nullable().describe("Kurzbeschreibung, z. B. „Tech-Founder, Full-Stack & AI“"),
      linkedinUrl: z.string().nullable().describe("LinkedIn-URL, falls genannt"),
      founderRole: FOUNDER_ROLE.nullable().describe("Eigene Rolle im Gründerteam"),
      lookingFor: z
        .array(NETWORK_ROLE)
        .nullable()
        .describe("Welche Art Kontakte gesucht werden: cofounder, investor, mentor, talent, expert"),
      lookingForRoles: z.array(FOUNDER_ROLE).nullable().describe("Welche Team-Rollen im Co-Founder fehlen"),
      verticals: z
        .array(z.string())
        .nullable()
        .describe("Verticals in Kleinschreibung, z. B. fintech, healthtech, ai, b2b saas, climate, consumer"),
      stage: STAGE.nullable().describe("Phase: idea, pre-seed, seed, series-a, growth"),
      idea: z.string().nullable().describe("Die Startup-Idee in ein bis zwei Sätzen"),
      openToIdeas: z.boolean().nullable().describe("true, wenn die Person offen für Ideen ist statt eine feste zu haben"),
      strengths: z.array(z.string()).nullable().describe("Größte Stärken als kurze Stichworte"),
      dims: z
        .object({
          vision: DIM.describe("Vision 0–10"),
          design: DIM.describe("Design / visuelles Denken 0–10"),
          tech: DIM.describe("Technik 0–10"),
          detail: DIM.describe("Detailorientierung 0–10"),
          execution: DIM.describe("Umsetzungskraft 0–10"),
        })
        .nullable()
        .describe("Selbsteinschätzung, nur wenn die Nutzer:in dazu etwas gesagt hat; einzelne Werte null lassen"),
      notes: z.string().nullable().describe("Freitext-Notizen aus dem Gespräch, die sonst nirgends hinpassen"),
      completedInterview: z.boolean().nullable().describe("true, sobald das Interview genug ergeben hat"),
    }),
    execute: async (input) => {
      const patch: Partial<UserContext> = {};
      const set = <K extends keyof UserContext>(key: K, value: UserContext[K] | null | undefined) => {
        if (value !== null && value !== undefined) patch[key] = value;
      };

      set("name", input.name?.trim() || null);
      set("headline", input.headline?.trim() || null);
      set("linkedinUrl", input.linkedinUrl?.trim() || null);
      set("founderRole", input.founderRole);
      set("lookingFor", input.lookingFor);
      set("lookingForRoles", input.lookingForRoles);
      set(
        "verticals",
        input.verticals ? input.verticals.map((v) => v.trim().toLowerCase()).filter(Boolean) : null,
      );
      set("stage", input.stage);
      set("idea", input.idea?.trim() || null);
      set("openToIdeas", input.openToIdeas);
      set("strengths", input.strengths ? input.strengths.map((s) => s.trim()).filter(Boolean) : null);
      set("notes", input.notes?.trim() || null);
      set("completedInterview", input.completedInterview);

      if (input.dims) {
        const current = loadUserContext()?.dims ?? DEFAULT_USER_CONTEXT.dims;
        patch.dims = {
          vision: input.dims.vision ?? current.vision,
          design: input.dims.design ?? current.design,
          tech: input.dims.tech ?? current.tech,
          detail: input.dims.detail ?? current.detail,
          execution: input.dims.execution ?? current.execution,
        };
      }

      if (Object.keys(patch).length === 0) {
        return asJson({ status: "nothing_to_save", hint: "Keine neuen Felder übergeben." });
      }

      const next = patchUserContext(patch);
      ctx.emit({ type: "update_user_context", patch });

      return asJson({
        status: "saved",
        savedFields: Object.keys(patch),
        userContext: compactUserContext(next),
      });
    },
  });

  const proposeCandidates = tool({
    name: "propose_candidates",
    description:
      "Berechnet anhand des gespeicherten Nutzer-Kontexts die besten Matches (Co-Founder, Investor:innen, Mentor:innen …), zeigt sie im Dashboard und liefert Score, Gründe, Risiken und was jede Person wahrscheinlich wissen will.",
    parameters: z.object({
      limit: z.number().int().min(1).max(10).nullable().describe("Anzahl Vorschläge, Standard 3"),
    }),
    execute: async ({ limit }) => {
      const user = loadUserContext();
      if (!user) {
        return asJson({
          status: "no_context",
          hint: "Es ist noch kein Nutzer-Kontext gespeichert. Erst mit save_user_context mindestens Rolle, Gesuchtes und Vertical sichern.",
        });
      }

      const profiles = getProfiles();
      if (profiles.length === 0) {
        return asJson({ status: "empty", hint: "Es sind noch keine Profile in der Datenbank." });
      }

      const byId = new Map(profiles.map((p) => [p.id, p] as const));
      const proposals = rankCandidates(user, profiles)
        .slice(0, limit ?? 3)
        .flatMap((r) => {
          const p = byId.get(r.profileId);
          if (!p) return [];
          return [
            {
              ...compactListEntry(p),
              score: r.score,
              complementarity: r.complementarity,
              reasons: r.reasons.slice(0, 3).map((x) => `${x.label}: ${x.detail}`),
              risks: r.risks.slice(0, 2),
              communicationStyle: p.personality?.communicationStyle ?? null,
              likelyWantsToKnow: LIKELY_QUESTIONS_BY_ROLE[p.networkRole] ?? null,
            },
          ];
        });

      if (proposals.length > 0) {
        ctx.emit({ type: "show_candidates", profileIds: proposals.map((p) => p.id) });
      }

      return asJson({
        status: "ok",
        proposals,
        hint: "Nenne die Top 3 laut: pro Person ein Satz, warum sie passt, plus „X wird wahrscheinlich wissen wollen …“ aus likelyWantsToKnow.",
      });
    },
  });

  const listEvents = tool({
    name: "list_events",
    description: "Listet die Konferenzen, Meetups und Hackathons, aus denen die Kontakte stammen – mit Datum, Ort und Teilnehmerzahl.",
    parameters: z.object({}),
    execute: async () => {
      const events = getEvents().map((e) => ({
        slug: e.slug,
        name: e.name,
        date: e.date,
        location: e.location,
        type: e.type,
        description: truncate(e.description, 160),
        attendees: getProfilesForEvent(e.slug).length,
      }));
      return asJson({ status: events.length > 0 ? "ok" : "empty", events });
    },
  });

  return [showCandidate, searchCandidates, saveUserContext, proposeCandidates, listEvents];
}

export type VoiceTool = ReturnType<typeof createVoiceTools>[number];
