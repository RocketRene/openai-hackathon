"use client";
/**
 * Profilseite für eine:n Kandidat:in – "es muss alles anzeigbar sein".
 * Aufbau: Profil-Hero mit Aktionsleiste → Match → Persönlichkeit → Werdegang (Timeline) →
 * Ausbildung; rechts Skills, Sprachen, Team-Dims, Sucht/Verticals, Quelle.
 * Client-Komponente, weil Match und Shortlist localStorage brauchen.
 * Event-Namen werden von der Server-Page aufgelöst und als Prop übergeben.
 */
import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  FOUNDER_DIM_KEYS,
  FOUNDER_DIM_LABELS,
  PERSONALITY_LABELS,
  type Event as EventInfo,
  type Experience,
  type Profile,
  type Stage,
} from "@/lib/types";
import { Avatar, Badge, Card, LinkButton, ScoreBar, cx } from "@/components/ui";
import MatchBreakdown from "./MatchBreakdown";
import { ShortlistButton } from "./ShortlistButton";
import { FOUNDER_ROLE_LABELS, NETWORK_ROLE_LABELS, SOURCE_LABELS, formatVertical, getProfileSource } from "./CandidateCard";

/* ------------------------------------------------------------------ */
/* Labels (modul-lokal, deutsch)                                       */
/* ------------------------------------------------------------------ */

const STAGE_LABELS: Record<Stage, string> = {
  idea: "Idee",
  "pre-seed": "Pre-Seed",
  seed: "Seed",
  "series-a": "Series A",
  growth: "Growth",
};

const SOURCE_TYPE_LABELS: Record<NonNullable<Profile["source"]>["type"], string> = {
  linkedin: "LinkedIn-angereichert",
  conference: "Konferenz-App",
  manual: "Manuell erfasst",
  mock: "Demo-Daten",
};

const DESCRIPTION_LIMIT = 180;

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

