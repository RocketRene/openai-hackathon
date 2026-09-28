"use client";
/**
 * Durchsuchbare Kandidatenliste ("wie LinkedIn, pivotiert auf Co-Founder-Suche").
 * - Filter leben in der URL (?query=&networkRole=&founderRole=&vertical=&event=&personality=&source=),
 *   damit Links teilbar sind und der Agent per navigate-Action vorfiltern kann.
 * - Mit Nutzer-Kontext: Sortierung nach Match-Score (rankCandidates), sonst nach Name.
 * - Es werden nur PAGE_SIZE Karten gerendert; "Mehr laden" hängt weitere an.
 */
import { Suspense, useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getProfiles, searchProfiles } from "@/lib/data";
import { rankCandidates } from "@/lib/matching";
import type { MatchResult, Profile } from "@/lib/types";
import { useUserContext } from "@/lib/user-context";
import { Button, EmptyState, LinkButton, Skeleton, cx } from "@/components/ui";
import { CandidateCard, getProfileSource } from "./CandidateCard";
import { CandidateFilters, countActiveFilters, filtersToSearchParams, parseFilters, type CandidateFilterState } from "./CandidateFilters";

const PAGE_SIZE = 30;

type SortKey = "score" | "name" | "source";

const nameCollator = new Intl.Collator("de", { sensitivity: "base" });

/** Reihenfolge bei Sortierung nach Quelle: echte Daten zuerst. */
const SOURCE_ORDER: Record<string, number> = { idealab: 0, manual: 1, demo: 2 };

interface ListState {
  filters: CandidateFilterState;
  /** Query-String, zu dem `filters` gehört – erkennt externe URL-Änderungen (Back/Forward, Links). */
  urlKey: string;
  visible: number;
}

function formatCount(n: number): string {
  return n.toLocaleString("de-DE");
}

function CardSkeleton() {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex gap-3">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="mt-4 flex gap-1.5">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-3 w-5/6" />
    </div>
  );
}

