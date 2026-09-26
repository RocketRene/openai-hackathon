import Link from "next/link";
import { getEvents, getProfilesForEvent } from "@/lib/data";
import type { Event as FounderEvent } from "@/lib/types";
import { Badge, Card } from "@/components/ui";
import StatsRow from "./StatsRow";
import TopMatches from "./TopMatches";

interface QuickLink {
  href: string;
  title: string;
  text: string;
}

const QUICK_LINKS: QuickLink[] = [
  {
    href: "/assistant",
    title: "Agent & Voice",
    text: "Lass dich per Text oder Sprache interviewen und bekomme sofort passende Kandidaten vorgeschlagen.",
  },
  {
    href: "/candidates",
    title: "Kandidaten",
    text: "Durchsuche alle Profile nach Rolle, Vertical, Event, Persönlichkeitstyp und Match-Score.",
  },
  {
    href: "/outreach",
    title: "Outreach",
    text: "Erzeuge personalisierte Nachrichten, die zum Persönlichkeitstyp der Person passen.",
  },
  {
    href: "/team",
    title: "Team-Radar",
    text: "Sieh auf einen Blick, welche Stärken deinem Gründerteam noch fehlen.",
  },
  {
    href: "/tips",
    title: "Tipps",
    text: "Was fehlt deinem Start-up? Konkrete Empfehlungen auf Basis deines Kontexts.",
  },
  {
    href: "/events",
    title: "Events",
    text: "Konferenzen und Meetups mit Teilnehmerlisten – die Quelle deiner Kontakte.",
  },
  {
    href: "/shortlist",
    title: "Shortlist",
    text: "Alle gemerkten Kandidaten an einem Ort, bereit für Outreach und Prep.",
  },
  {
    href: "/network",
    title: "Netzwerk-Analyse",
    text: "Wer kennt wen? Verbindungen zwischen Kontakten, Verticals und Events.",
  },
];

const STEPS: Array<{ title: string; text: string }> = [
  {
    title: "Kontext geben",
    text: "Onboarding ausfüllen oder den Agenten interviewen lassen: Rolle, Vertical, Idee und Stärken.",
  },
  {
    title: "Kandidaten sichten",
    text: "Der Match-Score priorisiert Co-Founder, Investor:innen, Mentor:innen und Talente für dich.",
  },
  {
    title: "Outreach senden",
    text: "Personalisierte Nachrichten passend zum Persönlichkeitstyp – weniger, aber bessere Anschreiben.",
  },
  {
    title: "Gespräch vorbereiten",
    text: "Prep-Pack mit Talking Points, Eisbrechern und Red Flags – optional als Voice-Simulation.",
  },
];

const EVENT_TYPE_LABELS: Record<FounderEvent["type"], string> = {
  conference: "Konferenz",
  meetup: "Meetup",
  "demo-day": "Demo Day",
  hackathon: "Hackathon",
};

const MAX_EVENTS = 6;

/** Startseiten-Inhalt: KPIs, Top-Matches, Schnellzugriff, Events, Erklärung (Server-Component). */
export default function DashboardHome() {
  const events = getEvents()
    .slice(0, MAX_EVENTS)
    .map((event) => ({ event, attendees: getProfilesForEvent(event.slug).length }));

  return (
    <div className="space-y-6">
      <StatsRow />

      <TopMatches />

      <section aria-labelledby="quick-access">
        <h2 id="quick-access" className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          Schnellzugriff
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-[var(--accent)]"
            >
              <div className="text-sm font-semibold text-[var(--foreground)]">{item.title}</div>
              <p className="mt-1 text-xs text-[var(--muted)]">{item.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Nächste Events"
          action={
            <Link href="/events" className="text-sm font-medium text-[var(--accent)] hover:underline">
              Alle Events →
            </Link>
          }
        >
          {events.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Noch keine Events hinterlegt.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {events.map(({ event, attendees }) => (
                <li key={event.slug} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/events/${event.slug}`}
                      className="block truncate text-sm font-medium text-[var(--foreground)] hover:underline"
                    >
                      {event.name}
                    </Link>
                    <div className="truncate text-xs text-[var(--muted)]">
                      {event.date} · {event.location} · {EVENT_TYPE_LABELS[event.type]}
                    </div>
                  </div>
                  <Badge tone={attendees > 0 ? "accent" : "neutral"}>
                    {attendees} Teilnehmer:innen
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="So funktioniert's">
          <ol className="space-y-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]">
                  {index + 1}
                </span>
                <div>
                  <div className="text-sm font-medium text-[var(--foreground)]">{step.title}</div>
                  <p className="text-xs text-[var(--muted)]">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
