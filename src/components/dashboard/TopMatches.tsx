"use client";

import Link from "next/link";
import { useMemo } from "react";
import { getProfiles } from "@/lib/data";
import { COMMON, useLocale, useT, type Dict } from "@/lib/i18n";
import { MATCH_TIER_LABELS, matchTier, rankCandidates, type MatchTier } from "@/lib/matching";
import { useUserContext } from "@/lib/user-context";
import type { MatchResult, Profile } from "@/lib/types";
import { Avatar, Badge, Button, Card, EmptyState, LinkButton, Skeleton } from "@/components/ui";
import { SECTION_LINK_CLS, type Bi } from "./shared";

const TOP_N = 5;

const DICT = {
  title: { de: "Deine Top-Matches", en: "Your top matches" },
  allCandidatesLink: { de: "Alle Kandidaten →", en: "All candidates →" },
  allCandidates: { de: "Alle Kandidaten", en: "All candidates" },
  loadingContext: { de: "Lade deinen Kontext …", en: "Loading your context …" },
  loadingMatches: { de: "Lade deine Top-Matches", en: "Loading your top matches" },
  rankedForGoal: { de: "Priorisiert nach Match-Score für dein Ziel", en: "Ranked by match score for your goal" },
  topOf: {
    de: "Top {n} von {total} Profilen – priorisiert nach Match-Score",
    en: "Top {n} of {total} profiles – ranked by match score",
  },
  unknownTitle: { de: "Voya kennt dich noch nicht", en: "Voya doesn't know you yet" },
  unknownBody: {
    de: "Sag uns kurz, wer du bist und wen du suchst – dann priorisieren wir Co-Founder, Investor:innen, Mentor:innen und Talente aus IdeaLab 2026 für dich.",
    en: "Tell us briefly who you are and who you're looking for – we'll then rank co-founders, investors, mentors and talent from IdeaLab 2026 for you.",
  },
  startOnboarding: { de: "Onboarding starten", en: "Start onboarding" },
  agentInterview: { de: "Agent-Interview", en: "Agent interview" },
  noneTitle: { de: "Noch keine Kandidaten gefunden", en: "No candidates found yet" },
  noneBody: {
    de: "Ergänze deinen Kontext oder durchsuche alle Profile nach Rolle, Vertical und Event.",
    en: "Add to your context or browse all profiles by role, vertical and event.",
  },
  match: { de: "{score} % Match", en: "{score} % match" },
  profile: { de: "Profil", en: "Profile" },
  prep: { de: "Prep", en: "Prep" },
} satisfies Dict;

/** Tooltip der Score-Pille: Deutsch aus `MATCH_TIER_LABELS`, Englisch lokal. */
const TIER_LABELS: Record<MatchTier, Bi> = {
  top: { de: MATCH_TIER_LABELS.top, en: "Top match" },
  gut: { de: MATCH_TIER_LABELS.gut, en: "Good match" },
  möglich: { de: MATCH_TIER_LABELS.möglich, en: "Possible match" },
  schwach: { de: MATCH_TIER_LABELS.schwach, en: "Weak match" },
};

interface RankedProfile {
  match: MatchResult;
  profile: Profile;
}

const TIER_TONE: Record<MatchTier, "success" | "accent" | "neutral"> = {
  top: "success",
  gut: "accent",
  möglich: "neutral",
  schwach: "neutral",
};

function ScorePill({ score }: { score: number }) {
  const t = useT(DICT);
  const tTier = useT(TIER_LABELS);
  const tier = matchTier(score);
  return (
    <span title={tTier(tier)} className="inline-flex">
      <Badge tone={TIER_TONE[tier]} className="tabular-nums">
        {t("match", { score: Math.round(score) })}
      </Badge>
    </span>
  );
}

function MatchesSkeleton() {
  const t = useT(DICT);
  return (
    <ul className="divide-y divide-[var(--border)]" aria-busy="true" aria-label={t("loadingMatches")}>
      {Array.from({ length: TOP_N }, (_, i) => (
        <li key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
            <Skeleton className="h-full w-full" />
          </div>
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="hidden h-8 w-44 sm:block" />
        </li>
      ))}
    </ul>
  );
}

