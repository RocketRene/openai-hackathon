/**
 * Gesprächsvorbereitung ("Prep Pack").
 * ---------------------------------------------------------------
 * „Wenn du mit dieser Person redest, wird sie wahrscheinlich das von dir wissen wollen.“
 * Deterministische Templates (ohne LLM, damit alles ohne API-Key funktioniert) plus Prompts
 * und JSON-Schema für die LLM-Variante in /api/prep.
 * Isomorph: kein "use client", keine Node-APIs – nutzbar in Route-Handlern und Komponenten.
 * Owner: Paket "prep" (docs/PARALLEL-WORK.md).
 */
import { getEvent } from "./data";
import { scoreMatch } from "./matching";
import {
  FOUNDER_DIM_KEYS,
  FOUNDER_DIM_LABELS,
  PERSONALITY_LABELS,
  type FounderDimKey,
  type FounderDims,
  type FounderRole,
  type MatchReason,
  type MatchResult,
  type NetworkRole,
  type PersonalityType,
  type PrepPack,
  type PrepQuestion,
  type Profile,
  type Stage,
  type UserContext,
} from "./types";

/* ------------------------------------------------------------------ */
/* Labels & Persönlichkeits-Bausteine                                  */
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
  commercial: "Commercial / Business",
  product: "Produkt",
  design: "Design",
  operations: "Operations",
  "domain-expert": "Domain-Expertise",
};

const STAGE_LABELS: Record<Stage, string> = {
  idea: "Ideenphase",
  "pre-seed": "Pre-Seed",
  seed: "Seed",
  "series-a": "Series A",
  growth: "Growth",
};

/** Wie dieser Persönlichkeitstyp auf ein Gespräch schaut – folgt auf „… ist <Typ> und …“. */
const LENS: Record<PersonalityType, string> = {
  visionary: "denkt vom großen Bild her – Mission und Markt zuerst, Details später",
  builder: "will wissen, was konkret gebaut ist und wie es funktioniert",
  operator: "achtet auf Zahlen, Prozesse und Verlässlichkeit",
  connector: "denkt in Menschen, Beziehungen und Netzwerk-Effekten",
  analyst: "will Belege, saubere Argumentation und Zahlen statt Behauptungen",
};

/** Kürzere Einleitungs-Varianten, damit sich `why` über 7 Fragen nicht wortgleich wiederholt. */
const LENS_AS: Record<PersonalityType, (first: string) => string> = {
  visionary: (f) => `Als Visionär:in hört ${f} hier vor allem auf das große Bild.`,
  builder: (f) => `Als Builder will ${f} hier das Konkrete hören, nicht die Folie.`,
  operator: (f) => `Als Operator prüft ${f} hier Struktur und Verlässlichkeit.`,
  connector: (f) => `Als Connector denkt ${f} hier sofort in Menschen und Kontakten.`,
  analyst: (f) => `Als Analyst:in will ${f} hier Belege, kein Bauchgefühl.`,
};

const LENS_TYPICAL: Record<PersonalityType, string> = {
  visionary: "erst die Mission, dann der Plan.",
  builder: "erst die Demo, dann die Diskussion.",
  operator: "erst der Plan, dann die Begeisterung.",
  connector: "erst die Beziehung, dann das Geschäft.",
  analyst: "erst die Zahl, dann die Story.",
};

/** Womit man bei diesem Typ an Nachfragen rechnen muss. */
const FOLLOW_UP: Record<PersonalityType, string> = {
  visionary: "Rechne mit Nachfragen zur langfristigen Vision, weniger zu operativen Details.",
  builder: "Rechne mit Nachfragen zum Wie – Architektur, Prototyp, Umsetzungstempo.",
  operator: "Rechne mit Nachfragen zu Zahlen, Prozessen und Zuständigkeiten.",
  connector: "Rechne mit Nachfragen, wer noch dabei ist und wen du schon kennst.",
  analyst: "Rechne mit Nachfragen zu jeder Zahl und jeder Annahme.",
};

/** Wie das Gespräch mit diesem Typ läuft (Basis für personalityNotes). */
const CONVERSATION_NOTES: Record<PersonalityType, (first: string) => string[]> = {
  visionary: (f) => [
    `${f} ist Visionär:in: Starte mit dem großen Bild – Mission, Markt in fünf Jahren – und geh erst danach in Details.`,
    `Rechne mit Sprüngen zwischen Themen; hol den Faden freundlich zurück, statt jeden Gedanken auszudiskutieren. Sinkt die Energie, wechsle zur Story, nicht zur Tabelle.`,
  ],
  builder: (f) => [
    `${f} ist Builder: Zeig, was existiert – Prototyp, Demo, Code, Screenshots – und rede über das Wie statt über Folien.`,
    `Bleib bei technischen Fragen konkret und ehrlich: „Das lösen wir später“ kommt schlecht an, „das ist offen, ich würde X versuchen“ gut.`,
  ],
  operator: (f) => [
    `${f} ist Operator: Struktur und Zahlen überzeugen – komm mit klarer Agenda, konkreten Meilensteinen und Zuständigkeiten.`,
    `Halte den Zeitrahmen ein und liefer nach dem Gespräch genau das, was du zugesagt hast. Verlässlichkeit zählt hier mehr als Begeisterung.`,
  ],
  connector: (f) => [
    `${f} ist Connector: Das Gespräch läuft über Menschen – frag nach dem Netzwerk, erzähl, wer schon dabei ist, und bitte konkret um Intros.`,
    `Warm und persönlich starten, nicht mit dem Pitch. Rechne damit, dass ${f} dich sofort weiterverbinden will – hab parat, zu wem.`,
  ],
  analyst: (f) => [
    `${f} ist Analyst:in: Jede Zahl wird hinterfragt – nenne Quellen und Annahmen und sag offen, was du nicht weißt.`,
    `Weniger Pathos, mehr Struktur: Problem, Beleg, Schluss. Pausen sind Nachdenken, kein Desinteresse.`,
  ],
};

const NEUTRAL_DIMS: FounderDims = { vision: 5, design: 5, tech: 5, detail: 5, execution: 5 };

/* ------------------------------------------------------------------ */
/* Helfer                                                              */
/* ------------------------------------------------------------------ */

function firstName(name: string | undefined): string {
  const n = (name ?? "").trim().split(/\s+/)[0];
  return n || "Die Person";
}

function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

/** Erster Satz eines Freitexts (für Eisbrecher aus „Über mich“). */
function firstSentence(text: string, max = 110): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length < 20) return "";
  const m = clean.match(/^(.{20,}?[.!?])(\s|$)/);
  return truncate(m ? m[1] : clean, max);
}

function bullets(items: string[]): string {
  return items
    .map((i) => i.trim())
    .filter(Boolean)
    .map((i) => `• ${i}`)
    .join("\n");
}

function uniq(items: string[]): string[] {
  return Array.from(new Set(items.map((s) => s.trim()).filter(Boolean)));
}

/** Nimmt `primary`, füllt mit `fallbacks` auf genau `n` Einträge auf. */
function fill(primary: string[], fallbacks: string[], n: number): string[] {
  return uniq([...uniq(primary).slice(0, n), ...fallbacks]).slice(0, n);
}

