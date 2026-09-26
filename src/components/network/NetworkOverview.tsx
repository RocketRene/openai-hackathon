/**
 * NetworkOverview – "569 Teilnehmer:innen analysiert – so sieht das Ökosystem aus".
 * Server-Component: aggregiert alle Profile aus dem Daten-Gateway zu Verteilungen
 * (Rollen, Persönlichkeit, Verticals, Tags, Standorte, Hochschulen, Firmen, Events …).
 */
import { Badge, Card, EmptyState } from "@/components/ui";
import { getEvents, getProfiles } from "@/lib/data";
import {
  FOUNDER_DIM_KEYS,
  FOUNDER_DIM_LABELS,
  PERSONALITY_LABELS,
  type FounderRole,
  type NetworkRole,
  type PersonalityType,
  type Profile,
} from "@/lib/types";
import BarList, { type BarListItem } from "./BarList";

/* ------------------------------------------------------------------ */
/* Lokale Labels (deutsch) – bewusst modul-lokal, kein Shared-Contract  */
/* ------------------------------------------------------------------ */

const NETWORK_ROLE_LABELS: Record<NetworkRole, string> = {
  cofounder: "Co-Founder",
  investor: "Investor:in",
  mentor: "Mentor:in",
  talent: "Talent",
  expert: "Expert:in",
};

const FOUNDER_ROLE_LABELS: Record<FounderRole, string> = {
  tech: "Tech",
  commercial: "Commercial",
  product: "Produkt",
  design: "Design",
  operations: "Operations",
  "domain-expert": "Domain-Expert:in",
};

/* ------------------------------------------------------------------ */
/* Aggregations-Helfer                                                 */
/* ------------------------------------------------------------------ */

type Counter = Map<string, number>;

function countValues(values: Iterable<string>): Counter {
  const counter: Counter = new Map();
  for (const raw of values) {
    const v = raw?.trim();
    if (!v) continue;
    counter.set(v, (counter.get(v) ?? 0) + 1);
  }
  return counter;
}

/** Zählt pro Profil jeden Wert nur einmal (z. B. zwei Jobs bei derselben Firma = 1). */
function countPerProfile(profiles: Profile[], pick: (p: Profile) => string[]): Counter {
  const counter: Counter = new Map();
  for (const p of profiles) {
    const unique = new Set(pick(p).map((v) => v?.trim()).filter((v): v is string => Boolean(v)));
    for (const v of unique) counter.set(v, (counter.get(v) ?? 0) + 1);
  }
  return counter;
}

