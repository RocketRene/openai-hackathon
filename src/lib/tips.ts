/**
 * Tipps-Engine: „Was fehlt meinem Start-up? Welche Skills brauche ich?“
 * ---------------------------------------------------------------
 * Isomorph (Client + Server), regelbasiert, deterministisch – funktioniert ohne API-Key.
 * Der LLM-Pfad (/api/tips) nutzt tipsSystemPrompt()/tipsUserPrompt(), um diese Basis zu verfeinern.
 * Owner: Paket "tips" (docs/PARALLEL-WORK.md). Importiert nur aus ./types (keine Server-Module).
 */
import {
  FOUNDER_DIM_KEYS,
  FOUNDER_DIM_LABELS,
  type FounderDimKey,
  type FounderDims,
  type FounderRole,
  type NetworkRole,
  type Stage,
  type Tip,
  type UserContext,
} from "./types";

export type TipCategory = Tip["category"];
export type TipPriority = Tip["priority"];

export interface GenerateTipsOptions {
  /** Kombinierte Dims des Teams (z. B. aus dem Team-Radar). Fehlt das, zählen die eigenen Dims. */
  teamDims?: FounderDims;
}

/** Hauptevent des MVP – die Teilnehmer:innen sind unsere Datenquelle (src/data/events.json). */
export const TIPS_EVENT_NAME = "IdeaLab! 2026";
export const TIPS_EVENT_SLUG = "idealab-2026";

export const TIP_MIN = 6;
export const TIP_MAX = 12;

export const TIP_CATEGORY_LABELS: Record<TipCategory, string> = {
  team: "Team",
  skills: "Skills",
  product: "Produkt & Idee",
  fundraising: "Fundraising",
  network: "Netzwerk",
};

export const TIP_CATEGORY_ORDER: TipCategory[] = ["team", "skills", "product", "fundraising", "network"];

export const TIP_PRIORITY_LABELS: Record<TipPriority, string> = { 1: "Hoch", 2: "Mittel", 3: "Niedrig" };

/* Modul-lokale Labels – types.ts kennt nur FOUNDER_DIM_LABELS/PERSONALITY_LABELS. */
export const FOUNDER_ROLE_LABELS: Record<FounderRole, string> = {
  tech: "Tech",
  commercial: "Commercial",
  product: "Product",
  design: "Design",
  operations: "Operations",
  "domain-expert": "Domain-Expert:in",
};

export const STAGE_LABELS: Record<Stage, string> = {
  idea: "Idee",
  "pre-seed": "Pre-Seed",
  seed: "Seed",
  "series-a": "Series A",
  growth: "Growth",
};

export const NETWORK_ROLE_LABELS: Record<NetworkRole, string> = {
  cofounder: "Co-Founder",
  investor: "Investor:innen",
  mentor: "Mentor:innen",
  talent: "Talente",
  expert: "Expert:innen",
};

const FOUNDER_ROLES: FounderRole[] = ["tech", "commercial", "product", "design", "operations", "domain-expert"];
const STAGES: Stage[] = ["idea", "pre-seed", "seed", "series-a", "growth"];
const NETWORK_ROLES: NetworkRole[] = ["cofounder", "investor", "mentor", "talent", "expert"];
const CATEGORIES: TipCategory[] = ["team", "skills", "fundraising", "product", "network"];

