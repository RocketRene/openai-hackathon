/**
 * Regelbasierter Interviewer – läuft OHNE LLM (Demo-Sicherheit ohne OPENAI_API_KEY). Zweisprachig DE/EN.
 * ---------------------------------------------------------------
 * - Interview: fragt anhand fehlender Felder im UserContext die nächste Frage,
 *   extrahiert per Keywords einen userContextPatch aus der letzten Nutzer-Nachricht,
 *   erkennt „zeig mir / guck dir mal <Name> an" und schlägt nach genug Infos Top-3 vor.
 * - General: Suche/Anzeige/Vorschläge per Keywords.
 * - „bereite ein Interview/Gespräch mit <Name> vor" → Interview-Leitfaden (show_interview_guide).
 * - Prep-Simulation: spielt die Kandidat:in mit 3–4 typischen Fragen, „Feedback" beendet – ausdrücklich als Simulation gekennzeichnet.
 * Alle festen Texte liegen in `TEXTS` als { de, en }; die Auswahl erfolgt über `req.locale`.
 */
import { findProfileByName, getProfile, getProfiles, searchProfiles } from "@/lib/data";
import { rankCandidates } from "@/lib/matching";
import type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  FounderRole,
  InterviewGuide,
  NetworkRole,
  Profile,
  Stage,
  UiAction,
  UserContext,
} from "@/lib/types";
import {
  type AgentLocale,
  describeRole,
  EMPTY_USER_CONTEXT,
  firstName,
  founderRoleLabel,
  founderRolesIn,
  getMissingInterviewFields,
  hasEnoughForProposals,
  hasKeyword,
  interviewFieldLabel,
  likelyQuestionsFor,
  mergeUserContext,
  networkRoleLabel,
  networkRolesIn,
  normalizeAgentLocale,
  personalityLabel,
  verticalsIn,
  type InterviewField,
} from "./prompts";
import { buildInterviewGuide } from "./tools";

/* ------------------------------------------------------------------ */
/* Texte (DE/EN)                                                       */
/* ------------------------------------------------------------------ */

interface Texts {
  questions: Record<InterviewField, string>;
  shortRole: Record<FounderRole, string>;
  ackFounder: (role: string) => string;
  ackSeeks: (who: string, roles: string) => string;
  ackArea: (v: string) => string;
  ackStage: (s: string) => string;
  ackOpen: string;
  ackIdea: string;
  ackStrengths: (s: string) => string;
  hi: (name: string) => string;
  noted: (parts: string) => string;
  openerGeneral: string;
  openerKnown: string;
  openerInterview: (name: string, q: string) => string;
  notFound: (phrase: string) => string;
  multiple: (list: string) => string;
  showReply: (name: string, role: string, highlight: string, first: string, q: string) => string;
  searchNone: string;
  searchResults: (n: number, label: string, list: string) => string;
  contacts: string;
  inArea: (v: string) => string;
  noProfiles: (intro: string) => string;
  proposeLine: (i: number, name: string, role: string, score: number, why: string, first: string, q: string) => string;
  proposeOutro: string;
  solidMatch: string;
  unknownProfile: string;
  reactions: Record<string, string>;
  defaultReaction: string;
  simNeedPerson: string;
  simOpener: (name: string, headline: string, first: string, q: string) => string;
  simDone: (reaction: string) => string;
  simNudge: string;
  fbHead: (first: string) => string;
  fbGoodMany: string;
  fbGoodFew: string;
  fbBetterShort: string;
  fbBetterLong: string;
  fbReal: (first: string, type: string, style: string, tip: string) => string;
  fbDefaultStyle: string;
  fbDefaultType: string;
  fbDefaultTip: (q: string) => string;
  generalNeed: (need: string, q: string) => string;
  generalOffer: string;
  generalTellMore: string;
  generalHelp: string;
  topMatches: string;
  interviewEnough: (ack: string) => string;
  interviewSoon: (ack: string, need: string, q: string) => string;
  ok: string;
  and: string;
  prepAskName: string;
  prepMultiple: (list: string) => string;
  prepReply: (g: InterviewGuide, blocks: string, example: string, unknowns: string) => string;
}

