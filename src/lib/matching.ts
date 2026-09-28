/**
 * Matching-Engine: bewertet, wie gut ein Profil zur Nutzer:in passt.
 * Deterministisch, ohne LLM – damit es ohne API-Key funktioniert und erklärbar ist.
 * Owner: siehe docs/PARALLEL-WORK.md. Signaturen (scoreMatch, rankCandidates, complementarity) sind Contract.
 *
 * Score-Modell: Jede Reason trägt `weight` Punkte bei (Budget je Pfad ≤ 100), Risiken können
 * Punkte abziehen. score = clamp(Σ weight − Abzüge). Pfad = networkRole des Profils, sofern die
 * Nutzer:in diese Rolle sucht; sonst gibt es nur die allgemeinen Signale (Vertical, Text, Skills, Event).
 *
 * Sprache: Alle Texte (reasons, risks, explainMatch, Tier-Labels) liegen als {de, en} vor und werden
 * über `options.locale` (Default "de") ausgewählt. Gewichte und Scores sind sprachunabhängig.
 * Die Datei bleibt pur: kein Import aus data.ts oder i18n.tsx, der Locale-Typ ist lokal definiert.
 */
import {
  FOUNDER_DIM_KEYS,
  FOUNDER_DIM_LABELS,
  type FounderDimKey,
  type FounderDims,
  type FounderRole,
  type MatchReason,
  type MatchResult,
  type NetworkRole,
  type Profile,
  type Stage,
  type UserContext,
} from "./types";

/* ------------------------------------------------------------------ */
/* Öffentliche Zusatz-Typen                                            */
/* ------------------------------------------------------------------ */

/** Lokal definiert (kein Import aus i18n.tsx), strukturell identisch mit `Locale` dort. */
export type MatchLocale = "de" | "en";

export interface MatchOptions {
  /** Event-Slugs, bei denen die Nutzer:in selbst ist (UserContext hat kein Event-Feld). */
  userEvents?: string[];
  /** Sprache der Texte in reasons/risks. Default "de". Scores bleiben unabhängig davon gleich. */
  locale?: MatchLocale;
}

export const DEFAULT_USER_EVENTS: string[] = ["idealab-2026"];

export type MatchTier = "top" | "gut" | "möglich" | "schwach";

export const MATCH_TIER_LABELS: Record<MatchTier, string> = {
  top: "Top-Match",
  gut: "Guter Match",
  möglich: "Möglicher Match",
  schwach: "Schwacher Match",
};

export const MATCH_TIER_LABELS_EN: Record<MatchTier, string> = {
  top: "Top match",
  gut: "Good match",
  möglich: "Possible match",
  schwach: "Weak match",
};

/** Tier-Label in der gewünschten Sprache (Default Deutsch). */
export function matchTierLabel(tier: MatchTier, locale: MatchLocale = "de"): string {
  return (locale === "en" ? MATCH_TIER_LABELS_EN : MATCH_TIER_LABELS)[tier];
}

/* ------------------------------------------------------------------ */
/* Labels & Konstanten                                                 */
/* ------------------------------------------------------------------ */

/** Zweisprachiges Textpaar. */
type Bi = { de: string; en: string };

const NETWORK_ROLE_LABELS: Record<NetworkRole, Bi> = {
  cofounder: { de: "Co-Founder", en: "Co-founder" },
  investor: { de: "Investor:in", en: "Investor" },
  mentor: { de: "Mentor:in", en: "Mentor" },
  talent: { de: "Talent", en: "Talent" },
  expert: { de: "Expert:in", en: "Expert" },
};

/** Englisch im Satz mit Artikel ("is an investor"); Deutsch kommt ohne Artikel aus ("ist Investor:in"). */
const NETWORK_ROLE_IN_SENTENCE_EN: Record<NetworkRole, string> = {
  cofounder: "a co-founder",
  investor: "an investor",
  mentor: "a mentor",
  talent: "a talent",
  expert: "an expert",
};

const FOUNDER_ROLE_LABELS: Record<FounderRole, Bi> = {
  tech: { de: "Tech", en: "Tech" },
  commercial: { de: "Commercial", en: "Commercial" },
  product: { de: "Produkt", en: "Product" },
  design: { de: "Design", en: "Design" },
  operations: { de: "Operations", en: "Operations" },
  "domain-expert": { de: "Domain-Expert:in", en: "Domain expert" },
};

const STAGE_ORDER: Stage[] = ["idea", "pre-seed", "seed", "series-a", "growth"];

const STAGE_LABELS: Record<Stage, Bi> = {
  idea: { de: "Idee", en: "Idea" },
  "pre-seed": { de: "Pre-Seed", en: "Pre-seed" },
  seed: { de: "Seed", en: "Seed" },
  "series-a": { de: "Series A", en: "Series A" },
  growth: { de: "Growth", en: "Growth" },
};

/** Deutsch aus dem Shared Contract (bleibt synchron), Englisch lokal. */
const DIM_LABELS: Record<FounderDimKey, Bi> = {
  vision: { de: FOUNDER_DIM_LABELS.vision, en: "Vision" },
  design: { de: FOUNDER_DIM_LABELS.design, en: "Design / Visual" },
  tech: { de: FOUNDER_DIM_LABELS.tech, en: "Tech" },
  detail: { de: FOUNDER_DIM_LABELS.detail, en: "Detail" },
  execution: { de: FOUNDER_DIM_LABELS.execution, en: "Execution" },
};

