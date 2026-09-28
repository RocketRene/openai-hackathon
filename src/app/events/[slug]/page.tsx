/**
 * /events/[slug] – Event-Detail: Kopf, KPI-Reihe, Rollen-Filter, Verteilungen, Teilnehmerliste.
 * Server-Component; Daten ausschließlich über src/lib/data.ts. Texte DE/EN über <T>.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AttendeeStats } from "@/components/events/AttendeeStats";
import { EventMeta, eventCandidatesHref } from "@/components/events/EventCard";
import { EventTypeLabel, FounderRoleLabel, NetworkRoleLabel } from "@/components/events/EventLabels";
import { ArrowLeftIcon, ArrowRightIcon, FilterIcon } from "@/components/events/icons";
import { Avatar, Badge, Card, EmptyState, LinkButton, PageHeader, SectionTitle, Stat } from "@/components/ui";
import { T } from "@/lib/i18n";
import { getEvent, getEvents, getProfilesForEvent } from "@/lib/data";
import type { NetworkRole } from "@/lib/types";

/** Mehr Zeilen werden nicht gerendert – darüber hinaus geht es in die Kandidatensuche. */
const MAX_LISTED = 100;

const NETWORK_ROLES: NetworkRole[] = ["cofounder", "investor", "mentor", "expert", "talent"];
const STAT_ROLES: NetworkRole[] = ["cofounder", "investor", "mentor"];

/** Chip-Optik (wie <Chip>, aber als Link – die Filter führen in die Kandidatensuche). */
const CHIP_LINK_CLASS =
  "inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--foreground)] transition hover:border-[var(--accent)]/40 hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return getEvents().map((event) => ({ slug: event.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const event = getEvent(slug);
  return {
    title: event ? `${event.name} – Voya` : "Event nicht gefunden – Voya",
    description: event?.description,
  };
}

