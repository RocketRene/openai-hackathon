import Link from "next/link";
import { getEvents, getProfilesForEvent } from "@/lib/data";
import type { Event as FounderEvent } from "@/lib/types";
import { Card, EmptyState } from "@/components/ui";
import { SECTION_LINK_CLS } from "./shared";

const MAX_EVENTS = 6;

const EVENT_TYPE_LABELS: Record<FounderEvent["type"], string> = {
  conference: "Konferenz",
  meetup: "Meetup",
  "demo-day": "Demo Day",
  hackathon: "Hackathon",
};

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mär: 2,
  mar: 2,
  apr: 3,
  mai: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  okt: 9,
  nov: 10,
  dez: 11,
};

interface ParsedDate {
  /** z. B. "25.–26." oder "15." */
  day: string;
  /** z. B. "Sep" */
  month: string;
  sortKey: number;
}

/**
 * Freitext-Datum ("25.–26. Sep 2026", "15. Okt 2026") für die Datums-Kachel zerlegen.
 * Unbekannte Formate liefern null – dann wird der Rohtext angezeigt.
 */
function parseEventDate(date: string): ParsedDate | null {
  const m = date.match(/^\s*(\d{1,2}\.(?:\s*[–-]\s*\d{1,2}\.)?)\s*([A-Za-zÄÖÜäöü]{3})[A-Za-zÄÖÜäöü]*\.?\s*(\d{4})\s*$/);
  if (!m) return null;
  const monthIdx = MONTHS[m[2].toLowerCase()];
  if (monthIdx === undefined) return null;
  const firstDay = parseInt(m[1], 10);
  return {
    day: m[1].replace(/\s+/g, ""),
    month: m[2],
    sortKey: Date.UTC(Number(m[3]), monthIdx, firstDay),
  };
}

function DateTile({ date, parsed }: { date: string; parsed: ParsedDate | null }) {
  return (
    <div
      className="flex h-11 w-16 shrink-0 flex-col items-center justify-center overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] leading-none"
      title={date}
    >
      <span className="sr-only">{date}</span>
      {parsed ? (
        <>
          <span aria-hidden className="text-[13px] font-semibold tabular-nums text-[var(--foreground)]">
            {parsed.day}
          </span>
          <span aria-hidden className="mt-1 text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
            {parsed.month}
          </span>
        </>
      ) : (
        <span aria-hidden className="px-1 text-center text-[10px] font-medium text-[var(--muted)]">
          {date}
        </span>
      )}
    </div>
  );
}

/** Nächste Events als Zeilen: Datum, Name, Ort/Typ, Teilnehmerzahl (Server-Component). */
export default function UpcomingEvents() {
  const events = getEvents()
    .map((event) => ({
      event,
      attendees: getProfilesForEvent(event.slug).length,
      parsed: parseEventDate(event.date),
    }))
    .sort((a, b) => (a.parsed?.sortKey ?? Number.MAX_SAFE_INTEGER) - (b.parsed?.sortKey ?? Number.MAX_SAFE_INTEGER))
    .slice(0, MAX_EVENTS);

  return (
    <Card
      className="h-full"
      title="Nächste Events"
      description="Konferenzen und Meetups mit Teilnehmerlisten"
      action={
        <Link href="/events" className={SECTION_LINK_CLS}>
          Alle Events →
        </Link>
      }
    >
      {events.length === 0 ? (
        <EmptyState
          icon="▣"
          title="Noch keine Events hinterlegt"
          body="Sobald Events angelegt sind, erscheinen sie hier mit Teilnehmerlisten."
        />
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {events.map(({ event, attendees, parsed }) => (
            <li key={event.slug} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <DateTile date={event.date} parsed={parsed} />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/events/${event.slug}`}
                  className="block truncate text-sm font-medium text-[var(--foreground)] hover:underline"
                >
                  {event.name}
                </Link>
                <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                  {event.location} · {EVENT_TYPE_LABELS[event.type]}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-semibold tabular-nums text-[var(--foreground)]">
                  {attendees.toLocaleString("de-DE")}
                </div>
                <div className="text-[11px] text-[var(--muted)]">Teilnehmer:innen</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