function isFounderRole(v: unknown): v is FounderRole {
  return typeof v === "string" && (FOUNDER_ROLES as string[]).includes(v);
}
function isStage(v: unknown): v is Stage {
  return typeof v === "string" && (STAGES as string[]).includes(v);
}
function isNetworkRole(v: unknown): v is NetworkRole {
  return typeof v === "string" && (NETWORK_ROLES as string[]).includes(v);
}
function isCategory(v: unknown): v is TipCategory {
  return typeof v === "string" && (CATEGORIES as string[]).includes(v);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** Stabiler kebab-case-Slug für ids ("B2B SaaS" → "b2b-saas"). */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Schwächste Dimension (bei Gleichstand die erste in FOUNDER_DIM_KEYS). */
export function weakestDim(dims: FounderDims): FounderDimKey {
  let best: FounderDimKey = FOUNDER_DIM_KEYS[0];
  for (const k of FOUNDER_DIM_KEYS) if (dims[k] < dims[best]) best = k;
  return best;
}

/** Team-Dims = pro Dimension das Maximum aller Mitglieder (die stärkste Person deckt die Dimension ab). */
export function combineDims(list: FounderDims[]): FounderDims {
  if (list.length === 0) return { vision: 5, design: 5, tech: 5, detail: 5, execution: 5 };
  const out: FounderDims = { vision: 0, design: 0, tech: 0, detail: 0, execution: 0 };
  for (const dims of list) {
    for (const k of FOUNDER_DIM_KEYS) out[k] = Math.max(out[k], clamp(Number(dims[k]) || 0, 0, 10));
  }
  return out;
}

/**
 * Macht aus beliebigem Request-Input einen vollständigen UserContext (die Server-Seite vertraut dem Client nicht).
 * Fehlende Felder bekommen neutrale Defaults, damit generateTips nie wirft.
 */
export function normalizeUserContext(input: unknown): UserContext {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
  const strArr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  const dimsRaw = (raw.dims && typeof raw.dims === "object" ? raw.dims : {}) as Record<string, unknown>;
  const dims: FounderDims = { vision: 5, design: 5, tech: 5, detail: 5, execution: 5 };
  for (const k of FOUNDER_DIM_KEYS) {
    const v = Number(dimsRaw[k]);
    if (Number.isFinite(v)) dims[k] = clamp(Math.round(v), 0, 10);
  }
  return {
    name: str(raw.name),
    headline: str(raw.headline),
    linkedinUrl: str(raw.linkedinUrl),
    founderRole: isFounderRole(raw.founderRole) ? raw.founderRole : undefined,
    lookingFor: strArr(raw.lookingFor).filter(isNetworkRole),
    lookingForRoles: strArr(raw.lookingForRoles).filter(isFounderRole),
    verticals: strArr(raw.verticals)
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean),
    stage: isStage(raw.stage) ? raw.stage : undefined,
    idea: str(raw.idea),
    openToIdeas: Boolean(raw.openToIdeas),
    strengths: strArr(raw.strengths),
    dims,
    notes: str(raw.notes),
    completedInterview: Boolean(raw.completedInterview),
    updatedAt: str(raw.updatedAt, new Date(0).toISOString()),
  };
}

/* ------------------------------------------------------------------ */
/* Regelwerk                                                            */
/* ------------------------------------------------------------------ */

/** Welche Team-Rolle eine schwache Dimension typischerweise ausgleicht. */
const DIM_TO_ROLE: Record<FounderDimKey, FounderRole> = {
  vision: "commercial",
  design: "design",
  tech: "tech",
  detail: "operations",
  execution: "operations",
};

/** Klassische Ergänzung zur eigenen Rolle („Bauen und Verkaufen“). */
const COMPLEMENT_ROLE: Record<FounderRole, FounderRole> = {
  tech: "commercial",
  commercial: "tech",
  product: "tech",
  design: "tech",
  operations: "tech",
  "domain-expert": "tech",
};

const SKILL_ADVICE: Record<FounderDimKey, string> = {
  vision:
    "Schreibe eine Ein-Seiten-Vision für 2029 (Markt, Produkt, warum ihr) und teste sie an fünf Leuten aus der Branche. Zerlege drei Pitch-Decks erfolgreicher Start-ups deines Verticals: Wie bauen sie ihre Story?",
  design: `Lerne Figma-Grundlagen (ein Wochenende reicht) und baue einen klickbaren Prototyp mit fünf Screens. Hol dir Feedback von Designer:innen – zum Beispiel direkt auf der ${TIPS_EVENT_NAME}.`,
  tech: "Baue mit No-Code/AI-Tools (Lovable, v0, Cursor) selbst einen ersten Prototyp. Lerne, technische Entscheidungen zu bewerten: Build vs. Buy, Datenmodell, was ein MVP wirklich braucht.",
  detail:
    "Führe eine wöchentliche Review-Routine ein: Zahlen, offene Aufgaben, Verträge. Arbeite mit Checklisten und einem Task-Tool (Linear, Notion), statt Dinge im Kopf zu behalten.",
  execution:
    "Setze dir Zwei-Wochen-Ziele mit messbarem Output und liefere jede Woche etwas Sichtbares aus. Ein:e Accountability-Partner:in (Co-Founder, Mentor:in) hält dich auf Kurs.",
};

