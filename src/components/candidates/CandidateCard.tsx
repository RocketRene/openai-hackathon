"use client";
/**
 * Kandidaten-Karte für Listen und Grids (Kandidatenliste, Shortlist, Dashboard …).
 * Reine Darstellung – bekommt Profil (+ optional Match) und rendert.
 * Die ganze Karte ist ein Link (gestreckter Link), Hover hebt sie leicht an.
 *
 * Exportiert außerdem die Label-Maps und Quelle-Helfer, die Liste und Filter teilen.
 * Sie liegen hier statt in src/lib/types.ts, weil das ein Shared Contract ist.
 */
import Link from "next/link";
import { memo, useState } from "react";
import { getEvents } from "@/lib/data";
import { MATCH_TIER_LABELS, matchTier, type MatchTier } from "@/lib/matching";
import { PERSONALITY_LABELS, type FounderRole, type MatchResult, type NetworkRole, type Profile } from "@/lib/types";
import { Badge, cx } from "@/components/ui";

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

const MAX_VERTICALS = 3;
const MAX_LOOKING_FOR = 2;

/* ------------------------------------------------------------------ */
/* Score-Pill                                                          */
/* ------------------------------------------------------------------ */

const TIER_CLASSES: Record<MatchTier, string> = {
  top: "border-transparent bg-[var(--success-soft)] text-[var(--success)]",
  gut: "border-transparent bg-[var(--accent-soft)] text-[var(--accent)]",
  möglich: "border-transparent bg-[var(--warning-soft)] text-[var(--warning)]",
  schwach: "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]",
};

