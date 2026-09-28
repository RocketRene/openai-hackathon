/**
 * Tools des FounderRadar-Text-Agenten (OpenAI Agents SDK).
 * ---------------------------------------------------------------
 * Jedes Tool liest ausschließlich über den Daten-Gateway (src/lib/data.ts) und
 * meldet UI-Aktionen bzw. Kontext-Änderungen über den ToolContext an den Request zurück.
 *
 * Schema-Hinweis: Das SDK sendet Tool-Schemas standardmäßig im Strict-Mode. Optionale
 * Felder sind deshalb durchgehend `.nullable()` (required + null) statt `.optional()`.
 */
import { tool, type Tool } from "@openai/agents";
import { z } from "zod";

import { findProfileByName, getEvents, getProfile, getProfiles, getProfilesForEvent, searchProfiles } from "@/lib/data";
import { rankCandidates, scoreMatch } from "@/lib/matching";
import type { MatchResult, Profile, UiAction, UserContext } from "@/lib/types";
import {
  FOUNDER_ROLES,
  NETWORK_ROLES,
  STAGES,
  describeRole,
  getMissingInterviewFields,
  INTERVIEW_FIELD_LABELS,
  likelyQuestionsFor,
  mergeUserContext,
  summarizeUserContext,
} from "./prompts";

export interface ToolContext {
  /** UI-Aktion an das Frontend melden (wird in ChatResponse.uiActions gesammelt). */
  emit: (a: UiAction) => void;
  /** Aktueller Nutzer-Kontext = Request-Kontext + bisherige Patches dieses Requests. */
  getUserContext: () => UserContext | null;
  /** Kontext-Patch aufnehmen (wird in ChatResponse.userContextPatch gesammelt). */
  setUserContext: (patch: Partial<UserContext>) => void;
}

/* ------------------------------------------------------------------ */
/* Helfer                                                              */
/* ------------------------------------------------------------------ */

function compactProfile(p: Profile, match?: MatchResult) {
  return {
    id: p.id,
    name: p.name,
    headline: p.headline,
    location: p.location,
    role: describeRole(p),
    verticals: p.verticals,
    lookingFor: p.lookingFor,
    stage: p.stage ?? null,
    personality: p.personality?.type ?? null,
    score: match ? match.score : null,
  };
}

/** Volles Profil ohne Rohdaten (source.raw) und mit gekürzten Listen. */
function profileDetails(p: Profile, user: UserContext | null) {
  const match = user ? scoreMatch(user, p) : undefined;
  return {
    id: p.id,
    name: p.name,
    headline: p.headline,
    location: p.location,
    photoUrl: p.photoUrl,
    linkedinUrl: p.linkedinUrl ?? null,
    role: describeRole(p),
    stage: p.stage ?? null,
    verticals: p.verticals,
    lookingFor: p.lookingFor,
    about: p.about,
    experience: (p.experience ?? []).slice(0, 6),
    education: (p.education ?? []).slice(0, 3),
    skills: (p.skills ?? []).slice(0, 15),
    languages: p.languages ?? [],
    personality: p.personality
      ? {
          type: p.personality.type,
          summary: p.personality.summary,
          traits: p.personality.traits,
          communicationStyle: p.personality.communicationStyle,
          outreachTips: p.personality.outreachTips,
          avoid: p.personality.avoid,
        }
      : null,
    dims: p.dims,
    events: p.events,
    tags: p.tags ?? [],
    match: match ? { score: match.score, reasons: match.reasons, risks: match.risks } : null,
    likelyToAsk: likelyQuestionsFor(p),
  };
}

