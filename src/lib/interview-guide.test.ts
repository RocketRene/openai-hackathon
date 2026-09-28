/**
 * Läuft ohne Build: `node --test src/lib/interview-guide.test.ts` (Node ≥ 22.18, Type-Stripping).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { InterviewGuide, Profile, UserContext } from "./types";

const modulePath = "./interview-guide.ts";

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

const USER: UserContext = {
  name: "Marvin",
  lookingFor: ["cofounder"],
  lookingForRoles: ["commercial"],
  verticals: ["ai"],
  idea: "AI-Tool für Co-Founder-Suche",
  openToIdeas: false,
  strengths: ["Backend"],
  dims: { vision: 7, design: 4, tech: 9, detail: 5, execution: 8 },
  completedInterview: false,
  updatedAt: "2026-09-26T00:00:00.000Z",
};

test("Co-Founder: 30 Minuten, 4 Abschnitte, Bezug auf experience[0]", async () => {
  const { buildInterviewGuide } = await import(modulePath);
  const guide: InterviewGuide = buildInterviewGuide(
    profile({
      id: "lena",
      name: "Lena Hoffmann",
      experience: [{ title: "Senior ML Engineer", company: "Google", start: "2019", end: "2026" }],
    }),
    USER,
  );
  assert.equal(guide.duration, "30 Minuten");
  assert.equal(guide.sections.length, 4);
  assert.equal(
    guide.sections.reduce((sum: number, s: { minutes: number }) => sum + s.minutes, 0),
    30,
  );
  assert.match(guide.sections[1].questions[0], /^Bei Google warst du Senior ML Engineer\./);
  assert.ok(guide.sections[0].questions.some((q: string) => q.includes("AI-Tool für Co-Founder-Suche")));
  assert.ok(guide.sections[1].questions.some((q: string) => q.includes("Commercial")));
  assert.ok(guide.unknowns.some((u: string) => u.startsWith("Verfügbarkeit: im Gespräch klären")));
});

test("Investor: Thesis, Ticket, Prozess; ohne Experience Fallback-Frage + Hinweis", async () => {
  const { buildInterviewGuide } = await import(modulePath);
  const guide: InterviewGuide = buildInterviewGuide(profile({ id: "inv", name: "Nora Vogt", networkRole: "investor" }), null);
  assert.equal(guide.title, "Erstgespräch mit Investor:in Nora Vogt");
  const all = guide.sections.flatMap((s: { questions: string[] }) => s.questions).join(" ");
  assert.match(all, /Thesis/);
  assert.match(all, /Ticketgröße/);
  assert.match(all, /Prozess/);
  assert.match(guide.sections[1].questions[0], /Investment/);
  assert.ok(guide.unknowns[0].startsWith("Berufliche Stationen"));
});

test("Markdown-Export enthält Titel, Abschnitte mit Minuten und Unbekanntes", async () => {
  const { buildInterviewGuide, interviewGuideToMarkdown } = await import(modulePath);
  const guide: InterviewGuide = buildInterviewGuide(profile({ id: "t", name: "Tim Talent", networkRole: "talent" }), USER);
  const md: string = interviewGuideToMarkdown(guide);
  assert.ok(md.startsWith("# Kennenlerngespräch mit Tim Talent\n"));
  assert.match(md, /## Motivation & gemeinsame Richtung \(5 min\)/);
  assert.match(md, /## Zusammenarbeit & Rahmenbedingungen \(10 min\)/);
  assert.match(md, /## Im Gespräch klären/);
  assert.match(md, /- Starttermin: im Gespräch klären/);
});