/** Match-Score als Pill, eingefärbt nach Einstufung (matchTier aus src/lib/matching.ts). */
export function ScorePill({ score, className }: { score: number; className?: string }) {
  const tier = matchTier(score);
  const label = MATCH_TIER_LABELS[tier];
  return (
    <span
      className={cx("inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold", TIER_CLASSES[tier], className)}
      aria-label={`Match-Score ${score} von 100, ${label}`}
    >
      <span className="tabular-nums">{score}</span>
      <span className="font-medium opacity-80">{label}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Avatar mit Fallback auf Initialen (Bild-URLs sind gescrapt)          */
/* ------------------------------------------------------------------ */

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
        className="flex shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)] ring-1 ring-[var(--border)]"
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
      referrerPolicy="no-referrer"
      className="shrink-0 rounded-full bg-[var(--surface-2)] object-cover ring-1 ring-[var(--border)]"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Skeleton                                                            */
/* ------------------------------------------------------------------ */

/** Platzhalter in Karten-Geometrie – für Erst-Ladung und „Mehr laden“. */
export function CandidateCardSkeleton() {
  return (
    <div
      aria-hidden
      className="flex h-full flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]"
    >
      <div className="flex items-start gap-3">
        <div className="fr-skeleton h-12 w-12 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="fr-skeleton h-3.5 w-2/3 rounded" />
          <div className="fr-skeleton h-3 w-full rounded" />
          <div className="fr-skeleton h-3 w-4/5 rounded" />
        </div>
      </div>
      <div className="fr-skeleton h-3 w-1/2 rounded" />
      <div className="flex gap-1.5">
        <div className="fr-skeleton h-5 w-20 rounded-full" />
        <div className="fr-skeleton h-5 w-14 rounded-full" />
        <div className="fr-skeleton h-5 w-16 rounded-full" />
      </div>
      <div className="flex gap-1">
        <div className="fr-skeleton h-4 w-12 rounded-full" />
        <div className="fr-skeleton h-4 w-16 rounded-full" />
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
        <div className="fr-skeleton h-3 w-1/2 rounded" />
        <div className="fr-skeleton h-7 w-24 rounded-full" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Karte                                                               */
/* ------------------------------------------------------------------ */

export interface CandidateCardProps {
  profile: Profile;
  /** Wenn vorhanden, werden Score-Pill und Top-Grund angezeigt. */
  match?: MatchResult;
  className?: string;
}

export const CandidateCard = memo(function CandidateCard({ profile, match, className }: CandidateCardProps) {
  const source = getProfileSource(profile);
  const href = `/candidates/${encodeURIComponent(profile.id)}`;
  const lookingFor = profile.lookingFor ?? [];
  const shownLookingFor = lookingFor.slice(0, MAX_LOOKING_FOR);
  const hiddenLookingFor = lookingFor.length - shownLookingFor.length;
  const verticals = profile.verticals ?? [];
  const shownVerticals = verticals.slice(0, MAX_VERTICALS);
  const hiddenVerticals = verticals.length - shownVerticals.length;
  const events = profile.events ?? [];
  const topReason = match?.reasons[0];
  const personalityType = profile.personality?.type;

  const metaParts: string[] = [];
  if (profile.location) metaParts.push(profile.location);
  if (events.length > 0) metaParts.push(eventName(events[0]) + (events.length > 1 ? ` +${events.length - 1}` : ""));

  return (
    <article
      className={cx(
        "group relative flex h-full flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] transition duration-200",
        "hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-md)]",
        "focus-within:border-[var(--accent)]/60 focus-within:ring-2 focus-within:ring-[var(--ring)]",
        className,
      )}
    >
      {/* Gestreckter Link: ganze Karte klickbar, ein Tab-Stopp. */}
      <Link
        href={href}
        prefetch={false}
        className="absolute inset-0 z-10 rounded-[var(--radius)] focus-visible:outline-none"
        aria-label={`Profil von ${profile.name} öffnen`}
      >
        <span className="sr-only">Profil von {profile.name} öffnen</span>
      </Link>

      <header className="flex items-start gap-3">
        <CandidateAvatar src={profile.photoUrl} name={profile.name} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-semibold tracking-tight text-[var(--foreground)] transition-colors group-hover:text-[var(--accent)]">
              {profile.name}
            </h3>
            {source && source !== "idealab" && <Badge className="shrink-0">{SOURCE_LABELS[source]}</Badge>}
          </div>
          {profile.headline && <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[var(--muted)]">{profile.headline}</p>}
        </div>
      </header>

      {metaParts.length > 0 && <p className="truncate text-xs text-[var(--muted)]">{metaParts.join(" · ")}</p>}

      <div className="flex flex-wrap gap-1.5">
        <Badge tone="accent">{NETWORK_ROLE_LABELS[profile.networkRole] ?? profile.networkRole}</Badge>
        {profile.founderRole && <Badge>{FOUNDER_ROLE_LABELS[profile.founderRole] ?? profile.founderRole}</Badge>}
        {personalityType && <Badge>{PERSONALITY_LABELS[personalityType] ?? personalityType}</Badge>}
      </div>

      {shownVerticals.length > 0 && (
        <ul className="flex flex-wrap gap-1" aria-label="Verticals">
          {shownVerticals.map((vertical) => (
            <li
              key={vertical}
              className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]"
            >
              {formatVertical(vertical)}
            </li>
          ))}
          {hiddenVerticals > 0 && <li className="rounded-full px-1.5 py-0.5 text-[11px] text-[var(--muted)]">+{hiddenVerticals}</li>}
        </ul>
      )}

      {shownLookingFor.length > 0 && (
        <p className="flex min-w-0 gap-1.5 text-xs text-[var(--muted)]">
          <span className="shrink-0 font-medium">Sucht</span>
          <span className="truncate">
            {shownLookingFor.map(sentenceCase).join(", ")}
            {hiddenLookingFor > 0 && ` +${hiddenLookingFor}`}
          </span>
        </p>
      )}

      {match && (
        <footer className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">Match</p>
            <p className="truncate text-xs text-[var(--foreground)]">{topReason ? topReason.label : "Kein besonderer Grund"}</p>
          </div>
          <ScorePill score={match.score} />
        </footer>
      )}
    </article>
  );
});

export default CandidateCard;
