/**
 * Lexikalische Kandidatensuche (Port von Voya `searchCandidates`, web/server/candidates.mjs).
 * ---------------------------------------------------------------
 * Zählt Suchbegriff-Treffer in den Profilfeldern – bewusst KEINE Eignungswahrscheinlichkeit.
 * Deterministisch, ohne LLM, läuft im Browser und auf dem Server.
 *
 * - Wort-Tokenisierung mit NFKD-Normalisierung (ü → u, é → e), Kleinschreibung
 * - Stoppwörter („ich suche einen …“) werden ignoriert, außer die Anfrage besteht nur aus einem Wort
 * - Präfix-Match ab dem ersten Buchstaben („fin“ trifft „fintech“)
 * - Synonym ki ↔ ai
 *
 * Nur Typen aus types.ts – keine Laufzeit-Imports, damit die Datei auch unter
 * `node --test` (Type-Stripping) läuft.
 */
import type { Profile } from "./types";

export interface SearchHit {
  profile: Profile;
  /** Welche Suchbegriffe im Profil vorkommen (normalisiert). */
  matches: string[];
  /** Anzahl der getroffenen Suchbegriffe. */
  score: number;
}

export interface SearchOptions {
  /** Maximale Trefferzahl (Standard 50). */
  limit?: number;
  /** Nur echte (nicht-Mock) Profile berücksichtigen. */
  realOnly?: boolean;
}

const STOP_WORDS = new Set([
  // Deutsch
  "ich",
  "suche",
  "such",
  "brauche",
  "einen",
  "eine",
  "einem",
  "einer",
  "ein",
  "mit",
  "und",
  "oder",
  "der",
  "die",
  "das",
  "den",
  "dem",
  "des",
  "fur",
  "in",
  "im",
  "am",
  "an",
  "auf",
  "aus",
  "zu",
  "von",
  "vom",
  "bei",
  "nach",
  "wer",
  "wen",
  "wem",
  "jemand",
  "jemanden",
  "zeig",
  "zeige",
  "mir",
  "mal",
  "bitte",
  "alle",
  "leute",
  "person",
  "personen",
  // Englisch
  "a",
  "an",
  "the",
  "and",
  "or",
  "for",
  "with",
  "in",
  "someone",
  "people",
  "find",
  "me",
]);

const SYNONYMS: Record<string, string[]> = {
  ki: ["ai"],
  ai: ["ki"],
};

/** Zerlegt Text in normalisierte Wörter (Buchstaben, Ziffern, + und #). */
export function tokenize(value: string | undefined | null): string[] {
  if (!value) return [];
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .match(/[\p{L}\p{N}+#]+/gu) ?? []
  );
}

/** Suchbegriffe aus der Anfrage: dedupliziert, ohne Stoppwörter (außer bei Ein-Wort-Anfragen). */
export function queryTerms(query: string): string[] {
  const words = tokenize(query);
  const single = words.length === 1;
  return Array.from(new Set(words.filter((w) => single || !STOP_WORDS.has(w))));
}

function isReal(p: Profile): boolean {
  return p.source?.type !== "mock";
}

/** Alle durchsuchbaren Felder eines Profils als Token-Menge. */
export function profileTokens(p: Profile): Set<string> {
  const fields: string[] = [
    p.name,
    p.headline,
    p.location,
    p.about,
    ...(p.skills ?? []),
    ...(p.verticals ?? []),
    ...(p.lookingFor ?? []),
    ...(p.experience ?? []).map((e) => `${e.title ?? ""} ${e.company ?? ""} ${e.description ?? ""}`),
    ...(p.education ?? []).map((e) => `${e.school ?? ""} ${e.degree ?? ""} ${e.field ?? ""}`),
    ...(p.tags ?? []),
  ];
  return new Set(tokenize(fields.join(" ")));
}

function termMatches(term: string, tokens: Set<string>): boolean {
  if (tokens.has(term)) return true;
  for (const alt of SYNONYMS[term] ?? []) {
    if (tokens.has(alt)) return true;
  }
  for (const w of tokens) {
    if (w.startsWith(term)) return true;
  }
  return false;
}

/**
 * Lexikalische Suche über Profile.
 * Ergebnis nach Trefferzahl sortiert, dann echte Profile vor Mock-Profilen, dann Name.
 * Leere Anfrage → alle Profile (bis `limit`), Score 0.
 */
export function lexicalSearch(profiles: Profile[], query: string, options: SearchOptions = {}): SearchHit[] {
  const limit = options.limit ?? 50;
  const terms = queryTerms(query);

  const hits: SearchHit[] = [];
  for (const profile of profiles) {
    if (options.realOnly && !isReal(profile)) continue;
    const tokens = profileTokens(profile);
    const matches = terms.filter((t) => termMatches(t, tokens));
    if (terms.length > 0 && matches.length === 0) continue;
    hits.push({ profile, matches, score: matches.length });
  }

  hits.sort(
    (a, b) =>
      b.score - a.score ||
      Number(isReal(b.profile)) - Number(isReal(a.profile)) ||
      a.profile.name.localeCompare(b.profile.name, "de"),
  );

  return hits.slice(0, limit);
}