const NEUTRAL_DIMS: FounderDims = { vision: 5, design: 5, tech: 5, detail: 5, execution: 5 };

/** Wörter in profile.lookingFor, die auf die eigene Team-Rolle der Nutzer:in hindeuten. */
const ROLE_WORDS: Record<FounderRole, string[]> = {
  tech: ["technical", "tech", "cto", "engineer", "developer"],
  commercial: ["commercial", "business", "sales", "ceo", "marketing"],
  product: ["product", "cpo"],
  design: ["design", "ux"],
  operations: ["operations", "coo", "ops"],
  "domain-expert": ["domain", "expert", "industry"],
};

/** "job as engineer" → tech usw. (Talent-Profile). */
const JOB_WORDS: [string, FounderRole][] = [
  ["engineer", "tech"],
  ["developer", "tech"],
  ["product manager", "product"],
  ["designer", "design"],
  ["sales", "commercial"],
  ["marketing", "commercial"],
  ["operations", "operations"],
];

const FOUNDER_TITLE_RE = /\b(co-?founder|founder|gründer(in)?|mitgründer(in)?|ceo|cto|coo|cfo|cpo|geschäftsführer(in)?|managing director)\b/i;
const LEAD_TITLE_RE = /\b(head of|director|vp|vice president|lead|leiter(in)?|partner|principal|senior)\b/i;
const INVEST_TITLE_RE = /\b(partner|investor|angel|venture|vc|principal|associate|investment)\b/i;

/** Stoppwörter de/en plus Startup-Allgemeinplätze, die bei einer Gründerkonferenz jeder schreibt. */
const STOPWORDS = new Set(
  (
    "aber alle allem allen aller alles als also am an ander andere anderen anderer anderes auch auf aus bei bin bis bist da damit dann " +
    "der den des dem die das dass daß dazu dein deine deinem deinen deiner denn dessen dich dir du dies diese diesem diesen dieser dieses doch " +
    "dort durch ein eine einem einen einer eines einige einmal er ihn ihm es etwas euer eure für gegen gewesen habe haben hat hatte hatten hier " +
    "hin hinter ich mich mir ihr ihre ihrem ihren ihrer ihres euch im in indem ins ist jede jedem jeden jeder jedes jetzt kann kein keine keinem " +
    "keinen keiner können könnte machen macht man manche mein meine meinem meinen meiner mit muss musste nach nicht nichts noch nun nur ob oder " +
    "ohne sehr sein seine seinem seinen seiner selbst sich sie ihnen sind so solche soll sollte sondern sonst über um und uns unser unsere unter " +
    "viel vom von vor während war waren was weg weil weiter welche welchem welchen welcher welches wenn werde werden wie wieder will wir wird " +
    "wirst wo wollen wollte würde würden zu zum zur zwar zwischen innen mehr viele wer immer schon dabei dafür gerne gern neue neuen neuer neues " +
    "eigene eigenen eigener richtigen richtige findet finden helfen hilft bauen baut aktuell derzeit heute morgen " +
    "a about above after again against all am an and any are as at be because been before being below between both but by can did do does " +
    "doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself " +
    "just me more most my myself no nor not now of off on once only or other our ours ourselves out over own same she should so some such than " +
    "that the their theirs them themselves then there these they this those through to too under until up very was we were what when where " +
    "which while who whom why will with you your yours yourself yourselves years year currently passionate looking love new one two first also " +
    "get make help helps helping build building based using use work working experience experienced always really like well every many much lot " +
    "startup startups founder founders cofounder cofounders founding gründer gründerin gründerinnen gründung company companies unternehmen team " +
    "teams business businesses tech technology technologies digital innovation innovative solution solutions product products service services " +
    "customer customers kunden market markets markt world welt people menschen idea ideas idee ideen future zukunft venture ventures entrepreneur " +
    "entrepreneurs entrepreneurship student students studierende university universität studium"
  ).split(" "),
);

/** Kurze Tokens, die trotzdem Bedeutung tragen. */
const SHORT_ALLOW = new Set(["ai", "ki", "vc", "ux", "ui", "ml", "hr", "ar", "vr", "3d", "ip", "iot"]);

/**
 * Skill-Konzepte: fasst Synonyme zusammen, damit "AI/LLM" und "Machine Learning" als Überschneidung zählen.
 * `label` ist der deutsche Anzeigename und zugleich der interne Schlüssel, `en` das englische Pendant.
 */
