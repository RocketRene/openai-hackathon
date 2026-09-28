/**
 * EventHero – große Karte für die Hauptdatenquelle (IdeaLab! 2026) auf /events:
 * Typ + „Hauptdatenquelle“, Titel, Datum/Ort, Beschreibung, CTAs und die Teilnehmerzahl als große Stat
 * mit Rollen-Aufschlüsselung. Server-Component, keine Hooks.
 */
import { Badge, Card, LinkButton } from "@/components/ui";
import { T } from "@/lib/i18n";
import type { Event, NetworkRole, Profile } from "@/lib/types";

import { EventMeta, eventCandidatesHref, eventDetailHref } from "./EventCard";
import { EventTypeLabel, NetworkRoleLabel } from "./EventLabels";
import { ArrowRightIcon } from "./icons";

const HERO_ROLES: NetworkRole[] = ["cofounder", "investor", "mentor"];

export function EventHero({ event, profiles }: { event: Event; profiles: Profile[] }) {
  const detailHref = eventDetailHref(event.slug);
  const candidatesHref = eventCandidatesHref(event.slug);

  const roleCounts = new Map<NetworkRole, number>();
  for (const profile of profiles) {
    roleCounts.set(profile.networkRole, (roleCounts.get(profile.networkRole) ?? 0) + 1);
  }

  return (
    <Card padding="lg" className="fr-fade-in relative overflow-hidden border-[var(--accent)]/30">
      {/* dezenter Akzent-Schein, nur Token */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--accent-soft)] opacity-70 blur-3xl"
      />

      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">
              <EventTypeLabel type={event.type} />
            </Badge>
            <Badge tone="success">
              <T de="Hauptdatenquelle" en="Primary data source" />
            </Badge>
          </div>

          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">{event.name}</h2>
          <EventMeta date={event.date} location={event.location} url={event.url} className="mt-2" />
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">{event.description}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            <LinkButton href={detailHref}>
              <T de="Teilnehmer ansehen" en="View attendees" />
              <ArrowRightIcon />
            </LinkButton>
            <LinkButton href={candidatesHref} variant="secondary">
              <T de="In Kandidaten filtern" en="Filter in candidates" />
            </LinkButton>
          </div>
        </div>

        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-5 lg:min-w-72">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            <T de="Teilnehmer:innen" en="Attendees" />
          </p>
          <p className="mt-1 text-5xl font-semibold tracking-tight tabular-nums text-[var(--foreground)]">{profiles.length}</p>
          <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-[var(--border)] pt-4">
            {HERO_ROLES.map((role) => (
              <div key={role} className="min-w-0">
                <dt className="truncate text-xs text-[var(--muted)]">
                  <NetworkRoleLabel role={role} plural />
                </dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums text-[var(--foreground)]">{roleCounts.get(role) ?? 0}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Card>
  );
}