const TEXTS: Record<AgentLocale, Texts> = {
  de: {
    questions: {
      founderRole: "Welche Rolle füllst du selbst im Gründerteam aus – eher Tech, Business/Commercial, Produkt, Design oder Operations?",
      lookingFor: "Wen suchst du gerade: Co-Founder (welche Rolle fehlt dir?), Investor:innen, Mentor:innen oder Talente?",
      verticals: "In welchem Bereich bewegst du dich – z. B. Fintech, Healthtech, B2B SaaS, AI, Climate?",
      idea: "Hast du schon eine konkrete Idee, oder bist du offen für Ideen? Erzähl kurz.",
      strengths: "Was sind deine drei größten Stärken – womit bringst du ein Team voran?",
      stage: "Wie weit bist du: noch in der Ideenphase, Pre-Seed, Seed oder schon weiter?",
    },
    shortRole: { tech: "Tech", commercial: "Business", product: "Produkt", design: "Design", operations: "Operations", "domain-expert": "Domain-Expert:in" },
    ackFounder: (role) => `du bist ${role}-Founder`,
    ackSeeks: (who, roles) => `du suchst ${who || "Co-Founder"}${roles ? ` (${roles})` : ""}`,
    ackArea: (v) => `Bereich ${v}`,
    ackStage: (s) => `Stage ${s}`,
    ackOpen: "offen für Ideen",
    ackIdea: "Idee notiert",
    ackStrengths: (s) => `Stärken: ${s}`,
    hi: (name) => `Hi ${name}!`,
    noted: (parts) => `Notiert: ${parts}.`,
    openerGeneral:
      "Hi, ich bin Voya. Ich kann Kontakte suchen („suche Fintech-Investoren“), Profile öffnen („zeig mir Max“), Gespräche vorbereiten („bereite ein Gespräch mit Max vor“) oder dir deine Top-Matches vorschlagen („zeig mir Kandidaten“). Was brauchst du?",
    openerKnown: "Hi! Ich kenne dein Suchprofil schon. Sag „zeig mir Kandidaten“, dann schlage ich dir passende Kontakte vor – oder erzähl mir, was sich geändert hat.",
    openerInterview: (name, q) => `Hi${name}, ich bin Voya, dein Co-Founder-Sparringspartner. Ein paar kurze Fragen, dann schlage ich dir passende Kontakte vor. ${q}`,
    notFound: (phrase) => `Ich finde niemanden namens „${phrase}“. Probier den vollen Namen – oder sag „suche <Rolle> <Bereich>“, dann suche ich breiter.`,
    multiple: (list) => `Ich habe mehrere Treffer. Wen meinst du?\n${list}\nSag einfach den vollen Namen.`,
    showReply: (name, role, highlight, first, q) =>
      `Hier ist ${name} – ${role}.${highlight} Wenn du mit ${first} sprichst, wird ${first} wahrscheinlich wissen wollen: „${q}“`,
    searchNone: "Dazu finde ich gerade niemanden. Versuch es mit einem anderen Bereich oder einer anderen Rolle.",
    searchResults: (n, label, list) => `${n} Treffer für ${label}. Die passendsten:\n${list}\nSag „zeig mir <Name>“ für ein Profil.`,
    contacts: "Kontakte",
    inArea: (v) => `im Bereich ${v}`,
    noProfiles: (intro) => `${intro} Allerdings sind noch keine Profile in der Datenbank – sobald Kontakte importiert sind, schlage ich dir hier die besten vor.`,
    proposeLine: (i, name, role, score, why, first, q) =>
      `${i}. ${name} – ${role} (Match ${score} %, Heuristik). ${why} Wenn du mit ${first} sprichst, wird ${first} wahrscheinlich wissen wollen: „${q}“`,
    proposeOutro: "Sag „zeig mir <Name>“ für das ganze Profil oder „bereite ein Gespräch mit <Name> vor“ für einen Leitfaden – oder erzähl mir mehr, dann verfeinere ich die Auswahl.",
    solidMatch: "Solides Grund-Match.",
    unknownProfile: "(unbekanntes Profil)",
    reactions: {
      visionary: "Spannend, da steckt was drin.",
      builder: "Okay, verstanden.",
      operator: "Gut, das ist nachvollziehbar.",
      connector: "Cool, danke fürs Teilen!",
      analyst: "Hm, interessant – das schaue ich mir genauer an.",
    },
    defaultReaction: "Verstehe.",
    simNeedPerson: "Für die Simulation brauche ich eine Person. Wähle zuerst eine Kandidatin oder einen Kandidaten aus – dann spiele ich sie im Gespräch (als Simulation, nicht als echte Aussagen der Person).",
    simOpener: (name, headline, first, q) =>
      `(Simulation – ich spiele ${first}; das sind keine echten Aussagen von ${first}.) Hi, ich bin ${name}${headline}. Schön, dass wir sprechen! Erzähl mal: ${q}`,
    simDone: (reaction) => `${reaction} Das war von meiner Seite erst mal alles – lass uns gern dranbleiben. Sag „Feedback“, wenn du meine Coach-Einschätzung zum Gespräch willst.`,
    simNudge: " Magst du das noch etwas konkreter machen? Und:",
    fbHead: (first) => `Raus aus der Rolle – hier mein Feedback zu deinem (simulierten) Gespräch mit ${first}:`,
    fbGoodMany: "Du bist dran geblieben und hast auf jede Frage geantwortet.",
    fbGoodFew: "Guter Einstieg – du hast das Gespräch eröffnet und Interesse gezeigt.",
    fbBetterShort: "Deine Antworten waren knapp – gib bei Vision, Traktion oder Rollenverteilung 1–2 konkrete Beispiele oder Zahlen.",
    fbBetterLong: "Du warst ausführlich – achte auf den roten Faden: erst Problem, dann Lösung, dann Beleg.",
    fbReal: (first, type, style, tip) => `Fürs echte Gespräch: ${first} ist ${type} – ${style} ${tip}`,
    fbDefaultStyle: "klar und auf den Punkt",
    fbDefaultType: "eher pragmatisch",
    fbDefaultTip: (q) => `Bereite eine konkrete Antwort auf „${q}“ vor`,
    generalNeed: (need, q) => `Dafür brauche ich noch kurz: ${need}. ${q}`,
    generalOffer: "Soll ich dir passende Kontakte zeigen? Sag einfach „zeig mir Kandidaten“.",
    generalTellMore: "Erzähl gern mehr – oder sag „suche <Rolle> <Bereich>“.",
    generalHelp:
      "Ich kann Kontakte suchen („suche Fintech-Investoren“), Profile öffnen („zeig mir Max“), Gespräche vorbereiten („bereite ein Gespräch mit Max vor“) oder deine Top-Matches vorschlagen („zeig mir Kandidaten“). Was möchtest du?",
    topMatches: "Deine Top-Matches:",
    interviewEnough: (ack) => `${ack ? `${ack} ` : ""}Ich habe genug, um dir erste Kontakte vorzuschlagen. Meine Top 3 für dich:`,
    interviewSoon: (ack, need, q) => `${ack ? `${ack} ` : ""}Gleich – dafür brauche ich noch kurz: ${need}. ${q}`,
    ok: "Alles klar.",
    and: " und ",
    prepAskName: "Gern – mit wem soll ich das Gespräch vorbereiten? Nenn mir den Namen (z. B. „bereite ein Gespräch mit Max Mustermann vor“).",
    prepMultiple: (list) => `Mehrere Treffer – für wen soll ich den Leitfaden bauen?\n${list}\nSag einfach den vollen Namen.`,
    prepReply: (g, blocks, example, unknowns) =>
      `Hier ist dein Leitfaden „${g.title}“ (${g.duration}): ${blocks}. Zum Beispiel: „${example}“ Im Gespräch klären, nicht aus dem Profil ableiten: ${unknowns}. Den vollen Leitfaden siehst du im Panel.`,
  },
  en: {
    questions: {
      founderRole: "Which role do you fill in the founding team yourself – more tech, business/commercial, product, design or operations?",
      lookingFor: "Who are you looking for right now: a co-founder (which role is missing?), investors, mentors or talent?",
      verticals: "Which area are you in – e.g. fintech, healthtech, B2B SaaS, AI, climate?",
      idea: "Do you already have a concrete idea, or are you open to ideas? Tell me briefly.",
      strengths: "What are your three biggest strengths – how do you move a team forward?",
      stage: "How far along are you: still at the idea stage, pre-seed, seed or further?",
    },
    shortRole: { tech: "tech", commercial: "business", product: "product", design: "design", operations: "operations", "domain-expert": "domain-expert" },
    ackFounder: (role) => `you're a ${role} founder`,
    ackSeeks: (who, roles) => `you're looking for ${who || "a co-founder"}${roles ? ` (${roles})` : ""}`,
    ackArea: (v) => `area ${v}`,
    ackStage: (s) => `stage ${s}`,
    ackOpen: "open to ideas",
    ackIdea: "idea noted",
    ackStrengths: (s) => `strengths: ${s}`,
    hi: (name) => `Hi ${name}!`,
    noted: (parts) => `Noted: ${parts}.`,
    openerGeneral:
      "Hi, I'm Voya. I can search contacts (\"search fintech investors\"), open profiles (\"show me Max\"), prepare conversations (\"prepare an interview with Max\") or suggest your top matches (\"show me candidates\"). What do you need?",
    openerKnown: "Hi! I already know your search brief. Say \"show me candidates\" and I'll suggest matching contacts – or tell me what has changed.",
    openerInterview: (name, q) => `Hi${name}, I'm Voya, your co-founder sparring partner. A few short questions, then I'll suggest matching contacts. ${q}`,
    notFound: (phrase) => `I can't find anyone named "${phrase}". Try the full name – or say "search <role> <area>" and I'll search more broadly.`,
    multiple: (list) => `I found several people. Who do you mean?\n${list}\nJust say the full name.`,
    showReply: (name, role, highlight, first, q) => `Here is ${name} – ${role}.${highlight} When you talk to ${first}, ${first} will probably want to know: "${q}"`,
    searchNone: "I can't find anyone for that right now. Try a different area or role.",
    searchResults: (n, label, list) => `${n} hits for ${label}. The best fits:\n${list}\nSay "show me <name>" for a profile.`,
    contacts: "contacts",
    inArea: (v) => `in ${v}`,
    noProfiles: (intro) => `${intro} However, there are no profiles in the database yet – as soon as contacts are imported, I'll suggest the best ones here.`,
    proposeLine: (i, name, role, score, why, first, q) =>
      `${i}. ${name} – ${role} (match ${score} %, heuristic). ${why} When you talk to ${first}, ${first} will probably want to know: "${q}"`,
    proposeOutro: "Say \"show me <name>\" for the full profile or \"prepare an interview with <name>\" for a guide – or tell me more and I'll refine the selection.",
    solidMatch: "Solid basic match.",
    unknownProfile: "(unknown profile)",
    reactions: {
      visionary: "Exciting, there's something in that.",
      builder: "Okay, got it.",
      operator: "Good, that makes sense.",
      connector: "Cool, thanks for sharing!",
      analyst: "Hm, interesting – I'll look at that more closely.",
    },
    defaultReaction: "I see.",
    simNeedPerson: "For the simulation I need a person. Pick a candidate first – then I'll play them in the conversation (as a simulation, not as real statements of the person).",
    simOpener: (name, headline, first, q) =>
      `(Simulation – I'm playing ${first}; these are not real statements of ${first}.) Hi, I'm ${name}${headline}. Great that we're talking! Tell me: ${q}`,
    simDone: (reaction) => `${reaction} That's all from my side for now – happy to stay in touch. Say "feedback" if you want my coach's take on the conversation.`,
    simNudge: " Could you make that a bit more concrete? And:",
    fbHead: (first) => `Out of character – here is my feedback on your (simulated) conversation with ${first}:`,
    fbGoodMany: "You stayed with it and answered every question.",
    fbGoodFew: "Good start – you opened the conversation and showed interest.",
    fbBetterShort: "Your answers were brief – give 1–2 concrete examples or numbers on vision, traction or the split of roles.",
    fbBetterLong: "You were detailed – keep the thread: problem first, then solution, then evidence.",
    fbReal: (first, type, style, tip) => `For the real conversation: ${first} is ${type} – ${style} ${tip}`,
    fbDefaultStyle: "clear and to the point",
    fbDefaultType: "rather pragmatic",
    fbDefaultTip: (q) => `Prepare a concrete answer to "${q}"`,
    generalNeed: (need, q) => `For that I still need briefly: ${need}. ${q}`,
    generalOffer: "Shall I show you matching contacts? Just say \"show me candidates\".",
    generalTellMore: "Tell me more – or say \"search <role> <area>\".",
    generalHelp:
      "I can search contacts (\"search fintech investors\"), open profiles (\"show me Max\"), prepare conversations (\"prepare an interview with Max\") or suggest your top matches (\"show me candidates\"). What would you like?",
    topMatches: "Your top matches:",
    interviewEnough: (ack) => `${ack ? `${ack} ` : ""}I have enough to suggest first contacts. My top 3 for you:`,
    interviewSoon: (ack, need, q) => `${ack ? `${ack} ` : ""}In a moment – for that I still need briefly: ${need}. ${q}`,
    ok: "Alright.",
    and: " and ",
    prepAskName: "Sure – who should I prepare the conversation with? Give me the name (e.g. \"prepare an interview with Max Mustermann\").",
    prepMultiple: (list) => `Several people match – who should I build the guide for?\n${list}\nJust say the full name.`,
    prepReply: (g, blocks, example, unknowns) =>
      `Here is your guide "${g.title}" (${g.duration}): ${blocks}. For example: "${example}" Clarify in the conversation, don't infer from the profile: ${unknowns}. The full guide is in the panel.`,
  },
};