function dimLabels(keys: FounderDimKey[]): string {
  return keys.map((k) => FOUNDER_DIM_LABELS[k]).join(", ");
}

function sortedDims(dims: FounderDims, dir: "asc" | "desc"): FounderDimKey[] {
  return [...FOUNDER_DIM_KEYS].sort((a, b) => (dir === "asc" ? dims[a] - dims[b] : dims[b] - dims[a]));
}

/** Alle Dims gleich (z. B. Default 5/5/5/5/5) → keine Aussage über Stärken/Schwächen möglich. */
function isFlat(dims: FounderDims): boolean {
  return new Set(FOUNDER_DIM_KEYS.map((k) => dims[k])).size === 1;
}

function isPersonalityType(v: unknown): v is PersonalityType {
  return typeof v === "string" && v in PERSONALITY_LABELS;
}

function isNetworkRole(v: unknown): v is NetworkRole {
  return typeof v === "string" && v in NETWORK_ROLE_LABELS;
}

/* ------------------------------------------------------------------ */
/* Kontext für alle Template-Bausteine                                 */
/* ------------------------------------------------------------------ */

interface PrepContext {
  user: UserContext;
  profile: Profile;
  match: MatchResult;
  role: NetworkRole;
  /** Vorname der Gesprächspartner:in */
  first: string;
  persType: PersonalityType;
  persLabel: string;
  lens: string;
  followUp: string;
  /** „Die Erfahrung als X bei Y prägt dabei den Blick.“ oder "" */
  bgSentence: string;
  /** „X bei Y“ bzw. Headline oder "" */
  bgShort: string;
  /** Idee der Nutzer:in, gekürzt, oder "" */
  idea: string;
  stageLabel: string;
  userRoleLabel: string;
  wantedRoles: string;
  userWeak: FounderDimKey[];
  userStrong: FounderDimKey[];
  profileStrong: FounderDimKey[];
  /** Dims, in denen das Profil mindestens 2 Punkte über der Nutzer:in liegt */
  complementary: FounderDimKey[];
  sharedVerticals: string[];
  sharedSkills: string[];
  eventNames: string[];
  /** Zähler für die Einleitungs-Variante in `why()` (rotiert, damit sich Text nicht wiederholt). */
  whyIndex: number;
}

function buildContext(userInput: UserContext, profileInput: Profile): PrepContext {
  // Defensive Kopien – gescrapte/teilweise Daten dürfen die Vorbereitung nicht crashen.
  const user: UserContext = {
    ...userInput,
    dims: { ...NEUTRAL_DIMS, ...(userInput.dims ?? {}) },
    lookingFor: userInput.lookingFor ?? [],
    lookingForRoles: userInput.lookingForRoles ?? [],
    verticals: userInput.verticals ?? [],
    strengths: userInput.strengths ?? [],
    idea: userInput.idea ?? "",
  };
  const profile: Profile = {
    ...profileInput,
    dims: { ...NEUTRAL_DIMS, ...(profileInput.dims ?? {}) },
    verticals: profileInput.verticals ?? [],
    lookingFor: profileInput.lookingFor ?? [],
    skills: profileInput.skills ?? [],
    experience: profileInput.experience ?? [],
    education: profileInput.education ?? [],
    events: profileInput.events ?? [],
    about: profileInput.about ?? "",
  };

  const match = scoreMatch(user, profile);
  const role: NetworkRole = isNetworkRole(profile.networkRole) ? profile.networkRole : "cofounder";
  const persType: PersonalityType = isPersonalityType(profile.personality?.type) ? profile.personality.type : "builder";
  const first = firstName(profile.name);

  const exp = profile.experience[0];
  const hasExp = Boolean(exp?.title && exp?.company);
  const headline = truncate(profile.headline ?? "", 70);
  const bgShort = hasExp ? `${exp.title} bei ${exp.company}` : headline;
  const bgSentence = hasExp
    ? `Die Erfahrung als ${exp.title} bei ${exp.company} prägt dabei den Blick.`
    : headline
      ? `Der Hintergrund „${headline}“ prägt dabei den Blick.`
      : "";

  const userVerticals = user.verticals.map((v) => v.toLowerCase());
  const sharedVerticals = profile.verticals.filter((v) => userVerticals.includes(v.toLowerCase()));
  const strengths = user.strengths.map((s) => s.toLowerCase().trim()).filter(Boolean);
  const sharedSkills = profile.skills
    .filter((sk) => {
      const l = sk.toLowerCase();
      return strengths.some((st) => l.includes(st) || st.includes(l));
    })
    .slice(0, 3);

  return {
    user,
    profile,
    match,
    role,
    first,
    persType,
    persLabel: PERSONALITY_LABELS[persType],
    lens: LENS[persType],
    followUp: FOLLOW_UP[persType],
    bgSentence,
    bgShort,
    idea: truncate(user.idea, 140).replace(/[.!?…]+$/, ""),
    stageLabel: user.stage ? STAGE_LABELS[user.stage] ?? user.stage : "Phase noch nicht angegeben",
    userRoleLabel: user.founderRole ? FOUNDER_ROLE_LABELS[user.founderRole] ?? user.founderRole : "",
    wantedRoles: user.lookingForRoles.map((r) => FOUNDER_ROLE_LABELS[r] ?? r).join(", "),
    userWeak: isFlat(user.dims) ? [] : sortedDims(user.dims, "asc").slice(0, 2),
    userStrong: isFlat(user.dims) ? [] : sortedDims(user.dims, "desc").slice(0, 2),
    profileStrong: isFlat(profile.dims) ? [] : sortedDims(profile.dims, "desc").slice(0, 2),
    complementary: FOUNDER_DIM_KEYS.filter((k) => profile.dims[k] - user.dims[k] >= 2),
    sharedVerticals,
    sharedSkills,
    eventNames: profile.events.map((slug) => getEvent(slug)?.name ?? slug),
    whyIndex: 0,
  };
}

/* ------------------------------------------------------------------ */
/* Wiederverwendbare Antwort-Bausteine (aus dem Nutzer-Kontext)         */
/* ------------------------------------------------------------------ */

function personaIntro(c: PrepContext, variant: number): string {
  switch (variant) {
    case 1:
      return LENS_AS[c.persType](c.first);
    case 2:
      return `Typisch ${c.persLabel}: ${LENS_TYPICAL[c.persType]}`;
    default:
      return `${c.first} ist ${c.persLabel} und ${c.lens}.`;
  }
}

/** „Warum fragt die Person das?“ – aus ihrer Sicht, mit Persönlichkeitstyp und optional Hintergrund. */
function why(c: PrepContext, focus: string, withBackground = false): string {
  const intro = personaIntro(c, c.whyIndex++ % 3);
  return [intro, withBackground ? c.bgSentence : "", focus].filter(Boolean).join(" ");
}

function ideaLine(c: PrepContext): string {
  return c.idea
    ? `Deine Idee in einem Satz: „${c.idea}“`
    : "Deine Idee in einem Satz – konkret, ohne Buzzwords (im Onboarding noch ergänzen)";
}

function strengthsLine(c: PrepContext): string {
  return c.user.strengths.length > 0
    ? `Deine Stärken, die du einbringst: ${c.user.strengths.join(", ")}`
    : "Deine 2–3 wichtigsten Stärken – konkret, mit einem Beispiel";
}

