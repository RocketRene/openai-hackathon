"use client";
/**
 * Kandidaten-Karte für Listen und Grids (Kandidatenliste, Shortlist, Dashboard …).
 * Reine Darstellung – bekommt Profil (+ optional Match) und rendert. Die ganze Karte ist ein Link.
 *
 * Exportiert außerdem die Label-Maps und Quelle-Helfer, die Liste und Filter teilen.
 * Sie liegen hier statt in src/lib/types.ts, weil das ein Shared Contract ist.
 */
import Link from "next/link";
import { useState } from "react";
import { PERSONALITY_LABELS, type FounderRole, type MatchResult, type NetworkRole, type Profile } from "@/lib/types";
import { Badge, cx } from "@/components/ui";
import { ShortlistButton } from "./ShortlistButton";

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

const MAX_VERTICALS = 3;

function CandidateAvatar({ src, name, size = 56 }: { src?: string; name: string; size?: number }) {
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
      className="shrink-0 rounded-full bg-[var(--surface-2)] object-cover ring-2 ring-[var(--surface)]"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}

function scoreTone(score: number): "success" | "accent" | "neutral" {
  if (score >= 70) return "success";
  if (score >= 45) return "accent";
  return "neutral";
}

const scoreClasses = {
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  accent: "bg-[var(--accent-soft)] text-[var(--accent)]",
  neutral: "bg-[var(--surface-2)] text-[var(--muted)]",
} as const;

function PinIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
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
  const verticals = profile.verticals ?? [];
  const shownVerticals = verticals.slice(0, MAX_VERTICALS);
  const hiddenVerticals = verticals.length - shownVerticals.length;
  const topReason = match?.reasons[0];
  const personalityType = profile.personality?.type;
  const tone = match ? scoreTone(match.score) : null;

  return (
    <article className={cx("relative h-full", className)}>
      <Link
        href={href}
        prefetch={false}
        className="group flex h-full flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:border-[var(--accent)]/50 hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        aria-label={`${profile.name} – Profil öffnen`}
      >
        <div className="flex items-start gap-3">
          <CandidateAvatar src={profile.photoUrl} name={profile.name} />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)]" title={profile.name}>
              {profile.name}
            </h3>
            {profile.headline && <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-[var(--muted)]">{profile.headline}</p>}
            {profile.location && (
              <p className="mt-1 flex items-center gap-1 truncate text-xs text-[var(--muted)]">
                <PinIcon />
                <span className="truncate">{profile.location}</span>
              </p>
            )}
          </div>
          {match && tone && (
            <div
              className={cx("flex shrink-0 flex-col items-center rounded-[var(--radius-sm)] px-2 py-1", scoreClasses[tone])}
              title={topReason ? `${topReason.label}: ${topReason.detail}` : `Match-Score ${match.score} von 100`}
            >
              <span className="text-lg font-semibold leading-none tabular-nums">{Math.round(match.score)}</span>
              <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">Match</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge tone="accent">{NETWORK_ROLE_LABELS[profile.networkRole] ?? profile.networkRole}</Badge>
          {profile.founderRole && <Badge>{FOUNDER_ROLE_LABELS[profile.founderRole] ?? profile.founderRole}</Badge>}
          {personalityType && <Badge tone="success">{PERSONALITY_LABELS[personalityType] ?? personalityType}</Badge>}
        </div>

        {shownVerticals.length > 0 && (
          <ul className="flex flex-wrap gap-1" aria-label="Verticals">
            {shownVerticals.map((vertical) => (
              <li key={vertical} className="rounded-md bg-[var(--surface-2)] px-1.5 py-0.5 text-[11px] text-[var(--muted)]">
                {formatVertical(vertical)}
              </li>
            ))}
            {hiddenVerticals > 0 && (
              <li className="rounded-md px-1 py-0.5 text-[11px] text-[var(--muted)]" title={verticals.slice(MAX_VERTICALS).map(formatVertical).join(", ")}>
                +{hiddenVerticals}
              </li>
            )}
          </ul>
        )}

        {topReason && (
          <p className="line-clamp-2 text-xs leading-snug text-[var(--foreground)]" title={topReason.detail}>
            {topReason.detail}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
          {source ? (
            <span className="text-[11px] text-[var(--muted)]">{SOURCE_LABELS[source]}</span>
          ) : (
            <span />
          )}
          {/* Platzhalter, damit der absolut positionierte Merken-Button nicht überlappt */}
          <span className="h-8 w-20" aria-hidden />
        </div>
      </Link>
      <ShortlistButton profileId={profile.id} size="sm" className="absolute bottom-4 right-4" />
    </article>
  );
}

export default CandidateCard;
