/**
 * AttendeeStats – Verteilungen der Teilnehmer:innen eines Events.
 * Server-Component: reine Aggregation + HTML/CSS-Balken (var(--accent)).
 */
import { Card } from "@/components/ui";
import { PERSONALITY_LABELS } from "@/lib/types";
import type { FounderRole, NetworkRole, PersonalityType, Profile } from "@/lib/types";

export const NETWORK_ROLE_LABELS: Record<NetworkRole, string> = {
  cofounder: "Co-Founder",
  investor: "Investor:in",
  mentor: "Mentor:in",
  talent: "Talent",
  expert: "Expert:in",
};

export const FOUNDER_ROLE_LABELS: Record<FounderRole, string> = {
  tech: "Tech",
  commercial: "Commercial",
  product: "Produkt",
  design: "Design",
  operations: "Operations",
  "domain-expert": "Domain-Expert:in",
};

const TAG_PREFIX = /^idealab:/i;

interface CountEntry {
  key: string;
  label: string;
  count: number;
}

function topEntries(values: string[], limit: number, labelFor?: (key: string) => string): CountEntry[] {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const key = raw.trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de"))
    .slice(0, limit)
    .map(([key, count]) => ({ key, label: labelFor ? labelFor(key) : key, count }));
}

function BarList({ entries, total }: { entries: CountEntry[]; total: number }) {
  if (entries.length === 0) {
    return <p className="text-sm text-[var(--muted)]">Keine Daten vorhanden.</p>;
  }
  const max = Math.max(1, ...entries.map((e) => e.count));
  return (
    <ul className="space-y-2.5">
      {entries.map((entry) => {
        const width = Math.max(2, Math.round((entry.count / max) * 100));
        const share = total > 0 ? Math.round((entry.count / total) * 100) : 0;
        return (
          <li key={entry.key}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate text-[var(--foreground)]" title={entry.label}>
                {entry.label}
              </span>
              <span className="shrink-0 tabular-nums text-[var(--muted)]">
                {entry.count} · {share} %
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-[var(--surface-3)]">
              <div className="h-2 rounded-full bg-[var(--accent)]" style={{ width: `${width}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums text-[var(--foreground)]">{value}</p>
    </div>
  );
}

export function AttendeeStats({ profiles }: { profiles: Profile[] }) {
  const total = profiles.length;

  if (total === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted)]">
        Noch keine Teilnehmer:innen importiert – Statistiken erscheinen, sobald Profile diesem Event zugeordnet sind.
      </div>
    );
  }

  const networkRoles = topEntries(
    profiles.map((p) => p.networkRole),
    10,
    (key) => NETWORK_ROLE_LABELS[key as NetworkRole] ?? key,
  );
  const founderRoles = topEntries(
    profiles.flatMap((p) => (p.founderRole ? [p.founderRole] : [])),
    10,
    (key) => FOUNDER_ROLE_LABELS[key as FounderRole] ?? key,
  );
  const verticals = topEntries(
    profiles.flatMap((p) => p.verticals ?? []),
    8,
  );
  const tags = topEntries(
    profiles.flatMap((p) => (p.tags ?? []).map((t) => t.replace(TAG_PREFIX, ""))),
    10,
  );
  const locations = topEntries(
    profiles.map((p) => p.location ?? ""),
    5,
  );
  const personalities = topEntries(
    profiles.flatMap((p) => (p.personality?.type ? [p.personality.type] : [])),
    10,
    (key) => PERSONALITY_LABELS[key as PersonalityType] ?? key,
  );

  const withLinkedin = profiles.filter((p) => Boolean(p.linkedinUrl)).length;
  const distinctVerticals = new Set(profiles.flatMap((p) => p.verticals ?? [])).size;
  const distinctLocations = new Set(profiles.map((p) => (p.location ?? "").trim()).filter(Boolean)).size;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Teilnehmer:innen" value={total} />
        <StatTile label="Mit LinkedIn-Profil" value={withLinkedin} />
        <StatTile label="Verticals" value={distinctVerticals} />
        <StatTile label="Standorte" value={distinctLocations} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card title="Netzwerk-Rolle">
          <BarList entries={networkRoles} total={total} />
        </Card>
        <Card title="Team-Rolle (Co-Founder / Talent)">
          <BarList entries={founderRoles} total={total} />
        </Card>
        <Card title="Persönlichkeitstypen">
          <BarList entries={personalities} total={total} />
        </Card>
        <Card title="Top-Verticals">
          <BarList entries={verticals} total={total} />
        </Card>
        <Card title="Top-Tags">
          <BarList entries={tags} total={total} />
        </Card>
        <Card title="Top-Standorte">
          <BarList entries={locations} total={total} />
        </Card>
      </div>
    </div>
  );
}
