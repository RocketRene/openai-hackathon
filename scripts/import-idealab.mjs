#!/usr/bin/env node
/**
 * import-idealab.mjs
 * ---------------------------------------------------------------
 * Normalisiert den IdeaLab!-2026-Export (exports/all-enriched-profiles.json, inkl. LinkedIn-
 * Anreicherung) in das `Profile`-Format aus src/lib/types.ts und schreibt
 * src/data/profiles/imported.json (Array<Profile>, ein Profil pro Zeile).
 *
 * Aufruf:  node scripts/import-idealab.mjs
 * Nur Node-Builtins, deterministisch (gleiche Quelle → identische Ausgabe), alle Heuristiken
 * sind hardcodiert. Es wird bewusst KEIN `source.raw` geschrieben (Dateigröße).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = resolve(ROOT, "exports/all-enriched-profiles.json");
const TARGET = resolve(ROOT, "src/data/profiles/imported.json");

const EVENT_SLUG = "idealab-2026";
const DEFAULT_LOCATION = "Vallendar, Deutschland";
const MAX_ABOUT = 800;
const MAX_HEADLINE = 200;
const MAX_DESCRIPTION = 240;
const MAX_SKILLS = 20;
const MAX_POSITIONS = 12;
const MAX_EDUCATION = 8;
const MAX_VERTICALS = 4;
const MAX_LOOKING_FOR = 4;

/* ------------------------------------------------------------------ */
/* Kleine Helfer                                                       */
/* ------------------------------------------------------------------ */

const clean = (value) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");

