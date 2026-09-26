/**
 * Zentrale Typen für Voya.
 * ---------------------------------------------------------------
 * SHARED CONTRACT – Änderungen hier betreffen alle Module. Nicht ohne Absprache
 * (bzw. ohne Eintrag in docs/PARALLEL-WORK.md) ändern. Neue, modul-lokale Typen
 * gehören in das jeweilige Modul, nicht hierher.
 */

/** Was jemand im Startup-Ökosystem IST. */
export type NetworkRole = "cofounder" | "investor" | "mentor" | "talent" | "expert";

/** Welche Rolle jemand in einem Gründerteam ausfüllt (oder ausfüllen könnte). */
export type FounderRole =
  | "tech"
  | "commercial"
  | "product"
  | "design"
  | "operations"
  | "domain-expert";

export type Stage = "idea" | "pre-seed" | "seed" | "series-a" | "growth";

/** Die fünf Dimensionen des Team-Radars (Transkript: Vision, visueller Typ, Technik, Details, Umsetzungskraft). Werte 0–10. */
export interface FounderDims {
  vision: number;
  design: number;
  tech: number;
  detail: number;
  execution: number;
}

export const FOUNDER_DIM_KEYS = ["vision", "design", "tech", "detail", "execution"] as const;
export type FounderDimKey = (typeof FOUNDER_DIM_KEYS)[number];

export const FOUNDER_DIM_LABELS: Record<FounderDimKey, string> = {
  vision: "Vision",
  design: "Design / Visuell",
  tech: "Technik",
  detail: "Detail",
  execution: "Umsetzung",
};

export type PersonalityType = "visionary" | "builder" | "operator" | "connector" | "analyst";

export const PERSONALITY_LABELS: Record<PersonalityType, string> = {
  visionary: "Visionär:in",
  builder: "Builder",
  operator: "Operator",
  connector: "Connector",
  analyst: "Analyst:in",
};

export interface Personality {
  type: PersonalityType;
  /** Ein Satz, der den Typ dieser Person beschreibt. */
  summary: string;
  traits: string[];
  /** Wie man mit dieser Person kommunizieren sollte (Ton, Länge, Fokus). */
  communicationStyle: string;
  /** Konkrete Do's für den Outreach. */
  outreachTips: string[];
  /** Konkrete Don'ts. */
  avoid: string[];
}

export interface Experience {
  title: string;
  company: string;
  /** Freitext, z. B. "2021" oder "Mär 2021". Nie Date-Typ (Daten sind gescrapt und unsauber). */
  start: string;
  end?: string | null;
  description?: string;
}

export interface Education {
  school: string;
  degree?: string;
  field?: string;
  start?: string;
  end?: string;
}

/** Ein Kontakt – entspricht einem (normalisierten) LinkedIn-Profil plus unseren Anreicherungen. */
export interface Profile {
  /** slug, eindeutig, z. B. "max-mustermann" */
  id: string;
  name: string;
  headline: string;
  location: string;
  photoUrl: string;
  email?: string;
  linkedinUrl?: string;
  about: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  languages?: string[];
  networkRole: NetworkRole;
  /** Für cofounder/talent: welche Team-Rolle die Person abdeckt. */
  founderRole?: FounderRole;
  /** Was die Person sucht, als Tags: "technical cofounder", "seed investment", "mentees", "job as engineer" … */
  lookingFor: string[];
  /** z. B. "fintech", "healthtech", "climate", "b2b saas", "consumer" */
  verticals: string[];
  stage?: Stage;
  dims: FounderDims;
  personality: Personality;
  /** Event-Slugs aus src/data/events.json, bei denen die Person Teilnehmer:in ist. */
  events: string[];
  tags?: string[];
  source?: {
    type: "linkedin" | "conference" | "manual" | "mock";
    scrapedAt?: string;
    raw?: unknown;
  };
}

export interface Event {
  slug: string;
  name: string;
  /** Freitext-Datum, z. B. "12.–13. Nov 2026" */
  date: string;
  location: string;
  description: string;
  url?: string;
  type: "conference" | "meetup" | "demo-day" | "hackathon";
}

/** Der Kontext der Nutzer:in – kommt aus Onboarding-Formular und/oder Agent-Interview. */
export interface UserContext {
  name: string;
  headline?: string;
  linkedinUrl?: string;
  /** Eigene Rolle im Gründerteam. */
  founderRole?: FounderRole;
  /** Welche Art Kontakte gesucht werden. */
  lookingFor: NetworkRole[];
  /** Welche Team-Rollen im Co-Founder fehlen. */
  lookingForRoles: FounderRole[];
  verticals: string[];
  stage?: Stage;
  idea: string;
  openToIdeas: boolean;
  strengths: string[];
  /** Selbsteinschätzung 0–10. */
  dims: FounderDims;
  /** Vom Agenten gesammelte Notizen aus dem Interview. */
  notes?: string;
  /** Rahmenbedingungen als Freitext: Standort/remote, Zeit, Starttermin, Finanzierung, Ausschlusskriterien (Voya-Brief). */
  constraints?: string;
  completedInterview: boolean;
  /** ISO-Datum */
  updatedAt: string;
}