const SKILL_CONCEPTS: { label: string; en: string; phrases: string[] }[] = [
  { label: "AI/ML", en: "AI/ML", phrases: ["ai", "ki", "ml", "llm", "llms", "genai", "machine learning", "deep learning", "artificial intelligence", "künstliche intelligenz", "generative ai", "nlp", "data science", "computer vision"] },
  { label: "Backend", en: "Backend", phrases: ["backend", "back end", "api", "apis", "node", "python", "java", "rust", "databases", "sql", "postgres", "server", "software engineering", "software development", "softwareentwicklung"] },
  { label: "Frontend", en: "Frontend", phrases: ["frontend", "front end", "react", "next js", "vue", "angular", "typescript", "javascript", "web development", "webentwicklung"] },
  { label: "Mobile", en: "Mobile", phrases: ["mobile", "ios", "android", "flutter", "react native", "swift", "kotlin"] },
  { label: "Cloud/DevOps", en: "Cloud/DevOps", phrases: ["cloud", "aws", "azure", "gcp", "devops", "kubernetes", "docker", "infrastructure"] },
  { label: "Data/Analytics", en: "Data/Analytics", phrases: ["data", "analytics", "data analysis", "tableau", "power bi", "statistics", "statistik", "excel"] },
  { label: "Prototyping/MVP", en: "Prototyping/MVP", phrases: ["prototyping", "prototype", "prototypen", "mvp", "rapid prototyping", "no code", "low code", "hackathon"] },
  { label: "Produkt", en: "Product", phrases: ["product", "product management", "produktmanagement", "product owner", "roadmap", "user research", "agile", "scrum"] },
  { label: "Design/UX", en: "Design/UX", phrases: ["design", "ux", "ui", "figma", "user experience", "product design", "branding", "visual design"] },
  { label: "Sales/BizDev", en: "Sales/BizDev", phrases: ["sales", "vertrieb", "business development", "bizdev", "b2b sales", "account management", "key account", "partnerships", "negotiation", "verhandlung"] },
  { label: "Marketing/Growth", en: "Marketing/Growth", phrases: ["marketing", "growth", "seo", "content", "social media", "performance marketing", "brand", "go to market", "gtm"] },
  { label: "Finance/Fundraising", en: "Finance/Fundraising", phrases: ["finance", "finanzen", "fundraising", "venture capital", "vc", "investment", "investments", "controlling", "accounting", "financial modeling", "private equity", "due diligence"] },
  { label: "Operations", en: "Operations", phrases: ["operations", "ops", "supply chain", "logistics", "logistik", "prozesse", "process management", "project management", "projektmanagement"] },
  { label: "Leadership", en: "Leadership", phrases: ["leadership", "führung", "team building", "management", "hiring", "recruiting"] },
  { label: "Strategie/Consulting", en: "Strategy/Consulting", phrases: ["strategy", "strategie", "consulting", "beratung", "business strategy", "corporate strategy"] },
  { label: "Legal/Compliance", en: "Legal/Compliance", phrases: ["legal", "recht", "law", "compliance", "regulatory", "datenschutz", "gdpr"] },
  { label: "Hardware/Robotics", en: "Hardware/Robotics", phrases: ["hardware", "robotics", "robotik", "embedded", "iot", "mechanical engineering", "maschinenbau", "electronics"] },
  { label: "Umsetzungsstärke", en: "Execution", phrases: ["execution", "umsetzung", "schnelle umsetzung", "delivery", "shipping", "hands on", "getting things done"] },
  { label: "Kommunikation", en: "Communication", phrases: ["communication", "kommunikation", "public speaking", "pitching", "storytelling", "presentation"] },
  { label: "Research/Science", en: "Research/Science", phrases: ["research", "forschung", "science", "phd", "biotech", "chemistry", "physics", "medicine", "medizin"] },
];

const SKILL_CONCEPT_EN = new Map(SKILL_CONCEPTS.map((c) => [c.label, c.en] as const));

/* ------------------------------------------------------------------ */
/* Kleine Helfer                                                       */
/* ------------------------------------------------------------------ */

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

/** Robust gegen unvollständige API-Bodies: nur String-Arrays durchlassen. */
function list<T extends string = string>(v: readonly T[] | undefined | null): T[] {
  return Array.isArray(v) ? v.filter((x): x is T => typeof x === "string") : [];
}

function norm(s: string) {
  return s.trim().toLowerCase();
}

function firstName(name: string, locale: MatchLocale = "de") {
  return (name ?? "").trim().split(/\s+/)[0] || name || (locale === "en" ? "This person" : "Diese Person");
}

function stageIndex(s?: Stage | null): number {
  return s ? STAGE_ORDER.indexOf(s) : -1;
}

function humanizeSlug(slug: string) {
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function joinLabels<K extends string>(keys: K[], labels: Record<K, Bi>, locale: MatchLocale) {
  return keys.map((k) => labels[k]?.[locale] ?? k).join(", ");
}

/** Wörter normalisieren: klein, nur Buchstaben/Zahlen, mit Leerzeichen gepolstert (für Phrasen-Suche). */
function padWords(text: string) {
  return " " + text.toLowerCase().split(/[^a-z0-9äöüß]+/).filter(Boolean).join(" ") + " ";
}

/** Bedeutungstragende Tokens ohne Stoppwörter und Zahlen. */
function tokenize(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of (text ?? "").toLowerCase().split(/[^a-z0-9äöüß]+/)) {
    if (!raw || /^\d+$/.test(raw)) continue;
    if (raw.length < 3 && !SHORT_ALLOW.has(raw)) continue;
    if (STOPWORDS.has(raw)) continue;
    out.add(raw);
  }
  return out;
}

/** Gleich oder gemeinsamer Wortstamm (≥ 5 Zeichen Präfix): investor ~ investoren, konferenz ~ konferenzen. */
function tokensMatch(a: string, b: string) {
  if (a === b) return true;
  if (a.length < 5 || b.length < 5) return false;
  return a.startsWith(b) || b.startsWith(a);
}

/** Tokens aus `a`, die in `b` (unscharf) vorkommen – Basis der Text-Ähnlichkeit. */
function sharedTerms(a: Set<string>, b: Set<string>): string[] {
  const bArr = Array.from(b);
  const hits: string[] = [];
  for (const t of a) if (bArr.some((u) => tokensMatch(t, u))) hits.push(t);
  return hits;
}

