/**
 * Zentraler Daten-Zugang (Gateway).
 * ---------------------------------------------------------------
 * ALLE Daten laufen über dieses Modul – nie direkt JSON in Seiten importieren.
 * Später wird hier der Adapter getauscht (DB statt JSON), ohne dass Seiten sich ändern.
 * Funktioniert serverseitig UND im Client (statische JSON-Imports).
 *
 * Profile liegen in mehreren Dateien unter src/data/profiles/ (damit parallel daran
 * gearbeitet werden kann) und werden hier zusammengeführt.
 */
import type { Event, Profile, ProfileFilters } from "./types";

import cofoundersTech from "@/data/profiles/cofounders-tech.json";
import cofoundersCommercial from "@/data/profiles/cofounders-commercial.json";
import cofoundersProductDesign from "@/data/profiles/cofounders-product-design.json";
import investors from "@/data/profiles/investors.json";
import mentorsExperts from "@/data/profiles/mentors-experts.json";
import talent from "@/data/profiles/talent.json";
import imported from "@/data/profiles/imported.json";
import eventsJson from "@/data/events.json";

const ALL_PROFILES: Profile[] = [
  ...(cofoundersTech as unknown as Profile[]),
  ...(cofoundersCommercial as unknown as Profile[]),
  ...(cofoundersProductDesign as unknown as Profile[]),
  ...(investors as unknown as Profile[]),
  ...(mentorsExperts as unknown as Profile[]),
  ...(talent as unknown as Profile[]),
  ...(imported as unknown as Profile[]),
];

const ALL_EVENTS: Event[] = eventsJson as unknown as Event[];

export function getProfiles(): Profile[] {
  return ALL_PROFILES;
}

export function getProfile(id: string): Profile | undefined {
  return ALL_PROFILES.find((p) => p.id === id);
}

/** Findet ein Profil per Vorname/Nachname/Slug – für "guck dir mal den Max an". */
export function findProfileByName(name: string): Profile[] {
  const q = name.trim().toLowerCase();
  if (!q) return [];
  return ALL_PROFILES.filter(
    (p) => p.name.toLowerCase().includes(q) || p.id.includes(q.replace(/\s+/g, "-")),
  );
}

export function getEvents(): Event[] {
  return ALL_EVENTS;
}

export function getEvent(slug: string): Event | undefined {
  return ALL_EVENTS.find((e) => e.slug === slug);
}

export function getProfilesForEvent(slug: string): Profile[] {
  return ALL_PROFILES.filter((p) => p.events.includes(slug));
}

/** Alle vorkommenden Verticals (für Filter-Dropdowns). */
export function getVerticals(): string[] {
  return Array.from(new Set(ALL_PROFILES.flatMap((p) => p.verticals))).sort();
}

export function searchProfiles(filters: ProfileFilters = {}): Profile[] {
  const q = filters.query?.trim().toLowerCase();
  return ALL_PROFILES.filter((p) => {
    if (filters.networkRole && p.networkRole !== filters.networkRole) return false;
    if (filters.founderRole && p.founderRole !== filters.founderRole) return false;
    if (filters.vertical && !p.verticals.includes(filters.vertical)) return false;
    if (filters.event && !p.events.includes(filters.event)) return false;
    if (filters.personality && p.personality.type !== filters.personality) return false;
    if (filters.stage && p.stage !== filters.stage) return false;
    if (q) {
      const haystack = [
        p.name,
        p.headline,
        p.location,
        p.about,
        ...p.skills,
        ...p.verticals,
        ...p.lookingFor,
        ...p.experience.map((e) => `${e.title} ${e.company}`),
        ...(p.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}
