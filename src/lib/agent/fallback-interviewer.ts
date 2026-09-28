/**
 * Regelbasierter Interviewer – läuft OHNE LLM (Demo-Sicherheit ohne OPENAI_API_KEY).
 * ---------------------------------------------------------------
 * - Interview: fragt anhand fehlender Felder im UserContext die nächste Frage,
 *   extrahiert per Keywords einen userContextPatch aus der letzten Nutzer-Nachricht,
 *   erkennt „zeig mir / guck dir mal <Name> an" und schlägt nach genug Infos Top-3 vor.
 * - General: Suche/Anzeige/Vorschläge per Keywords.
 * - Prep-Simulation: spielt die Kandidat:in mit 3–4 typischen Fragen, „Feedback" beendet.
 */
import { findProfileByName, getProfile, getProfiles, searchProfiles } from "@/lib/data";
import { rankCandidates } from "@/lib/matching";
import type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  FounderRole,
  NetworkRole,
  Profile,
  Stage,
  UiAction,
  UserContext,
} from "@/lib/types";
import { PERSONALITY_LABELS } from "@/lib/types";
import {
  describeRole,
  EMPTY_USER_CONTEXT,
  firstName,
  FOUNDER_ROLE_LABELS,
  getMissingInterviewFields,
  hasEnoughForProposals,
  INTERVIEW_FIELD_LABELS,
  likelyQuestionsFor,
  mergeUserContext,
  NETWORK_ROLE_LABELS,
  type InterviewField,
} from "./prompts";

/* ------------------------------------------------------------------ */
/* Vokabular für die Keyword-Extraktion                                */
/* ------------------------------------------------------------------ */

const VERTICAL_KEYWORDS: Record<string, string[]> = {
  ai: ["ai", "ki", "künstliche intelligenz", "llm", "machine learning", "agents", "genai"],
  fintech: ["fintech", "finanzen", "finanztech", "finanzdienst", "banking", "neobank", "payment", "zahlung", "insurtech", "versicherung", "kredit", "trading", "wealth"],
  healthtech: ["healthtech", "health", "gesundheit", "medizin", "medtech", "digital health", "pflege"],
  climate: ["climate", "klima", "cleantech", "nachhaltig", "co2", "carbon"],
  "b2b saas": ["saas", "b2b", "unternehmenssoftware", "enterprise software"],
  consumer: ["consumer", "b2c", "endkunden", "verbraucher", "lifestyle"],
  robotics: ["robotic", "robotik", "roboter"],
  defense: ["defense", "defence", "verteidigung", "dual-use"],
  edtech: ["edtech", "bildung", "education", "lernplattform", "lern-app", "schule", "studierende"],
  mobility: ["mobility", "mobilität", "automotive", "verkehr", "logistik"],
  proptech: ["proptech", "immobilien", "real estate", "wohnen"],
  deeptech: ["deeptech", "deep tech", "quantum", "hardware", "chips", "materialien"],
  ecommerce: ["ecommerce", "e-commerce", "online-shop", "onlineshop", "handel", "d2c"],
  "hr tech": ["hr tech", "hrtech", "recruiting", "personalwesen", "personaler", "hr-software", "hr"],
  legaltech: ["legaltech", "legal", "jura", "recht", "kanzlei"],
  energy: ["energy", "energie", "solar", "batterie", "strom", "wasserstoff"],
  biotech: ["biotech", "bio", "pharma", "life science", "labor"],
  media: ["media", "medien", "content", "creator", "publishing", "gaming"],
};

const FOUNDER_ROLE_KEYWORDS: Record<FounderRole, string[]> = {
  tech: [
    "tech",
    "techie",
    "technisch",
    "entwickl",
    "developer",
    "engineer",
    "cto",
    "software",
    "programmier",
    "coder",
    "informatik",
    "full-stack",
    "fullstack",
    "backend",
    "frontend",
    "data scien",
    "ml",
    "ai-engineer",
  ],
  commercial: ["commercial", "business", "sales", "vertrieb", "marketing", "bwl", "ceo", "kaufmännisch", "finance", "growth", "gtm", "kunden"],
  product: ["product", "produkt", "pm", "product manager", "produktmanag"],
  design: ["design", "ux", "ui", "designer", "brand"],
  operations: ["operations", "ops", "coo", "prozess", "operativ", "supply chain"],
  "domain-expert": ["domain", "fachexpert", "branchenexpert", "domänen", "arzt", "ärztin", "jurist", "wissenschaftler"],
};