/** Welche Skill-Konzepte kommen in einer Liste von Skills/Stärken vor? (Schlüssel = deutsches Label) */
function conceptsOf(items: string[]): Set<string> {
  const padded = items.map(padWords);
  const found = new Set<string>();
  for (const c of SKILL_CONCEPTS) {
    if (c.phrases.some((p) => padded.some((s) => s.includes(" " + p + " ")))) found.add(c.label);
  }
  return found;
}

/**
 * Gemeinsame Skills/Stärken als lesbare Labels (Konzepte zuerst, dann rohe Wörter).
 * Die Menge ist sprachunabhängig; nur die Konzept-Labels werden am Ende übersetzt.
 */
function skillOverlap(strengths: string[], skills: string[], locale: MatchLocale): string[] {
  if (!strengths.length || !skills.length) return [];
  const a = conceptsOf(strengths);
  const b = conceptsOf(skills);
  const concepts = Array.from(a).filter((c) => b.has(c));
  const coveredWords = new Set(
    SKILL_CONCEPTS.filter((c) => concepts.includes(c.label)).flatMap((c) => c.phrases.flatMap((p) => p.split(" "))),
  );
  const labels = concepts.map((c) => (locale === "en" ? SKILL_CONCEPT_EN.get(c) ?? c : c));
  const rawA = tokenize(strengths.join(" "));
  const rawB = tokenize(skills.join(" "));
  for (const t of rawA) {
    if (t.length >= 4 && rawB.has(t) && !coveredWords.has(t)) labels.push(t[0].toUpperCase() + t.slice(1));
  }
  return labels.sort();
}

function experienceTitles(profile: Profile): string[] {
  return (Array.isArray(profile.experience) ? profile.experience : [])
    .map((e) => (e && typeof e.title === "string" ? e.title.trim() : ""))
    .filter(Boolean);
}

function jobRolesOf(lookingFor: string[]): FounderRole[] {
  const roles = new Set<FounderRole>();
  for (const lf of lookingFor) {
    if (!/job|stelle|position|role|hire/.test(lf)) continue;
    for (const [word, role] of JOB_WORDS) if (lf.includes(word)) roles.add(role);
  }
  return Array.from(roles);
}

function isMentorLike(r: NetworkRole) {
  return r === "mentor" || r === "expert";
}

/* ------------------------------------------------------------------ */
/* Contract-Funktionen                                                 */
/* ------------------------------------------------------------------ */

/** 0–100: Wie stark ergänzen die Dims des Profils die Schwächen der Nutzer:in? */
export function complementarity(user: FounderDims, other: FounderDims): number {
  let gain = 0;
  let possible = 0;
  for (const k of FOUNDER_DIM_KEYS) {
    const gap = Math.max(0, 10 - user[k]);
    possible += gap;
    gain += Math.min(gap, Math.max(0, other[k] - user[k]));
  }
  if (possible === 0) return 50;
  return Math.round((gain / possible) * 100);
}

