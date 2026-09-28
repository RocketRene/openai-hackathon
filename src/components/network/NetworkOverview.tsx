/**
 * NetworkOverview – „569 Teilnehmer:innen analysiert – so sieht das Ökosystem aus“.
 * Server-Component: aggregiert alle Profile aus dem Daten-Gateway zu Verteilungen
 * (Rollen, Persönlichkeit, Verticals, Tags, Standorte, Hochschulen, Firmen, Events …).
 * Sichtbare Texte laufen über <T de en />, Datenwerte (Tags, Städte, Firmen) bleiben roh.
 */
import type { ReactNode } from "react";
import { Badge, Card, EmptyState, SectionTitle, Stat } from "@/components/ui";
import { getEvents, getProfiles } from "@/lib/data";
import { T } from "@/lib/i18n";
import {
  FOUNDER_DIM_KEYS,
  type FounderDimKey,
  type FounderRole,
  type NetworkRole,
  type PersonalityType,
  type Profile,
} from "@/lib/types";
import BarList, { type BarListItem } from "./BarList";
import { Num, Pct } from "./format";

/* ------------------------------------------------------------------ */
/* Zweisprachige Labels – bewusst modul-lokal, kein Shared-Contract     */
/* ------------------------------------------------------------------ */

type Bi = { de: string; en: string };

const NETWORK_ROLE_LABELS: Record<NetworkRole, Bi> = {
  cofounder: { de: "Co-Founder", en: "Co-founder" },
  investor: { de: "Investor:in", en: "Investor" },
  mentor: { de: "Mentor:in", en: "Mentor" },
  talent: { de: "Talent", en: "Talent" },
  expert: { de: "Expert:in", en: "Expert" },
};

const FOUNDER_ROLE_LABELS: Record<FounderRole, Bi> = {
  tech: { de: "Tech", en: "Tech" },
  commercial: { de: "Commercial", en: "Commercial" },
  product: { de: "Produkt", en: "Product" },
  design: { de: "Design", en: "Design" },
  operations: { de: "Operations", en: "Operations" },
  "domain-expert": { de: "Domain-Expert:in", en: "Domain expert" },
};

const PERSONALITY_LABELS: Record<PersonalityType, Bi> = {
  visionary: { de: "Visionär:in", en: "Visionary" },
  builder: { de: "Builder", en: "Builder" },
  operator: { de: "Operator", en: "Operator" },
  connector: { de: "Connector", en: "Connector" },
  analyst: { de: "Analyst:in", en: "Analyst" },
};

