"use client";
/**
 * Filterleiste der Kandidatenliste: Suche (debounced), Selects, Reset.
 * Kontrolliert: Zustand kommt von außen (CandidateList hält ihn in der URL).
 * Enthält auch die URL <-> Filter-Konvertierung, damit Liste und Filter dasselbe Vokabular nutzen.
 */
import { useEffect, useId, useState } from "react";
import { getEvents, getVerticals } from "@/lib/data";
import { PERSONALITY_LABELS, type FounderRole, type NetworkRole, type PersonalityType, type ProfileFilters } from "@/lib/types";
import { Button, Input, Label, Select, cx } from "@/components/ui";
import { FOUNDER_ROLE_LABELS, NETWORK_ROLE_LABELS, SOURCE_LABELS, formatVertical, type ProfileSource } from "./CandidateCard";

/** Quelle-Filter: nur echte IdeaLab-Daten oder nur Demo-Daten (undefined = alle). */
export type SourceFilter = Extract<ProfileSource, "idealab" | "demo">;

/** Filterzustand der Liste = Gateway-Filter (ProfileFilters) + Quelle. */
export interface CandidateFilterState
  extends Pick<ProfileFilters, "query" | "networkRole" | "founderRole" | "vertical" | "event" | "personality"> {
  source?: SourceFilter;
}

export const FILTER_KEYS = [
  "query",
  "networkRole",
  "founderRole",
  "vertical",
  "event",
  "personality",
  "source",
] as const satisfies readonly (keyof CandidateFilterState)[];

const NETWORK_ROLES = Object.keys(NETWORK_ROLE_LABELS) as NetworkRole[];
const FOUNDER_ROLES = Object.keys(FOUNDER_ROLE_LABELS) as FounderRole[];
const PERSONALITIES = Object.keys(PERSONALITY_LABELS) as PersonalityType[];
const SOURCES: SourceFilter[] = ["idealab", "demo"];

const SEARCH_DEBOUNCE_MS = 200;

function pick<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

/** URL-Query → Filterzustand. Unbekannte Werte werden verworfen, leere entfernt. */
export function parseFilters(params: URLSearchParams): CandidateFilterState {
  return {
    query: params.get("query")?.trim() || undefined,
    networkRole: pick(params.get("networkRole"), NETWORK_ROLES),
    founderRole: pick(params.get("founderRole"), FOUNDER_ROLES),
    vertical: params.get("vertical")?.trim() || undefined,
    event: params.get("event")?.trim() || undefined,
    personality: pick(params.get("personality"), PERSONALITIES),
    source: pick(params.get("source"), SOURCES),
  };
}

/** Filterzustand → URL-Query (nur gesetzte Werte, feste Reihenfolge). */
export function filtersToSearchParams(filters: CandidateFilterState): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  return params;
}

export function countActiveFilters(filters: CandidateFilterState): number {
  return FILTER_KEYS.filter((key) => Boolean(filters[key])).length;
}

/**
 * Suchfeld mit Debounce. Eigener Text-State, damit Tippen sofort sichtbar ist;
 * nach 200 ms Ruhe wird der Wert nach außen gemeldet. Externe Änderungen
 * (Reset, Navigation) werden übernommen – das Echo der eigenen Eingabe nicht.
 */