function CandidateListFallback() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-4 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function SortToggle({ value, scoreAvailable, onChange }: { value: SortKey; scoreAvailable: boolean; onChange: (next: SortKey) => void }) {
  const options: { key: SortKey; label: string; disabled?: boolean; title: string }[] = [
    {
      key: "score",
      label: "Match",
      disabled: !scoreAvailable,
      title: scoreAvailable ? "Nach Match-Score sortieren" : "Match-Scores brauchen deinen Nutzer-Kontext",
    },
    { key: "name", label: "Name", title: "Alphabetisch sortieren" },
    { key: "source", label: "Quelle", title: "Echte IdeaLab-Profile zuerst" },
  ];
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
      <span className="hidden sm:inline">Sortieren nach</span>
      <div role="group" aria-label="Sortierung" className="inline-flex rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-0.5">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            title={option.title}
            disabled={option.disabled}
            aria-pressed={value === option.key}
            onClick={() => onChange(option.key)}
            className={cx(
              "rounded-[6px] px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
              value === option.key ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "text-[var(--foreground)] hover:bg-[var(--surface-2)]",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CandidateListInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlKey = searchParams.toString();

  const [state, setState] = useState<ListState>(() => ({
    filters: parseFilters(searchParams),
    urlKey,
    visible: PAGE_SIZE,
  }));
  // Externe URL-Änderung (Back/Forward, Link mit anderen Parametern) übernehmen.
  if (state.urlKey !== urlKey) {
    setState({ filters: parseFilters(searchParams), urlKey, visible: PAGE_SIZE });
  }

  const setFilters = useCallback(
    (next: CandidateFilterState) => {
      const qs = filtersToSearchParams(next).toString();
      setState({ filters: next, urlKey: qs, visible: PAGE_SIZE });
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const { userContext, ready, loadDemo } = useUserContext();
  const allProfiles = getProfiles();

  const matches = useMemo<Map<string, MatchResult> | null>(() => {
    if (!userContext) return null;
    return new Map(rankCandidates(userContext, allProfiles).map((m) => [m.profileId, m] as const));
  }, [userContext, allProfiles]);

  const [sortChoice, setSortChoice] = useState<SortKey | null>(null);
  const sort: SortKey = sortChoice && (sortChoice !== "score" || matches) ? sortChoice : matches ? "score" : "name";

  const results = useMemo(() => {
    const { source, ...gatewayFilters } = state.filters;
    const base = searchProfiles(gatewayFilters);
    const filtered = source ? base.filter((p) => getProfileSource(p) === source) : base;
    const byName = (a: Profile, b: Profile) => nameCollator.compare(a.name, b.name);
    const byScore = (a: Profile, b: Profile) => (matches?.get(b.id)?.score ?? -1) - (matches?.get(a.id)?.score ?? -1);
    const bySource = (a: Profile, b: Profile) =>
      (SOURCE_ORDER[getProfileSource(a) ?? ""] ?? 9) - (SOURCE_ORDER[getProfileSource(b) ?? ""] ?? 9);
    const sorted = [...filtered];
    if (sort === "score" && matches) sorted.sort((a, b) => byScore(a, b) || byName(a, b));
    else if (sort === "source") sorted.sort((a, b) => bySource(a, b) || (matches ? byScore(a, b) : 0) || byName(a, b));
    else sorted.sort(byName);
    return sorted;
  }, [state.filters, sort, matches]);

  if (!ready) return <CandidateListFallback />;

  const visibleProfiles = results.slice(0, state.visible);
  const hasMore = state.visible < results.length;
  const total = results.length;
  const activeCount = countActiveFilters(state.filters);

  return (
    <div className="space-y-4">
      <CandidateFilters filters={state.filters} onChange={setFilters} />

      {!userContext && (
        <div
          role="note"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--accent)]/30 bg-[var(--accent-soft)]/60 px-4 py-3"
        >
          <p className="text-sm text-[var(--foreground)]">
            <span className="font-medium">Ohne deinen Kontext keine Match-Scores.</span>{" "}
            <span className="text-[var(--muted)]">Kurz Profil anlegen oder den Demo-Kontext laden.</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/onboarding" variant="secondary" size="sm">
              Profil anlegen
            </LinkButton>
            <Button type="button" size="sm" onClick={loadDemo}>
              Demo-Kontext laden
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--muted)]" aria-live="polite">
          <span className="text-base font-semibold tabular-nums text-[var(--foreground)]">{formatCount(total)}</span>
          {total !== allProfiles.length ? ` von ${formatCount(allProfiles.length)} Profilen` : " Profile"}
          {matches && sort === "score" && <span className="hidden sm:inline"> · nach Match-Score priorisiert</span>}
        </p>
        <SortToggle value={sort} scoreAvailable={Boolean(matches)} onChange={setSortChoice} />
      </div>

      {total === 0 ? (
        allProfiles.length === 0 ? (
          <EmptyState
            title="Noch keine Profile geladen"
            body="Die Profil-Dateien unter src/data/profiles sind noch leer. Sobald Import und Demo-Daten da sind, erscheinen sie hier."
          />
        ) : (
          <EmptyState
            title="Keine Treffer"
            body={
              activeCount > 1
                ? "Mehrere Filter greifen gleichzeitig. Lockere einen davon – meistens reicht es, Vertical oder Team-Rolle wegzulassen."
                : "Versuche einen anderen Suchbegriff oder setze den Filter zurück."
            }
            action={
              <>
                {state.filters.query && activeCount > 1 && (
                  <Button type="button" variant="secondary" onClick={() => setFilters({ query: state.filters.query })}>
                    Nur Suchbegriff behalten
                  </Button>
                )}
                <Button type="button" variant={state.filters.query && activeCount > 1 ? "ghost" : "secondary"} onClick={() => setFilters({})}>
                  Alle Filter zurücksetzen
                </Button>
              </>
            }
          />
        )
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Kandidaten">
            {visibleProfiles.map((profile) => (
              <li key={profile.id} className="min-w-0">
                <CandidateCard profile={profile} match={matches?.get(profile.id)} />
              </li>
            ))}
          </ul>

          <div className="flex flex-col items-center gap-2 pt-2">
            <p className="text-xs text-[var(--muted)]">
              {formatCount(visibleProfiles.length)} von {formatCount(total)} angezeigt
            </p>
            {hasMore && (
              <Button type="button" variant="secondary" onClick={() => setState((s) => ({ ...s, visible: s.visible + PAGE_SIZE }))}>
                Mehr laden ({formatCount(Math.min(PAGE_SIZE, total - visibleProfiles.length))} weitere)
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** useSearchParams braucht eine Suspense-Grenze (statisches Prerendering) – hier eingebaut. */
export function CandidateList() {
  return (
    <Suspense fallback={<CandidateListFallback />}>
      <CandidateListInner />
    </Suspense>
  );
}

export default CandidateList;