function stageLine(c: PrepContext): string {
  return `Aktueller Stand: ${c.stageLabel}`;
}

function gapLine(c: PrepContext): string {
  const how = c.wantedRoles ? `Co-Founder für ${c.wantedRoles}` : "Co-Founder, erste Hires oder Advisor";
  const where = c.userWeak.length > 0 ? ` (${dimLabels(c.userWeak)})` : "";
  return `Ehrlich benennen, wo du schwächer bist${where} – und wie du das schließt: ${how}`;
}

function strongDimsLine(c: PrepContext): string {
  return c.userStrong.length > 0
    ? `Deine stärksten Dimensionen laut Selbsteinschätzung: ${dimLabels(c.userStrong)}`
    : "Deine stärksten Dimensionen – Selbsteinschätzung im Onboarding ergänzen";
}

/** „, du in Technik, Umsetzung“ – oder leer, wenn die Selbsteinschätzung nichts hergibt. */
function mineClause(c: PrepContext): string {
  return c.userStrong.length > 0 ? `, du in ${dimLabels(c.userStrong)}` : "";
}

function tractionOutline(c: PrepContext): string[] {
  switch (c.user.stage) {
    case "pre-seed":
      return [
        "Erste Nutzer:innen oder Pilotkund:innen – mit Zahl und Zeitraum",
        "Was sie tun (Nutzung, Wiederkehr), nicht nur Sign-ups",
        "Nächster Meilenstein mit Datum",
      ];
    case "seed":
      return [
        "MRR/Umsatz und Wachstum pro Monat",
        "Retention oder Aktivierungsquote",
        "Was der Engpass fürs Wachstum ist",
      ];
    case "series-a":
    case "growth":
      return [
        "Kern-Kennzahlen: Umsatz, Wachstum, Unit Economics (CAC, Payback)",
        "Kohorten und Retention",
        "Warum jetzt der Zeitpunkt zum Skalieren ist",
      ];
    default:
      return [
        "Ehrlich sagen: noch keine Traction – dafür Belege für das Problem: Interviews, Warteliste, Absichtserklärungen",
        "Welche Annahme du als Nächstes testest und bis wann",
      ];
  }
}

/* ------------------------------------------------------------------ */
/* Wahrscheinliche Fragen je Netzwerk-Rolle                            */
/* ------------------------------------------------------------------ */

function investorQuestions(c: PrepContext): PrepQuestion[] {
  const { first } = c;
  const verticals = c.user.verticals.length > 0 ? c.user.verticals.join(", ") : "dein Vertical";
  return [
    {
      question: "Wie viel Traction habt ihr schon – Nutzer:innen, Umsatz, Pilotkund:innen?",
      why: why(c, `Investor:innen prüfen zuerst, ob der Markt schon reagiert hat. ${c.followUp}`),
      suggestedAnswerOutline: bullets([...tractionOutline(c), ideaLine(c)]),
    },
    {
      question: "Wie groß ist der Markt – und warum ist jetzt der richtige Zeitpunkt?",
      why: why(
        c,
        "Ein Investment muss ein großes Ergebnis ermöglichen; „warum jetzt“ zeigt, ob du den Timing-Hebel (Technologie, Regulierung, Verhalten) verstanden hast.",
      ),
      suggestedAnswerOutline: bullets([
        `Marktgröße bottom-up für ${verticals}: Anzahl Kund:innen × realistischer Preis`,
        "Was sich in den letzten 12–24 Monaten verändert hat, sodass die Idee erst jetzt funktioniert",
        ideaLine(c),
      ]),
    },
    {
      question: "Was fehlt euch im Team – und wie schließt ihr die Lücke?",
      why: why(
        c,
        `Investor:innen investieren in Teams, nicht in Ideen. Wer die eigenen Lücken kennt und einen Plan hat, wirkt auf ${first} reifer als jemand, der angeblich keine hat.`,
        true,
      ),
      suggestedAnswerOutline: bullets([
        strengthsLine(c),
        gapLine(c),
        c.wantedRoles ? `Gesuchte Team-Rollen: ${c.wantedRoles} – Stand der Suche` : "Falls du allein bist: warum, und wie du das änderst",
      ]),
    },
    {
      question: "Wie lange reicht euer Geld – und wie viel wollt ihr aufnehmen?",
      why: why(
        c,
        `Runway sagt ${first}, wie viel Verhandlungsdruck du hast; die Ticketgröße, ob du überhaupt ins Portfolio passt.`,
      ),
      suggestedAnswerOutline: bullets([
        "Runway in Monaten – ehrlich, inklusive Gehälter",
        "Zielsumme und welcher Meilenstein damit erreicht wird",
        "Wer schon investiert hat oder im Gespräch ist – ohne zu übertreiben",
      ]),
    },
    {
      question: "Wofür genau verwendet ihr das Kapital?",
      why: why(c, `Use of Funds zeigt, ob du Prioritäten setzen kannst. ${c.followUp}`),
      suggestedAnswerOutline: bullets([
        "Drei Blöcke mit grober Verteilung: Team, Produkt, Vertrieb/Marketing",
        `Welcher Meilenstein damit erreicht wird (Ziel: nächste Runde oder Profitabilität) – ausgehend von: ${c.stageLabel}`,
        "Was du bewusst NICHT machst",
      ]),
    },
    {
      question: "Wer sind die Wettbewerber – und warum gewinnt ihr?",
      why: why(
        c,
        "Niemand glaubt „wir haben keine Konkurrenz“. Investor:innen wollen sehen, dass du den Markt kennst und einen unfairen Vorteil hast.",
      ),
      suggestedAnswerOutline: bullets([
        "2–3 echte Wettbewerber (inklusive Status quo, z. B. Excel) und was sie gut machen",
        `Dein unfairer Vorteil: ${c.user.strengths.length > 0 ? c.user.strengths.join(", ") : "Team, Zugang, Technologie oder Geschwindigkeit"}`,
        "Warum sie dich nicht einfach kopieren können",
      ]),
    },
    {
      question: "Warum bist gerade du die richtige Person dafür?",
      why: why(
        c,
        `Founder-Market-Fit: ${first} sucht Gründer:innen, die das Problem persönlich kennen und durchhalten.`,
        true,
      ),
      suggestedAnswerOutline: bullets([
        `Dein Hintergrund: ${c.user.headline || "Rolle, Erfahrung, persönliche Berührung mit dem Problem"}`,
        strengthsLine(c),
        strongDimsLine(c),
      ]),
    },
  ];
}

