import Link from "next/link";
import type { ReactNode } from "react";
import { getEvents, getProfilesForEvent } from "@/lib/data";
import type { Event as FounderEvent } from "@/lib/types";
import { Badge, Card, LinkButton, SectionTitle } from "@/components/ui";
import DashboardHero from "./DashboardHero";
import StatsRow from "./StatsRow";
import TopMatches from "./TopMatches";

/* ------------------------------------------------------------------ */
/* Icons (inline SVG, keine Dependency)                                */
/* ------------------------------------------------------------------ */

const svgProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const ICONS: Record<string, ReactNode> = {
  agent: (
    <svg {...svgProps}>
      <path d="M12 3v3" />
      <rect x="4" y="6" width="16" height="12" rx="3" />
      <circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <path d="M9 18v3M15 18v3" />
    </svg>
  ),
  candidates: (
    <svg {...svgProps}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 15.5a5 5 0 0 1 5.5 4.5" />
    </svg>
  ),
  outreach: (
    <svg {...svgProps}>
      <path d="m3 11 18-7-7 18-2.5-7.5L3 11Z" />
    </svg>
  ),
  team: (
    <svg {...svgProps}>
      <path d="M12 3 3 9v10h18V9l-9-6Z" />
      <path d="M12 3v18M3 9h18" />
    </svg>
  ),
  tips: (
    <svg {...svgProps}>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.7.6 1 1.3 1 2.1h5c0-.8.3-1.5 1-2.1A6 6 0 0 0 12 3Z" />
    </svg>
  ),
  events: (
    <svg {...svgProps}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  shortlist: (
    <svg {...svgProps}>
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  ),
  network: (
    <svg {...svgProps}>
      <circle cx="5" cy="12" r="2" />
      <circle cx="19" cy="6" r="2" />
      <circle cx="19" cy="18" r="2" />
      <path d="m7 11 10-4M7 13l10 4" />
    </svg>
  ),
};

/* ------------------------------------------------------------------ */
/* Inhalte                                                             */
/* ------------------------------------------------------------------ */

interface QuickLink {
  href: string;
  icon: keyof typeof ICONS;
  title: string;
  text: string;
}

const QUICK_LINKS: QuickLink[] = [
  { href: "/assistant", icon: "agent", title: "Agent & Voice", text: "Per Text oder Sprache interviewen lassen, Kandidaten live vorgeschlagen bekommen." },
  { href: "/candidates", icon: "candidates", title: "Kandidaten", text: "Alle Profile nach Rolle, Vertical, Event und Match-Score durchsuchen." },
  { href: "/outreach", icon: "outreach", title: "Outreach", text: "Nachrichten, die zum Persönlichkeitstyp der Person passen." },
  { href: "/team", icon: "team", title: "Team-Radar", text: "Welche Stärken deinem Gründerteam noch fehlen." },
  { href: "/tips", icon: "tips", title: "Tipps", text: "Konkrete Empfehlungen auf Basis deines Kontexts." },
  { href: "/events", icon: "events", title: "Events", text: "Konferenzen und Meetups mit Teilnehmerlisten." },
  { href: "/shortlist", icon: "shortlist", title: "Shortlist", text: "Gemerkte Kandidaten, bereit für Outreach und Prep." },
  { href: "/network", icon: "network", title: "Netzwerk", text: "Wer kennt wen – Verbindungen über Verticals und Events." },
];

const STEPS: Array<{ title: string; text: string }> = [
  { title: "Kontext geben", text: "Rolle, Vertical, Idee und Stärken – per Formular oder Agent-Interview." },
  { title: "Kandidaten sichten", text: "Der Match-Score priorisiert Co-Founder, Investor:innen, Mentor:innen und Talente." },
  { title: "Outreach senden", text: "Weniger, aber bessere Anschreiben – passend zum Persönlichkeitstyp." },
  { title: "Gespräch vorbereiten", text: "Talking Points, Eisbrecher, Red Flags – optional als Voice-Simulation." },
];

const EVENT_TYPE_LABELS: Record<FounderEvent["type"], string> = {
  conference: "Konferenz",
  meetup: "Meetup",
  "demo-day": "Demo Day",
  hackathon: "Hackathon",
};

const MAX_UPCOMING = 3;

function PinIcon() {
  return (
    <svg {...svgProps} width={14} height={14}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

/** Startseiten-Inhalt: Hero, KPIs, Top-Matches, Schnellzugriff, nächstes Event (Server-Component). */
export default function DashboardHome() {
  const events = getEvents().map((event) => ({ event, attendees: getProfilesForEvent(event.slug).length }));
  const [next, ...upcoming] = events;

  return (
    <div className="space-y-8">
      <DashboardHero />
      <StatsRow />
      <TopMatches />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="quick-access">
          <SectionTitle>
            <span id="quick-access">Schnellzugriff</span>
          </SectionTitle>
          <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {QUICK_LINKS.map((item) => (
              <li key={item.href} className="min-w-0">
                <Link
                  href={item.href}
                  className="group flex h-full flex-col gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] transition hover:border-[var(--accent)]/50 hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent-soft)] text-[var(--accent)]">
                    {ICONS[item.icon]}
                  </span>
                  <span className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)]">{item.title}</span>
                  <span className="text-xs leading-snug text-[var(--muted)]">{item.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="next-event">
          <SectionTitle
            action={
              <Link href="/events" className="text-sm font-medium text-[var(--accent)] hover:underline">
                Alle Events →
              </Link>
            }
          >
            <span id="next-event">Nächstes Event</span>
          </SectionTitle>

          {!next ? (
            <Card>
              <p className="text-sm text-[var(--muted)]">Noch keine Events hinterlegt.</p>
            </Card>
          ) : (
            <Card padding="lg" className="flex h-full flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">{EVENT_TYPE_LABELS[next.event.type]}</Badge>
                <span className="text-xs font-medium text-[var(--muted)]">{next.event.date}</span>
              </div>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-[var(--foreground)]">{next.event.name}</h3>
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-[var(--muted)]">
                <PinIcon />
                {next.event.location}
              </p>
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[var(--muted)]">{next.event.description}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="text-sm text-[var(--foreground)]">
                  <span className="text-lg font-semibold tabular-nums">{next.attendees.toLocaleString("de-DE")}</span>{" "}
                  <span className="text-[var(--muted)]">Teilnehmer:innen im Radar</span>
                </span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <LinkButton href={`/events/${encodeURIComponent(next.event.slug)}`}>Teilnehmer:innen ansehen</LinkButton>
                <LinkButton href={`/candidates?event=${encodeURIComponent(next.event.slug)}`} variant="secondary">
                  Als Filter
                </LinkButton>
              </div>

              {upcoming.length > 0 && (
                <ul className="mt-6 divide-y divide-[var(--border)] border-t border-[var(--border)]">
                  {upcoming.slice(0, MAX_UPCOMING).map(({ event, attendees }) => (
                    <li key={event.slug} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <Link
                          href={`/events/${encodeURIComponent(event.slug)}`}
                          className="block truncate text-sm font-medium text-[var(--foreground)] hover:text-[var(--accent)]"
                        >
                          {event.name}
                        </Link>
                        <p className="truncate text-xs text-[var(--muted)]">
                          {event.date} · {event.location}
                        </p>
                      </div>
                      <Badge>{attendees}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </section>
      </div>

      <section aria-labelledby="how-it-works">
        <SectionTitle>
          <span id="how-it-works">So funktioniert Voya</span>
        </SectionTitle>
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]/60 p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--foreground)]">{step.title}</p>
                <p className="mt-0.5 text-xs leading-snug text-[var(--muted)]">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
