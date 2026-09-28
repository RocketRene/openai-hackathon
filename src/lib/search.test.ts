/**
 * Läuft ohne Build: `node --test src/lib/search.test.ts` (Node ≥ 22.18, Type-Stripping).
 * Der Import geht über eine Variable, damit tsc keine `.ts`-Endung sieht.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Profile } from "./types";

const modulePath = "./search.ts";

function profile(overrides: Partial<Profile> & { id: string; name: string }): Profile {
  return {
    headline: "",
    location: "",
    photoUrl: "",
    about: "",
    experience: [],
    education: [],
    skills: [],
    networkRole: "cofounder",
    lookingFor: [],
    verticals: [],
    dims: { vision: 5, design: 5, tech: 5, detail: 5, execution: 5 },
    personality: { type: "builder", summary: "", traits: [], communicationStyle: "", outreachTips: [], avoid: [] },
    events: [],
    ...overrides,
  };
}

const PROFILES: Profile[] = [
  profile({
    id: "anna-fintech",
    name: "Anna Müller",
    headline: "CTO bei einem Fintech",
    verticals: ["fintech"],
    skills: ["Python", "Machine Learning"],
    source: { type: "linkedin" },
  }),
  profile({
    id: "ben-mock",
    name: "Ben Mock",
    headline: "AI Engineer",
    skills: ["PyTorch"],
    source: { type: "mock" },
  }),
  profile({
    id: "carla-real",
    name: "Carla Real",
    headline: "AI Product Lead",
    experience: [{ title: "Head of Product", company: "Zürich Insurance", start: "2020" }],
    source: { type: "conference" },
  }),
];

test("Stoppwörter fallen weg, Präfix-Match ab dem ersten Buchstaben", async () => {
  const { lexicalSearch, queryTerms } = await import(modulePath);
  assert.deepEqual(queryTerms("ich suche einen Fin"), ["fin"]);
  const hits = lexicalSearch(PROFILES, "ich suche einen Fin");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].profile.id, "anna-fintech");
  assert.deepEqual(hits[0].matches, ["fin"]);
});

test("Synonym ki ↔ ai; echte Profile vor Mock, dann Name", async () => {
  const { lexicalSearch } = await import(modulePath);
  const hits = lexicalSearch(PROFILES, "KI");
  assert.deepEqual(
    hits.map((h: { profile: Profile }) => h.profile.id),
    ["carla-real", "ben-mock"],
  );
});

test("NFKD-Normalisierung: „zurich“ trifft „Zürich“ (Experience-Firma)", async () => {
  const { lexicalSearch } = await import(modulePath);
  const hits = lexicalSearch(PROFILES, "zurich");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].profile.id, "carla-real");
});

test("mehrere Begriffe: Score = Trefferzahl, Sortierung absteigend", async () => {
  const { lexicalSearch } = await import(modulePath);
  const hits = lexicalSearch(PROFILES, "python fintech");
  assert.equal(hits[0].profile.id, "anna-fintech");
  assert.equal(hits[0].score, 2);
});

test("leere Anfrage liefert alle Profile (bis limit) mit Score 0", async () => {
  const { lexicalSearch } = await import(modulePath);
  const hits = lexicalSearch(PROFILES, "", { limit: 2 });
  assert.equal(hits.length, 2);
  assert.equal(hits[0].score, 0);
});