function top(counter: Counter, n: number, href?: (key: string) => string, total?: number): BarListItem[] {
  return Array.from(counter.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de"))
    .slice(0, n)
    .map(([key, value]) => ({
      label: key,
      value,
      href: href?.(key),
      hint: total ? percent(value, total) : undefined,
    }));
}

function percent(part: number, total: number): string {
  if (!total) return "0 %";
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format((part / total) * 100)} %`;
}

function formatInt(n: number): string {
  return new Intl.NumberFormat("de-DE").format(n);
}

/** "München, Deutschland" → "München" – damit Schreibvarianten zusammenfallen. */
function cityOf(location: string): string {
  return (location ?? "").split(",")[0]?.trim() ?? "";
}

function candidatesHref(param: string, value: string): string {
  return `/candidates?${param}=${encodeURIComponent(value)}`;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function NetworkOverview() {
  const profiles = getProfiles();
  const events = getEvents();
  const total = profiles.length;

  if (total === 0) {
    return (
      <EmptyState
        title="Noch keine Profile geladen"
        body="Sobald Profile im Daten-Gateway liegen, erscheint hier die Netzwerk-Analyse."
      />
    );
  }

  // Datenquellen
  const linkedinCount = profiles.filter((p) => p.source?.type === "linkedin").length;
  const mockCount = profiles.filter((p) => p.source?.type === "mock").length;
  const otherCount = total - linkedinCount - mockCount;

  // Verteilungen
  const networkRoles = countValues(profiles.map((p) => p.networkRole));
  const networkRoleItems: BarListItem[] = (Object.keys(NETWORK_ROLE_LABELS) as NetworkRole[])
    .map((role) => ({
      label: NETWORK_ROLE_LABELS[role],
      value: networkRoles.get(role) ?? 0,
      href: candidatesHref("networkRole", role),
      hint: percent(networkRoles.get(role) ?? 0, total),
    }))
    .filter((i) => i.value > 0)
    .sort((a, b) => b.value - a.value);

  const withFounderRole = profiles.filter((p) => p.founderRole);
  const founderRoles = countValues(withFounderRole.map((p) => p.founderRole as string));
  const founderRoleItems: BarListItem[] = (Object.keys(FOUNDER_ROLE_LABELS) as FounderRole[])
    .map((role) => ({
      label: FOUNDER_ROLE_LABELS[role],
      value: founderRoles.get(role) ?? 0,
      href: candidatesHref("founderRole", role),
      hint: percent(founderRoles.get(role) ?? 0, withFounderRole.length),
    }))
    .filter((i) => i.value > 0)
    .sort((a, b) => b.value - a.value);

  const personalities = countValues(profiles.map((p) => p.personality?.type ?? ""));
  const personalityItems: BarListItem[] = (Object.keys(PERSONALITY_LABELS) as PersonalityType[])
    .map((type) => ({
      label: PERSONALITY_LABELS[type],
      value: personalities.get(type) ?? 0,
      href: candidatesHref("personality", type),
      hint: percent(personalities.get(type) ?? 0, total),
    }))
    .filter((i) => i.value > 0)
    .sort((a, b) => b.value - a.value);

  const verticalItems = top(
    countPerProfile(profiles, (p) => (p.verticals ?? []).map((v) => v.toLowerCase())),
    12,
    (v) => candidatesHref("vertical", v),
    total,
  );

  const tagItems = top(
    countPerProfile(profiles, (p) => (p.tags ?? []).filter((t) => !t.toLowerCase().startsWith("idealab:"))),
    15,
  );

  const locationItems = top(countPerProfile(profiles, (p) => [cityOf(p.location)]), 10, undefined, total);

  const schoolItems = top(
    countPerProfile(profiles, (p) => (p.education ?? []).map((e) => e.school)),
    10,
  );

  const companyItems = top(
    countPerProfile(profiles, (p) => (p.experience ?? []).map((e) => e.company)),
    10,
  );

  const lookingForItems = top(
    countPerProfile(profiles, (p) => (p.lookingFor ?? []).map((l) => l.toLowerCase())),
    10,
    (l) => candidatesHref("query", l),
    total,
  );

  const dimItems: BarListItem[] = FOUNDER_DIM_KEYS.map((key) => {
    const values = profiles.map((p) => p.dims?.[key]).filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
    const avg = values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
    return { label: FOUNDER_DIM_LABELS[key], value: Math.round(avg * 10) / 10, hint: "/ 10" };
  });

  const eventItems: BarListItem[] = events
    .map((e) => ({
      label: e.name,
      value: profiles.filter((p) => (p.events ?? []).includes(e.slug)).length,
      href: candidatesHref("event", e.slug),
      hint: e.date,
    }))
    .sort((a, b) => b.value - a.value);

  const kpis = [
    { label: "Profile gesamt", value: formatInt(total), sub: `${events.length} Events` },
    { label: "LinkedIn-angereichert", value: formatInt(linkedinCount), sub: percent(linkedinCount, total) },
    { label: "Demo-Profile (Mock)", value: formatInt(mockCount), sub: percent(mockCount, total) },
    { label: "Sonstige Quellen", value: formatInt(otherCount), sub: percent(otherCount, total) },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--muted)]">
        <span className="font-medium text-[var(--foreground)]">{formatInt(total)} Teilnehmer:innen analysiert</span> – so sieht das
        Ökosystem aus. Klick auf einen Balken öffnet die passende Kandidatenliste.
      </p>

      {/* KPI-Kacheln */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{k.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--foreground)]">{k.value}</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">{k.sub}</p>
          </Card>
        ))}
      </div>

      {/* Verteilungen */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card title="Rollen im Ökosystem" action={<Badge tone="accent">{formatInt(total)}</Badge>}>
          <BarList items={networkRoleItems} />
        </Card>

        <Card title="Team-Rollen (Co-Founder & Talente)" action={<Badge>{formatInt(withFounderRole.length)}</Badge>}>
          <BarList items={founderRoleItems} emptyText="Noch keine Team-Rollen erfasst" />
        </Card>

        <Card title="Persönlichkeitstypen">
          <BarList items={personalityItems} />
        </Card>

        <Card title="Top-12 Verticals">
          <BarList items={verticalItems} />
        </Card>

        <Card title="Top-15 Tags">
          <BarList items={tagItems} emptyText="Keine Tags vorhanden" />
        </Card>

        <Card title="Top-10 Standorte">
          <BarList items={locationItems} />
        </Card>

        <Card title="Top-10 Hochschulen">
          <BarList items={schoolItems} emptyText="Keine Ausbildungsdaten vorhanden" />
        </Card>

        <Card title="Top-10 Firmen (Berufserfahrung)">
          <BarList items={companyItems} emptyText="Keine Berufserfahrung erfasst" />
        </Card>

        <Card title="Team-Dimensionen im Durchschnitt" action={<Badge>Skala 0–10</Badge>}>
          <BarList items={dimItems} max={10} />
        </Card>

        <Card title="Wer sucht was?" action={<Badge>Top 10</Badge>}>
          <BarList items={lookingForItems} emptyText="Keine Angaben zu Gesuchen" />
        </Card>

        <Card title="Events & Teilnehmer:innen" className="md:col-span-2 xl:col-span-2">
          <BarList items={eventItems} emptyText="Keine Events hinterlegt" />
        </Card>
      </div>
    </div>
  );
}
