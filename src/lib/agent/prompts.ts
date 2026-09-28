/**
 * Prompts und "Skill"-Wissen des FounderRadar-Text-Agenten.
 * ---------------------------------------------------------------
 * Reine Text-/Regel-Helfer OHNE SDK-Abhängigkeit. Werden vom LLM-Agenten
 * (server-agent.ts, tools.ts) und vom regelbasierten Fallback
 * (fallback-interviewer.ts) gemeinsam genutzt – damit beide dieselbe Sprache sprechen.
 */
import type {
  AgentMode,
  FounderRole,
  NetworkRole,
  PersonalityType,
  Profile,
  Stage,
  UserContext,
} from "@/lib/types";
import { FOUNDER_DIM_KEYS, FOUNDER_DIM_LABELS, PERSONALITY_LABELS } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Vokabular (Contract aus docs/PARALLEL-WORK.md)                      */
/* ------------------------------------------------------------------ */

export const NETWORK_ROLES = ["cofounder", "investor", "mentor", "talent", "expert"] as const;
export const FOUNDER_ROLES = ["tech", "commercial", "product", "design", "operations", "domain-expert"] as const;
export const STAGES = ["idea", "pre-seed", "seed", "series-a", "growth"] as const;

export const VERTICALS = [
  "ai",
  "fintech",
  "healthtech",
  "climate",
  "b2b saas",
  "consumer",
  "robotics",
  "defense",
  "edtech",
  "mobility",
  "proptech",
  "deeptech",
  "ecommerce",
  "hr tech",
  "legaltech",
  "energy",
  "biotech",
  "media",
] as const;

export const NETWORK_ROLE_LABELS: Record<NetworkRole, string> = {
  cofounder: "Co-Founder",
  investor: "Investor:in",
  mentor: "Mentor:in",
  talent: "Talent",
  expert: "Expert:in",
};

export const FOUNDER_ROLE_LABELS: Record<FounderRole, string> = {
  tech: "Tech",
  commercial: "Commercial / Business",
  product: "Produkt",
  design: "Design",
  operations: "Operations",
  "domain-expert": "Domain-Expert:in",
};

export const STAGE_LABELS: Record<Stage, string> = {
  idea: "Ideenphase",
  "pre-seed": "Pre-Seed",
  seed: "Seed",
  "series-a": "Series A",
  growth: "Growth",
};

/** Wie der jeweilige Persönlichkeitstyp in einem Gespräch auftritt (für die Simulation). */
export const PERSONALITY_TONE: Record<PersonalityType, string> = {
  visionary:
    "begeistert, denkt groß, springt schnell zum Big Picture; fragt nach Vision, Warum-jetzt und Ambition; wenig Geduld für Kleinkram",
  builder:
    "pragmatisch, hands-on, direkt; will wissen, was konkret gebaut wurde, Demo, Tech-Entscheidungen; mag klare, kurze Aussagen",
  operator:
    "strukturiert, ruhig, planorientiert; fragt nach Prozess, Meilensteinen, Verantwortlichkeiten und Zahlen",
  connector:
    "warm, gesprächig, beziehungsorientiert; fragt nach Menschen, Team, Netzwerk und gemeinsamen Kontakten; erzählt selbst gern",
  analyst:
    "präzise, skeptisch, faktenbasiert; hakt bei Zahlen und Annahmen nach, mag Belege statt Superlative",
};

/** Eine typische Zusatzfrage je Persönlichkeitstyp. */
const PERSONALITY_QUESTION: Record<PersonalityType, string> = {
  visionary: "Wie sieht das Ganze in fünf Jahren aus – was ist die große Vision?",
  builder: "Was habt ihr konkret schon gebaut, und kann ich es sehen?",
  operator: "Wie sieht euer Plan für die nächsten sechs Monate aus – Meilensteine, Verantwortlichkeiten?",
  connector: "Wer ist sonst noch an Bord oder unterstützt euch – gibt es gemeinsame Kontakte?",
  analyst: "Welche Zahlen oder Belege stützen eure Annahmen bisher?",
};

