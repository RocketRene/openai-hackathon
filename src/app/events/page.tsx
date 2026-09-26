/**
 * /events – Übersicht aller Konferenzen/Meetups als Kontaktquelle.
 * Server-Component; Daten ausschließlich über src/lib/data.ts.
 */
import type { Metadata } from "next";

import { EventCard } from "@/components/events/EventCard";
import { EmptyState, PageHeader } from "@/components/ui";
import { getEvents, getProfilesForEvent } from "@/lib/data";

export const metadata: Metadata = {
  title: "Events – FounderRadar",
  description: "Konferenzen und Meetups als Quelle deiner Kontakte.",
};

/** Die IdeaLab! 2026 ist die Hauptdatenquelle (569 echte Teilnehmer:innen). */
const FEATURED_SLUG = "idealab-2026";

export default function EventsPage() {
  const events = [...getEvents()].sort(
    (a, b) => Number(b.slug === FEATURED_SLUG) - Number(a.slug === FEATURED_SLUG),
  );
  const attendeeCounts = new Map(events.map((event) => [event.slug, getProfilesForEvent(event.slug).length]));
  const totalAttendees = Array.from(attendeeCounts.values()).reduce((sum, n) => sum + n, 0);

  return (
    <div>
      <PageHeader
        title="Events"
        subtitle="Konferenzen und Meetups als Quelle deiner Kontakte"
        action={
          <p className="text-sm text-[var(--muted)]">
            {events.length} {events.length === 1 ? "Event" : "Events"} · {totalAttendees} Teilnahmen
          </p>
        }
      />

      {events.length === 0 ? (
        <EmptyState title="Keine Events vorhanden" body="In src/data/events.json sind noch keine Events hinterlegt." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => {
            const featured = event.slug === FEATURED_SLUG;
            return (
              <EventCard
                key={event.slug}
                event={event}
                attendeeCount={attendeeCounts.get(event.slug) ?? 0}
                highlight={featured}
                className={featured ? "md:col-span-2 xl:col-span-3" : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
