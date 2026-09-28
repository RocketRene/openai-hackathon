"use client";
/**
 * Kandidaten-Karte für Listen und Grids (Kandidatenliste, Shortlist, Dashboard …).
 * Reine Darstellung – bekommt Profil (+ optional Match) und rendert.
 * Die ganze Karte ist ein Link (gestreckter Link), Hover hebt sie leicht an;
 * der Merken-Button liegt über dem Link (z-20) und stoppt die Propagation selbst.
 *
 * Exportiert außerdem die Label-Maps und Quelle-Helfer, die Liste und Filter teilen.
 * Sie liegen hier statt in src/lib/types.ts, weil das ein Shared Contract ist.
 * Labels sind zweisprachig (`*_I18N`, {de,en}); die deutschen `Record<…, string>`-Exporte
 * bleiben für ältere Aufrufer erhalten. Der Top-Grund (`match.reasons[0]`) kommt bereits
 * in der richtigen Sprache, wenn rankCandidates mit `{ locale }` aufgerufen wurde.
 */
import Link from "next/link";
import { memo, useState } from "react";
import { getEvents } from "@/lib/data";
import { pick, useLocale, useT, type Dict, type Locale } from "@/lib/i18n";
import { matchTier, matchTierLabel, type MatchTier } from "@/lib/matching";
import { PERSONALITY_LABELS, type FounderRole, type MatchResult, type NetworkRole, type PersonalityType, type Profile } from "@/lib/types";
import { Badge, cx } from "@/components/ui";
import { ShortlistButton } from "./ShortlistButton";

/** Zweisprachiges Label. */
export interface BiLabel {
  de: string;
  en: string;
}

export const NETWORK_ROLE_LABELS_I18N: Record<NetworkRole, BiLabel> = {
  cofounder: { de: "Co-Founder", en: "Co-founder" },
  investor: { de: "Investor", en: "Investor" },
  mentor: { de: "Mentor", en: "Mentor" },
  talent: { de: "Talent", en: "Talent" },
  expert: { de: "Expert:in", en: "Expert" },
};

export const FOUNDER_ROLE_LABELS_I18N: Record<FounderRole, BiLabel> = {
  tech: { de: "Tech", en: "Tech" },
  commercial: { de: "Commercial", en: "Commercial" },
  product: { de: "Produkt", en: "Product" },
  design: { de: "Design", en: "Design" },
  operations: { de: "Operations", en: "Operations" },
  "domain-expert": { de: "Domain-Expert:in", en: "Domain expert" },
};

/** Deutsch aus dem zentralen Vokabular (src/lib/types.ts), Englisch lokal. */
export const PERSONALITY_LABELS_I18N: Record<PersonalityType, BiLabel> = {
  visionary: { de: PERSONALITY_LABELS.visionary, en: "Visionary" },
  builder: { de: PERSONALITY_LABELS.builder, en: "Builder" },
  operator: { de: PERSONALITY_LABELS.operator, en: "Operator" },
  connector: { de: PERSONALITY_LABELS.connector, en: "Connector" },
  analyst: { de: PERSONALITY_LABELS.analyst, en: "Analyst" },
};

/** Herkunft eines Profils, gruppiert für Quelle-Filter und Quelle-Badge. */
export type ProfileSource = "idealab" | "demo" | "manual";

export const SOURCE_LABELS_I18N: Record<ProfileSource, BiLabel> = {
  idealab: { de: "IdeaLab 2026", en: "IdeaLab 2026" },
  demo: { de: "Demo", en: "Demo" },
  manual: { de: "Manuell", en: "Manual" },
};

/** Label in der gewünschten Sprache; unbekannte Werte (Daten außerhalb des Vokabulars) fallen auf den Schlüssel zurück. */
export function labelFor<K extends string>(table: Record<K, BiLabel>, key: K, locale: Locale): string {
  return table[key]?.[locale] ?? key;
}

function germanLabels<K extends string>(table: Record<K, BiLabel>): Record<K, string> {
  const out = {} as Record<K, string>;
  for (const key of Object.keys(table) as K[]) out[key] = table[key].de;
  return out;
}

/** Deutsche Labels (Abwärtskompatibilität; gleiche Schlüssel-Reihenfolge wie die I18N-Tabellen). */
export const NETWORK_ROLE_LABELS: Record<NetworkRole, string> = germanLabels(NETWORK_ROLE_LABELS_I18N);
export const FOUNDER_ROLE_LABELS: Record<FounderRole, string> = germanLabels(FOUNDER_ROLE_LABELS_I18N);
export const SOURCE_LABELS: Record<ProfileSource, string> = germanLabels(SOURCE_LABELS_I18N);

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