/** Was diese Art von Kontakt im Erstgespräch typischerweise wissen will. */
const ROLE_QUESTIONS: Record<NetworkRole, string[]> = {
  investor: [
    "Wie groß ist der Markt und warum ist gerade jetzt der richtige Zeitpunkt?",
    "Welche Traktion habt ihr schon – Nutzer, Umsatz, Pilotkunden?",
    "Wer ist im Team, und warum seid gerade ihr die Richtigen dafür?",
    "Wie viel wollt ihr raisen und wofür genau?",
  ],
  cofounder: [
    "Woran arbeitest du gerade konkret, und was hast du schon gebaut oder erreicht?",
    "Wie stellst du dir Rollenverteilung und Equity vor?",
    "Bist du Vollzeit dabei, und wie lang ist dein Runway?",
    "Wie arbeitest du – Tempo, Entscheidungen, Umgang mit Konflikten?",
  ],
  mentor: [
    "Was ist gerade dein größtes Problem oder deine größte Unsicherheit?",
    "Was hast du schon ausprobiert, und was hast du daraus gelernt?",
    "Was genau erhoffst du dir von mir – Feedback, Kontakte, Sparring?",
  ],
  talent: [
    "Was genau wäre meine Rolle, und mit wem würde ich arbeiten?",
    "Welchen Stack und welche Arbeitsweise habt ihr, wie sieht der Alltag aus?",
    "Wie sind Gehalt, Equity und Runway?",
  ],
  expert: [
    "Was ist eure konkrete Fragestellung in meinem Fachgebiet?",
    "Wie tief seid ihr schon im Thema – was wisst ihr, was fehlt euch?",
    "Wie soll die Zusammenarbeit aussehen – einmalig, Advisor-Rolle, Beteiligung?",
  ],
};

