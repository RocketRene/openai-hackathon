/**
 * Matching-Engine: bewertet, wie gut ein Profil zur Nutzer:in passt.
 * Deterministisch, ohne LLM – damit es ohne API-Key funktioniert und erklärbar ist.
 * Owner: siehe docs/PARALLEL-WORK.md. Signaturen (scoreMatch, rankCandidates, complementarity) sind Contract.
 *
 * Score-Modell: Jede Reason trägt `weight` Punkte bei (Budget je Pfad ≤ 100), Risiken können
 * Punkte abziehen. score = clamp(Σ weight − Abzüge). Pfad = networkRole des Profils, sofern die
 * Nutzer:in diese Rolle sucht; sonst gibt es nur die allgemeinen Signale (Vertical, Text, Skills, Event).
 */
import {
  FOUNDER_DIM_KEYS,
  FOUNDER_DIM_LABELS,
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

export interface MatchOptions {
  /** Event-Slugs, bei denen die Nutzer:in selbst ist (UserContext hat kein Event-Feld). */
  userEvents?: string[];
}

export const DEFAULT_USER_EVENTS: string[] = ["idealab-2026"];

export type MatchTier = "top" | "gut" | "möglich" | "schwach";

export const MATCH_TIER_LABELS: Record<MatchTier, string> = {
  top: "Top-Match",
  gut: "Guter Match",
  möglich: "Möglicher Match",
  schwach: "Schwacher Match",
};

/* ------------------------------------------------------------------ */
/* Labels & Konstanten                                                 */
/* ------------------------------------------------------------------ */

const NETWORK_ROLE_LABELS: Record<NetworkRole, string> = {
  cofounder: "Co-Founder",
  investor: "Investor:in",
  mentor: "Mentor:in",
  talent: "Talent",
  expert: "Expert:in",
};

const FOUNDER_ROLE_LABELS: Record<FounderRole, string> = {
  tech: "Tech",
  commercial: "Commercial",
  product: "Produkt",
  design: "Design",
  operations: "Operations",
  "domain-expert": "Domain-Expert:in",
};

const STAGE_ORDER: Stage[] = ["idea", "pre-seed", "seed", "series-a", "growth"];

const STAGE_LABELS: Record<Stage, string> = {
  idea: "Idee",
  "pre-seed": "Pre-Seed",
  seed: "Seed",
  "series-a": "Series A",
  growth: "Growth",
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

/** Skill-Konzepte: fasst Synonyme zusammen, damit "AI/LLM" und "Machine Learning" als Überschneidung zählen. */
const SKILL_CONCEPTS: { label: string; phrases: string[] }[] = [
  { label: "AI/ML", phrases: ["ai", "ki", "ml", "llm", "llms", "genai", "machine learning", "deep learning", "artificial intelligence", "künstliche intelligenz", "generative ai", "nlp", "data science", "computer vision"] },
  { label: "Backend", phrases: ["backend", "back end", "api", "apis", "node", "python", "java", "rust", "databases", "sql", "postgres", "server", "software engineering", "software development", "softwareentwicklung"] },
  { label: "Frontend", phrases: ["frontend", "front end", "react", "next js", "vue", "angular", "typescript", "javascript", "web development", "webentwicklung"] },
  { label: "Mobile", phrases: ["mobile", "ios", "android", "flutter", "react native", "swift", "kotlin"] },
  { label: "Cloud/DevOps", phrases: ["cloud", "aws", "azure", "gcp", "devops", "kubernetes", "docker", "infrastructure"] },
  { label: "Data/Analytics", phrases: ["data", "analytics", "data analysis", "tableau", "power bi", "statistics", "statistik", "excel"] },
  { label: "Prototyping/MVP", phrases: ["prototyping", "prototype", "prototypen", "mvp", "rapid prototyping", "no code", "low code", "hackathon"] },
  { label: "Produkt", phrases: ["product", "product management", "produktmanagement", "product owner", "roadmap", "user research", "agile", "scrum"] },
  { label: "Design/UX", phrases: ["design", "ux", "ui", "figma", "user experience", "product design", "branding", "visual design"] },
  { label: "Sales/BizDev", phrases: ["sales", "vertrieb", "business development", "bizdev", "b2b sales", "account management", "key account", "partnerships", "negotiation", "verhandlung"] },
  { label: "Marketing/Growth", phrases: ["marketing", "growth", "seo", "content", "social media", "performance marketing", "brand", "go to market", "gtm"] },
  { label: "Finance/Fundraising", phrases: ["finance", "finanzen", "fundraising", "venture capital", "vc", "investment", "investments", "controlling", "accounting", "financial modeling", "private equity", "due diligence"] },
  { label: "Operations", phrases: ["operations", "ops", "supply chain", "logistics", "logistik", "prozesse", "process management", "project management", "projektmanagement"] },
  { label: "Leadership", phrases: ["leadership", "führung", "team building", "management", "hiring", "recruiting"] },
  { label: "Strategie/Consulting", phrases: ["strategy", "strategie", "consulting", "beratung", "business strategy", "corporate strategy"] },
  { label: "Legal/Compliance", phrases: ["legal", "recht", "law", "compliance", "regulatory", "datenschutz", "gdpr"] },
  { label: "Hardware/Robotics", phrases: ["hardware", "robotics", "robotik", "embedded", "iot", "mechanical engineering", "maschinenbau", "electronics"] },
  { label: "Umsetzungsstärke", phrases: ["execution", "umsetzung", "schnelle umsetzung", "delivery", "shipping", "hands on", "getting things done"] },
  { label: "Kommunikation", phrases: ["communication", "kommunikation", "public speaking", "pitching", "storytelling", "presentation"] },
  { label: "Research/Science", phrases: ["research", "forschung", "science", "phd", "biotech", "chemistry", "physics", "medicine", "medizin"] },
];

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

function firstName(name: string) {
  return (name ?? "").trim().split(/\s+/)[0] || name || "Diese Person";
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

function joinLabels<K extends string>(keys: K[], labels: Record<K, string>) {
  return keys.map((k) => labels[k] ?? k).join(", ");
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

/** Welche Skill-Konzepte kommen in einer Liste von Skills/Stärken vor? */
function conceptsOf(items: string[]): Set<string> {
  const padded = items.map(padWords);
  const found = new Set<string>();
  for (const c of SKILL_CONCEPTS) {
    if (c.phrases.some((p) => padded.some((s) => s.includes(" " + p + " ")))) found.add(c.label);
  }
  return found;
}

/** Gemeinsame Skills/Stärken als lesbare Labels (Konzepte zuerst, dann rohe Wörter). */
function skillOverlap(strengths: string[], skills: string[]): string[] {
  if (!strengths.length || !skills.length) return [];
  const a = conceptsOf(strengths);
  const b = conceptsOf(skills);
  const labels = Array.from(a).filter((c) => b.has(c));
  const coveredWords = new Set(
    SKILL_CONCEPTS.filter((c) => labels.includes(c.label)).flatMap((c) => c.phrases.flatMap((p) => p.split(" "))),
  );
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
  const reasons: MatchReason[] = [];
  const risks: string[] = [];
  let penalty = 0;
  const add = (label: string, detail: string, weight: number) => {
    const w = Math.round(weight);
    if (w > 0) reasons.push({ label, detail, weight: w });
  };
  const risk = (text: string, minus = 0) => {
    risks.push(text);
    penalty += minus;
  };

  // Eingaben normalisieren (API-Bodies können unvollständig sein).
  const first = firstName(profile.name);
  const lookingFor = list<NetworkRole>(user.lookingFor);
  const lookingForRoles = list<FounderRole>(user.lookingForRoles);
  const userVerticals = list(user.verticals).map(norm);
  const profileVerticals = list(profile.verticals).map(norm);
  const profileLookingFor = list(profile.lookingFor).map(norm);
  const userDims = user.dims ?? NEUTRAL_DIMS;
  const profileDims = profile.dims ?? NEUTRAL_DIMS;
  const userEvents = options?.userEvents ?? DEFAULT_USER_EVENTS;
  const role = profile.networkRole;
  const roleLabel = NETWORK_ROLE_LABELS[role] ?? role;
  const titles = experienceTitles(profile);
  const comp = complementarity(userDims, profileDims);

  // 1) Sucht die Nutzer:in diese Art von Kontakt? (Gate für die rollenspezifischen Signale)
  const wanted = lookingFor.includes(role);
  const related = !wanted && isMentorLike(role) && lookingFor.some(isMentorLike);
  if (wanted) {
    add("Gesuchte Rolle", `${first} ist ${roleLabel} – genau die Art Kontakt, die du suchst.`, 20);
  } else if (related) {
    add("Gesuchte Rolle", `${first} ist ${roleLabel} – nah an dem, was du suchst (${joinLabels(lookingFor.filter(isMentorLike), NETWORK_ROLE_LABELS)}).`, 12);
  } else {
    risk(`Ist ${roleLabel}, du suchst aktuell ${joinLabels(lookingFor, NETWORK_ROLE_LABELS) || "noch nichts Konkretes"}.`, 5);
  }
  const path: NetworkRole | null = wanted || related ? role : null;

  // 2) Rollenspezifischer Fit
  if (path === "cofounder") {
    const fr = profile.founderRole;
    if (fr && lookingForRoles.includes(fr)) {
      add("Fehlende Team-Rolle", `Deckt die Rolle ${FOUNDER_ROLE_LABELS[fr]} ab, die dir im Team fehlt.`, 20);
    } else if (fr && fr === user.founderRole) {
      risk(`Gleiche Rolle wie du (${FOUNDER_ROLE_LABELS[fr]}) – Überschneidung statt Ergänzung.`, 10);
    } else if (fr) {
      const mine = user.founderRole ? FOUNDER_ROLE_LABELS[user.founderRole] : "dir";
      if (lookingForRoles.length) {
        add("Andere Perspektive", `Nicht deine gesuchte Rolle (${joinLabels(lookingForRoles, FOUNDER_ROLE_LABELS)}), aber als ${FOUNDER_ROLE_LABELS[fr]} eine Ergänzung zu ${mine}.`, 6);
      } else {
        add("Andere Perspektive", `Bringt als ${FOUNDER_ROLE_LABELS[fr]} eine andere Perspektive als ${mine} ein.`, 10);
      }
    } else {
      risk("Team-Rolle im Profil unklar – im Gespräch klären.");
    }

    addComplementarity(add, comp, userDims, profileDims, 0.12);
    // Nur warnen, wenn auch die Rolle keine Lücke füllt – sonst widerspricht das dem Top-Match.
    const fillsGap = !!fr && lookingForRoles.includes(fr);
    if (comp < 25 && !fillsGap) risk("Ähnliches Stärkenprofil wie du – wenig Ergänzung bei den Dimensionen.");

    // Sucht das Profil umgekehrt jemanden wie die Nutzer:in?
    const words = user.founderRole ? ROLE_WORDS[user.founderRole] : [];
    if (profileLookingFor.some((lf) => words.some((w) => lf.includes(w)))) {
      add("Sucht jemanden wie dich", `Sucht: ${profileLookingFor.join(", ")}.`, 8);
    } else if (profileLookingFor.some((lf) => /co-?founder|mitgründer/.test(lf))) {
      add("Sucht Co-Founder", `Sucht Mitgründer:innen, Rolle offen (${profileLookingFor.join(", ")}).`, 4);
    }

    // Phase
    const d = Math.abs(stageIndex(user.stage) - stageIndex(profile.stage));
    if (user.stage && profile.stage) {
      if (d === 0) add("Gleiche Phase", `Beide in Phase ${STAGE_LABELS[profile.stage]}.`, 4);
      else if (d === 1) add("Ähnliche Phase", `Phasen liegen nah beieinander (${STAGE_LABELS[profile.stage]} vs. ${STAGE_LABELS[user.stage]}).`, 2);
    }

    // Eigene Idee im Gepäck?
    const seeksTeam = profileLookingFor.some((lf) => /co-?founder|mitgründer/.test(lf));
    if (seeksTeam && stageIndex(profile.stage) <= 1 && !user.openToIdeas) {
      risk("Sucht selbst noch ein Team für die eigene Idee – ihr müsstet euch auf eine Idee einigen.", 4);
    }

    if (titles.length >= 3) add("Erfahrung", `${titles.length} berufliche Stationen im Profil.`, 2);
  } else if (path === "investor") {
    const us = user.stage;
    const ps = profile.stage;
    if (!us || !ps) {
      add("Phase offen", "Investitionsphase ist nicht hinterlegt – kein Ausschlusskriterium.", 8);
    } else {
      const d = stageIndex(ps) - stageIndex(us); // > 0: investiert später, als du bist
      if (d === 0) add("Passende Phase", `Investiert in ${STAGE_LABELS[ps]} – genau deine Phase.`, 20);
      else if (Math.abs(d) === 1) add("Passende Phase", `Investiert in ${STAGE_LABELS[ps]}, du bist bei ${STAGE_LABELS[us]} – nah genug für ein erstes Gespräch.`, 14);
      else if (d > 0) risk(`Investiert erst ab ${STAGE_LABELS[ps]} – du bist bei ${STAGE_LABELS[us]}, also wahrscheinlich zu früh.`, d >= 3 ? 10 : 6);
      else risk(`Investiert in ${STAGE_LABELS[ps]}, du bist schon bei ${STAGE_LABELS[us]} – passt nicht zur Ticketgröße.`, -d >= 3 ? 10 : 6);
    }

    addComplementarity(add, comp, userDims, profileDims, 0.04);

    if (profileLookingFor.some((lf) => /invest|dealflow|deal flow|startups/.test(lf))) {
      add("Sucht Dealflow", `Ist aktiv auf der Suche nach Startups (${profileLookingFor.join(", ")}).`, 8);
    }

    const investTitles = titles.filter((t) => INVEST_TITLE_RE.test(t));
    if (investTitles.length) add("Investment-Erfahrung", `Investment-Hintergrund im Lebenslauf (${investTitles.slice(0, 2).join(", ")}).`, 6);
    else if (titles.length >= 4) add("Erfahrung", `${titles.length} berufliche Stationen im Profil.`, 3);
  } else if (path === "mentor" || path === "expert") {
    const founderTitles = titles.filter((t) => FOUNDER_TITLE_RE.test(t));
    const leadTitles = titles.filter((t) => LEAD_TITLE_RE.test(t));
    if (founderTitles.length) {
      add("Gründungserfahrung", `Hat selbst gegründet oder geführt (${founderTitles.slice(0, 2).join(", ")}) – weiß, wo du stehst.`, 12);
    } else if (leadTitles.length) {
      add("Führungserfahrung", `Führungserfahrung (${leadTitles[0]}) – kann auf Augenhöhe Feedback geben.`, 8);
    } else {
      risk("Keine erkennbare Gründungs- oder Führungserfahrung im Lebenslauf.");
    }

    const covered = FOUNDER_DIM_KEYS.filter((k) => userDims[k] <= 5 && profileDims[k] >= 7);
    if (covered.length) {
      add("Deckt deine Lücken", `Stark in ${joinLabels(covered, FOUNDER_DIM_LABELS)} – da schätzt du dich selbst schwächer ein.`, 8);
    }

    addComplementarity(add, comp, userDims, profileDims, 0.1);

    if (profileLookingFor.some((lf) => /mentee|advisor|beirat|mentoring/.test(lf))) {
      add("Bietet Mentoring an", `Sucht aktiv Mentees bzw. eine Advisor-Rolle (${profileLookingFor.join(", ")}).`, 8);
    }

    if (titles.length >= 4) add("Erfahrung", `${titles.length} berufliche Stationen im Profil.`, 4);
  } else if (path === "talent") {
    const fr = profile.founderRole;
    const jobRoles = jobRolesOf(profileLookingFor);
    const hit = fr && lookingForRoles.includes(fr) ? fr : jobRoles.find((r) => lookingForRoles.includes(r));
    const sameArea = !!user.founderRole && (fr === user.founderRole || jobRoles.includes(user.founderRole));
    if (hit) {
      add("Passende Position", `Als ${FOUNDER_ROLE_LABELS[hit]} passt ${first} auf eine Rolle, die du besetzen willst.`, 20);
    } else if (sameArea && user.founderRole) {
      add("Verstärkt deinen Bereich", `Würde deinen Bereich (${FOUNDER_ROLE_LABELS[user.founderRole]}) verstärken – eine typische erste Einstellung.`, 12);
    } else if (fr && lookingForRoles.length) {
      risk(`Rolle (${FOUNDER_ROLE_LABELS[fr]}) passt nicht zu deinen offenen Positionen (${joinLabels(lookingForRoles, FOUNDER_ROLE_LABELS)}).`);
    }

    addComplementarity(add, comp, userDims, profileDims, 0.08);

    if (profileLookingFor.some((lf) => /job|stelle|position|hire/.test(lf))) {
      add("Sucht einen Job", `Ist offen für eine Stelle (${profileLookingFor.join(", ")}).`, 8);
    }

    if (titles.length >= 4) add("Erfahrung", `${titles.length} berufliche Stationen im Profil.`, 6);
    else if (titles.length >= 2) add("Erfahrung", `${titles.length} berufliche Stationen im Profil.`, 3);
  }

  // 3) Vertical – für Investor:innen (Thesen-Fokus) stärker gewichtet
  const sharedVerticals = profileVerticals.filter((v) => userVerticals.includes(v));
  const investorPath = path === "investor";
  if (sharedVerticals.length > 0) {
    const w = investorPath ? (sharedVerticals.length > 1 ? 23 : 14) : sharedVerticals.length > 1 ? 15 : 10;
    add(
      "Gleiches Vertical",
      investorPath ? `Investiert in dein Vertical (${sharedVerticals.join(", ")}).` : `Gemeinsam: ${sharedVerticals.join(", ")}.`,
      w,
    );
  } else if (userVerticals.length && profileVerticals.length) {
    if (investorPath) {
      risk(`Investiert in ${profileVerticals.join(", ")}, nicht in dein Vertical (${userVerticals.join(", ")}).`, 8);
    } else if (!user.openToIdeas) {
      risk(`Kein gemeinsames Vertical (${profileVerticals.join(", ")} vs. ${userVerticals.join(", ")}).`, 6);
    }
  }

  // 4) Thematische Nähe: Idee der Nutzer:in vs. About/Headline/Tags (Token-Overlap mit Wortstamm)
  const ideaTokens = tokenize(user.idea ?? "");
  if (ideaTokens.size > 0) {
    const profileTokens = tokenize([profile.about ?? "", profile.headline ?? "", ...list(profile.tags)].join(" "));
    const terms = sharedTerms(ideaTokens, profileTokens);
    if (terms.length) {
      const w = Math.min(8, Math.round(2 * terms.length + 3 * (terms.length / ideaTokens.size)));
      add("Thematische Nähe", `Deine Idee und das Profil teilen Begriffe: ${terms.slice(0, 4).join(", ")}.`, w);
    }
  }

  // 5) Gemeinsame Skills/Stärken (Konzept-Synonyme)
  const skills = skillOverlap(list(user.strengths), list(profile.skills));
  if (skills.length) {
    add("Gemeinsame Skills", `Ihr teilt: ${skills.slice(0, 3).join(", ")}.`, Math.min(6, 2 * skills.length));
  }

  // 6) Gemeinsames Event – man kann sich tatsächlich treffen
  const profileEvents = list(profile.events);
  const sharedEvents = profileEvents.filter((e) => userEvents.includes(e));
  if (sharedEvents.length) {
    add("Gleiches Event", `Ihr seid beide bei ${sharedEvents.map(humanizeSlug).join(", ")} – ihr könnt euch direkt treffen.`, 5);
  } else if (userEvents.length && profileEvents.length) {
    risk("Kein gemeinsames Event – ein Treffen müsstet ihr separat organisieren.");
  }

  // 7) Datenlage
  if ((profile.about ?? "").trim().length < 40 && list(profile.skills).length < 3) {
    risk("Wenig Profil-Informationen (kaum About/Skills) – Score ist unsicher.");
  }

  const raw = reasons.reduce((sum, r) => sum + r.weight, 0) - penalty;
  return {
    profileId: profile.id,
    score: clamp(Math.round(raw)),
    reasons: reasons.sort((a, b) => b.weight - a.weight || a.label.localeCompare(b.label)),
    risks,
    complementarity: comp,
  };
}

/** Komplementaritäts-Reason mit pfadabhängigem Faktor; nennt die zwei größten Zugewinne. */
function addComplementarity(
  add: (label: string, detail: string, weight: number) => void,
  comp: number,
  userDims: FounderDims,
  profileDims: FounderDims,
  factor: number,
) {
  const w = Math.round(comp * factor);
  if (w < 2) return;
  const gains = FOUNDER_DIM_KEYS.filter((k) => userDims[k] < 10 && profileDims[k] > userDims[k])
    .sort((a, b) => profileDims[b] - userDims[b] - (profileDims[a] - userDims[a]))
    .slice(0, 2);
  const where = gains.length ? ` (${joinLabels(gains, FOUNDER_DIM_LABELS)})` : "";
  add("Komplementäre Stärken", `Ergänzt deine schwächeren Dimensionen zu ${comp} %${where}.`, w);
}

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

const TIER_PHRASE: Record<MatchTier, string> = {
  top: "ein Top-Match",
  gut: "ein guter Match",
  möglich: "ein möglicher Match",
  schwach: "eher ein schwacher Match",
};

const TIER_ADVICE: Record<MatchTier, (first: string) => string> = {
  top: (first) => `Sprich ${first} direkt an – am besten noch auf dem Event.`,
  gut: () => "Ein Gespräch lohnt sich – kläre die offenen Punkte früh.",
  möglich: () => "Eher zweite Priorität – ansprechen, wenn Zeit bleibt.",
  schwach: () => "Für dein aktuelles Ziel wahrscheinlich nicht der richtige Kontakt.",
};

/** 2–4 deutsche Sätze: Einstufung, stärkster Grund, wichtigstes Risiko (oder zweiter Grund), Empfehlung. */
export function explainMatch(result: MatchResult, user: UserContext, profile: Profile): string {
  const tier = matchTier(result.score);
  const first = firstName(profile.name);
  const [top, second] = result.reasons;
  const idea = (user.idea ?? "").trim();
  const sentences: string[] = [`${profile.name} ist für dich ${TIER_PHRASE[tier]} (${result.score}/100).`];

  if (top) sentences.push(top.detail);
  else sentences.push(`Konkrete Anknüpfungspunkte zu deinem Vorhaben${idea ? ` („${idea.length > 60 ? idea.slice(0, 57).trimEnd() + "…" : idea}“)` : ""} fehlen bisher.`);

  if (result.risks[0]) sentences.push(`Achtung: ${result.risks[0]}`);
  else if (second) sentences.push(second.detail);

  sentences.push(TIER_ADVICE[tier](first));
  return sentences.join(" ");
}