const NETWORK_ROLE_KEYWORDS: Record<NetworkRole, string[]> = {
  investor: ["investor", "investoren", "vc", "venture", "angel", "geld", "kapital", "funding", "finanzierung", "business angel", "fund"],
  mentor: ["mentor", "mentorin", "mentoren", "coach", "advisor", "beirat", "erfahrene", "rat "],
  talent: ["talent", "mitarbeiter", "angestellte", "hire", "einstellen", "festanstellung", "first hire", "praktikant", "werkstudent"],
  expert: ["expert", "fachlich", "spezialist", "berater"],
  cofounder: ["co-founder", "cofounder", "co founder", "mitgründer", "mitgründerin", "gründungspartner", "partner", "gründer", "team"],
};

/** Eindeutige Stage-Begriffe (gelten überall). */
const STAGE_KEYWORDS: Array<[Stage, string[]]> = [
  ["pre-seed", ["pre-seed", "preseed", "pre seed"]],
  ["series-a", ["series a", "series-a"]],
  ["seed", ["seed"]],
  ["growth", ["growth", "wachstumsphase", "skalier", "scale-up", "scaleup"]],
  ["idea", ["ideenphase", "ideephase", "ganz am anfang", "noch nichts gebaut", "nur eine idee"]],
];
/** Unscharfe Stage-Begriffe („Prototyping" kann auch eine Stärke sein) – nur, wenn gerade nach der Stage gefragt wurde. */
const STAGE_KEYWORDS_WHEN_ASKED: Array<[Stage, string[]]> = [
  ["pre-seed", ["prototyp", "mvp", "erste nutzer", "pilotkunde", "erste kunden"]],
  ["idea", ["idee", "idea", "konzept", "anfang", "noch nichts"]],
  ["growth", ["wachstum", "skalieren", "weiter"]],
];

/** Rohdaten-Wörter aus Matching-Begründungen in Klartext („cofounder" → „Co-Founder"). */
function humanize(text: string): string {
  return text
    .replace(/"(tech|commercial|product|design|operations|domain-expert)"/g, (_m, r: FounderRole) => `„${FOUNDER_ROLE_LABELS[r]}“`)
    .replace(/\b(cofounder|investor|mentor|talent|expert)\b/g, (_m, r: NetworkRole) => NETWORK_ROLE_LABELS[r]);
}

const QUESTIONS: Record<InterviewField, string> = {
  founderRole: "Welche Rolle füllst du selbst im Gründerteam aus – eher Tech, Business/Commercial, Produkt, Design oder Operations?",
  lookingFor: "Wen suchst du gerade: Co-Founder (welche Rolle fehlt dir?), Investor:innen, Mentor:innen oder Talente?",
  verticals: "In welchem Bereich bewegst du dich – z. B. Fintech, Healthtech, B2B SaaS, AI, Climate?",
  idea: "Hast du schon eine konkrete Idee, oder bist du offen für Ideen? Erzähl kurz.",
  strengths: "Was sind deine drei größten Stärken – womit bringst du ein Team voran?",
  stage: "Wie weit bist du: noch in der Ideenphase, Pre-Seed, Seed oder schon weiter?",
};

/** Kurzlabels für die Bestätigung („du bist Business-Founder"). */
const SHORT_ROLE: Record<FounderRole, string> = {
  tech: "Tech",
  commercial: "Business",
  product: "Produkt",
  design: "Design",
  operations: "Operations",
  "domain-expert": "Domain-Expert:in",
};