/* ------------------------------------------------------------------ */
/* Vokabular für die Keyword-Extraktion (Rollen/Verticals: prompts.ts)  */
/* ------------------------------------------------------------------ */

/** Eindeutige Stage-Begriffe (gelten überall). */
const STAGE_KEYWORDS: Array<[Stage, string[]]> = [
  ["pre-seed", ["pre-seed", "preseed", "pre seed"]],
  ["series-a", ["series a", "series-a"]],
  ["seed", ["seed"]],
  ["growth", ["growth", "wachstumsphase", "skalier", "scale-up", "scaleup", "scaling"]],
  ["idea", ["ideenphase", "ideephase", "idea stage", "ganz am anfang", "very beginning", "noch nichts gebaut", "nothing built yet", "nur eine idee", "just an idea"]],
];
/** Unscharfe Stage-Begriffe („Prototyping" kann auch eine Stärke sein) – nur, wenn gerade nach der Stage gefragt wurde. */
const STAGE_KEYWORDS_WHEN_ASKED: Array<[Stage, string[]]> = [
  ["pre-seed", ["prototyp", "mvp", "erste nutzer", "first users", "pilotkunde", "pilot customer", "erste kunden", "first customers"]],
  ["idea", ["idee", "idea", "konzept", "concept", "anfang", "beginning", "noch nichts", "nothing yet"]],
  ["growth", ["wachstum", "skalieren", "scale", "weiter"]],
];

