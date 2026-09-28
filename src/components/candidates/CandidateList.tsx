"use client";
/**
 * Durchsuchbare Kandidatenliste ("wie LinkedIn, pivotiert auf Co-Founder-Suche").
 * - Filter leben in der URL (?query=&networkRole=&founderRole=&vertical=&event=&personality=&source=),
 *   damit Links teilbar sind und der Agent per navigate-Action vorfiltern kann.
 * - Mit Nutzer-Kontext: Sortierung nach Match-Score (rankCandidates), sonst nach Name; optional nach Quelle.
 * - Es werden nur PAGE_SIZE Karten gerendert; "Mehr laden" hängt weitere an.
 * - Toolbar ist ab md sticky unter dem App-Header (--header-height); Filtern rechnet deferred,
 *   die alte Liste bleibt gedimmt stehen, „Mehr laden“ zeigt Skeleton-Karten.
 * - Zweisprachig (DE/EN): Texte über `useT(DICT)`, Match-Gründe/Tier-Labels über `rankCandidates(…, { locale })`.
 */
import { Suspense, useCallback, useDeferredValue, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getProfiles, searchProfiles } from "@/lib/data";
import { COMMON, useLocale, useT, type Dict, type Locale } from "@/lib/i18n";
import { rankCandidates } from "@/lib/matching";
import type { MatchResult, Profile } from "@/lib/types";
import { useUserContext } from "@/lib/user-context";
import { Button, EmptyState, LinkButton, cx } from "@/components/ui";
import { CandidateCard, CandidateCardSkeleton, getProfileSource } from "./CandidateCard";
import { CandidateFilters, countActiveFilters, filtersToSearchParams, parseFilters, type CandidateFilterState } from "./CandidateFilters";

const PAGE_SIZE = 30;
const SKELETON_COUNT = 6;

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

function formatCount(n: number, locale: Locale): string {
  return n.toLocaleString(locale === "en" ? "en-US" : "de-DE");
}

const GRID_CLASSES = "grid gap-4 sm:grid-cols-2 xl:grid-cols-3";

const DICT = {
  loadingSr: { de: "Kandidaten werden geladen …", en: "Loading candidates …" },
  resultOne: { de: "Treffer", en: "result" },
  results: { de: "Treffer", en: "results" },
  ofAll: { de: "von {all}", en: "of {all}" },
  sort: { de: "Sortieren", en: "Sort" },
  sortGroup: { de: "Sortierung", en: "Sort order" },
  sortScore: { de: "Score", en: "Score" },
  sortScoreTitle: { de: "Nach Match-Score sortieren", en: "Sort by match score" },
  sortScoreDisabled: { de: "Match-Scores brauchen deinen Nutzer-Kontext", en: "Match scores need your user context" },
  sortName: { de: "A–Z", en: "A–Z" },
  sortNameTitle: { de: "Alphabetisch sortieren", en: "Sort alphabetically" },
  sortSource: { de: "Quelle", en: "Source" },
  sortSourceTitle: { de: "Echte IdeaLab-Profile zuerst", en: "Real IdeaLab profiles first" },
  hintTitle: { de: "Ohne Kontext keine Match-Scores.", en: "No match scores without context." },
  hintBody: {
    de: "Kurz Profil anlegen oder den Demo-Kontext laden – dann priorisiert Voya nach Passung.",
    en: "Set up a quick profile or load the demo context – then Voya prioritizes by fit.",
  },
  createProfile: { de: "Profil anlegen", en: "Create profile" },
  emptyNoProfilesTitle: { de: "Noch keine Profile geladen", en: "No profiles loaded yet" },
  emptyNoProfilesBody: {
    de: "Die Profil-Dateien unter src/data/profiles sind noch leer. Sobald Import und Demo-Daten da sind, erscheinen sie hier.",
    en: "The profile files under src/data/profiles are still empty. Once the import and demo data are in place, they will show up here.",
  },
  emptyNoResultsTitle: { de: "Keine Treffer", en: "No results" },
  emptyManyFilters: {
    de: "Mehrere Filter greifen gleichzeitig. Lockere einen davon – meistens reicht es, Vertical oder Team-Rolle wegzulassen.",
    en: "Several filters apply at once. Loosen one of them – usually dropping the vertical or team role is enough.",
  },
  emptyOneFilter: { de: "Versuche einen anderen Suchbegriff oder setze den Filter zurück.", en: "Try a different search term or reset the filter." },
  keepQuery: { de: "Nur Suchbegriff behalten", en: "Keep search term only" },
  resetFilters: { de: "Alle Filter zurücksetzen", en: "Reset all filters" },
  listLabel: { de: "Kandidaten", en: "Candidates" },
  shownOf: { de: "{shown} von {total} angezeigt", en: "{shown} of {total} shown" },
  loadMore: { de: "Mehr laden ({count} weitere)", en: "Load more ({count} more)" },
} satisfies Dict;

