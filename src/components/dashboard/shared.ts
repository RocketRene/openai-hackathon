/**
 * Gemeinsame Labels und Klassen für die Dashboard-Komponenten – zweisprachig (DE/EN).
 * Bewusst lokal gehalten, damit das Paket keine fremden Komponenten (CandidateCard …) berührt.
 * Die Label-Maps sind `Dict`-kompatibel: Client → `useT(MAP)(key)`, Server → `<T {...MAP[key]} />`.
 */
import type { Locale } from "@/lib/i18n";
import type { FounderRole, NetworkRole, Stage } from "@/lib/types";

export type Bi = { de: string; en: string };

export const FOUNDER_ROLE_LABELS: Record<FounderRole, Bi> = {
  tech: { de: "Tech-Founder", en: "Tech founder" },
  commercial: { de: "Commercial-Founder", en: "Commercial founder" },
  product: { de: "Product-Founder", en: "Product founder" },
  design: { de: "Design-Founder", en: "Design founder" },
  operations: { de: "Operations-Founder", en: "Operations founder" },
  "domain-expert": { de: "Domain-Expert:in", en: "Domain expert" },
};

/** Kurzform mitten im Satz – „mit Fokus auf Tech und Design“ / “with a focus on tech and design”. */
export const FOUNDER_ROLE_SHORT: Record<FounderRole, Bi> = {
  tech: { de: "Tech", en: "tech" },
  commercial: { de: "Commercial", en: "commercial" },
  product: { de: "Product", en: "product" },
  design: { de: "Design", en: "design" },
  operations: { de: "Operations", en: "operations" },
  "domain-expert": { de: "Domain-Expertise", en: "domain expertise" },
};

/** Plural – für „du suchst Co-Founder und Investor:innen“ / “you're looking for co-founders and investors”. */
export const NETWORK_ROLE_LABELS: Record<NetworkRole, Bi> = {
  cofounder: { de: "Co-Founder", en: "co-founders" },
  investor: { de: "Investor:innen", en: "investors" },
  mentor: { de: "Mentor:innen", en: "mentors" },
  talent: { de: "Talente", en: "talent" },
  expert: { de: "Expert:innen", en: "experts" },
};

export const STAGE_LABELS: Record<Stage, Bi> = {
  idea: { de: "Idee", en: "Idea" },
  "pre-seed": { de: "Pre-Seed", en: "Pre-seed" },
  seed: { de: "Seed", en: "Seed" },
  "series-a": { de: "Series A", en: "Series A" },
  growth: { de: "Growth", en: "Growth" },
};

const VERTICAL_DISPLAY: Record<string, string> = {
  ai: "AI",
  "b2b saas": "B2B SaaS",
  "hr tech": "HR Tech",
  fintech: "FinTech",
  healthtech: "HealthTech",
  edtech: "EdTech",
  proptech: "PropTech",
  deeptech: "DeepTech",
  legaltech: "LegalTech",
  biotech: "BioTech",
  ecommerce: "E-Commerce",
};

/** "b2b saas" → "B2B SaaS", "climate" → "Climate". */
export function formatVertical(vertical: string): string {
  const key = vertical.trim().toLowerCase();
  return VERTICAL_DISPLAY[key] ?? key.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

/** ["A", "B", "C"] → "A, B und C" / "A, B and C" */
export function joinList(items: string[], locale: Locale): string {
  if (items.length <= 1) return items[0] ?? "";
  const and = locale === "en" ? "and" : "und";
  return `${items.slice(0, -1).join(", ")} ${and} ${items[items.length - 1]}`;
}

/** Dezenter „Alle … →“-Link rechts neben Abschnitts- und Card-Titeln. */
export const SECTION_LINK_CLS =
  "rounded-sm text-sm font-medium text-[var(--accent)] transition hover:text-[var(--accent-strong)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";