export default async function EventDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) notFound();

  const profiles = getProfilesForEvent(event.slug);
  const total = profiles.length;
  const sorted = [...profiles].sort((a, b) => a.name.localeCompare(b.name, "de"));
  const listed = sorted.slice(0, MAX_LISTED);
  const truncated = total > MAX_LISTED;

  const candidatesHref = eventCandidatesHref(event.slug);
  const roleHref = (role: NetworkRole) => `${candidatesHref}&networkRole=${role}`;

  const roleCounts = new Map<NetworkRole, number>();
  for (const profile of profiles) {
    roleCounts.set(profile.networkRole, (roleCounts.get(profile.networkRole) ?? 0) + 1);
  }
  const withLinkedin = profiles.filter((p) => Boolean(p.linkedinUrl)).length;
  const share = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <ArrowLeftIcon />
          <T de="Alle Events" en="All events" />
        </Link>
      </nav>

      <PageHeader
        kicker={<EventTypeLabel type={event.type} />}
        title={event.name}
        subtitle={
          <>
            <EventMeta date={event.date} location={event.location} url={event.url} className="text-base" />
            <span className="mt-3 block">{event.description}</span>
          </>
        }
        action={
          <LinkButton href={candidatesHref}>
            <FilterIcon />
            <T de="In Kandidaten filtern" en="Filter in candidates" />
          </LinkButton>
        }
      />

      {/* KPI-Reihe */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          value={total}
          label={<T de="Teilnehmer:innen" en="Attendees" />}
          hint={
            <>
              <span className="tabular-nums">{withLinkedin}</span> <T de="mit LinkedIn-Profil" en="with LinkedIn profile" />
            </>
          }
          href={candidatesHref}
        />
        {STAT_ROLES.map((role) => {
          const count = roleCounts.get(role) ?? 0;
          return (
            <Stat
              key={role}
              value={count}
              label={<NetworkRoleLabel role={role} plural />}
              hint={
                <>
                  <span className="tabular-nums">
                    <T de={`${share(count)} %`} en={`${share(count)}%`} />
                  </span>{" "}
                  <T de="der Teilnehmer:innen" en="of attendees" />
                </>
              }
              href={roleHref(role)}
            />
          );
        })}
      </div>

      {/* Rollen-Filter als Chip-Reihe (Links in die Kandidatensuche) */}
      {total > 0 && (
        <section className="mb-8">
          <p className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            <FilterIcon size={12} />
            <T de="Nach Rolle filtern" en="Filter by role" />
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={candidatesHref} className={CHIP_LINK_CLASS}>
              <T de="Alle" en="All" />
              <span className="tabular-nums text-[var(--muted)]">{total}</span>
            </Link>
            {NETWORK_ROLES.map((role) => {
              const count = roleCounts.get(role) ?? 0;
              if (count === 0) return null;
              return (
                <Link key={role} href={roleHref(role)} className={CHIP_LINK_CLASS}>
                  <NetworkRoleLabel role={role} plural />
                  <span className="tabular-nums text-[var(--muted)]">{count}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Verteilungen */}
      <section className="mb-8">
        <SectionTitle
          action={
            total > 0 ? (
              <span className="text-xs text-[var(--muted)]">
                <T de="Anteile an allen Teilnehmer:innen" en="Share of all attendees" />
              </span>
            ) : undefined
          }
        >
          <T de="Wer ist da?" en="Who's attending?" />
        </SectionTitle>
        <AttendeeStats profiles={profiles} />
      </section>

      {/* Teilnehmerliste */}
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
              <T de="Teilnehmer:innen" en="Attendees" />{" "}
              <span className="tabular-nums text-[var(--muted)]">({total})</span>
            </h3>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {truncated ? (
                <T
                  de={`Die ersten ${MAX_LISTED} von ${total}, alphabetisch sortiert`}
                  en={`First ${MAX_LISTED} of ${total}, sorted alphabetically`}
                />
              ) : (
                <T de="Alphabetisch sortiert" en="Sorted alphabetically" />
              )}
            </p>
          </div>
          {total > 0 && (
            <LinkButton href={candidatesHref} size="sm" variant="secondary">
              <T de="Alle in Kandidaten öffnen" en="Open all in candidates" />
              <ArrowRightIcon />
            </LinkButton>
          )}
        </div>

        {total === 0 ? (
          <EmptyState
            title={<T de="Noch keine Teilnehmer:innen" en="No attendees yet" />}
            body={
              <T
                de="Für dieses Event wurden noch keine Profile importiert."
                en="No profiles have been imported for this event yet."
              />
            }
            action={
              <LinkButton href="/candidates" variant="secondary">
                <T de="Alle Kandidaten ansehen" en="View all candidates" />
              </LinkButton>
            }
          />
        ) : (
          <>
            <ul className="divide-y divide-[var(--border)]">
              {listed.map((profile) => (
                <li key={profile.id}>
                  <Link
                    href={`/candidates/${encodeURIComponent(profile.id)}`}
                    className="group -mx-2 flex items-center gap-3 rounded-[var(--radius-sm)] px-2 py-3 transition-colors hover:bg-[var(--surface-2)]"
                  >
                    <Avatar src={profile.photoUrl} name={profile.name} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="min-w-0 truncate text-sm font-medium text-[var(--foreground)] transition-colors group-hover:text-[var(--accent)]">
                          {profile.name}
                        </span>
                        <Badge tone="accent">
                          <NetworkRoleLabel role={profile.networkRole} />
                        </Badge>
                        {profile.founderRole && (
                          <Badge>
                            <FounderRoleLabel role={profile.founderRole} />
                          </Badge>
                        )}
                      </div>
                      {profile.headline && <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{profile.headline}</p>}
                    </div>
                    {profile.verticals.length > 0 && (
                      <div className="hidden shrink-0 flex-wrap justify-end gap-1 sm:flex">
                        {profile.verticals.slice(0, 3).map((vertical) => (
                          <Badge key={vertical}>{vertical}</Badge>
                        ))}
                        {profile.verticals.length > 3 && <Badge>+{profile.verticals.length - 3}</Badge>}
                      </div>
                    )}
                    <ArrowRightIcon className="hidden text-[var(--muted)] opacity-0 transition-opacity group-hover:opacity-100 sm:block" />
                  </Link>
                </li>
              ))}
            </ul>

            {truncated && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4 text-sm text-[var(--muted)]">
                <span>
                  <T
                    de={`Es werden die ersten ${MAX_LISTED} von ${total} Teilnehmer:innen angezeigt.`}
                    en={`Showing the first ${MAX_LISTED} of ${total} attendees.`}
                  />
                </span>
                <LinkButton href={candidatesHref} size="sm">
                  <T de="Alle in Kandidaten öffnen" en="Open all in candidates" />
                  <ArrowRightIcon />
                </LinkButton>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