function SearchInput({ id, value, onChange }: { id: string; value: string; onChange: (query: string) => void }) {
  const [text, setText] = useState(value);
  const [seen, setSeen] = useState(value);
  const [emitted, setEmitted] = useState(value);

  if (value !== seen) {
    setSeen(value);
    if (value !== emitted) {
      setEmitted(value);
      setText(value);
    }
  }

  useEffect(() => {
    if (text === emitted) return;
    const timer = window.setTimeout(() => {
      setEmitted(text);
      onChange(text);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [text, emitted, onChange]);

  return (
    <Input
      id={id}
      type="search"
      value={text}
      onChange={(e) => setText(e.target.value)}
      placeholder="Name, Skill, Firma, Ort, Vertical …"
      autoComplete="off"
      aria-label="Kandidaten durchsuchen"
    />
  );
}

export interface CandidateFiltersProps {
  filters: CandidateFilterState;
  onChange: (next: CandidateFilterState) => void;
  className?: string;
}

export function CandidateFilters({ filters, onChange, className }: CandidateFiltersProps) {
  const id = useId();
  const verticals = getVerticals();
  const events = getEvents();
  const activeCount = countActiveFilters(filters);

  const update = (patch: Partial<CandidateFilterState>) => onChange({ ...filters, ...patch });
  const orUndefined = (value: string) => value || undefined;

  return (
    <section aria-label="Filter" className={cx("rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4", className)}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="md:col-span-2 xl:col-span-4">
          <Label htmlFor={`${id}-query`}>Suche</Label>
          <SearchInput
            id={`${id}-query`}
            value={filters.query ?? ""}
            onChange={(query) => update({ query: orUndefined(query.trim()) })}
          />
        </div>

        <div>
          <Label htmlFor={`${id}-networkRole`}>Rolle im Ökosystem</Label>
          <Select
            id={`${id}-networkRole`}
            value={filters.networkRole ?? ""}
            onChange={(e) => update({ networkRole: orUndefined(e.target.value) as NetworkRole | undefined })}
          >
            <option value="">Alle Rollen</option>
            {NETWORK_ROLES.map((role) => (
              <option key={role} value={role}>
                {NETWORK_ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor={`${id}-founderRole`}>Team-Rolle</Label>
          <Select
            id={`${id}-founderRole`}
            value={filters.founderRole ?? ""}
            onChange={(e) => update({ founderRole: orUndefined(e.target.value) as FounderRole | undefined })}
          >
            <option value="">Alle Team-Rollen</option>
            {FOUNDER_ROLES.map((role) => (
              <option key={role} value={role}>
                {FOUNDER_ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor={`${id}-vertical`}>Vertical</Label>
          <Select id={`${id}-vertical`} value={filters.vertical ?? ""} onChange={(e) => update({ vertical: orUndefined(e.target.value) })}>
            <option value="">Alle Verticals</option>
            {filters.vertical && !verticals.includes(filters.vertical) && (
              <option value={filters.vertical}>{formatVertical(filters.vertical)}</option>
            )}
            {verticals.map((vertical) => (
              <option key={vertical} value={vertical}>
                {formatVertical(vertical)}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor={`${id}-event`}>Event</Label>
          <Select id={`${id}-event`} value={filters.event ?? ""} onChange={(e) => update({ event: orUndefined(e.target.value) })}>
            <option value="">Alle Events</option>
            {filters.event && !events.some((event) => event.slug === filters.event) && (
              <option value={filters.event}>{filters.event}</option>
            )}
            {events.map((event) => (
              <option key={event.slug} value={event.slug}>
                {event.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor={`${id}-personality`}>Persönlichkeitstyp</Label>
          <Select
            id={`${id}-personality`}
            value={filters.personality ?? ""}
            onChange={(e) => update({ personality: orUndefined(e.target.value) as PersonalityType | undefined })}
          >
            <option value="">Alle Typen</option>
            {PERSONALITIES.map((type) => (
              <option key={type} value={type}>
                {PERSONALITY_LABELS[type]}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor={`${id}-source`}>Quelle</Label>
          <Select
            id={`${id}-source`}
            value={filters.source ?? ""}
            onChange={(e) => update({ source: orUndefined(e.target.value) as SourceFilter | undefined })}
          >
            <option value="">Alle Quellen</option>
            {SOURCES.map((source) => (
              <option key={source} value={source}>
                {source === "demo" ? "Demo-Daten" : SOURCE_LABELS[source]}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-end justify-between gap-2 md:col-span-2 xl:col-span-2">
          <p className="pb-2 text-xs text-[var(--muted)]">
            {activeCount === 0 ? "Keine Filter aktiv" : activeCount === 1 ? "1 Filter aktiv" : `${activeCount} Filter aktiv`}
          </p>
          <Button type="button" variant="ghost" size="sm" disabled={activeCount === 0} onClick={() => onChange({})}>
            Filter zurücksetzen
          </Button>
        </div>
      </div>
    </section>
  );
}

export default CandidateFilters;
