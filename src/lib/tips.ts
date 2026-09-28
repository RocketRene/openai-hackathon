/**
 * Tipps-Engine: „Was fehlt meinem Start-up? Welche Skills brauche ich?“
 * ---------------------------------------------------------------
 * Isomorph (Client + Server), regelbasiert, deterministisch – funktioniert ohne API-Key.
 * Der LLM-Pfad (/api/tips) nutzt tipsSystemPrompt()/tipsUserPrompt(), um diese Basis zu verfeinern.
 * Zweisprachig: alle Regel-Texte liegen als { de, en } vor; `generateTips(user, { locale })` wählt.
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

/** Sprache der Tipp-Texte – bewusst lokal definiert (tips.ts importiert nur aus ./types). */
export type TipLocale = "de" | "en";
export interface LocalizedText {
  de: string;
  en: string;
}

export interface GenerateTipsOptions {
  /** Kombinierte Dims des Teams (z. B. aus dem Team-Radar). Fehlt das, zählen die eigenen Dims. */
  teamDims?: FounderDims;
  /** Sprache der Texte (Default "de"). */
  locale?: TipLocale;
}

/** Hauptevent des MVP – die Teilnehmer:innen sind unsere Datenquelle (src/data/events.json). */
export const TIPS_EVENT_NAME = "IdeaLab! 2026";
export const TIPS_EVENT_SLUG = "idealab-2026";

export const TIP_MIN = 6;
export const TIP_MAX = 12;

export function normalizeTipLocale(raw: unknown): TipLocale {
  return raw === "en" ? "en" : "de";
}

/** Wählt aus einem {de,en}-Paar. */
export function localize(text: LocalizedText, locale: TipLocale = "de"): string {
  return locale === "en" ? text.en : text.de;
}

function deOf<K extends string>(table: Record<K, LocalizedText>): Record<K, string> {
  const out = {} as Record<K, string>;
  for (const k of Object.keys(table) as K[]) out[k] = table[k].de;
  return out;
}

/* ------------------------------------------------------------------ */
/* Labels (zweisprachig) – die bisherigen DE-Konstanten bleiben erhalten */
/* ------------------------------------------------------------------ */

export const TIP_CATEGORY_LABELS_I18N: Record<TipCategory, LocalizedText> = {
  team: { de: "Team", en: "Team" },
  skills: { de: "Skills", en: "Skills" },
  product: { de: "Produkt & Idee", en: "Product & idea" },
  fundraising: { de: "Fundraising", en: "Fundraising" },
  network: { de: "Netzwerk", en: "Network" },
};
export const TIP_CATEGORY_LABELS: Record<TipCategory, string> = deOf(TIP_CATEGORY_LABELS_I18N);

/** Kurze Erklärung je Kategorie (für Sektions-Untertitel). */
export const TIP_CATEGORY_HINTS_I18N: Record<TipCategory, LocalizedText> = {
  team: { de: "Fehlende Rollen & Hiring", en: "Missing roles & hiring" },
  skills: { de: "Eigene Fähigkeiten stärken", en: "Strengthen your own skills" },
  product: { de: "Idee, Validierung, Markt, Vertical", en: "Idea, validation, market, vertical" },
  fundraising: { de: "Kapital, Investoren, Metriken", en: "Capital, investors, metrics" },
  network: { de: `Kontakte – konkret auf der ${TIPS_EVENT_NAME}`, en: `Contacts – specifically at ${TIPS_EVENT_NAME}` },
};

export const TIP_CATEGORY_ORDER: TipCategory[] = ["team", "skills", "product", "fundraising", "network"];

export const TIP_PRIORITY_LABELS: Record<TipPriority, string> = { 1: "Hoch", 2: "Mittel", 3: "Niedrig" };

/** Prioritäten als Handlungshorizont (entspricht der Definition im LLM-Schema). */
export const TIP_PRIORITY_LABELS_I18N: Record<TipPriority, LocalizedText> = {
  1: { de: "Jetzt", en: "Now" },
  2: { de: "Nächste Wochen", en: "Next weeks" },
  3: { de: "Gut zu wissen", en: "Good to know" },
};

/* Modul-lokale Labels – types.ts kennt nur FOUNDER_DIM_LABELS/PERSONALITY_LABELS. */
export const FOUNDER_ROLE_LABELS_I18N: Record<FounderRole, LocalizedText> = {
  tech: { de: "Tech", en: "Tech" },
  commercial: { de: "Commercial", en: "Commercial" },
  product: { de: "Product", en: "Product" },
  design: { de: "Design", en: "Design" },
  operations: { de: "Operations", en: "Operations" },
  "domain-expert": { de: "Domain-Expert:in", en: "Domain expert" },
};
export const FOUNDER_ROLE_LABELS: Record<FounderRole, string> = deOf(FOUNDER_ROLE_LABELS_I18N);

export const STAGE_LABELS_I18N: Record<Stage, LocalizedText> = {
  idea: { de: "Idee", en: "Idea" },
  "pre-seed": { de: "Pre-Seed", en: "Pre-seed" },
  seed: { de: "Seed", en: "Seed" },
  "series-a": { de: "Series A", en: "Series A" },
  growth: { de: "Growth", en: "Growth" },
};
export const STAGE_LABELS: Record<Stage, string> = deOf(STAGE_LABELS_I18N);