export interface MatchReason {
  label: string;
  detail: string;
  /** Beitrag zum Score, 0–100 */
  weight: number;
}

export interface MatchResult {
  profileId: string;
  /** 0–100 */
  score: number;
  reasons: MatchReason[];
  risks: string[];
  /** 0–100: wie komplementär die Dims zur Nutzer:in sind */
  complementarity: number;
}

export interface OutreachDraft {
  profileId: string;
  channel: "email" | "linkedin";
  subject?: string;
  body: string;
  /** Warum die Nachricht so formuliert ist (Persönlichkeitstyp). */
  personalityNotes: string[];
  generatedBy: "template" | "llm";
}

/** Belegbarer 30-Minuten-Leitfaden für ein Erstgespräch (Voya: prepare_interview). */
export interface InterviewGuideSection {
  title: string;
  minutes: number;
  questions: string[];
}

export interface InterviewGuide {
  profileId: string;
  name: string;
  title: string;
  /** z. B. "30 Minuten" */
  duration: string;
  sections: InterviewGuideSection[];
  /** Was sich NICHT aus dem Profil ableiten lässt und im Gespräch geklärt werden muss. */
  unknowns: string[];
}

export interface PrepQuestion {
  question: string;
  why: string;
  suggestedAnswerOutline: string;
}

export interface PrepPack {
  profileId: string;
  likelyQuestions: PrepQuestion[];
  talkingPoints: string[];
  iceBreakers: string[];
  redFlagsToProbe: string[];
  personalityNotes: string[];
  generatedBy: "template" | "llm";
}

export interface TeamMember {
  id: string;
  name: string;
  dims: FounderDims;
  founderRole?: FounderRole;
}

export interface TeamGap {
  dim: FounderDimKey;
  /** 0–10, kombinierter Wert des Teams */
  score: number;
  advice: string;
}

export interface TeamAnalysis {
  members: TeamMember[];
  combined: FounderDims;
  gaps: TeamGap[];
  strengths: FounderDimKey[];
  /** 0–100: grobe Einschätzung "wie VC-tauglich ist das Team" */
  successScore: number;
  recommendedRoles: FounderRole[];
}

export interface Tip {
  id: string;
  title: string;
  body: string;
  category: "team" | "skills" | "fundraising" | "product" | "network";
  priority: 1 | 2 | 3;
}

/* ------------------------------------------------------------------ */
/* Agent / Chat                                                        */
/* ------------------------------------------------------------------ */

export type AgentMode = "interview" | "prep-simulation" | "general";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/** Aktionen, die der Agent im UI auslösen kann (Tool-Calls → Frontend). */
export type UiAction =
  | { type: "show_candidate"; profileId: string }
  | { type: "show_candidates"; profileIds: string[] }
  | { type: "navigate"; href: string }
  | { type: "update_user_context"; patch: Partial<UserContext> }
  | { type: "show_interview_guide"; profileId: string; guide: InterviewGuide };

export interface ChatRequest {
  messages: ChatMessage[];
  userContext: UserContext | null;
  mode: AgentMode;
  /** Bei prep-simulation: welche Person der Agent spielt. */
  candidateId?: string;
}

export interface ChatResponse {
  reply: string;
  uiActions: UiAction[];
  userContextPatch?: Partial<UserContext>;
}

/** Props des Voice-Agent-Components (src/components/assistant/VoiceAgent.tsx). */
export interface VoiceAgentProps {
  mode: AgentMode;
  userContext: UserContext | null;
  candidate?: Profile;
  onUiAction: (action: UiAction) => void;
  onTranscript?: (items: { role: "user" | "assistant"; text: string }[]) => void;
  /** Bisheriger Text-Chat-Verlauf – wird beim Verbinden in die Voice-Session übernommen (Agent knüpft an). */
  initialMessages?: ChatMessage[];
  /** Profile, die gerade im UI sichtbar sind (Live-Panel) – der Agent bekommt sie als Kontext, nicht als Anweisung. */
  visibleCandidateIds?: string[];
  className?: string;
}

/** Filter für die Kandidatensuche (Gateway + /api/profiles). */
export interface ProfileFilters {
  query?: string;
  networkRole?: NetworkRole;
  founderRole?: FounderRole;
  vertical?: string;
  event?: string;
  personality?: PersonalityType;
  stage?: Stage;
}