export function scoreMatch(user: UserContext, profile: Profile, options?: MatchOptions): MatchResult {
  const locale: MatchLocale = options?.locale ?? "de";
  /** Textauswahl nach Sprache – Gewichte bleiben davon unberührt. */
  const tx = (de: string, en: string) => (locale === "en" ? en : de);
  const lbl = <K extends string>(labels: Record<K, Bi>, k: K) => labels[k]?.[locale] ?? k;
  const join = <K extends string>(keys: K[], labels: Record<K, Bi>) => joinLabels(keys, labels, locale);
  /** Reason-Label nach Sprache; merkt sich den deutschen Schlüssel, damit die Sortierung in beiden Sprachen gleich ist. */
  const labelKey = new Map<string, string>();
  const lab = (de: string, en: string) => {
    const l = tx(de, en);
    labelKey.set(l, de);
    return l;
  };

  const reasons: MatchReason[] = [];
  const risks: string[] = [];
  let penalty = 0;
  const add = (label: string, detail: string, weight: number, key?: string) => {
    const w = Math.round(weight);
    if (key) labelKey.set(label, key);
    if (w > 0) reasons.push({ label, detail, weight: w });
  };
  const risk = (text: string, minus = 0) => {
    risks.push(text);
    penalty += minus;
  };

  // Eingaben normalisieren (API-Bodies können unvollständig sein).
  const first = firstName(profile.name, locale);
  const lookingFor = list<NetworkRole>(user.lookingFor);
  const lookingForRoles = list<FounderRole>(user.lookingForRoles);
  const userVerticals = list(user.verticals).map(norm);
  const profileVerticals = list(profile.verticals).map(norm);
  const profileLookingFor = list(profile.lookingFor).map(norm);
  const userDims = user.dims ?? NEUTRAL_DIMS;
  const profileDims = profile.dims ?? NEUTRAL_DIMS;
  const userEvents = options?.userEvents ?? DEFAULT_USER_EVENTS;
  const role = profile.networkRole;
  const roleLabel = lbl(NETWORK_ROLE_LABELS, role);
  const roleEn = NETWORK_ROLE_IN_SENTENCE_EN[role] ?? role;
  const titles = experienceTitles(profile);
  const comp = complementarity(userDims, profileDims);

  // 1) Sucht die Nutzer:in diese Art von Kontakt? (Gate für die rollenspezifischen Signale)
  const wanted = lookingFor.includes(role);
  const related = !wanted && isMentorLike(role) && lookingFor.some(isMentorLike);
  if (wanted) {
    add(
      lab("Gesuchte Rolle", "Role you're looking for"),
      tx(`${first} ist ${roleLabel} – genau die Art Kontakt, die du suchst.`, `${first} is ${roleEn} – exactly the kind of contact you're looking for.`),
      20,
    );
  } else if (related) {
    const near = join(lookingFor.filter(isMentorLike), NETWORK_ROLE_LABELS);
    add(
      lab("Gesuchte Rolle", "Role you're looking for"),
      tx(`${first} ist ${roleLabel} – nah an dem, was du suchst (${near}).`, `${first} is ${roleEn} – close to what you're looking for (${near}).`),
      12,
    );
  } else {
    const seeking = join(lookingFor, NETWORK_ROLE_LABELS);
    risk(
      tx(
        `Ist ${roleLabel}, du suchst aktuell ${seeking || "noch nichts Konkretes"}.`,
        seeking ? `Is ${roleEn}, but you're currently looking for ${seeking}.` : `Is ${roleEn}, but you haven't said what you're looking for yet.`,
      ),
      5,
    );
  }
  const path: NetworkRole | null = wanted || related ? role : null;

  // 2) Rollenspezifischer Fit
  if (path === "cofounder") {
    const fr = profile.founderRole;
    if (fr && lookingForRoles.includes(fr)) {
      const r = lbl(FOUNDER_ROLE_LABELS, fr);
      add(lab("Fehlende Team-Rolle", "Missing team role"), tx(`Deckt die Rolle ${r} ab, die dir im Team fehlt.`, `Covers the ${r} role your team is missing.`), 20);
    } else if (fr && fr === user.founderRole) {
      const r = lbl(FOUNDER_ROLE_LABELS, fr);
      risk(tx(`Gleiche Rolle wie du (${r}) – Überschneidung statt Ergänzung.`, `Same role as you (${r}) – overlap rather than complement.`), 10);
    } else if (fr) {
      const r = lbl(FOUNDER_ROLE_LABELS, fr);
      const mine = user.founderRole ? lbl(FOUNDER_ROLE_LABELS, user.founderRole) : tx("dir", "you");
      if (lookingForRoles.length) {
        const wantedRoles = join(lookingForRoles, FOUNDER_ROLE_LABELS);
        add(
          lab("Andere Perspektive", "Different perspective"),
          tx(`Nicht deine gesuchte Rolle (${wantedRoles}), aber als ${r} eine Ergänzung zu ${mine}.`, `Not the role you're looking for (${wantedRoles}), but ${r} still complements ${mine}.`),
          6,
        );
      } else {
        add(
          lab("Andere Perspektive", "Different perspective"),
          tx(`Bringt als ${r} eine andere Perspektive als ${mine} ein.`, `As ${r}, brings a different perspective than ${mine}.`),
          10,
        );
      }
    } else {
      risk(tx("Team-Rolle im Profil unklar – im Gespräch klären.", "Team role unclear in the profile – clarify in conversation."));
    }

    addComplementarity(add, comp, userDims, profileDims, 0.12, locale);
    // Nur warnen, wenn auch die Rolle keine Lücke füllt – sonst widerspricht das dem Top-Match.
    const fillsGap = !!fr && lookingForRoles.includes(fr);
    if (comp < 25 && !fillsGap) {
      risk(tx("Ähnliches Stärkenprofil wie du – wenig Ergänzung bei den Dimensionen.", "Similar strengths profile to yours – little complementarity across the dimensions."));
    }

    // Sucht das Profil umgekehrt jemanden wie die Nutzer:in?
    const words = user.founderRole ? ROLE_WORDS[user.founderRole] : [];
    if (profileLookingFor.some((lf) => words.some((w) => lf.includes(w)))) {
      add(lab("Sucht jemanden wie dich", "Looking for someone like you"), tx(`Sucht: ${profileLookingFor.join(", ")}.`, `Looking for: ${profileLookingFor.join(", ")}.`), 8);
    } else if (profileLookingFor.some((lf) => /co-?founder|mitgründer/.test(lf))) {
      add(
        lab("Sucht Co-Founder", "Looking for a co-founder"),
        tx(`Sucht Mitgründer:innen, Rolle offen (${profileLookingFor.join(", ")}).`, `Looking for co-founders, role open (${profileLookingFor.join(", ")}).`),
        4,
      );
    }

    // Phase
    const d = Math.abs(stageIndex(user.stage) - stageIndex(profile.stage));
    if (user.stage && profile.stage) {
      const ps = lbl(STAGE_LABELS, profile.stage);
      const us = lbl(STAGE_LABELS, user.stage);
      if (d === 0) add(lab("Gleiche Phase", "Same stage"), tx(`Beide in Phase ${ps}.`, `You're both at the ${ps} stage.`), 4);
      else if (d === 1) add(lab("Ähnliche Phase", "Similar stage"), tx(`Phasen liegen nah beieinander (${ps} vs. ${us}).`, `Stages are close together (${ps} vs. ${us}).`), 2);
    }

    // Eigene Idee im Gepäck?
    const seeksTeam = profileLookingFor.some((lf) => /co-?founder|mitgründer/.test(lf));
    if (seeksTeam && stageIndex(profile.stage) <= 1 && !user.openToIdeas) {
      risk(
        tx(
          "Sucht selbst noch ein Team für die eigene Idee – ihr müsstet euch auf eine Idee einigen.",
          "Still looking for a team for their own idea – you'd have to agree on one idea.",
        ),
        4,
      );
    }

    if (titles.length >= 3) add(lab("Erfahrung", "Experience"), experienceDetail(titles.length, locale), 2);
  } else if (path === "investor") {
    const us = user.stage;
    const ps = profile.stage;
    if (!us || !ps) {
      add(lab("Phase offen", "Stage open"), tx("Investitionsphase ist nicht hinterlegt – kein Ausschlusskriterium.", "Investment stage not specified – not a deal-breaker."), 8);
    } else {
      const d = stageIndex(ps) - stageIndex(us); // > 0: investiert später, als du bist
      const psL = lbl(STAGE_LABELS, ps);
      const usL = lbl(STAGE_LABELS, us);
      if (d === 0) add(lab("Passende Phase", "Matching stage"), tx(`Investiert in ${psL} – genau deine Phase.`, `Invests at ${psL} – exactly your stage.`), 20);
      else if (Math.abs(d) === 1) {
        add(
          lab("Passende Phase", "Matching stage"),
          tx(`Investiert in ${psL}, du bist bei ${usL} – nah genug für ein erstes Gespräch.`, `Invests at ${psL}, you're at ${usL} – close enough for a first conversation.`),
          14,
        );
      } else if (d > 0) {
        risk(
          tx(`Investiert erst ab ${psL} – du bist bei ${usL}, also wahrscheinlich zu früh.`, `Only invests from ${psL} onwards – you're at ${usL}, so probably too early.`),
          d >= 3 ? 10 : 6,
        );
      } else {
        risk(
          tx(`Investiert in ${psL}, du bist schon bei ${usL} – passt nicht zur Ticketgröße.`, `Invests at ${psL}, you're already at ${usL} – doesn't match the ticket size.`),
          -d >= 3 ? 10 : 6,
        );
      }
    }

    addComplementarity(add, comp, userDims, profileDims, 0.04, locale);

    if (profileLookingFor.some((lf) => /invest|dealflow|deal flow|startups/.test(lf))) {
      add(
        lab("Sucht Dealflow", "Looking for deal flow"),
        tx(`Ist aktiv auf der Suche nach Startups (${profileLookingFor.join(", ")}).`, `Actively looking for startups (${profileLookingFor.join(", ")}).`),
        8,
      );
    }

    const investTitles = titles.filter((t) => INVEST_TITLE_RE.test(t));
    if (investTitles.length) {
      const shown = investTitles.slice(0, 2).join(", ");
      add(lab("Investment-Erfahrung", "Investment experience"), tx(`Investment-Hintergrund im Lebenslauf (${shown}).`, `Investment background on the CV (${shown}).`), 6);
    } else if (titles.length >= 4) add(lab("Erfahrung", "Experience"), experienceDetail(titles.length, locale), 3);
  } else if (path === "mentor" || path === "expert") {
    const founderTitles = titles.filter((t) => FOUNDER_TITLE_RE.test(t));
    const leadTitles = titles.filter((t) => LEAD_TITLE_RE.test(t));
    if (founderTitles.length) {
      const shown = founderTitles.slice(0, 2).join(", ");
      add(
        lab("Gründungserfahrung", "Founding experience"),
        tx(`Hat selbst gegründet oder geführt (${shown}) – weiß, wo du stehst.`, `Has founded or led a company themselves (${shown}) – knows where you stand.`),
        12,
      );
    } else if (leadTitles.length) {
      add(
        lab("Führungserfahrung", "Leadership experience"),
        tx(`Führungserfahrung (${leadTitles[0]}) – kann auf Augenhöhe Feedback geben.`, `Leadership experience (${leadTitles[0]}) – can give feedback as a peer.`),
        8,
      );
    } else {
      risk(tx("Keine erkennbare Gründungs- oder Führungserfahrung im Lebenslauf.", "No visible founding or leadership experience on the CV."));
    }

    const covered = FOUNDER_DIM_KEYS.filter((k) => userDims[k] <= 5 && profileDims[k] >= 7);
    if (covered.length) {
      const dims = join(covered, DIM_LABELS);
      add(lab("Deckt deine Lücken", "Covers your gaps"), tx(`Stark in ${dims} – da schätzt du dich selbst schwächer ein.`, `Strong in ${dims} – where you rate yourself weaker.`), 8);
    }

    addComplementarity(add, comp, userDims, profileDims, 0.1, locale);

    if (profileLookingFor.some((lf) => /mentee|advisor|beirat|mentoring/.test(lf))) {
      add(
        lab("Bietet Mentoring an", "Offers mentoring"),
        tx(`Sucht aktiv Mentees bzw. eine Advisor-Rolle (${profileLookingFor.join(", ")}).`, `Actively looking for mentees or an advisor role (${profileLookingFor.join(", ")}).`),
        8,
      );
    }

    if (titles.length >= 4) add(lab("Erfahrung", "Experience"), experienceDetail(titles.length, locale), 4);
  } else if (path === "talent") {
    const fr = profile.founderRole;
    const jobRoles = jobRolesOf(profileLookingFor);
    const hit = fr && lookingForRoles.includes(fr) ? fr : jobRoles.find((r) => lookingForRoles.includes(r));
    const sameArea = !!user.founderRole && (fr === user.founderRole || jobRoles.includes(user.founderRole));
    if (hit) {
      const r = lbl(FOUNDER_ROLE_LABELS, hit);
      add(lab("Passende Position", "Matching position"), tx(`Als ${r} passt ${first} auf eine Rolle, die du besetzen willst.`, `As ${r}, ${first} fits a position you want to fill.`), 20);
    } else if (sameArea && user.founderRole) {
      const r = lbl(FOUNDER_ROLE_LABELS, user.founderRole);
      add(
        lab("Verstärkt deinen Bereich", "Strengthens your area"),
        tx(`Würde deinen Bereich (${r}) verstärken – eine typische erste Einstellung.`, `Would strengthen your area (${r}) – a typical first hire.`),
        12,
      );
    } else if (fr && lookingForRoles.length) {
      const r = lbl(FOUNDER_ROLE_LABELS, fr);
      const open = join(lookingForRoles, FOUNDER_ROLE_LABELS);
      risk(tx(`Rolle (${r}) passt nicht zu deinen offenen Positionen (${open}).`, `Role (${r}) doesn't match your open positions (${open}).`));
    }

    addComplementarity(add, comp, userDims, profileDims, 0.08, locale);

    if (profileLookingFor.some((lf) => /job|stelle|position|hire/.test(lf))) {
      add(lab("Sucht einen Job", "Looking for a job"), tx(`Ist offen für eine Stelle (${profileLookingFor.join(", ")}).`, `Open to a position (${profileLookingFor.join(", ")}).`), 8);
    }

    if (titles.length >= 4) add(lab("Erfahrung", "Experience"), experienceDetail(titles.length, locale), 6);
    else if (titles.length >= 2) add(lab("Erfahrung", "Experience"), experienceDetail(titles.length, locale), 3);
  }

  // 3) Vertical – für Investor:innen (Thesen-Fokus) stärker gewichtet
  const sharedVerticals = profileVerticals.filter((v) => userVerticals.includes(v));
  const investorPath = path === "investor";
  if (sharedVerticals.length > 0) {
    const w = investorPath ? (sharedVerticals.length > 1 ? 23 : 14) : sharedVerticals.length > 1 ? 15 : 10;
    const shared = sharedVerticals.join(", ");
    add(
      lab("Gleiches Vertical", "Same vertical"),
      investorPath ? tx(`Investiert in dein Vertical (${shared}).`, `Invests in your vertical (${shared}).`) : tx(`Gemeinsam: ${shared}.`, `In common: ${shared}.`),
      w,
    );
  } else if (userVerticals.length && profileVerticals.length) {
    const pv = profileVerticals.join(", ");
    const uv = userVerticals.join(", ");
    if (investorPath) {
      risk(tx(`Investiert in ${pv}, nicht in dein Vertical (${uv}).`, `Invests in ${pv}, not in your vertical (${uv}).`), 8);
    } else if (!user.openToIdeas) {
      risk(tx(`Kein gemeinsames Vertical (${pv} vs. ${uv}).`, `No shared vertical (${pv} vs. ${uv}).`), 6);
    }
  }

  // 4) Thematische Nähe: Idee der Nutzer:in vs. About/Headline/Tags (Token-Overlap mit Wortstamm)
  const ideaTokens = tokenize(user.idea ?? "");
  if (ideaTokens.size > 0) {
    const profileTokens = tokenize([profile.about ?? "", profile.headline ?? "", ...list(profile.tags)].join(" "));
    const terms = sharedTerms(ideaTokens, profileTokens);
    if (terms.length) {
      const w = Math.min(8, Math.round(2 * terms.length + 3 * (terms.length / ideaTokens.size)));
      const shown = terms.slice(0, 4).join(", ");
      add(lab("Thematische Nähe", "Thematic overlap"), tx(`Deine Idee und das Profil teilen Begriffe: ${shown}.`, `Your idea and the profile share terms: ${shown}.`), w);
    }
  }

  // 5) Gemeinsame Skills/Stärken (Konzept-Synonyme)
  const skills = skillOverlap(list(user.strengths), list(profile.skills), locale);
  if (skills.length) {
    const shown = skills.slice(0, 3).join(", ");
    add(lab("Gemeinsame Skills", "Shared skills"), tx(`Ihr teilt: ${shown}.`, `You share: ${shown}.`), Math.min(6, 2 * skills.length));
  }

  // 6) Gemeinsames Event – man kann sich tatsächlich treffen
  const profileEvents = list(profile.events);
  const sharedEvents = profileEvents.filter((e) => userEvents.includes(e));
  if (sharedEvents.length) {
    const where = sharedEvents.map(humanizeSlug).join(", ");
    add(lab("Gleiches Event", "Same event"), tx(`Ihr seid beide bei ${where} – ihr könnt euch direkt treffen.`, `You're both at ${where} – you can meet in person.`), 5);
  } else if (userEvents.length && profileEvents.length) {
    risk(tx("Kein gemeinsames Event – ein Treffen müsstet ihr separat organisieren.", "No shared event – you'd need to arrange a meeting separately."));
  }

  // 7) Datenlage
  if ((profile.about ?? "").trim().length < 40 && list(profile.skills).length < 3) {
    risk(tx("Wenig Profil-Informationen (kaum About/Skills) – Score ist unsicher.", "Sparse profile (little about/skills) – the score is uncertain."));
  }

  const raw = reasons.reduce((sum, r) => sum + r.weight, 0) - penalty;
  // Tie-Break über den deutschen Label-Schlüssel: identische Reihenfolge in DE und EN, DE wie bisher.
  const keyOf = (r: MatchReason) => labelKey.get(r.label) ?? r.label;
  return {
    profileId: profile.id,
    score: clamp(Math.round(raw)),
    reasons: reasons.sort((a, b) => b.weight - a.weight || keyOf(a).localeCompare(keyOf(b))),
    risks,
    complementarity: comp,
  };
}

