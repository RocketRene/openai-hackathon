/**
 * Gemeinsame Labels und Klassen für die Dashboard-Komponenten.
 * Bewusst lokal gehalten, damit das Paket keine fremden Komponenten (CandidateCard …) berührt.
 */
import type { FounderRole, NetworkRole, Stage } from "@/lib/types";

export const FOUNDER_ROLE_LABELS: Record<FounderRole, string> = {
  tech: "Tech-Founder",
  commercial: "Commercial-Founder",
  product: "Product-Founder",
  design: "Design-Founder",
  operations: "Operations-Founder",
  "domain-expert": "Domain-Expert:in",
};

export const FOUNDER_ROLE_SHORT: Record<FounderRole, string> = {
  tech: "Tech",
  commercial: "Commercial",
  product: "Product",
  design: "Design",
  operations: "Operations",
  "domain-expert": "Domain-Expertise",
};

/** Plural – für „du suchst Co-Founder und Investor:innen“. */
export const NETWORK_ROLE_LABELS: Record<NetworkRole, string> = {
  cofounder: "Co-Founder",
  investor: "Investor:innen",
  mentor: "Mentor:innen",
  talent: "Talente",
  expert: "Expert:innen",
};

/** Singular – für das Rollen-Badge einer einzelnen Person. */
export const NETWORK_ROLE_SINGULAR: Record<NetworkRole, string> = {
  cofounder: "Co-Founder",
  investor: "Investor:in",
  mentor: "Mentor:in",
  talent: "Talent",
  expert: "Expert:in",
};

export const STAGE_LABELS: Record<Stage, string> = {
  idea: "Idee",
  "pre-seed": "Pre-Seed",
  seed: "Seed",
  "series-a": "Series A",
  growth: "Growth",
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

/** ["A", "B", "C"] → "A, B und C" */
export function joinDe(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} und ${items[items.length - 1]}`;
}

/** Dezenter „Alle … →“-Link rechts neben Abschnitts- und Card-Titeln. */
export const SECTION_LINK_CLS =
  "rounded-sm text-sm font-medium text-[var(--accent)] transition hover:text-[var(--accent-strong)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";
