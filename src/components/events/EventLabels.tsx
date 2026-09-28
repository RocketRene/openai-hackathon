"use client";
/**
 * Zweisprachige Labels rund um Events als kleine Client-Helfer, damit Server-Components
 * (Pages, EventCard, AttendeeStats) sie direkt einbetten können. Wörterbuch: ./labels.ts.
 */
import { useT } from "@/lib/i18n";
import type { Event, FounderRole, NetworkRole, PersonalityType } from "@/lib/types";

import { EVENT_LABELS } from "./labels";

/** Fällt auf den Rohwert zurück, wenn das Wörterbuch den Key nicht kennt. */
function useLabel(prefix: string, key: string): string {
  const t = useT(EVENT_LABELS);
  const full = `${prefix}.${key}`;
  return full in EVENT_LABELS ? t(full) : key;
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
  const t = useT(EVENT_LABELS);
  return <>{count === 1 ? t("attendeeOne") : t("attendeeMany", { count })}</>;
}
