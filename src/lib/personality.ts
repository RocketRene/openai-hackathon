/**
 * Persönlichkeitstyp: Guide + regelbasierte Ableitung.
 * ---------------------------------------------------------------
 * Isomorph (Client + Server), ohne LLM – funktioniert ohne API-Key und ist erklärbar.
 * Die LLM-Variante liegt in src/app/api/personality/route.ts und fällt auf dieses Modul zurück.
 * Owner: siehe docs/PARALLEL-WORK.md.
 * Contract: PERSONALITY_GUIDE, derivePersonality, personalityFromProfile, outreachToneFor.
 */
import { PERSONALITY_LABELS, type Personality, type PersonalityType, type Profile } from "./types";

export const PERSONALITY_TYPES = ["visionary", "builder", "operator", "connector", "analyst"] as const satisfies readonly PersonalityType[];

export function isPersonalityType(value: unknown): value is PersonalityType {
  return typeof value === "string" && (PERSONALITY_TYPES as readonly string[]).includes(value);
}

export interface PersonalityGuideEntry {
  label: string;
  /** Wer das typischerweise ist und wie die Person tickt. */
  description: string;
  traits: string[];
  /** Ton, Länge, Fokus – wie man mit dieser Person kommuniziert. */
  communicationStyle: string;
  /** Konkrete Do's für die erste Nachricht / das erste Gespräch. */
  outreachTips: string[];
  /** Konkrete Don'ts. */
  avoid: string[];
  /** Fragen, mit denen ein Gespräch auf einem Event gut startet. */
  icebreakers: string[];
}

/* ------------------------------------------------------------------ */
/* Guide: wie man welchen Typ anschreibt und wie ein Gespräch läuft    */
/* ------------------------------------------------------------------ */