/** Rohdaten-Wörter aus Matching-Begründungen in Klartext („cofounder" → „Co-Founder"). */
function humanize(text: string, locale: AgentLocale): string {
  return text
    .replace(/"(tech|commercial|product|design|operations|domain-expert)"/g, (_m, r: FounderRole) => `„${founderRoleLabel(r, locale)}“`)
    .replace(/\b(cofounder|investor|mentor|talent|expert)\b/g, (_m, r: NetworkRole) => networkRoleLabel(r, locale));
}

const SHOW_RE =
  /\b(zeig|zeige|guck|schau|öffne|öffnen|anzeigen|anschauen|ansehen|show|wer ist|who is|look at|tell me about|profil von|profile of|details zu|details on|mehr zu|mehr über|more about)\b/i;
const SHOW_STOPWORDS = new Set([
  "zeig", "zeige", "mir", "mal", "den", "die", "das", "dir", "an", "bitte", "doch", "guck", "schau", "öffne", "öffnen",
  "profil", "von", "zu", "mehr", "über", "wer", "ist", "person", "details", "dem", "der", "des", "ich", "will", "möchte",
  "ansehen", "anschauen", "anzeigen", "show", "me", "nochmal", "genauer", "noch", "und", "diesen", "diese", "dieser",
  "einmal", "gerne", "gern", "kannst", "du", "auch", "jetzt", "einen", "eine", "ein", "wie", "hier", "dann",
  "who", "is", "the", "a", "at", "look", "tell", "about", "please", "can", "you", "of", "on", "for", "again", "more",
  "profile", "this", "that", "him", "her", "i", "want", "to", "see", "detail", "info",
]);
/** Wörter, die keine Namen sind – „zeig mir Kandidaten" ist ein Vorschlags-, kein Anzeige-Wunsch. */
const GENERIC_WORDS = new Set([
  "kandidat", "kandidaten", "kandidatin", "kandidatinnen", "leute", "kontakte", "kontakt", "matches", "match", "jemand",
  "jemanden", "wen", "alle", "vorschläge", "vorschlag", "profile", "profil", "top", "drei", "3", "passende", "passenden",
  "personen", "menschen", "gründer", "gründerinnen", "investoren", "investor", "mentoren", "mentor", "talente", "talent",
  "experten", "expert", "cofounder", "co-founder", "cofounders", "team", "liste", "ergebnisse", "treffer", "beste", "besten",
  "candidates", "candidate", "people", "contacts", "someone", "somebody", "suggestions", "profiles", "founders", "investors",
  "mentors", "talents", "experts", "co-founders", "list", "results", "best", "all",
]);
const WANTS_CANDIDATES_RE =
  /kandidat|candidates|vorschl|suggest|recommend|zeig mir (wen|leute|kontakte|jemand|alle|die besten|meine)|show me (someone|people|contacts|matches|the best|my)|wen hast du|who do you (have|know)|matches|passende|empfehl|wer passt|who fits|leg los|los geht|let's go|kontakte|top ?3|wen kennst du|wen gibt es|are there people/i;
