"use client";
/**
 * LinkedIn-artige Profilseite für eine:n Kandidat:in – "es muss alles anzeigbar sein".
 * Client-Komponente, weil der "Merken"-Toggle localStorage braucht
 * (Shortlist-Contract: Key `founderradar.shortlist.v1`, Wert string[] mit Profil-IDs).
 * Event-Namen werden von der Server-Page aufgelöst und als Prop übergeben, damit hier kein
 * Profil-JSON ins Client-Bundle wandert.
 */
import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import {
  FOUNDER_DIM_KEYS,
  FOUNDER_DIM_LABELS,
  PERSONALITY_LABELS,
  type Event as EventInfo,
  type FounderRole,
  type NetworkRole,
  type Profile,
  type Stage,
} from "@/lib/types";
import { Avatar, Badge, Button, Card, LinkButton, ScoreBar, cx } from "@/components/ui";
import MatchBreakdown from "./MatchBreakdown";

/* ------------------------------------------------------------------ */
/* Labels (modul-lokal, deutsch)                                       */
/* ------------------------------------------------------------------ */

const NETWORK_ROLE_LABELS: Record<NetworkRole, string> = {
  cofounder: "Co-Founder",
  investor: "Investor:in",
  mentor: "Mentor:in",
  talent: "Talent",
  expert: "Expert:in",
};

const FOUNDER_ROLE_LABELS: Record<FounderRole, string> = {
  tech: "Tech",
  commercial: "Commercial",
  product: "Produkt",
  design: "Design",
  operations: "Operations",
  "domain-expert": "Domain-Expert:in",
};

const STAGE_LABELS: Record<Stage, string> = {
  idea: "Idee",
  "pre-seed": "Pre-Seed",
  seed: "Seed",
  "series-a": "Series A",
  growth: "Growth",
};

