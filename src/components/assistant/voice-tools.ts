/**
 * Tools des Voice-Agents (OpenAI Agents SDK).
 * ---------------------------------------------------------------
 * Paket "voice-agent". Läuft nur im Browser (Client-Component), weil der
 * Nutzer-Kontext in localStorage liegt. Daten ausschließlich über src/lib/data.ts,
 * Suche über src/lib/search.ts (lexikalisch, Voya-Port), Leitfaden über
 * src/lib/interview-guide.ts, Merkliste über src/lib/shortlist.ts.
 *
 * SDK-Eigenheit: `tool()` ist per Default strict – alle Felder sind "required".
 * Optionale Felder deshalb als `.nullable()` (nicht `.optional()`), das Modell
 * schickt dann `null`.
 */
import { tool } from "@openai/agents/realtime";
import { z } from "zod";

import { findProfileByName, getEvents, getProfile, getProfiles, getProfilesForEvent, searchProfiles } from "@/lib/data";
import { buildInterviewGuide, summarizeInterviewGuide } from "@/lib/interview-guide";
import { rankCandidates } from "@/lib/matching";
import { lexicalSearch } from "@/lib/search";
import { addToShortlist, loadShortlist } from "@/lib/shortlist";
import { DEFAULT_USER_CONTEXT, loadUserContext, patchUserContext } from "@/lib/user-context";
import { PERSONALITY_LABELS, type Profile, type UiAction, type UserContext } from "@/lib/types";
import { LIKELY_QUESTIONS_BY_ROLE } from "./voice-prompts";

/** Voya-Hinweis: die lexikalische Suche zählt Treffer, sie bewertet keine Eignung. */
const SEARCH_NOTE = "Suchbegriff-Treffer, keine Eignungswahrscheinlichkeit.";

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
    constraints: ctx.constraints ?? "",
    completedInterview: ctx.completedInterview,
  };
}

/** Quelle eines Profils, wie sie im UI steht (Voya: Quellen-Transparenz). */
function sourceLabel(p: Profile): string {
  switch (p.source?.type) {
    case "linkedin":
      return "LinkedIn + IdeaLab";
    case "conference":
      return "IdeaLab";
    case "mock":
      return "Demo";
    default:
      return "manuell";
  }
}

/** Listen vereinigen: Bestehendes bleibt, Neues kommt dazu (Voya: „erhalten und ergänzen“). */
function mergeList<T>(current: readonly T[] | undefined, incoming: readonly T[] | null | undefined): T[] | null {
  if (!incoming) return null;
  const merged = Array.from(new Set([...(current ?? []), ...incoming]));
  return merged;
}

