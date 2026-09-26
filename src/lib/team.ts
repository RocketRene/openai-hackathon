/**
 * Team-Radar: kombiniert die fünf Gründer-Dimensionen (Vision, Design/Visuell, Technik, Detail,
 * Umsetzung) mehrerer Personen und bewertet, wie tragfähig das Team ist und was noch fehlt.
 * Isomorph (Server + Client), deterministisch, ohne LLM.
 * Owner: Paket "team" (docs/PARALLEL-WORK.md).
 */
import { rankCandidates } from "./matching";
import {
  FOUNDER_DIM_KEYS,
  FOUNDER_DIM_LABELS,
  type FounderDimKey,
  type FounderDims,
  type FounderRole,
  type Profile,
  type TeamAnalysis,
  type TeamGap,
  type TeamMember,
  type UserContext,
} from "./types";

/** Unter diesem kombinierten Wert gilt eine Dimension als Lücke. */
export const GAP_THRESHOLD = 6.5;
/** Ab diesem kombinierten Wert gilt eine Dimension als Stärke. */
export const STRENGTH_THRESHOLD = 8;
/** ID des Team-Mitglieds, das die Nutzer:in selbst repräsentiert. */
export const USER_MEMBER_ID = "me";

/** Deutsche Labels für Team-Rollen (modul-lokal; Kandidat für types.ts). */
export const FOUNDER_ROLE_LABELS: Record<FounderRole, string> = {
  tech: "Tech (CTO)",
  commercial: "Commercial (CEO / Sales)",
  product: "Product",
  design: "Design",
  operations: "Operations (COO)",
  "domain-expert": "Domain-Expert:in",
};

const GAP_ADVICE: Record<FounderDimKey, string> = {
  vision:
    "Niemand im Team trägt das große Bild und die Investoren-Story. Ein:e Commercial- oder Product-Co-Founder:in mit visionärem Profil gleicht das aus.",
  design:
    "Dem Team fehlt der visuelle, nutzerzentrierte Blick. Ein:e Design-Co-Founder:in oder ein starkes Produkt-Design-Talent schließt die Lücke.",
  tech: "Ohne technische Umsetzungskraft bleibt das Produkt ein Konzept. Sucht eine:n technische:n Co-Founder:in mit CTO-Profil.",
  detail:
    "Sorgfalt bei Zahlen, Prozessen und Verträgen ist schwach besetzt. Ein:e Operations-Co-Founder:in (COO-Typ) bringt Struktur ins Team.",
  execution:
    "Viele Ideen, wenig Tempo bei der Umsetzung. Ein:e Commercial-Co-Founder:in mit Sales-/Operator-Mentalität treibt Dinge ins Ziel.",
};

/** Welche Team-Rolle eine Lücke in dieser Dimension typischerweise schließt. */
const GAP_ROLES: Record<FounderDimKey, FounderRole[]> = {
  tech: ["tech"],
  design: ["design"],
  vision: ["commercial", "product"],
  detail: ["operations"],
  execution: ["commercial"],
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function safeDim(v: unknown): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : 0;
  return clamp(n, 0, 10);
}

/** Zahl mit deutschem Dezimaltrenner, max. eine Nachkommastelle. */
export function formatDim(n: number): string {
  return String(round1(n)).replace(".", ",");
}

export function emptyDims(): FounderDims {
  return { vision: 0, design: 0, tech: 0, detail: 0, execution: 0 };
}

/** Bringt (ggf. unsaubere) Dims auf 0–10 und garantiert alle fünf Schlüssel. */
export function normalizeDims(dims: Partial<FounderDims> | null | undefined): FounderDims {
  const out = emptyDims();
  for (const k of FOUNDER_DIM_KEYS) out[k] = safeDim(dims?.[k]);
  return out;
}

/**
 * Kombiniert die Dimensionen eines Teams: pro Dimension Maximum + 0,3 × zweithöchster Wert,
 * gedeckelt bei 10, gerundet auf eine Nachkommastelle. Zwei starke Leute in einer Dimension
 * zählen also mehr als eine – aber nicht doppelt.
 */
export function combineDims(members: FounderDims[]): FounderDims {
  const out = emptyDims();
  if (members.length === 0) return out;
  for (const k of FOUNDER_DIM_KEYS) {
    const sorted = members.map((m) => safeDim(m?.[k])).sort((a, b) => b - a);
    const top = sorted[0] ?? 0;
    const second = sorted[1] ?? 0;
    out[k] = round1(Math.min(10, top + 0.3 * second));
  }
  return out;
}

/** Durchschnitt der fünf Dimensionen (0–10). */
export function averageDims(dims: FounderDims): number {
  return FOUNDER_DIM_KEYS.reduce((sum, k) => sum + dims[k], 0) / FOUNDER_DIM_KEYS.length;
}