export const NETWORK_ROLE_LABELS_I18N: Record<NetworkRole, LocalizedText> = {
  cofounder: { de: "Co-Founder", en: "Co-founders" },
  investor: { de: "Investor:innen", en: "Investors" },
  mentor: { de: "Mentor:innen", en: "Mentors" },
  talent: { de: "Talente", en: "Talent" },
  expert: { de: "Expert:innen", en: "Experts" },
};
export const NETWORK_ROLE_LABELS: Record<NetworkRole, string> = deOf(NETWORK_ROLE_LABELS_I18N);

/** Dimensionen des Team-Radars – DE aus types.ts, EN lokal. */
export const FOUNDER_DIM_LABELS_I18N: Record<FounderDimKey, LocalizedText> = {
  vision: { de: FOUNDER_DIM_LABELS.vision, en: "Vision" },
  design: { de: FOUNDER_DIM_LABELS.design, en: "Design / visual" },
  tech: { de: FOUNDER_DIM_LABELS.tech, en: "Tech" },
  detail: { de: FOUNDER_DIM_LABELS.detail, en: "Detail" },
  execution: { de: FOUNDER_DIM_LABELS.execution, en: "Execution" },
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

const SKILL_ADVICE: Record<FounderDimKey, LocalizedText> = {
  vision: {
    de: "Schreibe eine Ein-Seiten-Vision für 2029 (Markt, Produkt, warum ihr) und teste sie an fünf Leuten aus der Branche. Zerlege drei Pitch-Decks erfolgreicher Start-ups deines Verticals: Wie bauen sie ihre Story?",
    en: "Write a one-page vision for 2029 (market, product, why you) and test it on five people from the industry. Take apart three pitch decks of successful start-ups in your vertical: how do they build their story?",
  },
  design: {
    de: `Lerne Figma-Grundlagen (ein Wochenende reicht) und baue einen klickbaren Prototyp mit fünf Screens. Hol dir Feedback von Designer:innen – zum Beispiel direkt auf der ${TIPS_EVENT_NAME}.`,
    en: `Learn the Figma basics (a weekend is enough) and build a clickable prototype with five screens. Get feedback from designers – for example right at ${TIPS_EVENT_NAME}.`,
  },
  tech: {
    de: "Baue mit No-Code/AI-Tools (Lovable, v0, Cursor) selbst einen ersten Prototyp. Lerne, technische Entscheidungen zu bewerten: Build vs. Buy, Datenmodell, was ein MVP wirklich braucht.",
    en: "Build a first prototype yourself with no-code/AI tools (Lovable, v0, Cursor). Learn to evaluate technical decisions: build vs. buy, data model, what an MVP really needs.",
  },
  detail: {
    de: "Führe eine wöchentliche Review-Routine ein: Zahlen, offene Aufgaben, Verträge. Arbeite mit Checklisten und einem Task-Tool (Linear, Notion), statt Dinge im Kopf zu behalten.",
    en: "Set up a weekly review routine: numbers, open tasks, contracts. Work with checklists and a task tool (Linear, Notion) instead of keeping things in your head.",
  },
  execution: {
    de: "Setze dir Zwei-Wochen-Ziele mit messbarem Output und liefere jede Woche etwas Sichtbares aus. Ein:e Accountability-Partner:in (Co-Founder, Mentor:in) hält dich auf Kurs.",
    en: "Set two-week goals with measurable output and ship something visible every week. An accountability partner (co-founder, mentor) keeps you on track.",
  },
};

interface LocalizedTipTemplate {
  title: LocalizedText;
  body: LocalizedText;
  category: TipCategory;
}

const VERTICAL_TIPS: Record<string, LocalizedTipTemplate> = {
  ai: {
    title: { de: "AI: Differenzierung jenseits des Modells", en: "AI: differentiate beyond the model" },
    body: {
      de: "Modelle sind austauschbar. Deine Verteidigung sind proprietäre Daten, tiefe Workflow-Integration und Evals für Qualität. Rechne die Inferenzkosten pro Anfrage in den Preis ein.",
      en: "Models are interchangeable. Your moat is proprietary data, deep workflow integration and evals for quality. Price the inference cost per request into your pricing.",
    },
    category: "product",
  },
  fintech: {
    title: { de: "Fintech: Regulatorik früh klären", en: "Fintech: clarify regulation early" },
    body: {
      de: "Prüfe, ob du eine BaFin-Lizenz brauchst oder mit Partnerbank/BaaS startest. Hol dir früh Compliance-Know-how als Advisor – Investoren fragen das als Erstes.",
      en: "Check whether you need a BaFin licence or start with a partner bank/BaaS. Bring compliance know-how on board as an advisor early – investors ask about this first.",
    },
    category: "product",
  },
  healthtech: {
    title: { de: "Healthtech: Zulassungspfad und Evidenz", en: "Healthtech: approval path and evidence" },
    body: {
      de: "Kläre MDR-Klasse bzw. DiGA-Fast-Track, plane eine klinische Pilotstudie und gewinne Ärzt:innen als Advisor. Wer erstattet (Payer), ist dein eigentliches Geschäftsmodell.",
      en: "Clarify the MDR class or DiGA fast track, plan a clinical pilot study and win physicians as advisors. Who reimburses (the payer) is your real business model.",
    },
    category: "product",
  },
  climate: {
    title: { de: "Climate: Impact messbar machen, Förderung nutzen", en: "Climate: make impact measurable, use grants" },
    body: {
      de: "Quantifiziere die CO2e-Einsparung pro Kund:in und nutze nicht-verwässerndes Kapital (EXIST, EIC Accelerator, KfW). Climate-Angels und Impact-Fonds wollen beides sehen.",
      en: "Quantify the CO2e savings per customer and use non-dilutive capital (EXIST, EIC Accelerator, KfW). Climate angels and impact funds want to see both.",
    },
    category: "fundraising",
  },
  "b2b saas": {
    title: { de: "B2B SaaS: Design-Partner statt Freemium", en: "B2B SaaS: design partners instead of freemium" },
    body: {
      de: "Gewinne 3–5 Design-Partner, die mitentwickeln und zahlen. Teste den Preis ab Tag eins – die erste Vertriebsperson bist du selbst.",
      en: "Win 3–5 design partners who co-develop and pay. Test pricing from day one – the first salesperson is you.",
    },
    category: "product",
  },
  consumer: {
    title: { de: "Consumer: Retention vor Wachstum", en: "Consumer: retention before growth" },
    body: {
      de: "Miss D7/D30-Retention, bevor du Geld in Marketing steckst. Teste organische Kanäle (Communities, TikTok, Referral) – Investoren wollen einen wiederholbaren Kanal sehen.",
      en: "Measure D7/D30 retention before you put money into marketing. Test organic channels (communities, TikTok, referral) – investors want to see a repeatable channel.",
    },
    category: "product",
  },
};

const FILLER_TIPS: Array<LocalizedTipTemplate & { id: string; priority: TipPriority }> = [
  {
    id: "general-90-day-plan",
    title: { de: "90-Tage-Plan mit drei Meilensteinen", en: "90-day plan with three milestones" },
    body: {
      de: "Formuliere drei überprüfbare Ziele für die nächsten 90 Tage (z. B. 10 Interviews, Prototyp live, erster Pilotkunde). Alles andere ist Ablenkung.",
      en: "Formulate three verifiable goals for the next 90 days (e.g. 10 interviews, prototype live, first pilot customer). Everything else is distraction.",
    },
    category: "product",
    priority: 3,
  },
  {
    id: "general-monthly-update",
    title: { de: "Monatliches Update an dein Netzwerk", en: "Monthly update to your network" },
    body: {
      de: "Eine kurze Mail an Mentor:innen, Angels und Unterstützer:innen: Fortschritt, Learnings, konkrete Bitte. So bleibst du im Kopf, bevor du etwas brauchst.",
      en: "A short email to mentors, angels and supporters: progress, learnings, one concrete ask. That way you stay top of mind before you need something.",
    },
    category: "network",
    priority: 3,
  },
  {
    id: "general-learning-routine",
    title: { de: "Wöchentliche Lern-Routine", en: "Weekly learning routine" },
    body: {
      de: "Blocke zwei Stunden pro Woche für die Dimension, in der du am schwächsten bist – Kurs, Buch oder Gespräch mit jemandem, der es kann.",
      en: "Block two hours a week for the dimension you're weakest in – a course, a book or a conversation with someone who's good at it.",
    },
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
 * Regelbasierte Tipps (6–12), DE oder EN (opts.locale), mit stabilen ids.
 * Quellen: schwache Dims (< 5), fehlende Team-Rollen, Stage, Idee/Offenheit, Verticals, Netzwerk (IdeaLab! 2026).
 */
export function generateTips(user: UserContext, opts: GenerateTipsOptions = {}): Tip[] {
  const locale = normalizeTipLocale(opts.locale);
  const L = (de: string, en: string) => (locale === "en" ? en : de);
  const roleLabel = (r: FounderRole) => localize(FOUNDER_ROLE_LABELS_I18N[r], locale);
  const dimLabel = (k: FounderDimKey) => localize(FOUNDER_DIM_LABELS_I18N[k], locale);
  const stageLabel = (s: Stage) => localize(STAGE_LABELS_I18N[s], locale);

  const tips: Tip[] = [];
  const add = (tip: Tip) => {
    if (!tips.some((t) => t.id === tip.id)) tips.push(tip);
  };

  const hasTeam = Boolean(opts.teamDims);
  const effective: FounderDims = opts.teamDims ?? user.dims;
  const subject = hasTeam ? L("Euer Team liegt", "Your team is") : L("Du liegst", "You are");
  const stage: Stage = user.stage ?? "idea";
  const idea = user.idea.trim();
  const verticals = user.verticals.map((v) => v.trim().toLowerCase()).filter(Boolean);
  const primaryVertical = verticals[0];
  const wantsCofounder = user.lookingFor.includes("cofounder");
  const wantsInvestor = user.lookingFor.includes("investor");
  const wantsMentor = user.lookingFor.includes("mentor") || user.lookingFor.includes("expert");
  const wantsTalent = user.lookingFor.includes("talent");
  const ownRoleLabel = user.founderRole ? roleLabel(user.founderRole) : L("Gründer:in", "founder");

  /* 1) Schwache Dimensionen → Skill-Tipp + Rollen-Tipp */
  const weakDims = FOUNDER_DIM_KEYS.filter((k) => effective[k] < 5).sort((a, b) => effective[a] - effective[b]);
  for (const k of weakDims) {
    const value = effective[k];
    const label = dimLabel(k);
    const role = DIM_TO_ROLE[k];
    const rLabel = roleLabel(role);
    const priority: TipPriority = value <= 2 ? 1 : 2;

    add({
      id: `skill-${k}`,
      title: L(`${label} stärken (${value}/10)`, `Strengthen ${label} (${value}/10)`),
      body: localize(SKILL_ADVICE[k], locale),
      category: "skills",
      priority,
    });

    if (user.founderRole === role) continue;
    if (user.lookingForRoles.includes(role)) {
      add({
        id: `team-cover-${k}`,
        title: L(`${rLabel}-Co-Founder:in gezielt nach ${label} filtern`, `Filter ${rLabel} co-founders for ${label}`),
        body: L(
          `Du suchst bereits ${rLabel}. Achte bei Kandidat:innen auf ${label} ≥ 7 – das gleicht ${hasTeam ? "eure" : "deine"} ${value}/10 direkt aus. Der Match-Score gewichtet Komplementarität bereits mit.`,
          `You're already looking for ${rLabel}. Look for candidates with ${label} ≥ 7 – that directly offsets ${hasTeam ? "your team's" : "your"} ${value}/10. The match score already weights complementarity.`,
        ),
        category: "team",
        priority: 2,
      });
    } else {
      add({
        id: `team-role-${role}`,
        title: L(`Rolle „${rLabel}“ ins Team holen`, `Bring the “${rLabel}” role into the team`),
        body: L(
          `${subject} bei ${label} nur bei ${value}/10. Ein:e Co-Founder:in mit Schwerpunkt ${rLabel} gleicht das aus – nimm die Rolle in dein Suchprofil auf und filtere die Kandidatenliste danach.`,
          `${subject} at only ${value}/10 for ${label}. A co-founder focused on ${rLabel} balances that out – add the role to your search profile and filter the candidate list by it.`,
        ),
        category: "team",
        priority,
      });
    }
  }

  /* 2) Fehlende Team-Rollen */
  if (!user.founderRole) {
    add({
      id: "team-own-role",
      title: L("Lege deine eigene Rolle fest", "Define your own role"),
      body: L(
        "Tech, Commercial, Product, Design oder Operations? Ohne klare eigene Rolle kann niemand einschätzen, wie du ein Team ergänzt – und das Matching bleibt unscharf.",
        "Tech, commercial, product, design or operations? Without a clear role of your own nobody can tell how you complement a team – and matching stays fuzzy.",
      ),
      category: "team",
      priority: 1,
    });
  }
  if (wantsCofounder && user.lookingForRoles.length === 0) {
    const suggested = user.founderRole ? COMPLEMENT_ROLE[user.founderRole] : "commercial";
    add({
      id: "team-define-missing-role",
      title: L("Lege fest, welche Rolle dir im Team fehlt", "Define which role your team is missing"),
      body: L(
        `Ohne Rollenprofil suchst du blind. Als ${ownRoleLabel} fehlt klassisch ein:e ${roleLabel(suggested)}-Co-Founder:in. Trag die Rolle im Onboarding ein – dann filtert das Matching passend.`,
        `Without a role profile you're searching blind. As a ${ownRoleLabel} you classically lack a ${roleLabel(suggested)} co-founder. Enter the role in onboarding – then matching filters accordingly.`,
      ),
      category: "team",
      priority: 1,
    });
  } else if (user.founderRole && wantsCofounder) {
    const complement = COMPLEMENT_ROLE[user.founderRole];
    const complementDim: FounderDimKey = complement === "tech" ? "tech" : "vision";
    if (!user.lookingForRoles.includes(complement) && effective[complementDim] < 7) {
      const wanted = user.lookingForRoles.map(roleLabel).join(", ");
      add({
        id: `team-complement-${complement}`,
        title: L(`Klassische Ergänzung fehlt: ${roleLabel(complement)}`, `Classic complement missing: ${roleLabel(complement)}`),
        body: L(
          `Als ${ownRoleLabel} suchst du ${wanted}, aber kein:e ${roleLabel(complement)}-Co-Founder:in. Investoren schauen zuerst, ob Bauen und Verkaufen im Team abgedeckt sind.`,
          `As a ${ownRoleLabel} you're looking for ${wanted}, but not for a ${roleLabel(complement)} co-founder. Investors first check whether building and selling are both covered in the team.`,
        ),
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
        title: L("Validiere das Problem, bevor du baust", "Validate the problem before you build"),
        body: L(
          "Führe 10–15 Problem-Interviews mit deiner Zielgruppe – keine Lösung pitchen, nur zuhören. Ziel: drei wiederkehrende Schmerzpunkte, für die heute schon Geld oder Zeit ausgegeben wird.",
          "Run 10–15 problem interviews with your target group – don't pitch a solution, just listen. Goal: three recurring pain points that people already spend money or time on today.",
        ),
        category: "product",
        priority: 1,
      });
      add({
        id: "stage-idea-smoke-test",
        title: L("Baue einen Smoke-Test", "Build a smoke test"),
        body: L(
          "Landing-Page mit klarem Versprechen und Warteliste, dazu 200 € Ads oder 50 direkte Nachrichten. Über 5 % Konversion heißt: weitermachen.",
          "A landing page with a clear promise and a waitlist, plus €200 in ads or 50 direct messages. Above 5% conversion means: keep going.",
        ),
        category: "product",
        priority: 2,
      });
      add({
        id: "stage-idea-fundraising",
        title: L("Noch kein Fundraising – aber Beziehungen aufbauen", "No fundraising yet – but build relationships"),
        body: L(
          "In der Ideenphase überzeugt Traktion, nicht das Deck. Nutze Investor-Gespräche zum Lernen: Welche Metriken wollen sie in sechs Monaten sehen?",
          "At the idea stage traction convinces, not the deck. Use investor conversations to learn: which metrics do they want to see in six months?",
        ),
        category: "fundraising",
        priority: 3,
      });
      break;
    case "pre-seed":
      add({
        id: "stage-preseed-first-customers",
        title: L("Gewinne die ersten drei zahlenden Kund:innen", "Win your first three paying customers"),
        body: L(
          "Pilotverträge mit klarem Erfolgskriterium, auch zu Sonderkonditionen. Zahlungsbereitschaft ist das stärkste Signal für Angels.",
          "Pilot contracts with a clear success criterion, even at special terms. Willingness to pay is the strongest signal for angels.",
        ),
        category: "product",
        priority: 1,
      });
      add({
        id: "stage-preseed-angel-round",
        title: L("Angel-Runde vorbereiten", "Prepare an angel round"),
        body: L(
          "10-Slide-Deck, 12–18 Monate Runway, Tickets 25–100k über SAFE oder Wandeldarlehen. Sprich zuerst mit Gründer-Angels aus deinem Vertical – sie entscheiden schneller.",
          "10-slide deck, 12–18 months of runway, tickets of 25–100k via SAFE or convertible loan. Talk to founder-angels from your vertical first – they decide faster.",
        ),
        category: "fundraising",
        priority: 1,
      });
      break;
    case "seed":
      add({
        id: "stage-seed-hiring",
        title: L("Erste Hires: Wer entlastet die Gründer:innen?", "First hires: who takes load off the founders?"),
        body: L(
          "Definiere die zwei Rollen, die am meisten Gründerzeit fressen (oft Engineering und Sales/Customer Success). Hiring-Scorecard schreiben, bevor die erste Anzeige rausgeht.",
          "Define the two roles that eat the most founder time (often engineering and sales/customer success). Write a hiring scorecard before the first job ad goes out.",
        ),
        category: "team",
        priority: 1,
      });
      add({
        id: "stage-seed-series-a-metrics",
        title: L("Series-A-Metriken jetzt tracken", "Track Series A metrics now"),
        body: L(
          "Die nächste Runde will MRR-Wachstum, Retention/Churn und CAC-Payback sehen. Baue das Dashboard heute, nicht in zwölf Monaten.",
          "The next round wants to see MRR growth, retention/churn and CAC payback. Build the dashboard today, not in twelve months.",
        ),
        category: "fundraising",
        priority: 2,
      });
      break;
    default:
      add({
        id: "stage-growth-leadership",
        title: L("Führungsebene aufbauen", "Build a leadership layer"),
        body: L(
          "Ab Series A skaliert das Team nur mit Leads pro Bereich und klaren Prozessen: OKRs, Hiring-Pipeline, Onboarding.",
          "From Series A on, the team only scales with leads per area and clear processes: OKRs, hiring pipeline, onboarding.",
        ),
        category: "team",
        priority: 2,
      });
      add({
        id: "stage-growth-efficiency",
        title: L("Nächste Runde: Effizienz zeigen", "Next round: show efficiency"),
        body: L(
          "Neben Wachstum zählen Burn-Multiple und Net Revenue Retention. Bereite die Datenraum-Struktur jetzt vor.",
          "Beyond growth, burn multiple and net revenue retention count. Prepare the data-room structure now.",
        ),
        category: "fundraising",
        priority: 2,
      });
  }

  /* 4) Idee bzw. Ideenfindung */
  if (!idea) {
    if (user.openToIdeas) {
      add({
        id: "idea-problem-list",
        title: L("Sammle 20 echte Probleme", "Collect 20 real problems"),
        body: L(
          "Notiere zwei Wochen lang jedes Problem, das dich oder dein Umfeld Zeit oder Geld kostet. Bewerte nach Häufigkeit, Schmerz und Zahlungsbereitschaft.",
          "For two weeks, write down every problem that costs you or people around you time or money. Rate by frequency, pain and willingness to pay.",
        ),
        category: "product",
        priority: 1,
      });
      add({
        id: "idea-problem-interviews",
        title: L("Problem-Interviews statt Brainstorming", "Problem interviews instead of brainstorming"),
        body: L(
          "Sprich mit zehn Personen aus einer Branche, die du kennst. Frage nach dem letzten Mal, als etwas richtig nervig war – nicht nach Lösungen.",
          "Talk to ten people from an industry you know. Ask about the last time something was really annoying – not about solutions.",
        ),
        category: "product",
        priority: 2,
      });
      add({
        id: "idea-join-team",
        title: L(`Auf der ${TIPS_EVENT_NAME}: Teams mit Idee kennenlernen`, `At ${TIPS_EVENT_NAME}: meet teams that already have an idea`),
        body: L(
          `Offen für Ideen heißt auch: Du kannst dich einem Team mit validiertem Problem anschließen. Filtere Kandidat:innen, die ${user.founderRole ? `eine:n ${ownRoleLabel}-Co-Founder:in` : "deine Rolle"} suchen.`,
          `Being open to ideas also means you can join a team with a validated problem. Filter for candidates looking for ${user.founderRole ? `a ${ownRoleLabel} co-founder` : "your role"}.`,
        ),
        category: "network",
        priority: 2,
      });
    } else {
      add({
        id: "idea-one-sentence",
        title: L("Formuliere deine Idee in einem Satz", "Put your idea in one sentence"),
        body: L(
          "„Wir helfen [Zielgruppe], [Problem] zu lösen, indem [Lösung].“ Ohne diesen Satz kann dich niemand weiterempfehlen – auch das Matching hier nicht.",
          "“We help [target group] solve [problem] by [solution].” Without this sentence nobody can refer you – not even the matching here.",
        ),
        category: "product",
        priority: 1,
      });
    }
  } else {
    add({
      id: "idea-sharpen-pitch",
      title: L("30-Sekunden-Pitch schärfen", "Sharpen your 30-second pitch"),
      body: L(
        `Problem → Zielgruppe → Lösung → warum jetzt, warum ihr. Teste ihn auf der ${TIPS_EVENT_NAME} an zehn Fremden und zähle, wie viele nachfragen.`,
        `Problem → target group → solution → why now, why you. Test it on ten strangers at ${TIPS_EVENT_NAME} and count how many ask follow-up questions.`,
      ),
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
    add({
      id: `vertical-${slugify(v)}`,
      title: localize(t.title, locale),
      body: localize(t.body, locale),
      category: t.category,
      priority: 2,
    });
    verticalHits++;
  }
  if (verticals.length === 0) {
    add({
      id: "vertical-choose",
      title: L("Wähle ein Fokus-Vertical", "Pick a focus vertical"),
      body: L(
        "Ohne Vertical findest du weder passende Co-Founder noch Investoren mit Thesen-Fit. Wähle das Feld, in dem du Zugang zu Kund:innen hast – nicht das größte.",
        "Without a vertical you'll find neither fitting co-founders nor investors with thesis fit. Choose the field where you have access to customers – not the biggest one.",
      ),
      category: "product",
      priority: 2,
    });
  } else if (verticalHits === 0 && primaryVertical) {
    add({
      id: `vertical-generic-${slugify(primaryVertical)}`,
      title: L(`Kenne dein Vertical „${primaryVertical}“`, `Know your vertical “${primaryVertical}”`),
      body: L(
        "Liste die drei wichtigsten Wettbewerber und ihre Schwächen, finde zwei Branchen-Expert:innen als Advisor und kläre die relevanten Regularien.",
        "List the three most important competitors and their weaknesses, find two industry experts as advisors and clarify the relevant regulations.",
      ),
      category: "product",
      priority: 3,
    });
  }

  /* 6) Netzwerk – konkret auf der IdeaLab! 2026 */
  if (wantsInvestor) {
    const investorStage = stage === "idea" || stage === "pre-seed" ? "Pre-Seed" : stage === "seed" ? "Seed" : "Series A+";
    add({
      id: `network-investors-${slugify(investorStage)}`,
      title: L(`Sprich mit 3 Investoren, die ${investorStage} machen`, `Talk to 3 investors who do ${investorStage}`),
      body: L(
        `Auf der ${TIPS_EVENT_NAME} sind Investoren vor Ort. Filtere die Kandidatenliste nach Investor:innen mit ${investorStage}-Fokus${primaryVertical ? ` und ${primaryVertical}` : ""}, bereite eine Frage pro Gespräch vor („Welche Metrik entscheidet bei euch?“) und bitte um ein Follow-up.`,
        `Investors are on site at ${TIPS_EVENT_NAME}. Filter the candidate list for investors with a ${investorStage} focus${primaryVertical ? ` and ${primaryVertical}` : ""}, prepare one question per conversation (“Which metric decides for you?”) and ask for a follow-up.`,
      ),
      category: "network",
      priority: 1,
    });
  }
  if (wantsCofounder) {
    const roles = user.lookingForRoles.map(roleLabel).join(", ") || L("passende Ergänzung", "fitting complement");
    add({
      id: "network-cofounders",
      title: L(`Triff 5 potenzielle Co-Founder (${roles})`, `Meet 5 potential co-founders (${roles})`),
      body: L(
        `Nutze die Kandidatenliste nach Match-Score. Ziel auf der ${TIPS_EVENT_NAME}: fünf Gespräche, zwei Follow-ups, ein gemeinsames Trial-Wochenende zum Bauen.`,
        `Use the candidate list sorted by match score. Goal at ${TIPS_EVENT_NAME}: five conversations, two follow-ups, one joint trial weekend of building.`,
      ),
      category: "network",
      priority: 1,
    });
  }
  if (wantsMentor) {
    add({
      id: "network-mentor",
      title: L("Finde eine:n Mentor:in mit eigener Gründungserfahrung", "Find a mentor with founding experience"),
      body: L(
        `Suche auf der ${TIPS_EVENT_NAME} Gründer:innen, die${primaryVertical ? ` in ${primaryVertical}` : ""} die ${stageLabel(stage)}-Phase schon hinter sich haben. Bitte um 30 Minuten pro Monat – nicht um „Mentoring“.`,
        `Look for founders at ${TIPS_EVENT_NAME} who have already been through the ${stageLabel(stage)} stage${primaryVertical ? ` in ${primaryVertical}` : ""}. Ask for 30 minutes a month – not for “mentoring”.`,
      ),
      category: "network",
      priority: 2,
    });
  } else if (stage === "idea" || stage === "pre-seed") {
    add({
      id: "network-get-mentor",
      title: L("Hol dir eine:n Mentor:in", "Get yourself a mentor"),
      body: L(
        `Du suchst aktuell keine Mentor:innen – in der ${stageLabel(stage)}-Phase spart dir eine erfahrene Gründerin oder ein erfahrener Gründer Monate. Ein Gespräch auf der ${TIPS_EVENT_NAME} reicht für den Anfang.`,
        `You're not currently looking for mentors – at the ${stageLabel(stage)} stage an experienced founder saves you months. One conversation at ${TIPS_EVENT_NAME} is enough to start.`,
      ),
      category: "network",
      priority: 3,
    });
  }
  if (wantsTalent) {
    add({
      id: "network-talent",
      title: L(`Erste Hires auf der ${TIPS_EVENT_NAME} kennenlernen`, `Meet your first hires at ${TIPS_EVENT_NAME}`),
      body: L(
        "Viele Teilnehmer:innen suchen einen Job im Start-up. Sprich über die konkrete Aufgabe der ersten 90 Tage statt über Titel – und bleib mit den zwei Besten in Kontakt, auch wenn du noch nicht einstellen kannst.",
        "Many attendees are looking for a job at a start-up. Talk about the concrete task of the first 90 days instead of titles – and stay in touch with the two best, even if you can't hire yet.",
      ),
      category: "network",
      priority: 2,
    });
  }
  add({
    id: "network-follow-up-48h",
    title: L("Follow-up innerhalb von 48 Stunden", "Follow up within 48 hours"),
    body: L(
      `Nach der ${TIPS_EVENT_NAME}: eine persönliche Nachricht mit Bezug auf das Gespräch und einem konkreten nächsten Schritt. Der Outreach-Generator passt den Ton an den Persönlichkeitstyp an.`,
      `After ${TIPS_EVENT_NAME}: a personal message referring to the conversation and one concrete next step. The outreach generator adapts the tone to the personality type.`,
    ),
    category: "network",
    priority: 3,
  });

  /* 7) Profil-Lücken */
  if (user.strengths.length === 0) {
    add({
      id: "skills-name-strengths",
      title: L("Benenne deine drei Stärken", "Name your three strengths"),
      body: L(
        "Co-Founder und Investoren wollen wissen, was du ins Team einbringst. Drei konkrete Stärken mit Beleg (Projekt, Zahl) – trag sie im Onboarding ein.",
        "Co-founders and investors want to know what you bring to the team. Three concrete strengths with evidence (project, number) – enter them in onboarding.",
      ),
      category: "skills",
      priority: 2,
    });
  }
  if (!user.completedInterview) {
    add({
      id: "skills-agent-interview",
      title: L("Lass dich vom Agenten interviewen", "Let the agent interview you"),
      body: L(
        "Das Interview schärft dein Profil (Stärken, Lücken, Suchprofil) und macht Matching und Tipps deutlich genauer.",
        "The interview sharpens your profile (strengths, gaps, search profile) and makes matching and tips noticeably more precise.",
      ),
      category: "skills",
      priority: 3,
    });
  }

  /* Mindestens TIP_MIN, höchstens TIP_MAX */
  for (const filler of FILLER_TIPS) {
    if (tips.length >= TIP_MIN) break;
    add({
      id: filler.id,
      title: localize(filler.title, locale),
      body: localize(filler.body, locale),
      category: filler.category,
      priority: filler.priority,
    });
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
          title: { type: "string", description: "max. 60 Zeichen, in der angeforderten Sprache" },
          body: { type: "string", description: "1–3 Sätze, konkrete Handlung, in der angeforderten Sprache" },
          category: { type: "string", enum: CATEGORIES },
          priority: { type: "integer", enum: [1, 2, 3], description: "1 = jetzt, 2 = nächste Wochen, 3 = gut zu wissen" },
        },
        required: ["id", "title", "body", "category", "priority"],
      },
    },
  },
  required: ["tips"],
};

export function tipsSystemPrompt(locale: TipLocale = "de"): string {
  const language =
    locale === "en"
      ? "- Sprache: Englisch. Schreibe alle Titel und Texte auf Englisch, direkte Ansprache („you“), knapp und konkret."
      : "- Sprache: Deutsch, direkte Ansprache („du“), knapp und konkret.";
  return [
    "Du bist ein erfahrener Start-up-Coach und Angel-Investor im deutschsprachigen Ökosystem.",
    `Du berätst Gründer:innen, die auf der Konferenz „${TIPS_EVENT_NAME}“ (WHU, Vallendar) Co-Founder, Investoren, Mentor:innen oder Talente suchen.`,
    "",
    "Aufgabe: Aus dem Profil der Gründer:in und einer Liste regelbasierter Basis-Tipps erzeugst du 6–12 konkrete, priorisierte Tipps",
    "zur Frage „Was fehlt meinem Start-up? Welche Skills brauche ich?“.",
    "",
    "Regeln:",
    `${language} Titel max. 60 Zeichen, Body 1–3 Sätze mit klarer Handlung, gern mit Zahlen oder Zielwerten.`,
    `- Kategorien: team (fehlende Rollen, Hiring), skills (eigene Fähigkeiten), fundraising, product (Idee, Validierung, Markt, Vertical), network (Kontakte – konkret auf der ${TIPS_EVENT_NAME}).`,
    "- priority: 1 = jetzt wichtig, 2 = in den nächsten Wochen, 3 = gut zu wissen. Mindestens zwei Tipps mit priority 1, höchstens fünf.",
    "- Nutze die Basis-Tipps als Ausgangspunkt: konkretisiere sie mit dem Profil (Vertical, Stage, Idee, Stärken, schwache Dimensionen), streiche Irrelevantes, ergänze Fehlendes.",
    "- Behalte die id eines Basis-Tipps, wenn du ihn verfeinerst. Neue Tipps bekommen eine neue kebab-case-id.",
    "- Keine Floskeln, keine Wiederholungen, keine erfundenen Fakten über konkrete Personen, Fonds oder Zahlen.",
    '- Antworte ausschließlich als JSON gemäß Schema: { "tips": Tip[] }.',
  ].join("\n");
}

export function tipsUserPrompt(user: UserContext, opts: GenerateTipsOptions & { baseTips?: Tip[] } = {}): string {
  const locale = normalizeTipLocale(opts.locale);
  const baseTips = opts.baseTips ?? generateTips(user, { teamDims: opts.teamDims, locale });
  const formatDims = (d: FounderDims) =>
    FOUNDER_DIM_KEYS.map((k) => `${localize(FOUNDER_DIM_LABELS_I18N[k], locale)}: ${d[k]}/10`).join(", ");
  const weak = weakestDim(opts.teamDims ?? user.dims);
  const lines = [
    "## Profil der Gründer:in",
    `- Name: ${user.name || "(unbekannt)"}${user.headline ? ` – ${user.headline}` : ""}`,
    `- Eigene Rolle: ${user.founderRole ? localize(FOUNDER_ROLE_LABELS_I18N[user.founderRole], locale) : "nicht festgelegt"}`,
    `- Stage: ${user.stage ? localize(STAGE_LABELS_I18N[user.stage], locale) : "nicht festgelegt"}`,
    `- Verticals: ${user.verticals.length ? user.verticals.join(", ") : "keine"}`,
    `- Idee: ${user.idea.trim() || "(keine)"}${user.openToIdeas ? " – offen für andere Ideen" : ""}`,
    `- Sucht: ${user.lookingFor.length ? user.lookingFor.map((r) => localize(NETWORK_ROLE_LABELS_I18N[r], locale)).join(", ") : "nichts Konkretes"}`,
    `- Fehlende Team-Rollen: ${user.lookingForRoles.length ? user.lookingForRoles.map((r) => localize(FOUNDER_ROLE_LABELS_I18N[r], locale)).join(", ") : "keine angegeben"}`,
    `- Stärken: ${user.strengths.length ? user.strengths.join(", ") : "keine angegeben"}`,
    `- Selbsteinschätzung: ${formatDims(user.dims)} (schwächste Dimension: ${localize(FOUNDER_DIM_LABELS_I18N[weak], locale)})`,
  ];
  if (opts.teamDims) lines.push(`- Team kombiniert: ${formatDims(opts.teamDims)}`);
  if (user.notes?.trim()) lines.push(`- Notizen aus dem Interview: ${user.notes.trim()}`);
  lines.push(
    `- Interview abgeschlossen: ${user.completedInterview ? "ja" : "nein"}`,
    `- Ausgabesprache: ${locale === "en" ? "Englisch" : "Deutsch"}`,
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