const SHOW_RE = /\b(zeig|zeige|guck|schau|öffne|öffnen|anzeigen|anschauen|ansehen|show|wer ist|profil von|details zu|mehr zu|mehr über)\b/i;
const SHOW_STOPWORDS = new Set([
  "zeig", "zeige", "mir", "mal", "den", "die", "das", "dir", "an", "bitte", "doch", "guck", "schau", "öffne", "öffnen",
  "profil", "von", "zu", "mehr", "über", "wer", "ist", "person", "details", "dem", "der", "des", "ich", "will", "möchte",
  "ansehen", "anschauen", "anzeigen", "show", "me", "nochmal", "genauer", "noch", "und", "diesen", "diese", "dieser",
  "einmal", "gerne", "gern", "kannst", "du", "auch", "jetzt", "einen", "eine", "ein", "wie", "hier", "dann",
]);
/** Wörter, die keine Namen sind – „zeig mir Kandidaten" ist ein Vorschlags-, kein Anzeige-Wunsch. */
const GENERIC_WORDS = new Set([
  "kandidat", "kandidaten", "kandidatin", "kandidatinnen", "leute", "kontakte", "kontakt", "matches", "match", "jemand",
  "jemanden", "wen", "alle", "vorschläge", "vorschlag", "profile", "profil", "top", "drei", "3", "passende", "passenden",
  "personen", "menschen", "gründer", "gründerinnen", "investoren", "investor", "mentoren", "mentor", "talente", "talent",
  "experten", "expert", "cofounder", "co-founder", "cofounders", "team", "liste", "ergebnisse", "treffer", "beste", "besten",
]);
const WANTS_CANDIDATES_RE =
  /kandidat|vorschl|zeig mir (wen|leute|kontakte|jemand|alle|die besten|meine)|wen hast du|matches|passende|empfehl|wer passt|leg los|los geht|kontakte|top ?3|wen kennst du|wen gibt es/i;