/** Standardabweichung der Dimensionen – kleine Streuung = ausgewogenes Team. */
export function spreadDims(dims: FounderDims): number {
  const avg = averageDims(dims);
  const variance = FOUNDER_DIM_KEYS.reduce((sum, k) => sum + (dims[k] - avg) ** 2, 0) / FOUNDER_DIM_KEYS.length;
  return Math.sqrt(variance);
}

function teamSizeBonus(size: number): number {
  if (size <= 1) return 0;
  if (size <= 3) return 15;
  if (size === 4) return 8;
  return 4;
}

/**
 * 0–100: grobe "VC-Tauglichkeit". 60 % Niveau (Durchschnitt der kombinierten Dims),
 * 25 % Balance (geringe Streuung), bis 15 Punkte Bonus für die klassische Teamgröße 2–3.
 */
export function computeSuccessScore(combined: FounderDims, teamSize: number): number {
  if (teamSize <= 0) return 0;
  const level = averageDims(combined) / 10; // 0–1
  const balance = clamp(1 - spreadDims(combined) / 3, 0, 1); // 0–1
  const score = level * 60 + balance * 25 + teamSizeBonus(teamSize);
  return Math.round(clamp(score, 0, 100));
}

export function analyzeTeam(members: TeamMember[]): TeamAnalysis {
  const combined = combineDims(members.map((m) => m.dims));

  const gaps: TeamGap[] = FOUNDER_DIM_KEYS.filter((k) => combined[k] < GAP_THRESHOLD)
    .map((k) => ({
      dim: k,
      score: combined[k],
      advice: `${FOUNDER_DIM_LABELS[k]} liegt bei ${formatDim(combined[k])}/10. ${GAP_ADVICE[k]}`,
    }))
    .sort((a, b) => a.score - b.score);

  const strengths = FOUNDER_DIM_KEYS.filter((k) => combined[k] >= STRENGTH_THRESHOLD);

  const recommendedRoles: FounderRole[] = [];
  for (const gap of gaps) {
    for (const role of GAP_ROLES[gap.dim]) {
      if (!recommendedRoles.includes(role)) recommendedRoles.push(role);
    }
  }

  return {
    members,
    combined,
    gaps,
    strengths,
    successScore: computeSuccessScore(combined, members.length),
    recommendedRoles,
  };
}

export function memberFromProfile(p: Profile): TeamMember {
  return { id: p.id, name: p.name, dims: normalizeDims(p.dims), founderRole: p.founderRole };
}

export function memberFromUser(u: UserContext): TeamMember {
  return {
    id: USER_MEMBER_ID,
    name: u.name?.trim() || "Ich",
    dims: normalizeDims(u.dims),
    founderRole: u.founderRole,
  };
}

/** Vorschlag: Wer würde das Team am stärksten verbessern? */
export interface TeamSuggestion {
  profile: Profile;
  /** Match-Score aus rankCandidates (0–100). */
  matchScore: number;
  /** successScore des Teams inklusive dieser Person. */
  successScore: number;
  /** Zuwachs gegenüber dem aktuellen Team (Punkte). */
  delta: number;
  /** Lücken, die diese Person schließen würde. */
  closesGaps: FounderDimKey[];
}

/**
 * Simuliert für jede:n Kandidat:in aus rankCandidates den Team-Score mit dieser Person und
 * liefert die `limit` stärksten Verbesserungen. Pool: Co-Founder und Talente (Investor:innen
 * oder Mentor:innen treten nicht ins Gründerteam ein); ist der Pool leer, alle Profile.
 */
export function suggestAdditions(user: UserContext, team: TeamMember[], candidates: Profile[], limit = 3): TeamSuggestion[] {
  const baseline = analyzeTeam(team);
  const inTeam = new Set(team.map((m) => m.id));
  const available = candidates.filter((p) => !inTeam.has(p.id));
  const teamPool = available.filter((p) => p.networkRole === "cofounder" || p.networkRole === "talent");
  const pool = teamPool.length > 0 ? teamPool : available;
  const byId = new Map(pool.map((p) => [p.id, p] as const));

  const results: TeamSuggestion[] = [];
  for (const match of rankCandidates(user, pool)) {
    const profile = byId.get(match.profileId);
    if (!profile) continue;
    const next = analyzeTeam([...team, memberFromProfile(profile)]);
    const delta = next.successScore - baseline.successScore;
    if (delta <= 0) continue;
    const closesGaps = baseline.gaps.map((g) => g.dim).filter((dim) => next.combined[dim] >= GAP_THRESHOLD);
    results.push({ profile, matchScore: match.score, successScore: next.successScore, delta, closesGaps });
  }

  return results.sort((a, b) => b.delta - a.delta || b.matchScore - a.matchScore).slice(0, limit);
}