/** "N berufliche Stationen im Profil." in beiden Sprachen. */
function experienceDetail(count: number, locale: MatchLocale) {
  return locale === "en" ? `${count} professional roles listed on the profile.` : `${count} berufliche Stationen im Profil.`;
}

/** Komplementaritäts-Reason mit pfadabhängigem Faktor; nennt die zwei größten Zugewinne. */
function addComplementarity(
  add: (label: string, detail: string, weight: number, key?: string) => void,
  comp: number,
  userDims: FounderDims,
  profileDims: FounderDims,
  factor: number,
  locale: MatchLocale = "de",
) {
  const w = Math.round(comp * factor);
  if (w < 2) return;
  const gains = FOUNDER_DIM_KEYS.filter((k) => userDims[k] < 10 && profileDims[k] > userDims[k])
    .sort((a, b) => profileDims[b] - userDims[b] - (profileDims[a] - userDims[a]))
    .slice(0, 2);
  const where = gains.length ? ` (${joinLabels(gains, DIM_LABELS, locale)})` : "";
  const key = "Komplementäre Stärken";
  if (locale === "en") add("Complementary strengths", `Covers ${comp}% of your weaker dimensions${where}.`, w, key);
  else add(key, `Ergänzt deine schwächeren Dimensionen zu ${comp} %${where}.`, w, key);
}