function cofounderQuestions(c: PrepContext): PrepQuestion[] {
  const { first } = c;
  const complementaryLine =
    c.complementary.length > 0
      ? `Komplementär: ${first} ist stark in ${dimLabels(c.complementary.slice(0, 2))}${mineClause(c)}`
      : c.profileStrong.length > 0
        ? `Stärkenvergleich: ${first} ist stark in ${dimLabels(c.profileStrong)}${mineClause(c)} – sag ehrlich, wo ihr euch überschneidet`
        : "Stärkenvergleich: Sag ehrlich, wo ihr euch ergänzt und wo ihr euch überschneidet";
  return [
    {
      question: "Bist du Vollzeit dabei – und ab wann?",
      why: why(
        c,
        "Für Co-Founder ist Commitment die erste Frage: Wer selbst alles auf eine Karte setzt, will kein Nebenprojekt.",
      ),
      suggestedAnswerOutline: bullets([
        "Dein Status: Vollzeit / nebenbei / ab wann Vollzeit",
        "Dein persönlicher Runway – wie lange kommst du ohne Gehalt aus",
        "Was du in den letzten vier Wochen konkret für die Idee getan hast",
      ]),
    },
    {
      question: "Wie stellst du dir die Equity-Aufteilung vor?",
      why: why(c, `Unklare Vorstellungen kosten später die Firma. ${first} testet, ob du fair und durchdacht bist.`),
      suggestedAnswerOutline: bullets([
        "Dein Vorschlag: gleichberechtigt vs. nach Beitrag (Zeit, Kapital, Idee) – mit Begründung",
        "Vesting als Standard vorschlagen: 4 Jahre, 1 Jahr Cliff",
        "Offen bleiben: „Lass uns das nach zwei bis drei gemeinsamen Arbeitswochen konkret machen“",
      ]),
    },
    {
      question: "Wer macht was – wie teilen wir die Rollen auf?",
      why: why(
        c,
        `Überschneidungen führen zu Reibung, Lücken zu Chaos. ${first} will wissen, ob du deine Rolle kennst. ${c.followUp}`,
        true,
      ),
      suggestedAnswerOutline: bullets([
        `Deine Rolle: ${c.userRoleLabel || "noch offen – gib eine klare Tendenz"}${c.userStrong.length > 0 ? `, stark in ${dimLabels(c.userStrong)}` : ""}`,
        `Was du dir von ${first} wünschst: ${
          c.wantedRoles ||
          (c.userWeak.length > 0
            ? `die Bereiche, in denen du schwächer bist (${dimLabels(c.userWeak)})`
            : "die Bereiche, die dir fehlen – vorher festlegen")
        }`,
        "Wer bei Uneinigkeit in welchem Bereich das letzte Wort hat",
      ]),
    },
    {
      question: "Was ist deine Vision – wo steht das Ganze in fünf Jahren?",
      why: why(
        c,
        `Co-Founder binden sich für Jahre. ${first} will spüren, ob die Ambition zu den eigenen passt${c.persType === "visionary" ? " – und ob sie groß genug ist" : ""}.`,
      ),
      suggestedAnswerOutline: bullets([
        ideaLine(c),
        "Warum dieses Problem – deine persönliche Verbindung dazu",
        "Wie die Welt aussieht, wenn es funktioniert: ein konkretes Bild, keine Zahlenwüste",
      ]),
    },
    {
      question: "Wie gehst du mit Konflikten um?",
      why: why(
        c,
        `Der häufigste Grund fürs Scheitern ist Streit im Team. ${first} sucht ein Signal, dass ihr auch harte Gespräche führen könnt.`,
      ),
      suggestedAnswerOutline: bullets([
        "Ein konkretes Beispiel für einen Konflikt, den du gelöst hast",
        "Regeln vorschlagen: Entscheidungshoheit pro Bereich, wöchentlicher Check-in, Uneinigkeit früh ansprechen",
        "Was du brauchst, um Kritik gut anzunehmen",
      ]),
    },
    {
      question: "Warum ich – warum willst du ausgerechnet mit mir gründen?",
      why: why(c, `Niemand will zweite Wahl sein. ${first} will hören, dass du dich mit dem Profil beschäftigt hast.`, true),
      suggestedAnswerOutline: bullets([
        complementaryLine,
        c.sharedVerticals.length > 0
          ? `Gemeinsames Vertical: ${c.sharedVerticals.join(", ")}`
          : "Was dich am Blick auf den Markt reizt – auch wenn eure Verticals sich unterscheiden",
        c.bgShort ? `Was dich am Hintergrund überzeugt: ${c.bgShort}` : "Was dich am Werdegang überzeugt – konkret benennen",
      ]),
    },
    {
      question: "Wie weit bist du – und was hast du bisher allein geschafft?",
      why: why(
        c,
        "Umsetzungskraft lässt sich nicht behaupten, nur zeigen. Wer allein schon Dinge bewegt hat, ist als Partner:in glaubwürdig.",
      ),
      suggestedAnswerOutline: bullets([
        stageLine(c),
        "Was konkret existiert: Prototyp, Gespräche, erste Nutzer:innen, Zahlen",
        strengthsLine(c),
      ]),
    },
  ];
}

function mentorQuestions(c: PrepContext): PrepQuestion[] {
  const { first } = c;
  return [
    {
      question: "Was genau brauchst du von mir?",
      why: why(
        c,
        "Mentor:innen haben wenig Zeit und viele Anfragen. Eine konkrete Frage ist der Unterschied zwischen Kaffee trinken und Mentoring.",
      ),
      suggestedAnswerOutline: bullets([
        "1–2 konkrete Entscheidungen, die in den nächsten Wochen anstehen",
        c.bgShort ? `Warum ${first}: Bezug zu ${c.bgShort}` : `Warum ${first} – was dich am Werdegang anspricht`,
        "Was du NICHT brauchst (z. B. Intros oder Geld) – das entspannt das Gespräch",
      ]),
    },
    {
      question: "Was hast du schon probiert?",
      why: why(c, `${first} will nicht bei null anfangen und prüft, ob du selbst arbeitest, bevor du fragst.`, true),
      suggestedAnswerOutline: bullets([
        "Die 2–3 Dinge, die du getestet hast, und was dabei herauskam",
        "Wo es aktuell hakt – so konkret wie möglich",
        "Deine eigene Hypothese, woran es liegt",
      ]),
    },
    {
      question: "Wo stehst du gerade – und was ist das nächste Ziel?",
      why: why(c, `Ohne Kontext gibt es keinen guten Rat. ${c.followUp}`),
      suggestedAnswerOutline: bullets([stageLine(c), ideaLine(c), "Nächster Meilenstein in 90 Tagen – messbar"]),
    },
    {
      question: "Wie viel Zeit stellst du dir vor – und wie regelmäßig?",
      why: why(c, `Mentoring scheitert an unklaren Erwartungen. ${first} will wissen, worauf man sich einlässt.`),
      suggestedAnswerOutline: bullets([
        "Vorschlag: 30–45 Minuten alle 2–4 Wochen; du bereitest vor und fasst nach",
        "Du kommst mit Fragen, nicht mit Status-Updates",
        "Nach drei Monaten gemeinsam prüfen, ob es beiden etwas bringt",
      ]),
    },
    {
      question: "Was ist deine größte Unsicherheit?",
      why: why(c, "Gute Mentor:innen helfen bei dem, was du selbst nicht siehst. Ehrlichkeit hier öffnet das Gespräch."),
      suggestedAnswerOutline: bullets([
        gapLine(c),
        "Eine Sache, vor der du dich gerade drückst",
        `${strengthsLine(c)} – damit ${first} weiß, wo kein Rat nötig ist`,
      ]),
    },
    {
      question: "Warum ich als Mentor:in – und was hast du mit Feedback bisher gemacht?",
      why: why(c, `${first} will nicht austauschbar sein und prüft, ob du Rat auch umsetzt.`, true),
      suggestedAnswerOutline: bullets([
        c.bgShort ? `Bezug zum Hintergrund: ${c.bgShort}` : "Bezug zum Werdegang – konkret benennen",
        "Ein Beispiel, wo du Feedback bekommen und umgesetzt hast",
        "Wie du Fortschritt zurückmeldest (kurze Nachricht nach jedem Schritt)",
      ]),
    },
  ];
}