/** Top-Matches für die eingeloggte Nutzer:in – ohne Kontext ein Einstiegs-Teaser. */
export default function TopMatches() {
  const { userContext, ready, loadDemo } = useUserContext();
  const [locale] = useLocale();
  const t = useT(DICT);
  const tc = useT(COMMON);

  const { ranked, total } = useMemo(() => {
    const profiles = getProfiles();
    if (!userContext) return { ranked: [] as RankedProfile[], total: profiles.length };
    const byId = new Map(profiles.map((p) => [p.id, p]));
    const ranked = rankCandidates(userContext, profiles)
      .slice(0, TOP_N)
      .flatMap((match) => {
        const profile = byId.get(match.profileId);
        return profile ? [{ match, profile }] : [];
      });
    return { ranked, total: profiles.length };
  }, [userContext]);

  const action = (
    <Link href="/candidates" className={SECTION_LINK_CLS}>
      {t("allCandidatesLink")}
    </Link>
  );

  if (!ready) {
    return (
      <Card className="h-full" title={t("title")} description={t("loadingContext")} action={action}>
        <MatchesSkeleton />
      </Card>
    );
  }

  if (!userContext) {
    return (
      <Card className="h-full" title={t("title")} description={t("rankedForGoal")} action={action}>
        <EmptyState
          icon="◉"
          title={t("unknownTitle")}
          body={t("unknownBody")}
          action={
            <>
              <LinkButton href="/onboarding" size="sm">
                {t("startOnboarding")}
              </LinkButton>
              <LinkButton href="/assistant" size="sm" variant="secondary">
                {t("agentInterview")}
              </LinkButton>
              <Button size="sm" variant="ghost" onClick={loadDemo}>
                {tc("loadDemo")}
              </Button>
            </>
          }
        />
      </Card>
    );
  }

  return (
    <Card
      className="h-full"
      title={t("title")}
      description={t("topOf", { n: ranked.length || TOP_N, total: total.toLocaleString(locale === "en" ? "en-US" : "de-DE") })}
      action={action}
    >
      {ranked.length === 0 ? (
        <EmptyState
          icon="⌕"
          title={t("noneTitle")}
          body={t("noneBody")}
          action={
            <LinkButton href="/candidates" size="sm" variant="secondary">
              {t("allCandidates")}
            </LinkButton>
          }
        />
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {ranked.map(({ match, profile }, index) => {
            const topReason = match.reasons[0];
            const profileHref = `/candidates/${encodeURIComponent(profile.id)}`;
            return (
              <li
                key={profile.id}
                className="grid grid-cols-[auto_1fr] items-start gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[auto_auto_1fr_auto] sm:items-center"
              >
                <span className="hidden w-4 text-xs tabular-nums text-[var(--muted)] sm:block" aria-hidden>
                  {index + 1}
                </span>
                <Avatar src={profile.photoUrl} name={profile.name} size={40} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link
                      href={profileHref}
                      className="truncate text-sm font-semibold text-[var(--foreground)] hover:underline"
                    >
                      {profile.name}
                    </Link>
                    <ScorePill score={match.score} />
                    <Badge>{tc(profile.networkRole)}</Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{profile.headline}</p>
                  {topReason && (
                    <p className="mt-1 truncate text-xs text-[var(--foreground)]">
                      <span className="font-medium text-[var(--accent)]">{topReason.label}</span>
                      <span className="text-[var(--muted)]"> · </span>
                      {topReason.detail}
                    </p>
                  )}
                </div>
                <div className="col-start-2 flex flex-wrap gap-1.5 sm:col-start-4 sm:row-start-1 sm:flex-nowrap">
                  <LinkButton href={profileHref} size="sm" variant="secondary">
                    {t("profile")}
                  </LinkButton>
                  <LinkButton href={`/outreach?profile=${encodeURIComponent(profile.id)}`} size="sm" variant="ghost">
                    {tc("outreach")}
                  </LinkButton>
                  <LinkButton href={`/prep/${encodeURIComponent(profile.id)}`} size="sm" variant="ghost">
                    {t("prep")}
                  </LinkButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
