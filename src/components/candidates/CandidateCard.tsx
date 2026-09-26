"use client";
/**
 * Kandidaten-Karte für Listen und Grids (Kandidatenliste, Shortlist, Dashboard …).
 * Reine Darstellung – bekommt Profil (+ optional Match) und rendert.
 *
 * Exportiert außerdem die Label-Maps und Quelle-Helfer, die Liste und Filter teilen.
 * Sie liegen hier statt in src/lib/types.ts, weil das ein Shared Contract ist.
 */
import Link from "next/link";
import { useState } from "react";
import { getEvents } from "@/lib/data";
import { PERSONALITY_LABELS, type FounderRole, type MatchResult, type NetworkRole, type Profile } from "@/lib/types";
import { Badge, ScoreBar, cx } from "@/components/ui";

export const NETWORK_ROLE_LABELS: Record<NetworkRole, string> = {
  cofounder: "Co-Founder",
  investor: "Investor",
  mentor: "Mentor",
  talent: "Talent",
  expert: "Expert:in",
};

export const FOUNDER_ROLE_LABELS: Record<FounderRole, string> = {
  tech: "Tech",
  commercial: "Commercial",
  product: "Produkt",
  design: "Design",
  operations: "Operations",
  "domain-expert": "Domain-Expert:in",
};

/** Herkunft eines Profils, gruppiert für Quelle-Filter und Quelle-Badge. */
export type ProfileSource = "idealab" | "demo" | "manual";

export const SOURCE_LABELS: Record<ProfileSource, string> = {
  idealab: "IdeaLab 2026",
  demo: "Demo",
  manual: "Manuell",
};

/** linkedin/conference = echte IdeaLab-Daten, mock = Demo-Daten. */
export function getProfileSource(profile: Profile): ProfileSource | undefined {
  switch (profile.source?.type) {
    case "linkedin":
    case "conference":
      return "idealab";
    case "mock":
      return "demo";
    case "manual":
      return "manual";
    default:
      return undefined;
  }
}

const VERTICAL_DISPLAY: Record<string, string> = {
  ai: "AI",
  "b2b saas": "B2B SaaS",
  "hr tech": "HR Tech",
  fintech: "FinTech",
  healthtech: "HealthTech",
  edtech: "EdTech",
  proptech: "PropTech",
  deeptech: "DeepTech",
  legaltech: "LegalTech",
  biotech: "BioTech",
  ecommerce: "E-Commerce",
};

/** "b2b saas" → "B2B SaaS", "climate" → "Climate". Vokabular ist kleingeschrieben (PARALLEL-WORK.md). */
export function formatVertical(vertical: string): string {
  const key = vertical.trim().toLowerCase();
  return VERTICAL_DISPLAY[key] ?? key.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const EVENT_NAMES = new Map(getEvents().map((e) => [e.slug, e.name] as const));

function eventName(slug: string): string {
  return EVENT_NAMES.get(slug) ?? slug;
}

function CandidateAvatar({ src, name, size = 48 }: { src?: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!src || failed) {
    return (
      <div
        aria-hidden
        className="flex shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]"
        style={{ width: size, height: size }}
      >
        {initials || "?"}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className="shrink-0 rounded-full bg-[var(--surface-2)] object-cover"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}

export interface CandidateCardProps {
  profile: Profile;
  /** Wenn vorhanden, werden Score und Top-Grund angezeigt. */
  match?: MatchResult;
  className?: string;
}

export function CandidateCard({ profile, match, className }: CandidateCardProps) {
  const source = getProfileSource(profile);
  const href = `/candidates/${encodeURIComponent(profile.id)}`;
  const lookingFor = profile.lookingFor ?? [];
  const shownLookingFor = lookingFor.slice(0, 2);
  const hiddenLookingFor = lookingFor.length - shownLookingFor.length;
  const verticals = profile.verticals ?? [];
  const events = profile.events ?? [];
  const topReason = match?.reasons[0];
  const personalityType = profile.personality?.type;

  return (
    <article
      className={cx(
        "flex h-full flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-[var(--accent)]",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Link href={href} prefetch={false} tabIndex={-1} aria-hidden className="shrink-0">
          <CandidateAvatar src={profile.photoUrl} name={profile.name} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={href}
              prefetch={false}
              className="truncate text-sm font-semibold text-[var(--foreground)] hover:underline"
              title={profile.name}
            >
              {profile.name}
            </Link>
            {source && (
              <Badge tone={source === "idealab" ? "accent" : "neutral"} className="shrink-0">
                {SOURCE_LABELS[source]}
              </Badge>
            )}
          </div>
          {profile.headline && <p className="mt-0.5 line-clamp-2 text-sm text-[var(--muted)]">{profile.headline}</p>}
          {profile.location && <p className="mt-1 truncate text-xs text-[var(--muted)]">{profile.location}</p>}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge tone="accent">{NETWORK_ROLE_LABELS[profile.networkRole] ?? profile.networkRole}</Badge>
        {profile.founderRole && <Badge>{FOUNDER_ROLE_LABELS[profile.founderRole] ?? profile.founderRole}</Badge>}
        {personalityType && <Badge>{PERSONALITY_LABELS[personalityType] ?? personalityType}</Badge>}
      </div>

      {verticals.length > 0 && (
        <ul className="flex flex-wrap gap-1" aria-label="Verticals">
          {verticals.map((vertical) => (
            <li key={vertical} className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[11px] text-[var(--muted)]">
              {formatVertical(vertical)}
            </li>
          ))}
        </ul>
      )}

      {(shownLookingFor.length > 0 || events.length > 0) && (
        <dl className="space-y-1 text-xs text-[var(--muted)]">
          {shownLookingFor.length > 0 && (
            <div className="flex gap-1">
              <dt className="shrink-0 font-medium">Sucht:</dt>
              <dd className="truncate" title={lookingFor.join(", ")}>
                {shownLookingFor.map(sentenceCase).join(", ")}
                {hiddenLookingFor > 0 && ` +${hiddenLookingFor}`}
              </dd>
            </div>
          )}
          {events.length > 0 && (
            <div className="flex gap-1">
              <dt className="shrink-0 font-medium">Events:</dt>
              <dd className="truncate" title={events.map(eventName).join(", ")}>
                {events.map(eventName).join(" · ")}
              </dd>
            </div>
          )}
        </dl>
      )}

      {match && (
        <div className="mt-auto border-t border-[var(--border)] pt-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-[var(--muted)]">Match-Score</span>
            <span className="font-semibold tabular-nums text-[var(--foreground)]">{match.score}</span>
          </div>
          <ScoreBar value={match.score} />
          {topReason && (
            <p className="mt-1.5 truncate text-xs text-[var(--muted)]" title={topReason.detail}>
              {topReason.label}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

export default CandidateCard;