const SOURCE_LABELS: Record<NonNullable<Profile["source"]>["type"], string> = {
  linkedin: "LinkedIn",
  conference: "Konferenz-App",
  manual: "Manuell erfasst",
  mock: "Mock-Daten",
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

/** ISO-Datum → "26.09.2026", deterministisch (kein toLocale → keine Hydration-Abweichung). */
function formatDate(iso?: string) {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
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

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg {...iconProps} fill={filled ? "currentColor" : "none"}>
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Shortlist ("Merken") – localStorage, Contract aus PARALLEL-WORK.md  */
/* ------------------------------------------------------------------ */

const SHORTLIST_KEY = "founderradar.shortlist.v1";
const SHORTLIST_EVENT = "founderradar:shortlist-changed";

function parseShortlist(raw: string | null): string[] {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function getShortlistSnapshot(): string {
  try {
    return window.localStorage.getItem(SHORTLIST_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

/** null = noch nicht hydriert (Server-Render). */
function getShortlistServerSnapshot(): string | null {
  return null;
}

function subscribeShortlist(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(SHORTLIST_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SHORTLIST_EVENT, onChange);
  };
}

function writeShortlist(ids: string[]) {
  try {
    window.localStorage.setItem(SHORTLIST_KEY, JSON.stringify(ids));
  } catch {
    /* ignore (Private Mode, Quota) */
  }
  window.dispatchEvent(new Event(SHORTLIST_EVENT));
}

export function ShortlistToggle({ profileId, className }: { profileId: string; className?: string }) {
  const raw = useSyncExternalStore(subscribeShortlist, getShortlistSnapshot, getShortlistServerSnapshot);
  const ready = raw !== null;
  const saved = ready && parseShortlist(raw).includes(profileId);

  const toggle = () => {
    const current = parseShortlist(getShortlistSnapshot());
    const next = current.includes(profileId) ? current.filter((id) => id !== profileId) : [...current, profileId];
    writeShortlist(next);
  };

  return (
    <Button
      variant={saved ? "primary" : "secondary"}
      onClick={toggle}
      disabled={!ready}
      aria-pressed={saved}
      title={saved ? "Von der Merkliste entfernen" : "Auf die Merkliste setzen"}
      className={className}
    >
      <BookmarkIcon filled={saved} />
      {saved ? "Gemerkt" : "Merken"}
    </Button>
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

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <Link href="/candidates" className="text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]">
        ← Alle Kandidat:innen
      </Link>

      {/* Header */}
      <header className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="shrink-0">
            <Avatar src={profile.photoUrl || undefined} name={profile.name} size={112} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">{profile.name}</h1>
            {profile.headline && <p className="mt-1 text-base text-[var(--muted)]">{profile.headline}</p>}
            {profile.location && (
              <p className="mt-1 inline-flex items-center gap-1 text-sm text-[var(--muted)]">
                <PinIcon />
                {profile.location}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone="accent">{NETWORK_ROLE_LABELS[profile.networkRole] ?? profile.networkRole}</Badge>
              {profile.founderRole && <Badge>{FOUNDER_ROLE_LABELS[profile.founderRole] ?? profile.founderRole}</Badge>}
              {personality?.type && <Badge tone="success">{PERSONALITY_LABELS[personality.type] ?? personality.type}</Badge>}
              {profile.stage && <Badge>{STAGE_LABELS[profile.stage] ?? profile.stage}</Badge>}
            </div>

            {(profile.linkedinUrl || profile.email) && (
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                {profile.linkedinUrl && (
                  <a
                    href={profile.linkedinUrl}
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
                  <a
                    href={`mailto:${profile.email}`}
                    className="inline-flex items-center gap-1.5 font-medium text-[var(--accent)] hover:underline"
                  >
                    <MailIcon />
                    {profile.email}
                  </a>
                )}
              </div>
            )}

            {eventItems.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-sm">
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
              </div>
            )}
          </div>
        </div>

        {/* Aktionsleiste */}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
          <LinkButton href={`/outreach?profile=${encodeURIComponent(profile.id)}`}>Outreach erzeugen</LinkButton>
          <LinkButton href={`/prep/${encodeURIComponent(profile.id)}`} variant="secondary">
            Gespräch vorbereiten
          </LinkButton>
          <LinkButton href="/assistant" variant="secondary">
            Im Agent besprechen
          </LinkButton>
          <ShortlistToggle profileId={profile.id} className="sm:ml-auto" />
        </div>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Hauptspalte */}
        <div className="flex flex-col gap-4">
          <Card title="Über">
            {profile.about ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--foreground)]">{profile.about}</p>
            ) : (
              <EmptyHint>Keine Beschreibung vorhanden.</EmptyHint>
            )}
          </Card>

          <MatchBreakdown profile={profile} />

          <Card
            title="Persönlichkeit"
            action={personality?.type ? <Badge tone="success">{PERSONALITY_LABELS[personality.type] ?? personality.type}</Badge> : undefined}
          >
            {personality ? (
              <>
                {personality.summary && <p className="text-sm leading-relaxed text-[var(--foreground)]">{personality.summary}</p>}
                {personality.traits?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {personality.traits.map((trait) => (
                      <Badge key={trait}>{trait}</Badge>
                    ))}
                  </div>
                )}
                {personality.communicationStyle && (
                  <div className="mt-4">
                    <SectionLabel>Kommunikationsstil</SectionLabel>
                    <p className="mt-1 text-sm text-[var(--muted)]">{personality.communicationStyle}</p>
                  </div>
                )}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
              </>
            ) : (
              <EmptyHint>Noch keine Persönlichkeitsanalyse vorhanden.</EmptyHint>
            )}
          </Card>

          <Card title="Erfahrung">
            {profile.experience?.length > 0 ? (
              <ol className="relative ml-1.5 border-l border-[var(--border)]">
                {profile.experience.map((exp, i) => (
                  <li key={`${exp.company}-${exp.title}-${i}`} className="relative pb-5 pl-5 last:pb-0">
                    <span className="absolute -left-[5.5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface)] bg-[var(--accent)]" />
                    <p className="text-sm font-semibold text-[var(--foreground)]">{exp.title}</p>
                    {exp.company && <p className="text-sm text-[var(--muted)]">{exp.company}</p>}
                    {formatRange(exp.start, exp.end, "heute") && (
                      <p className="mt-0.5 text-xs text-[var(--muted)]">{formatRange(exp.start, exp.end, "heute")}</p>
                    )}
                    {exp.description && (
                      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--foreground)]">{exp.description}</p>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyHint>Keine Berufserfahrung hinterlegt.</EmptyHint>
            )}
          </Card>

          <Card title="Ausbildung">
            {profile.education?.length > 0 ? (
              <ul className="flex flex-col gap-4">
                {profile.education.map((edu, i) => {
                  const detail = [edu.degree, edu.field].filter(Boolean).join(" · ");
                  const range = formatRange(edu.start, edu.end, "");
                  return (
                    <li key={`${edu.school}-${i}`} className="flex gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--surface-2)] text-xs font-semibold text-[var(--muted)]">
                        {initials(edu.school) || "–"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--foreground)]">{edu.school}</p>
                        {detail && <p className="text-sm text-[var(--muted)]">{detail}</p>}
                        {range && <p className="mt-0.5 text-xs text-[var(--muted)]">{range}</p>}
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
        <aside className="flex flex-col gap-4">
          <Card title="Skills">
            <Chips items={profile.skills ?? []} />
          </Card>

          {languages.length > 0 && (
            <Card title="Sprachen">
              <Chips items={languages} />
            </Card>
          )}

          <Card title="Sucht">
            <Chips items={profile.lookingFor ?? []} tone="accent" />
          </Card>

          <Card title="Verticals">
            <Chips items={profile.verticals ?? []} />
          </Card>

          {tags.length > 0 && (
            <Card title="Tags">
              <Chips items={tags} />
            </Card>
          )}

          <Card title="Team-Dimensionen">
            <div className="flex flex-col gap-3">
              {FOUNDER_DIM_KEYS.map((key) => (
                <ScoreBar key={key} label={FOUNDER_DIM_LABELS[key]} value={profile.dims?.[key] ?? 0} max={10} />
              ))}
            </div>
            <p className="mt-3 text-xs text-[var(--muted)]">Skala 0–10, aus Profil und Werdegang abgeleitet.</p>
          </Card>

          <Card title="Quelle">
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-[var(--muted)]">Typ</dt>
              <dd className="text-[var(--foreground)]">{source ? SOURCE_LABELS[source.type] ?? source.type : "Unbekannt"}</dd>
              {source?.scrapedAt && (
                <>
                  <dt className="text-[var(--muted)]">Stand</dt>
                  <dd className="text-[var(--foreground)]">{formatDate(source.scrapedAt)}</dd>
                </>
              )}
              <dt className="text-[var(--muted)]">Profil-ID</dt>
              <dd className={cx("truncate font-mono text-xs text-[var(--foreground)]")} title={profile.id}>
                {profile.id}
              </dd>
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  );
}