const VERTICAL_TIPS: Record<string, Pick<Tip, "title" | "body" | "category">> = {
  ai: {
    title: "AI: Differenzierung jenseits des Modells",
    body: "Modelle sind austauschbar. Deine Verteidigung sind proprietäre Daten, tiefe Workflow-Integration und Evals für Qualität. Rechne die Inferenzkosten pro Anfrage in den Preis ein.",
    category: "product",
  },
  fintech: {
    title: "Fintech: Regulatorik früh klären",
    body: "Prüfe, ob du eine BaFin-Lizenz brauchst oder mit Partnerbank/BaaS startest. Hol dir früh Compliance-Know-how als Advisor – Investoren fragen das als Erstes.",
    category: "product",
  },
  healthtech: {
    title: "Healthtech: Zulassungspfad und Evidenz",
    body: "Kläre MDR-Klasse bzw. DiGA-Fast-Track, plane eine klinische Pilotstudie und gewinne Ärzt:innen als Advisor. Wer erstattet (Payer), ist dein eigentliches Geschäftsmodell.",
    category: "product",
  },
  climate: {
    title: "Climate: Impact messbar machen, Förderung nutzen",
    body: "Quantifiziere die CO2e-Einsparung pro Kund:in und nutze nicht-verwässerndes Kapital (EXIST, EIC Accelerator, KfW). Climate-Angels und Impact-Fonds wollen beides sehen.",
    category: "fundraising",
  },
  "b2b saas": {
    title: "B2B SaaS: Design-Partner statt Freemium",
    body: "Gewinne 3–5 Design-Partner, die mitentwickeln und zahlen. Teste den Preis ab Tag eins – die erste Vertriebsperson bist du selbst.",
    category: "product",
  },
  consumer: {
    title: "Consumer: Retention vor Wachstum",
    body: "Miss D7/D30-Retention, bevor du Geld in Marketing steckst. Teste organische Kanäle (Communities, TikTok, Referral) – Investoren wollen einen wiederholbaren Kanal sehen.",
    category: "product",
  },
};

const FILLER_TIPS: Tip[] = [
  {
    id: "general-90-day-plan",
    title: "90-Tage-Plan mit drei Meilensteinen",
    body: "Formuliere drei überprüfbare Ziele für die nächsten 90 Tage (z. B. 10 Interviews, Prototyp live, erster Pilotkunde). Alles andere ist Ablenkung.",
    category: "product",
    priority: 3,
  },
  {
    id: "general-monthly-update",
    title: "Monatliches Update an dein Netzwerk",
    body: "Eine kurze Mail an Mentor:innen, Angels und Unterstützer:innen: Fortschritt, Learnings, konkrete Bitte. So bleibst du im Kopf, bevor du etwas brauchst.",
    category: "network",
    priority: 3,
  },
  {
    id: "general-learning-routine",
    title: "Wöchentliche Lern-Routine",
    body: "Blocke zwei Stunden pro Woche für die Dimension, in der du am schwächsten bist – Kurs, Buch oder Gespräch mit jemandem, der es kann.",
    category: "skills",
    priority: 3,
  },
];

export function sortTips(tips: Tip[]): Tip[] {
  return [...tips].sort(
    (a, b) => a.priority - b.priority || TIP_CATEGORY_ORDER.indexOf(a.category) - TIP_CATEGORY_ORDER.indexOf(b.category),
  );
}

export function groupTipsByCategory(tips: Tip[]): Array<{ category: TipCategory; tips: Tip[] }> {
  return TIP_CATEGORY_ORDER.map((category) => ({ category, tips: tips.filter((t) => t.category === category) })).filter(
    (g) => g.tips.length > 0,
  );
}

/**
 * Regelbasierte Tipps (6–12), deutsch, mit stabilen ids.
 * Quellen: schwache Dims (< 5), fehlende Team-Rollen, Stage, Idee/Offenheit, Verticals, Netzwerk (IdeaLab! 2026).
 */
