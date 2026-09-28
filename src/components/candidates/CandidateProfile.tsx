"use client";
/**
 * LinkedIn-artige, ruhige Profilseite für eine:n Kandidat:in – "es muss alles anzeigbar sein".
 * Aufbau: Header-Card (Avatar, Name, Headline, Badges, Kontakt-Links, Events) → sticky Aktionsleiste
 * → zwei Spalten ab lg: links Über / Erfahrung (Timeline) / Ausbildung / Skills & Fokus,
 * rechts Match (MatchBreakdown) / Persönlichkeit / Quelle.
 * Client-Komponente wegen ShortlistButton (localStorage) und MatchBreakdown (Nutzer-Kontext).
 * Event-Namen werden von der Server-Page aufgelöst und als Prop übergeben, damit hier kein
 * Profil-JSON ins Client-Bundle wandert. Layout/Shell (max-w, Padding) kommt global aus AppShell.
 * Zweisprachig (DE/EN): nur UI-Beschriftungen werden übersetzt (lokales DICT + Label-Tabellen),
 * Profildaten (about, experience, skills, personality-Texte) bleiben wie geliefert.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import type { Event as EventInfo, FounderRole, NetworkRole, PersonalityType, Profile, Stage } from "@/lib/types";
import { useLocale, useT, type Dict, type Locale } from "@/lib/i18n";
import { Avatar, Badge, Card, LinkButton, cx } from "@/components/ui";
import MatchBreakdown from "./MatchBreakdown";
import { ShortlistButton } from "./ShortlistButton";

/* ------------------------------------------------------------------ */
/* Labels (modul-lokal, zweisprachig)                                  */
/* ------------------------------------------------------------------ */

type Bi = { de: string; en: string };

const NETWORK_ROLE_LABELS: Record<NetworkRole, Bi> = {
  cofounder: { de: "Co-Founder", en: "Co-founder" },
  investor: { de: "Investor:in", en: "Investor" },
  mentor: { de: "Mentor:in", en: "Mentor" },
  talent: { de: "Talent", en: "Talent" },
  expert: { de: "Expert:in", en: "Expert" },
};

const FOUNDER_ROLE_LABELS: Record<FounderRole, Bi> = {
  tech: { de: "Tech", en: "Tech" },
  commercial: { de: "Commercial", en: "Commercial" },
  product: { de: "Produkt", en: "Product" },
  design: { de: "Design", en: "Design" },
  operations: { de: "Operations", en: "Operations" },
  "domain-expert": { de: "Domain-Expert:in", en: "Domain expert" },
};

const STAGE_LABELS: Record<Stage, Bi> = {
  idea: { de: "Idee", en: "Idea" },
  "pre-seed": { de: "Pre-Seed", en: "Pre-seed" },
  seed: { de: "Seed", en: "Seed" },
  "series-a": { de: "Series A", en: "Series A" },
  growth: { de: "Growth", en: "Growth" },
};

const PERSONALITY_LABELS: Record<PersonalityType, Bi> = {
  visionary: { de: "Visionär:in", en: "Visionary" },
  builder: { de: "Builder", en: "Builder" },
  operator: { de: "Operator", en: "Operator" },
  connector: { de: "Connector", en: "Connector" },
  analyst: { de: "Analyst:in", en: "Analyst" },
};

const SOURCE_LABELS: Record<NonNullable<Profile["source"]>["type"], Bi> = {
  linkedin: { de: "LinkedIn", en: "LinkedIn" },
  conference: { de: "Konferenz-App", en: "Conference app" },
  manual: { de: "Manuell erfasst", en: "Entered manually" },
  mock: { de: "Mock-Daten", en: "Mock data" },
};

/** Label aus einer Bi-Tabelle; unbekannte (gescrapte) Werte fallen auf den Rohwert zurück. */
function label<K extends string>(table: Record<K, Bi>, key: K, locale: Locale): string {
  return (table[key] as Bi | undefined)?.[locale] ?? key;
}

