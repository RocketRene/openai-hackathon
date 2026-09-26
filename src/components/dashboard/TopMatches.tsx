"use client";

import Link from "next/link";
import { useMemo } from "react";
import { getProfiles } from "@/lib/data";
import { rankCandidates } from "@/lib/matching";
import { useUserContext } from "@/lib/user-context";
import type { FounderRole, MatchResult, NetworkRole, Profile } from "@/lib/types";
import { Avatar, Badge, Button, Card, LinkButton } from "@/components/ui";

const TOP_N = 5;

const FOUNDER_ROLE_LABELS: Record<FounderRole, string> = {
  tech: "Tech-Founder",
  commercial: "Commercial-Founder",
  product: "Product-Founder",
  design: "Design-Founder",
  operations: "Operations-Founder",
  "domain-expert": "Domain-Expert:in",
};

const FOUNDER_ROLE_SHORT: Record<FounderRole, string> = {
  tech: "Tech",
  commercial: "Commercial",
  product: "Product",
  design: "Design",
  operations: "Operations",
  "domain-expert": "Domain-Expertise",
};

const NETWORK_ROLE_LABELS: Record<NetworkRole, string> = {
  cofounder: "Co-Founder",
  investor: "Investor:innen",
  mentor: "Mentor:innen",
  talent: "Talente",
  expert: "Expert:innen",
};

interface RankedProfile {
  match: MatchResult;
  profile: Profile;
}

function joinDe(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} und ${items[items.length - 1]}`;
}

function scoreTone(score: number): "success" | "accent" | "neutral" {
  if (score >= 70) return "success";
  if (score >= 45) return "accent";
  return "neutral";
}

const rowLinkCls =
  "rounded-md border border-[var(--border)] px-2 py-1 text-xs font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-2)]";

/** Top-Matches für die eingeloggte Nutzer:in – ohne Kontext ein Einstiegs-Teaser. */
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

  if (!ready) {
    return (
      <Card title="Deine Top-Matches">
        <p className="text-sm text-[var(--muted)]">Lade deinen Kontext …</p>
      </Card>
    );
  }

  if (!userContext) {
    return (
      <Card title="Deine Top-Matches">
        <p className="text-sm text-[var(--muted)]">
          FounderRadar kennt dich noch nicht. Sag uns kurz, wer du bist und wen du suchst – dann priorisieren wir
          die Kontakte aus IdeaLab 2026 und weiteren Events für dich: Co-Founder, Investor:innen, Mentor:innen oder
          Talente.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <LinkButton href="/onboarding">Onboarding starten</LinkButton>
          <LinkButton href="/assistant" variant="secondary">
            Agent-Interview
          </LinkButton>
          <Button variant="ghost" onClick={loadDemo}>
            Demo-Kontext laden
          </Button>
        </div>
      </Card>
    );
  }

  const greetingName = userContext.name.trim() || "Founder";
  const roleLabel = userContext.founderRole ? FOUNDER_ROLE_LABELS[userContext.founderRole] : "Gründer:in";
  const lookingFor = joinDe(userContext.lookingFor.map((r) => NETWORK_ROLE_LABELS[r])) || "passende Kontakte";
  const missingRoles = userContext.lookingForRoles.map((r) => FOUNDER_ROLE_SHORT[r]);

  return (
    <Card
      title="Deine Top-Matches"
      action={
        <div className="flex items-center gap-3 text-sm">
          <Link href="/onboarding" className="text-[var(--muted)] hover:underline">
            Kontext bearbeiten
          </Link>
          <Link href="/candidates" className="font-medium text-[var(--accent)] hover:underline">
            Alle Kandidaten →
          </Link>
        </div>
      }
    >
      <p className="text-sm text-[var(--muted)]">
        Hi {greetingName}, du bist {roleLabel} und suchst {lookingFor}
        {missingRoles.length > 0 ? ` – vor allem mit Fokus auf ${joinDe(missingRoles)}` : ""}.
      </p>

      {matches.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">Noch keine Kandidaten gefunden.</p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--border)]">
          {matches.map(({ match, profile }, index) => {
            const topReason = match.reasons[0];
            return (
              <li key={profile.id} className="flex items-center gap-3 py-3">
                <span className="w-4 shrink-0 text-xs tabular-nums text-[var(--muted)]">{index + 1}</span>
                <Avatar src={profile.photoUrl} name={profile.name} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/candidates/${profile.id}`}
                      className="truncate text-sm font-medium text-[var(--foreground)] hover:underline"
                    >
                      {profile.name}
                    </Link>
                    <Badge tone={scoreTone(match.score)}>{Math.round(match.score)} % Match</Badge>
                    <Badge>{NETWORK_ROLE_LABELS[profile.networkRole]}</Badge>
                  </div>
                  <div className="truncate text-xs text-[var(--muted)]">{profile.headline}</div>
                  {topReason && (
                    <div className="truncate text-xs text-[var(--foreground)]">
                      <span className="font-medium">{topReason.label}:</span> {topReason.detail}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Link href={`/candidates/${profile.id}`} className={rowLinkCls}>
                    Profil
                  </Link>
                  <Link href={`/outreach?profile=${encodeURIComponent(profile.id)}`} className={rowLinkCls}>
                    Outreach
                  </Link>
                  <Link href={`/prep/${profile.id}`} className={rowLinkCls}>
                    Prep
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