/** Reicht `options` (inkl. `locale`) unverändert an scoreMatch durch. */
export function rankCandidates(user: UserContext, profiles: Profile[], options?: MatchOptions): MatchResult[] {
  return profiles
    .map((p) => scoreMatch(user, p, options))
    .sort((a, b) => b.score - a.score || b.complementarity - a.complementarity || a.profileId.localeCompare(b.profileId));
}

/* ------------------------------------------------------------------ */
/* Erklärung & Einstufung                                              */
/* ------------------------------------------------------------------ */

export function matchTier(score: number): MatchTier {
  if (score >= 75) return "top";
  if (score >= 55) return "gut";
  if (score >= 35) return "möglich";
  return "schwach";
}

const TIER_PHRASE: Record<MatchTier, Bi> = {
  top: { de: "ein Top-Match", en: "a top match" },
  gut: { de: "ein guter Match", en: "a good match" },
  möglich: { de: "ein möglicher Match", en: "a possible match" },
  schwach: { de: "eher ein schwacher Match", en: "more of a weak match" },
};

const TIER_ADVICE: Record<MatchTier, Record<MatchLocale, (first: string) => string>> = {
  top: {
    de: (first) => `Sprich ${first} direkt an – am besten noch auf dem Event.`,
    en: (first) => `Reach out to ${first} directly – ideally right at the event.`,
  },
  gut: {
    de: () => "Ein Gespräch lohnt sich – kläre die offenen Punkte früh.",
    en: () => "A conversation is worth it – clarify the open points early.",
  },
  möglich: {
    de: () => "Eher zweite Priorität – ansprechen, wenn Zeit bleibt.",
    en: () => "Second priority – reach out if time allows.",
  },
  schwach: {
    de: () => "Für dein aktuelles Ziel wahrscheinlich nicht der richtige Kontakt.",
    en: () => "Probably not the right contact for your current goal.",
  },
};

