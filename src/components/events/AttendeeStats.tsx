/**
 * AttendeeStats – Verteilungen der Teilnehmer:innen eines Events als Karten mit Balken.
 * Server-Component: reine Aggregation + HTML/CSS-Balken (nur Design-Tokens).
 * Die KPI-Reihe (Teilnehmer, Co-Founder, …) liegt auf der Detailseite; hier nur die Verteilungen.
 */
import type { ReactNode } from "react";

import { Card, EmptyState } from "@/components/ui";
import { T } from "@/lib/i18n";
import type { Profile } from "@/lib/types";

import { FounderRoleLabel, NetworkRoleLabel, PersonalityLabel } from "./EventLabels";

const TAG_PREFIX = /^idealab:/i;

interface CountEntry {
  key: string;
  count: number;
}

function countBy(values: string[], limit: number): CountEntry[] {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const key = raw.trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de"))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function Share({ value }: { value: number }) {
  return <T de={`${value} %`} en={`${value}%`} />;
}

function BarList({
  entries,
  total,
  renderLabel,
}: {
  entries: CountEntry[];
  total: number;
  /** Übersetzt einen Roh-Key in ein Label; ohne Funktion wird der Key (Datenwert) angezeigt. */
  renderLabel?: (key: string) => ReactNode;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        <T de="Keine Daten vorhanden." en="No data available." />
      </p>
    );
  }
  const max = Math.max(1, ...entries.map((e) => e.count));
  return (
    <ul className="space-y-3">
      {entries.map((entry) => {
        const width = Math.max(2, Math.round((entry.count / max) * 100));
        const share = total > 0 ? Math.round((entry.count / total) * 100) : 0;
        return (
          <li key={entry.key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
              <span className="min-w-0 truncate font-medium text-[var(--foreground)]" title={renderLabel ? undefined : entry.key}>
                {renderLabel ? renderLabel(entry.key) : entry.key}
              </span>
              <span className="shrink-0 tabular-nums text-[var(--muted)]">
                <span className="font-medium text-[var(--foreground)]">{entry.count}</span>
                {" · "}
                <Share value={share} />
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
              <div className="h-full rounded-full bg-[var(--accent)] transition-[width]" style={{ width: `${width}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function AttendeeStats({ profiles }: { profiles: Profile[] }) {
  const total = profiles.length;

  if (total === 0) {
    return (
      <EmptyState
        title={<T de="Noch keine Teilnehmer:innen importiert" en="No attendees imported yet" />}
        body={
          <T
            de="Statistiken erscheinen, sobald Profile diesem Event zugeordnet sind."
            en="Statistics appear as soon as profiles are assigned to this event."
          />
        }
      />
    );
  }

  const networkRoles = countBy(profiles.map((p) => p.networkRole), 10);
  const founderRoles = countBy(
    profiles.flatMap((p) => (p.founderRole ? [p.founderRole] : [])),
    10,
  );
  const personalities = countBy(
    profiles.flatMap((p) => (p.personality?.type ? [p.personality.type] : [])),
    10,
  );
  const verticals = countBy(profiles.flatMap((p) => p.verticals ?? []), 8);
  const tags = countBy(
    profiles.flatMap((p) => (p.tags ?? []).map((t) => t.replace(TAG_PREFIX, ""))),
    10,
  );
  const locations = countBy(profiles.map((p) => p.location ?? ""), 5);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card
        title={<T de="Netzwerk-Rolle" en="Network role" />}
        description={<T de="Wen du auf dem Event triffst" en="Who you will meet at the event" />}
      >
        <BarList entries={networkRoles} total={total} renderLabel={(key) => <NetworkRoleLabel role={key} />} />
      </Card>
      <Card
        title={<T de="Team-Rolle" en="Team role" />}
        description={<T de="Co-Founder und Talente" en="Co-founders and talents" />}
      >
        <BarList entries={founderRoles} total={total} renderLabel={(key) => <FounderRoleLabel role={key} />} />
      </Card>
      <Card
        title={<T de="Persönlichkeitstypen" en="Personality types" />}
        description={<T de="Aus Profil und Werdegang abgeleitet" en="Derived from profile and career" />}
      >
        <BarList entries={personalities} total={total} renderLabel={(key) => <PersonalityLabel type={key} />} />
      </Card>
      <Card
        title={<T de="Top-Verticals" en="Top verticals" />}
        description={<T de="Häufigste Branchen" en="Most common industries" />}
      >
        <BarList entries={verticals} total={total} />
      </Card>
      <Card title={<T de="Top-Tags" en="Top tags" />} description={<T de="Aus der Event-App" en="From the event app" />}>
        <BarList entries={tags} total={total} />
      </Card>
      <Card
        title={<T de="Top-Standorte" en="Top locations" />}
        description={<T de="Woher die Teilnehmer:innen kommen" en="Where attendees come from" />}
      >
        <BarList entries={locations} total={total} />
      </Card>
    </div>
  );
}
