/**
 * Outreach: persönlichkeitsangepasste Erstkontakt-Nachrichten (E-Mail / LinkedIn).
 * ---------------------------------------------------------------
 * Isomorph (kein "use client", keine Node-APIs): der Template-Pfad läuft im Browser und im
 * Route-Handler, die Prompt-Funktionen nutzt nur der Server (/api/outreach).
 * Owner: Paket "outreach" (docs/PARALLEL-WORK.md).
 *
 * Ton je Persönlichkeitstyp der Zielperson:
 *   visionary → Big Picture zuerst, offene "Wohin"-Frage am Ende
 *   builder   → konkret: was wird gebaut, Demo als Ask
 *   operator  → Ask im ersten Satz, klarer nächster Schritt mit Terminvorschlag
 *   connector → warm, gemeinsame Events/Community zuerst, Kaffee als Ask
 *   analyst   → Zahlen/Fakten, nummerierte Gründe, Faktencheck als Ask
 */
import { getEvent } from "./data";
import { scoreMatch } from "./matching";
import {
  FOUNDER_DIM_KEYS,
  FOUNDER_DIM_LABELS,
  PERSONALITY_LABELS,
  type Event,
  type FounderDimKey,
  type FounderDims,
  type FounderRole,
  type MatchResult,
  type NetworkRole,
  type OutreachDraft,
  type PersonalityType,
  type Profile,
  type Stage,
  type UserContext,
} from "./types";

export type OutreachChannel = OutreachDraft["channel"];

/** Harte Grenze für LinkedIn-Connection-Notes. */
export const LINKEDIN_MAX_CHARS = 300;
export const EMAIL_MIN_WORDS = 90;
export const EMAIL_MAX_WORDS = 160;

/* ------------------------------------------------------------------ */
/* Vokabular (deutsch)                                                 */
/* ------------------------------------------------------------------ */

const NETWORK_ROLE_LABELS: Record<NetworkRole, string> = {
  cofounder: "Co-Founder:in",
  investor: "Investor:in",
  mentor: "Mentor:in",
  talent: "Talent fürs erste Team",
  expert: "Expert:in",
};

const FOUNDER_ROLE_LABELS: Record<FounderRole, string> = {
  tech: "Tech",
  commercial: "Commercial",
  product: "Produkt",
  design: "Design",
  operations: "Operations",
  "domain-expert": "Domain-Expertise",
};

const STAGE_LABELS: Record<Stage, string> = {
  idea: "Idea-Phase",
  "pre-seed": "Pre-Seed",
  seed: "Seed",
  "series-a": "Series A",
  growth: "Growth",
};

const VERTICAL_LABELS: Record<string, string> = {
  ai: "AI",
  fintech: "Fintech",
  healthtech: "Healthtech",
  climate: "Climate-Tech",
  "b2b saas": "B2B SaaS",
  consumer: "Consumer",
  robotics: "Robotics",
  defense: "Defense",
  edtech: "EdTech",
  mobility: "Mobility",
  proptech: "PropTech",
  deeptech: "Deeptech",
  ecommerce: "E-Commerce",
  "hr tech": "HR-Tech",
  legaltech: "Legaltech",
  energy: "Energy",
  biotech: "Biotech",
  media: "Media",
};

/** Die lookingFor-Tags der Profile (englisch, PARALLEL-WORK.md) als deutsche Objekte. */
const LOOKING_FOR_DE: Record<string, string> = {
  "technical cofounder": "eine:n Tech-Co-Founder:in",
  "commercial cofounder": "eine:n Commercial-Co-Founder:in",
  "product cofounder": "eine:n Product-Co-Founder:in",
  "design cofounder": "eine:n Design-Co-Founder:in",
  "operations cofounder": "eine:n Ops-Co-Founder:in",
  "pre-seed investment": "ein Pre-Seed-Investment",
  "seed investment": "ein Seed-Investment",
  "angel investment": "ein Angel-Investment",
  mentor: "eine:n Mentor:in",
  mentees: "Mentees",
  "advisor role": "eine Advisor-Rolle",
  "job as engineer": "eine Rolle als Engineer",
  "job as product manager": "eine Product-Rolle",
  "job as designer": "eine Design-Rolle",
  "startups to invest in": "Startups zum Investieren",
  dealflow: "Dealflow",
  partnerships: "Partnerschaften",
  "first hires": "erste Hires",
};

/* ------------------------------------------------------------------ */
/* Text-Helfer                                                          */
/* ------------------------------------------------------------------ */

function firstName(fullName: string): string {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter((p) => p && !/^(dr|prof|mr|mrs|ms|herr|frau)\.?$/i.test(p));
  return parts[0] ?? fullName.trim();
}