const DIM_LABELS: Record<FounderDimKey, Bi> = {
  vision: { de: "Vision", en: "Vision" },
  design: { de: "Design / Visuell", en: "Design / visual" },
  tech: { de: "Technik", en: "Tech" },
  detail: { de: "Detail", en: "Detail" },
  execution: { de: "Umsetzung", en: "Execution" },
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

/** Top-N einer Zählung von Datenwerten (Label = Rohwert, bleibt unübersetzt). */
function top(counter: Counter, n: number, total: number, href?: (key: string) => string): BarListItem[] {
  return Array.from(counter.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de"))
    .slice(0, n)
    .map(([key, value]) => ({
      key,
      label: key,
      value,
      href: href?.(key),
      hint: <Pct part={value} total={total} />,
    }));
}

/** Verteilung über eine feste Werteliste (Rollen, Typen) mit zweisprachigen Labels. */
function enumItems<K extends string>(counter: Counter, labels: Record<K, Bi>, total: number, param: string): BarListItem[] {
  return (Object.keys(labels) as K[])
    .map((k) => ({ k, value: counter.get(k) ?? 0 }))
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value)
    .map(({ k, value }) => ({
      key: k,
      label: <T de={labels[k].de} en={labels[k].en} />,
      value,
      href: candidatesHref(param, k),
      hint: <Pct part={value} total={total} />,
    }));
}

/** „München, Deutschland“ → „München“ – damit Schreibvarianten zusammenfallen. */
function cityOf(location: string): string {
  return (location ?? "").split(",")[0]?.trim() ?? "";
}

function candidatesHref(param: string, value: string): string {
  return `/candidates?${param}=${encodeURIComponent(value)}`;
}

/* ------------------------------------------------------------------ */
/* Bausteine                                                           */
/* ------------------------------------------------------------------ */

function Section({ title, caption, children }: { title: ReactNode; caption?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <SectionTitle action={caption ? <p className="text-xs text-[var(--muted)]">{caption}</p> : undefined}>{title}</SectionTitle>
      {children}
    </section>
  );
}

/** Fünf Team-Dimensionen als Balkenreihe (Skala 0–10). */
function DimensionBars({ dims }: { dims: Array<{ key: FounderDimKey; avg: number }> }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
      {dims.map((d) => {
        const pct = Math.max(0, Math.min(100, Math.round((d.avg / 10) * 100)));
        return (
          <div key={d.key}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm text-[var(--foreground)]">
                <T de={DIM_LABELS[d.key].de} en={DIM_LABELS[d.key].en} />
              </span>
              <span className="shrink-0 font-mono text-sm font-medium tabular-nums text-[var(--foreground)]">
                <Num value={d.avg} digits={1} />
                <span className="ml-0.5 text-xs font-normal text-[var(--muted)]">/10</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]" aria-hidden="true">
              <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const grid3 = "grid gap-4 md:grid-cols-2 xl:grid-cols-3";

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
        title={<T de="Noch keine Profile geladen" en="No profiles loaded yet" />}
        body={
          <T
            de="Sobald Profile im Daten-Gateway liegen, erscheint hier die Netzwerk-Analyse."
            en="As soon as profiles are available in the data gateway, the network analysis appears here."
          />
        }
      />
    );
  }

  // Datenquellen
  const linkedinCount = profiles.filter((p) => p.source?.type === "linkedin").length;
  const mockCount = profiles.filter((p) => p.source?.type === "mock").length;

  // Wer ist hier
  const networkRoleItems = enumItems(countValues(profiles.map((p) => p.networkRole)), NETWORK_ROLE_LABELS, total, "networkRole");
  const withFounderRole = profiles.filter((p) => p.founderRole);
  const founderRoleItems = enumItems(
    countValues(withFounderRole.map((p) => p.founderRole as string)),
    FOUNDER_ROLE_LABELS,
    withFounderRole.length,
    "founderRole",
  );
  const withPersonality = profiles.filter((p) => p.personality?.type);
  const personalityItems = enumItems(
    countValues(withPersonality.map((p) => p.personality?.type ?? "")),
    PERSONALITY_LABELS,
    withPersonality.length,
    "personality",
  );

  // Worum es geht
  const verticalItems = top(
    countPerProfile(profiles, (p) => (p.verticals ?? []).map((v) => v.toLowerCase())),
    12,
    total,
    (v) => candidatesHref("vertical", v),
  );
  const tagItems = top(
    countPerProfile(profiles, (p) => (p.tags ?? []).filter((t) => !t.toLowerCase().startsWith("idealab:"))),
    15,
    total,
  );
  const lookingForItems = top(
    countPerProfile(profiles, (p) => (p.lookingFor ?? []).map((l) => l.toLowerCase())),
    10,
    total,
    (l) => candidatesHref("query", l),
  );

  // Woher
  const locationItems = top(countPerProfile(profiles, (p) => [cityOf(p.location)]), 10, total);
  const schoolItems = top(countPerProfile(profiles, (p) => (p.education ?? []).map((e) => e.school)), 10, total);
  const companyItems = top(countPerProfile(profiles, (p) => (p.experience ?? []).map((e) => e.company)), 10, total);

  // Team-Dimensionen
  const withDims = profiles.filter((p) => p.dims);
  const dims = FOUNDER_DIM_KEYS.map((key) => {
    const values = profiles.map((p) => p.dims?.[key]).filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
    const avg = values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
    return { key, avg: Math.round(avg * 10) / 10 };
  });

  // Events
  const eventItems: BarListItem[] = events
    .map((e) => ({
      key: e.slug,
      label: e.name,
      value: profiles.filter((p) => (p.events ?? []).includes(e.slug)).length,
      href: candidatesHref("event", e.slug),
      hint: e.date,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-10">
      {/* Stat-Reihe */}
      <div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            href="/candidates"
            label={<T de="Profile gesamt" en="Total profiles" />}
            value={<span className="tabular-nums"><Num value={total} /></span>}
            hint={<T de="Teilnehmer:innen analysiert" en="participants analysed" />}
          />
          <Stat
            label={<T de="LinkedIn-angereichert" en="LinkedIn-enriched" />}
            value={<span className="tabular-nums"><Num value={linkedinCount} /></span>}
            hint={
              <>
                <Pct part={linkedinCount} total={total} /> <T de="aller Profile" en="of all profiles" />
              </>
            }
          />
          <Stat
            label={<T de="Demo-Profile" en="Demo profiles" />}
            value={<span className="tabular-nums"><Num value={mockCount} /></span>}
            hint={
              <>
                <Pct part={mockCount} total={total} /> <T de="synthetische Daten" en="synthetic data" />
              </>
            }
          />
          <Stat
            href="/events"
            label={<T de="Events" en="Events" />}
            value={<span className="tabular-nums"><Num value={events.length} /></span>}
            hint={<T de="mit Teilnehmerlisten" en="with attendee lists" />}
          />
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">
          <T de="Verlinkte Zeilen öffnen die passende Kandidatenliste." en="Linked rows open the matching candidate list." />
        </p>
      </div>

      {/* Wer ist hier */}
      <Section title={<T de="Wer ist hier" en="Who’s here" />}>
        <div className={grid3}>
          <Card
            title={<T de="Rollen im Netzwerk" en="Network roles" />}
            description={<T de="Anteil an allen Profilen" en="Share of all profiles" />}
            action={
              <Badge tone="accent">
                <Num value={total} />
              </Badge>
            }
          >
            <BarList items={networkRoleItems} />
          </Card>
          <Card
            title={<T de="Team-Rollen" en="Team roles" />}
            description={<T de="Co-Founder und Talente mit Rollenprofil" en="Co-founders and talent with a role profile" />}
            action={
              <Badge>
                <Num value={withFounderRole.length} />
              </Badge>
            }
          >
            <BarList items={founderRoleItems} emptyText={<T de="Noch keine Team-Rollen erfasst" en="No team roles recorded yet" />} />
          </Card>
          <Card
            title={<T de="Persönlichkeit" en="Personality" />}
            description={<T de="Typen laut Profil-Analyse" en="Types from the profile analysis" />}
            action={
              <Badge>
                <Num value={withPersonality.length} />
              </Badge>
            }
          >
            <BarList items={personalityItems} emptyText={<T de="Noch keine Typen ermittelt" en="No types determined yet" />} />
          </Card>
        </div>
      </Section>

      {/* Worum es geht */}
      <Section
        title={<T de="Worum es geht" en="What it’s about" />}
        caption={<T de="Mehrfachnennungen möglich – Anteile summieren sich nicht auf 100 %." en="Multiple mentions possible – shares don’t add up to 100%." />}
      >
        <div className={grid3}>
          <Card title={<T de="Verticals" en="Verticals" />} description={<T de="Top 12 Branchen" en="Top 12 industries" />}>
            <BarList items={verticalItems} emptyText={<T de="Keine Verticals vorhanden" en="No verticals available" />} />
          </Card>
          <Card title={<T de="Interessen & Tags" en="Interests & tags" />} description={<T de="Top 15 Schlagworte" en="Top 15 keywords" />}>
            <BarList items={tagItems} emptyText={<T de="Keine Tags vorhanden" en="No tags available" />} />
          </Card>
          <Card title={<T de="Wer sucht was" en="Who’s looking for what" />} description={<T de="Top 10 Gesuche" en="Top 10 requests" />}>
            <BarList items={lookingForItems} emptyText={<T de="Keine Angaben zu Gesuchen" en="No requests recorded" />} />
          </Card>
        </div>
      </Section>

      {/* Woher */}
      <Section title={<T de="Woher" en="Where from" />} caption={<T de="Je Profil einmal gezählt" en="Counted once per profile" />}>
        <div className={grid3}>
          <Card title={<T de="Standorte" en="Locations" />} description={<T de="Top 10 Städte" en="Top 10 cities" />}>
            <BarList items={locationItems} emptyText={<T de="Keine Standorte vorhanden" en="No locations available" />} />
          </Card>
          <Card title={<T de="Hochschulen" en="Universities" />} description={<T de="Top 10 Ausbildungsstationen" en="Top 10 alma maters" />}>
            <BarList items={schoolItems} emptyText={<T de="Keine Ausbildungsdaten vorhanden" en="No education data available" />} />
          </Card>
          <Card title={<T de="Firmen" en="Companies" />} description={<T de="Top 10 Stationen der Berufserfahrung" en="Top 10 employers" />}>
            <BarList items={companyItems} emptyText={<T de="Keine Berufserfahrung erfasst" en="No work experience recorded" />} />
          </Card>
        </div>
      </Section>

      {/* Team-Dimensionen */}
      <Section title={<T de="Team-Dimensionen im Schnitt" en="Team dimensions on average" />}>
        <Card
          title={<T de="Durchschnitt aller Profile" en="Average across all profiles" />}
          description={
            <>
              <Num value={withDims.length} /> <T de="Profile mit Bewertung" en="profiles with a rating" />
            </>
          }
          action={
            <Badge>
              <T de="Skala 0–10" en="Scale 0–10" />
            </Badge>
          }
        >
          {withDims.length > 0 ? (
            <DimensionBars dims={dims} />
          ) : (
            <p className="py-6 text-center text-sm text-[var(--muted)]">
              <T de="Noch keine Dimensionen bewertet" en="No dimensions rated yet" />
            </p>
          )}
        </Card>
      </Section>

      {/* Events */}
      <Section title={<T de="Events" en="Events" />}>
        <Card title={<T de="Teilnehmer:innen je Event" en="Participants per event" />} description={<T de="Klick öffnet die Teilnehmerliste" en="Click to open the attendee list" />}>
          <BarList items={eventItems} emptyText={<T de="Keine Events hinterlegt" en="No events available" />} />
        </Card>
      </Section>
    </div>
  );
}