export const PERSONALITY_GUIDE: Record<PersonalityType, PersonalityGuideEntry> = {
  visionary: {
    label: PERSONALITY_LABELS.visionary,
    description:
      "Denkt in Märkten, Missionen und Zehn-Jahres-Horizonten. Zieht Menschen mit einer Geschichte hinter sich her und langweilt sich bei Details. Typisch: Gründer:in/CEO, Strateg:in, Serial Entrepreneur, Keynote-Speaker:in.",
    traits: ["Big-Picture-Denken", "Storytelling", "Risikofreude", "Ansteckende Energie", "Ungeduld bei Details"],
    communicationStyle:
      "Hört auf das Warum, nicht auf das Wie. Reagiert auf Ambition, Mission und Marktgröße; Feature-Listen und Prozessdetails verlieren diese Person in der zweiten Zeile. Mittellang, energisch, ein klarer Gedanke pro Nachricht.",
    outreachTips: [
      "Mit der Vision einsteigen: Welches große Problem löst ihr, und warum gerade jetzt?",
      "Zeigen, dass du die Mission der Person verstanden hast – ein Satz zu ihrem Startup oder ihrer These.",
      "Ambitioniert formulieren: Marktpotenzial, Warum-jetzt, was in fünf Jahren möglich ist.",
      "Zum offenen Gespräch einladen statt zum Abarbeiten einer Agenda.",
      "Mittellang halten – genug Substanz für die Idee, aber kein Whitepaper.",
    ],
    avoid: [
      "Prozess- und Detailfragen in der ersten Nachricht",
      "Zu vorsichtig oder klein formulieren („nur ein kleines Side-Project“)",
      "Feature-Listen, Roadmap-Screenshots oder Excel-Anhänge",
      "Die Vision kritisieren, bevor Vertrauen da ist",
    ],
    icebreakers: [
      "Wie sieht die Zehn-Jahres-Version deines Startups aus, die dich nachts wach hält?",
      "Was war der Moment, in dem du wusstest: Das muss es geben?",
      "Welcher Trend wird gerade komplett unterschätzt?",
    ],
  },
  builder: {
    label: PERSONALITY_LABELS.builder,
    description:
      "Will Dinge bauen, die funktionieren. Denkt in Systemen, Prototypen und Stack-Entscheidungen und misst Menschen daran, was sie geliefert haben. Typisch: CTO, Engineer, Product Builder, Designer:in, Maker.",
    traits: ["Hands-on", "Technische Tiefe", "Pragmatismus", "Allergisch gegen Buzzwords", "Lernt durch Ausprobieren"],
    communicationStyle:
      "Kurz, direkt, konkret. Will sofort wissen, was gebaut wird, warum es schwer ist und was du selbst schon gemacht hast. Zeigt Respekt für Substanz (Demo, Repo, Architektur), nicht für Titel.",
    outreachTips: [
      "Mit dem konkreten Problem oder Produkt einsteigen – was gebaut wird und warum es technisch anspruchsvoll ist.",
      "Zeigen, was schon existiert: Prototyp, Demo-Link, erste Nutzer:innen, Stack.",
      "Eine echte technische Frage stellen, bei der die Erfahrung der Person zählt.",
      "Kurz bleiben – drei bis fünf Sätze, kein Pitch-Deck.",
      "Kleinen, konkreten nächsten Schritt vorschlagen: 20-Minuten-Call, gemeinsam auf die Demo schauen.",
    ],
    avoid: [
      "Buzzword-Bingo („disruptiv“, „revolutionär“, „KI-first“) ohne Substanz",
      "„Ich habe die Idee, du baust“ – Builder wollen mitentscheiden, nicht abarbeiten",
      "Vage Visionen ohne Problem, Nutzer oder erstes Produkt",
      "Lange Vorreden und Small Talk vor dem eigentlichen Anliegen",
    ],
    icebreakers: [
      "Woran baust du gerade, und was ist der härteste Teil daran?",
      "Welche Tech-Entscheidung würdest du im letzten Projekt heute anders treffen?",
      "Was ist das Nervigste an eurem aktuellen Stack?",
    ],
  },
  operator: {
    label: PERSONALITY_LABELS.operator,
    description:
      "Bringt Struktur und Umsetzung. Denkt in Prozessen, Verantwortlichkeiten, Zeitplänen und Zahlen, die am Monatsende stimmen müssen. Typisch: COO, Chief of Staff, Projektleitung, Ex-Consultant, Head of Operations.",
    traits: ["Strukturiert", "Zuverlässig", "Ergebnisorientiert", "Priorisiert gnadenlos", "Denkt in Prozessen"],
    communicationStyle:
      "Klar, strukturiert, ohne Umwege. Erwartet in den ersten zwei Sätzen das Anliegen, den Nutzen und den gewünschten nächsten Schritt. Schätzt Verbindlichkeit, konkrete Termine und ordentlich vorbereitete Unterlagen.",
    outreachTips: [
      "Anliegen in einem Satz, dann der erwartete Nutzen für die Person.",
      "Struktur zeigen: kurze Aufzählung mit Kontext, Frage, Vorschlag.",
      "Konkreten Zeitrahmen anbieten – zwei Terminoptionen statt „irgendwann mal“.",
      "Beweisen, dass du vorbereitet bist: Status, Meilensteine, was bereits läuft.",
      "Verbindlich abschließen: Was passiert als Nächstes, bis wann?",
    ],
    avoid: [
      "Ausschweifende Visionsprosa ohne Plan dahinter",
      "Unklare Erwartungen („lass uns mal quatschen“)",
      "Termine nicht einhalten oder spontan verschieben",
      "Chaos zeigen – kein Plan, keine Zahlen, keine Prioritäten",
    ],
    icebreakers: [
      "Was ist der Prozess, den du in deinem letzten Team gefixt hast und auf den du stolz bist?",
      "Wie priorisierst du, wenn alles gleichzeitig brennt?",
      "Was war die größte operative Lektion beim Skalieren?",
    ],
  },
  connector: {
    label: PERSONALITY_LABELS.connector,
    description:
      "Lebt von Menschen und Beziehungen. Kennt alle, bringt Leute zusammen und denkt in Communitys, Partnerschaften und Deals. Typisch: Sales/BD, Marketing, Community-Lead, Angel, Ecosystem-Manager:in.",
    traits: ["Warm und zugänglich", "Großes Netzwerk", "Hört zu", "Denkt in Win-win", "Energie aus Begegnungen"],
    communicationStyle:
      "Persönlich, warm, auf Augenhöhe. Reagiert auf gemeinsame Kontakte, Events und echtes Interesse an der Person – nicht auf Templates. Darf etwas länger sein, wenn es menschlich bleibt. Bietet gern Intros an und erwartet, dass man selbst auch etwas zurückgibt.",
    outreachTips: [
      "Mit der Verbindung einsteigen: gemeinsamer Kontakt, Event, Community oder Beitrag der Person.",
      "Ehrliches Interesse an der Person zeigen – eine Frage zu ihrem aktuellen Projekt.",
      "Etwas anbieten, bevor du fragst: ein Intro, eine Einladung, eine Info.",
      "Gespräch statt Transaktion: erst kennenlernen, dann das Anliegen.",
      "Offen enden – mit einer Frage, die die Antwort leicht macht.",
    ],
    avoid: [
      "Kalte Template-Nachrichten ohne persönlichen Bezug",
      "Sofort um Intros oder Gefallen bitten",
      "Nur nehmen, nie geben – Connectors merken sich das",
      "Rein sachlich-nüchtern schreiben, ohne menschliche Note",
    ],
    icebreakers: [
      "Wie bist du zum Startup-Ökosystem gekommen?",
      "Wen sollte ich hier auf dem Event unbedingt noch kennenlernen?",
      "Was ist die spannendste Verbindung, die du zuletzt hergestellt hast?",
    ],
  },
  analyst: {
    label: PERSONALITY_LABELS.analyst,
    description:
      "Entscheidet auf Basis von Zahlen und Fakten. Gründlich, skeptisch gegenüber Hype, will die Annahmen hinter jeder Behauptung sehen. Typisch: Investor:in, Finance, Data Science, Research, Legal, Consulting-Analyst:in.",
    traits: ["Faktenbasiert", "Gründlich", "Skeptisch", "Präzise Sprache", "Denkt in Modellen und Risiken"],
    communicationStyle:
      "Sachlich, präzise, belegt. Zahlen, Quellen und klar formulierte Annahmen zählen mehr als Begeisterung. Darf länger sein, wenn jeder Satz Substanz hat. Schätzt es, wenn man Unsicherheiten offen benennt.",
    outreachTips: [
      "Mit Kontext und den relevanten Fakten einsteigen: Markt, Traction, Unit Economics.",
      "Zahlen mitliefern – auch wenn sie klein sind. Ehrliche Kennzahlen schlagen große Worte.",
      "Annahmen und offene Fragen benennen, statt alles rosig zu malen.",
      "Eine konkrete, analytische Frage stellen, bei der die Expertise der Person gefragt ist.",
      "Anbieten, Daten, Deck oder Modell zu schicken – und dann liefern.",
    ],
    avoid: [
      "Übertreibungen, Superlative und unbelegte Behauptungen",
      "Emotionale Appelle statt Argumente",
      "Vage Zahlen („riesiger Markt“, „viele Nutzer“)",
      "Rückfragen als Angriff verstehen – sie sind Interesse",
    ],
    icebreakers: [
      "Welche Kennzahl sagt dir am meisten über ein frühes Startup?",
      "Was war die letzte These, bei der dich die Daten überrascht haben?",
      "Wo liegen deiner Analyse nach die größten blinden Flecken in unserem Markt?",
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Regelbasierte Ableitung per Keyword-Scoring (de/en)                 */
/* ------------------------------------------------------------------ */

export interface PersonalityInput {
  name: string;
  headline?: string;
  about?: string;
  skills?: string[];
  tags?: string[];
  experienceTitles?: string[];
}

export interface PersonalityScore {
  type: PersonalityType;
  score: number;
  /** Getroffene Keywords (für Erklärbarkeit / Debugging). */
  signals: string[];
}

/**
 * Keywords in normalisierter Form (Kleinschreibung, Bindestriche → Leerzeichen).
 * Match = Wortanfang. Ein Keyword mit Leerzeichen am Ende matcht nur das exakte Wort
 * (z. B. "ai " trifft "ai", aber nicht "aim").
 */
const KEYWORDS: Record<PersonalityType, string[]> = {
  visionary: [
    "vision", "visionär", "visionary", "founder", "cofounder", "co founder", "gründer", "mitgründer",
    "ceo", "chief executive", "geschäftsführ", "managing director", "entrepreneur", "unternehmer",
    "serial", "strategy", "strategie", "strategic", "strategisch", "innovation", "innovat", "disrupt",
    "future", "zukunft", "moonshot", "mission", "purpose", "impact", "storytelling", "brand", "marke",
    "keynote", "speaker", "venture building", "venture builder", "company builder", "big picture",
    "think big", "transform", "digital transformation", "idea", "ideen", "creative", "kreativ",
    "social entrepreneurship", "student founders", "serial entrepreneurship", "president", "thought leader",
    "futurist", "pioneer", "pionier", "trend", "startup", "start up", "gründung", "founding",
  ],
  builder: [
    "engineer", "ingenieur", "developer", "entwickler", "software", "cto", "chief technology", "chief technical",
    "tech", "technical", "technisch", "technolog", "programm", "coding", "code", "coder", "full stack",
    "fullstack", "backend", "frontend", "devops", "machine learning", "deep learning", "ml ", "ai ",
    "artificial intelligence", "künstliche intelligenz", "generative ai", "llm", "python", "typescript",
    "javascript", "rust", "golang", "java", "kotlin", "swift", "c++", "c#", "react", "node", "kubernetes",
    "docker", "cloud", "aws", "azure", "gcp", "architect", "architekt", "hardware", "robotic", "robotik",
    "embedded", "iot ", "prototyp", "hacker", "hackathon", "maker", "build", "bauen", "ship", "mvp",
    "product", "produkt", "indie", "open source", "low code", "no code", "blockchain", "web3", "cyber",
    "sre ", "designer", "ux ", "ui ", "figma", "data engineering", "software engineering", "computer science",
    "informatik", "hpi", "api", "saas", "3d", "cad", "mechatronic", "physics", "physik", "electrical",
    "elektrotechnik", "maschinenbau", "mechanical", "scientist", "wissenschaftler",
  ],
  operator: [
    "operations", "operativ", "operating", "coo ", "chief operating", "chief of staff", "project manag",
    "projektmanag", "projektleit", "program manag", "programm manag", "process", "prozess", "scaling", "skalier",
    "scale", "execution", "umsetzung", "delivery", "supply chain", "logistic", "logistik", "hr ", "human resources",
    "people management", "people operations", "team lead", "teamleit", "head of", "leiter", "leiterin", "director",
    "manager", "management", "general manager", "founders associate", "founder associate", "consult", "berater",
    "beratung", "bain", "mckinsey", "bcg", "boston consulting", "roland berger", "strategy&", "accenture",
    "deloitte", "kpmg", "pwc", "lean", "agile", "scrum", "okr", "kpi", "efficien", "effizien", "automation",
    "automatisierung", "procurement", "einkauf", "quality", "qualität", "compliance", "organisation", "organization",
    "operational excellence", "six sigma", "pmo", "coordinator", "koordinat", "administration", "planning", "planung",
    "workflow", "prozessoptimierung", "process optimization", "implementation", "rollout", "hiring", "hiring and talent",
    "bootstrapping", "unit economics", "controlling",
  ],
  connector: [
    "sales", "vertrieb", "verkauf", "business development", "biz dev", "bizdev", "bd ", "partnership", "partnerschaft",
    "partner", "ecosystem", "ökosystem", "community", "network", "netzwerk", "networking", "marketing", "growth",
    "wachstum", "go to market", "gtm", "customer", "kunden", "client", "key account", "account manag", "relationship",
    "beziehung", "communication", "kommunikation", "public speaking", "brand ambassador", "personal branding",
    "social media", "content", "influencer", "pr ", "public relations", "presse", "press", "investor relations",
    "fundraising", "relations", "talent", "recruit", "headhunt", "mentor", "coach", "coaching", "pitch coaching",
    "event", "veranstaltung", "ambassador", "advocate", "evangelist", "chief marketing", "cmo", "cro ",
    "chief revenue", "cso", "chief sales", "chief commercial", "commercial", "kommerziell", "sponsor",
    "co founder matching", "women in tech", "diversity", "inclusion", "intercultural", "interkulturell",
    "hospitality", "customer success", "revenue", "umsatz", "negotiation", "verhandlung", "moderation", "connector",
    "alumni", "club", "verein", "e.v.", "association", "collective", "incubator", "accelerator", "angel",
    "dealflow", "scout", "venture partner", "people", "teamwork", "team player",
  ],
  analyst: [
    "analy", "data", "daten", "science", "research", "forschung", "phd", "dr.", "doktor", "doctoral", "statisti",
    "mathemat", "quant", "sql", "excel", "power bi", "tableau", "business intelligence", "bi ", "finance", "financ",
    "finanz", "financial model", "modeling", "modelling", "modellierung", "controller", "accounting", "buchhaltung",
    "audit", "wirtschaftsprüf", "tax", "steuer", "due diligence", "m&a", "m and a", "merger", "acquisition",
    "investment", "investor", "investing", "venture capital", "vc ", "private equity", "pe ", "valuation",
    "bewertung", "economics", "economist", "ökonom", "volkswirt", "risk", "risiko", "legal", "jurist", "law ",
    "recht", "lawyer", "anwalt", "attorney", "market research", "marktforschung", "exit strategy", "esg",
    "impact investing", "portfolio", "asset management", "banking", "bank", "capital markets", "equity", "fund",
    "fonds", "actuar", "insights", "reporting", "forecast", "prognose", "seed funding", "chief financial", "cfo",
    "diligence", "financial modeling", "analytical", "analytische", "problem solving",
  ],
};

/** Gewichtung je Feld: Headline und Jobtitel sagen am meisten über die Rolle. */
const FIELD_WEIGHTS = {
  headline: 3,
  experienceTitles: 3,
  skills: 2,
  tags: 1,
  about: 1,
} as const;

/** Bei Gleichstand gewinnt der frühere Eintrag; builder ist zugleich der Fallback. */
const TIE_ORDER: readonly PersonalityType[] = ["builder", "visionary", "operator", "connector", "analyst"];

const SEPARATORS = new RegExp("[^\\p{L}\\p{N}&+#.]+", "gu");

/** Kleinschreibung, alle Trennzeichen (inkl. Bindestrich) → Leerzeichen, an beiden Enden gepolstert. */
function normalize(text: string): string {
  return ` ${text.toLowerCase().replace(SEPARATORS, " ").trim()} `;
}

/** Liefert das tatsächlich getroffene Wort aus dem Text (statt des Keyword-Stamms), z. B. "financial" statt "financ". */
function matchedWord(haystack: string, start: number, stemLength: number): string {
  let end = start + stemLength;
  while (end < haystack.length && haystack[end] !== " ") end++;
  return haystack.slice(start, end);
}

function countHits(haystack: string, keywords: string[]): { hits: number; matched: string[] } {
  let hits = 0;
  const matched: string[] = [];
  for (const kw of keywords) {
    const needle = ` ${kw}`;
    let idx = haystack.indexOf(needle);
    let n = 0;
    let word = "";
    while (idx !== -1 && n < 5) {
      if (n === 0) word = matchedWord(haystack, idx + 1, kw.trimEnd().length);
      n++;
      idx = haystack.indexOf(needle, idx + needle.length);
    }
    if (n > 0) {
      hits += n;
      matched.push(word || kw.trim());
    }
  }
  return { hits, matched };
}

/** Rohscores je Typ (absteigend sortiert). Nützlich für Erklärungen und Tests. */
export function scorePersonality(input: PersonalityInput): PersonalityScore[] {
  const fields: { text: string; weight: number }[] = [
    { text: normalize(input.headline ?? ""), weight: FIELD_WEIGHTS.headline },
    { text: normalize((input.experienceTitles ?? []).join(" | ")), weight: FIELD_WEIGHTS.experienceTitles },
    { text: normalize((input.skills ?? []).join(" | ")), weight: FIELD_WEIGHTS.skills },
    { text: normalize((input.tags ?? []).join(" | ")), weight: FIELD_WEIGHTS.tags },
    { text: normalize(input.about ?? ""), weight: FIELD_WEIGHTS.about },
  ];

  const scores = PERSONALITY_TYPES.map((type): PersonalityScore => {
    let score = 0;
    const signals = new Set<string>();
    for (const field of fields) {
      if (field.text.trim().length === 0) continue;
      const { hits, matched } = countHits(field.text, KEYWORDS[type]);
      score += hits * field.weight;
      for (const m of matched) signals.add(m);
    }
    return { type, score, signals: Array.from(signals) };
  });

  return scores.sort((a, b) => b.score - a.score || TIE_ORDER.indexOf(a.type) - TIE_ORDER.indexOf(b.type));
}

function firstName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "Diese Person";
  return trimmed.split(/\s+/)[0];
}

const SUMMARY_TEMPLATES: Record<PersonalityType, (name: string) => string> = {
  visionary: (n) => `${n} denkt in großen Linien – Mission, Markt und Zukunft zählen mehr als Details.`,
  builder: (n) => `${n} will Dinge bauen, die funktionieren – konkret, technisch und ohne Geduld für Buzzwords.`,
  operator: (n) => `${n} bringt Struktur und Umsetzung – klare Prozesse, Verantwortlichkeiten und Ergebnisse.`,
  connector: (n) => `${n} lebt von Menschen und Beziehungen – Netzwerk, Community und persönliche Wärme öffnen Türen.`,
  analyst: (n) => `${n} entscheidet auf Basis von Zahlen und Fakten – gründlich, präzise und skeptisch gegenüber Hype.`,
};

/** Baut eine vollständige Personality aus Typ + Guide, mit personalisiertem Summary. */
export function personalityForType(type: PersonalityType, name: string, signals: string[] = []): Personality {
  const guide = PERSONALITY_GUIDE[type];
  const base = SUMMARY_TEMPLATES[type](firstName(name));
  const evidence =
    signals.length > 0
      ? ` Signale im Profil: ${signals.slice(0, 4).join(", ")}.`
      : " (Standard-Einschätzung – das Profil liefert wenig Signale.)";
  return {
    type,
    summary: base + evidence,
    traits: [...guide.traits],
    communicationStyle: guide.communicationStyle,
    outreachTips: [...guide.outreachTips],
    avoid: [...guide.avoid],
  };
}

/**
 * Regelbasierte Ableitung des Persönlichkeitstyps aus Profiltexten (de/en).
 * Fallback ohne Signale: "builder".
 */
export function derivePersonality(input: PersonalityInput): Personality {
  const ranked = scorePersonality(input);
  const best = ranked[0];
  if (!best || best.score <= 0) {
    return personalityForType("builder", input.name);
  }
  return personalityForType(best.type, input.name, best.signals);
}

/** Bequemer Einstieg für ein komplettes Profil (nutzt derivePersonality). */
export function personalityFromProfile(profile: Profile): Personality {
  const experienceTitles = profile.experience.map((e) => e.title).filter((t) => t && t.trim().length > 0);
  const experienceDescriptions = profile.experience
    .map((e) => e.description ?? "")
    .filter((d) => d.trim().length > 0)
    .join(" ");
  return derivePersonality({
    name: profile.name,
    headline: profile.headline,
    about: [profile.about, experienceDescriptions].filter(Boolean).join(" "),
    skills: profile.skills,
    tags: [...(profile.tags ?? []), ...profile.verticals],
    experienceTitles,
  });
}

/* ------------------------------------------------------------------ */
/* Ton für den Outreach                                                */
/* ------------------------------------------------------------------ */

export interface OutreachTone {
  length: "kurz" | "mittel" | "lang";
  tone: string;
  openWith: string;
  closeWith: string;
}

const OUTREACH_TONES: Record<PersonalityType, OutreachTone> = {
  visionary: {
    length: "mittel",
    tone: "inspirierend, ambitioniert, energisch – ein großer Gedanke statt vieler kleiner",
    openWith: "der Vision: welches große Problem ihr löst und warum gerade jetzt",
    closeWith: "einer Einladung, gemeinsam groß zu denken – offenes Gespräch statt Agenda",
  },
  builder: {
    length: "kurz",
    tone: "direkt, konkret, technisch präzise – keine Buzzwords",
    openWith: "dem konkreten Problem oder Produkt: was gebaut wird und warum es schwer ist",
    closeWith: "einem kleinen, konkreten nächsten Schritt (Demo, Repo, 20-Minuten-Call)",
  },
  operator: {
    length: "kurz",
    tone: "strukturiert, klar, ergebnisorientiert und verbindlich",
    openWith: "dem Anliegen in einem Satz und dem Nutzen für die Person",
    closeWith: "einem klaren Vorschlag mit Zeitrahmen, z. B. zwei Terminoptionen",
  },
  connector: {
    length: "mittel",
    tone: "warm, persönlich, auf Augenhöhe – wie eine Nachricht an eine Bekannte",
    openWith: "der Verbindung: gemeinsamer Kontakt, Event, Community oder Beitrag der Person",
    closeWith: "einer offenen Frage oder einem Angebot, etwas zurückzugeben (Intro, Einladung)",
  },
  analyst: {
    length: "lang",
    tone: "sachlich, präzise, belegt – jede Aussage mit Zahl oder Quelle",
    openWith: "Kontext und den relevanten Fakten: Markt, Traction, Kennzahlen",
    closeWith: "einer konkreten Frage oder dem Angebot, Daten, Deck oder Modell zu schicken",
  },
};

export function outreachToneFor(type: PersonalityType): OutreachTone {
  return { ...OUTREACH_TONES[type] };
}