/** 3–4 Fragen, die diese Person im Erstgespräch wahrscheinlich stellt. */
export function likelyQuestionsFor(p: Profile): string[] {
  const byRole = ROLE_QUESTIONS[p.networkRole] ?? ROLE_QUESTIONS.cofounder;
  const type = p.personality?.type;
  const extra = type ? PERSONALITY_QUESTION[type] : undefined;
  const list = extra ? [byRole[0], extra, ...byRole.slice(1)] : [...byRole];
  return Array.from(new Set(list)).slice(0, 4);
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** "Co-Founder (Tech)", "Investor:in" … – nie Rohdaten-Feldnamen nach außen geben. */
export function describeRole(p: Pick<Profile, "networkRole" | "founderRole">): string {
  const base = NETWORK_ROLE_LABELS[p.networkRole] ?? p.networkRole;
  const fr = p.founderRole ? (FOUNDER_ROLE_LABELS[p.founderRole] ?? p.founderRole) : undefined;
  return fr ? `${base} (${fr})` : base;
}

/* ------------------------------------------------------------------ */
/* Nutzer-Kontext: Merge & Vollständigkeit                             */
/* ------------------------------------------------------------------ */

/** Serverseitiges Pendant zu DEFAULT_USER_CONTEXT (user-context.ts ist "use client"). */
export const EMPTY_USER_CONTEXT: UserContext = {
  name: "",
  headline: "",
  linkedinUrl: "",
  founderRole: undefined,
  lookingFor: [],
  lookingForRoles: [],
  verticals: [],
  stage: undefined,
  idea: "",
  openToIdeas: false,
  strengths: [],
  dims: { vision: 5, design: 5, tech: 5, detail: 5, execution: 5 },
  notes: "",
  completedInterview: false,
  updatedAt: new Date(0).toISOString(),
};

export function mergeUserContext(base: UserContext | null | undefined, patch: Partial<UserContext>): UserContext {
  const merged: UserContext = { ...EMPTY_USER_CONTEXT, ...(base ?? {}), ...patch };
  // Arrays aus kaputtem Client-State absichern
  merged.lookingFor = Array.isArray(merged.lookingFor) ? merged.lookingFor : [];
  merged.lookingForRoles = Array.isArray(merged.lookingForRoles) ? merged.lookingForRoles : [];
  merged.verticals = Array.isArray(merged.verticals) ? merged.verticals : [];
  merged.strengths = Array.isArray(merged.strengths) ? merged.strengths : [];
  merged.dims = merged.dims ?? EMPTY_USER_CONTEXT.dims;
  return merged;
}

export type InterviewField = "founderRole" | "lookingFor" | "verticals" | "idea" | "strengths" | "stage";

/** Reihenfolge, in der das Interview Lücken schließt. */
export const INTERVIEW_FIELD_ORDER: InterviewField[] = [
  "founderRole",
  "lookingFor",
  "verticals",
  "idea",
  "strengths",
  "stage",
];

export const INTERVIEW_FIELD_LABELS: Record<InterviewField, string> = {
  founderRole: "eigene Rolle im Team",
  lookingFor: "wen du suchst (Art des Kontakts, fehlende Team-Rolle)",
  verticals: "Vertical / Branche",
  idea: "Idee oder offen für Ideen",
  strengths: "Stärken",
  stage: "Stage",
};

export function getMissingInterviewFields(ctx: UserContext | null | undefined): InterviewField[] {
  if (!ctx) return [...INTERVIEW_FIELD_ORDER];
  const missing: InterviewField[] = [];
  if (!ctx.founderRole) missing.push("founderRole");
  const wantsCofounder = ctx.lookingFor.includes("cofounder");
  if (ctx.lookingFor.length === 0 || (wantsCofounder && ctx.lookingForRoles.length === 0)) missing.push("lookingFor");
  if (ctx.verticals.length === 0 && !ctx.openToIdeas) missing.push("verticals");
  if (!ctx.idea?.trim() && !ctx.openToIdeas) missing.push("idea");
  if (ctx.strengths.length === 0) missing.push("strengths");
  if (!ctx.stage) missing.push("stage");
  return missing;
}

/** Reicht das Wissen, um sinnvoll Kandidat:innen zu ranken? (Rolle/Gesuchtes/Vertical-oder-offen) */
export function hasEnoughForProposals(ctx: UserContext | null | undefined): boolean {
  if (!ctx) return false;
  const knowsWho = ctx.lookingFor.length > 0 || ctx.lookingForRoles.length > 0;
  const knowsWhere = ctx.verticals.length > 0 || ctx.openToIdeas;
  const knowsSelf = Boolean(ctx.founderRole) || ctx.lookingForRoles.length > 0;
  return knowsWho && knowsWhere && knowsSelf;
}

/* ------------------------------------------------------------------ */
/* Zusammenfassungen für den Prompt                                    */
/* ------------------------------------------------------------------ */

export function summarizeUserContext(ctx: UserContext | null | undefined): string {
  if (!ctx) return "Noch nichts bekannt (kein Onboarding, kein Interview).";
  const lines: string[] = [];
  if (ctx.name) lines.push(`Name: ${ctx.name}`);
  if (ctx.headline) lines.push(`Headline: ${ctx.headline}`);
  if (ctx.founderRole) lines.push(`Eigene Rolle im Team: ${FOUNDER_ROLE_LABELS[ctx.founderRole] ?? ctx.founderRole}`);
  if (ctx.lookingFor.length > 0) {
    const who = ctx.lookingFor.map((r) => NETWORK_ROLE_LABELS[r] ?? r).join(", ");
    const roles = ctx.lookingForRoles.map((r) => FOUNDER_ROLE_LABELS[r] ?? r).join(", ");
    lines.push(`Sucht: ${who}${roles ? ` – fehlende Team-Rollen: ${roles}` : ""}`);
  } else if (ctx.lookingForRoles.length > 0) {
    lines.push(`Fehlende Team-Rollen: ${ctx.lookingForRoles.map((r) => FOUNDER_ROLE_LABELS[r] ?? r).join(", ")}`);
  }
  if (ctx.verticals.length > 0) lines.push(`Verticals: ${ctx.verticals.join(", ")}`);
  if (ctx.stage) lines.push(`Stage: ${STAGE_LABELS[ctx.stage] ?? ctx.stage}`);
  if (ctx.idea?.trim()) lines.push(`Idee: ${ctx.idea.trim()}`);
  lines.push(`Offen für Ideen: ${ctx.openToIdeas ? "ja" : "nein/unklar"}`);
  if (ctx.strengths.length > 0) lines.push(`Stärken: ${ctx.strengths.join(", ")}`);
  if (ctx.dims) {
    const dims = FOUNDER_DIM_KEYS.map((k) => `${FOUNDER_DIM_LABELS[k]} ${ctx.dims[k]}/10`).join(", ");
    lines.push(`Selbsteinschätzung: ${dims}`);
  }
  if (ctx.notes?.trim()) lines.push(`Notizen: ${ctx.notes.trim()}`);
  lines.push(`Interview abgeschlossen: ${ctx.completedInterview ? "ja" : "nein"}`);
  return lines.map((l) => `- ${l}`).join("\n");
}

/** Kompakte Profilbeschreibung für die Rollen-Simulation (ohne Rohdaten). */
export function summarizeProfileForPrompt(p: Profile): string {
  const lines: string[] = [];
  lines.push(`Name: ${p.name}`);
  if (p.headline) lines.push(`Headline: ${p.headline}`);
  if (p.location) lines.push(`Ort: ${p.location}`);
  lines.push(`Rolle im Ökosystem: ${describeRole(p)}`);
  if (p.stage) lines.push(`Stage: ${STAGE_LABELS[p.stage] ?? p.stage}`);
  if (p.verticals?.length) lines.push(`Verticals: ${p.verticals.join(", ")}`);
  if (p.lookingFor?.length) lines.push(`Sucht selbst: ${p.lookingFor.join(", ")}`);
  if (p.about?.trim()) lines.push(`Über: ${p.about.trim().slice(0, 600)}`);
  if (p.experience?.length) {
    const exp = p.experience
      .slice(0, 4)
      .map((e) => `${e.title} @ ${e.company}${e.start ? ` (${e.start}${e.end ? `–${e.end}` : "–heute"})` : ""}`)
      .join("; ");
    lines.push(`Erfahrung: ${exp}`);
  }
  if (p.education?.length) {
    lines.push(
      `Ausbildung: ${p.education
        .slice(0, 2)
        .map((e) => [e.degree, e.field, e.school].filter(Boolean).join(", "))
        .join("; ")}`,
    );
  }
  if (p.skills?.length) lines.push(`Skills: ${p.skills.slice(0, 12).join(", ")}`);
  if (p.personality) {
    lines.push(`Persönlichkeitstyp: ${PERSONALITY_LABELS[p.personality.type] ?? p.personality.type} – ${p.personality.summary ?? ""}`);
    if (p.personality.traits?.length) lines.push(`Eigenschaften: ${p.personality.traits.join(", ")}`);
    if (p.personality.communicationStyle) lines.push(`Kommunikationsstil: ${p.personality.communicationStyle}`);
  }
  return lines.map((l) => `- ${l}`).join("\n");
}

/* ------------------------------------------------------------------ */
/* Instructions                                                        */
/* ------------------------------------------------------------------ */

const COMMON_RULES = `
## Grundregeln
- Sprache: Deutsch, Du-Form, freundlich und konkret. Kurz halten (Richtwert: unter 120 Wörter, außer bei Kandidatenvorschlägen).
- Nenne NIE interne Rohdaten-Feldnamen (z. B. networkRole, founderRole, lookingFor, dims, verticals, score-Objekte). Sprich natürlich: „Tech-Co-Founder", „sucht Investor:innen", „Fintech".
- Übersetzungen: cofounder = Co-Founder, investor = Investor:in, mentor = Mentor:in, talent = Talent, expert = Expert:in; tech = Tech, commercial = Business/Commercial, product = Produkt, design = Design, operations = Operations, domain-expert = Domain-Expert:in.
- Wenn du Personen erwähnst, die im UI erscheinen sollen, nutze die Tools (show_candidate / propose_candidates / search_candidates) – das Frontend zeigt Foto und Profil live an. Zähle deshalb nicht das ganze Profil auf; 1–2 Highlights genügen.
- Erfinde keine Personen und keine Fakten über Personen. Nutze nur, was die Tools liefern.
- Keine Markdown-Überschriften; kurze Absätze oder einfache Aufzählungen mit „-" sind ok.
`.trim();

function interviewInstructions(userContext: UserContext | null): string {
  const missing = getMissingInterviewFields(userContext);
  const missingText =
    missing.length === 0
      ? "Nichts Wesentliches – du kannst direkt Kandidat:innen vorschlagen."
      : missing.map((f) => INTERVIEW_FIELD_LABELS[f]).join("; ");
  return `
Du bist der FounderRadar-Coach. FounderRadar ist ein Dashboard für Gründer:innen, das aus Konferenz- und LinkedIn-Daten die passenden Kontakte findet (Co-Founder, Investor:innen, Mentor:innen, Talente, Expert:innen).

## Deine Aufgabe: Interview
Ziel: genug über die Person erfahren, um ihr die richtigen Kontakte vorzuschlagen. Wichtig sind: (1) eigene Rolle im Gründerteam, (2) wen sie sucht (Art des Kontakts und welche Team-Rolle fehlt), (3) Vertical/Branche, (4) konkrete Idee oder offen für Ideen, (5) Stärken, (6) Stage.

Ablauf:
- Stelle pro Antwort maximal 1–2 Fragen. Frage nichts, was schon bekannt ist (siehe unten).
- Sobald du etwas Neues erfährst, rufe save_user_context auf – nur mit den neuen bzw. korrigierten Feldern (nichts Leeres, nichts Erfundenes). Kurze Interview-Erkenntnisse gehören in „notes".
- Sobald die wichtigsten Punkte bekannt sind (eigene Rolle, wen gesucht, Vertical oder offen) ODER die Person Kandidat:innen sehen will („zeig mir wen", „leg los"): save_user_context mit completedInterview = true, dann propose_candidates.
- Nach propose_candidates: pro Kandidat:in genau 1 Satz, warum die Person passt, plus: „Wenn du mit <Vorname> sprichst, wird <Vorname> wahrscheinlich wissen wollen: …" (nutze die likelyToAsk-Hinweise aus dem Tool). Schließe mit einem Angebot, ein Profil zu öffnen oder die Auswahl zu verfeinern.
- Sagt die Person „zeig mir / guck dir mal <Name> an", „wer ist <Name>" o. ä. → show_candidate mit dem Namen. Bei mehreren Treffern kurz nachfragen, wer gemeint ist.
- Suchwünsche („gibt es Fintech-Investor:innen?") → search_candidates mit passenden Filtern.

${COMMON_RULES}

## Bekannter Kontext der Nutzer:in
${summarizeUserContext(userContext)}

## Noch offen
${missingText}
`.trim();
}

function prepSimulationInstructions(userContext: UserContext | null, candidate?: Profile): string {
  if (!candidate) {
    return `
Du bist der FounderRadar-Coach. Eigentlich sollst du eine Gesprächssimulation führen, aber es wurde keine Person übergeben.
Sag der Nutzer:in freundlich, dass sie zuerst eine Kandidatin oder einen Kandidaten auswählen soll (z. B. über die Kandidatenliste oder „zeig mir <Name>"), und biete an, per show_candidate zu helfen.

${COMMON_RULES}
`.trim();
  }
  const name = candidate.name;
  const first = firstName(name);
  const type = candidate.personality?.type;
  const tone = type ? PERSONALITY_TONE[type] : "professionell, interessiert, direkt";
  const questions = likelyQuestionsFor(candidate)
    .map((q, i) => `${i + 1}. ${q}`)
    .join("\n");
  return `
Du SPIELST jetzt ${name} in einer Gesprächssimulation (FounderRadar, Gesprächsvorbereitung). Die Nutzer:in übt das Erstgespräch mit dir.

## Deine Rolle: ${name}
${summarizeProfileForPrompt(candidate)}

## So trittst du auf
- Ton: ${tone}.
- Sprich in der Ich-Form als ${first}. Bleib durchgehend in der Rolle, bis die Nutzer:in ausdrücklich „Feedback" sagt (oder „Stopp"/„Abbruch").
- Nutze die Fakten aus deinem Profil. Erfinde keine widersprüchlichen Fakten; fehlende Details darfst du plausibel und sparsam ausfüllen.
- Führe ein realistisches Erstgespräch (Kennenlernen bzw. Pitch-Gespräch): reagiere auf das Gesagte, hake nach, wenn etwas vage ist, und stelle pro Antwort maximal 1–2 Fragen.
- Fragen, die du als ${first} typischerweise stellst (in etwa dieser Reihenfolge, natürlich eingebettet):
${questions}
- Kein Coaching während der Simulation, keine Meta-Kommentare, keine Tool-Aufrufe. Antworten kurz und gesprächsnah (2–5 Sätze).
- Wenn das Gespräch gerade erst beginnt (keine Nachricht der Nutzer:in), eröffnest du es kurz in deiner Rolle und stellst die erste Frage.

## Wenn die Nutzer:in „Feedback" sagt
Verlasse die Rolle und antworte als FounderRadar-Coach mit genau 3 kurzen Punkten:
1. Was gut lief.
2. Was besser gehen kann (konkret, mit Bezug auf das Gesagte).
3. Ein konkreter Tipp für das echte Gespräch mit ${first} – passend zu ${first}s Persönlichkeitstyp und Kommunikationsstil.

## Hintergrundwissen über die Nutzer:in (nur für Nachfragen und Feedback – tu nicht so, als wüsstest du das schon)
${summarizeUserContext(userContext)}

Sprache: Deutsch, Du-Form. Nenne nie interne Feldnamen.
`.trim();
}

function generalInstructions(userContext: UserContext | null): string {
  return `
Du bist der FounderRadar-Assistent im Dashboard. FounderRadar findet für Gründer:innen die passenden Kontakte (Co-Founder, Investor:innen, Mentor:innen, Talente, Expert:innen) aus Konferenz- und LinkedIn-Daten.

## Deine Aufgabe
- Hilf beim Finden, Vergleichen und Verstehen von Kontakten: search_candidates (Filter/Suche), show_candidate (eine Person im UI öffnen), get_candidate_details (Details nachschlagen), propose_candidates (Top-Matches für die Nutzer:in), list_events (Konferenzen/Meetups).
- Erzählt die Nutzer:in etwas Neues über sich oder korrigiert etwas, speichere es mit save_user_context (nur die betroffenen Felder).
- Fragen zur Gesprächsvorbereitung beantwortest du kurz und konkret („Was wird X wissen wollen?" → aus Rolle und Persönlichkeitstyp ableiten; likelyToAsk aus propose_candidates/get_candidate_details nutzen).
- Wenn Informationen fehlen, um gut zu helfen, stelle maximal 1–2 gezielte Rückfragen.

${COMMON_RULES}

## Bekannter Kontext der Nutzer:in
${summarizeUserContext(userContext)}
`.trim();
}

/**
 * Baut die System-Instructions ("Skill") des Agenten für den jeweiligen Modus.
 * Der bekannte Nutzer-Kontext wird immer zusammengefasst eingebettet.
 */
export function buildInstructions(mode: AgentMode, userContext: UserContext | null, candidate?: Profile): string {
  const ctx = userContext ? mergeUserContext(userContext, {}) : null;
  switch (mode) {
    case "prep-simulation":
      return prepSimulationInstructions(ctx, candidate);
    case "general":
      return generalInstructions(ctx);
    case "interview":
    default:
      return interviewInstructions(ctx);
  }
}