/**
 * 2–4 Sätze: Einstufung, stärkster Grund, wichtigstes Risiko (oder zweiter Grund), Empfehlung.
 * `locale` (Default "de") steuert Rahmen- und Empfehlungssätze; Grund- und Risiko-Texte stammen aus
 * `result` – dafür also scoreMatch/rankCandidates mit derselben `locale` aufrufen.
 */
export function explainMatch(result: MatchResult, user: UserContext, profile: Profile, locale: MatchLocale = "de"): string {
  const en = locale === "en";
  const tier = matchTier(result.score);
  const first = firstName(profile.name, locale);
  const [top, second] = result.reasons;
  const idea = (user.idea ?? "").trim();
  const ideaShort = idea.length > 60 ? idea.slice(0, 57).trimEnd() + "…" : idea;
  const sentences: string[] = [
    en ? `${profile.name} is ${TIER_PHRASE[tier].en} for you (${result.score}/100).` : `${profile.name} ist für dich ${TIER_PHRASE[tier].de} (${result.score}/100).`,
  ];

  if (top) sentences.push(top.detail);
  else if (en) sentences.push(`So far there are no concrete links to your venture${idea ? ` (“${ideaShort}”)` : ""}.`);
  else sentences.push(`Konkrete Anknüpfungspunkte zu deinem Vorhaben${idea ? ` („${ideaShort}“)` : ""} fehlen bisher.`);

  if (result.risks[0]) sentences.push(en ? `Heads-up: ${result.risks[0]}` : `Achtung: ${result.risks[0]}`);
  else if (second) sentences.push(second.detail);

  sentences.push(TIER_ADVICE[tier][locale](first));
  return sentences.join(" ");
}
