"use client";
/**
 * Top-Matches für die Nutzer:in: 3–6 Karten mit Foto, Score, einem Match-Grund als Satz.
 * Ohne Kontext: kurzer Hinweis + Demo-Button, nie eine leere Fläche.
 */
import Link from "next/link";
import { useMemo } from "react";
import { getProfiles } from "@/lib/data";
import { rankCandidates } from "@/lib/matching";
import { useUserContext } from "@/lib/user-context";
import type { MatchResult, Profile } from "@/lib/types";
import { Avatar, Badge, Button, EmptyState, LinkButton, SectionTitle, Skeleton, cx } from "@/components/ui";
import { FOUNDER_ROLE_LABELS, NETWORK_ROLE_LABELS } from "@/components/candidates/CandidateCard";

const TOP_N = 6;

interface RankedProfile {
  match: MatchResult;
  profile: Profile;
}

function scoreTone(score: number): "success" | "accent" | "neutral" {
  if (score >= 70) return "success";
  if (score >= 45) return "accent";
  return "neutral";
}

const scoreClasses: Record<ReturnType<typeof scoreTone>, string> = {
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  accent: "bg-[var(--accent-soft)] text-[var(--accent)]",
  neutral: "bg-[var(--surface-2)] text-[var(--muted)]",
};

function MatchCard({ match, profile, rank }: RankedProfile & { rank: number }) {
  const reason = match.reasons[0];
  const tone = scoreTone(match.score);
  return (
    <li className="min-w-0">
      <Link
        href={`/candidates/${encodeURIComponent(profile.id)}`}
        prefetch={false}
        className="group flex h-full flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:border-[var(--accent)]/50 hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        <div className="flex items-start gap-3">
          <Avatar src={profile.photoUrl || undefined} name={profile.name} size={48} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)]">
              {profile.name}
            </p>
            <p className="line-clamp-2 text-xs leading-snug text-[var(--muted)]">{profile.headline}</p>
          </div>
          <div
            className={cx("flex shrink-0 flex-col items-center rounded-[var(--radius-sm)] px-2 py-1", scoreClasses[tone])}
            title={`Match-Score ${match.score} von 100`}
          >
            <span className="text-lg font-semibold leading-none tabular-nums">{Math.round(match.score)}</span>
            <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">Match</span>
          </div>
        </div>

        {reason ? (
          <p className="text-sm leading-snug text-[var(--foreground)]">{reason.detail}</p>
        ) : (
          <p className="text-sm text-[var(--muted)]">Noch keine konkreten Anknüpfungspunkte.</p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          <span className="mr-auto text-[11px] tabular-nums text-[var(--muted)]">#{rank}</span>
          <Badge tone="accent">{NETWORK_ROLE_LABELS[profile.networkRole]}</Badge>
          {profile.founderRole && <Badge>{FOUNDER_ROLE_LABELS[profile.founderRole]}</Badge>}
        </div>
      </Link>
    </li>
  );
}

export default function TopMatches() {
  const { userContext, ready, loadDemo } = useUserContext();

  const matches = useMemo<RankedProfile[]>(() => {
    if (!userContext) return [];
    const profiles = getProfiles();
    const byId = new Map(profiles.map((p) => [p.id, p]));
    return rankCandidates(userContext, profiles)
      .slice(0, TOP_N)
      .flatMap((match) => {
        const profile = byId.get(match.profileId);
        return profile ? [{ match, profile }] : [];
      });
  }, [userContext]);

  return (
    <section aria-labelledby="top-matches">
      <SectionTitle
        action={
          <Link href="/candidates" className="text-sm font-medium text-[var(--accent)] hover:underline">
            Alle Kandidaten →
          </Link>
        }
      >
        <span id="top-matches">Deine Top-Matches</span>
      </SectionTitle>

      {!ready ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
              <Skeleton className="mt-4 h-3 w-5/6" />
            </li>
          ))}
        </ul>
      ) : !userContext ? (
        <EmptyState
          title="Voya kennt dich noch nicht"
          body="Sobald du deinen Kontext gibst, erscheinen hier die Menschen, die dich am besten ergänzen – aus IdeaLab 2026 und weiteren Events."
          action={
            <>
              <LinkButton href="/assistant">Agent-Interview starten</LinkButton>
              <Button variant="secondary" onClick={loadDemo}>
                Demo-Kontext laden
              </Button>
            </>
          }
        />
      ) : matches.length === 0 ? (
        <EmptyState
          title="Noch keine Kandidaten gefunden"
          body="Erweitere im Profil, wen du suchst, oder wähle weitere Verticals."
          action={<LinkButton href="/onboarding" variant="secondary">Profil bearbeiten</LinkButton>}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Top-Matches">
          {matches.map((item, index) => (
            <MatchCard key={item.profile.id} {...item} rank={index + 1} />
          ))}
        </ul>
      )}
    </section>
  );
}