export function generateTips(user: UserContext, opts: GenerateTipsOptions = {}): Tip[] {
  const tips: Tip[] = [];
  const add = (tip: Tip) => {
    if (!tips.some((t) => t.id === tip.id)) tips.push(tip);
  };

  const hasTeam = Boolean(opts.teamDims);
  const effective: FounderDims = opts.teamDims ?? user.dims;
  const subject = hasTeam ? "Euer Team liegt" : "Du liegst";
  const stage: Stage = user.stage ?? "idea";
  const idea = user.idea.trim();
  const verticals = user.verticals.map((v) => v.trim().toLowerCase()).filter(Boolean);
  const primaryVertical = verticals[0];
  const wantsCofounder = user.lookingFor.includes("cofounder");
  const wantsInvestor = user.lookingFor.includes("investor");
  const wantsMentor = user.lookingFor.includes("mentor") || user.lookingFor.includes("expert");
  const wantsTalent = user.lookingFor.includes("talent");
  const ownRoleLabel = user.founderRole ? FOUNDER_ROLE_LABELS[user.founderRole] : "Gründer:in";

  /* 1) Schwache Dimensionen → Skill-Tipp + Rollen-Tipp */
  const weakDims = FOUNDER_DIM_KEYS.filter((k) => effective[k] < 5).sort((a, b) => effective[a] - effective[b]);
  for (const k of weakDims) {
    const value = effective[k];
    const label = FOUNDER_DIM_LABELS[k];
    const role = DIM_TO_ROLE[k];
    const roleLabel = FOUNDER_ROLE_LABELS[role];
    const priority: TipPriority = value <= 2 ? 1 : 2;

    add({
      id: `skill-${k}`,
      title: `${label} stärken (${value}/10)`,
      body: SKILL_ADVICE[k],
      category: "skills",
      priority,
    });

    if (user.founderRole === role) continue;
    if (user.lookingForRoles.includes(role)) {
      add({
        id: `team-cover-${k}`,
        title: `${roleLabel}-Co-Founder:in gezielt nach ${label} filtern`,
        body: `Du suchst bereits ${roleLabel}. Achte bei Kandidat:innen auf ${label} ≥ 7 – das gleicht ${hasTeam ? "eure" : "deine"} ${value}/10 direkt aus. Der Match-Score gewichtet Komplementarität bereits mit.`,
        category: "team",
        priority: 2,
      });
    } else {
      add({
        id: `team-role-${role}`,
        title: `Rolle „${roleLabel}“ ins Team holen`,
        body: `${subject} bei ${label} nur bei ${value}/10. Ein:e Co-Founder:in mit Schwerpunkt ${roleLabel} gleicht das aus – nimm die Rolle in dein Suchprofil auf und filtere die Kandidatenliste danach.`,
        category: "team",
        priority,
      });
    }
  }

  /* 2) Fehlende Team-Rollen */
  if (!user.founderRole) {
    add({
      id: "team-own-role",
      title: "Lege deine eigene Rolle fest",
      body: "Tech, Commercial, Product, Design oder Operations? Ohne klare eigene Rolle kann niemand einschätzen, wie du ein Team ergänzt – und das Matching bleibt unscharf.",
      category: "team",
      priority: 1,
    });
  }
  if (wantsCofounder && user.lookingForRoles.length === 0) {
    const suggested = user.founderRole ? COMPLEMENT_ROLE[user.founderRole] : "commercial";
    add({
      id: "team-define-missing-role",
      title: "Lege fest, welche Rolle dir im Team fehlt",
      body: `Ohne Rollenprofil suchst du blind. Als ${ownRoleLabel} fehlt klassisch ein:e ${FOUNDER_ROLE_LABELS[suggested]}-Co-Founder:in. Trag die Rolle im Onboarding ein – dann filtert das Matching passend.`,
      category: "team",
      priority: 1,
    });
  } else if (user.founderRole && wantsCofounder) {
    const complement = COMPLEMENT_ROLE[user.founderRole];
    const complementDim: FounderDimKey = complement === "tech" ? "tech" : "vision";
    if (!user.lookingForRoles.includes(complement) && effective[complementDim] < 7) {
      add({
        id: `team-complement-${complement}`,
        title: `Klassische Ergänzung fehlt: ${FOUNDER_ROLE_LABELS[complement]}`,
        body: `Als ${ownRoleLabel} suchst du ${user.lookingForRoles.map((r) => FOUNDER_ROLE_LABELS[r]).join(", ")}, aber kein:e ${FOUNDER_ROLE_LABELS[complement]}-Co-Founder:in. Investoren schauen zuerst, ob Bauen und Verkaufen im Team abgedeckt sind.`,
        category: "team",
        priority: 2,
      });
    }
  }

  /* 3) Stage */
  switch (stage) {
    case "idea":
      add({
        id: "stage-idea-validate",
        title: "Validiere das Problem, bevor du baust",
        body: "Führe 10–15 Problem-Interviews mit deiner Zielgruppe – keine Lösung pitchen, nur zuhören. Ziel: drei wiederkehrende Schmerzpunkte, für die heute schon Geld oder Zeit ausgegeben wird.",
        category: "product",
        priority: 1,
      });
      add({
        id: "stage-idea-smoke-test",
        title: "Baue einen Smoke-Test",
        body: "Landing-Page mit klarem Versprechen und Warteliste, dazu 200 € Ads oder 50 direkte Nachrichten. Über 5 % Konversion heißt: weitermachen.",
        category: "product",
        priority: 2,
      });
      add({
        id: "stage-idea-fundraising",
        title: "Noch kein Fundraising – aber Beziehungen aufbauen",
        body: "In der Ideenphase überzeugt Traktion, nicht das Deck. Nutze Investor-Gespräche zum Lernen: Welche Metriken wollen sie in sechs Monaten sehen?",
        category: "fundraising",
        priority: 3,
      });
      break;
    case "pre-seed":
      add({
        id: "stage-preseed-first-customers",
        title: "Gewinne die ersten drei zahlenden Kund:innen",
        body: "Pilotverträge mit klarem Erfolgskriterium, auch zu Sonderkonditionen. Zahlungsbereitschaft ist das stärkste Signal für Angels.",
        category: "product",
        priority: 1,
      });
      add({
        id: "stage-preseed-angel-round",
        title: "Angel-Runde vorbereiten",
        body: "10-Slide-Deck, 12–18 Monate Runway, Tickets 25–100k über SAFE oder Wandeldarlehen. Sprich zuerst mit Gründer-Angels aus deinem Vertical – sie entscheiden schneller.",
        category: "fundraising",
        priority: 1,
      });
      break;
    case "seed":
      add({
        id: "stage-seed-hiring",
        title: "Erste Hires: Wer entlastet die Gründer:innen?",
        body: "Definiere die zwei Rollen, die am meisten Gründerzeit fressen (oft Engineering und Sales/Customer Success). Hiring-Scorecard schreiben, bevor die erste Anzeige rausgeht.",
        category: "team",
        priority: 1,
      });
      add({
        id: "stage-seed-series-a-metrics",
        title: "Series-A-Metriken jetzt tracken",
        body: "Die nächste Runde will MRR-Wachstum, Retention/Churn und CAC-Payback sehen. Baue das Dashboard heute, nicht in zwölf Monaten.",
        category: "fundraising",
        priority: 2,
      });
      break;
    default:
      add({
        id: "stage-growth-leadership",
        title: "Führungsebene aufbauen",
        body: "Ab Series A skaliert das Team nur mit Leads pro Bereich und klaren Prozessen: OKRs, Hiring-Pipeline, Onboarding.",
        category: "team",
        priority: 2,
      });
      add({
        id: "stage-growth-efficiency",
        title: "Nächste Runde: Effizienz zeigen",
        body: "Neben Wachstum zählen Burn-Multiple und Net Revenue Retention. Bereite die Datenraum-Struktur jetzt vor.",
        category: "fundraising",
        priority: 2,
      });
  }

  /* 4) Idee bzw. Ideenfindung */
  if (!idea) {
    if (user.openToIdeas) {
      add({
        id: "idea-problem-list",
        title: "Sammle 20 echte Probleme",
        body: "Notiere zwei Wochen lang jedes Problem, das dich oder dein Umfeld Zeit oder Geld kostet. Bewerte nach Häufigkeit, Schmerz und Zahlungsbereitschaft.",
        category: "product",
        priority: 1,
      });
      add({
        id: "idea-problem-interviews",
        title: "Problem-Interviews statt Brainstorming",
        body: "Sprich mit zehn Personen aus einer Branche, die du kennst. Frage nach dem letzten Mal, als etwas richtig nervig war – nicht nach Lösungen.",
        category: "product",
        priority: 2,
      });
      add({
        id: "idea-join-team",
        title: `Auf der ${TIPS_EVENT_NAME}: Teams mit Idee kennenlernen`,
        body: `Offen für Ideen heißt auch: Du kannst dich einem Team mit validiertem Problem anschließen. Filtere Kandidat:innen, die ${user.founderRole ? `eine:n ${ownRoleLabel}-Co-Founder:in` : "deine Rolle"} suchen.`,
        category: "network",
        priority: 2,
      });
    } else {
      add({
        id: "idea-one-sentence",
        title: "Formuliere deine Idee in einem Satz",
        body: "„Wir helfen [Zielgruppe], [Problem] zu lösen, indem [Lösung].“ Ohne diesen Satz kann dich niemand weiterempfehlen – auch das Matching hier nicht.",
        category: "product",
        priority: 1,
      });
    }
  } else {
    add({
      id: "idea-sharpen-pitch",
      title: "30-Sekunden-Pitch schärfen",
      body: `Problem → Zielgruppe → Lösung → warum jetzt, warum ihr. Teste ihn auf der ${TIPS_EVENT_NAME} an zehn Fremden und zähle, wie viele nachfragen.`,
      category: "product",
      priority: 2,
    });
  }

  /* 5) Verticals */
  let verticalHits = 0;
  for (const v of verticals) {
    if (verticalHits >= 2) break;
    const t = VERTICAL_TIPS[v];
    if (!t) continue;
    add({ id: `vertical-${slugify(v)}`, ...t, priority: 2 });
    verticalHits++;
  }
  if (verticals.length === 0) {
    add({
      id: "vertical-choose",
      title: "Wähle ein Fokus-Vertical",
      body: "Ohne Vertical findest du weder passende Co-Founder noch Investoren mit Thesen-Fit. Wähle das Feld, in dem du Zugang zu Kund:innen hast – nicht das größte.",
      category: "product",
      priority: 2,
    });
  } else if (verticalHits === 0 && primaryVertical) {
    add({
      id: `vertical-generic-${slugify(primaryVertical)}`,
      title: `Kenne dein Vertical „${primaryVertical}“`,
      body: "Liste die drei wichtigsten Wettbewerber und ihre Schwächen, finde zwei Branchen-Expert:innen als Advisor und kläre die relevanten Regularien.",
      category: "product",
      priority: 3,
    });
  }

  /* 6) Netzwerk – konkret auf der IdeaLab! 2026 */
  if (wantsInvestor) {
    const investorStage = stage === "idea" || stage === "pre-seed" ? "Pre-Seed" : stage === "seed" ? "Seed" : "Series A+";
    add({
      id: `network-investors-${slugify(investorStage)}`,
      title: `Sprich mit 3 Investoren, die ${investorStage} machen`,
      body: `Auf der ${TIPS_EVENT_NAME} sind Investoren vor Ort. Filtere die Kandidatenliste nach Investor:innen mit ${investorStage}-Fokus${primaryVertical ? ` und ${primaryVertical}` : ""}, bereite eine Frage pro Gespräch vor („Welche Metrik entscheidet bei euch?“) und bitte um ein Follow-up.`,
      category: "network",
      priority: 1,
    });
  }
  if (wantsCofounder) {
    const roles = user.lookingForRoles.map((r) => FOUNDER_ROLE_LABELS[r]).join(", ") || "passende Ergänzung";
    add({
      id: "network-cofounders",
      title: `Triff 5 potenzielle Co-Founder (${roles})`,
      body: `Nutze die Kandidatenliste nach Match-Score. Ziel auf der ${TIPS_EVENT_NAME}: fünf Gespräche, zwei Follow-ups, ein gemeinsames Trial-Wochenende zum Bauen.`,
      category: "network",
      priority: 1,
    });
  }
  if (wantsMentor) {
    add({
      id: "network-mentor",
      title: "Finde eine:n Mentor:in mit eigener Gründungserfahrung",
      body: `Suche auf der ${TIPS_EVENT_NAME} Gründer:innen, die${primaryVertical ? ` in ${primaryVertical}` : ""} die ${STAGE_LABELS[stage]}-Phase schon hinter sich haben. Bitte um 30 Minuten pro Monat – nicht um „Mentoring“.`,
      category: "network",
      priority: 2,
    });
  } else if (stage === "idea" || stage === "pre-seed") {
    add({
      id: "network-get-mentor",
      title: "Hol dir eine:n Mentor:in",
      body: `Du suchst aktuell keine Mentor:innen – in der ${STAGE_LABELS[stage]}-Phase spart dir eine erfahrene Gründerin oder ein erfahrener Gründer Monate. Ein Gespräch auf der ${TIPS_EVENT_NAME} reicht für den Anfang.`,
      category: "network",
      priority: 3,
    });
  }
  if (wantsTalent) {
    add({
      id: "network-talent",
      title: `Erste Hires auf der ${TIPS_EVENT_NAME} kennenlernen`,
      body: "Viele Teilnehmer:innen suchen einen Job im Start-up. Sprich über die konkrete Aufgabe der ersten 90 Tage statt über Titel – und bleib mit den zwei Besten in Kontakt, auch wenn du noch nicht einstellen kannst.",
      category: "network",
      priority: 2,
    });
  }
  add({
    id: "network-follow-up-48h",
    title: "Follow-up innerhalb von 48 Stunden",
    body: `Nach der ${TIPS_EVENT_NAME}: eine persönliche Nachricht mit Bezug auf das Gespräch und einem konkreten nächsten Schritt. Der Outreach-Generator passt den Ton an den Persönlichkeitstyp an.`,
    category: "network",
    priority: 3,
  });

  /* 7) Profil-Lücken */
  if (user.strengths.length === 0) {
    add({
      id: "skills-name-strengths",
      title: "Benenne deine drei Stärken",
      body: "Co-Founder und Investoren wollen wissen, was du ins Team einbringst. Drei konkrete Stärken mit Beleg (Projekt, Zahl) – trag sie im Onboarding ein.",
      category: "skills",
      priority: 2,
    });
  }
  if (!user.completedInterview) {
    add({
      id: "skills-agent-interview",
      title: "Lass dich vom Agenten interviewen",
      body: "Das Interview schärft dein Profil (Stärken, Lücken, Suchprofil) und macht Matching und Tipps deutlich genauer.",
      category: "skills",
      priority: 3,
    });
  }

  /* Mindestens TIP_MIN, höchstens TIP_MAX */
  for (const filler of FILLER_TIPS) {
    if (tips.length >= TIP_MIN) break;
    add(filler);
  }
  return sortTips(tips).slice(0, TIP_MAX);
}