/* ------------------------------------------------------------------ */
/* Lade-Zustände                                                       */
/* ------------------------------------------------------------------ */

function SkeletonCards({ count = SKELETON_COUNT }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <li key={`skeleton-${i}`} aria-hidden>
          <CandidateCardSkeleton />
        </li>
      ))}
    </>
  );
}

function CandidateListFallback() {
  const t = useT(DICT);
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-sm)]" aria-hidden>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="fr-skeleton h-10 rounded-[var(--radius)] lg:w-[22rem] xl:w-[26rem]" />
          <div className="hidden gap-2 md:flex">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="fr-skeleton h-9 w-28 rounded-[var(--radius)]" />
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[var(--border)] pt-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="fr-skeleton h-9 w-20 rounded-full" />
          ))}
        </div>
      </div>
      <p className="sr-only">{t("loadingSr")}</p>
      <ul className={GRID_CLASSES} aria-hidden>
        <SkeletonCards />
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toolbar-Zusätze: Trefferzahl + Sortierung                            */
/* ------------------------------------------------------------------ */

function ResultCount({ total, all }: { total: number; all: number }) {
  const [locale] = useLocale();
  const t = useT(DICT);
  return (
    <p className="text-xs tabular-nums text-[var(--muted)]" aria-live="polite">
      <span className="font-semibold text-[var(--foreground)]">{formatCount(total, locale)}</span> {t(total === 1 ? "resultOne" : "results")}
      {total !== all && <span className="hidden sm:inline"> {t("ofAll", { all: formatCount(all, locale) })}</span>}
    </p>
  );
}