function talentQuestions(c: PrepContext): PrepQuestion[] {
  const { first } = c;
  const roleLabel =
    c.wantedRoles || (c.profile.founderRole ? FOUNDER_ROLE_LABELS[c.profile.founderRole] ?? c.profile.founderRole : "");
  return [
    {
      question: "Welche Rolle genau – und was würde ich in den ersten 90 Tagen bauen?",
      why: why(c, `Talente wollen Ownership, keine vagen „Das finden wir zusammen heraus“. ${c.followUp}`),
      suggestedAnswerOutline: bullets([
        `Rolle: ${roleLabel || "konkret benennen (Titel, Verantwortung)"}`,
        "Die ersten drei konkreten Aufgaben oder Ergebnisse",
        "Wer entscheidet was – wie viel Freiheit gibt es",
      ]),
    },
    {
      question: "Wie sieht das Gehalt aus – und gibt es Anteile (ESOP/VSOP)?",
      why: why(c, `Ein Startup-Wechsel ist ein Risiko. ${first} rechnet: Fixgehalt gegen Upside.`),
      suggestedAnswerOutline: bullets([
        `Gehaltsrange, die zu deiner Phase (${c.stageLabel}) passt – lieber ehrlich als hoch`,
        "Anteile: Größenordnung, Vesting (4 Jahre / 1 Jahr Cliff), was das realistisch wert sein könnte",
        "Wann Gehälter angepasst werden (z. B. nach der nächsten Runde)",
      ]),
    },
    {
      question: "Wie lange reicht euer Geld?",
      why: why(c, "Niemand will in sechs Monaten wieder suchen. Transparenz beim Runway baut Vertrauen auf."),
      suggestedAnswerOutline: bullets([
        "Runway in Monaten und Finanzierungsplan",
        "Was passiert, wenn die Runde später kommt",
        "Welche Meilensteine die nächste Finanzierung sichern",
      ]),
    },
    {
      question: "Mit welchem Tech-Stack und welchen Tools arbeitet ihr?",
      why: why(c, `${first} will einschätzen, ob die eigenen Skills passen und ob es eine Lernkurve gibt.`, true),
      suggestedAnswerOutline: bullets([
        `Aktueller Stack – und was noch offen ist${c.user.strengths.length > 0 ? ` (du bringst mit: ${c.user.strengths.join(", ")})` : ""}`,
        c.sharedSkills.length > 0
          ? `Gemeinsame Skills als Anknüpfung: ${c.sharedSkills.join(", ")}`
          : `Prüf vorher, was ${first} im Profil an Skills listet, und knüpf daran an`,
        "Wo Talent den Stack mitprägen darf",
      ]),
    },
    {
      question: "Wie arbeitet ihr – Kultur, Remote, Entscheidungen?",
      why: why(
        c,
        `Kultur entscheidet, ob jemand bleibt. ${c.persType === "connector" ? `${first} achtet besonders darauf, wer sonst im Team ist.` : `${first} will wissen, wie sich der Alltag anfühlt.`}`,
      ),
      suggestedAnswerOutline: bullets([
        "Arbeitsrhythmus: Remote/Office, Kernzeiten, Meetings",
        "Wie Entscheidungen fallen und wie Feedback läuft",
        "Drei Werte, die du wirklich lebst – mit Beispiel",
      ]),
    },
    {
      question: "Warum sollte ich zu euch statt zu einem Konzern oder Scale-up?",
      why: why(c, `${first} hat Alternativen. Die Frage testet, ob du die Mission überzeugend erklären kannst.`),
      suggestedAnswerOutline: bullets([
        ideaLine(c),
        "Lernkurve und Ownership konkret machen",
        "Was ihr in zwölf Monaten erreicht haben wollt",
      ]),
    },
  ];
}

function expertQuestions(c: PrepContext): PrepQuestion[] {
  const { first } = c;
  return [
    {
      question: "Was ist das konkrete Problem, das ich lösen soll?",
      why: why(
        c,
        `Expert:innen denken in Problemen, nicht in Visionen. Je schärfer die Frage, desto schneller kann ${first} einschätzen, ob es ins Fachgebiet passt.`,
        true,
      ),
      suggestedAnswerOutline: bullets([
        "Problem in zwei Sätzen: Was, für wen, warum jetzt",
        "Woran du merkst, dass es gelöst ist (Erfolgskriterium)",
        ideaLine(c),
      ]),
    },
    {
      question: "Welches Budget und welcher Zeitrahmen?",
      why: why(c, `Ohne Budgetrahmen keine ernsthafte Diskussion. ${first} will wissen, ob es ein Gespräch oder ein Auftrag ist.`),
      suggestedAnswerOutline: bullets([
        "Budgetrahmen (auch wenn klein) oder alternative Vergütung: Advisor-Shares, Referenz",
        "Zeitrahmen und Deadline",
        "Umfang: Sparring, Workshop oder Umsetzung",
      ]),
    },
    {
      question: "Was habt ihr schon versucht – und wo hakt es?",
      why: why(c, `Verhindert, dass ${first} Offensichtliches vorschlägt. ${c.followUp}`),
      suggestedAnswerOutline: bullets([
        "Bisherige Versuche und Ergebnisse",
        "Deine aktuelle Vermutung, woran es liegt",
        "Welches Material du mitbringen kannst (Daten, Dokumente)",
      ]),
    },
    {
      question: "Welche Rolle hätte ich – Beratung, Umsetzung oder Advisor?",
      why: why(c, "Klärt Erwartungen und mögliche Interessenkonflikte, bevor Zeit investiert wird."),
      suggestedAnswerOutline: bullets([
        "Dein Wunschmodell (z. B. zwei Stunden pro Woche Sparring, Advisory Board)",
        "Was du im Gegenzug bietest",
        "Wie lange – Pilot über 4–6 Wochen vorschlagen",
      ]),
    },
    {
      question: "Wo steht ihr – und was ist das Ziel für die nächsten drei Monate?",
      why: why(c, `Kontext bestimmt die Empfehlung. ${first} will die Stufe kennen, auf der ihr steht.`),
      suggestedAnswerOutline: bullets([stageLine(c), "Meilenstein in 90 Tagen", strengthsLine(c)]),
    },
    {
      question: "Wer entscheidet bei euch – und wie schnell?",
      why: why(c, `Expert:innen haben schlechte Erfahrungen mit endlosen Abstimmungen. ${first} testet, ob du handeln kannst.`),
      suggestedAnswerOutline: bullets([
        "Du entscheidest / das Team – klar benennen",
        "Wie schnell du zurückmeldest",
        "Nächsten Schritt mit Datum vorschlagen",
      ]),
    },
  ];
}