/* ------------------------------------------------------------------ */
/* LLM-Pfad (Prompts + Schema + Validierung)                            */
/* ------------------------------------------------------------------ */

/** JSON-Schema für Structured Outputs (strict: alle Felder required, keine Zusatzfelder). */
export const TIPS_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    tips: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string", description: "kebab-case, stabil; id des Basis-Tipps beibehalten, wenn verfeinert" },
          title: { type: "string", description: "max. 60 Zeichen, Deutsch" },
          body: { type: "string", description: "1–3 Sätze, konkrete Handlung, Deutsch" },
          category: { type: "string", enum: CATEGORIES },
          priority: { type: "integer", enum: [1, 2, 3], description: "1 = jetzt, 2 = nächste Wochen, 3 = gut zu wissen" },
        },
        required: ["id", "title", "body", "category", "priority"],
      },
    },
  },
  required: ["tips"],
};

export function tipsSystemPrompt(): string {
  return [
    "Du bist ein erfahrener Start-up-Coach und Angel-Investor im deutschsprachigen Ökosystem.",
    `Du berätst Gründer:innen, die auf der Konferenz „${TIPS_EVENT_NAME}“ (WHU, Vallendar) Co-Founder, Investoren, Mentor:innen oder Talente suchen.`,
    "",
    "Aufgabe: Aus dem Profil der Gründer:in und einer Liste regelbasierter Basis-Tipps erzeugst du 6–12 konkrete, priorisierte Tipps",
    "zur Frage „Was fehlt meinem Start-up? Welche Skills brauche ich?“.",
    "",
    "Regeln:",
    "- Sprache: Deutsch, direkte Ansprache („du“), knapp und konkret. Titel max. 60 Zeichen, Body 1–3 Sätze mit klarer Handlung, gern mit Zahlen oder Zielwerten.",
    `- Kategorien: team (fehlende Rollen, Hiring), skills (eigene Fähigkeiten), fundraising, product (Idee, Validierung, Markt, Vertical), network (Kontakte – konkret auf der ${TIPS_EVENT_NAME}).`,
    "- priority: 1 = jetzt wichtig, 2 = in den nächsten Wochen, 3 = gut zu wissen. Mindestens zwei Tipps mit priority 1, höchstens fünf.",
    "- Nutze die Basis-Tipps als Ausgangspunkt: konkretisiere sie mit dem Profil (Vertical, Stage, Idee, Stärken, schwache Dimensionen), streiche Irrelevantes, ergänze Fehlendes.",
    "- Behalte die id eines Basis-Tipps, wenn du ihn verfeinerst. Neue Tipps bekommen eine neue kebab-case-id.",
    "- Keine Floskeln, keine Wiederholungen, keine erfundenen Fakten über konkrete Personen, Fonds oder Zahlen.",
    '- Antworte ausschließlich als JSON gemäß Schema: { "tips": Tip[] }.',
  ].join("\n");
}

