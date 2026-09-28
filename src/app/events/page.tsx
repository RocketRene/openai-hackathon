/**
 * /events – Übersicht aller Konferenzen/Meetups als Kontaktquelle.
 * Server-Component; Daten ausschließlich über src/lib/data.ts. Texte DE/EN über <T>.
 */
import type { Metadata } from "next";

import { EventCard } from "@/components/events/EventCard";
import { EventHero } from "@/components/events/EventHero";
import { Badge, EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { T } from "@/lib/i18n";
import { getEvents, getProfilesForEvent } from "@/lib/data";

export const metadata: Metadata = {
  title: "Events – Voya",
  description: "Konferenzen und Meetups als Quelle deiner Kontakte.",
};

/** Die IdeaLab! 2026 ist die Hauptdatenquelle (569 echte Teilnehmer:innen). */
const FEATURED_SLUG = "idealab-2026";

export default function EventsPage() {
  const events = getEvents();
  const featured = events.find((event) => event.slug === FEATURED_SLUG);
  const others = events.filter((event) => event.slug !== FEATURED_SLUG);

  const attendeeCounts = new Map(events.map((event) => [event.slug, getProfilesForEvent(event.slug).length]));
  const totalAttendees = Array.from(attendeeCounts.values()).reduce((sum, n) => sum + n, 0);

  return (
    <div>
      <PageHeader
        eyebrow={<T de="Kontaktquellen" en="Contact sources" />}
        title="Events"
        subtitle={
          <T
            de="Konferenzen und Meetups als Quelle deiner Kontakte – wer war da, und wen solltest du kennen?"
            en="Conferences and meetups as the source of your contacts – who was there, and who should you know?"
          />
        }
        action={
          <>
            <Badge className="tabular-nums">
              {events.length} <T de={events.length === 1 ? "Event" : "Events"} en={events.length === 1 ? "event" : "events"} />
            </Badge>
            <Badge className="tabular-nums">
              {totalAttendees} <T de="Teilnahmen" en="attendances" />
            </Badge>
          </>
        }
      />

      {events.length === 0 ? (
        <EmptyState
          title={<T de="Keine Events vorhanden" en="No events yet" />}
          body={
            <T
              de="In src/data/events.json sind noch keine Events hinterlegt."
              en="No events have been added to src/data/events.json yet."
            />
          }
        />
      ) : (
        <div className="space-y-10">
          {featured && <EventHero event={featured} profiles={getProfilesForEvent(featured.slug)} />}

          {others.length > 0 && (
            <section>
              <SectionTitle
                action={
                  <span className="text-xs tabular-nums text-[var(--muted)]">
                    {others.length} <T de="Events" en="events" />
                  </span>
                }
              >
                {featured ? <T de="Weitere Events" en="More events" /> : <T de="Alle Events" en="All events" />}
              </SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {others.map((event) => (
                  <EventCard key={event.slug} event={event} attendeeCount={attendeeCounts.get(event.slug) ?? 0} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