const DICT = {
  openProfile: { de: "Profil von {name} öffnen", en: "Open {name}'s profile" },
  verticals: { de: "Verticals", en: "Verticals" },
  lookingFor: { de: "Sucht", en: "Looking for" },
  match: { de: "Match", en: "Match" },
  noReason: { de: "Kein besonderer Grund", en: "No particular reason" },
} satisfies Dict;

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
  const [locale] = useLocale();
  const tier = matchTier(score);
  const label = matchTierLabel(tier, locale);
  return (
    <span
      className={cx("inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold", TIER_CLASSES[tier], className)}
      aria-label={pick(locale, `Match-Score ${score} von 100, ${label}`, `Match score ${score} of 100, ${label}`)}
    >
      <span className="tabular-nums">{Math.round(score)}</span>
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
      className="flex h-full flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]"
    >
      <div className="flex items-start gap-3">
        <div className="fr-skeleton h-12 w-12 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="fr-skeleton h-3.5 w-2/3 rounded" />
          <div className="fr-skeleton h-3 w-full rounded" />
          <div className="fr-skeleton h-3 w-4/5 rounded" />
        </div>
        <div className="fr-skeleton h-9 w-16 shrink-0 rounded-[var(--radius)]" />
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
  const [locale] = useLocale();
  const t = useT(DICT);
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
  const openLabel = t("openProfile", { name: profile.name });

  // Ort · erstes Event (+n) · Quelle (nur wenn nicht IdeaLab – echte Daten sind der Normalfall)
  const metaParts: string[] = [];
  if (profile.location) metaParts.push(profile.location);
  if (events.length > 0) metaParts.push(eventName(events[0]) + (events.length > 1 ? ` +${events.length - 1}` : ""));
  if (source && source !== "idealab") metaParts.push(labelFor(SOURCE_LABELS_I18N, source, locale));

  return (
    <article
      className={cx(
        "group relative flex h-full flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] transition duration-200",
        "hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-md)]",
        "focus-within:border-[var(--accent)]/60 focus-within:ring-2 focus-within:ring-[var(--ring)]",
        className,
      )}
    >
      {/* Gestreckter Link: ganze Karte klickbar, ein Tab-Stopp. */}
      <Link href={href} prefetch={false} className="absolute inset-0 z-10 rounded-[var(--radius-lg)] focus-visible:outline-none" aria-label={openLabel}>
        <span className="sr-only">{openLabel}</span>
      </Link>

      <header className="flex items-start gap-3">
        <CandidateAvatar src={profile.photoUrl} name={profile.name} size={48} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold tracking-tight text-[var(--foreground)] transition-colors group-hover:text-[var(--accent)]">
            {profile.name}
          </h3>
          {profile.headline && <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[var(--foreground)]/80">{profile.headline}</p>}
        </div>
        <div className="relative z-20 -mr-1 -mt-1 shrink-0">
          <ShortlistButton profileId={profile.id} size="sm" />
        </div>
      </header>

      {metaParts.length > 0 && <p className="truncate text-xs text-[var(--muted)]">{metaParts.join(" · ")}</p>}

      <div className="flex flex-wrap gap-1.5">
        <Badge tone="accent">{labelFor(NETWORK_ROLE_LABELS_I18N, profile.networkRole, locale)}</Badge>
        {profile.founderRole && <Badge>{labelFor(FOUNDER_ROLE_LABELS_I18N, profile.founderRole, locale)}</Badge>}
        {personalityType && <Badge>{labelFor(PERSONALITY_LABELS_I18N, personalityType, locale)}</Badge>}
      </div>

      {shownVerticals.length > 0 && (
        <ul className="flex flex-wrap gap-1" aria-label={t("verticals")}>
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
          <span className="shrink-0 font-medium">{t("lookingFor")}</span>
          <span className="truncate">
            {shownLookingFor.map(sentenceCase).join(", ")}
            {hiddenLookingFor > 0 && ` +${hiddenLookingFor}`}
          </span>
        </p>
      )}

      {match && (
        <footer className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">{t("match")}</p>
            <p className="truncate text-xs text-[var(--foreground)]">{topReason ? topReason.label : t("noReason")}</p>
          </div>
          <ScorePill score={match.score} />
        </footer>
      )}
    </article>
  );
});

export default CandidateCard;
