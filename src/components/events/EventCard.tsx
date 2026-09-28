/**
 * EventCard – Kachel für die Event-Übersicht (/events) plus die geteilte Datum/Ort-Zeile `EventMeta`.
 * Server-Component, keine Hooks; sichtbare Texte über <T>, Labels über EventLabels.
 */
import Link from "next/link";

import { Badge, Card, LinkButton, cx } from "@/components/ui";
import { T } from "@/lib/i18n";
import type { Event } from "@/lib/types";

import { AttendeeCount, EventTypeLabel } from "./EventLabels";
import { ArrowRightIcon, CalendarIcon, ExternalLinkIcon, MapPinIcon, UsersIcon } from "./icons";

export function eventDetailHref(slug: string): string {
  return `/events/${encodeURIComponent(slug)}`;
}

export function eventCandidatesHref(slug: string): string {
  return `/candidates?event=${encodeURIComponent(slug)}`;
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Website";
  }
}

/** Datum · Ort · Website als eine Zeile mit Icons (nur <span>/<a>, daher auch in <p> erlaubt). */
export function EventMeta({
  date,
  location,
  url,
  size = "sm",
  className,
}: {
  date: string;
  location: string;
  url?: string;
  size?: "sm" | "base";
  className?: string;
}) {
  return (
    <span
      className={cx(
        "flex flex-wrap items-center gap-x-4 gap-y-1 text-[var(--muted)]",
        size === "base" ? "text-base" : "text-sm",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        <CalendarIcon />
        {date}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <MapPinIcon />
        {location}
      </span>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 transition-colors hover:text-[var(--foreground)]"
        >
          {hostname(url)}
          <ExternalLinkIcon size={12} />
        </a>
      )}
    </span>
  );
}

export interface EventCardProps {
  event: Event;
  attendeeCount: number;
  className?: string;
}

export function EventCard({ event, attendeeCount, className }: EventCardProps) {
  const detailHref = eventDetailHref(event.slug);
  const candidatesHref = eventCandidatesHref(event.slug);

  return (
    <Card interactive className={cx("fr-fade-in flex flex-col gap-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <Badge tone="accent">
          <EventTypeLabel type={event.type} />
        </Badge>
        <span className="inline-flex items-center gap-1.5 text-xs tabular-nums text-[var(--muted)]">
          <UsersIcon />
          <AttendeeCount count={attendeeCount} />
        </span>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
          <Link href={detailHref} className="transition-colors hover:text-[var(--accent)]">
            {event.name}
          </Link>
        </h2>
        <EventMeta date={event.date} location={event.location} url={event.url} />
        <p className="line-clamp-3 text-sm leading-relaxed text-[var(--muted)]">{event.description}</p>
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <LinkButton href={detailHref} size="sm" variant="secondary">
          <T de="Teilnehmer ansehen" en="View attendees" />
          <ArrowRightIcon />
        </LinkButton>
        <LinkButton href={candidatesHref} size="sm" variant="ghost">
          <T de="In Kandidaten filtern" en="Filter in candidates" />
        </LinkButton>
      </div>
    </Card>
  );
}