const cleanMultiline = (value) =>
  typeof value === "string"
    ? value
        .replace(/\r\n?/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    : "";

function truncate(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  const base = space > max * 0.6 ? cut.slice(0, space) : cut;
  return `${base.replace(/[\s,;:–-]+$/, "")}…`;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** FNV-1a (32 Bit) – deterministischer Jitter ohne Zufall. */
function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const jitter = (seed, spread) => (hash(seed) % (2 * spread + 1)) - spread;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

function joinDe(items) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} und ${items[items.length - 1]}`;
}

/* ------------------------------------------------------------------ */
/* Vokabular / Tabellen                                                */
/* ------------------------------------------------------------------ */

const ROLE_LABELS = {
  student: "Student:in",
  professional: "Professional",
  sponsor: "Sponsor",
  speaker: "Speaker",
  cvc: "Corporate VC",
  startup: "Gründer:in",
  angel: "Angel Investor:in",
};

const DEGREE_LABELS = {
  bachelor: "Bachelor",
  master: "Master",
  mba: "MBA",
  phd: "PhD",
  doctorate: "Promotion",
  doctoral: "Promotion",
  diploma: "Diplom",
  state_exam: "Staatsexamen",
};

const FIELD_LABELS = { business: "Wirtschaft & Management", stem: "MINT" };
const FIELD_STUDY_TEXT = { business: "Wirtschaft", stem: "ein MINT-Fach" };

const EXPERIENCE_TEXT = {
  "1_year": "ein Jahr Berufserfahrung",
  "2_years": "zwei Jahre Berufserfahrung",
  "3_plus_years": "mehr als drei Jahre Berufserfahrung",
};

const STAGE_TEXT = { "pre-seed": "Pre-Seed", seed: "Seed", idea: "Ideen" };

const COUNTRY_DE = {
  Germany: "Deutschland",
  Deutschland: "Deutschland",
  Netherlands: "Niederlande",
  "The Netherlands": "Niederlande",
  Switzerland: "Schweiz",
  Austria: "Österreich",
  "United Kingdom": "Vereinigtes Königreich",
  "United States": "USA",
  France: "Frankreich",
  Italy: "Italien",
  Spain: "Spanien",
  Belgium: "Belgien",
  Denmark: "Dänemark",
  Sweden: "Schweden",
  Norway: "Norwegen",
  Finland: "Finnland",
  Poland: "Polen",
  "Czech Republic": "Tschechien",
  Czechia: "Tschechien",
  Luxembourg: "Luxemburg",
  Ireland: "Irland",
  Turkey: "Türkei",
  Türkiye: "Türkei",
  Greece: "Griechenland",
  Hungary: "Ungarn",
  India: "Indien",
  China: "China",
  "United Arab Emirates": "VAE",
};

/** Englische Städtenamen aus LinkedIn-Geo → deutsche Schreibweise. */
const CITY_DE = {
  Cologne: "Köln",
  Munich: "München",
  Nuremberg: "Nürnberg",
  Hanover: "Hannover",
  Brunswick: "Braunschweig",
  Vienna: "Wien",
  Zurich: "Zürich",
  Geneva: "Genf",
  Basel: "Basel",
  Brussels: "Brüssel",
  Copenhagen: "Kopenhagen",
  Milan: "Mailand",
  Lisbon: "Lissabon",
  Warsaw: "Warschau",
  Prague: "Prag",
  Frankfurt: "Frankfurt am Main",
  "Frankfurt Rhine-Main Metropolitan Area": "Frankfurt am Main, Deutschland",
  "Berlin Metropolitan Area": "Berlin, Deutschland",
  "Munich Metropolitan Area": "München, Deutschland",
  "Hamburg Metropolitan Area": "Hamburg, Deutschland",
  "Cologne Bonn Region": "Köln/Bonn, Deutschland",
  "Greater Munich Metropolitan Area": "München, Deutschland",
  "Greater Hamburg Area": "Hamburg, Deutschland",
  "Stuttgart Region": "Stuttgart, Deutschland",
  "Düsseldorf Region": "Düsseldorf, Deutschland",
};

/** Bekannte Hochschulen → Stadt (für Teilnehmer:innen ohne LinkedIn-Geo). */
const UNIVERSITY_CITY = [
  ["whu", "Vallendar, Deutschland"],
  ["vallendar", "Vallendar, Deutschland"],
  ["koblenz", "Koblenz, Deutschland"],
  ["mannheim", "Mannheim, Deutschland"],
  ["erasmus", "Rotterdam, Niederlande"],
  ["rotterdam", "Rotterdam, Niederlande"],
  ["maastricht", "Maastricht, Niederlande"],
  ["amsterdam", "Amsterdam, Niederlande"],
  ["tilburg", "Tilburg, Niederlande"],
  ["groningen", "Groningen, Niederlande"],
  ["utrecht", "Utrecht, Niederlande"],
  ["delft", "Delft, Niederlande"],
  ["eindhoven", "Eindhoven, Niederlande"],
  ["aachen", "Aachen, Deutschland"],
  ["bucerius", "Hamburg, Deutschland"],
  ["hamburg", "Hamburg, Deutschland"],
  ["münster", "Münster, Deutschland"],
  ["muenster", "Münster, Deutschland"],
  ["münchen", "München, Deutschland"],
  ["munich", "München, Deutschland"],
  ["berlin", "Berlin, Deutschland"],
  ["frankfurt", "Frankfurt am Main, Deutschland"],
  ["köln", "Köln, Deutschland"],
  ["cologne", "Köln, Deutschland"],
  ["düsseldorf", "Düsseldorf, Deutschland"],
  ["bonn", "Bonn, Deutschland"],
  ["duisburg", "Duisburg, Deutschland"],
  ["bochum", "Bochum, Deutschland"],
  ["dortmund", "Dortmund, Deutschland"],
  ["hannover", "Hannover, Deutschland"],
  ["leipzig", "Leipzig, Deutschland"],
  ["dresden", "Dresden, Deutschland"],
  ["heidelberg", "Heidelberg, Deutschland"],
  ["karlsruhe", "Karlsruhe, Deutschland"],
  ["stuttgart", "Stuttgart, Deutschland"],
  ["hohenheim", "Stuttgart, Deutschland"],
  ["tübingen", "Tübingen, Deutschland"],
  ["freiburg", "Freiburg, Deutschland"],
  ["konstanz", "Konstanz, Deutschland"],
  ["darmstadt", "Darmstadt, Deutschland"],
  ["mainz", "Mainz, Deutschland"],
  ["trier", "Trier, Deutschland"],
  ["saarland", "Saarbrücken, Deutschland"],
  ["göttingen", "Göttingen, Deutschland"],
  ["bremen", "Bremen, Deutschland"],
  ["kiel", "Kiel, Deutschland"],
  ["potsdam", "Potsdam, Deutschland"],
  ["passau", "Passau, Deutschland"],
  ["regensburg", "Regensburg, Deutschland"],
  ["bayreuth", "Bayreuth, Deutschland"],
  ["nürnberg", "Nürnberg, Deutschland"],
  ["erlangen", "Erlangen, Deutschland"],
  ["augsburg", "Augsburg, Deutschland"],
  ["ingolstadt", "Ingolstadt, Deutschland"],
  ["reutlingen", "Reutlingen, Deutschland"],
  ["st. gallen", "St. Gallen, Schweiz"],
  ["st.gallen", "St. Gallen, Schweiz"],
  ["zürich", "Zürich, Schweiz"],
  ["zurich", "Zürich, Schweiz"],
  ["wien", "Wien, Österreich"],
  ["vienna", "Wien, Österreich"],
  ["innsbruck", "Innsbruck, Österreich"],
  ["graz", "Graz, Österreich"],
  ["london", "London, Vereinigtes Königreich"],
  ["oxford", "Oxford, Vereinigtes Königreich"],
  ["cambridge", "Cambridge, Vereinigtes Königreich"],
  ["paris", "Paris, Frankreich"],
  ["copenhagen", "Kopenhagen, Dänemark"],
  ["stockholm", "Stockholm, Schweden"],
  ["barcelona", "Barcelona, Spanien"],
  ["madrid", "Madrid, Spanien"],
  ["bocconi", "Mailand, Italien"],
  ["milan", "Mailand, Italien"],
  ["lisbon", "Lissabon, Portugal"],
  ["lisboa", "Lissabon, Portugal"],
  ["dublin", "Dublin, Irland"],
  ["warsaw", "Warschau, Polen"],
  ["prague", "Prag, Tschechien"],
  ["luxembourg", "Luxemburg, Luxemburg"],
];

const LANGUAGE_DE = {
  English: "Englisch",
  German: "Deutsch",
  French: "Französisch",
  Spanish: "Spanisch",
  Dutch: "Niederländisch",
  Italian: "Italienisch",
  Portuguese: "Portugiesisch",
  Russian: "Russisch",
  Turkish: "Türkisch",
  Arabic: "Arabisch",
  Chinese: "Chinesisch",
  "Chinese (Simplified)": "Chinesisch",
  Mandarin: "Mandarin",
  Japanese: "Japanisch",
  Korean: "Koreanisch",
  Polish: "Polnisch",
  Swedish: "Schwedisch",
  Danish: "Dänisch",
  Norwegian: "Norwegisch",
  Finnish: "Finnisch",
  Greek: "Griechisch",
  Hebrew: "Hebräisch",
  Persian: "Persisch",
  Farsi: "Persisch",
  Ukrainian: "Ukrainisch",
  Romanian: "Rumänisch",
  Czech: "Tschechisch",
  Hungarian: "Ungarisch",
  Latin: "Latein",
  Vietnamese: "Vietnamesisch",
  Croatian: "Kroatisch",
  Serbian: "Serbisch",
  Bulgarian: "Bulgarisch",
  Hindi: "Hindi",
  Urdu: "Urdu",
  Luxembourgish: "Luxemburgisch",
  Afrikaans: "Afrikaans",
  Indonesian: "Indonesisch",
  Thai: "Thailändisch",
  Catalan: "Katalanisch",
  Albanian: "Albanisch",
  Bosnian: "Bosnisch",
  Slovak: "Slowakisch",
  Slovenian: "Slowenisch",
  Lithuanian: "Litauisch",
  Latvian: "Lettisch",
  Estonian: "Estnisch",
};

/** Interest-Slug → lesbares (deutsches) Label für generierte Texte. */
const INTEREST_LABELS = {
  "artificial-intelligence": "Künstliche Intelligenz",
  "venture-capital": "Venture Capital",
  fundraising: "Fundraising",
  leadership: "Leadership",
  "go-to-market": "Go-to-Market",
  "m-and-a-strategy": "M&A-Strategie",
  "scaling-up": "Skalierung",
  "student-founders": "studentische Gründungen",
  "angel-investing": "Angel Investing",
  "venture-building": "Venture Building",
  "generative-ai": "Generative KI",
  "product-market-fit": "Product-Market-Fit",
  fintech: "Fintech",
  "machine-learning": "Machine Learning",
  healthtech: "Healthtech",
  "seed-funding": "Seed-Finanzierung",
  bootstrapping: "Bootstrapping",
  "corporate-innovation": "Corporate Innovation",
  "business-model-design": "Geschäftsmodell-Design",
  "financial-modeling": "Financial Modeling",
  "co-founder-matching": "Co-Founder-Suche",
  "marketing-strategy": "Marketingstrategie",
  "product-management": "Produktmanagement",
  "strategic-partnerships": "strategische Partnerschaften",
  robotics: "Robotik",
  "lean-startup": "Lean Startup",
  "sales-growth": "Vertrieb & Wachstum",
  "due-diligence": "Due Diligence",
  "people-management": "Personalführung",
  "social-entrepreneurship": "Social Entrepreneurship",
  "software-engineering": "Software Engineering",
  "pitch-coaching": "Pitch-Coaching",
  "personal-branding": "Personal Branding",
  "data-science": "Data Science",
  "exit-strategy": "Exit-Strategien",
  "digital-transformation": "digitale Transformation",
  "growth-hacking": "Growth Hacking",
  "defense-and-security": "Defense & Security",
  mentorship: "Mentoring",
  "energy-transition": "Energiewende",
  "corporate-venture": "Corporate Venture",
  "hiring-and-talent": "Recruiting & Talent",
  "low-code-no-code": "Low-Code/No-Code",
  "serial-entrepreneurship": "Serial Entrepreneurship",
  "public-speaking": "Public Speaking",
  saas: "SaaS",
  "digital-health": "Digital Health",
  "circular-economy": "Kreislaufwirtschaft",
  "climate-action": "Klimaschutz",
  "creative-industries": "Kreativwirtschaft",
  "women-in-tech": "Women in Tech",
  cybersecurity: "Cybersecurity",
  "api-economy": "API Economy",
  intrapreneurship: "Intrapreneurship",
  "open-innovation": "Open Innovation",
  edtech: "Edtech",
  "quantum-computing": "Quantencomputing",
  foodtech: "Foodtech",
  mobilitytech: "Mobility Tech",
  "smart-cities": "Smart Cities",
  cleantech: "Cleantech",
  "open-source": "Open Source",
  spacetech: "Spacetech",
  "impact-investing": "Impact Investing",
  biotech: "Biotech",
  "esg-investing": "ESG Investing",
  "future-of-mobility": "die Zukunft der Mobilität",
  blockchain: "Blockchain",
  proptech: "Proptech",
  "cloud-computing": "Cloud Computing",
  iot: "IoT",
  "marketplace-models": "Marktplatz-Modelle",
  "unit-economics": "Unit Economics",
  "virtual-reality": "Virtual Reality",
  "climate-finance": "Climate Finance",
  "career-transitions": "Karrierewechsel",
  "water-and-oceans": "Wasser & Ozeane",
  web3: "Web3",
  "sustainable-fashion": "nachhaltige Mode",
  govtech: "Govtech",
  agritech: "Agritech",
  legaltech: "Legaltech",
  "diversity-and-inclusion": "Diversity & Inclusion",
  "carbon-markets": "CO₂-Märkte",
  freelancing: "Freelancing",
  "social-enterprise": "Sozialunternehmen",
  "augmented-reality": "Augmented Reality",
  "spatial-computing": "Spatial Computing",
  crowdfunding: "Crowdfunding",
  entrepreneurship: "Entrepreneurship",
  "remote-work": "Remote Work",
  "b2b-saas": "B2B SaaS",
  "climate-tech": "Climate Tech",
  sustainability: "Nachhaltigkeit",
  "career-development": "Karriereentwicklung",
  consulting: "Consulting",
  engineering: "Engineering",
  "data-engineering": "Data Engineering",
  logistics: "Logistik",
  "e-commerce": "E-Commerce",
  marketplaces: "Marktplätze",
  operations: "Operations",
  hardware: "Hardware",
};

function interestLabel(slug) {
  if (INTEREST_LABELS[slug]) return INTEREST_LABELS[slug];
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Interest-Slug → Vertical aus dem Vokabular in docs/PARALLEL-WORK.md. */
const VERTICAL_BY_INTEREST = {
  fintech: "fintech",
  blockchain: "fintech",
  web3: "fintech",
  crowdfunding: "fintech",
  healthtech: "healthtech",
  "digital-health": "healthtech",
  biotech: "biotech",
  "artificial-intelligence": "ai",
  "machine-learning": "ai",
  "generative-ai": "ai",
  "data-science": "ai",
  robotics: "robotics",
  hardware: "robotics",
  "defense-and-security": "defense",
  cybersecurity: "defense",
  "energy-transition": "energy",
  cleantech: "energy",
  "climate-action": "climate",
  "climate-tech": "climate",
  "climate-finance": "climate",
  "carbon-markets": "climate",
  "circular-economy": "climate",
  sustainability: "climate",
  "water-and-oceans": "climate",
  agritech: "climate",
  edtech: "edtech",
  mobilitytech: "mobility",
  "future-of-mobility": "mobility",
  logistics: "mobility",
  proptech: "proptech",
  "smart-cities": "proptech",
  "e-commerce": "ecommerce",
  "marketplace-models": "ecommerce",
  marketplaces: "ecommerce",
  foodtech: "consumer",
  "sustainable-fashion": "consumer",
  "creative-industries": "media",
  media: "media",
  "quantum-computing": "deeptech",
  spacetech: "deeptech",
  iot: "deeptech",
  "virtual-reality": "deeptech",
  "augmented-reality": "deeptech",
  "spatial-computing": "deeptech",
  saas: "b2b saas",
  "b2b-saas": "b2b saas",
  "api-economy": "b2b saas",
  "cloud-computing": "b2b saas",
  "low-code-no-code": "b2b saas",
  "software-engineering": "b2b saas",
  "hiring-and-talent": "hr tech",
  legaltech: "legaltech",
};

const AI_INTERESTS = new Set(["artificial-intelligence", "machine-learning", "generative-ai"]);
const COFOUNDER_INTERESTS = new Set(["co-founder-matching", "student-founders", "venture-building"]);

const VISION_INTERESTS = new Set([
  "leadership",
  "venture-building",
  "serial-entrepreneurship",
  "social-entrepreneurship",
  "entrepreneurship",
  "student-founders",
  "impact-investing",
  "open-innovation",
]);
const EXECUTION_INTERESTS = new Set([
  "scaling-up",
  "go-to-market",
  "sales-growth",
  "growth-hacking",
  "lean-startup",
  "operations",
  "bootstrapping",
  "product-market-fit",
]);
const DETAIL_INTERESTS = new Set([
  "financial-modeling",
  "due-diligence",
  "unit-economics",
  "m-and-a-strategy",
  "exit-strategy",
  "esg-investing",
  "climate-finance",
]);
const TECH_INTERESTS = new Set([
  "artificial-intelligence",
  "machine-learning",
  "generative-ai",
  "software-engineering",
  "data-science",
  "data-engineering",
  "engineering",
  "quantum-computing",
  "cloud-computing",
  "cybersecurity",
  "robotics",
  "hardware",
  "open-source",
  "iot",
]);
const DESIGN_INTERESTS = new Set([
  "creative-industries",
  "product-management",
  "marketing-strategy",
  "personal-branding",
  "virtual-reality",
  "augmented-reality",
  "spatial-computing",
  "sustainable-fashion",
  "media",
]);

const TECH_RE =
  /engineer|developer|entwickl|software|informati[ck]|computer science|\bdata\b|machine learning|\bml\b|\bcto\b|programm|coding|robotic|hardware|quantum|cyber|cloud|\bstem\b/i;
const DESIGN_RE = /design|\bux\b|\bui\b|user experience|creative director|grafik|graphic/i;
const PRODUCT_RE = /\bproduct\b|produktmanag|product[- ]management|product owner/i;
const OPS_RE = /operations|\bcoo\b|supply chain|logisti[ck]|procurement|einkauf|fulfil+ment/i;
const FINANCE_RE = /finan|controlling|accounting|analyst|audit|due diligence|invest|banking|private equity/i;
const VISION_RE = /founder|gründer|ceo|vision|strateg|entrepreneur/i;
const EXECUTION_RE = /operations|\bcoo\b|sales|vertrieb|growth|project|scal/i;

/** Interests, die eine Kompetenz (nicht nur ein Sektor-Interesse) ausdrücken → Keyword-Text. */
const COMPETENCY_INTERESTS = {
  "software-engineering": "software engineering",
  "data-science": "data science",
  "data-engineering": "data engineering",
  engineering: "engineering",
  "product-management": "product management",
  operations: "operations",
  logistics: "logistics",
};

const JOB_TAG = {
  tech: "job as engineer",
  product: "job as product manager",
  design: "job as designer",
  commercial: "job as product manager",
  operations: "job as product manager",
};

/* ------------------------------------------------------------------ */
/* Persönlichkeit                                                      */
/* ------------------------------------------------------------------ */

const PERSONALITY_SIGNALS = {
  visionary: {
    interests: {
      leadership: 2,
      "venture-building": 2,
      "serial-entrepreneurship": 2,
      "social-entrepreneurship": 1,
      entrepreneurship: 1,
      "student-founders": 1,
      "impact-investing": 1,
      "open-innovation": 1,
      "corporate-innovation": 0.5,
      intrapreneurship: 0.5,
    },
    text: /founder|gründer|\bceo\b|visionary|vision|strateg|entrepreneur/i,
  },
  builder: {
    interests: {
      "software-engineering": 2,
      engineering: 2,
      "data-engineering": 2,
      "low-code-no-code": 1.5,
      "open-source": 1.5,
      hardware: 1.5,
      robotics: 1,
      "machine-learning": 1,
      "generative-ai": 1,
      "artificial-intelligence": 0.5,
      "data-science": 1,
      "product-management": 1,
      "quantum-computing": 1,
      "cloud-computing": 1,
      iot: 1,
      "api-economy": 0.5,
    },
    text: /engineer|developer|entwickl|software|\bcto\b|build|programm|informati|product manager|maker|tech lead/i,
  },
  operator: {
    interests: {
      "go-to-market": 2,
      "sales-growth": 2,
      "scaling-up": 2,
      "growth-hacking": 1.5,
      "marketing-strategy": 1.5,
      "people-management": 1,
      "hiring-and-talent": 1,
      operations: 2,
      logistics: 1,
      "lean-startup": 1,
      "product-market-fit": 0.5,
      bootstrapping: 0.5,
    },
    text: /operations|\bcoo\b|sales|vertrieb|marketing|growth|chief of staff|project manag|consult/i,
  },
  connector: {
    interests: {
      "strategic-partnerships": 2,
      "personal-branding": 2,
      "public-speaking": 1.5,
      mentorship: 1.5,
      "women-in-tech": 1,
      "diversity-and-inclusion": 1,
      "pitch-coaching": 1,
      "career-transitions": 0.5,
      "remote-work": 0.5,
      freelancing: 0.5,
      "social-enterprise": 0.5,
    },
    text: /community|partnership|network|ecosystem|speaker|coach|ambassador|event|business development|bizdev/i,
  },
  analyst: {
    interests: {
      "financial-modeling": 2,
      "due-diligence": 2,
      "m-and-a-strategy": 1.5,
      "unit-economics": 2,
      "exit-strategy": 1,
      "venture-capital": 0.5,
      "angel-investing": 0.5,
      "esg-investing": 1,
      "corporate-venture": 0.5,
      "seed-funding": 0.5,
      "climate-finance": 1,
      "data-science": 0.5,
    },
    text: /analyst|finance|investment|due diligence|controlling|m&a|private equity|research|audit|accounting|banking/i,
  },
};

const PERSONALITY_ORDER = ["visionary", "builder", "operator", "connector", "analyst"];

const PERSONALITY_TABLE = {
  visionary: {
    summary: (name, focus) =>
      `${name} denkt in großen Linien, gibt Richtung vor und begeistert andere für die Idee – Schwerpunkt: ${focus}.`,
    traits: ["Big-Picture-Denken", "Überzeugungskraft", "Risikofreude", "Ungeduld bei Details"],
    communicationStyle:
      "Mit der Vision und dem Warum einsteigen, in Bildern und Möglichkeiten sprechen; Details erst nachliefern, wenn das Interesse geweckt ist.",
    outreachTips: [
      "Direkt mit der großen Idee eröffnen – was verändert sich, wenn es klappt?",
      "Ambition zeigen: Marktgröße, Momentum und Timing statt Feature-Liste.",
      "Ein konkretes nächstes Gespräch vorschlagen, kein langes Dokument schicken.",
    ],
    avoid: [
      "Seitenlange Details und Kleinklein zum Einstieg",
      "Zögerliche, defensive Formulierungen",
      "Bürokratische Prozesse und lange Abstimmungsschleifen",
    ],
  },
  builder: {
    summary: (name, focus) =>
      `${name} baut Dinge lieber selbst, als darüber zu reden, und liefert funktionierende Lösungen – Schwerpunkt: ${focus}.`,
    traits: ["Hands-on", "Technisch neugierig", "Pragmatisch", "Skeptisch gegenüber Buzzwords"],
    communicationStyle:
      "Konkret und sachlich: Was ist das Problem, wie ist der Stand, was ist der nächste technische Schritt? Substanz schlägt Pitch.",
    outreachTips: [
      "Ein konkretes Problem oder einen Prototyp mitbringen statt reiner Vision.",
      "Fachlich präzise bleiben und zeigen, dass man die Materie versteht.",
      "Fragen, wie sie oder er es bauen würde – Builder öffnen sich über Lösungen.",
    ],
    avoid: [
      "Marketing-Sprache und Superlative",
      "Vage Versprechen ohne technische Substanz",
      "Meetings ohne klares Ergebnis",
    ],
  },
  operator: {
    summary: (name, focus) =>
      `${name} bringt Dinge ins Rollen – Prozesse, Wachstum, Umsetzung – und misst sich an Ergebnissen; Schwerpunkt: ${focus}.`,
    traits: ["Umsetzungsstark", "Zielorientiert", "Strukturiert", "Wachstumsgetrieben"],
    communicationStyle:
      "Kurz, klar, ergebnisorientiert: Ziel, Plan, nächster Schritt. Zahlen, Zeitpläne und Verantwortlichkeiten kommen gut an.",
    outreachTips: [
      "Mit einem klaren Ziel und Zeitrahmen anfragen.",
      "Konkrete Traktion, KPIs oder Meilensteine nennen.",
      "Den Nutzen für ihr oder sein Vorhaben in einem Satz auf den Punkt bringen.",
    ],
    avoid: ["Ausschweifende Einleitungen", "Unklare Erwartungen und offene Enden", "Theorie ohne Umsetzungsplan"],
  },
  connector: {
    summary: (name, focus) =>
      `${name} lebt von Beziehungen, bringt Menschen zusammen und öffnet Türen – Schwerpunkt: ${focus}.`,
    traits: ["Kontaktfreudig", "Empathisch", "Großzügig mit Intros", "Community-orientiert"],
    communicationStyle:
      "Persönlich und warm, gern über gemeinsame Kontakte oder Events einsteigen. Beziehung vor Transaktion.",
    outreachTips: [
      "Gemeinsame Bekannte, Events oder Communities als Aufhänger nutzen.",
      "Zuerst etwas anbieten (Intro, Hilfe, Einladung), dann fragen.",
      "Ein lockeres Treffen beim Kaffee oder auf dem Event vorschlagen statt formeller Calls.",
    ],
    avoid: [
      "Rein transaktionale Anfragen ohne persönlichen Bezug",
      "Copy-Paste-Nachrichten",
      "Zu förmlicher, distanzierter Ton",
    ],
  },
  analyst: {
    summary: (name, focus) =>
      `${name} entscheidet auf Basis von Zahlen und Fakten und prüft gründlich, bevor eine Zusage kommt – Schwerpunkt: ${focus}.`,
    traits: ["Analytisch", "Gründlich", "Faktenorientiert", "Risikobewusst"],
    communicationStyle:
      "Strukturiert und belegbar: klare Zahlen, Annahmen offenlegen, Quellen nennen. Lieber ein präzises Dokument als ein emotionaler Pitch.",
    outreachTips: [
      "Kernzahlen und Annahmen direkt mitschicken (Markt, Unit Economics, Traktion).",
      "Logisch aufgebaut argumentieren: Problem, Evidenz, Schlussfolgerung.",
      "Zeit zum Prüfen lassen und Rückfragen ausdrücklich einladen.",
    ],
    avoid: ["Übertriebene Claims ohne Belege", "Druck und künstliche Dringlichkeit", "Emotionale Appelle statt Argumente"],
  },
};

const PERSONALITY_FOCUS_FALLBACK = {
  cofounder: "Gründung und Teamaufbau",
  investor: "Investments und Dealflow",
  mentor: "Erfahrung weitergeben",
  expert: "Fachexpertise",
  talent: "Lernen und Mitgestalten",
};

function detectPersonalityType(id, role, interests, text) {
  const scores = {};
  for (const type of PERSONALITY_ORDER) {
    const signals = PERSONALITY_SIGNALS[type];
    let score = 0;
    for (const interest of interests) score += signals.interests[interest] || 0;
    if (signals.text.test(text)) score += 1.5;
    scores[type] = score;
  }
  if (role === "angel" || role === "cvc") scores.analyst += 1;
  if (role === "speaker") {
    scores.visionary += 0.5;
    scores.connector += 0.5;
  }
  if (role === "sponsor") scores.connector += 0.5;

  const best = Math.max(...Object.values(scores));
  const tied = PERSONALITY_ORDER.filter((t) => scores[t] === best);
  return tied[hash(`${id}:personality`) % tied.length];
}

function buildPersonality(type, name, networkRole, interests) {
  const table = PERSONALITY_TABLE[type];
  const focusLabels = interests.slice(0, 2).map(interestLabel);
  const focus = focusLabels.length ? focusLabels.join(" und ") : PERSONALITY_FOCUS_FALLBACK[networkRole];
  return {
    type,
    summary: table.summary(name, focus),
    traits: [...table.traits],
    communicationStyle: table.communicationStyle,
    outreachTips: [...table.outreachTips],
    avoid: [...table.avoid],
  };
}

/* ------------------------------------------------------------------ */
/* Feld-Mapping                                                        */
/* ------------------------------------------------------------------ */

function parseLinkedin(raw) {
  const s = clean(raw);
  if (!s) return { url: undefined, username: undefined };
  const match = s.match(/linkedin\.com\/in\/([^/?#\s]+)/i);
  if (match) {
    let username = match[1];
    try {
      username = decodeURIComponent(username);
    } catch {
      /* kaputte Kodierung → roh verwenden */
    }
    return { url: `https://www.linkedin.com/in/${username}`, username };
  }
  const direct = /^https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/\S+$/i.test(s);
  return { url: direct ? s : undefined, username: undefined };
}