/** Suchbefehl irgendwo im Satz (general). Wortstämme ohne \b am Ende, damit „suche"/„finde" greifen. */
const SEARCH_RE = /(^|[^a-zäöüß])(such|search|find|liste|list|zeig|show|gibt es|gibt's|are there|welche|which|wer (von|aus|hat)|who (from|at|has)|filter)/i;
/** Suchbefehl am Satzanfang (interview – dort ist „ich suche einen Investor" eine Antwort, kein Befehl). */
const SEARCH_CMD_START_RE = /^(bitte |hey |hi |ok |okay |please )?(such|search|find|zeig|show|liste|list|gibt es|gibt's|are there|welche|which|wer |who )/i;
const OPEN_RE = /\b(offen|open|keine (konkrete )?idee|no (concrete )?idea|noch nicht|not yet|weiß (noch )?nicht|don't know|flexibel|flexible|egal|alles|anything|whatever|ergebnisoffen)\b/i;
const OPEN_GLOBAL_RE = /offen für (ideen|alles|neues|vieles|andere)|open to (ideas|anything|new|other)|keine (konkrete |eigene )?idee|no (concrete |own )?idea/i;
const SELF_RE =
  /\b(ich bin|bin ich|ich komme|ich mache|ich habe|mein hintergrund|ich arbeite|von haus aus|ich als|selbst|meine rolle|ich kann|i am|i'm|i come from|i do|i have|my background|i work|as a|myself|my role|i can)\b/i;
const SEEK_RE =
  /(^|[^a-zäöüß])(such|brauch|fehlt|hätte gern|wünsch|finden|interessiert an|kennenlernen|treffen|looking for|need|seek|searching|missing|meet|interested in|get to know)/i;
const IDEA_LIKE_RE =
  /(meine idee|my idea|ich baue|wir bauen|i'm building|i am building|we're building|we are building|ich möchte .* bauen|ich will .* bauen|i want to build|startup für|startup for|plattform|platform|app für|app for|tool für|tool for|marktplatz|marketplace)/i;
const FEEDBACK_RE = /\bfeedback\b|\bstopp\b|\bstop\b|abbrechen|beenden|\bquit\b|\bexit\b|\bend (the )?(simulation|conversation|role ?play)\b/i;

/** Gesprächsvorbereitung: „bereite ein Interview/Gespräch mit <Name> vor", „prepare an interview with <Name>", „Leitfaden für <Name>". */
const PREP_RE =
  /(bereite\b.*\bvor\b|vorbereit|leitfaden|interview ?guide|prepare (an? |the |my |for )?(interview|conversation|talk|meeting|call|chat)|interview prep|prep for|gesprächsvorbereitung|interviewvorbereitung)/i;
const PREP_STOPWORDS = new Set([
  "bereite", "bereit", "vor", "vorbereiten", "vorbereitung", "ein", "eine", "einen", "einem", "einer", "das", "den", "die", "der", "dem",
  "interview", "interviews", "gespräch", "gesprächs", "gesprächsleitfaden", "interviewleitfaden", "leitfaden", "mit", "für", "mir", "mich",
  "bitte", "kannst", "du", "erstelle", "erstell", "mach", "bau", "zu", "zum", "zur", "auf", "und", "nächste", "nächstes", "erste", "ersten",
  "prepare", "prep", "guide", "an", "a", "the", "my", "me", "with", "for", "conversation", "talk", "meeting", "call", "chat", "please", "can",
  "you", "make", "create", "build", "of", "on", "and", "next", "first", "kick-off", "kickoff", "i", "want", "to", "need", "brauche", "will", "möchte",
]);

/* ------------------------------------------------------------------ */
/* Helfer                                                              */
/* ------------------------------------------------------------------ */

function stageIn(text: string, asked: boolean): Stage | undefined {
  for (const [stage, kws] of STAGE_KEYWORDS) {
    if (kws.some((k) => hasKeyword(text, k))) return stage;
  }
  if (asked) {
    for (const [stage, kws] of STAGE_KEYWORDS_WHEN_ASKED) {
      if (kws.some((k) => hasKeyword(text, k))) return stage;
    }
  }
  return undefined;
}

function union<T>(a: readonly T[], b: readonly T[]): T[] {
  return Array.from(new Set([...a, ...b]));
}

function lastOfRole(messages: ChatMessage[], role: ChatMessage["role"]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === role) return (messages[i].content ?? "").trim();
  }
  return "";
}

/** Welche Frage wurde zuletzt gestellt? Prüft beide Sprachen (Sprachwechsel mitten im Gespräch). */
function detectAskedField(lastAssistant: string): InterviewField | null {
  for (const loc of ["de", "en"] as AgentLocale[]) {
    for (const field of Object.keys(TEXTS[loc].questions) as InterviewField[]) {
      if (lastAssistant.includes(TEXTS[loc].questions[field])) return field;
    }
  }
  return null;
}

function hasPatch(patch: Partial<UserContext>): boolean {
  return Object.keys(patch).length > 0;
}

function withPatchActions(res: ChatResponse, patch: Partial<UserContext>): ChatResponse {
  if (!hasPatch(patch)) return res;
  return {
    ...res,
    uiActions: [{ type: "update_user_context", patch }, ...res.uiActions],
    userContextPatch: { ...(res.userContextPatch ?? {}), ...patch },
  };
}

function tokensWithout(text: string, stop: Set<string>): string[] {
  return text
    .replace(/[?!.,;:„“"']/g, " ")
    .split(/\s+/)
    .filter((t) => t && !stop.has(t.toLowerCase()));
}

function findByTokens(nameTokens: string[]): Profile[] {
  const phrase = nameTokens.join(" ");
  let found = phrase ? findProfileByName(phrase) : [];
  if (found.length === 0) {
    const seen = new Map<string, Profile>();
    for (const t of nameTokens.filter((x) => x.length >= 3)) for (const p of findProfileByName(t)) seen.set(p.id, p);
    found = Array.from(seen.values());
  }
  return found;
}

function listProfiles(found: Profile[], locale: AgentLocale): string {
  return found
    .slice(0, 5)
    .map((p) => `- ${p.name} – ${describeRole(p, locale)}${p.headline ? `, ${p.headline}` : ""}`)
    .join("\n");
}

/* ------------------------------------------------------------------ */
/* Extraktion                                                          */
/* ------------------------------------------------------------------ */

function extractPatch(text: string, ctx: UserContext, askedField: InterviewField | null): Partial<UserContext> {
  const patch: Partial<UserContext> = {};
  const lower = text.toLowerCase();

  // Name („ich heiße Max", „mein Name ist Max", "my name is Max")
  const nameMatch = text.match(/(?:ich heiße|mein name ist|my name is|i am called)\s+([A-ZÄÖÜ][\wäöüß-]+(?:\s+[A-ZÄÖÜ][\wäöüß-]+)?)/);
  if (nameMatch && !ctx.name) patch.name = nameMatch[1];

  // Verticals (global)
  const foundVerticals = verticalsIn(lower);
  if (foundVerticals.length > 0) {
    const merged = union(ctx.verticals, foundVerticals);
    if (merged.length !== ctx.verticals.length) patch.verticals = merged;
  } else if (askedField === "verticals" && OPEN_RE.test(lower)) {
    patch.openToIdeas = true;
  }

  // Stage (eindeutige Begriffe global, unscharfe nur auf Nachfrage)
  const stage = stageIn(lower, askedField === "stage");
  if (stage && stage !== ctx.stage) patch.stage = stage;

  // Rollen: pro Teilsatz entscheiden, ob es um mich (founderRole) oder um Gesuchte geht
  let lookingFor = [...ctx.lookingFor];
  let lookingForRoles = [...ctx.lookingForRoles];
  let founderRole = ctx.founderRole;
  let founderRoleSetThisTurn = false;
  const clauses = lower.split(/[,.;!?\n]| und | aber | sowie | außerdem | and | but | also /).filter((c) => c.trim());
  for (const clause of clauses) {
    const hasSeek = SEEK_RE.test(clause);
    const hasSelf = SELF_RE.test(clause);
    const isSeek = hasSeek || (askedField === "lookingFor" && !hasSelf);
    const isSelf = hasSelf || (askedField === "founderRole" && !hasSeek);
    const roles = founderRolesIn(clause);
    const nets = networkRolesIn(clause);
    if (isSeek) {
      lookingForRoles = union(lookingForRoles, roles);
      lookingFor = union(lookingFor, nets);
      if (roles.length > 0 && nets.length === 0) lookingFor = union(lookingFor, ["cofounder"]);
    } else if (isSelf && roles.length > 0 && !founderRoleSetThisTurn) {
      if (askedField === "founderRole" || !founderRole) {
        founderRole = roles[0];
        founderRoleSetThisTurn = true;
      }
    }
  }
  if (founderRole && founderRole !== ctx.founderRole) patch.founderRole = founderRole;
  if (lookingFor.length !== ctx.lookingFor.length) patch.lookingFor = lookingFor;
  if (lookingForRoles.length !== ctx.lookingForRoles.length) patch.lookingForRoles = lookingForRoles;

  // Idee / offen
  if (OPEN_GLOBAL_RE.test(lower)) patch.openToIdeas = true;
  const ideaLike = IDEA_LIKE_RE.test(lower);
  if (askedField === "idea" || ideaLike) {
    const open = OPEN_RE.test(lower);
    if (open) patch.openToIdeas = true;
    if (text.trim().length > 15 && (!open || ideaLike)) {
      if (askedField === "idea" || !ctx.idea) patch.idea = text.trim();
    }
  }

  // Stärken
  if (askedField === "strengths") {
    const items = text
      .split(/,|;| und | and | & |\n|•|\//)
      .map((s) => s.replace(/^(ich (kann|bin)|meine stärken? (sind|ist)|stärken?:|i (can|am)|my strengths? (are|is)|strengths?:|i'm good at|i am good at)\s*/i, "").trim())
      .filter((s) => s.length >= 2 && s.length <= 60);
    const strengths = items.length > 0 ? items.slice(0, 6) : text.trim().length > 0 ? [text.trim().slice(0, 80)] : [];
    if (strengths.length > 0) patch.strengths = union(ctx.strengths, strengths);
  }

  return patch;
}

/* ------------------------------------------------------------------ */
/* Antworten                                                           */
/* ------------------------------------------------------------------ */

function ackFor(patch: Partial<UserContext>, locale: AgentLocale): string {
  const t = TEXTS[locale];
  const parts: string[] = [];
  if (patch.founderRole) parts.push(t.ackFounder(t.shortRole[patch.founderRole]));
  if (patch.lookingForRoles?.length || patch.lookingFor?.length) {
    const who = (patch.lookingFor ?? []).map((r) => networkRoleLabel(r, locale)).join(", ");
    const roles = (patch.lookingForRoles ?? []).map((r) => founderRoleLabel(r, locale)).join(", ");
    parts.push(t.ackSeeks(who, roles));
  }
  if (patch.verticals?.length) parts.push(t.ackArea(patch.verticals.join(", ")));
  if (patch.stage) parts.push(t.ackStage(patch.stage));
  if (patch.openToIdeas && !patch.idea) parts.push(t.ackOpen);
  if (patch.idea) parts.push(t.ackIdea);
  if (patch.strengths?.length) parts.push(t.ackStrengths(patch.strengths.slice(0, 3).join(", ")));
  const greeting = patch.name ? t.hi(patch.name) : "";
  if (parts.length === 0) return greeting;
  return `${greeting ? `${greeting} ` : ""}${t.noted(parts.join(", "))}`;
}

function opener(mode: ChatRequest["mode"], ctx: UserContext | null, locale: AgentLocale): string {
  const t = TEXTS[locale];
  if (mode === "general") return t.openerGeneral;
  const missing = getMissingInterviewFields(ctx);
  if (missing.length === 0) return t.openerKnown;
  const name = ctx?.name ? ` ${ctx.name}` : "";
  return t.openerInterview(name, t.questions[missing[0]]);
}

function looksLikeKeywordAnswer(text: string): boolean {
  const lower = text.toLowerCase();
  return founderRolesIn(lower).length > 0 || networkRolesIn(lower).length > 0 || verticalsIn(lower).length > 0 || Boolean(stageIn(lower, true));
}

function tryShowCandidate(text: string, locale: AgentLocale): ChatResponse | null {
  const t = TEXTS[locale];
  const trimmed = text.trim();
  const hasVerb = SHOW_RE.test(trimmed);
  // Nur ein Name als Nachricht („Max Mustermann") → direkt öffnen, falls eindeutig und kein Schlagwort.
  if (!hasVerb) {
    if (trimmed.length <= 40 && /^[A-ZÄÖÜ][\wäöüß-]+(\s+[A-ZÄÖÜ][\wäöüß-]+){0,2}$/.test(trimmed) && !looksLikeKeywordAnswer(trimmed)) {
      const direct = findProfileByName(trimmed);
      if (direct.length === 1) return showResponse(direct[0], locale);
    }
    return null;
  }
  const tokens = tokensWithout(trimmed, SHOW_STOPWORDS);
  // „zeig mir Kandidaten/Investoren" → kein Name → Vorschlags-/Suchlogik übernimmt.
  if (tokens.length === 0 || tokens.every((tok) => GENERIC_WORDS.has(tok.toLowerCase()))) return null;
  const nameTokens = tokens.filter((tok) => !GENERIC_WORDS.has(tok.toLowerCase()));
  const phrase = nameTokens.join(" ");
  const found = findByTokens(nameTokens);
  if (found.length === 0) {
    // „show me fintech investors“ o. ä. ist kein Name – normale Such-/Interviewlogik übernimmt.
    if (looksLikeKeywordAnswer(phrase)) return null;
    return { reply: t.notFound(phrase), uiActions: [] };
  }
  if (found.length === 1) return showResponse(found[0], locale);
  return {
    reply: t.multiple(listProfiles(found, locale)),
    uiActions: [{ type: "show_candidates", profileIds: found.slice(0, 5).map((p) => p.id) }],
  };
}

function showResponse(p: Profile, locale: AgentLocale): ChatResponse {
  const first = firstName(p.name);
  const q = likelyQuestionsFor(p, locale)[0];
  const highlight = p.headline ? ` ${p.headline}.` : "";
  return {
    reply: TEXTS[locale].showReply(p.name, describeRole(p, locale), highlight, first, q),
    uiActions: [{ type: "show_candidate", profileId: p.id }],
  };
}

/** „bereite ein Gespräch mit <Name> vor" → Leitfaden bauen und im UI zeigen. */
function tryPrepareInterview(text: string, req: ChatRequest, ctx: UserContext | null, locale: AgentLocale): ChatResponse | null {
  if (!PREP_RE.test(text)) return null;
  const t = TEXTS[locale];
  const nameTokens = tokensWithout(text, PREP_STOPWORDS).filter((tok) => !GENERIC_WORDS.has(tok.toLowerCase()));
  let found = nameTokens.length > 0 ? findByTokens(nameTokens) : [];
  if (found.length === 0 && req.candidateId) {
    const p = getProfile(req.candidateId);
    if (p) found = [p];
  }
  if (found.length === 0) return { reply: t.prepAskName, uiActions: [] };
  if (found.length > 1) {
    return {
      reply: t.prepMultiple(listProfiles(found, locale)),
      uiActions: [{ type: "show_candidates", profileIds: found.slice(0, 5).map((p) => p.id) }],
    };
  }
  return guideResponse(found[0], ctx, locale);
}

function guideResponse(p: Profile, ctx: UserContext | null, locale: AgentLocale): ChatResponse {
  const t = TEXTS[locale];
  const guide = buildInterviewGuide(p, ctx, locale);
  const blocks = guide.sections.map((s) => `${s.title} (${s.minutes} ${locale === "en" ? "min" : "Min."})`).join(", ");
  const example = guide.sections[1]?.questions[0] ?? guide.sections[0]?.questions[0] ?? "";
  const unknowns = guide.unknowns.map((u) => u.split(":")[0]).join(", ");
  return {
    reply: t.prepReply(guide, blocks, example, unknowns),
    uiActions: [
      { type: "show_candidate", profileId: p.id },
      { type: "show_interview_guide", profileId: p.id, guide },
    ],
  };
}

function trySearch(text: string, ctx: UserContext | null, mode: ChatRequest["mode"], locale: AgentLocale): ChatResponse | null {
  const t = TEXTS[locale];
  const lower = text.toLowerCase().trim();
  if (mode === "general") {
    if (!SEARCH_RE.test(lower)) return null;
  } else if (!SEARCH_CMD_START_RE.test(lower)) {
    // Im Interview ist „ich suche einen Tech-Co-Founder" eine Antwort, kein Suchbefehl.
    return null;
  }
  const nets = networkRolesIn(lower).filter((r) => r !== "cofounder" || /co-?founder|mitgründer/.test(lower));
  const verticals = verticalsIn(lower);
  const roles = founderRolesIn(lower);
  if (nets.length === 0 && verticals.length === 0 && roles.length === 0) return null;
  if (mode !== "general" && nets.length === 0) return null;

  let results = searchProfiles({
    networkRole: nets[0],
    founderRole: nets[0] === "cofounder" || nets[0] === "talent" || nets.length === 0 ? roles[0] : undefined,
    vertical: verticals[0],
  });
  if (results.length === 0 && verticals[0]) results = searchProfiles({ networkRole: nets[0], founderRole: roles[0] });
  if (results.length === 0) return { reply: t.searchNone, uiActions: [] };
  const ranked = ctx
    ? rankCandidates(ctx, results)
        .map((r) => getProfile(r.profileId))
        .filter((p): p is Profile => Boolean(p))
    : results;
  const top = ranked.slice(0, 5);
  const label = [
    nets[0] ? networkRoleLabel(nets[0], locale) : t.contacts,
    roles[0] && !nets[0] ? `(${founderRoleLabel(roles[0], locale)})` : "",
    verticals[0] ? t.inArea(verticals[0]) : "",
  ]
    .filter(Boolean)
    .join(" ");
  return {
    reply: t.searchResults(results.length, label, listProfiles(top, locale)),
    uiActions: [{ type: "show_candidates", profileIds: top.map((p) => p.id) }],
  };
}

function proposeCandidates(ctx: UserContext, patch: Partial<UserContext>, intro: string, locale: AgentLocale): ChatResponse {
  const t = TEXTS[locale];
  const pool = getProfiles();
  const uiActions: UiAction[] = [];
  if (hasPatch(patch)) uiActions.push({ type: "update_user_context", patch });
  if (pool.length === 0) {
    return { reply: t.noProfiles(intro), uiActions, userContextPatch: hasPatch(patch) ? patch : undefined };
  }
  const ranked = rankCandidates(ctx, pool);
  const positive = ranked.filter((r) => r.score > 0);
  const top = (positive.length > 0 ? positive : ranked).slice(0, 3);
  const lines = top.map((r, i) => {
    const p = getProfile(r.profileId);
    if (!p) return `${i + 1}. ${t.unknownProfile}`;
    const first = firstName(p.name);
    const why = humanize(r.reasons.slice(0, 2).map((x) => x.detail).join(" "), locale) || t.solidMatch;
    const q = likelyQuestionsFor(p, locale)[0];
    return t.proposeLine(i + 1, p.name, describeRole(p, locale), r.score, why, first, q);
  });
  uiActions.push({ type: "show_candidates", profileIds: top.map((r) => r.profileId) });
  return {
    reply: `${intro}\n${lines.join("\n")}\n${t.proposeOutro}`,
    uiActions,
    userContextPatch: hasPatch(patch) ? patch : undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Prep-Simulation                                                     */
/* ------------------------------------------------------------------ */

function endWithPeriod(s: string): string {
  const t = s.trim();
  return /[.!?…]$/.test(t) ? t : `${t}.`;
}

function runPrepSimulation(req: ChatRequest, locale: AgentLocale): ChatResponse {
  const t = TEXTS[locale];
  const candidate = req.candidateId ? getProfile(req.candidateId) : undefined;
  if (!candidate) return { reply: t.simNeedPerson, uiActions: [] };
  const messages = req.messages ?? [];
  const lastUser = lastOfRole(messages, "user");
  const userMsgs = messages.filter((m) => m.role === "user");
  const assistantTurns = messages.filter((m) => m.role === "assistant").length;
  const first = firstName(candidate.name);
  const type = candidate.personality?.type;

  if (FEEDBACK_RE.test(lastUser)) {
    const avgLen = userMsgs.length > 0 ? userMsgs.reduce((n, m) => n + m.content.length, 0) / userMsgs.length : 0;
    const style = candidate.personality?.communicationStyle ?? t.fbDefaultStyle;
    const tip = candidate.personality?.outreachTips?.[0] ?? t.fbDefaultTip(likelyQuestionsFor(candidate, locale)[0]);
    const reply = [
      t.fbHead(first),
      `1. ${locale === "en" ? "Good" : "Gut"}: ${userMsgs.length >= 3 ? t.fbGoodMany : t.fbGoodFew}`,
      `2. ${locale === "en" ? "Better" : "Besser"}: ${avgLen < 60 ? t.fbBetterShort : t.fbBetterLong}`,
      `3. ${t.fbReal(first, type ? personalityLabel(type, locale) : t.fbDefaultType, endWithPeriod(style), endWithPeriod(tip))}`,
    ].join("\n");
    return { reply, uiActions: [] };
  }

  const questions = likelyQuestionsFor(candidate, locale);
  if (assistantTurns === 0 && !lastUser) {
    const headline = candidate.headline ? `, ${candidate.headline}` : "";
    return {
      reply: t.simOpener(candidate.name, headline, first, questions[0]),
      uiActions: [{ type: "show_candidate", profileId: candidate.id }],
    };
  }
  const idx = Math.min(assistantTurns, questions.length);
  const reaction = (type && t.reactions[type]) ?? t.defaultReaction;
  if (idx >= questions.length) return { reply: t.simDone(reaction), uiActions: [] };
  const nudge = lastUser.length > 0 && lastUser.length < 25 ? t.simNudge : "";
  return { reply: `${reaction}${nudge} ${questions[idx]}`, uiActions: [] };
}

/* ------------------------------------------------------------------ */
/* Einstieg                                                            */
/* ------------------------------------------------------------------ */

export function runFallbackChat(req: ChatRequest): ChatResponse {
  const locale = normalizeAgentLocale(req.locale);
  const t = TEXTS[locale];
  if (req.mode === "prep-simulation") return runPrepSimulation(req, locale);

  const messages = req.messages ?? [];
  const lastUser = lastOfRole(messages, "user");
  const lastAssistant = lastOfRole(messages, "assistant");
  const userTurns = messages.filter((m) => m.role === "user").length;
  const base = req.userContext ? mergeUserContext(req.userContext, {}) : null;

  if (!lastUser) return { reply: opener(req.mode, base, locale), uiActions: [] };

  const prepared = tryPrepareInterview(lastUser, req, base, locale);
  if (prepared) return prepared;

  const shown = tryShowCandidate(lastUser, locale);
  if (shown) return shown;

  const askedField = detectAskedField(lastAssistant);
  const patch = extractPatch(lastUser, base ?? EMPTY_USER_CONTEXT, askedField);
  const merged = mergeUserContext(base, patch);

  const searched = trySearch(lastUser, merged, req.mode, locale);
  if (searched) return withPatchActions(searched, patch);

  const missing = getMissingInterviewFields(merged);
  const wantsCandidates = WANTS_CANDIDATES_RE.test(lastUser);
  const enough = hasEnoughForProposals(merged);
  const ack = ackFor(patch, locale);
  const needText = (fields: InterviewField[]) => fields.slice(0, 2).map((f) => interviewFieldLabel(f, locale)).join(t.and);

  if (req.mode === "general") {
    if (wantsCandidates && enough) return proposeCandidates(merged, patch, t.topMatches, locale);
    if (wantsCandidates) {
      return withPatchActions({ reply: t.generalNeed(needText(missing), t.questions[missing[0]]), uiActions: [] }, patch);
    }
    if (ack) {
      return withPatchActions({ reply: `${ack} ${enough ? t.generalOffer : t.generalTellMore}`, uiActions: [] }, patch);
    }
    return { reply: t.generalHelp, uiActions: [] };
  }

  // Interview
  const done = missing.length === 0;
  if (done || (wantsCandidates && enough) || (userTurns >= 6 && enough)) {
    const finalPatch: Partial<UserContext> = { ...patch, completedInterview: true };
    return proposeCandidates(merged, finalPatch, t.interviewEnough(ack), locale);
  }
  if (wantsCandidates && !enough) {
    return withPatchActions({ reply: t.interviewSoon(ack, needText(missing), t.questions[missing[0]]), uiActions: [] }, patch);
  }
  // Nächste Frage: nicht zweimal hintereinander dieselbe stellen.
  const next = missing.find((f) => f !== askedField) ?? missing[0];
  const lead = ack || (askedField ? t.ok : "");
  return withPatchActions({ reply: `${lead ? `${lead} ` : ""}${t.questions[next]}`, uiActions: [] }, patch);
}
