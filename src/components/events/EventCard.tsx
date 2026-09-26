/**
 * EventCard – Kachel für die Event-Übersicht (/events).
 * Server-Component, keine Hooks.
 */
import Link from "next/link";

import { Badge, Card, cx } from "@/components/ui";
import type { Event } from "@/lib/types";

export const EVENT_TYPE_LABELS: Record<Event["type"], string> = {
  conference: "Konferenz",
  meetup: "Meetup",
  "demo-day": "Demo Day",
  hackathon: "Hackathon",
};

export function formatAttendeeCount(count: number): string {
  return count === 1 ? "1 Teilnehmer:in" : `${count} Teilnehmer:innen`;
}

export interface EventCardProps {
  event: Event;
  attendeeCount: number;
  /** Hebt das Event optisch hervor (z. B. als Hauptdatenquelle). */
  highlight?: boolean;
  className?: string;
}

export function EventCard({ event, attendeeCount, highlight = false, className }: EventCardProps) {
  const detailHref = `/events/${encodeURIComponent(event.slug)}`;
  const candidatesHref = `/candidates?event=${encodeURIComponent(event.slug)}`;

  return (
    <Card
      className={cx(
        "flex flex-col gap-3",
        highlight && "border-[var(--accent)] ring-1 ring-[var(--accent)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{EVENT_TYPE_LABELS[event.type]}</Badge>
        {highlight && <Badge tone="success">Hauptdatenquelle</Badge>}
        <span className="ml-auto text-xs text-[var(--muted)]">{formatAttendeeCount(attendeeCount)}</span>
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
          <Link href={detailHref} className="hover:underline">
            {event.name}
          </Link>
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {event.date} · {event.location}
        </p>
      </div>

      <p className="text-sm text-[var(--foreground)]">{event.description}</p>

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-sm">
        <Link href={detailHref} className="font-medium text-[var(--accent)] hover:underline">
          Teilnehmer ansehen
        </Link>
        <Link href={candidatesHref} className="font-medium text-[var(--accent)] hover:underline">
          In Kandidaten filtern
        </Link>
        {event.url && (
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-[var(--muted)] hover:text-[var(--foreground)] hover:underline"
          >
            Website ↗
          </a>
        )}
      </div>
    </Card>
  );
}