const QUESTIONS_BY_ROLE: Record<NetworkRole, (c: PrepContext) => PrepQuestion[]> = {
  investor: investorQuestions,
  cofounder: cofounderQuestions,
  mentor: mentorQuestions,
  talent: talentQuestions,
  expert: expertQuestions,
};

/* ------------------------------------------------------------------ */
/* Gesprächsaufhänger, Eisbrecher, Red Flags, Persönlichkeit           */
/* ------------------------------------------------------------------ */

function talkingPointForReason(reason: MatchReason, c: PrepContext): string {
  const { first } = c;
  switch (reason.label) {
    case "Gesuchte Rolle":
      return `Du suchst ${NETWORK_ROLE_LABELS[c.role]}, ${first} ist genau das – sag früh und klar, was du dir von dem Gespräch erhoffst.`;
    case "Fehlende Team-Rolle":
      return `${first} deckt die Rolle „${c.profile.founderRole ? FOUNDER_ROLE_LABELS[c.profile.founderRole] : "?"}“ ab, die dir im Team fehlt – erklär, warum genau diese Rolle für dich jetzt Priorität hat.`;
    case "Gleiches Vertical":
      return `Gemeinsames Vertical ${c.sharedVerticals.join(", ")}: Frag, welche Entwicklung ${first} dort gerade spannend findet, und teile deine Sicht${c.idea ? ` auf „${c.idea}“` : ""}.`;
    case "Komplementäre Stärken": {
      const theirs = c.complementary.length > 0 ? c.complementary.slice(0, 2) : c.profileStrong;
      return theirs.length > 0
        ? `${first} ist stark in ${dimLabels(theirs)}${mineClause(c)} – ein natürlicher Aufhänger für „Wie würden wir uns ergänzen?“.`
        : `${first} ergänzt deine schwächeren Dimensionen (${c.match.complementarity} %) – ein natürlicher Aufhänger für „Wie würden wir uns ergänzen?“.`;
    }
    case "Sucht jemanden wie dich":
      return `${first} sucht ${c.profile.lookingFor.join(", ")} – benenne offen, dass du genau das mitbringst${c.userRoleLabel ? ` (${c.userRoleLabel})` : ""}.`;
    case "Gleiche Phase":
      return `Ihr seid beide in der Phase „${c.stageLabel}“ – vergleicht, was gerade am meisten Zeit frisst.`;
    case "Offen für Ideen":
      return `Du bist offen für neue Ideen – frag ${first}, welches Problem gerade am meisten reizt, statt nur deins zu pitchen.`;
    default:
      return reason.detail;
  }
}

function buildTalkingPoints(c: PrepContext): string[] {
  const { first } = c;
  const points = c.match.reasons.map((r) => talkingPointForReason(r, c));

  if (c.eventNames[0]) {
    points.push(
      `Anknüpfungspunkt ${c.eventNames[0]}: Frag, was ${first} sich von dem Event erhofft, und bring dein Anliegen in einem Satz unter.`,
    );
  }
  if (c.sharedSkills.length > 0) {
    points.push(`Gemeinsame Skills (${c.sharedSkills.join(", ")}): fachlich auf Augenhöhe einsteigen, dann zum Anliegen kommen.`);
  }

  const generic: Record<NetworkRole, string> = {
    investor: "Nenn eine Zahl, die man sich merkt (Nutzer:innen, Umsatz, Wachstum) – und die Story dahinter.",
    cofounder: "Erzähl, wie du in den letzten Wochen konkret gearbeitet hast – Tempo und Arbeitsstil sagen mehr als Pläne.",
    mentor: "Bring eine konkrete Entscheidung mit, bei der du gerade hängst – Mentor:innen springen auf konkrete Probleme an.",
    talent: "Beschreib die Rolle als Lernkurve und Ownership, nicht als Stellenausschreibung.",
    expert: `Formuliere das Problem so scharf, dass ${first} sofort einschätzen kann, ob es ins Fachgebiet passt.`,
  };
  const fallbacks = [
    generic[c.role],
    c.idea
      ? `Deine Idee in einem Satz: „${c.idea}“ – üb den Satz, bis er ohne Nachdenken kommt.`
      : "Deine Idee in einem Satz – formuliere ihn vorher aus und üb ihn.",
    `Frag ${first} nach dem aktuellen Fokus, bevor du pitchst – Zuhören öffnet mehr Türen als Reden.`,
    "Schließ mit einem konkreten nächsten Schritt ab: Termin, Intro oder Material, das du nachschickst.",
  ];

  const result = uniq(points).slice(0, 6);
  return result.length >= 4 ? result : fill(result, fallbacks, 4);
}

function buildIceBreakers(c: PrepContext): string[] {
  const { profile } = c;
  const out: string[] = [];

  const exp = profile.experience[0];
  if (exp?.title && exp.company) {
    out.push(
      exp.end
        ? `Du warst ${exp.title} bei ${exp.company} – was hast du von dort mitgenommen, das du heute noch täglich nutzt?`
        : `Du bist ${exp.title} bei ${exp.company} – was hat dich dahin gezogen, und was hält dich dort?`,
    );
  }
  const older = profile.experience.find((e, i) => i > 0 && Boolean(e.company) && e.company !== exp?.company);
  if (older && exp?.company) {
    out.push(`Von ${older.company} zu ${exp.company} – was war der Auslöser für den Wechsel?`);
  }

  const edu = profile.education[0];
  if (edu?.school) {
    const subject = edu.field || edu.degree;
    out.push(
      subject
        ? `Du hast ${subject} studiert (${edu.school}) – wie viel davon steckt heute noch in deiner Arbeit?`
        : `Wie hat dich die Zeit an der Hochschule (${edu.school}) geprägt – eher fachlich oder durch die Leute?`,
    );
  }

  const about = firstSentence(profile.about);
  if (about) out.push(`In deinem Profil steht „${about}“ – was steckt dahinter?`);

  const fallbacks = [
    c.eventNames[0] ? `Was ist dein Ziel für ${c.eventNames[0]} – wen willst du dort unbedingt treffen?` : "",
    profile.location ? `Wie erlebst du gerade die Startup-Szene in ${profile.location}?` : "",
    c.sharedVerticals[0] ? `Was ist für dich gerade das spannendste Thema in ${c.sharedVerticals[0]}?` : "",
    profile.skills[0] ? `Du listest ${profile.skills[0]} als Skill – Leidenschaft oder Werkzeug?` : "",
    "Was war in den letzten Monaten die beste Entscheidung, die du getroffen hast?",
    "Woran arbeitest du gerade, das dich wirklich begeistert?",
    "Was hat dich ursprünglich in die Startup-Welt gezogen?",
  ];

  // Reihenfolge: Erfahrung, Ausbildung, Über-mich – dann auffüllen.
  return fill(out, fallbacks, 3);
}