/** Suchbefehl irgendwo im Satz (general). Wortstämme ohne \b am Ende, damit „suche"/„finde" greifen. */
const SEARCH_RE = /(^|[^a-zäöüß])(such|find|liste|zeig|gibt es|gibt's|welche|wer (von|aus|hat)|filter)/i;
/** Suchbefehl am Satzanfang (interview – dort ist „ich suche einen Investor" eine Antwort, kein Befehl). */
const SEARCH_CMD_START_RE = /^(bitte |hey |hi |ok |okay )?(such|find|zeig|liste|gibt es|gibt's|welche|wer )/i;
const OPEN_RE = /\b(offen|keine (konkrete )?idee|noch nicht|weiß (noch )?nicht|flexibel|egal|alles|ergebnisoffen)\b/i;
const OPEN_GLOBAL_RE = /offen für (ideen|alles|neues|vieles|andere)|keine (konkrete |eigene )?idee/i;
const SELF_RE = /\b(ich bin|bin ich|ich komme|ich mache|ich habe|mein hintergrund|ich arbeite|von haus aus|ich als|selbst|meine rolle|ich kann)\b/i;
const SEEK_RE = /(^|[^a-zäöüß])(such|brauch|fehlt|hätte gern|wünsch|finden|interessiert an|kennenlernen|treffen|looking for|need)/i;
const IDEA_LIKE_RE = /(meine idee|ich baue|wir bauen|ich möchte .* bauen|ich will .* bauen|startup für|plattform|app für|tool für|marktplatz)/i;

/* ------------------------------------------------------------------ */
/* Helfer                                                              */
/* ------------------------------------------------------------------ */

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Keyword am Wortanfang; sehr kurze Keywords (≤3) brauchen auch ein Wortende. */
function hasKeyword(text: string, kw: string): boolean {
  const tail = kw.length <= 3 ? "(?![a-zäöüß])" : "";
  return new RegExp(`(^|[^a-zäöüß])${escapeRe(kw)}${tail}`, "i").test(text);
}

function verticalsIn(text: string): string[] {
  return Object.entries(VERTICAL_KEYWORDS)
    .filter(([, kws]) => kws.some((k) => hasKeyword(text, k)))
    .map(([v]) => v);
}

function founderRolesIn(text: string): FounderRole[] {
  return (Object.keys(FOUNDER_ROLE_KEYWORDS) as FounderRole[]).filter((r) =>
    FOUNDER_ROLE_KEYWORDS[r].some((k) => hasKeyword(text, k)),
  );
}

function networkRolesIn(text: string): NetworkRole[] {
  return (Object.keys(NETWORK_ROLE_KEYWORDS) as NetworkRole[]).filter((r) =>
    NETWORK_ROLE_KEYWORDS[r].some((k) => hasKeyword(text, k)),
  );
}

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

function detectAskedField(lastAssistant: string): InterviewField | null {
  for (const field of Object.keys(QUESTIONS) as InterviewField[]) {
    if (lastAssistant.includes(QUESTIONS[field])) return field;
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

/* ------------------------------------------------------------------ */
/* Extraktion                                                          */
/* ------------------------------------------------------------------ */

function extractPatch(text: string, ctx: UserContext, askedField: InterviewField | null): Partial<UserContext> {
  const patch: Partial<UserContext> = {};
  const lower = text.toLowerCase();

  // Name („ich heiße Max", „mein Name ist Max")
  const nameMatch = text.match(/(?:ich heiße|mein name ist)\s+([A-ZÄÖÜ][\wäöüß-]+(?:\s+[A-ZÄÖÜ][\wäöüß-]+)?)/);
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
  const clauses = lower.split(/[,.;!?\n]| und | aber | sowie | außerdem /).filter((c) => c.trim());
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
      .split(/,|;| und | & |\n|•|\//)
      .map((s) => s.replace(/^(ich (kann|bin)|meine stärken? (sind|ist)|stärken?:)\s*/i, "").trim())
      .filter((s) => s.length >= 2 && s.length <= 60);
    const strengths = items.length > 0 ? items.slice(0, 6) : text.trim().length > 0 ? [text.trim().slice(0, 80)] : [];
    if (strengths.length > 0) patch.strengths = union(ctx.strengths, strengths);
  }

  return patch;
}

/* ------------------------------------------------------------------ */
/* Antworten                                                           */
/* ------------------------------------------------------------------ */

function ackFor(patch: Partial<UserContext>): string {
  const parts: string[] = [];
  if (patch.founderRole) parts.push(`du bist ${SHORT_ROLE[patch.founderRole]}-Founder`);
  if (patch.lookingForRoles?.length || patch.lookingFor?.length) {
    const who = (patch.lookingFor ?? []).map((r) => NETWORK_ROLE_LABELS[r]).join(", ");
    const roles = (patch.lookingForRoles ?? []).map((r) => FOUNDER_ROLE_LABELS[r]).join(", ");
    parts.push(`du suchst ${who || "Co-Founder"}${roles ? ` (${roles})` : ""}`);
  }
  if (patch.verticals?.length) parts.push(`Bereich ${patch.verticals.join(", ")}`);
  if (patch.stage) parts.push(`Stage ${patch.stage}`);
  if (patch.openToIdeas && !patch.idea) parts.push("offen für Ideen");
  if (patch.idea) parts.push("Idee notiert");
  if (patch.strengths?.length) parts.push(`Stärken: ${patch.strengths.slice(0, 3).join(", ")}`);
  const greeting = patch.name ? `Hi ${patch.name}!` : "";
  if (parts.length === 0) return greeting;
  return `${greeting ? `${greeting} ` : ""}Notiert: ${parts.join(", ")}.`;
}

function opener(mode: ChatRequest["mode"], ctx: UserContext | null): string {
  if (mode === "general") {
    return "Hi, ich bin dein FounderRadar-Assistent. Ich kann Kontakte suchen („suche Fintech-Investoren“), Profile öffnen („zeig mir Max“) oder dir deine Top-Matches vorschlagen („zeig mir Kandidaten“). Was brauchst du?";
  }
  const missing = getMissingInterviewFields(ctx);
  if (missing.length === 0) {
    return "Hi! Ich kenne deinen Kontext schon. Sag „zeig mir Kandidaten“, dann schlage ich dir passende Kontakte vor – oder erzähl mir, was sich geändert hat.";
  }
  const name = ctx?.name ? ` ${ctx.name}` : "";
  return `Hi${name}, ich bin dein FounderRadar-Coach. Ein paar kurze Fragen, dann schlage ich dir passende Kontakte vor. ${QUESTIONS[missing[0]]}`;
}

function looksLikeKeywordAnswer(text: string): boolean {
  const lower = text.toLowerCase();
  return founderRolesIn(lower).length > 0 || networkRolesIn(lower).length > 0 || verticalsIn(lower).length > 0 || Boolean(stageIn(lower, true));
}

function tryShowCandidate(text: string): ChatResponse | null {
  const trimmed = text.trim();
  const hasVerb = SHOW_RE.test(trimmed);
  // Nur ein Name als Nachricht („Max Mustermann") → direkt öffnen, falls eindeutig und kein Schlagwort.
  if (!hasVerb) {
    if (trimmed.length <= 40 && /^[A-ZÄÖÜ][\wäöüß-]+(\s+[A-ZÄÖÜ][\wäöüß-]+){0,2}$/.test(trimmed) && !looksLikeKeywordAnswer(trimmed)) {
      const direct = findProfileByName(trimmed);
      if (direct.length === 1) return showResponse(direct[0]);
    }
    return null;
  }
  const tokens = trimmed
    .replace(/[?!.,;:„“"']/g, " ")
    .split(/\s+/)
    .filter((t) => t && !SHOW_STOPWORDS.has(t.toLowerCase()));
  // „zeig mir Kandidaten/Investoren" → kein Name → Vorschlags-/Suchlogik übernimmt.
  if (tokens.length === 0 || tokens.every((t) => GENERIC_WORDS.has(t.toLowerCase()))) return null;
  const nameTokens = tokens.filter((t) => !GENERIC_WORDS.has(t.toLowerCase()));
  const phrase = nameTokens.join(" ");
  let found = findProfileByName(phrase);
  if (found.length === 0) {
    const seen = new Map<string, Profile>();
    for (const t of nameTokens.filter((x) => x.length >= 3)) for (const p of findProfileByName(t)) seen.set(p.id, p);
    found = Array.from(seen.values());
  }
  if (found.length === 0) {
    return {
      reply: `Ich finde niemanden namens „${phrase}“. Probier den vollen Namen – oder sag „suche <Rolle> <Bereich>“, dann suche ich breiter.`,
      uiActions: [],
    };
  }
  if (found.length === 1) return showResponse(found[0]);
  const list = found
    .slice(0, 5)
    .map((p) => `- ${p.name} – ${describeRole(p)}${p.headline ? `, ${p.headline}` : ""}`)
    .join("\n");
  return {
    reply: `Ich habe mehrere Treffer. Wen meinst du?\n${list}\nSag einfach den vollen Namen.`,
    uiActions: [{ type: "show_candidates", profileIds: found.slice(0, 5).map((p) => p.id) }],
  };
}

function showResponse(p: Profile): ChatResponse {
  const first = firstName(p.name);
  const q = likelyQuestionsFor(p)[0];
  const highlight = p.headline ? ` ${p.headline}.` : "";
  return {
    reply: `Hier ist ${p.name} – ${describeRole(p)}.${highlight} Wenn du mit ${first} sprichst, wird ${first} wahrscheinlich wissen wollen: „${q}“`,
    uiActions: [{ type: "show_candidate", profileId: p.id }],
  };
}

function trySearch(text: string, ctx: UserContext | null, mode: ChatRequest["mode"]): ChatResponse | null {
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
  if (results.length === 0) {
    return { reply: "Dazu finde ich gerade niemanden. Versuch es mit einem anderen Bereich oder einer anderen Rolle.", uiActions: [] };
  }
  const ranked = ctx
    ? rankCandidates(ctx, results)
        .map((r) => getProfile(r.profileId))
        .filter((p): p is Profile => Boolean(p))
    : results;
  const top = ranked.slice(0, 5);
  const label = [
    nets[0] ? NETWORK_ROLE_LABELS[nets[0]] : "Kontakte",
    roles[0] && !nets[0] ? `(${FOUNDER_ROLE_LABELS[roles[0]]})` : "",
    verticals[0] ? `im Bereich ${verticals[0]}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const list = top.map((p) => `- ${p.name} – ${describeRole(p)}${p.headline ? `, ${p.headline}` : ""}`).join("\n");
  return {
    reply: `${results.length} Treffer für ${label}. Die passendsten:\n${list}\nSag „zeig mir <Name>“ für ein Profil.`,
    uiActions: [{ type: "show_candidates", profileIds: top.map((p) => p.id) }],
  };
}

function proposeCandidates(ctx: UserContext, patch: Partial<UserContext>, intro: string): ChatResponse {
  const pool = getProfiles();
  const uiActions: UiAction[] = [];
  if (hasPatch(patch)) uiActions.push({ type: "update_user_context", patch });
  if (pool.length === 0) {
    return {
      reply: `${intro} Allerdings sind noch keine Profile in der Datenbank – sobald Kontakte importiert sind, schlage ich dir hier die besten vor.`,
      uiActions,
      userContextPatch: hasPatch(patch) ? patch : undefined,
    };
  }
  const ranked = rankCandidates(ctx, pool);
  const positive = ranked.filter((r) => r.score > 0);
  const top = (positive.length > 0 ? positive : ranked).slice(0, 3);
  const lines = top.map((r, i) => {
    const p = getProfile(r.profileId);
    if (!p) return `${i + 1}. (unbekanntes Profil)`;
    const first = firstName(p.name);
    const why = humanize(r.reasons.slice(0, 2).map((x) => x.detail).join(" ")) || "Solides Grund-Match.";
    const q = likelyQuestionsFor(p)[0];
    return `${i + 1}. ${p.name} – ${describeRole(p)} (Match ${r.score} %). ${why} Wenn du mit ${first} sprichst, wird ${first} wahrscheinlich wissen wollen: „${q}“`;
  });
  uiActions.push({ type: "show_candidates", profileIds: top.map((r) => r.profileId) });
  return {
    reply: `${intro}\n${lines.join("\n")}\nSag „zeig mir <Name>“ für das ganze Profil – oder erzähl mir mehr, dann verfeinere ich die Auswahl.`,
    uiActions,
    userContextPatch: hasPatch(patch) ? patch : undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Prep-Simulation                                                     */
/* ------------------------------------------------------------------ */

const REACTIONS: Record<string, string> = {
  visionary: "Spannend, da steckt was drin.",
  builder: "Okay, verstanden.",
  operator: "Gut, das ist nachvollziehbar.",
  connector: "Cool, danke fürs Teilen!",
  analyst: "Hm, interessant – das schaue ich mir genauer an.",
};

function endWithPeriod(s: string): string {
  const t = s.trim();
  return /[.!?…]$/.test(t) ? t : `${t}.`;
}

function runPrepSimulation(req: ChatRequest): ChatResponse {
  const candidate = req.candidateId ? getProfile(req.candidateId) : undefined;
  if (!candidate) {
    return {
      reply: "Für die Simulation brauche ich eine Person. Wähle zuerst eine Kandidatin oder einen Kandidaten aus – dann spiele ich sie im Gespräch.",
      uiActions: [],
    };
  }
  const messages = req.messages ?? [];
  const lastUser = lastOfRole(messages, "user");
  const userMsgs = messages.filter((m) => m.role === "user");
  const assistantTurns = messages.filter((m) => m.role === "assistant").length;
  const first = firstName(candidate.name);
  const type = candidate.personality?.type;

  if (/\bfeedback\b|\bstopp\b|\bstop\b|abbrechen|beenden/i.test(lastUser)) {
    const avgLen = userMsgs.length > 0 ? userMsgs.reduce((n, m) => n + m.content.length, 0) / userMsgs.length : 0;
    const style = candidate.personality?.communicationStyle ?? "klar und auf den Punkt";
    const tip = candidate.personality?.outreachTips?.[0] ?? `Bereite eine konkrete Antwort auf „${likelyQuestionsFor(candidate)[0]}“ vor`;
    const reply = [
      `Raus aus der Rolle – hier mein Feedback zu deinem Gespräch mit ${first}:`,
      `1. Gut: ${userMsgs.length >= 3 ? "Du bist dran geblieben und hast auf jede Frage geantwortet." : "Guter Einstieg – du hast das Gespräch eröffnet und Interesse gezeigt."}`,
      `2. Besser: ${
        avgLen < 60
          ? "Deine Antworten waren knapp – gib bei Vision, Traktion oder Rollenverteilung 1–2 konkrete Beispiele oder Zahlen."
          : "Du warst ausführlich – achte auf den roten Faden: erst Problem, dann Lösung, dann Beleg."
      }`,
      `3. Fürs echte Gespräch: ${first} ist ${type ? PERSONALITY_LABELS[type] : "eher pragmatisch"} – ${endWithPeriod(style)} ${endWithPeriod(tip)}`,
    ].join("\n");
    return { reply, uiActions: [] };
  }

  const questions = likelyQuestionsFor(candidate);
  if (assistantTurns === 0 && !lastUser) {
    const headline = candidate.headline ? `, ${candidate.headline}` : "";
    return {
      reply: `Hi, ich bin ${candidate.name}${headline}. Schön, dass wir sprechen! Erzähl mal: ${questions[0]}`,
      uiActions: [{ type: "show_candidate", profileId: candidate.id }],
    };
  }
  const idx = Math.min(assistantTurns, questions.length);
  const reaction = (type && REACTIONS[type]) ?? "Verstehe.";
  if (idx >= questions.length) {
    return {
      reply: `${reaction} Das war von meiner Seite erst mal alles – lass uns gern dranbleiben. Sag „Feedback“, wenn du meine Coach-Einschätzung zum Gespräch willst.`,
      uiActions: [],
    };
  }
  const nudge = lastUser.length > 0 && lastUser.length < 25 ? " Magst du das noch etwas konkreter machen? Und:" : "";
  return { reply: `${reaction}${nudge} ${questions[idx]}`, uiActions: [] };
}

/* ------------------------------------------------------------------ */
/* Einstieg                                                            */
/* ------------------------------------------------------------------ */

export function runFallbackChat(req: ChatRequest): ChatResponse {
  if (req.mode === "prep-simulation") return runPrepSimulation(req);

  const messages = req.messages ?? [];
  const lastUser = lastOfRole(messages, "user");
  const lastAssistant = lastOfRole(messages, "assistant");
  const userTurns = messages.filter((m) => m.role === "user").length;
  const base = req.userContext ? mergeUserContext(req.userContext, {}) : null;

  if (!lastUser) return { reply: opener(req.mode, base), uiActions: [] };

  const shown = tryShowCandidate(lastUser);
  if (shown) return shown;

  const askedField = detectAskedField(lastAssistant);
  const patch = extractPatch(lastUser, base ?? EMPTY_USER_CONTEXT, askedField);
  const merged = mergeUserContext(base, patch);

  const searched = trySearch(lastUser, merged, req.mode);
  if (searched) return withPatchActions(searched, patch);

  const missing = getMissingInterviewFields(merged);
  const wantsCandidates = WANTS_CANDIDATES_RE.test(lastUser);
  const enough = hasEnoughForProposals(merged);
  const ack = ackFor(patch);

  if (req.mode === "general") {
    if (wantsCandidates && enough) return proposeCandidates(merged, patch, "Deine Top-Matches:");
    if (wantsCandidates) {
      const need = missing.slice(0, 2).map((f) => INTERVIEW_FIELD_LABELS[f]).join(" und ");
      return withPatchActions({ reply: `Dafür brauche ich noch kurz: ${need}. ${QUESTIONS[missing[0]]}`, uiActions: [] }, patch);
    }
    if (ack) {
      return withPatchActions(
        {
          reply: `${ack} ${enough ? "Soll ich dir passende Kontakte zeigen? Sag einfach „zeig mir Kandidaten“." : "Erzähl gern mehr – oder sag „suche <Rolle> <Bereich>“."}`,
          uiActions: [],
        },
        patch,
      );
    }
    return {
      reply: "Ich kann Kontakte suchen („suche Fintech-Investoren“), Profile öffnen („zeig mir Max“) oder deine Top-Matches vorschlagen („zeig mir Kandidaten“). Was möchtest du?",
      uiActions: [],
    };
  }

  // Interview
  const done = missing.length === 0;
  if (done || (wantsCandidates && enough) || (userTurns >= 6 && enough)) {
    const finalPatch: Partial<UserContext> = { ...patch, completedInterview: true };
    const intro = `${ack ? `${ack} ` : ""}Ich habe genug, um dir erste Kontakte vorzuschlagen. Meine Top 3 für dich:`;
    return proposeCandidates(merged, finalPatch, intro);
  }
  if (wantsCandidates && !enough) {
    const need = missing.slice(0, 2).map((f) => INTERVIEW_FIELD_LABELS[f]).join(" und ");
    return withPatchActions(
      { reply: `${ack ? `${ack} ` : ""}Gleich – dafür brauche ich noch kurz: ${need}. ${QUESTIONS[missing[0]]}`, uiActions: [] },
      patch,
    );
  }
  // Nächste Frage: nicht zweimal hintereinander dieselbe stellen.
  const next = missing.find((f) => f !== askedField) ?? missing[0];
  const lead = ack || (askedField ? "Alles klar." : "");
  return withPatchActions({ reply: `${lead ? `${lead} ` : ""}${QUESTIONS[next]}`, uiActions: [] }, patch);
}
