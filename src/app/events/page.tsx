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

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <PageHeader title="Events" subtitle="Konferenzen und Meetups als Quelle deiner Kontakte" />

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
                attendeeCount={getProfilesForEvent(event.slug).length}
                highlight={featured}
                className={featured ? "md:col-span-2 xl:col-span-3" : undefined}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