const ROLE_RED_FLAGS: Record<NetworkRole, (c: PrepContext) => string[]> = {
  investor: (c) => [
    `Investiert ${c.first} wirklich in deiner Phase (${c.stageLabel})? Frag nach den letzten drei Deals und Ticketgrößen.`,
    "Wie schnell wird entschieden – und wer entscheidet mit? Ein „spannend, bleiben wir in Kontakt“ ist noch kein Interesse.",
    "Passives Interesse vs. echte Zusage: Frag nach konkreten nächsten Schritten mit Datum.",
  ],
  cofounder: (c) => [
    `Kann ${c.first} wirklich Vollzeit? Frag nach Kündigungsfrist, finanziellem Puffer und laufenden Verpflichtungen.`,
    "Equity-Erwartung offen ansprechen – vage oder ausweichende Antworten sind ein Warnsignal.",
    `Passt das Tempo? Frag, wie ${c.first} in den letzten Wochen Entscheidungen getroffen hat und was dabei herauskam.`,
  ],
  mentor: (c) => [
    `Hat ${c.first} Zeit oder nur Interesse? Klär Rhythmus und Format (z. B. 30 Minuten alle zwei Wochen).`,
    `Erwartet ${c.first} eine Gegenleistung (Advisor-Shares, Honorar)? Lieber früh klären als spät überrascht werden.`,
    "Ist die Erfahrung noch aktuell für deinen Markt – oder zehn Jahre alt?",
  ],
  talent: (c) => [
    `Warum sucht ${c.first} gerade? Wechselgrund und Erwartungen an das Startup-Risiko klären.`,
    "Gehaltsvorstellung gegen deinen Runway rechnen – ist das realistisch, ohne dass es nach drei Monaten kracht?",
    `Will ${c.first} bauen oder verwalten – und passt das zur Rolle, die du wirklich besetzen musst?`,
  ],
  expert: (c) => [
    `Berät ${c.first} viele parallel? Klär Verfügbarkeit und Reaktionszeiten, bevor du planst.`,
    "Kosten und Umfang vorab festlegen – keine offenen Stunden ohne Deckel.",
    `Interessenkonflikte: Berät ${c.first} auch Wettbewerber? Direkt fragen.`,
  ],
};

function buildRedFlags(c: PrepContext): string[] {
  const fromMatch = c.match.risks.map((r) => `Aus dem Matching: ${r}`);
  return fill(fromMatch, ROLE_RED_FLAGS[c.role](c), 3);
}

function buildPersonalityNotes(c: PrepContext): string[] {
  const notes = CONVERSATION_NOTES[c.persType](c.first);
  const style = c.profile.personality?.communicationStyle?.trim();
  if (style) notes.push(`Kommunikationsstil laut Profil-Analyse: ${style}`);
  const avoid = (c.profile.personality?.avoid ?? []).filter(Boolean).slice(0, 2);
  if (avoid.length > 0) notes.push(`Vermeide: ${avoid.join("; ")}`);
  return notes.slice(0, 4);
}

/* ------------------------------------------------------------------ */
/* Öffentliche API                                                     */
/* ------------------------------------------------------------------ */

/** Regelbasiertes Prep-Pack – funktioniert ohne LLM und ist der Fallback für /api/prep. */
export function buildPrepTemplate(user: UserContext, profile: Profile): PrepPack {
  const c = buildContext(user, profile);
  return {
    profileId: profile.id,
    likelyQuestions: QUESTIONS_BY_ROLE[c.role](c).slice(0, 7),
    talkingPoints: buildTalkingPoints(c),
    iceBreakers: buildIceBreakers(c),
    redFlagsToProbe: buildRedFlags(c),
    personalityNotes: buildPersonalityNotes(c),
    generatedBy: "template",
  };
}

/** Grenzen je Feld (min, max) – für Prompt und Normalisierung der LLM-Antwort. */
export const PREP_LIMITS = {
  likelyQuestions: [5, 7],
  talkingPoints: [4, 6],
  iceBreakers: [3, 3],
  redFlagsToProbe: [3, 3],
  personalityNotes: [2, 4],
} as const;

/** JSON-Schema für Structured Outputs (strict: alle Felder required, keine Zusatzfelder). */
export const PREP_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    likelyQuestions: {
      type: "array",
      description: "5–7 Fragen, die die Gesprächspartner:in wahrscheinlich stellen wird.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          question: { type: "string", description: "Die Frage wörtlich, so wie die Person sie stellen würde." },
          why: {
            type: "string",
            description: "Warum die Person das fragt – aus ihrer Sicht, mit Bezug auf Persönlichkeitstyp und Hintergrund.",
          },
          suggestedAnswerOutline: {
            type: "string",
            description: "3–5 Stichpunkte für die Antwort der Nutzer:in, jeder beginnt mit „• “, getrennt durch Zeilenumbruch.",
          },
        },
        required: ["question", "why", "suggestedAnswerOutline"],
      },
    },
    talkingPoints: { type: "array", description: "4–6 Gesprächsaufhänger.", items: { type: "string" } },
    iceBreakers: { type: "array", description: "Genau 3 lockere Einstiegsfragen.", items: { type: "string" } },
    redFlagsToProbe: {
      type: "array",
      description: "Genau 3 Punkte, die die Nutzer:in kritisch nachfragen sollte.",
      items: { type: "string" },
    },
    personalityNotes: {
      type: "array",
      description: "2–4 Sätze, wie das Gespräch mit diesem Persönlichkeitstyp läuft.",
      items: { type: "string" },
    },
  },
  required: ["likelyQuestions", "talkingPoints", "iceBreakers", "redFlagsToProbe", "personalityNotes"],
};

export function prepSystemPrompt(): string {
  return [
    "Du bist Sparringspartner:in für Gründer:innen und bereitest sie auf ein Networking-Gespräch vor.",
    "Motto: „Wenn du mit dieser Person redest, wird sie wahrscheinlich das von dir wissen wollen.“",
    "",
    "Aufgabe: Aus dem Kontext der Nutzer:in und dem Profil der Gesprächspartner:in ein Prep-Pack erstellen.",
    "",
    "Regeln:",
    "- Sprache: Deutsch, du-Form gegenüber der Nutzer:in, konkret, keine Floskeln, keine Emojis.",
    "- likelyQuestions: 5–7 Fragen, die die Person realistisch stellen wird – passend zu ihrer Rolle im Netzwerk:",
    "  investor → Traction, Markt, Team-Lücken, Runway, warum jetzt, Verwendung des Kapitals;",
    "  cofounder → Commitment/Vollzeit, Equity-Vorstellung, Rollenaufteilung, Vision, Umgang mit Konflikten, warum ich;",
    "  mentor → was genau brauchst du, was hast du schon probiert, wo stehst du;",
    "  talent → Rolle, Gehalt/ESOP, Runway, Tech-Stack, Kultur;",
    "  expert → konkretes Problem, Budget, was wurde schon versucht.",
    "  - question: wörtlich, so wie die Person fragen würde.",
    "  - why: aus Sicht der Person – warum ist ihr das wichtig? Mit Bezug auf Persönlichkeitstyp, Hintergrund (Erfahrung, Ausbildung) und das, was sie sucht.",
    "  - suggestedAnswerOutline: 3–5 Stichpunkte, jeder beginnt mit „• “, getrennt durch Zeilenumbruch. Nutze den Kontext der Nutzer:in (Idee, Stärken, Phase, Selbsteinschätzung). Fehlt eine Info, formuliere den Punkt als Hausaufgabe („Vorher klären: …“) – erfinde nichts.",
    "- talkingPoints: 4–6 Gesprächsaufhänger – gemeinsame Verticals, Events, komplementäre Stärken (siehe Matching-Gründe), gemeinsame Skills.",
    "- iceBreakers: genau 3 lockere Einstiegsfragen, die auf Erfahrung, Ausbildung oder „Über mich“ der Person anspielen.",
    "- redFlagsToProbe: genau 3 Punkte, die die Nutzer:in kritisch nachfragen sollte – aus den Matching-Risiken und typischen Risiken der Rolle.",
    "- personalityNotes: 2–4 Sätze, wie das Gespräch mit diesem Persönlichkeitstyp läuft (Tempo, Ton, was überzeugt, was nervt).",
    "- Antworte ausschließlich mit JSON nach dem vorgegebenen Schema.",
  ].join("\n");
}

