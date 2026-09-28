"use client";
/**
 * Filterleiste der Kandidatenliste: Suche (debounced), Chips/Segmente für kleine Wertemengen,
 * Selects für Vertical und Event, aktive Filter als entfernbare Chips, „Alle zurücksetzen".
 * Kontrolliert: Zustand kommt von außen (CandidateList hält ihn in der URL).
 * Enthält auch die URL <-> Filter-Konvertierung, damit Liste und Filter dasselbe Vokabular nutzen.
 */
import { useEffect, useId, useState } from "react";
import { getEvents, getVerticals } from "@/lib/data";
import { PERSONALITY_LABELS, type FounderRole, type NetworkRole, type PersonalityType, type ProfileFilters } from "@/lib/types";
import { Button, Chip, Input, Select, cx } from "@/components/ui";
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

type FilterKey = (typeof FILTER_KEYS)[number];

const NETWORK_ROLES = Object.keys(NETWORK_ROLE_LABELS) as NetworkRole[];
const FOUNDER_ROLES = Object.keys(FOUNDER_ROLE_LABELS) as FounderRole[];
const PERSONALITIES = Object.keys(PERSONALITY_LABELS) as PersonalityType[];
const SOURCES: SourceFilter[] = ["idealab", "demo"];

const SOURCE_FILTER_LABELS: Record<SourceFilter, string> = {
  idealab: SOURCE_LABELS.idealab,
  demo: "Demo-Daten",
};

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

/* ------------------------------------------------------------------ */
/* Suchfeld                                                            */
/* ------------------------------------------------------------------ */

function SearchIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
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
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
        <SearchIcon />
      </span>
      <Input
        id={id}
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Name, Skill, Firma, Ort oder Vertical suchen …"
        autoComplete="off"
        aria-label="Kandidaten durchsuchen"
        className="h-12 pl-10 text-base"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chip-Gruppe                                                         */
/* ------------------------------------------------------------------ */

function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (next: T | undefined) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-xs font-medium text-[var(--muted)]">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        <Chip active={value === undefined} onClick={() => onChange(undefined)}>
          Alle
        </Chip>
        {options.map((option) => (
          <Chip
            key={option.value}
            active={value === option.value}
            onClick={() => onChange(value === option.value ? undefined : option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </div>
    </fieldset>
  );
}

/* ------------------------------------------------------------------ */
/* Aktive Filter                                                       */
/* ------------------------------------------------------------------ */

function activeFilterLabel(key: FilterKey, value: string, eventNames: Map<string, string>): string {
  switch (key) {
    case "query":
      return `„${value}“`;
    case "networkRole":
      return NETWORK_ROLE_LABELS[value as NetworkRole] ?? value;
    case "founderRole":
      return FOUNDER_ROLE_LABELS[value as FounderRole] ?? value;
    case "vertical":
      return formatVertical(value);
    case "event":
      return eventNames.get(value) ?? value;
    case "personality":
      return PERSONALITY_LABELS[value as PersonalityType] ?? value;
    case "source":
      return SOURCE_FILTER_LABELS[value as SourceFilter] ?? value;
  }
}

/** Aktive Filter als entfernbare Chips + „Alle zurücksetzen". Rendert nichts, wenn keine aktiv sind. */
export function ActiveFilterChips({ filters, onChange }: { filters: CandidateFilterState; onChange: (next: CandidateFilterState) => void }) {
  const active = FILTER_KEYS.filter((key) => Boolean(filters[key]));
  if (active.length === 0) return null;
  const eventNames = new Map(getEvents().map((e) => [e.slug, e.name] as const));

  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Aktive Filter">
      {active.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange({ ...filters, [key]: undefined })}
          aria-label={`Filter ${activeFilterLabel(key, filters[key] as string, eventNames)} entfernen`}
          className="inline-flex h-7 items-center gap-1 rounded-full bg-[var(--accent-soft)] pl-2.5 pr-1.5 text-xs font-medium text-[var(--accent)] transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          {activeFilterLabel(key, filters[key] as string, eventNames)}
          <span aria-hidden className="flex h-4 w-4 items-center justify-center rounded-full text-[13px] leading-none">
            ×
          </span>
        </button>
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={() => onChange({})}>
        Alle zurücksetzen
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Filterleiste                                                        */
/* ------------------------------------------------------------------ */

export interface CandidateFiltersProps {
  filters: CandidateFilterState;
  onChange: (next: CandidateFilterState) => void;
  className?: string;
}

export function CandidateFilters({ filters, onChange, className }: CandidateFiltersProps) {
  const id = useId();
  const verticals = getVerticals();
  const events = getEvents();
  const activeCount = countActiveFilters(filters) - (filters.query ? 1 : 0);
  const [open, setOpen] = useState(false);

  const update = (patch: Partial<CandidateFilterState>) => onChange({ ...filters, ...patch });
  const orUndefined = (value: string) => value || undefined;

  return (
    <section aria-label="Suche und Filter" className={cx("space-y-3", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <SearchInput id={`${id}-query`} value={filters.query ?? ""} onChange={(query) => update({ query: orUndefined(query.trim()) })} />
        </div>
        <Button
          type="button"
          variant="secondary"
          className="h-12 shrink-0 sm:w-auto lg:hidden"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={() => setOpen((o) => !o)}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          Filter
          {activeCount > 0 && (
            <span className="rounded-full bg-[var(--accent)] px-1.5 text-[11px] font-semibold text-[var(--accent-contrast)]">
              {activeCount}
            </span>
          )}
        </Button>
      </div>

      <div
        id={`${id}-panel`}
        className={cx(
          "rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]",
          !open && "hidden lg:block",
        )}
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <ChipGroup
            label="Rolle im Ökosystem"
            options={NETWORK_ROLES.map((role) => ({ value: role, label: NETWORK_ROLE_LABELS[role] }))}
            value={filters.networkRole}
            onChange={(networkRole) => update({ networkRole })}
          />
          <ChipGroup
            label="Team-Rolle"
            options={FOUNDER_ROLES.map((role) => ({ value: role, label: FOUNDER_ROLE_LABELS[role] }))}
            value={filters.founderRole}
            onChange={(founderRole) => update({ founderRole })}
          />
          <ChipGroup
            label="Persönlichkeitstyp"
            options={PERSONALITIES.map((type) => ({ value: type, label: PERSONALITY_LABELS[type] }))}
            value={filters.personality}
            onChange={(personality) => update({ personality })}
          />
          <ChipGroup
            label="Quelle"
            options={SOURCES.map((source) => ({ value: source, label: SOURCE_FILTER_LABELS[source] }))}
            value={filters.source}
            onChange={(source) => update({ source })}
          />

          <div>
            <label htmlFor={`${id}-vertical`} className="mb-1.5 block text-xs font-medium text-[var(--muted)]">
              Vertical
            </label>
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
            <label htmlFor={`${id}-event`} className="mb-1.5 block text-xs font-medium text-[var(--muted)]">
              Event
            </label>
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
        </div>
      </div>

      <ActiveFilterChips filters={filters} onChange={onChange} />
    </section>
  );
}

export default CandidateFilters;
