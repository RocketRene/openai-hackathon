"use client";
/**
 * Shortlist-Vergleich: je gemerktes Profil eine Karten-Spalte (Avatar, Score-Pill mit Tier-Farbe,
 * Top-Grund/-Risiko, fünf Gründer-Dimensionen als Mini-Balken mit Best-Markierung, Verticals, „Sucht“, Events).
 * Ab drei Profilen liegen die Karten in einem horizontal scrollbaren Container – die Seite selbst scrollt nie seitwärts.
 * Daten nur über src/lib/data.ts; Match-Score über scoreMatch in der aktiven Sprache (ohne Nutzer-Kontext: Hinweis aufs Onboarding).
 */
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { formatVertical } from "@/components/candidates/CandidateCard";
import { Avatar, Badge, Button, Card, EmptyState, LinkButton, PageHeader, Skeleton, Stat, cx } from "@/components/ui";
import { getEvent, getProfile } from "@/lib/data";
import { COMMON, useLocale, useT, type Dict } from "@/lib/i18n";
import { matchTier, matchTierLabel, scoreMatch, type MatchTier } from "@/lib/matching";
import { useShortlist } from "@/lib/shortlist";
import { FOUNDER_DIM_KEYS, type FounderDimKey, type MatchResult, type Profile } from "@/lib/types";
import { useUserContext } from "@/lib/user-context";

const DICT: Dict = {
  kicker: { de: "Kandidat:innen", en: "Candidates" },
  title: { de: "Shortlist", en: "Shortlist" },
  subtitle: {
    de: "Deine gemerkten Kontakte nebeneinander – Match, Stärken und nächste Schritte auf einen Blick.",
    en: "Your saved contacts side by side – match, strengths and next steps at a glance.",
  },
  loading: { de: "Shortlist wird geladen …", en: "Loading shortlist …" },
  statCount: { de: "Gemerkte Kontakte", en: "Saved contacts" },
  hintScores: { de: "Match-Scores aus deinem Onboarding", en: "Match scores from your onboarding" },
  hintNoContext: { de: "Onboarding ausfüllen, um Match-Scores zu sehen →", en: "Complete onboarding to see match scores →" },
  statBest: { de: "Bester Match", en: "Best match" },
  toTeam: { de: "Ins Team-Radar", en: "To Team Radar" },
  clearAll: { de: "Alle entfernen", en: "Remove all" },
  emptyTitle: { de: "Noch nichts gemerkt", en: "Nothing saved yet" },
  emptyBody: {
    de: "Markiere Kandidat:innen mit ☆ „Merken“, um sie hier nebeneinander zu vergleichen.",
    en: "Mark candidates with ☆ “Save” to compare them side by side here.",
  },
  staleTitle: { de: "Gemerkte Profile nicht mehr vorhanden", en: "Saved profiles no longer exist" },
  staleBody: { de: "Die gespeicherten Einträge passen zu keinem Profil mehr.", en: "The saved entries no longer match any profile." },
  discover: { de: "Kandidat:innen entdecken", en: "Discover candidates" },
  clearShortlist: { de: "Shortlist leeren", en: "Clear shortlist" },
  removeOne: { de: "{name} von der Shortlist entfernen", en: "Remove {name} from shortlist" },
  scrollHint: { de: "Seitwärts wischen, um alle Profile zu sehen", en: "Swipe sideways to see all profiles" },
  score: { de: "Match-Score", en: "Match score" },
  noScore: { de: "Score nach dem Onboarding", en: "Score after onboarding" },
  bestMarker: { de: "Bester Match", en: "Best match" },
  bestValue: { de: "Höchster Wert im Vergleich", en: "Highest value in this comparison" },
  topReason: { de: "Top-Grund", en: "Top reason" },
  topRisk: { de: "Top-Risiko", en: "Top risk" },
  complementarity: { de: "Komplementarität", en: "Complementarity" },
  dims: { de: "Gründer-Profil", en: "Founder profile" },
  dim_vision: { de: "Vision", en: "Vision" },
  dim_design: { de: "Design / Visuell", en: "Design / Visual" },
  dim_tech: { de: "Technik", en: "Tech" },
  dim_detail: { de: "Detail", en: "Detail" },
  dim_execution: { de: "Umsetzung", en: "Execution" },
  pers_visionary: { de: "Visionär:in", en: "Visionary" },
  pers_builder: { de: "Builder", en: "Builder" },
  pers_operator: { de: "Operator", en: "Operator" },
  pers_connector: { de: "Connector", en: "Connector" },
  pers_analyst: { de: "Analyst:in", en: "Analyst" },
  verticals: { de: "Verticals", en: "Verticals" },
  lookingFor: { de: "Sucht", en: "Looking for" },
  events: { de: "Events", en: "Events" },
  profile: { de: "Profil", en: "Profile" },
  prep: { de: "Prep", en: "Prep" },
};

