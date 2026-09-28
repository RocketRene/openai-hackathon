"use client";
/**
 * Zweisprachige Labels rund um Events: Event-Typ, Netzwerk-/Team-Rolle, Persönlichkeitstyp,
 * Teilnehmerzahl. Kleine Client-Helfer, damit Server-Components (Pages, EventCard, AttendeeStats)
 * sie direkt einbetten können. Wörterbuch lokal (siehe src/lib/i18n.tsx).
 */
import { useT, type Dict } from "@/lib/i18n";
import type { Event, FounderRole, NetworkRole, PersonalityType } from "@/lib/types";

const DICT: Dict = {
  // Event-Typ
  "type.conference": { de: "Konferenz", en: "Conference" },
  "type.meetup": { de: "Meetup", en: "Meetup" },
  "type.demo-day": { de: "Demo Day", en: "Demo day" },
  "type.hackathon": { de: "Hackathon", en: "Hackathon" },
  // Netzwerk-Rolle (Singular)
  "role.cofounder": { de: "Co-Founder", en: "Co-founder" },
  "role.investor": { de: "Investor:in", en: "Investor" },
  "role.mentor": { de: "Mentor:in", en: "Mentor" },
  "role.talent": { de: "Talent", en: "Talent" },
  "role.expert": { de: "Expert:in", en: "Expert" },
  // Netzwerk-Rolle (Plural, für KPIs und Filter)
  "roles.cofounder": { de: "Co-Founder", en: "Co-founders" },
  "roles.investor": { de: "Investor:innen", en: "Investors" },
  "roles.mentor": { de: "Mentor:innen", en: "Mentors" },
  "roles.talent": { de: "Talente", en: "Talents" },
  "roles.expert": { de: "Expert:innen", en: "Experts" },
  // Team-Rolle
  "founder.tech": { de: "Tech", en: "Tech" },
  "founder.commercial": { de: "Commercial", en: "Commercial" },
  "founder.product": { de: "Produkt", en: "Product" },
  "founder.design": { de: "Design", en: "Design" },
  "founder.operations": { de: "Operations", en: "Operations" },
  "founder.domain-expert": { de: "Domain-Expert:in", en: "Domain expert" },
  // Persönlichkeitstyp
  "personality.visionary": { de: "Visionär:in", en: "Visionary" },
  "personality.builder": { de: "Builder", en: "Builder" },
  "personality.operator": { de: "Operator", en: "Operator" },
  "personality.connector": { de: "Connector", en: "Connector" },
  "personality.analyst": { de: "Analyst:in", en: "Analyst" },
  // Zähler
  attendeeOne: { de: "1 Teilnehmer:in", en: "1 attendee" },
  attendeeMany: { de: "{count} Teilnehmer:innen", en: "{count} attendees" },
};

/** Fällt auf den Rohwert zurück, wenn das Wörterbuch den Key nicht kennt. */
function useLabel(prefix: string, key: string): string {
  const t = useT(DICT);
  const full = `${prefix}.${key}`;
  return full in DICT ? t(full) : key;
}

export function EventTypeLabel({ type }: { type: Event["type"] }) {
  return <>{useLabel("type", type)}</>;
}

export function NetworkRoleLabel({ role, plural = false }: { role: NetworkRole | string; plural?: boolean }) {
  return <>{useLabel(plural ? "roles" : "role", role)}</>;
}

export function FounderRoleLabel({ role }: { role: FounderRole | string }) {
  return <>{useLabel("founder", role)}</>;
}

export function PersonalityLabel({ type }: { type: PersonalityType | string }) {
  return <>{useLabel("personality", type)}</>;
}

/** „1 Teilnehmer:in“ / „569 Teilnehmer:innen“ bzw. „1 attendee“ / „569 attendees“. */
export function AttendeeCount({ count }: { count: number }) {
  const t = useT(DICT);
  return <>{count === 1 ? t("attendeeOne") : t("attendeeMany", { count })}</>;
}
