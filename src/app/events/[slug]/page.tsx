/**
 * /events/[slug] – Event-Detail: Header, Teilnehmer-Statistiken, Teilnehmerliste.
 * Server-Component; Daten ausschließlich über src/lib/data.ts.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AttendeeStats, FOUNDER_ROLE_LABELS, NETWORK_ROLE_LABELS } from "@/components/events/AttendeeStats";
import { EVENT_TYPE_LABELS, formatAttendeeCount } from "@/components/events/EventCard";
import { Avatar, Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { getEvent, getEvents, getProfilesForEvent } from "@/lib/data";
import type { NetworkRole } from "@/lib/types";

/** Mehr Zeilen werden nicht gerendert – darüber hinaus geht es in die Kandidatensuche. */
const MAX_LISTED = 100;

const NETWORK_ROLES: NetworkRole[] = ["cofounder", "investor", "mentor", "expert", "talent"];

const CHIP_CLASS =
  "inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-2)]";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return getEvents().map((event) => ({ slug: event.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const event = getEvent(slug);
  return {
    title: event ? `${event.name} – FounderRadar` : "Event nicht gefunden – FounderRadar",
    description: event?.description,
  };
}

export default async function EventDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) notFound();

  const profiles = getProfilesForEvent(event.slug);
  const sorted = [...profiles].sort((a, b) => a.name.localeCompare(b.name, "de"));
  const listed = sorted.slice(0, MAX_LISTED);
  const truncated = profiles.length > MAX_LISTED;

  const candidatesHref = `/candidates?event=${encodeURIComponent(event.slug)}`;

  const roleCounts = new Map<NetworkRole, number>();
  for (const profile of profiles) {
    roleCounts.set(profile.networkRole, (roleCounts.get(profile.networkRole) ?? 0) + 1);
  }

  return (
    <div>
      <nav className="mb-4 text-sm text-[var(--muted)]">
        <Link href="/events" className="hover:underline">
          ← Alle Events
        </Link>
      </nav>

      <PageHeader
        title={event.name}
        subtitle={`${event.date} · ${event.location}`}
        action={<LinkButton href={candidatesHref}>In Kandidaten filtern</LinkButton>}
      />

      <section className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">{EVENT_TYPE_LABELS[event.type]}</Badge>
          <Badge>{formatAttendeeCount(profiles.length)}</Badge>
          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] hover:underline"
            >
              Website ↗
            </a>
          )}
        </div>
        <p className="max-w-3xl text-sm text-[var(--foreground)]">{event.description}</p>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-[var(--muted)]">Filtern nach Rolle:</span>
          <Link href={candidatesHref} className={CHIP_CLASS}>
            Alle <span className="text-[var(--muted)]">({profiles.length})</span>
          </Link>
          {NETWORK_ROLES.map((role) => {
            const count = roleCounts.get(role) ?? 0;
            if (count === 0) return null;
            return (
              <Link key={role} href={`${candidatesHref}&networkRole=${role}`} className={CHIP_CLASS}>
                {NETWORK_ROLE_LABELS[role]} <span className="text-[var(--muted)]">({count})</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">Wer ist da?</h2>
        <AttendeeStats profiles={profiles} />
      </section>

      <Card
        title={`Teilnehmer:innen (${profiles.length})`}
        action={
          truncated ? (
            <Link href={candidatesHref} className="text-sm font-medium text-[var(--accent)] hover:underline">
              Alle in Kandidaten öffnen
            </Link>
          ) : undefined
        }
      >
        {profiles.length === 0 ? (
          <EmptyState
            title="Noch keine Teilnehmer:innen"
            body="Für dieses Event wurden noch keine Profile importiert."
            action={<LinkButton href="/candidates" variant="secondary">Alle Kandidaten ansehen</LinkButton>}
          />
        ) : (
          <>
            <ul className="divide-y divide-[var(--border)]">
              {listed.map((profile) => (
                <li key={profile.id} className="flex items-center gap-3 py-2">
                  <Avatar src={profile.photoUrl} name={profile.name} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/candidates/${encodeURIComponent(profile.id)}`}
                        className="truncate text-sm font-medium text-[var(--foreground)] hover:underline"
                      >
                        {profile.name}
                      </Link>
                      <Badge tone="accent">{NETWORK_ROLE_LABELS[profile.networkRole] ?? profile.networkRole}</Badge>
                      {profile.founderRole && <Badge>{FOUNDER_ROLE_LABELS[profile.founderRole] ?? profile.founderRole}</Badge>}
                    </div>
                    {profile.headline && <p className="truncate text-xs text-[var(--muted)]">{profile.headline}</p>}
                  </div>
                  {profile.verticals.length > 0 && (
                    <div className="hidden shrink-0 flex-wrap justify-end gap-1 sm:flex">
                      {profile.verticals.slice(0, 3).map((vertical) => (
                        <Badge key={vertical}>{vertical}</Badge>
                      ))}
                      {profile.verticals.length > 3 && <Badge>+{profile.verticals.length - 3}</Badge>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {truncated && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3 text-sm text-[var(--muted)]">
                <span>
                  Es werden die ersten {MAX_LISTED} von {profiles.length} Teilnehmer:innen angezeigt.
                </span>
                <LinkButton href={candidatesHref} variant="secondary">
                  Alle in Kandidaten öffnen
                </LinkButton>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