/** ISO-Datum → "26.09.2026", deterministisch (kein toLocale → keine Hydration-Abweichung). */
function formatDate(iso?: string) {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

/** Nur echte LinkedIn-Links (https, Host endet auf linkedin.com) werden verlinkt. */
function safeLinkedinUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return undefined;
    if (!(u.hostname === "linkedin.com" || u.hostname.endsWith(".linkedin.com"))) return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
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

function SectionLabel({ children }: { children: ReactNode }) {
  return <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{children}</h4>;
}

function EmptyHint({ children }: { children: ReactNode }) {
  return <p className="text-sm text-[var(--muted)]">{children}</p>;
}

function Chips({ items, tone = "neutral" }: { items: string[]; tone?: "neutral" | "accent" }) {
  if (items.length === 0) return <EmptyHint>Keine Angaben.</EmptyHint>;
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

function ExternalIcon() {
  return (
    <svg {...iconProps} width={12} height={12}>
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
    <svg {...iconProps} className="mt-0.5 shrink-0 text-[var(--success)]">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg {...iconProps} className="mt-0.5 shrink-0 text-[var(--danger)]">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg {...iconProps} width={16} height={16}>
      <path d="m3 11 18-7-7 18-2.5-7.5L3 11Z" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg {...iconProps} width={16} height={16}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Werdegang                                                           */
/* ------------------------------------------------------------------ */

function ExperienceItem({ exp }: { exp: Experience }) {
  const [expanded, setExpanded] = useState(false);
  const description = (exp.description ?? "").trim();
  const long = description.length > DESCRIPTION_LIMIT;
  const shown = expanded || !long ? description : description.slice(0, DESCRIPTION_LIMIT).trimEnd() + "…";
  const range = formatRange(exp.start, exp.end, "heute");
  const current = !(exp.end ?? "").trim();

  return (
    <li className="relative pb-6 pl-6 last:pb-0">
      <span
        className={cx(
          "absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface)]",
          current ? "bg-[var(--accent)]" : "bg-[var(--surface-3)]",
        )}
      />
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p className="text-sm font-semibold text-[var(--foreground)]">{exp.title}</p>
        {range && <p className="text-xs tabular-nums text-[var(--muted)]">{range}</p>}
      </div>
      {exp.company && <p className="text-sm text-[var(--muted)]">{exp.company}</p>}
      {description && (
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--foreground)]">
          {shown}
          {long && (
            <>
              {" "}
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-xs font-medium text-[var(--accent)] hover:underline"
              >
                {expanded ? "weniger" : "mehr"}
              </button>
            </>
          )}
        </p>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Profilseite                                                         */
/* ------------------------------------------------------------------ */

export default function CandidateProfile({ profile, events }: { profile: Profile; events?: EventInfo[] }) {
  const personality = profile.personality;
  const eventItems = (profile.events ?? []).map((slug) => ({
    slug,
    name: events?.find((e) => e.slug === slug)?.name ?? slug,
  }));
  const languages = profile.languages ?? [];
  const tags = profile.tags ?? [];
  const source = profile.source;
  const sourceGroup = getProfileSource(profile);
  const linkedin = safeLinkedinUrl(profile.linkedinUrl);
  const aboutText = (profile.about ?? "").trim();
  const experience = profile.experience ?? [];
  const education = profile.education ?? [];
  const idParam = encodeURIComponent(profile.id);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <Link href="/candidates" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]">
        ← Alle Kandidat:innen
      </Link>

      {/* Profil-Hero */}
      <header className="relative mt-3 overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
        <div aria-hidden className="h-20 bg-[var(--accent-soft)] sm:h-24" />
        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <Avatar
                src={profile.photoUrl || undefined}
                name={profile.name}
                size={112}
                className="ring-4 ring-[var(--surface)] shadow-[var(--shadow-md)]"
              />
              <div className="min-w-0 sm:pb-1">
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">{profile.name}</h1>
                {profile.headline && <p className="mt-1 max-w-2xl text-base leading-snug text-[var(--muted)]">{profile.headline}</p>}
                {profile.location && (
                  <p className="mt-1.5 inline-flex items-center gap-1 text-sm text-[var(--muted)]">
                    <PinIcon />
                    {profile.location}
                  </p>
                )}
              </div>
            </div>

            {/* Aktionsleiste */}
            <div className="flex flex-wrap gap-2 lg:shrink-0 lg:justify-end">
              <LinkButton href={`/outreach?profile=${idParam}`}>
                <SendIcon />
                Outreach erzeugen
              </LinkButton>
              <LinkButton href={`/prep/${idParam}`} variant="secondary">
                <MicIcon />
                Gespräch vorbereiten
              </LinkButton>
              <ShortlistButton profileId={profile.id} />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <Badge tone="accent">{NETWORK_ROLE_LABELS[profile.networkRole] ?? profile.networkRole}</Badge>
            {profile.founderRole && <Badge>{FOUNDER_ROLE_LABELS[profile.founderRole] ?? profile.founderRole}</Badge>}
            {personality?.type && <Badge tone="success">{PERSONALITY_LABELS[personality.type] ?? personality.type}</Badge>}
            {profile.stage && <Badge>{STAGE_LABELS[profile.stage] ?? profile.stage}</Badge>}
            {sourceGroup && (
              <Badge tone={sourceGroup === "idealab" ? "neutral" : "warning"}>
                {SOURCE_LABELS[sourceGroup]}
                {source?.scrapedAt ? ` · Stand ${formatDate(source.scrapedAt)}` : ""}
              </Badge>
            )}
          </div>

          {(linkedin || profile.email || eventItems.length > 0) && (
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              {linkedin && (
                <a
                  href={linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-[var(--accent)] hover:underline"
                >
                  <LinkedInIcon />
                  LinkedIn-Profil
                  <ExternalIcon />
                </a>
              )}
              {profile.email && (
                <a href={`mailto:${profile.email}`} className="inline-flex items-center gap-1.5 font-medium text-[var(--accent)] hover:underline">
                  <MailIcon />
                  {profile.email}
                </a>
              )}
              {eventItems.length > 0 && (
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  <span className="text-[var(--muted)]">Trifft man auf:</span>
                  {eventItems.map((ev) => (
                    <Link
                      key={ev.slug}
                      href={`/events/${encodeURIComponent(ev.slug)}`}
                      className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-xs font-medium text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      {ev.name}
                    </Link>
                  ))}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Hauptspalte */}
        <div className="flex min-w-0 flex-col gap-4">
          <MatchBreakdown profile={profile} />

          {aboutText && (
            <Card title="Über">
              <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--foreground)]">{aboutText}</p>
            </Card>
          )}

          <Card
            title="Persönlichkeit"
            description="Wie diese Person tickt – und wie du sie ansprichst"
            action={personality?.type ? <Badge tone="success">{PERSONALITY_LABELS[personality.type] ?? personality.type}</Badge> : undefined}
          >
            {personality ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-4">
                  {personality.summary && <p className="text-sm leading-relaxed text-[var(--foreground)]">{personality.summary}</p>}
                  {personality.traits?.length > 0 && (
                    <div>
                      <SectionLabel>Eigenschaften</SectionLabel>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {personality.traits.map((trait) => (
                          <Badge key={trait}>{trait}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {personality.communicationStyle && (
                    <div>
                      <SectionLabel>Kommunikationsstil</SectionLabel>
                      <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{personality.communicationStyle}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-4 rounded-[var(--radius-sm)] bg-[var(--surface-2)] p-4">
                  <div>
                    <SectionLabel>So schreibst du an</SectionLabel>
                    {personality.outreachTips?.length > 0 ? (
                      <ul className="mt-2 flex flex-col gap-1.5">
                        {personality.outreachTips.map((tip) => (
                          <li key={tip} className="flex items-start gap-2 text-sm text-[var(--foreground)]">
                            <CheckIcon />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-[var(--muted)]">Keine Tipps hinterlegt.</p>
                    )}
                  </div>
                  <div>
                    <SectionLabel>Vermeide</SectionLabel>
                    {personality.avoid?.length > 0 ? (
                      <ul className="mt-2 flex flex-col gap-1.5">
                        {personality.avoid.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm text-[var(--foreground)]">
                            <CrossIcon />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-[var(--muted)]">Keine No-Gos hinterlegt.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyHint>Noch keine Persönlichkeitsanalyse vorhanden.</EmptyHint>
            )}
          </Card>

          <Card title="Werdegang" description={experience.length > 0 ? `${experience.length} Stationen` : undefined}>
            {experience.length > 0 ? (
              <ol className="relative ml-1 border-l border-[var(--border)]">
                {experience.map((exp, i) => (
                  <ExperienceItem key={`${exp.company}-${exp.title}-${i}`} exp={exp} />
                ))}
              </ol>
            ) : (
              <EmptyHint>
                {sourceGroup === "idealab" && source?.type === "conference"
                  ? "Nur Konferenz-Daten – kein LinkedIn-Werdegang hinterlegt."
                  : "Keine Berufserfahrung hinterlegt."}
              </EmptyHint>
            )}
          </Card>

          <Card title="Ausbildung">
            {education.length > 0 ? (
              <ul className="flex flex-col gap-4">
                {education.map((edu, i) => {
                  const detail = [edu.degree, edu.field].filter(Boolean).join(" · ");
                  const range = formatRange(edu.start, edu.end, "");
                  return (
                    <li key={`${edu.school}-${i}`} className="flex gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--surface-2)] text-xs font-semibold text-[var(--muted)]">
                        {initials(edu.school) || "–"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--foreground)]">{edu.school}</p>
                        {detail && <p className="text-sm text-[var(--muted)]">{detail}</p>}
                        {range && <p className="mt-0.5 text-xs tabular-nums text-[var(--muted)]">{range}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyHint>Keine Ausbildung hinterlegt.</EmptyHint>
            )}
          </Card>
        </div>

        {/* Seitenspalte */}
        <aside className="flex min-w-0 flex-col gap-4">
          <Card title="Team-Dimensionen" description="Skala 0–10, aus Profil und Werdegang abgeleitet">
            <div className="flex flex-col gap-3">
              {FOUNDER_DIM_KEYS.map((key) => (
                <ScoreBar key={key} label={FOUNDER_DIM_LABELS[key]} value={profile.dims?.[key] ?? 0} max={10} />
              ))}
            </div>
          </Card>

          <Card title="Sucht">
            <Chips items={(profile.lookingFor ?? []).map(sentenceCase)} tone="accent" />
          </Card>

          <Card title="Skills" description={profile.skills?.length ? `${profile.skills.length} Einträge` : undefined}>
            <Chips items={profile.skills ?? []} />
          </Card>

          {languages.length > 0 && (
            <Card title="Sprachen">
              <Chips items={languages} />
            </Card>
          )}

          <Card title="Verticals">
            <Chips items={(profile.verticals ?? []).map(formatVertical)} />
          </Card>

          {tags.length > 0 && (
            <Card title="Tags">
              <Chips items={tags} />
            </Card>
          )}

          <Card title="Quelle">
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-[var(--muted)]">Typ</dt>
              <dd className="text-[var(--foreground)]">{source ? SOURCE_TYPE_LABELS[source.type] ?? source.type : "Unbekannt"}</dd>
              {source?.scrapedAt && (
                <>
                  <dt className="text-[var(--muted)]">Stand</dt>
                  <dd className="text-[var(--foreground)]">{formatDate(source.scrapedAt)}</dd>
                </>
              )}
              <dt className="text-[var(--muted)]">Profil-ID</dt>
              <dd className="truncate font-mono text-xs text-[var(--foreground)]" title={profile.id}>
                {profile.id}
              </dd>
            </dl>
          </Card>

          <LinkButton href="/assistant" variant="ghost" className="w-full">
            Im Agenten besprechen
          </LinkButton>
        </aside>
      </div>
    </div>
  );
}
