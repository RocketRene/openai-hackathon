/**
 * Zweisprachige Label-Daten rund um Events (Event-Typ, Netzwerk-/Team-Rolle, Persönlichkeit, Zähler).
 * Reines Datenmodul ohne "use client" – damit können Server-Components die {de,en}-Paare direkt an
 * die Localized*-Wrapper reichen und Client-Helfer (EventLabels.tsx) dasselbe Wörterbuch per useT nutzen.
 */
import type { Dict } from "@/lib/i18n";
import type { NetworkRole } from "@/lib/types";

/** Ein {de,en}-Paar. */
export type Bilingual = Dict[string];

export const EVENT_LABELS: Dict = {
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
  attendees: { de: "Teilnehmer:innen", en: "Attendees" },
};

/** Fällt auf den Rohwert zurück, wenn das Wörterbuch den Key nicht kennt. */
export function eventLabel(key: string): Bilingual {
  return EVENT_LABELS[key] ?? { de: key, en: key };
}

export function networkRoleLabel(role: NetworkRole | string, plural = false): Bilingual {
  return eventLabel(`${plural ? "roles" : "role"}.${role}`);
}