/** "a", "a und b", "a, b und c" */
function joinDe(items: string[]): string {
  const list = items.filter(Boolean);
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(", ")} und ${list[list.length - 1]}`;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Entfernt Satzzeichen am Ende ("Idee." → "Idee"). */
function trimPunct(s: string): string {
  return s.trim().replace(/[.!?…\s]+$/u, "");
}

/** Stellt sicher, dass ein Satz mit Satzzeichen endet. */
function sentence(s: string): string {
  const t = s.trim();
  if (!t) return "";
  return /[.!?…]$/u.test(t) ? t : `${t}.`;
}

/** Kürzt auf max Zeichen an einer Wortgrenze, mit "…". */
function shorten(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, Math.max(0, max - 1));
  const atSpace = cut.lastIndexOf(" ");
  return `${(atSpace > max * 0.5 ? cut.slice(0, atSpace) : cut).replace(/[\s,;:–-]+$/u, "")}…`;
}

function verticalLabel(v: string): string {
  const key = v.trim().toLowerCase();
  return VERTICAL_LABELS[key] ?? capitalize(key);
}

function lookingForDe(tag: string): string {
  const key = tag.trim().toLowerCase();
  return LOOKING_FOR_DE[key] ?? `„${tag.trim()}“`;
}

/**
 * Kürzt eine LinkedIn-Note hart auf LINKEDIN_MAX_CHARS – bevorzugt an einer Satzgrenze,
 * sonst an einer Wortgrenze mit "…". Wird auch für LLM-Output genutzt.
 */
export function clampLinkedInNote(text: string): string {
  const t = text.trim().replace(/\s*\n+\s*/g, " ");
  if (t.length <= LINKEDIN_MAX_CHARS) return t;
  const window = t.slice(0, LINKEDIN_MAX_CHARS);
  const lastSentenceEnd = Math.max(window.lastIndexOf(". "), window.lastIndexOf("! "), window.lastIndexOf("? "));
  if (lastSentenceEnd >= LINKEDIN_MAX_CHARS * 0.55) return window.slice(0, lastSentenceEnd + 1).trim();
  return shorten(t, LINKEDIN_MAX_CHARS);
}

/* ------------------------------------------------------------------ */
/* Kontext: alles, was die Texte brauchen, einmal berechnet             */
/* ------------------------------------------------------------------ */

interface OutreachContext {
  user: UserContext;
  profile: Profile;
  type: PersonalityType;
  channel: OutreachChannel;
  /** Vorname der Zielperson */
  to: string;
  /** Vorname der Nutzer:in ("" wenn unbekannt) */
  from: string;
  match: MatchResult;
  events: Event[];
  sharedVerticals: string[];
  /** Für Betreffzeilen: kurze Idee oder "mein Startup" */
  ideaShort: string;
  /** Für LinkedIn-Notes: etwas längere Idee (null, wenn keine Idee im Kontext) */
  ideaMedium: string | null;
  ideaSentence: string | null;
  /** "eine:n Co-Founder:in auf der Commercial-Seite" / "Commercial-Co-Founder:in" */
  ask: { long: string; short: string };
  /** "deine Erfahrung als CTO bei Acme" */
  hook: string | null;
  complement: string | null;
  reciprocal: string | null;
  strengths: string | null;
  stageLabel: string | null;
  eventSentence: string | null;
  verticalSentence: string | null;
  lookingSentence: string;
}

function resolveEvents(profile: Profile): Event[] {
  return (profile.events ?? []).map((slug) => getEvent(slug)).filter((e): e is Event => Boolean(e));
}

function profileHook(profile: Profile): string | null {
  const exp = profile.experience ?? [];
  const current = exp.find((e) => !e.end) ?? exp[0];
  if (current?.title && current?.company) return `deine Erfahrung als ${current.title} bei ${current.company}`;
  if (profile.headline) return `dein Profil („${shorten(profile.headline, 60)}“)`;
  return null;
}

function buildAsk(user: UserContext, profile: Profile): { long: string; short: string } {
  const roles = (user.lookingForRoles ?? []).map((r) => FOUNDER_ROLE_LABELS[r] ?? r);
  const vertical = user.verticals?.[0] ? verticalLabel(user.verticals[0]) : null;
  switch (profile.networkRole) {
    case "investor": {
      switch (user.stage) {
        case "pre-seed":
        case "seed":
          return { long: `Investor:innen für unsere ${STAGE_LABELS[user.stage]}-Runde`, short: "Investor:innen-Gespräch" };
        case "series-a":
          return { long: "Investor:innen für unsere Series A", short: "Series-A-Gespräch" };
        case "growth":
          return { long: "Growth-Investor:innen", short: "Growth-Gespräch" };
        default:
          return { long: "erste, frühe Gespräche mit Angels und Pre-Seed-Investor:innen", short: "Angel-Gespräch" };
      }
    }
    case "mentor":
      return {
        long: vertical ? `eine:n Mentor:in, der oder die ${vertical} wirklich kennt` : "eine:n Mentor:in mit eigener Gründungserfahrung",
        short: "Mentor:in",
      };
    case "talent":
      return roles.length
        ? { long: `erste Teammitglieder im Bereich ${joinDe(roles)}`, short: `${roles[0]}-Talent` }
        : { long: "erste Teammitglieder", short: "Talent fürs Team" };
    case "expert":
      return {
        long: vertical ? `den Austausch mit Leuten, die ${vertical} wirklich verstehen` : "den Austausch mit erfahrenen Expert:innen",
        short: "Experten-Austausch",
      };
    case "cofounder":
    default:
      return roles.length
        ? { long: `eine:n Co-Founder:in auf der ${joinDe(roles)}-Seite`, short: `${roles[0]}-Co-Founder:in` }
        : { long: "eine:n Co-Founder:in", short: "Co-Founder:in" };
  }
}

function topDim(dims: FounderDims): FounderDimKey {
  return FOUNDER_DIM_KEYS.reduce<FounderDimKey>((best, k) => (dims[k] > dims[best] ? k : best), FOUNDER_DIM_KEYS[0]);
}

/** Die Dimension, in der das Profil die Nutzer:in am deutlichsten ergänzt (oder null). */
function strongestComplement(user: FounderDims, other: FounderDims): FounderDimKey | null {
  let best: FounderDimKey | null = null;
  let bestGap = 0;
  for (const k of FOUNDER_DIM_KEYS) {
    const gap = other[k] - user[k];
    if (other[k] >= 6 && gap >= 2 && gap > bestGap) {
      best = k;
      bestGap = gap;
    }
  }
  return best;
}

function buildComplement(user: UserContext, profile: Profile, match: MatchResult): string | null {
  const roleReason = match.reasons.find((r) => r.label === "Fehlende Team-Rolle");
  if (roleReason && profile.founderRole) {
    const mine = user.founderRole ? ` – ich komme von der ${FOUNDER_ROLE_LABELS[user.founderRole]}-Seite` : "";
    return `Deine ${FOUNDER_ROLE_LABELS[profile.founderRole]}-Seite ist genau das, was in meinem Team gerade fehlt${mine}.`;
  }
  const dim = strongestComplement(user.dims, profile.dims);
  if (dim) {
    const mine = topDim(user.dims);
    return mine !== dim
      ? `Du bist stark in ${FOUNDER_DIM_LABELS[dim]}, ich eher in ${FOUNDER_DIM_LABELS[mine]} – das ergänzt sich ziemlich gut.`
      : `Du bist stark in ${FOUNDER_DIM_LABELS[dim]} – genau die Seite, die ich verstärken will.`;
  }
  return null;
}

function buildReciprocal(profile: Profile, match: MatchResult, type: PersonalityType): string | null {
  const wants = (profile.lookingFor ?? []).slice(0, 2).map(lookingForDe);
  if (!wants.length) return null;
  const fits = match.reasons.some((r) => r.label === "Sucht jemanden wie dich");
  if (fits) return `Du suchst ${joinDe(wants)} – das passt ziemlich genau zu dem, was ich mitbringe.`;
  if (type === "connector") return `Du suchst ${joinDe(wants)} – vielleicht kann ich dir über mein Netzwerk jemanden vorstellen.`;
  return null;
}

function buildLookingSentence(profile: Profile, ask: { long: string }): string {
  switch (profile.networkRole) {
    case "investor":
      return `Ich suche gerade ${ask.long} – und Menschen, die ehrlich sagen, was noch fehlt.`;
    case "mentor":
      return `Ich suche gerade ${ask.long}.`;
    case "expert":
      return `Ich suche ${ask.long}.`;
    case "talent":
    case "cofounder":
    default:
      return `Konkret suche ich ${ask.long}.`;
  }
}

function buildContext(user: UserContext, profile: Profile, channel: OutreachChannel): OutreachContext {
  const type: PersonalityType = profile.personality?.type ?? "builder";
  const match = scoreMatch(user, profile);
  const events = resolveEvents(profile);
  const userVerticals = (user.verticals ?? []).map((v) => v.toLowerCase());
  const sharedVerticals = (profile.verticals ?? []).filter((v) => userVerticals.includes(v.toLowerCase())).map(verticalLabel);
  const idea = user.idea?.trim() ?? "";
  const ask = buildAsk(user, profile);
  const strengths = (user.strengths ?? []).filter(Boolean).slice(0, 3);
  const eventNames = events.map((e) => e.name);

  return {
    user,
    profile,
    type,
    channel,
    to: firstName(profile.name) || "du",
    from: user.name ? firstName(user.name) : "",
    match,
    events,
    sharedVerticals,
    ideaShort: idea ? shorten(trimPunct(idea), 48) : "mein Startup",
    ideaMedium: idea ? shorten(trimPunct(idea), 100) : null,
    ideaSentence: idea ? sentence(`Woran ich gerade arbeite: ${trimPunct(idea)}`) : null,
    ask,
    hook: profileHook(profile),
    complement: buildComplement(user, profile, match),
    reciprocal: buildReciprocal(profile, match, type),
    strengths: strengths.length ? `Was ich mitbringe: ${joinDe(strengths)}.` : null,
    stageLabel: user.stage ? STAGE_LABELS[user.stage] : null,
    eventSentence: eventNames.length ? `Ich habe gesehen, dass du bei ${joinDe(eventNames.slice(0, 2))} dabei bist – ich bin auch dort.` : null,
    verticalSentence: sharedVerticals.length ? `Wir bewegen uns beide in ${joinDe(sharedVerticals)}.` : null,
    lookingSentence: buildLookingSentence(profile, ask),
  };
}

/* ------------------------------------------------------------------ */
/* E-Mail-Bauplan und Längensteuerung                                   */
/* ------------------------------------------------------------------ */

interface Sentence {
  text: string;
  /** Darf beim Kürzen nicht entfernt werden. */
  keep?: boolean;
  /** Nur für Füllsätze: Index des Absatzes, in den der Satz gehört (Default: Brücken-Absatz 1). */
  at?: number;
}

interface EmailPlan {
  subject: string;
  /** Absätze zwischen Anrede und Gruß. */
  paragraphs: Sentence[][];
  /** Werden bei zu kurzer Mail (in dieser Reihenfolge) ergänzt. */
  fillers: Sentence[];
  signoff: string;
}

interface StylePlan {
  email: EmailPlan;
  /** LinkedIn-Varianten, von ausführlich nach knapp; die erste ≤ 300 Zeichen gewinnt. */
  linkedin: string[];
  /** Die zwei Kern-Sätze, warum so formuliert (Tipps/Don'ts kommen dazu). */
  notes: string[];
}

function s(text: string | null | undefined, keep = false): Sentence | null {
  return text ? { text, keep } : null;
}

/** Füllsatz für einen bestimmten Absatz (Index in EmailPlan.paragraphs). */
function f(text: string | null | undefined, at: number): Sentence | null {
  return text ? { text, at } : null;
}

function compact(items: (Sentence | null)[]): Sentence[] {
  return items.filter((x): x is Sentence => Boolean(x && x.text));
}

function assembleEmail(plan: EmailPlan, ctx: OutreachContext): string {
  const greeting = `Hi ${ctx.to},`;
  const signoff = ctx.from ? `${plan.signoff}\n${ctx.from}` : plan.signoff;
  const paragraphs = plan.paragraphs.map((p) => [...p]);

  const render = () =>
    [greeting, ...paragraphs.filter((p) => p.length).map((p) => p.map((x) => x.text).join(" ")), signoff].join("\n\n");

  // Zu lang: optionale Sätze von hinten nach vorn entfernen.
  for (;;) {
    if (countWords(render()) <= EMAIL_MAX_WORDS) break;
    let removed = false;
    for (let pi = paragraphs.length - 1; pi >= 0 && !removed; pi--) {
      for (let si = paragraphs[pi].length - 1; si >= 0; si--) {
        if (!paragraphs[pi][si].keep) {
          paragraphs[pi].splice(si, 1);
          removed = true;
          break;
        }
      }
    }
    if (!removed) break;
  }

  // Zu kurz: Füllsätze ergänzen (Default: Brücken-Absatz).
  const fillers = [...plan.fillers];
  const defaultTarget = Math.min(1, Math.max(0, paragraphs.length - 1));
  while (countWords(render()) < EMAIL_MIN_WORDS && fillers.length) {
    const next = fillers.shift() as Sentence;
    const target = Math.min(next.at ?? defaultTarget, paragraphs.length - 1);
    paragraphs[target].push({ text: next.text });
  }

  return render();
}

function pickLinkedIn(candidates: string[]): string {
  const cleaned = candidates.map((c) => c.replace(/\s+/g, " ").trim()).filter(Boolean);
  const fit = cleaned.find((c) => c.length <= LINKEDIN_MAX_CHARS);
  return fit ?? clampLinkedInNote(cleaned[cleaned.length - 1] ?? "");
}

/* ------------------------------------------------------------------ */
/* Stile je Persönlichkeitstyp                                          */
/* ------------------------------------------------------------------ */

type StyleBuilder = (ctx: OutreachContext) => StylePlan;

function linkedinSign(ctx: OutreachContext): string {
  return ctx.from ? ` – ${ctx.from}` : "";
}

function linkedinVariants(ctx: OutreachContext, hook: string, eventClause: string | null, ask: string, askShort: string): string[] {
  const sign = linkedinSign(ctx);
  const to = `Hi ${ctx.to},`;
  return [
    `${to} ${hook} ${eventClause ?? ""} ${ask}${sign}`,
    `${to} ${hook} ${ask}${sign}`,
    `${to} ${ask}${sign}`,
    `${to} ${askShort}${sign}`,
  ];
}

const visionary: StyleBuilder = (ctx) => {
  const theme =
    ctx.sharedVerticals[0] ??
    (ctx.user.verticals[0] ? verticalLabel(ctx.user.verticals[0]) : null) ??
    (ctx.profile.verticals[0] ? verticalLabel(ctx.profile.verticals[0]) : "unser Markt");
  const mainEvent = ctx.events[0];
  return {
    email: {
      subject: shorten(`Big Picture: ${theme} neu denken – hast du 20 Minuten?`, 90),
      paragraphs: [
        compact([
          s(`Ich glaube, ${theme} steht vor einem echten Umbruch – und genau da will ich ansetzen.`, true),
          s(ctx.ideaSentence, true),
          s(ctx.hook ? `${capitalize(ctx.hook)} zeigt mir, dass du groß denkst – deshalb schreibe ich dir.` : null),
        ]),
        compact([s(ctx.complement), s(ctx.eventSentence), s(ctx.verticalSentence)]),
        compact([
          s(ctx.lookingSentence, true),
          s("Lass uns über die große Version davon sprechen: Wo könnte das in fünf Jahren stehen, wenn wir es richtig anpacken?", true),
          s(`20 Minuten reichen – gern ${mainEvent ? `direkt bei ${mainEvent.name}` : "per Call"}.`, true),
        ]),
      ],
      fillers: compact([
        s(ctx.strengths),
        s(ctx.reciprocal),
        s(ctx.stageLabel ? `Wir sind noch früh (${ctx.stageLabel}) – genau der Moment, in dem die Richtung gesetzt wird.` : null),
        f("Mich interessiert weniger der nächste Schritt als die Frage, welches Spielfeld wir in ein paar Jahren besetzen wollen.", 2),
      ]),
      signoff: "Viele Grüße",
    },
    linkedin: linkedinVariants(
      ctx,
      `ich glaube, ${theme} steht vor einem Umbruch – und ich baue genau daran${ctx.ideaMedium ? ` (${ctx.ideaMedium})` : ""}.`,
      mainEvent ? `Wir sind beide bei ${mainEvent.name}.` : null,
      `Lust, das große Bild zu diskutieren? Ich suche ${ctx.ask.long}.`,
      `Lust auf 20 Minuten Big Picture? Ich suche ${ctx.ask.short}.`,
    ),
    notes: [
      `${ctx.profile.name} ist ${PERSONALITY_LABELS.visionary}: Die Nachricht startet mit dem großen Bild (Markt-Umbruch, Fünf-Jahres-Horizont), bevor Details kommen.`,
      "Der Abschluss ist eine offene „Wohin“-Frage statt einer engen Terminanfrage – Visionär:innen reagieren auf Möglichkeitsräume, nicht auf Kalender-Slots.",
    ],
  };
};

const builder: StyleBuilder = (ctx) => {
  const mainEvent = ctx.events[0];
  const strengths = (ctx.user.strengths ?? []).slice(0, 2);
  const status = `Stand: ${ctx.stageLabel ?? "früh"}${strengths.length ? `, ich baue selbst (${joinDe(strengths)})` : ""}.`;
  const opener = ctx.ideaSentence
    ? `Direkt zur Sache – ${ctx.ideaSentence.charAt(0).toLowerCase()}${ctx.ideaSentence.slice(1)}`
    : "Direkt zur Sache: Ich baue gerade ein Startup und suche Verstärkung.";
  return {
    email: {
      subject: shorten(`Was ich gerade baue: ${ctx.ideaShort}`, 90),
      paragraphs: [
        compact([
          s(opener, true),
          s(status, true),
          s(ctx.hook ? `${capitalize(ctx.hook)} – genau die Hands-on-Erfahrung, die mich interessiert.` : null),
        ]),
        compact([s(ctx.complement), s(ctx.verticalSentence), s(ctx.eventSentence)]),
        compact([
          s(ctx.lookingSentence, true),
          s("Ich zeig dir gern den aktuellen Stand – 15 Minuten Demo, und du sagst mir, was du anders bauen würdest.", true),
          s(mainEvent ? `Passt ${mainEvent.name} oder lieber ein kurzer Call?` : "Passt ein kurzer Call diese oder nächste Woche?", true),
        ]),
      ],
      fillers: compact([
        s(ctx.reciprocal),
        f("Kein Pitch-Deck, keine Vision-Slides – ich will dir lieber zeigen, was schon funktioniert und was noch nicht.", 2),
        s(ctx.strengths),
      ]),
      signoff: "Beste Grüße",
    },
    linkedin: linkedinVariants(
      ctx,
      ctx.ideaMedium ? sentence(`woran ich baue: ${ctx.ideaMedium}`) : "ich baue gerade ein Startup und suche Verstärkung.",
      mainEvent ? `Bei ${mainEvent.name} auch dabei?` : null,
      `Ich suche ${ctx.ask.long} und zeig dir gern eine 15-Min-Demo – dein Feedback wäre Gold.`,
      `Ich suche ${ctx.ask.short} – 15-Min-Demo?`,
    ),
    notes: [
      `${ctx.profile.name} ist ${PERSONALITY_LABELS.builder}: Die Nachricht sagt im ersten Satz, was konkret gebaut wird und wie der Stand ist – ohne Vision-Prosa.`,
      "Die Ask ist eine Demo statt „mal quatschen“, weil Builder auf Substanz und Hands-on-Feedback reagieren.",
    ],
  };
};

const operator: StyleBuilder = (ctx) => {
  const idea = ctx.user.idea?.trim() ? ` – Vorhaben: ${trimPunct(ctx.user.idea)}` : "";
  const focus = ctx.sharedVerticals.length ? `, Fokus ${joinDe(ctx.sharedVerticals)}` : "";
  return {
    email: {
      subject: shorten(`${ctx.ask.short} gesucht – 15 Minuten nächste Woche?`, 90),
      paragraphs: [
        compact([
          s(`Ich komme direkt zum Punkt: Ich suche ${ctx.ask.long}${idea}.`, true),
          s(ctx.hook ? `Warum du: ${ctx.hook}.` : null),
        ]),
        compact([
          s(ctx.complement),
          s(ctx.stageLabel ? `Status: ${ctx.stageLabel}${focus}.` : ctx.verticalSentence),
          s(ctx.eventSentence),
        ]),
        compact([
          s("Mein Vorschlag: 15 Minuten Call nächste Woche, Dienstag oder Donnerstag.", true),
          s("Vorab schicke ich dir eine Seite mit Status, Zahlen und offenen Punkten.", true),
          s("Ziel: klären, ob Rolle, Tempo und Erwartungen zusammenpassen – und wenn ja, den nächsten Schritt festlegen."),
          s("Passt einer der beiden Tage?", true),
        ]),
      ],
      fillers: compact([
        s(ctx.strengths),
        s(ctx.reciprocal),
        f("Wenn es nicht passt, reicht ein kurzes Nein – kein Problem.", 2),
        s(ctx.ideaSentence ? null : "Details zum Vorhaben schicke ich dir gern vorab, damit der Call direkt in die Sache geht."),
      ]),
      signoff: "Beste Grüße",
    },
    linkedin: linkedinVariants(
      ctx,
      `ich suche ${ctx.ask.long}${ctx.ideaMedium ? ` (${ctx.ideaMedium})` : ""}.`,
      ctx.events[0] ? `Ich bin auch bei ${ctx.events[0].name}.` : null,
      "15 Minuten nächste Woche für einen konkreten Vorschlag? Ich schicke vorab eine Seite mit Status und offenen Punkten.",
      "15 Min nächste Woche für einen konkreten Vorschlag?",
    ),
    notes: [
      `${ctx.profile.name} ist ${PERSONALITY_LABELS.operator}: Die Ask steht im ersten Satz, der nächste Schritt hat konkrete Tage und ein Vorab-Dokument.`,
      "Keine Ausschmückung und keine offenen Fragen – Operator sollen mit einem Wort antworten können.",
    ],
  };
};

const connector: StyleBuilder = (ctx) => {
  const mainEvent = ctx.events[0];
  const community = ctx.sharedVerticals[0] ?? (ctx.profile.verticals[0] ? verticalLabel(ctx.profile.verticals[0]) : "Startup");
  const opener = mainEvent
    ? `Wir sind beide bei ${mainEvent.name} – ich habe dein Profil in der Teilnehmerliste gesehen und dachte sofort: Mit dir sollte ich reden.`
    : `Dein Profil ist mir in der ${community}-Community aufgefallen – und ich dachte sofort: Mit dir sollte ich reden.`;
  const otherEvents = ctx.events.slice(1).map((e) => e.name);
  return {
    email: {
      subject: shorten(mainEvent ? `${mainEvent.name}: kurz kennenlernen?` : `Kurz kennenlernen? (${community})`, 90),
      paragraphs: [
        compact([
          s(opener, true),
          s(ctx.hook ? `${capitalize(ctx.hook)} klingt nach genau der Art von Weg, von dem ich gern mehr höre.` : null),
        ]),
        compact([
          s(ctx.verticalSentence ? `${trimPunct(ctx.verticalSentence)} – die Welt ist klein.` : null),
          s(ctx.reciprocal),
          s(ctx.complement),
          s(ctx.ideaSentence),
        ]),
        compact([
          s(ctx.lookingSentence, true),
          s(
            `Lass uns ${mainEvent ? `bei ${mainEvent.name} auf einen Kaffee treffen` : "auf einen (virtuellen) Kaffee treffen"} – ganz ohne Agenda, einfach kennenlernen.`,
            true,
          ),
          s("Freu mich, wenn's klappt!", true),
        ]),
      ],
      fillers: compact([
        f(otherEvents.length ? `Falls es dort nicht klappt: Du bist ja auch bei ${joinDe(otherEvents)} – da laufen wir uns spätestens über den Weg.` : null, 2),
        f("Und falls ich dir bei irgendwas helfen kann – sag einfach Bescheid, mein Netzwerk teile ich gern.", 2),
        s(ctx.strengths),
      ]),
      signoff: "Herzliche Grüße",
    },
    linkedin: linkedinVariants(
      ctx,
      mainEvent ? `wir sind beide bei ${mainEvent.name} und ich fand dein Profil spannend.` : `dein Profil ist mir in der ${community}-Community aufgefallen.`,
      ctx.sharedVerticals.length ? `Wir teilen ${joinDe(ctx.sharedVerticals)} als Thema.` : null,
      `Lust auf einen Kaffee${mainEvent ? " vor Ort" : ""}? Ich suche ${ctx.ask.long} und tausche mich gern aus.`,
      `Lust auf einen Kaffee? Ich suche ${ctx.ask.short}.`,
    ),
    notes: [
      `${ctx.profile.name} ist ${PERSONALITY_LABELS.connector}: Die Nachricht startet mit dem gemeinsamen Event und der Beziehung, nicht mit der Idee.`,
      "Der Ton ist warm und persönlich, die Ask ein Kaffee ohne Agenda statt ein Business-Meeting – Connector entscheiden über Menschen, nicht über Pitches.",
    ],
  };
};

const analyst: StyleBuilder = (ctx) => {
  const { match, profile, user } = ctx;
  const facts: string[] = [];
  for (const r of match.reasons) {
    switch (r.label) {
      case "Gesuchte Rolle":
        facts.push(`Ich suche ${NETWORK_ROLE_LABELS[profile.networkRole] ?? profile.networkRole} – du bist genau das.`);
        break;
      case "Fehlende Team-Rolle":
        if (profile.founderRole) facts.push(`Deine ${FOUNDER_ROLE_LABELS[profile.founderRole]}-Seite fehlt in meinem Team bisher komplett.`);
        break;
      case "Gleiches Vertical":
        if (ctx.sharedVerticals.length) facts.push(`Wir teilen ${joinDe(ctx.sharedVerticals)} als Vertical.`);
        break;
      case "Komplementäre Stärken":
        facts.push(`Unsere Stärkenprofile ergänzen sich zu ${match.complementarity} % (Abgleich über fünf Dimensionen).`);
        break;
      case "Sucht jemanden wie dich":
        facts.push(
          `Du suchst ${joinDe((profile.lookingFor ?? []).slice(0, 2).map(lookingForDe))} – das deckt sich mit meinem Profil${user.founderRole ? ` (${FOUNDER_ROLE_LABELS[user.founderRole]})` : ""}.`,
        );
        break;
      case "Gleiche Phase":
        if (profile.stage) facts.push(`Wir sind beide in der Phase ${STAGE_LABELS[profile.stage]}.`);
        break;
      default:
        break;
    }
  }
  if (ctx.events[0]) facts.push(`Wir sind beide bei ${ctx.events[0].name} – ein Treffen kostet keine Reise.`);
  if (ctx.hook) facts.push(`${capitalize(ctx.hook)} passt zu dem, was ich brauche.`);
  const top = facts.slice(0, 3);
  const numbered = top.map((f, i) => `${i + 1}) ${f}`).join(" ");
  const countWord = ["Ein Grund", "Zwei Gründe", "Drei Gründe"][Math.max(0, top.length - 1)];
  const reasonsSentence = top.length ? `${countWord}, warum ich dir schreibe: ${numbered}` : null;
  const strengths = (user.strengths ?? []).slice(0, 3);
  const idea = user.idea?.trim() ? sentence(`Kurz und faktenbasiert – woran ich gerade arbeite: ${trimPunct(user.idea)}`) : "Kurz und faktenbasiert: Ich baue ein Startup.";
  return {
    email: {
      subject: shorten(top.length ? `${ctx.ask.short} – ${top.length} Fakten, warum ich dir schreibe` : `${ctx.ask.short}: kurzer Faktencheck?`, 90),
      paragraphs: [
        compact([
          s(idea, true),
          s(ctx.stageLabel ? `Status: ${ctx.stageLabel}${strengths.length ? `, Kernkompetenzen ${joinDe(strengths)}` : ""}.` : null),
        ]),
        compact([s(reasonsSentence, true), s(`Match-Score laut Profil-Abgleich: ${match.score}/100.`)]),
        compact([
          s(ctx.lookingSentence, true),
          s(
            "Wenn die Punkte für dich Sinn ergeben, schicke ich dir einen One-Pager mit Status, Kennzahlen und offenen Fragen – und wir prüfen in 20 Minuten, ob das trägt.",
            true,
          ),
          s("Wenn nicht, ist ein kurzes Nein völlig okay."),
        ]),
      ],
      fillers: compact([
        s(ctx.eventSentence),
        f("Was ich noch nicht weiß: ob unsere Vorstellungen von Tempo, Rolle und Risiko zusammenpassen – genau das würde ich gern strukturiert prüfen.", 2),
        s(match.risks[0] ? `Offener Punkt aus meiner Sicht: ${trimPunct(match.risks[0])}.` : null),
      ]),
      signoff: "Freundliche Grüße",
    },
    linkedin: linkedinVariants(
      ctx,
      `${match.score}/100 laut meinem Profil-Abgleich: ${trimPunct(top[0] ?? "unsere Profile ergänzen sich")}.`,
      ctx.events[0] ? `Beide bei ${ctx.events[0].name}.` : null,
      `Ich suche ${ctx.ask.long} – 20 Minuten Faktencheck?`,
      `Ich suche ${ctx.ask.short} – 20 Min Faktencheck?`,
    ),
    notes: [
      `${ctx.profile.name} ist ${PERSONALITY_LABELS.analyst}: Die Nachricht liefert nummerierte Gründe, Prozentwerte und den Match-Score statt Superlativen.`,
      "Die Ask ist ein Faktencheck (One-Pager, 20 Minuten) statt ein Kennenlern-Gespräch – Analyst:innen wollen erst Belege, dann Beziehung.",
    ],
  };
};

const STYLES: Record<PersonalityType, StyleBuilder> = { visionary, builder, operator, connector, analyst };

function buildNotes(ctx: OutreachContext, core: string[]): string[] {
  const notes = core.map(sentence);
  const tips = ctx.profile.personality?.outreachTips ?? [];
  const avoid = ctx.profile.personality?.avoid ?? [];
  if (tips[0]) notes.push(sentence(`Aus dem Persönlichkeitsprofil übernommen: ${trimPunct(tips[0])}`));
  if (avoid[0]) notes.push(sentence(`Bewusst vermieden: ${trimPunct(avoid[0])}`));
  if (notes.length < 2) {
    notes.push(
      ctx.channel === "linkedin"
        ? "Als Connection-Note bleibt die Nachricht unter 300 Zeichen und endet mit einer konkreten Frage."
        : "Die E-Mail bleibt bei 90–160 Wörtern: lang genug für Kontext, kurz genug fürs Handy.",
    );
  }
  return notes.slice(0, 4);
}

/* ------------------------------------------------------------------ */
/* Public API                                                           */
/* ------------------------------------------------------------------ */

/**
 * Regelbasierter Entwurf (Fallback ohne OPENAI_API_KEY, läuft auch im Browser).
 * LinkedIn: ≤ 300 Zeichen, kein Betreff. E-Mail: Betreff + 90–160 Wörter.
 */
export function buildOutreachTemplate(user: UserContext, profile: Profile, channel: OutreachChannel): OutreachDraft {
  const ctx = buildContext(user, profile, channel);
  const plan = (STYLES[ctx.type] ?? builder)(ctx);
  const personalityNotes = buildNotes(ctx, plan.notes);

  if (channel === "linkedin") {
    return {
      profileId: profile.id,
      channel,
      body: pickLinkedIn(plan.linkedin),
      personalityNotes,
      generatedBy: "template",
    };
  }

  return {
    profileId: profile.id,
    channel: "email",
    subject: plan.email.subject,
    body: assembleEmail(plan.email, ctx),
    personalityNotes,
    generatedBy: "template",
  };
}

/** System-Prompt für den LLM-Pfad (/api/outreach). */
export function outreachSystemPrompt(): string {
  return [
    "Du bist Outreach-Copywriter:in für Gründer:innen im deutschsprachigen Startup-Ökosystem.",
    "Du schreibst im Namen der Nutzer:in (Absender:in) eine erste Kontaktnachricht an eine Zielperson, die sie noch nicht kennt.",
    "",
    "Regeln:",
    "- Deutsch, Du-Form, Startup-Ton: direkt, warm, ohne Floskeln, ohne Emojis, ohne Buzzword-Stapel. Keine Platzhalter wie [Name].",
    "- Nutze ausschließlich Fakten aus dem Kontext. Nichts erfinden: keine Zahlen, keine gemeinsamen Bekannten, keine Projekte oder Erfolge, die nicht im Kontext stehen.",
    "- Personalisiere sichtbar: gemeinsame Events, gemeinsame Verticals, warum sich die Profile ergänzen (Match-Gründe), was die Absender:in sucht.",
    "- Passe Ton, Länge, Einstieg und Abschluss an den Persönlichkeitstyp der Zielperson an:",
    "  visionary → Big Picture zuerst (Markt, Zukunft, Warum), Details später, offene „Wohin“-Frage als Abschluss.",
    "  builder → konkret: was wird gebaut, welcher Stand, welche Technik/Umsetzung; Demo oder Feedback auf den Stand als Ask; keine Vision-Prosa.",
    "  operator → Ask im ersten Satz, klare Struktur, konkreter nächster Schritt mit Terminvorschlag; knapp.",
    "  connector → warm und persönlich, gemeinsame Events/Community zuerst, Kaffee oder Treffen als Ask.",
    "  analyst → präzise, Zahlen und Fakten (Match-Gründe, Prozentwerte, Stage), nummerierte Punkte, keine Superlative; Faktencheck als Ask.",
    "- Beachte die Outreach-Tipps und Don'ts aus dem Persönlichkeitsprofil der Zielperson.",
    `- Kanal "linkedin": Connection-Note mit maximal ${LINKEDIN_MAX_CHARS} Zeichen (harte Grenze, zähle mit), ein Absatz, kein Betreff (subject = null).`,
    `- Kanal "email": subject (max. 70 Zeichen, konkret, kein Clickbait) und body mit ${EMAIL_MIN_WORDS}–${EMAIL_MAX_WORDS} Wörtern, Anrede „Hi <Vorname>,“, Absätze durch Leerzeilen, Grußformel mit dem Vornamen der Absender:in (falls bekannt).`,
    "- personalityNotes: 2–4 kurze deutsche Sätze, die erklären, warum die Nachricht so formuliert ist (Persönlichkeitstyp, Ton, Länge, Ask).",
    "Antworte ausschließlich mit JSON nach dem vorgegebenen Schema.",
  ].join("\n");
}

/** User-Prompt für den LLM-Pfad: strukturierter Kontext + Aufgabe. */
export function outreachUserPrompt(user: UserContext, profile: Profile, channel: OutreachChannel): string {
  const ctx = buildContext(user, profile, channel);
  const p = profile.personality;
  const list = (items: string[] | undefined) => (items && items.length ? items.join(", ") : "–");
  const experience = (profile.experience ?? [])
    .slice(0, 3)
    .map((e) => `${e.title} @ ${e.company} (${e.start}${e.end ? `–${e.end}` : "–heute"})`)
    .join("; ");
  const education = (profile.education ?? [])
    .slice(0, 2)
    .map((e) => [e.degree, e.field, e.school].filter(Boolean).join(", "))
    .join("; ");
  const events = ctx.events.map((e) => `${e.name} (${e.date}, ${e.location})`).join("; ");
  const dims = (d: FounderDims) => FOUNDER_DIM_KEYS.map((k) => `${FOUNDER_DIM_LABELS[k]} ${d[k]}/10`).join(", ");

  const lines: (string | null)[] = [
    "## Absender:in (Nutzer:in)",
    `- Name: ${user.name || "unbekannt (keine Grußformel mit Namen)"}`,
    `- Headline: ${user.headline || "–"}`,
    `- Eigene Rolle im Team: ${user.founderRole ? FOUNDER_ROLE_LABELS[user.founderRole] : "–"}`,
    `- Sucht (Kontaktarten): ${list(user.lookingFor.map((r) => NETWORK_ROLE_LABELS[r] ?? r))}`,
    `- Fehlende Team-Rollen: ${list(user.lookingForRoles.map((r) => FOUNDER_ROLE_LABELS[r] ?? r))}`,
    `- Verticals: ${list(user.verticals)}`,
    `- Stage: ${user.stage ? STAGE_LABELS[user.stage] : "–"}`,
    `- Idee: ${user.idea || "–"}`,
    `- Offen für andere Ideen: ${user.openToIdeas ? "ja" : "nein"}`,
    `- Stärken: ${list(user.strengths)}`,
    `- Selbsteinschätzung: ${dims(user.dims)}`,
    user.notes ? `- Notizen aus dem Interview: ${user.notes}` : null,
    "",
    "## Zielperson",
    `- Name: ${profile.name} (Vorname für die Anrede: ${ctx.to})`,
    `- Headline: ${profile.headline || "–"}`,
    `- Ort: ${profile.location || "–"}`,
    `- Rolle im Ökosystem: ${NETWORK_ROLE_LABELS[profile.networkRole] ?? profile.networkRole}${profile.founderRole ? `, Team-Rolle ${FOUNDER_ROLE_LABELS[profile.founderRole]}` : ""}`,
    `- Sucht: ${list(profile.lookingFor)}`,
    `- Verticals: ${list(profile.verticals)}`,
    `- Stage: ${profile.stage ? STAGE_LABELS[profile.stage] : "–"}`,
    `- About: ${profile.about ? shorten(profile.about, 500) : "–"}`,
    `- Erfahrung: ${experience || "–"}`,
    `- Ausbildung: ${education || "–"}`,
    `- Skills: ${list((profile.skills ?? []).slice(0, 10))}`,
    `- Stärkenprofil: ${dims(profile.dims)}`,
    `- Events, bei denen die Zielperson dabei ist (die Absender:in ist ebenfalls vor Ort): ${events || "–"}`,
    "",
    "## Persönlichkeitstyp der Zielperson",
    `- Typ: ${p?.type ?? "unbekannt"}${p?.type ? ` (${PERSONALITY_LABELS[p.type]})` : ""}`,
    `- Kurzbeschreibung: ${p?.summary ?? "–"}`,
    `- Traits: ${list(p?.traits)}`,
    `- Kommunikationsstil: ${p?.communicationStyle ?? "–"}`,
    `- Outreach-Tipps: ${list(p?.outreachTips)}`,
    `- Vermeiden: ${list(p?.avoid)}`,
    "",
    "## Match-Analyse (regelbasiert)",
    `- Score: ${ctx.match.score}/100, Komplementarität der Stärken: ${ctx.match.complementarity} %`,
    `- Gemeinsame Verticals: ${list(ctx.sharedVerticals)}`,
    ...ctx.match.reasons.map((r) => `- Grund: ${r.label} – ${r.detail} (Gewicht ${r.weight})`),
    ...ctx.match.risks.map((r) => `- Risiko: ${r}`),
    `- Was die Absender:in von dieser Person konkret sucht: ${ctx.ask.long}`,
    "",
    "## Aufgabe",
    `Kanal: ${channel}.`,
    channel === "linkedin"
      ? `Schreibe eine LinkedIn-Connection-Note (≤ ${LINKEDIN_MAX_CHARS} Zeichen inkl. Anrede und Gruß, ein Absatz). subject = null.`
      : `Schreibe eine E-Mail: subject (≤ 70 Zeichen) und body (${EMAIL_MIN_WORDS}–${EMAIL_MAX_WORDS} Wörter, Anrede „Hi ${ctx.to},“, 2–4 kurze Absätze, Grußformel${ctx.from ? ` mit „${ctx.from}“` : " ohne Namen"}).`,
    `Formuliere im Stil für den Typ „${ctx.type}“. Beziehe dich konkret auf mindestens zwei der folgenden Punkte: gemeinsame Events, gemeinsame Verticals, komplementäre Stärken/Rollen, was die Zielperson sucht.`,
    "Gib zusätzlich personalityNotes (2–4 Sätze) zurück.",
  ];

  return lines.filter((line): line is string => line !== null).join("\n");
}

/** JSON-Schema für Structured Outputs (Responses API, `text.format`, strict). */
export const OUTREACH_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    subject: {
      type: ["string", "null"],
      description: "Betreff der E-Mail (max. 70 Zeichen). Bei Kanal linkedin: null.",
    },
    body: {
      type: "string",
      description: "Die Nachricht. LinkedIn: max. 300 Zeichen, ein Absatz. E-Mail: 90–160 Wörter, Absätze durch Leerzeilen.",
    },
    personalityNotes: {
      type: "array",
      description: "2–4 kurze deutsche Sätze: warum die Nachricht so formuliert ist.",
      items: { type: "string" },
    },
  },
  required: ["subject", "body", "personalityNotes"],
};

/** Form des LLM-Outputs (entspricht OUTREACH_JSON_SCHEMA). */
export interface OutreachLlmPayload {
  subject: string | null;
  body: string;
  personalityNotes: string[];
}

/**
 * Macht aus (unsicherem) LLM-Output einen gültigen OutreachDraft; fehlende oder
 * kaputte Teile werden aus dem Template-Entwurf ergänzt. Gibt null zurück, wenn
 * der Output unbrauchbar ist (dann sollte der Aufrufer das Template liefern).
 */
export function finalizeLlmDraft(raw: unknown, template: OutreachDraft): OutreachDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<OutreachLlmPayload>;
  if (typeof data.body !== "string" || !data.body.trim()) return null;

  const body = template.channel === "linkedin" ? clampLinkedInNote(data.body) : data.body.trim();
  const notes = Array.isArray(data.personalityNotes)
    ? data.personalityNotes.filter((n): n is string => typeof n === "string" && n.trim().length > 0).map((n) => sentence(n))
    : [];
  for (const n of template.personalityNotes) {
    if (notes.length >= 2) break;
    if (!notes.includes(n)) notes.push(n);
  }

  const draft: OutreachDraft = {
    profileId: template.profileId,
    channel: template.channel,
    body,
    personalityNotes: notes.slice(0, 4),
    generatedBy: "llm",
  };
  if (template.channel === "email") {
    draft.subject = typeof data.subject === "string" && data.subject.trim() ? shorten(data.subject.trim(), 90) : template.subject;
  }
  return draft;
}
