"use client";

import Link from "next/link";
import { useMemo } from "react";
import { getProfiles } from "@/lib/data";
import { MATCH_TIER_LABELS, matchTier, rankCandidates, type MatchTier } from "@/lib/matching";
import { useUserContext } from "@/lib/user-context";
import type { MatchResult, Profile } from "@/lib/types";
import { Avatar, Badge, Button, Card, EmptyState, LinkButton, Skeleton } from "@/components/ui";
import { NETWORK_ROLE_SINGULAR, SECTION_LINK_CLS } from "./shared";

const TOP_N = 5;

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
  const tier = matchTier(score);
  return (
    <span title={MATCH_TIER_LABELS[tier]} className="inline-flex">
      <Badge tone={TIER_TONE[tier]} className="tabular-nums">
        {Math.round(score)} % Match
      </Badge>
    </span>
  );
}

function MatchesSkeleton() {
  return (
    <ul className="divide-y divide-[var(--border)]" aria-busy="true" aria-label="Lade deine Top-Matches">
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
      Alle Kandidaten →
    </Link>
  );

  if (!ready) {
    return (
      <Card className="h-full" title="Deine Top-Matches" description="Lade deinen Kontext …" action={action}>
        <MatchesSkeleton />
      </Card>
    );
  }

  if (!userContext) {
    return (
      <Card
        className="h-full"
        title="Deine Top-Matches"
        description="Priorisiert nach Match-Score für dein Ziel"
        action={action}
      >
        <EmptyState
          icon="◉"
          title="Voya kennt dich noch nicht"
          body="Sag uns kurz, wer du bist und wen du suchst – dann priorisieren wir Co-Founder, Investor:innen, Mentor:innen und Talente aus IdeaLab 2026 für dich."
          action={
            <>
              <LinkButton href="/onboarding" size="sm">
                Onboarding starten
              </LinkButton>
              <LinkButton href="/assistant" size="sm" variant="secondary">
                Agent-Interview
              </LinkButton>
              <Button size="sm" variant="ghost" onClick={loadDemo}>
                Demo-Kontext laden
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
      title="Deine Top-Matches"
      description={`Top ${ranked.length || TOP_N} von ${total.toLocaleString("de-DE")} Profilen – priorisiert nach Match-Score`}
      action={action}
    >
      {ranked.length === 0 ? (
        <EmptyState
          icon="⌕"
          title="Noch keine Kandidaten gefunden"
          body="Ergänze deinen Kontext oder durchsuche alle Profile nach Rolle, Vertical und Event."
          action={
            <LinkButton href="/candidates" size="sm" variant="secondary">
              Alle Kandidaten
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
                    <Badge>{NETWORK_ROLE_SINGULAR[profile.networkRole]}</Badge>
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
                    Profil
                  </LinkButton>
                  <LinkButton href={`/outreach?profile=${encodeURIComponent(profile.id)}`} size="sm" variant="ghost">
                    Outreach
                  </LinkButton>
                  <LinkButton href={`/prep/${encodeURIComponent(profile.id)}`} size="sm" variant="ghost">
                    Prep
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