function describeDims(dims: FounderDims): string {
  return FOUNDER_DIM_KEYS.map((k) => `${FOUNDER_DIM_LABELS[k]} ${dims[k]}/10`).join(", ");
}

function list(items: string[] | undefined, empty = "–"): string {
  const clean = (items ?? []).map((s) => s.trim()).filter(Boolean);
  return clean.length > 0 ? clean.join(", ") : empty;
}

export function prepUserPrompt(user: UserContext, profile: Profile): string {
  const c = buildContext(user, profile);
  const u = c.user;
  const p = c.profile;

  const experience = p.experience
    .slice(0, 5)
    .map(
      (e) =>
        `- ${e.title} @ ${e.company} (${e.start}${e.end ? `–${e.end}` : "–heute"})${e.description ? `: ${truncate(e.description, 160)}` : ""}`,
    );
  const education = p.education
    .slice(0, 3)
    .map(
      (e) =>
        `- ${e.school}${e.degree ? `, ${e.degree}` : ""}${e.field ? ` (${e.field})` : ""}${e.start || e.end ? ` ${e.start ?? ""}–${e.end ?? ""}` : ""}`,
    );

  const lines = [
    "## Nutzer:in (bereitet sich vor)",
    `Name: ${u.name || "–"}`,
    `Headline: ${u.headline || "–"}`,
    `Rolle im Gründerteam: ${c.userRoleLabel || "–"}`,
    `Sucht: ${list(u.lookingFor.map((r) => NETWORK_ROLE_LABELS[r] ?? r))}`,
    `Fehlende Team-Rollen: ${c.wantedRoles || "–"}`,
    `Verticals: ${list(u.verticals)}`,
    `Phase: ${c.stageLabel}`,
    `Idee: ${u.idea || "– (noch nicht beschrieben)"}`,
    `Offen für andere Ideen: ${u.openToIdeas ? "ja" : "nein"}`,
    `Stärken: ${list(u.strengths)}`,
    `Selbsteinschätzung: ${describeDims(u.dims)}`,
    u.notes ? `Notizen aus dem Interview: ${truncate(u.notes, 600)}` : "",
    "",
    "## Gesprächspartner:in",
    `Name: ${p.name}`,
    `Headline: ${p.headline || "–"}`,
    `Ort: ${p.location || "–"}`,
    `Rolle im Netzwerk: ${NETWORK_ROLE_LABELS[c.role]} (${c.role})`,
    `Team-Rolle: ${p.founderRole ? FOUNDER_ROLE_LABELS[p.founderRole] ?? p.founderRole : "–"}`,
    `Sucht: ${list(p.lookingFor)}`,
    `Verticals: ${list(p.verticals)}`,
    `Phase: ${p.stage ? STAGE_LABELS[p.stage] ?? p.stage : "–"}`,
    `Skills: ${list(p.skills.slice(0, 12))}`,
    `Events: ${list(c.eventNames)}`,
    `Dimensionen: ${describeDims(p.dims)}`,
    `Persönlichkeitstyp: ${c.persLabel} (${c.persType})`,
    p.personality?.summary ? `Zusammenfassung: ${p.personality.summary}` : "",
    `Traits: ${list(p.personality?.traits)}`,
    p.personality?.communicationStyle ? `Kommunikationsstil: ${p.personality.communicationStyle}` : "",
    `Outreach-Tipps: ${list(p.personality?.outreachTips)}`,
    `Vermeiden: ${list(p.personality?.avoid)}`,
    "Erfahrung:",
    ...(experience.length > 0 ? experience : ["- –"]),
    "Ausbildung:",
    ...(education.length > 0 ? education : ["- –"]),
    `Über mich: ${p.about ? truncate(p.about, 800) : "–"}`,
    "",
    "## Regelbasiertes Matching (deterministisch berechnet)",
    `Score: ${c.match.score}/100, Komplementarität der Stärken: ${c.match.complementarity}%`,
    "Gründe:",
    ...(c.match.reasons.length > 0 ? c.match.reasons.map((r) => `- ${r.label}: ${r.detail}`) : ["- –"]),
    "Risiken:",
    ...(c.match.risks.length > 0 ? c.match.risks.map((r) => `- ${r}`) : ["- –"]),
    "",
    "## Aufgabe",
    `Erstelle das Prep-Pack für das Gespräch mit ${p.name} als JSON gemäß Schema.`,
  ];

  // Leere Zeilen aus optionalen Feldern entfernen; eine Leerzeile bleibt nur direkt vor einer Überschrift.
  return lines.filter((line, i, arr) => line !== "" || arr[i + 1]?.startsWith("## ") === true).join("\n");
}

function isPrepQuestion(v: unknown): v is PrepQuestion {
  if (!v || typeof v !== "object") return false;
  const q = v as Record<string, unknown>;
  return (
    typeof q.question === "string" &&
    q.question.trim().length > 0 &&
    typeof q.why === "string" &&
    typeof q.suggestedAnswerOutline === "string"
  );
}

/**
 * Bringt eine (LLM-)Antwort in die PrepPack-Form: filtert Müll, hält die Längen ein und
 * füllt zu kurze Listen aus dem Template-Fallback auf.
 */
export function normalizePrepPack(raw: unknown, fallback: PrepPack, generatedBy: PrepPack["generatedBy"]): PrepPack {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const strings = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map((s) => s.trim()) : [];
  const pick = (own: string[], fb: string[], [min, max]: readonly [number, number]) =>
    (own.length >= min ? uniq(own) : uniq([...own, ...fb])).slice(0, max);

  const questions = Array.isArray(obj.likelyQuestions) ? obj.likelyQuestions.filter(isPrepQuestion) : [];
  const [qMin, qMax] = PREP_LIMITS.likelyQuestions;

  return {
    profileId: fallback.profileId,
    likelyQuestions: (questions.length >= qMin ? questions : [...questions, ...fallback.likelyQuestions]).slice(0, qMax),
    talkingPoints: pick(strings(obj.talkingPoints), fallback.talkingPoints, PREP_LIMITS.talkingPoints),
    iceBreakers: pick(strings(obj.iceBreakers), fallback.iceBreakers, PREP_LIMITS.iceBreakers),
    redFlagsToProbe: pick(strings(obj.redFlagsToProbe), fallback.redFlagsToProbe, PREP_LIMITS.redFlagsToProbe),
    personalityNotes: pick(strings(obj.personalityNotes), fallback.personalityNotes, PREP_LIMITS.personalityNotes),
    generatedBy,
  };
}