const DICT: Dict = {
  back: { de: "Alle Kandidat:innen", en: "All candidates" },
  meetAt: { de: "Trifft man auf", en: "Meet at" },
  outreach: { de: "Outreach erzeugen", en: "Generate outreach" },
  prep: { de: "Gespräch vorbereiten", en: "Prepare conversation" },
  discuss: { de: "Im Agent besprechen", en: "Discuss with the agent" },
  about: { de: "Über", en: "About" },
  noAbout: { de: "Keine Beschreibung vorhanden.", en: "No description available." },
  experience: { de: "Erfahrung", en: "Experience" },
  positionOne: { de: "1 Station", en: "1 position" },
  positionMany: { de: "{n} Stationen", en: "{n} positions" },
  noExperience: { de: "Keine Berufserfahrung hinterlegt.", en: "No work experience on file." },
  today: { de: "heute", en: "today" },
  education: { de: "Ausbildung", en: "Education" },
  noEducation: { de: "Keine Ausbildung hinterlegt.", en: "No education on file." },
  skillsFocus: { de: "Skills & Fokus", en: "Skills & focus" },
  skillsFocusDesc: {
    de: "Fähigkeiten, Suche und Branchen – Grundlage für den Match.",
    en: "Skills, what they're looking for and industries – the basis for the match.",
  },
  skills: { de: "Skills", en: "Skills" },
  noSkills: { de: "Keine Skills hinterlegt.", en: "No skills on file." },
  lookingFor: { de: "Sucht", en: "Looking for" },
  noLookingFor: { de: "Keine Angabe, was gesucht wird.", en: "No information on what they're looking for." },
  verticals: { de: "Verticals", en: "Verticals" },
  noVerticals: { de: "Keine Branchen hinterlegt.", en: "No industries on file." },
  languages: { de: "Sprachen", en: "Languages" },
  tags: { de: "Tags", en: "Tags" },
  noInfo: { de: "Keine Angaben.", en: "No information." },
  personality: { de: "Persönlichkeit", en: "Personality" },
  communicationStyle: { de: "Kommunikationsstil", en: "Communication style" },
  outreachTips: { de: "So schreibst du an", en: "How to reach out" },
  noTips: { de: "Keine Tipps hinterlegt.", en: "No tips on file." },
  avoid: { de: "Vermeide", en: "Avoid" },
  noAvoid: { de: "Keine No-Gos hinterlegt.", en: "No no-gos on file." },
  noPersonality: { de: "Noch keine Persönlichkeitsanalyse vorhanden.", en: "No personality analysis yet." },
  source: { de: "Quelle", en: "Source" },
  sourceType: { de: "Typ", en: "Type" },
  sourceDate: { de: "Stand", en: "As of" },
  profileId: { de: "Profil-ID", en: "Profile ID" },
  unknown: { de: "Unbekannt", en: "Unknown" },
};

/* ------------------------------------------------------------------ */
/* Helfer                                                              */
/* ------------------------------------------------------------------ */

/** "Mär 2021 – heute", "2019 – 2021" oder nur "2019". Daten sind gescrapt, also Freitext. */
function formatRange(start: string | null | undefined, end: string | null | undefined, openEnd: string) {
  const s = (start ?? "").trim();
  const e = (end ?? "").trim() || openEnd;
  if (!s && !e) return "";
  if (!s) return e;
  if (!e) return s;
  return `${s} – ${e}`;
}

const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** ISO-Datum → "26.09.2026" (DE) bzw. "26 Sep 2026" (EN), deterministisch (kein toLocale → keine Hydration-Abweichung). */
function formatDate(iso: string | undefined, locale: Locale) {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  if (locale === "en") {
    const month = EN_MONTHS[Number(m[2]) - 1];
    return month ? `${Number(m[3])} ${month} ${m[1]}` : `${m[1]}-${m[2]}-${m[3]}`;
  }
  return `${m[3]}.${m[2]}.${m[1]}`;
}

function initials(text: string) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <h4 className={cx("text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]", className)}>{children}</h4>;
}