export function tipsUserPrompt(user: UserContext, opts: GenerateTipsOptions & { baseTips?: Tip[] } = {}): string {
  const baseTips = opts.baseTips ?? generateTips(user, { teamDims: opts.teamDims });
  const formatDims = (d: FounderDims) => FOUNDER_DIM_KEYS.map((k) => `${FOUNDER_DIM_LABELS[k]}: ${d[k]}/10`).join(", ");
  const weak = weakestDim(opts.teamDims ?? user.dims);
  const lines = [
    "## Profil der Gründer:in",
    `- Name: ${user.name || "(unbekannt)"}${user.headline ? ` – ${user.headline}` : ""}`,
    `- Eigene Rolle: ${user.founderRole ? FOUNDER_ROLE_LABELS[user.founderRole] : "nicht festgelegt"}`,
    `- Stage: ${user.stage ? STAGE_LABELS[user.stage] : "nicht festgelegt"}`,
    `- Verticals: ${user.verticals.length ? user.verticals.join(", ") : "keine"}`,
    `- Idee: ${user.idea.trim() || "(keine)"}${user.openToIdeas ? " – offen für andere Ideen" : ""}`,
    `- Sucht: ${user.lookingFor.length ? user.lookingFor.map((r) => NETWORK_ROLE_LABELS[r]).join(", ") : "nichts Konkretes"}`,
    `- Fehlende Team-Rollen: ${user.lookingForRoles.length ? user.lookingForRoles.map((r) => FOUNDER_ROLE_LABELS[r]).join(", ") : "keine angegeben"}`,
    `- Stärken: ${user.strengths.length ? user.strengths.join(", ") : "keine angegeben"}`,
    `- Selbsteinschätzung: ${formatDims(user.dims)} (schwächste Dimension: ${FOUNDER_DIM_LABELS[weak]})`,
  ];
  if (opts.teamDims) lines.push(`- Team kombiniert: ${formatDims(opts.teamDims)}`);
  if (user.notes?.trim()) lines.push(`- Notizen aus dem Interview: ${user.notes.trim()}`);
  lines.push(
    `- Interview abgeschlossen: ${user.completedInterview ? "ja" : "nein"}`,
    "",
    "## Regelbasierte Basis-Tipps (verfeinern, konkretisieren, ergänzen)",
    JSON.stringify(baseTips, null, 2),
    "",
    `Gib 6–12 Tipps als JSON zurück. Beziehe Netzwerk-Tipps konkret auf die ${TIPS_EVENT_NAME}.`,
  );
  return lines.join("\n");
}

