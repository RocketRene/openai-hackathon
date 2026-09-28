"use client";
/**
 * Filter-Toolbar der Kandidatenliste: Suche (debounced, „/“ fokussiert), kompakte Selects,
 * Rollen als Chip-Reihe, aktive Filter als entfernbare Pills, rechts ein Slot (Trefferzahl, Sortierung).
 * Kontrolliert: Zustand kommt von außen (CandidateList hält ihn in der URL).
 * Enthält auch die URL <-> Filter-Konvertierung, damit Liste und Filter dasselbe Vokabular nutzen.
 */
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { getEvents, getVerticals } from "@/lib/data";
import { PERSONALITY_LABELS, type FounderRole, type NetworkRole, type PersonalityType, type ProfileFilters } from "@/lib/types";
import { Button, Chip, cx } from "@/components/ui";
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

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

/**
 * Suchfeld mit Debounce. Eigener Text-State, damit Tippen sofort sichtbar ist;
 * nach 200 ms Ruhe wird der Wert nach außen gemeldet. Externe Änderungen
 * (Reset, Navigation) werden übernommen – das Echo der eigenen Eingabe nicht.
 * Tastenkürzel „/“ fokussiert das Feld, „Escape“ leert es.
 */
function SearchInput({
  id,
  value,
  onChange,
  className,
}: {
  id: string;
  value: string;
  onChange: (query: string) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const clear = () => {
    setText("");
    setEmitted("");
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div className={cx("relative min-w-0", className)}>
      <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base leading-none text-[var(--muted)]">
        ⌕
      </span>
      <input
        ref={inputRef}
        id={id}
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && text) {
            e.preventDefault();
            clear();
          }
        }}
        placeholder="Name, Skill, Firma, Ort, Vertical …"
        autoComplete="off"
        spellCheck={false}
        aria-label="Kandidaten durchsuchen"
        className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] pl-9 pr-12 text-sm text-[var(--foreground)] shadow-[var(--shadow-sm)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)] [&::-webkit-search-cancel-button]:appearance-none"
      />
      {text ? (
        <button
          type="button"
          onClick={clear}
          aria-label="Suche leeren"
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-sm leading-none text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          ×
        </button>
      ) : (
        <kbd
          aria-hidden
          className="pointer-events-none absolute right-2.5 top-1/2 hidden h-5 -translate-y-1/2 items-center rounded border border-[var(--border)] bg-[var(--surface-2)] px-1.5 font-mono text-[10px] text-[var(--muted)] sm:inline-flex"
        >
          /
        </kbd>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Kompaktes Select – die „Alle …“-Option dient als sichtbares Label     */
/* ------------------------------------------------------------------ */

function ToolbarSelect({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <select
      id={id}
      aria-label={label}
      title={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cx(
        "h-9 min-w-0 cursor-pointer rounded-[var(--radius)] border px-2.5 text-xs font-medium shadow-[var(--shadow-sm)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]",
        value
          ? "border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-2)]",
      )}
    >
      {children}
    </select>
  );
}

/* ------------------------------------------------------------------ */
/* Aktive Filter als Pills                                             */
/* ------------------------------------------------------------------ */

interface ActiveFilter {
  key: keyof CandidateFilterState;
  label: string;
}

function describeActiveFilters(filters: CandidateFilterState, eventNames: Map<string, string>): ActiveFilter[] {
  const out: ActiveFilter[] = [];
  if (filters.query) out.push({ key: "query", label: `„${filters.query}“` });
  if (filters.networkRole) out.push({ key: "networkRole", label: NETWORK_ROLE_LABELS[filters.networkRole] });
  if (filters.founderRole) out.push({ key: "founderRole", label: `Team-Rolle: ${FOUNDER_ROLE_LABELS[filters.founderRole]}` });
  if (filters.vertical) out.push({ key: "vertical", label: formatVertical(filters.vertical) });
  if (filters.event) out.push({ key: "event", label: eventNames.get(filters.event) ?? filters.event });
  if (filters.personality) out.push({ key: "personality", label: PERSONALITY_LABELS[filters.personality] });
  if (filters.source) out.push({ key: "source", label: `Quelle: ${SOURCE_FILTER_LABELS[filters.source]}` });
  return out;
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Filter entfernen: ${label}`}
      className="inline-flex h-7 max-w-full items-center gap-1 rounded-full border border-[var(--accent)]/30 bg-[var(--accent-soft)] pl-2.5 pr-1.5 text-xs font-medium text-[var(--accent)] transition hover:border-[var(--accent)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
    >
      <span className="truncate">{label}</span>
      <span aria-hidden className="flex h-4 w-4 items-center justify-center rounded-full text-sm leading-none opacity-70">
        ×
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Toolbar                                                             */
/* ------------------------------------------------------------------ */

export interface CandidateFiltersProps {
  filters: CandidateFilterState;
  onChange: (next: CandidateFilterState) => void;
  className?: string;
  /** Rechts neben der Chip-Reihe: z. B. Trefferzahl und Sortier-Umschalter. */
  trailing?: ReactNode;
}

export function CandidateFilters({ filters, onChange, className, trailing }: CandidateFiltersProps) {
  const id = useId();
  const verticals = useMemo(() => getVerticals(), []);
  const events = useMemo(() => getEvents(), []);
  const eventNames = useMemo(() => new Map(events.map((e) => [e.slug, e.name] as const)), [events]);
  const [moreOpen, setMoreOpen] = useState(false);

  const active = describeActiveFilters(filters, eventNames);
  const activeCount = active.length;
  const selectCount = [filters.founderRole, filters.vertical, filters.event, filters.personality, filters.source].filter(Boolean).length;

  const update = (patch: Partial<CandidateFilterState>) => onChange({ ...filters, ...patch });
  const orUndefined = (value: string) => value || undefined;

  return (
    <section
      aria-label="Filter"
      className={cx("rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-sm)]", className)}
    >
      {/* Zeile 1: Suche prominent + kompakte Selects (mobil einklappbar) */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="flex items-center gap-2 lg:w-[22rem] lg:shrink-0 xl:w-[26rem]">
          <SearchInput
            id={`${id}-query`}
            className="flex-1"
            value={filters.query ?? ""}
            onChange={(query) => update({ query: orUndefined(query.trim()) })}
          />
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="shrink-0 md:hidden"
            aria-expanded={moreOpen}
            aria-controls={`${id}-more`}
            onClick={() => setMoreOpen((open) => !open)}
          >
            Filter{selectCount > 0 ? ` · ${selectCount}` : ""}
            <span aria-hidden className="text-[10px]">
              {moreOpen ? "▲" : "▼"}
            </span>
          </Button>
        </div>

        <div
          id={`${id}-more`}
          className={cx("grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-1 lg:flex-wrap", moreOpen ? "grid" : "hidden md:grid")}
        >
          <ToolbarSelect
            id={`${id}-founderRole`}
            label="Team-Rolle"
            value={filters.founderRole ?? ""}
            onChange={(value) => update({ founderRole: orUndefined(value) as FounderRole | undefined })}
          >
            <option value="">Alle Team-Rollen</option>
            {FOUNDER_ROLES.map((role) => (
              <option key={role} value={role}>
                {FOUNDER_ROLE_LABELS[role]}
              </option>
            ))}
          </ToolbarSelect>

          <ToolbarSelect id={`${id}-vertical`} label="Vertical" value={filters.vertical ?? ""} onChange={(value) => update({ vertical: orUndefined(value) })}>
            <option value="">Alle Verticals</option>
            {filters.vertical && !verticals.includes(filters.vertical) && <option value={filters.vertical}>{formatVertical(filters.vertical)}</option>}
            {verticals.map((vertical) => (
              <option key={vertical} value={vertical}>
                {formatVertical(vertical)}
              </option>
            ))}
          </ToolbarSelect>

          <ToolbarSelect id={`${id}-event`} label="Event" value={filters.event ?? ""} onChange={(value) => update({ event: orUndefined(value) })}>
            <option value="">Alle Events</option>
            {filters.event && !eventNames.has(filters.event) && <option value={filters.event}>{filters.event}</option>}
            {events.map((event) => (
              <option key={event.slug} value={event.slug}>
                {event.name}
              </option>
            ))}
          </ToolbarSelect>

          <ToolbarSelect
            id={`${id}-personality`}
            label="Persönlichkeitstyp"
            value={filters.personality ?? ""}
            onChange={(value) => update({ personality: orUndefined(value) as PersonalityType | undefined })}
          >
            <option value="">Alle Typen</option>
            {PERSONALITIES.map((type) => (
              <option key={type} value={type}>
                {PERSONALITY_LABELS[type]}
              </option>
            ))}
          </ToolbarSelect>

          <ToolbarSelect
            id={`${id}-source`}
            label="Quelle"
            value={filters.source ?? ""}
            onChange={(value) => update({ source: orUndefined(value) as SourceFilter | undefined })}
          >
            <option value="">Alle Quellen</option>
            {SOURCES.map((source) => (
              <option key={source} value={source}>
                {SOURCE_FILTER_LABELS[source]}
              </option>
            ))}
          </ToolbarSelect>
        </div>
      </div>

      {/* Zeile 2: Rollen-Chips links, Trefferzahl + Sortierung rechts */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[var(--border)] pt-3">
        <div role="group" aria-label="Rolle im Ökosystem" className="flex flex-wrap gap-1.5">
          <Chip active={!filters.networkRole} onClick={() => filters.networkRole && update({ networkRole: undefined })}>
            Alle
          </Chip>
          {NETWORK_ROLES.map((role) => (
            <Chip
              key={role}
              active={filters.networkRole === role}
              onClick={() => update({ networkRole: filters.networkRole === role ? undefined : role })}
            >
              {NETWORK_ROLE_LABELS[role]}
            </Chip>
          ))}
        </div>
        {trailing && <div className="flex flex-wrap items-center gap-3">{trailing}</div>}
      </div>

      {/* Zeile 3: aktive Filter als entfernbare Pills */}
      {activeCount > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[var(--border)] pt-3">
          <span className="mr-1 text-xs text-[var(--muted)]">{activeCount === 1 ? "1 Filter aktiv" : `${activeCount} Filter aktiv`}</span>
          {active.map((item) => (
            <FilterPill key={item.key} label={item.label} onRemove={() => update({ [item.key]: undefined })} />
          ))}
          <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => onChange({})}>
            Alle zurücksetzen
          </Button>
        </div>
      )}
    </section>
  );
}

export default CandidateFilters;