/** Freitext-Suche: alle Wörter müssen irgendwo im Profil vorkommen (UND-Verknüpfung). */
function matchesQuery(p: Profile, query: string): boolean {
  const tokens = query
    .toLowerCase()
    .split(/[\s,;/]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  if (tokens.length === 0) return true;
  const haystack = [
    p.name,
    p.headline,
    p.location,
    p.about,
    ...(p.skills ?? []),
    ...(p.verticals ?? []),
    ...(p.lookingFor ?? []),
    ...(p.experience ?? []).map((e) => `${e.title} ${e.company}`),
    ...(p.tags ?? []),
    p.networkRole,
    p.founderRole ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return tokens.every((t) => haystack.includes(t));
}

/** Name oder ID → Profile (exakte ID zuerst, dann Namens-/Slug-Suche, dann Wort-für-Wort). */
export function resolveProfiles(nameOrId: string): Profile[] {
  const q = nameOrId.trim();
  if (!q) return [];
  const byId = getProfile(q) ?? getProfile(q.toLowerCase().replace(/\s+/g, "-"));
  if (byId) return [byId];
  const direct = findProfileByName(q);
  if (direct.length > 0) return direct;
  const seen = new Map<string, Profile>();
  for (const token of q.split(/\s+/).filter((t) => t.length >= 3)) {
    for (const p of findProfileByName(token)) seen.set(p.id, p);
  }
  return Array.from(seen.values());
}

function json(value: unknown): string {
  return JSON.stringify(value);
}

/* ------------------------------------------------------------------ */
/* Tools                                                               */
/* ------------------------------------------------------------------ */

export function createAgentTools(ctx: ToolContext): Tool[] {
  const searchCandidates = tool({
    name: "search_candidates",
    description:
      "Durchsucht alle Kontakte (Co-Founder, Investor:innen, Mentor:innen, Talente, Expert:innen). Freitext plus optionale Filter. Liefert eine kompakte Liste mit Match-Score (falls Nutzer-Kontext bekannt) und zeigt die Treffer im UI an.",
    parameters: z.object({
      query: z.string().nullable().describe("Freitext, z. B. 'fintech berlin' oder Skills/Firmen. null = kein Freitext."),
      networkRole: z.enum(NETWORK_ROLES).nullable().describe("Art des Kontakts oder null."),
      founderRole: z.enum(FOUNDER_ROLES).nullable().describe("Team-Rolle (bei Co-Foundern/Talenten) oder null."),
      vertical: z.string().nullable().describe("Vertical in Kleinschreibung, z. B. 'fintech', 'b2b saas', oder null."),
      limit: z.number().nullable().describe("Max. Treffer (Standard 5, max. 20)."),
    }),
    execute: async (input) => {
      const limit = Math.max(1, Math.min(20, Math.round(input.limit ?? 5)));
      const user = ctx.getUserContext();
      let results = searchProfiles({
        networkRole: input.networkRole ?? undefined,
        founderRole: input.founderRole ?? undefined,
        vertical: input.vertical?.trim().toLowerCase() || undefined,
      });
      const query = input.query?.trim();
      if (query) results = results.filter((p) => matchesQuery(p, query));
      const scored = results.map((p) => ({ p, match: user ? scoreMatch(user, p) : undefined }));
      if (user) scored.sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0));
      const top = scored.slice(0, limit);
      if (top.length > 0) ctx.emit({ type: "show_candidates", profileIds: top.map((t) => t.p.id) });
      return json({
        total: results.length,
        shown: top.length,
        results: top.map((t) => compactProfile(t.p, t.match)),
        hint:
          results.length === 0
            ? "Keine Treffer. Filter lockern (z. B. ohne Vertical) oder anderen Suchbegriff probieren."
            : "Nenne Personen mit Namen; das UI zeigt die Liste bereits an.",
      });
    },
  });

  const showCandidate = tool({
    name: "show_candidate",
    description:
      "Öffnet das Profil einer Person im UI (Foto, LinkedIn-Daten) – für 'zeig mir / guck dir mal <Name> an'. Nimmt Name (Vor- und/oder Nachname) oder ID. Bei mehreren Treffern kommt eine Auswahlliste zurück.",
    parameters: z.object({
      nameOrId: z.string().describe("Name oder ID der Person, z. B. 'Max', 'Max Mustermann' oder 'max-mustermann'."),
    }),
    execute: async (input) => {
      const found = resolveProfiles(input.nameOrId);
      if (found.length === 0) {
        return json({
          found: 0,
          message: `Niemand namens „${input.nameOrId}“ gefunden. Frag nach dem vollen Namen oder nutze search_candidates.`,
        });
      }
      if (found.length === 1) {
        const p = found[0];
        ctx.emit({ type: "show_candidate", profileId: p.id });
        return json({ found: 1, shownInUi: true, profile: profileDetails(p, ctx.getUserContext()) });
      }
      const user = ctx.getUserContext();
      return json({
        found: found.length,
        shownInUi: false,
        message: "Mehrere Treffer – frag kurz nach, wer gemeint ist, und rufe show_candidate dann mit der ID auf.",
        options: found.slice(0, 8).map((p) => compactProfile(p, user ? scoreMatch(user, p) : undefined)),
      });
    },
  });

  const getCandidateDetails = tool({
    name: "get_candidate_details",
    description:
      "Liefert das vollständige Profil einer Person (ohne Rohdaten) inkl. Match-Begründung und den Fragen, die diese Person im Gespräch wahrscheinlich stellt. Öffnet NICHT das UI.",
    parameters: z.object({
      id: z.string().describe("Profil-ID (slug) – oder ein Name, falls die ID unbekannt ist."),
    }),
    execute: async (input) => {
      const found = resolveProfiles(input.id);
      if (found.length === 0) return json({ found: 0, message: `Kein Profil zu „${input.id}“.` });
      if (found.length > 1) {
        return json({
          found: found.length,
          message: "Mehrdeutig – bitte ID wählen.",
          options: found.slice(0, 8).map((p) => compactProfile(p)),
        });
      }
      return json({ found: 1, profile: profileDetails(found[0], ctx.getUserContext()) });
    },
  });

  const saveUserContext = tool({
    name: "save_user_context",
    description:
      "Speichert neue oder korrigierte Informationen über die Nutzer:in. Nur die Felder setzen, die gerade gelernt wurden (alle anderen null lassen). Listen ersetzen den bisherigen Wert – vorhandene Einträge deshalb mit übernehmen.",
    parameters: z.object({
      name: z.string().nullable(),
      headline: z.string().nullable().describe("Kurzbeschreibung, z. B. 'Tech-Founder, Full-Stack & AI'."),
      linkedinUrl: z.string().nullable(),
      founderRole: z.enum(FOUNDER_ROLES).nullable().describe("Eigene Rolle im Gründerteam."),
      lookingFor: z.array(z.enum(NETWORK_ROLES)).nullable().describe("Welche Art Kontakte gesucht wird."),
      lookingForRoles: z.array(z.enum(FOUNDER_ROLES)).nullable().describe("Welche Team-Rollen im Co-Founder fehlen."),
      verticals: z
        .array(z.string())
        .nullable()
        .describe(
          "Verticals in Kleinschreibung (Vokabular: ai, fintech, healthtech, climate, b2b saas, consumer, robotics, defense, edtech, mobility, proptech, deeptech, ecommerce, hr tech, legaltech, energy, biotech, media).",
        ),
      stage: z.enum(STAGES).nullable(),
      idea: z.string().nullable().describe("Die Idee in 1–2 Sätzen."),
      openToIdeas: z.boolean().nullable().describe("true, wenn die Person (auch) offen für fremde Ideen ist."),
      strengths: z.array(z.string()).nullable(),
      notes: z.string().nullable().describe("Kurze Interview-Notizen des Coaches (ersetzt bisherige Notizen)."),
      completedInterview: z.boolean().nullable().describe("true, sobald genug bekannt ist, um Kandidat:innen vorzuschlagen."),
    }),
    execute: async (input) => {
      const patch: Partial<UserContext> = {};
      if (input.name?.trim()) patch.name = input.name.trim();
      if (input.headline?.trim()) patch.headline = input.headline.trim();
      if (input.linkedinUrl?.trim()) patch.linkedinUrl = input.linkedinUrl.trim();
      if (input.founderRole) patch.founderRole = input.founderRole;
      if (input.lookingFor) patch.lookingFor = Array.from(new Set(input.lookingFor));
      if (input.lookingForRoles) patch.lookingForRoles = Array.from(new Set(input.lookingForRoles));
      if (input.verticals) {
        patch.verticals = Array.from(new Set(input.verticals.map((v) => v.trim().toLowerCase()).filter(Boolean)));
      }
      if (input.stage) patch.stage = input.stage;
      if (input.idea?.trim()) patch.idea = input.idea.trim();
      if (typeof input.openToIdeas === "boolean") patch.openToIdeas = input.openToIdeas;
      if (input.strengths) patch.strengths = Array.from(new Set(input.strengths.map((s) => s.trim()).filter(Boolean)));
      if (input.notes?.trim()) patch.notes = input.notes.trim();
      if (typeof input.completedInterview === "boolean") patch.completedInterview = input.completedInterview;

      if (Object.keys(patch).length === 0) {
        return json({ saved: false, message: "Nichts zu speichern – alle Felder waren leer." });
      }
      patch.updatedAt = new Date().toISOString();
      ctx.setUserContext(patch);
      ctx.emit({ type: "update_user_context", patch });
      const merged = ctx.getUserContext();
      const missing = getMissingInterviewFields(merged).map((f) => INTERVIEW_FIELD_LABELS[f]);
      return json({
        saved: true,
        savedFields: Object.keys(patch).filter((k) => k !== "updatedAt"),
        context: summarizeUserContext(merged),
        stillMissing: missing,
      });
    },
  });

  const proposeCandidates = tool({
    name: "propose_candidates",
    description:
      "Rankt alle Kontakte gegen den aktuellen Nutzer-Kontext (deterministisches Matching) und zeigt die Top-Treffer im UI. Liefert pro Person Score, Gründe, Risiken und 'likelyToAsk' (was die Person im Gespräch wissen will). Vorher save_user_context aufrufen, falls neue Infos vorliegen.",
    parameters: z.object({
      limit: z.number().nullable().describe("Anzahl Vorschläge (Standard 3, max. 10)."),
      networkRole: z.enum(NETWORK_ROLES).nullable().describe("Optional nur eine Art von Kontakt, z. B. nur 'investor'."),
    }),
    execute: async (input) => {
      const user = ctx.getUserContext();
      if (!user) {
        return json({
          proposed: 0,
          message: "Kein Nutzer-Kontext vorhanden. Frag zuerst nach Rolle und Gesuchtem und speichere es mit save_user_context.",
        });
      }
      const limit = Math.max(1, Math.min(10, Math.round(input.limit ?? 3)));
      const pool = input.networkRole ? getProfiles().filter((p) => p.networkRole === input.networkRole) : getProfiles();
      if (pool.length === 0) return json({ proposed: 0, message: "Es sind noch keine Profile in der Datenbank." });
      const ranked = rankCandidates(user, pool);
      const positive = ranked.filter((r) => r.score > 0);
      const top = (positive.length > 0 ? positive : ranked).slice(0, limit);
      const ids = top.map((r) => r.profileId);
      ctx.emit({ type: "show_candidates", profileIds: ids });
      const candidates = top.map((r) => {
        const p = getProfile(r.profileId);
        if (!p) return { id: r.profileId, score: r.score };
        return {
          ...compactProfile(p, r),
          reasons: r.reasons.map((x) => `${x.label}: ${x.detail}`),
          risks: r.risks,
          complementarity: r.complementarity,
          likelyToAsk: likelyQuestionsFor(p),
        };
      });
      return json({
        proposed: candidates.length,
        basedOn: summarizeUserContext(user),
        candidates,
        instruction:
          "Pro Person 1 Satz warum + „Wenn du mit <Vorname> sprichst, wird <Vorname> wahrscheinlich wissen wollen: …“ (aus likelyToAsk).",
      });
    },
  });

  const listEvents = tool({
    name: "list_events",
    description: "Listet Konferenzen, Meetups, Demo-Days und Hackathons mit Datum, Ort und Anzahl bekannter Teilnehmer:innen.",
    parameters: z.object({
      slug: z.string().nullable().describe("Optional ein Event-Slug für Details; null = alle Events."),
    }),
    execute: async (input) => {
      const events = getEvents().filter((e) => !input.slug || e.slug === input.slug);
      return json({
        count: events.length,
        events: events.map((e) => ({
          slug: e.slug,
          name: e.name,
          date: e.date,
          location: e.location,
          type: e.type,
          description: e.description,
          attendeesKnown: getProfilesForEvent(e.slug).length,
        })),
      });
    },
  });

  return [searchCandidates, showCandidate, getCandidateDetails, saveUserContext, proposeCandidates, listEvents];
}

/** Aktueller Kontext inkl. Patch – null, wenn weder Basis noch Patch existieren. */
export function withPatch(base: UserContext | null, patch: Partial<UserContext>): UserContext | null {
  if (!base && Object.keys(patch).length === 0) return null;
  return mergeUserContext(base, patch);
}