function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] px-3 py-2.5 text-sm text-[var(--muted)]">{children}</p>
  );
}

function Chips({ items, tone = "neutral", empty }: { items: string[]; tone?: "neutral" | "accent"; empty: string }) {
  if (items.length === 0) return <EmptyHint>{empty}</EmptyHint>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item} tone={tone}>
          {item}
        </Badge>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Icons (inline SVG, keine Dependency)                                */
/* ------------------------------------------------------------------ */

const iconProps = {
  width: 14,
  height: 14,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function PinIcon() {
  return (
    <svg {...iconProps}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg {...iconProps}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg {...iconProps} width={12} height={12} className="opacity-60">
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg {...iconProps}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg {...iconProps} width={12} height={12} strokeWidth={2.5}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg {...iconProps} width={12} height={12} strokeWidth={2.5}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg {...iconProps} width={12} height={12}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Teilbereiche                                                        */
/* ------------------------------------------------------------------ */

/** Timeline-Eintrag mit Punkt auf der Linie; aktuelle Station (kein Ende) in Akzentfarbe. */
function ExperienceTimeline({ items, today }: { items: Profile["experience"]; today: string }) {
  return (
    <ol className="relative ml-[7px] border-l border-[var(--border)]">
      {items.map((exp, i) => {
        const current = !(exp.end ?? "").trim();
        const range = formatRange(exp.start, exp.end, today);
        return (
          <li key={`${exp.company}-${exp.title}-${i}`} className="relative pb-6 pl-6 last:pb-0">
            <span
              aria-hidden
              className={cx(
                "absolute -left-[7px] top-1 h-3.5 w-3.5 rounded-full border-2 border-[var(--surface)]",
                current ? "bg-[var(--accent)] ring-2 ring-[var(--accent-soft)]" : "bg-[var(--surface-3)]",
              )}
            />
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className="text-sm font-semibold text-[var(--foreground)]">{exp.title}</p>
              {range && <p className="text-xs tabular-nums text-[var(--muted)]">{range}</p>}
            </div>
            {exp.company && <p className="mt-0.5 text-sm text-[var(--muted)]">{exp.company}</p>}
            {exp.description && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--foreground)]">{exp.description}</p>}
          </li>
        );
      })}
    </ol>
  );
}

function EducationList({ items }: { items: Profile["education"] }) {
  return (
    <ul className="flex flex-col gap-4">
      {items.map((edu, i) => {
        const detail = [edu.degree, edu.field].filter(Boolean).join(" · ");
        const range = formatRange(edu.start, edu.end, "");
        return (
          <li key={`${edu.school}-${i}`} className="flex gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] text-xs font-semibold text-[var(--muted)]">
              {initials(edu.school) || "–"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-sm font-semibold text-[var(--foreground)]">{edu.school}</p>
                {range && <p className="text-xs tabular-nums text-[var(--muted)]">{range}</p>}
              </div>
              {detail && <p className="mt-0.5 text-sm text-[var(--muted)]">{detail}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function TipList({ items, tone, empty }: { items: string[]; tone: "success" | "danger"; empty: string }) {
  if (items.length === 0) return <p className="mt-2 text-sm text-[var(--muted)]">{empty}</p>;
  const iconClasses =
    tone === "success" ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--danger-soft)] text-[var(--danger)]";
  return (
    <ul className="mt-2.5 flex flex-col gap-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-[var(--foreground)]">
          <span className={cx("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full", iconClasses)}>
            {tone === "success" ? <CheckIcon /> : <CrossIcon />}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Profilseite                                                         */
/* ------------------------------------------------------------------ */

export default function CandidateProfile({ profile, events }: { profile: Profile; events?: EventInfo[] }) {
  const [locale] = useLocale();
  const t = useT(DICT);
  const personality = profile.personality;
  const eventItems = (profile.events ?? []).map((slug) => ({
    slug,
    name: events?.find((e) => e.slug === slug)?.name ?? slug,
  }));
  const languages = profile.languages ?? [];
  const tags = profile.tags ?? [];
  const source = profile.source;
  const personalityLabel = personality?.type ? label(PERSONALITY_LABELS, personality.type, locale) : undefined;
  const experienceCount = profile.experience?.length ?? 0;

  const outreachHref = `/outreach?profile=${encodeURIComponent(profile.id)}`;
  const prepHref = `/prep/${encodeURIComponent(profile.id)}`;

  return (
    <div className="fr-fade-in">
      {/* Zurück */}
      <Link
        href="/candidates"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
      >
        <ArrowLeftIcon />
        {t("back")}
      </Link>

      {/* Header-Card */}
      <Card padding="none" className="mt-4 overflow-hidden">
        <div className="h-20 bg-[linear-gradient(135deg,var(--accent-soft),var(--surface-2))] sm:h-24" aria-hidden />
        <div className="px-5 pb-6 sm:px-6">
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
            <div className="shrink-0 rounded-full bg-[var(--surface)] p-1 shadow-[var(--shadow-sm)]">
              <Avatar src={profile.photoUrl || undefined} name={profile.name} size={96} />
            </div>
            <div className="flex flex-wrap gap-1.5 sm:mb-1">
              <Badge tone="accent">{label(NETWORK_ROLE_LABELS, profile.networkRole, locale)}</Badge>
              {profile.founderRole && <Badge>{label(FOUNDER_ROLE_LABELS, profile.founderRole, locale)}</Badge>}
              {profile.stage && <Badge>{label(STAGE_LABELS, profile.stage, locale)}</Badge>}
              {personalityLabel && <Badge tone="success">{personalityLabel}</Badge>}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">{profile.name}</h1>
              {profile.headline && <p className="mt-1.5 text-base leading-relaxed text-[var(--muted)]">{profile.headline}</p>}
              {profile.location && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-[var(--muted)]">
                  <PinIcon />
                  {profile.location}
                </p>
              )}

              {eventItems.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
                    <CalendarIcon />
                    {t("meetAt")}
                  </span>
                  {eventItems.map((ev) => (
                    <Link
                      key={ev.slug}
                      href={`/events/${encodeURIComponent(ev.slug)}`}
                      className="inline-flex h-7 items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 text-xs font-medium text-[var(--foreground)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                    >
                      {ev.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {(profile.linkedinUrl || profile.email) && (
              <div className="flex flex-wrap gap-2 lg:shrink-0 lg:justify-end">
                {profile.linkedinUrl && (
                  <LinkButton href={profile.linkedinUrl} target="_blank" variant="secondary" size="sm">
                    <LinkedInIcon />
                    LinkedIn
                    <ExternalIcon />
                  </LinkButton>
                )}
                {profile.email && (
                  <LinkButton href={`mailto:${profile.email}`} variant="secondary" size="sm" className="max-w-full">
                    <MailIcon />
                    <span className="min-w-0 truncate">{profile.email}</span>
                  </LinkButton>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Sticky Aktionsleiste – klebt unter dem globalen Header (--header-height); Vollbreite über die Shell-Gutter (px-4 / md:px-8). */}
      <div className="sticky top-[var(--header-height)] z-20 -mx-4 mt-4 border-b border-[var(--border)] bg-[var(--background)]/85 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-auto hidden min-w-0 items-center gap-2.5 md:flex">
            <Avatar src={profile.photoUrl || undefined} name={profile.name} size={28} />
            <span className="truncate text-sm font-medium text-[var(--foreground)]">{profile.name}</span>
          </div>
          <LinkButton href={outreachHref} size="sm">
            {t("outreach")}
          </LinkButton>
          <LinkButton href={prepHref} variant="secondary" size="sm">
            {t("prep")}
          </LinkButton>
          <LinkButton href="/assistant" variant="secondary" size="sm">
            {t("discuss")}
          </LinkButton>
          <ShortlistButton profileId={profile.id} size="sm" />
        </div>
      </div>

      {/* Zwei Spalten ab lg */}
      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] lg:items-start">
        {/* Hauptspalte */}
        <div className="flex min-w-0 flex-col gap-5">
          <Card title={t("about")}>
            {profile.about ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--foreground)]">{profile.about}</p>
            ) : (
              <EmptyHint>{t("noAbout")}</EmptyHint>
            )}
          </Card>

          <Card
            title={t("experience")}
            description={experienceCount > 0 ? (experienceCount === 1 ? t("positionOne") : t("positionMany", { n: experienceCount })) : undefined}
          >
            {experienceCount > 0 ? <ExperienceTimeline items={profile.experience} today={t("today")} /> : <EmptyHint>{t("noExperience")}</EmptyHint>}
          </Card>

          <Card title={t("education")}>
            {profile.education?.length > 0 ? <EducationList items={profile.education} /> : <EmptyHint>{t("noEducation")}</EmptyHint>}
          </Card>

          <Card title={t("skillsFocus")} description={t("skillsFocusDesc")}>
            <div className="flex flex-col gap-5">
              <div>
                <SectionLabel className="mb-2">{t("skills")}</SectionLabel>
                <Chips items={profile.skills ?? []} empty={t("noSkills")} />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <SectionLabel className="mb-2">{t("lookingFor")}</SectionLabel>
                  <Chips items={profile.lookingFor ?? []} tone="accent" empty={t("noLookingFor")} />
                </div>
                <div>
                  <SectionLabel className="mb-2">{t("verticals")}</SectionLabel>
                  <Chips items={profile.verticals ?? []} empty={t("noVerticals")} />
                </div>
                {languages.length > 0 && (
                  <div>
                    <SectionLabel className="mb-2">{t("languages")}</SectionLabel>
                    <Chips items={languages} empty={t("noInfo")} />
                  </div>
                )}
                {tags.length > 0 && (
                  <div>
                    <SectionLabel className="mb-2">{t("tags")}</SectionLabel>
                    <Chips items={tags} empty={t("noInfo")} />
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Seitenspalte */}
        <aside className="flex min-w-0 flex-col gap-5">
          <MatchBreakdown profile={profile} />

          <Card title={t("personality")} action={personalityLabel ? <Badge tone="success">{personalityLabel}</Badge> : undefined}>
            {personality ? (
              <div className="flex flex-col gap-5">
                {personality.summary && <p className="text-sm leading-relaxed text-[var(--foreground)]">{personality.summary}</p>}
                {personality.traits?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {personality.traits.map((trait) => (
                      <Badge key={trait}>{trait}</Badge>
                    ))}
                  </div>
                )}
                {personality.communicationStyle && (
                  <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
                    <SectionLabel>{t("communicationStyle")}</SectionLabel>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--foreground)]">{personality.communicationStyle}</p>
                  </div>
                )}
                <div>
                  <SectionLabel>{t("outreachTips")}</SectionLabel>
                  <TipList items={personality.outreachTips ?? []} tone="success" empty={t("noTips")} />
                </div>
                <div>
                  <SectionLabel>{t("avoid")}</SectionLabel>
                  <TipList items={personality.avoid ?? []} tone="danger" empty={t("noAvoid")} />
                </div>
              </div>
            ) : (
              <EmptyHint>{t("noPersonality")}</EmptyHint>
            )}
          </Card>

          <Card title={t("source")}>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-2 text-sm">
              <dt className="text-[var(--muted)]">{t("sourceType")}</dt>
              <dd className="text-[var(--foreground)]">{source ? label(SOURCE_LABELS, source.type, locale) : t("unknown")}</dd>
              {source?.scrapedAt && (
                <>
                  <dt className="text-[var(--muted)]">{t("sourceDate")}</dt>
                  <dd className="tabular-nums text-[var(--foreground)]">{formatDate(source.scrapedAt, locale)}</dd>
                </>
              )}
              <dt className="text-[var(--muted)]">{t("profileId")}</dt>
              <dd className="truncate font-mono text-xs text-[var(--foreground)]" title={profile.id}>
                {profile.id}
              </dd>
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  );
}
