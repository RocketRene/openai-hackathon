/**
 * Matching-Engine: bewertet, wie gut ein Profil zur Nutzer:in passt.
 * Deterministisch, ohne LLM – damit es ohne API-Key funktioniert und erklärbar ist.
 * Owner: siehe docs/PARALLEL-WORK.md. Signaturen (scoreMatch, rankCandidates) sind Contract.
 */
import { FOUNDER_DIM_KEYS, type FounderDims, type MatchReason, type MatchResult, type Profile, type UserContext } from "./types";

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

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

export function scoreMatch(user: UserContext, profile: Profile): MatchResult {
  const reasons: MatchReason[] = [];
  const risks: string[] = [];
  let score = 0;

  // 1) Sucht die Nutzer:in diese Art von Kontakt?
  if (user.lookingFor.includes(profile.networkRole)) {
    score += 25;
    reasons.push({ label: "Gesuchte Rolle", detail: `Du suchst ${profile.networkRole}, ${profile.name} ist genau das.`, weight: 25 });
  } else {
    risks.push(`Ist ${profile.networkRole}, du suchst aktuell ${user.lookingFor.join(", ") || "noch nichts Konkretes"}.`);
  }

  // 2) Fehlende Team-Rolle wird abgedeckt?
  if (profile.founderRole && user.lookingForRoles.includes(profile.founderRole)) {
    score += 25;
    reasons.push({ label: "Fehlende Team-Rolle", detail: `Deckt die Rolle "${profile.founderRole}" ab, die dir im Team fehlt.`, weight: 25 });
  } else if (profile.founderRole && profile.founderRole === user.founderRole && profile.networkRole === "cofounder") {
    risks.push(`Gleiche Rolle wie du (${profile.founderRole}) – Überschneidung statt Ergänzung.`);
    score -= 10;
  }

  // 3) Vertical-Überschneidung
  const sharedVerticals = profile.verticals.filter((v) => user.verticals.includes(v));
  if (sharedVerticals.length > 0) {
    const w = Math.min(20, 10 * sharedVerticals.length);
    score += w;
    reasons.push({ label: "Gleiches Vertical", detail: `Gemeinsam: ${sharedVerticals.join(", ")}.`, weight: w });
  } else if (user.openToIdeas) {
    score += 5;
    reasons.push({ label: "Offen für Ideen", detail: "Du bist offen – Vertical ist zweitrangig.", weight: 5 });
  }

  // 4) Komplementarität der Dims
  const comp = complementarity(user.dims, profile.dims);
  const compWeight = Math.round(comp * 0.2);
  score += compWeight;
  if (comp >= 50) {
    reasons.push({ label: "Komplementäre Stärken", detail: `Ergänzt deine schwächeren Dimensionen (${comp}%).`, weight: compWeight });
  }

  // 5) Sucht das Profil umgekehrt jemanden wie die Nutzer:in?
  const userRoleWords: Record<string, string[]> = {
    tech: ["technical", "tech", "cto", "engineer"],
    commercial: ["commercial", "business", "sales", "ceo"],
    product: ["product"],
    design: ["design"],
    operations: ["operations", "coo"],
    "domain-expert": ["domain", "expert"],
  };
  const wanted = user.founderRole ? userRoleWords[user.founderRole] ?? [] : [];
  const reciprocal = profile.lookingFor.some((lf) => wanted.some((w) => lf.toLowerCase().includes(w)));
  if (reciprocal) {
    score += 10;
    reasons.push({ label: "Sucht jemanden wie dich", detail: `Sucht: ${profile.lookingFor.join(", ")}.`, weight: 10 });
  }

  // 6) Stage
  if (user.stage && profile.stage && user.stage === profile.stage) {
    score += 5;
    reasons.push({ label: "Gleiche Phase", detail: `Beide in Phase "${profile.stage}".`, weight: 5 });
  }

  return {
    profileId: profile.id,
    score: clamp(Math.round(score)),
    reasons: reasons.sort((a, b) => b.weight - a.weight),
    risks,
    complementarity: comp,
  };
}

export function rankCandidates(user: UserContext, profiles: Profile[]): MatchResult[] {
  return profiles.map((p) => scoreMatch(user, p)).sort((a, b) => b.score - a.score);
}