function SortToggle({ value, scoreAvailable, onChange }: { value: SortKey; scoreAvailable: boolean; onChange: (next: SortKey) => void }) {
  const t = useT(DICT);
  const options: { key: SortKey; label: string; disabled?: boolean; title: string }[] = [
    {
      key: "score",
      label: t("sortScore"),
      disabled: !scoreAvailable,
      title: scoreAvailable ? t("sortScoreTitle") : t("sortScoreDisabled"),
    },
    { key: "name", label: t("sortName"), title: t("sortNameTitle") },
    { key: "source", label: t("sortSource"), title: t("sortSourceTitle") },
  ];
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
      <span className="hidden sm:inline">{t("sort")}</span>
      <div role="group" aria-label={t("sortGroup")} className="inline-flex h-8 items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            title={option.title}
            disabled={option.disabled}
            aria-pressed={value === option.key}
            onClick={() => onChange(option.key)}
            className={cx(
              "h-7 rounded-full px-3 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-40",
              value === option.key
                ? "bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-sm)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hinweis ohne Nutzer-Kontext                                          */
/* ------------------------------------------------------------------ */

function ContextHint({ onLoadDemo }: { onLoadDemo: () => void }) {
  const t = useT(DICT);
  const tc = useT(COMMON);
  return (
    <div
      role="note"
      className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface)]/60 px-4 py-2.5"
    >
      <p className="text-xs text-[var(--muted)] sm:text-sm">
        <span className="font-medium text-[var(--foreground)]">{t("hintTitle")}</span> {t("hintBody")}
      </p>
      <div className="flex flex-wrap gap-2">
        <LinkButton href="/onboarding" variant="ghost" size="sm">
          {t("createProfile")}
        </LinkButton>
        <Button type="button" size="sm" onClick={onLoadDemo}>
          {tc("loadDemo")}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Liste                                                               */
/* ------------------------------------------------------------------ */

function CandidateListInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlKey = searchParams.toString();
  const [locale] = useLocale();
  const t = useT(DICT);
  const tc = useT(COMMON);

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

  // Match-Gründe (Top-Grund auf der Karte) kommen aus rankCandidates in der aktiven Sprache.
  const matches = useMemo<Map<string, MatchResult> | null>(() => {
    if (!userContext) return null;
    return new Map(rankCandidates(userContext, allProfiles, { locale }).map((m) => [m.profileId, m] as const));
  }, [userContext, allProfiles, locale]);

  const [sortChoice, setSortChoice] = useState<SortKey | null>(null);
  // Score nur mit Kontext; ohne Wahl: Score wenn möglich, sonst Name.
  const sort: SortKey = sortChoice && (sortChoice !== "score" || matches) ? sortChoice : matches ? "score" : "name";

  // Filtern rechnet deferred: die alte Liste bleibt (gedimmt) stehen, statt zu flackern.
  const deferredFilters = useDeferredValue(state.filters);
  const isStale = deferredFilters !== state.filters;

  const results = useMemo(() => {
    const { source, ...gatewayFilters } = deferredFilters;
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
  }, [deferredFilters, sort, matches]);

  const [isLoadingMore, startLoadMore] = useTransition();
  const loadMore = () => startLoadMore(() => setState((s) => ({ ...s, visible: s.visible + PAGE_SIZE })));

  if (!ready) return <CandidateListFallback />;

  const visibleProfiles = results.slice(0, state.visible);
  const hasMore = state.visible < results.length;
  const total = results.length;
  const progress = total === 0 ? 0 : Math.round((visibleProfiles.length / total) * 100);
  const activeCount = countActiveFilters(state.filters);
  const canKeepQuery = Boolean(state.filters.query) && activeCount > 1;

  return (
    <div className="flex flex-col gap-4">
      {!userContext && <ContextHint onLoadDemo={loadDemo} />}

      {/* Sticky-Toolbar unter dem App-Header. Negative Ränder + Padding: gleiche Layouthöhe, aber
          beim Kleben deckt der Hintergrund den Streifen zwischen Header und Toolbar ab. */}
      <div className="z-20 md:sticky md:top-[var(--header-height)] md:-my-2 md:bg-[var(--background)]/95 md:py-2 md:backdrop-blur">
        <CandidateFilters
          filters={state.filters}
          onChange={setFilters}
          trailing={
            <>
              <ResultCount total={total} all={allProfiles.length} />
              <SortToggle value={sort} scoreAvailable={Boolean(matches)} onChange={setSortChoice} />
            </>
          }
        />
      </div>

      {total === 0 ? (
        allProfiles.length === 0 ? (
          <EmptyState icon={<span aria-hidden>◌</span>} title={t("emptyNoProfilesTitle")} body={t("emptyNoProfilesBody")} />
        ) : (
          <EmptyState
            icon={<span aria-hidden>⌕</span>}
            title={t("emptyNoResultsTitle")}
            body={activeCount > 1 ? t("emptyManyFilters") : t("emptyOneFilter")}
            action={
              <>
                {canKeepQuery && (
                  <Button type="button" variant="secondary" onClick={() => setFilters({ query: state.filters.query })}>
                    {t("keepQuery")}
                  </Button>
                )}
                <Button type="button" variant={canKeepQuery ? "ghost" : "secondary"} onClick={() => setFilters({})}>
                  {t("resetFilters")}
                </Button>
              </>
            }
          />
        )
      ) : (
        <>
          <ul
            className={cx(GRID_CLASSES, "transition-opacity duration-200", isStale && "opacity-60")}
            aria-label={t("listLabel")}
            aria-busy={isStale || isLoadingMore}
          >
            {visibleProfiles.map((profile) => (
              <li key={profile.id} className="min-w-0 fr-fade-in">
                <CandidateCard profile={profile} match={matches?.get(profile.id)} />
              </li>
            ))}
            {isLoadingMore && hasMore && <SkeletonCards count={Math.min(SKELETON_COUNT, total - visibleProfiles.length)} />}
          </ul>

          <div className="flex flex-col items-center gap-3 pt-4">
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-xs tabular-nums text-[var(--muted)]">
                {t("shownOf", { shown: formatCount(visibleProfiles.length, locale), total: formatCount(total, locale) })}
              </p>
              <div className="h-1 w-40 overflow-hidden rounded-full bg-[var(--surface-3)]" aria-hidden>
                <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
            {hasMore && (
              <Button type="button" variant="secondary" onClick={loadMore} disabled={isLoadingMore}>
                {isLoadingMore ? tc("loading") : t("loadMore", { count: formatCount(Math.min(PAGE_SIZE, total - visibleProfiles.length), locale) })}
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