/**
 * Validiert LLM-Output (oder beliebiges JSON) zu Tip[]: repariert, was reparierbar ist,
 * füllt bei Bedarf mit Fallback-Tipps auf TIP_MIN auf und kappt bei TIP_MAX.
 */
export function normalizeTips(raw: unknown, fallback: Tip[] = []): Tip[] {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { tips?: unknown }).tips)
      ? (raw as { tips: unknown[] }).tips
      : [];
  const out: Tip[] = [];
  list.forEach((item, i) => {
    if (!item || typeof item !== "object") return;
    const t = item as Record<string, unknown>;
    const title = typeof t.title === "string" ? t.title.trim() : "";
    const body = typeof t.body === "string" ? t.body.trim() : "";
    if (!title || !body) return;
    const category: TipCategory = isCategory(t.category) ? t.category : "product";
    const p = Number(t.priority);
    const priority: TipPriority = p === 1 || p === 2 || p === 3 ? p : 2;
    const baseId = slugify(typeof t.id === "string" && t.id.trim() ? t.id : title) || `tip-${i + 1}`;
    let id = baseId;
    let n = 2;
    while (out.some((x) => x.id === id)) id = `${baseId}-${n++}`;
    out.push({ id, title, body, category, priority });
  });
  for (const f of fallback) {
    if (out.length >= TIP_MIN) break;
    if (!out.some((x) => x.id === f.id)) out.push(f);
  }
  return sortTips(out).slice(0, TIP_MAX);
}