type Translate = ReturnType<typeof useT<Dict>>;

const TIER_STYLE: Record<MatchTier, string> = {
  top: "bg-[var(--success-soft)] text-[var(--success)]",
  gut: "bg-[var(--accent-soft)] text-[var(--accent)]",
  möglich: "bg-[var(--warning-soft)] text-[var(--warning)]",
  schwach: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/* ------------------------------------------------------------------ */
/* Kleine Bausteine                                                    */
/* ------------------------------------------------------------------ */

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{children}</p>;
}

function Dash() {
  return <span className="text-sm text-[var(--muted)]">–</span>;
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8L12 3.5z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/** Mini-Balken für eine Dimension; `best` markiert den höchsten Wert im Vergleich. */
function DimBar({
  label,
  value,
  max = 10,
  suffix = "",
  best,
  bestTitle,
}: {
  label: string;
  value: number;
  max?: number;
  suffix?: string;
  best: boolean;
  bestTitle: string;
}) {
  const pct = Math.round((Math.max(0, Math.min(max, value)) / max) * 100);
  return (
    <div title={best ? bestTitle : undefined}>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className={cx(best ? "font-medium text-[var(--foreground)]" : "text-[var(--muted)]")}>{label}</span>
        <span className={cx("inline-flex items-center gap-1 tabular-nums", best ? "font-semibold text-[var(--accent)]" : "text-[var(--muted)]")}>
          {best && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />}
          {value}
          {suffix}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
        <div
          className={cx("h-full rounded-full transition-[width] duration-300", best ? "bg-[var(--accent)]" : "bg-[var(--muted)]/45")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ScoreBlock({
  match,
  best,
  compare,
  bestComp,
  t,
}: {
  match: MatchResult | undefined;
  best: boolean;
  compare: boolean;
  bestComp: number;
  t: Translate;
}) {
  const [locale] = useLocale();
  if (!match) {
    return (
      <div>
        <SectionLabel>{t("score")}</SectionLabel>
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          {t("noScore")} →
        </Link>
      </div>
    );
  }

  const tier = matchTier(match.score);
  const reason = match.reasons[0];
  const risk = match.risks[0];

  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <SectionLabel>{t("score")}</SectionLabel>
        {best && (
          <Badge tone="accent" className="-mt-0.5 shrink-0">
            ★ {t("bestMarker")}
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cx("inline-flex items-baseline gap-1 rounded-full px-3 py-1", TIER_STYLE[tier])}>
          <span className="text-xl font-semibold leading-none tabular-nums">{match.score}</span>
          <span className="text-[11px] font-medium opacity-70">/100</span>
        </span>
        <span className="text-xs font-medium text-[var(--foreground)]">{matchTierLabel(tier, locale)}</span>
      </div>

      <ul className="mt-3 space-y-1.5 text-xs">
        {reason && (
          <li className="flex gap-2" title={reason.detail}>
            <span
              aria-hidden
              className="mt-px inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--success-soft)] text-[10px] font-bold text-[var(--success)]"
            >
              +
            </span>
            <span className="line-clamp-2 text-[var(--foreground)]">
              <span className="sr-only">{t("topReason")}: </span>
              {reason.label}
            </span>
          </li>
        )}
        {risk && (
          <li className="flex gap-2">
            <span
              aria-hidden
              className="mt-px inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--warning-soft)] text-[10px] font-bold text-[var(--warning)]"
            >
              !
            </span>
            <span className="line-clamp-2 text-[var(--muted)]">
              <span className="sr-only">{t("topRisk")}: </span>
              {risk}
            </span>
          </li>
        )}
      </ul>

      <div className="mt-3">
        <DimBar
          label={t("complementarity")}
          value={match.complementarity}
          max={100}
          suffix="%"
          best={compare && match.complementarity === bestComp}
          bestTitle={t("bestValue")}
        />
      </div>
    </div>
  );
}

function ProfileCard({
  profile: p,
  match,
  compare,
  bestScore,
  bestComp,
  maxDims,
  onRemove,
  t,
  tc,
}: {
  profile: Profile;
  match: MatchResult | undefined;
  compare: boolean;
  bestScore: number;
  bestComp: number;
  maxDims: Record<FounderDimKey, number>;
  onRemove: () => void;
  t: Translate;
  tc: Translate;
}) {
  const href = `/candidates/${encodeURIComponent(p.id)}`;
  const isBest = compare && match !== undefined && match.score === bestScore;

  return (
    <Card
      padding="none"
      className={cx(
        "fr-fade-in flex h-full flex-col overflow-hidden transition hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-md)]",
        isBest && "border-[var(--accent)]/50",
      )}
    >
      {/* Kopf: Avatar, Name, Headline, Badges */}
      <div className="relative p-5 pb-4">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onRemove}
          aria-label={t("removeOne", { name: p.name })}
          title={t("removeOne", { name: p.name })}
          className="absolute right-3 top-3 h-8 w-8 p-0 text-[var(--muted)] hover:text-[var(--danger)]"
        >
          <CloseIcon />
        </Button>

        <Link href={href} prefetch={false} className="group inline-flex">
          <Avatar src={p.photoUrl} name={p.name} size={64} className="transition group-hover:ring-[var(--accent)]/40" />
        </Link>
        <div className="mt-3 pr-8">
          <Link href={href} prefetch={false} className="block truncate text-base font-semibold tracking-tight text-[var(--foreground)] hover:text-[var(--accent)]" title={p.name}>
            {p.name}
          </Link>
          <p className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-[var(--muted)]">{p.headline}</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone="accent">{tc(p.networkRole)}</Badge>
          {p.founderRole && <Badge>{tc(p.founderRole)}</Badge>}
          <Badge>{t(`pers_${p.personality.type}`)}</Badge>
        </div>
      </div>

      {/* Score */}
      <div className="border-t border-[var(--border)] px-5 py-4">
        <ScoreBlock match={match} best={isBest} compare={compare} bestComp={bestComp} t={t} />
      </div>

      {/* Fünf Dimensionen */}
      <div className="border-t border-[var(--border)] px-5 py-4">
        <SectionLabel>{t("dims")}</SectionLabel>
        <div className="space-y-2.5">
          {FOUNDER_DIM_KEYS.map((key) => (
            <DimBar
              key={key}
              label={t(`dim_${key}`)}
              value={p.dims[key]}
              best={compare && p.dims[key] > 0 && p.dims[key] === maxDims[key]}
              bestTitle={t("bestValue")}
            />
          ))}
        </div>
      </div>

      {/* Verticals & Sucht */}
      <div className="space-y-4 border-t border-[var(--border)] px-5 py-4">
        <div>
          <SectionLabel>{t("verticals")}</SectionLabel>
          {p.verticals.length === 0 ? (
            <Dash />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {p.verticals.map((v) => (
                <Badge key={v} tone="accent">
                  {formatVertical(v)}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div>
          <SectionLabel>{t("lookingFor")}</SectionLabel>
          {p.lookingFor.length === 0 ? (
            <Dash />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {p.lookingFor.map((item) => (
                <Badge key={item}>{sentenceCase(item)}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Events */}
      <div className="border-t border-[var(--border)] px-5 py-4">
        <SectionLabel>{t("events")}</SectionLabel>
        {p.events.length === 0 ? (
          <Dash />
        ) : (
          <ul className="space-y-1 text-xs">
            {p.events.map((slug) => (
              <li key={slug}>
                <Link href={`/events/${slug}`} className="inline-flex items-center gap-2 text-[var(--foreground)] transition hover:text-[var(--accent)]">
                  <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  <span className="truncate">{getEvent(slug)?.name ?? slug}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Aktionen */}
      <div className="mt-auto flex flex-wrap gap-1.5 border-t border-[var(--border)] bg-[var(--surface-2)] px-5 py-3">
        <LinkButton href={href} size="sm" variant="secondary">
          {t("profile")}
        </LinkButton>
        <LinkButton href={`/outreach?profile=${encodeURIComponent(p.id)}`} size="sm" variant="secondary">
          {tc("outreach")}
        </LinkButton>
        <LinkButton href={`/prep/${encodeURIComponent(p.id)}`} size="sm" variant="secondary">
          {t("prep")}
        </LinkButton>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Seitenkopf (Client, weil PageHeader nur Strings nimmt und die Sprache ein Hook ist) */
/* ------------------------------------------------------------------ */

export function ShortlistHeader() {
  const t = useT(DICT);
  return <PageHeader kicker={t("kicker")} title={t("title")} subtitle={t("subtitle")} />;
}

/* ------------------------------------------------------------------ */
/* Hauptkomponente                                                     */
/* ------------------------------------------------------------------ */

export function ShortlistCompare() {
  const { ids, ready, remove, clear } = useShortlist();
  const { userContext } = useUserContext();
  const [locale] = useLocale();
  const t = useT(DICT);
  const tc = useT(COMMON);

  // Unbekannte IDs (gelöschte/umbenannte Profile) werden still ignoriert.
  const profiles = useMemo(() => ids.map((id) => getProfile(id)).filter((p): p is Profile => Boolean(p)), [ids]);

  const scores = useMemo(() => {
    const map = new Map<string, MatchResult>();
    if (!userContext) return map;
    for (const p of profiles) map.set(p.id, scoreMatch(userContext, p, { locale }));
    return map;
  }, [profiles, userContext, locale]);

  const bestScore = useMemo(() => Math.max(-1, ...Array.from(scores.values(), (s) => s.score)), [scores]);
  const bestComp = useMemo(() => Math.max(-1, ...Array.from(scores.values(), (s) => s.complementarity)), [scores]);
  const bestProfile = useMemo(() => profiles.find((p) => scores.get(p.id)?.score === bestScore), [profiles, scores, bestScore]);
  const maxDims = useMemo(() => {
    const out = {} as Record<FounderDimKey, number>;
    for (const key of FOUNDER_DIM_KEYS) out[key] = Math.max(0, ...profiles.map((p) => p.dims[key]));
    return out;
  }, [profiles]);

  const compare = profiles.length > 1;
  const scrollable = profiles.length >= 3;

  if (!ready) {
    return (
      <div aria-busy="true" aria-label={t("loading")}>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <Skeleton className="h-[92px] w-44 rounded-[var(--radius-lg)]" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-36 rounded-[var(--radius)]" />
            <Skeleton className="h-10 w-28 rounded-[var(--radius)]" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-96 rounded-[var(--radius-lg)]" />
          <Skeleton className="h-96 rounded-[var(--radius-lg)]" />
        </div>
      </div>
    );
  }

  if (profiles.length === 0) {
    // IDs vorhanden, aber kein Profil mehr dazu (Datenstand geändert) → aufräumen anbieten.
    const stale = ids.length > 0;
    return (
      <EmptyState
        icon={<StarIcon />}
        title={t(stale ? "staleTitle" : "emptyTitle")}
        body={t(stale ? "staleBody" : "emptyBody")}
        action={
          <>
            <LinkButton href="/candidates">{t("discover")}</LinkButton>
            {stale && (
              <Button type="button" variant="ghost" onClick={clear}>
                {t("clearShortlist")}
              </Button>
            )}
          </>
        }
      />
    );
  }

  const cards = profiles.map((p) => (
    <ProfileCard
      key={p.id}
      profile={p}
      match={scores.get(p.id)}
      compare={compare}
      bestScore={bestScore}
      bestComp={bestComp}
      maxDims={maxDims}
      onRemove={() => remove(p.id)}
      t={t}
      tc={tc}
    />
  ));

  return (
    <div>
      {/* Kopf: Stat(s) + Aktionen */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <Stat
            label={t("statCount")}
            value={profiles.length}
            hint={userContext ? t("hintScores") : t("hintNoContext")}
            href={userContext ? undefined : "/onboarding"}
            className="min-w-44"
          />
          {bestProfile && scores.size > 0 && (
            <Stat
              label={t("statBest")}
              value={
                <span className="inline-flex items-baseline gap-1">
                  <span className="tabular-nums">{bestScore}</span>
                  <span className="text-sm font-medium text-[var(--muted)]">/100</span>
                </span>
              }
              hint={bestProfile.name}
              href={`/candidates/${encodeURIComponent(bestProfile.id)}`}
              className="min-w-44"
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LinkButton href="/team">{t("toTeam")}</LinkButton>
          <Button type="button" variant="ghost" onClick={clear}>
            {t("clearAll")}
          </Button>
        </div>
      </div>

      {scrollable ? (
        <>
          <p className="mb-2 text-xs text-[var(--muted)] sm:hidden">{t("scrollHint")}</p>
          <div className="fr-scroll flex snap-x gap-4 overflow-x-auto pb-4 pt-1">
            {cards.map((card, i) => (
              <div key={profiles[i].id} className="w-[300px] shrink-0 snap-start sm:w-[320px]">
                {card}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">{cards}</div>
      )}
    </div>
  );
}

export default ShortlistCompare;