/** Freitext anhängen statt ersetzen; doppelte Sätze werden nicht erneut angehängt. */
function mergeText(current: string | undefined, incoming: string | null | undefined): string | null {
  const add = incoming?.replace(/\s+/g, " ").trim();
  if (!add) return null;
  const base = current?.trim() ?? "";
  if (!base) return add;
  if (base.toLowerCase().includes(add.toLowerCase())) return null;
  return `${base}${/[.!?]$/.test(base) ? "" : "."} ${add}`;
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
      "Durchsucht alle Kontakte (Co-Founder, Investor:innen, Mentor:innen, Talente, Expert:innen) mit einer lexikalischen Suche über Name, Headline, Ort, Skills, Verticals, Stationen, Ausbildung und Tags und zeigt die Treffer im Dashboard. Kurze berufliche Suchbegriffe nutzen (z. B. „fintech python“, „machine learning münchen“); bei wenig Treffern deutsche und englische Varianten probieren. Das Ergebnis zählt Suchbegriff-Treffer, es ist keine Eignungswahrscheinlichkeit. Nicht genutzte Filter als null übergeben.",
    parameters: z.object({
      query: z
        .string()
        .nullable()
        .describe("Kurze Suchbegriffe über Name, Headline, Skills, Firma, Ort, Verticals, Ausbildung – null, wenn kein Suchbegriff"),
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
      const query = input.query?.trim() ?? "";

      // 1) Strukturierte Filter über das Gateway (ohne Freitext), 2) lexikalische Suche darüber.
      const filtered = searchProfiles({
        networkRole: input.networkRole ?? undefined,
        founderRole: input.founderRole ?? undefined,
        vertical: input.vertical?.trim().toLowerCase() || undefined,
      });
      const hits = lexicalSearch(filtered, query, { limit: 50 });

      // Ohne Suchbegriff (nur Filter) nach Match-Score sortieren, sofern ein Nutzer-Kontext existiert.
      const user = loadUserContext();
      let ordered = hits;
      if (!query && user && hits.length > 1) {
        const byId = new Map(hits.map((h) => [h.profile.id, h] as const));
        ordered = rankCandidates(
          user,
          hits.map((h) => h.profile),
        ).flatMap((r) => {
          const h = byId.get(r.profileId);
          return h ? [h] : [];
        });
      }

      const top = ordered.slice(0, limit);
      if (top.length > 0) {
        ctx.emit({ type: "show_candidates", profileIds: top.map((h) => h.profile.id) });
      }

      return asJson({
        status: top.length > 0 ? "ok" : "empty",
        query,
        total: hits.length,
        shown: top.length,
        candidates: top.map((h) => ({
          ...compactListEntry(h.profile),
          matches: h.matches,
          matchCount: h.score,
          source: sourceLabel(h.profile),
          firstExperience: h.profile.experience?.[0]
            ? `${h.profile.experience[0].title} @ ${h.profile.experience[0].company}`
            : null,
        })),
        note: SEARCH_NOTE,
        hint:
          top.length === 0
            ? "Keine Treffer. Kürzere oder andere Suchbegriffe probieren (deutsch/englisch), Filter lockern."
            : "Nenne höchstens drei Namen laut und sag pro Person, welche Suchbegriffe getroffen haben – nicht, wie gut sie passt. Biete an, ein Profil zu öffnen.",
      });
    },
  });

  const saveUserContext = tool({
    name: "save_user_context",
    description:
      "Hält bestätigte Angaben über die Nutzer:in im Suchprofil fest (Rolle, was gesucht wird, Vertical, Idee, Stärken, Stage, Rahmenbedingungen …). Bestehende Inhalte bleiben erhalten und werden ergänzt: Listen werden mit dem Bisherigen vereinigt, Freitext (constraints, notes) wird angehängt, null lässt ein Feld unverändert. Nur übergeben, was die Nutzer:in tatsächlich gesagt hat – nichts erfinden.",
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
      notes: z.string().nullable().describe("Freitext-Notizen aus dem Gespräch, die sonst nirgends hinpassen (wird angehängt)"),
      constraints: z
        .string()
        .nullable()
        .describe(
          "Rahmenbedingungen als Freitext, wird angehängt: Standort/remote, verfügbare Zeit, Gründungsbeginn, Finanzierung/Risiko, Zusammenarbeit, Muss- und Ausschlusskriterien",
        ),
      completedInterview: z.boolean().nullable().describe("true, sobald das Interview genug ergeben hat"),
    }),
    execute: async (input) => {
      const current = loadUserContext() ?? DEFAULT_USER_CONTEXT;
      const patch: Partial<UserContext> = {};
      const set = <K extends keyof UserContext>(key: K, value: UserContext[K] | null | undefined) => {
        if (value !== null && value !== undefined) patch[key] = value;
      };

      set("name", input.name?.trim() || null);
      set("headline", input.headline?.trim() || null);
      set("linkedinUrl", input.linkedinUrl?.trim() || null);
      set("founderRole", input.founderRole);
      set("lookingFor", mergeList(current.lookingFor, input.lookingFor));
      set("lookingForRoles", mergeList(current.lookingForRoles, input.lookingForRoles));
      set(
        "verticals",
        mergeList(current.verticals, input.verticals ? input.verticals.map((v) => v.trim().toLowerCase()).filter(Boolean) : null),
      );
      set("stage", input.stage);
      set("idea", input.idea?.trim() || null);
      set("openToIdeas", input.openToIdeas);
      set("strengths", mergeList(current.strengths, input.strengths ? input.strengths.map((s) => s.trim()).filter(Boolean) : null));
      set("notes", mergeText(current.notes, input.notes));
      set("constraints", mergeText(current.constraints, input.constraints));
      set("completedInterview", input.completedInterview);

      if (input.dims) {
        const dims = current.dims ?? DEFAULT_USER_CONTEXT.dims;
        patch.dims = {
          vision: input.dims.vision ?? dims.vision,
          design: input.dims.design ?? dims.design,
          tech: input.dims.tech ?? dims.tech,
          detail: input.dims.detail ?? dims.detail,
          execution: input.dims.execution ?? dims.execution,
        };
      }

      if (Object.keys(patch).length === 0) {
        return asJson({
          status: "nothing_to_save",
          hint: "Nichts Neues – das Suchprofil enthält diese Angaben schon.",
          userContext: compactUserContext(current),
        });
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

  const prepareInterview = tool({
    name: "prepare_interview",
    description:
      "Erstellt einen belegbaren 30-Minuten-Interviewleitfaden für ein Erstgespräch mit einer Person (vier Abschnitte, Fragen mit Bezug auf ihre erste berufliche Station, plus was sich nicht aus dem Profil ableiten lässt). Der Leitfaden erscheint im Dashboard und kann als Markdown heruntergeladen werden. Entweder profileId oder name übergeben, das andere null.",
    parameters: z.object({
      profileId: z.string().nullable().describe("Profil-ID (Slug), falls bekannt – sonst null"),
      name: z.string().nullable().describe("Name der Person, falls keine ID bekannt ist – sonst null"),
    }),
    execute: async ({ profileId, name }) => {
      const hits = resolveProfiles(profileId?.trim() || name?.trim() || "");
      if (hits.length === 0) {
        return asJson({
          status: "not_found",
          hint: "Niemand gefunden. Frag nach dem Nachnamen oder nutze search_candidates.",
        });
      }
      if (hits.length > 1) {
        const shortlist = hits.slice(0, 8);
        ctx.emit({ type: "show_candidates", profileIds: shortlist.map((p) => p.id) });
        return asJson({
          status: "ambiguous",
          hint: "Mehrere Treffer – frag kurz, wen genau.",
          candidates: shortlist.map(compactListEntry),
        });
      }
      const profile = hits[0];
      const guide = buildInterviewGuide(profile, loadUserContext());
      ctx.emit({ type: "show_interview_guide", profileId: profile.id, guide });
      return asJson({
        status: "ok",
        profileId: profile.id,
        name: profile.name,
        summary: summarizeInterviewGuide(guide),
        sections: guide.sections.map((s) => ({ title: s.title, minutes: s.minutes, questions: s.questions })),
        unknowns: guide.unknowns,
        hint: "Der Leitfaden steht jetzt im Dashboard. Fasse ihn in zwei, drei Sätzen zusammen (Abschnitte, erste Frage zur beruflichen Station) und nenne, was im Gespräch geklärt werden muss. Erfinde keine Verfügbarkeit oder Eignung.",
      });
    },
  });

  const shortlistCandidate = tool({
    name: "shortlist_candidate",
    description:
      "Setzt eine Person auf die Merkliste der Nutzer:in („merk dir die Lisa“, „den will ich mir merken“). Entweder profileId oder name übergeben, das andere null.",
    parameters: z.object({
      profileId: z.string().nullable().describe("Profil-ID (Slug), falls bekannt – sonst null"),
      name: z.string().nullable().describe("Name der Person, falls keine ID bekannt ist – sonst null"),
    }),
    execute: async ({ profileId, name }) => {
      const hits = resolveProfiles(profileId?.trim() || name?.trim() || "");
      if (hits.length === 0) {
        return asJson({ status: "not_found", hint: "Niemand gefunden. Frag nach dem Nachnamen." });
      }
      if (hits.length > 1) {
        return asJson({
          status: "ambiguous",
          hint: "Mehrere Treffer – frag kurz, wen genau.",
          candidates: hits.slice(0, 8).map(compactListEntry),
        });
      }
      const profile = hits[0];
      const before = loadShortlist();
      const already = before.includes(profile.id);
      const ids = already ? before : addToShortlist(profile.id);
      return asJson({
        status: already ? "already_on_shortlist" : "added",
        name: profile.name,
        profileId: profile.id,
        shortlistCount: ids.length,
        hint: already
          ? `${profile.name} steht schon auf der Merkliste. Sag das in einem Satz.`
          : `Bestätige in einem Satz, dass ${profile.name} gemerkt ist (jetzt ${ids.length} auf der Liste).`,
      });
    },
  });

  const getShortlist = tool({
    name: "get_shortlist",
    description: "Liest die Merkliste der Nutzer:in (gemerkte Personen) und zeigt sie im Dashboard.",
    parameters: z.object({}),
    execute: async () => {
      const ids = loadShortlist();
      const profiles = ids.flatMap((id) => {
        const p = getProfile(id);
        return p ? [p] : [];
      });
      if (profiles.length > 0) {
        ctx.emit({ type: "show_candidates", profileIds: profiles.slice(0, 10).map((p) => p.id) });
      }
      return asJson({
        status: profiles.length > 0 ? "ok" : "empty",
        count: profiles.length,
        candidates: profiles.slice(0, 10).map(compactListEntry),
        hint:
          profiles.length === 0
            ? "Die Merkliste ist leer. Sag das kurz und biete eine Suche an."
            : "Nenne die Namen kurz (höchstens fünf) und frag, ob du jemanden genauer zeigen oder ein Gespräch vorbereiten sollst.",
      });
    },
  });

  return [
    showCandidate,
    searchCandidates,
    saveUserContext,
    proposeCandidates,
    listEvents,
    prepareInterview,
    shortlistCandidate,
    getShortlist,
  ];
}

export type VoiceTool = ReturnType<typeof createVoiceTools>[number];