function normalizeCompany(value) {
  const c = clean(value);
  if (!c || /^(student(in)?|studierende|n\/?a|-+|none|keine|tbd|privat)$/i.test(c)) return "";
  return c;
}

function normalizeGeo(full) {
  const parts = clean(full)
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return "";
  const last = parts[parts.length - 1];
  const country = COUNTRY_DE[last] || last;
  if (parts.length === 1) return CITY_DE[last] || country;
  const city = CITY_DE[parts[0]] || parts[0];
  return `${city}, ${country}`;
}

function universityLocation(university) {
  const u = clean(university);
  if (!u) return "";
  const lower = u.toLowerCase();
  for (const [needle, city] of UNIVERSITY_CITY) if (lower.includes(needle)) return city;
  return u;
}

function degreeLabel(value) {
  const v = clean(value).toLowerCase();
  if (!v || v === "none" || v === "other") return undefined;
  if (DEGREE_LABELS[v]) return DEGREE_LABELS[v];
  return v.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function formatYearMonth(date) {
  if (!date || !date.year) return "";
  return date.month ? `${String(date.month).padStart(2, "0")}/${date.year}` : String(date.year);
}

function buildId(entry, li, parsed, displayName, usedIds) {
  const uuidPrefix = String(entry.id || "").replace(/-/g, "").slice(0, 6) || hash(displayName).toString(16).slice(0, 6);
  const base =
    (li?.username && slugify(li.username)) ||
    (parsed.username && slugify(parsed.username)) ||
    `${slugify(displayName) || "teilnehmer"}-${uuidPrefix}`;
  let id = base;
  let n = 2;
  while (usedIds.has(id)) id = `${base}-${n++}`;
  usedIds.add(id);
  return id;
}

function detectNetworkRole(role, expBucket, interests, stageRaw) {
  switch (role) {
    case "angel":
    case "cvc":
    case "sponsor":
      return "investor";
    case "startup":
      return "cofounder";
    case "speaker":
    case "professional":
      return expBucket === "3_plus_years" ? "mentor" : "expert";
    default:
      return interests.some((i) => COFOUNDER_INTERESTS.has(i)) || stageRaw ? "cofounder" : "talent";
  }
}

function detectFounderRole(text) {
  if (TECH_RE.test(text)) return "tech";
  if (DESIGN_RE.test(text)) return "design";
  if (PRODUCT_RE.test(text)) return "product";
  if (OPS_RE.test(text)) return "operations";
  return "commercial";
}

function complementaryCofounderTag(founderRole) {
  return founderRole === "commercial" || founderRole === "operations" ? "technical cofounder" : "commercial cofounder";
}

function buildVerticals(interests) {
  const out = [];
  for (const interest of interests) {
    const vertical = VERTICAL_BY_INTEREST[interest];
    if (vertical && !out.includes(vertical)) out.push(vertical);
    if (out.length >= MAX_VERTICALS) break;
  }
  if (!out.length) out.push(interests.some((i) => AI_INTERESTS.has(i)) ? "ai" : "b2b saas");
  return out;
}

function buildLookingFor({ networkRole, founderRole, lookingRaw, stage, interests }) {
  const out = [];
  const has = (...keys) => keys.some((k) => interests.includes(k));
  const investTag = stage === "seed" ? "seed investment" : "pre-seed investment";
  const cofounderTag = complementaryCofounderTag(founderRole);
  const funded = stage === "pre-seed" || stage === "seed";

  switch (lookingRaw) {
    case "raising":
      out.push(investTag);
      break;
    case "advice":
      out.push("mentor");
      break;
    case "hiring":
      out.push("first hires");
      break;
    case "co_founder":
      out.push(cofounderTag);
      break;
    case "partnerships":
      out.push("partnerships");
      break;
    default:
      break;
  }

  if (networkRole === "cofounder") {
    if (has("co-founder-matching") || !out.length) out.push(cofounderTag);
    if (funded && has("fundraising", "seed-funding", "angel-investing", "venture-capital")) out.push(investTag);
    if (has("mentorship", "pitch-coaching")) out.push("mentor");
    if (funded && has("hiring-and-talent")) out.push("first hires");
  } else if (networkRole === "talent") {
    out.push(JOB_TAG[founderRole] || "job as product manager");
    if (has("mentorship", "pitch-coaching", "career-development", "career-transitions")) out.push("mentor");
  } else if (networkRole === "investor") {
    out.push("startups to invest in");
    if (has("angel-investing", "venture-capital", "corporate-venture", "seed-funding", "due-diligence")) out.push("dealflow");
    if (has("strategic-partnerships", "corporate-innovation", "open-innovation")) out.push("partnerships");
  } else if (networkRole === "mentor") {
    out.push("mentees");
    if (has("angel-investing", "venture-capital")) out.push("startups to invest in");
    if (has("strategic-partnerships")) out.push("partnerships");
  } else {
    if (has("mentorship", "pitch-coaching")) out.push("mentees");
    if (has("strategic-partnerships")) out.push("partnerships");
    if (has("co-founder-matching")) out.push(cofounderTag);
    if (!out.length) out.push("advisor role");
  }

  return uniq(out).slice(0, MAX_LOOKING_FOR);
}

function buildDims({ id, networkRole, founderRole, interests, text, expBucket }) {
  const d = { vision: 5, design: 4, tech: 4, detail: 5, execution: 5 };

  switch (founderRole) {
    case "tech":
      d.tech += 2;
      d.detail += 1;
      break;
    case "design":
      d.design += 4;
      break;
    case "product":
      d.design += 1;
      d.vision += 1;
      d.execution += 1;
      break;
    case "operations":
      d.execution += 2;
      d.detail += 2;
      break;
    case "commercial":
      d.vision += 1;
      d.execution += 1;
      break;
    default:
      break;
  }
  switch (networkRole) {
    case "investor":
      d.detail += 2;
      d.vision += 1;
      break;
    case "mentor":
      d.vision += 1;
      d.execution += 2;
      d.detail += 1;
      break;
    case "expert":
      d.detail += 1;
      d.execution += 1;
      break;
    default:
      break;
  }

  const count = (set) => interests.filter((i) => set.has(i)).length;
  d.vision += Math.min(2, count(VISION_INTERESTS));
  d.execution += Math.min(2, count(EXECUTION_INTERESTS));
  d.detail += Math.min(2, count(DETAIL_INTERESTS));
  d.tech += Math.min(2, count(TECH_INTERESTS));
  d.design += Math.min(2, count(DESIGN_INTERESTS));

  if (DESIGN_RE.test(text)) d.design += 2;
  if (TECH_RE.test(text)) d.tech += 2;
  if (FINANCE_RE.test(text)) d.detail += 2;
  if (VISION_RE.test(text)) d.vision += 1;
  if (EXECUTION_RE.test(text)) d.execution += 1;

  if (expBucket === "3_plus_years") {
    d.execution += 1;
    d.detail += 1;
  } else if (expBucket === "0_years") {
    d.execution -= 1;
  }

  for (const key of Object.keys(d)) d[key] = clamp(Math.round(d[key] + jitter(`${id}:${key}`, 1)), 1, 10);
  return d;
}

function generateAbout({ name, role, jobTitle, company, university, fieldOfStudy, expBucket, interests, stage }) {
  const focus = interests.slice(0, 3).map(interestLabel);
  const focusText = focus.length ? ` Interessiert sich besonders für ${joinDe(focus)}.` : "";
  const exp = EXPERIENCE_TEXT[expBucket];
  const stageText = stage && stage !== "idea" ? STAGE_TEXT[stage] : "";
  let s;

  switch (role) {
    case "student": {
      const field = FIELD_STUDY_TEXT[fieldOfStudy];
      s = university
        ? `${name} studiert ${field ? `${field} ` : ""}an der ${university}`
        : `${name} studiert${field ? ` ${field}` : ""}`;
      if (exp) s += ` und bringt bereits ${exp} mit`;
      s += ".";
      if (stageText) s += ` Arbeitet parallel an einem eigenen Startup (${stageText}).`;
      break;
    }
    case "startup":
      s = `${name} gründet${company ? ` ${company}` : " ein Startup"}${jobTitle ? ` als ${jobTitle}` : ""}${
        stageText ? ` – aktuell in der ${stageText}-Phase` : ""
      }.`;
      break;
    case "angel":
      s = `${name} investiert als Angel${company ? ` (${company})` : ""} in Startups in der Frühphase${
        exp ? ` und bringt ${exp} mit` : ""
      }.`;
      break;
    case "cvc":
      s = `${name} ist im Corporate-Venture-Bereich${company ? ` von ${company}` : ""} tätig${jobTitle ? ` (${jobTitle})` : ""}.`;
      break;
    case "sponsor": {
      const title = jobTitle && !/sponsor/i.test(jobTitle) ? ` ${jobTitle}` : "";
      s = `${name} ist${title} bei ${company || "einem Partnerunternehmen"} und auf der IdeaLab! 2026 als Sponsor vertreten.`;
      break;
    }
    case "speaker":
      s = `${name} spricht auf der IdeaLab! 2026${
        jobTitle || company ? ` und ist ${jobTitle || "tätig"}${company ? ` bei ${company}` : ""}` : ""
      }.`;
      break;
    default:
      s = `${name} arbeitet${jobTitle ? ` als ${jobTitle}` : ""}${company ? ` bei ${company}` : ""}${
        exp ? ` und bringt ${exp} mit` : ""
      }.`;
  }
  return `${s}${focusText}`.trim();
}

/* ------------------------------------------------------------------ */
/* Ein Export-Eintrag → Profile                                        */
/* ------------------------------------------------------------------ */

function convert(entry, usedIds) {
  const cand = entry.candidate || {};
  const prof = entry.profile || {};
  const enrichment = entry.linkedin_enrichment || {};
  const li = enrichment.status === "enriched" && enrichment.data ? enrichment.data : null;
  const parsed = parseLinkedin(entry.linkedin_url || prof.linkedin_url || cand.linkedin_url);

  const displayName = clean(prof.display_name || cand.display_name) || "Unbekannte Person";
  const name = clean(li ? `${li.firstName || ""} ${li.lastName || ""}` : "") || displayName;
  const id = buildId(entry, li, parsed, displayName, usedIds);

  const role = prof.role || cand.role || "student";
  const roleLabel = ROLE_LABELS[role] || "Teilnehmer:in";
  const interests = uniq([...(prof.interests || []), ...(cand.interests || [])].map(clean));
  const jobTitle = clean(prof.job_title || cand.job_title);
  const company = normalizeCompany(prof.company || cand.company);
  const university = clean(prof.university || cand.university);
  const stageRaw = prof.startup_stage || cand.startup_stage || null;
  const expBucket = prof.experience_bucket || null;
  const fieldOfStudy = prof.field_of_study || null;
  const lookingRaw = prof.startup_looking_for || null;
  const email = clean(prof.email || cand.email);

  /* Headline */
  let headline = clean(li?.headline);
  if (!headline) {
    const lead = jobTitle || roleLabel;
    const org = company || university;
    headline = org ? `${lead} · ${org}` : lead;
  }
  headline = truncate(headline, MAX_HEADLINE);

  const location = normalizeGeo(li?.geo?.full) || universityLocation(university) || DEFAULT_LOCATION;
  const photoUrl =
    clean(cand.avatar_url) || clean(prof.avatar_url) || clean(li?.profilePicture) || `https://i.pravatar.cc/200?u=${id}`;

  /* Werdegang */
  const experience = (li?.position || [])
    .slice(0, MAX_POSITIONS)
    .map((p) => {
      const title = clean(p.title);
      const companyName = clean(p.companyName);
      if (!title && !companyName) return null;
      const item = {
        title: title || "Position",
        company: companyName,
        start: formatYearMonth(p.start),
        end: p.end && p.end.year ? formatYearMonth(p.end) : null,
      };
      const description = clean(p.description);
      if (description) item.description = truncate(description, MAX_DESCRIPTION);
      return item;
    })
    .filter(Boolean);

  const education = (li?.educations || [])
    .map((e) => {
      const school = clean(e.schoolName);
      if (!school) return null;
      const item = { school };
      const degree = clean(e.degree);
      const field = clean(e.fieldOfStudy);
      if (degree) item.degree = degree;
      if (field) item.field = field;
      if (e.start?.year) item.start = String(e.start.year);
      if (e.end?.year) item.end = String(e.end.year);
      return item;
    })
    .filter(Boolean)
    .slice(0, MAX_EDUCATION);
  if (!education.length && university) {
    const item = { school: university };
    const degree = degreeLabel(prof.academic_degree);
    const field = FIELD_LABELS[fieldOfStudy];
    if (degree) item.degree = degree;
    if (field) item.field = field;
    education.push(item);
  }

  const skills = uniq((li?.skills || []).map((s) => clean(s.name))).slice(0, MAX_SKILLS);
  const languages = uniq((li?.languages || []).map((l) => LANGUAGE_DE[clean(l.name)] || clean(l.name)));

  /* Heuristik-Text: nur echte Rollen-/Kompetenz-Signale (keine Sektor-Interests wie "robotics"). */
  const text = [
    headline,
    jobTitle,
    ...experience.slice(0, 3).map((e) => e.title),
    ...skills,
    ...interests.map((i) => COMPETENCY_INTERESTS[i] || ""),
    fieldOfStudy === "stem" ? "stem engineering" : "",
  ]
    .join(" ")
    .toLowerCase();

  const networkRole = detectNetworkRole(role, expBucket, interests, stageRaw);
  const founderRole = networkRole === "cofounder" || networkRole === "talent" ? detectFounderRole(text) : undefined;
  const stage =
    stageRaw === "pre_seed" ? "pre-seed" : stageRaw === "seed" ? "seed" : networkRole === "cofounder" ? "idea" : undefined;

  /* About */
  const oneLiner = clean(prof.startup_one_liner || cand.startup_one_liner);
  let about =
    cleanMultiline(li?.summary) ||
    cleanMultiline(prof.bio || cand.bio) ||
    oneLiner ||
    generateAbout({ name, role, jobTitle, company, university, fieldOfStudy, expBucket, interests, stage });
  if (oneLiner && !about.includes(oneLiner)) {
    const suffix = `\n\nStartup: ${truncate(oneLiner, MAX_DESCRIPTION)}`;
    about = `${truncate(about, MAX_ABOUT - suffix.length)}${suffix}`;
  }
  about = truncate(about, MAX_ABOUT);

  const personalityType = detectPersonalityType(id, role, interests, text);

  const profile = {
    id,
    name,
    headline,
    location,
    photoUrl,
    ...(email ? { email } : {}),
    ...(parsed.url ? { linkedinUrl: parsed.url } : {}),
    about,
    experience,
    education,
    skills,
    languages,
    networkRole,
    ...(founderRole ? { founderRole } : {}),
    lookingFor: buildLookingFor({ networkRole, founderRole, lookingRaw, stage, interests }),
    verticals: buildVerticals(interests),
    ...(stage ? { stage } : {}),
    dims: buildDims({ id, networkRole, founderRole, interests, text, expBucket }),
    personality: buildPersonality(personalityType, name, networkRole, interests),
    events: [EVENT_SLUG],
    tags: uniq([`idealab:${role}`, ...interests]),
    source: {
      type: li ? "linkedin" : "conference",
      ...(enrichment.fetched_at || entry.fetched_at ? { scrapedAt: enrichment.fetched_at || entry.fetched_at } : {}),
    },
  };
  return profile;
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

function main() {
  const raw = JSON.parse(readFileSync(SOURCE, "utf8"));
  const entries = Array.isArray(raw) ? raw : raw.profiles || [];
  if (!entries.length) throw new Error(`Keine Profile in ${SOURCE} gefunden.`);

  const usedIds = new Set();
  const profiles = entries.map((entry) => convert(entry, usedIds));

  mkdirSync(dirname(TARGET), { recursive: true });
  const json = `[\n${profiles.map((p) => JSON.stringify(p)).join(",\n")}\n]\n`;
  writeFileSync(TARGET, json, "utf8");

  const tally = (values) =>
    Object.entries(
      values.reduce((acc, v) => {
        acc[v] = (acc[v] || 0) + 1;
        return acc;
      }, {}),
    )
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}=${v}`)
      .join(", ");

  console.log(`OK: ${profiles.length} Profile -> ${TARGET} (${(Buffer.byteLength(json) / 1024).toFixed(0)} KB)`);
  console.log(`  networkRole:  ${tally(profiles.map((p) => p.networkRole))}`);
  console.log(`  founderRole:  ${tally(profiles.map((p) => p.founderRole || "-"))}`);
  console.log(`  personality:  ${tally(profiles.map((p) => p.personality.type))}`);
  console.log(`  source:       ${tally(profiles.map((p) => p.source.type))}`);
  console.log(`  stage:        ${tally(profiles.map((p) => p.stage || "-"))}`);
}

main();
