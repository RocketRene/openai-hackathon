"use client";
/**
 * Vergleichstabelle der gemerkten Profile: Spalten = Profile, Zeilen = Kriterien.
 * Daten nur über src/lib/data.ts; Match-Score über scoreMatch (ohne Nutzer-Kontext: "–").
 */
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { Avatar, Badge, Button, EmptyState, LinkButton, cx } from "@/components/ui";
import { getEvent, getProfile } from "@/lib/data";
import { scoreMatch } from "@/lib/matching";
import { useShortlist } from "@/lib/shortlist";
import {
  FOUNDER_DIM_KEYS,
  FOUNDER_DIM_LABELS,
  PERSONALITY_LABELS,
  type MatchResult,
  type NetworkRole,
  type Profile,
} from "@/lib/types";
import { useUserContext } from "@/lib/user-context";

const ROLE_LABELS: Record<NetworkRole, string> = {
  cofounder: "Co-Founder",
  investor: "Investor:in",
  mentor: "Mentor:in",
  talent: "Talent",
  expert: "Expert:in",
};

const stickyCell = "sticky left-0 z-10 bg-[var(--surface)] p-3 text-left text-xs font-medium text-[var(--muted)]";

function Row({ label, profiles, render }: { label: string; profiles: Profile[]; render: (p: Profile) => ReactNode }) {
  return (
    <tr className="border-b border-[var(--border)] align-top last:border-b-0">
      <th scope="row" className={cx(stickyCell, "whitespace-nowrap")}>
        {label}
      </th>
      {profiles.map((p) => (
        <td key={p.id} className="p-3">
          {render(p)}
        </td>
      ))}
    </tr>
  );
}

function DimBar({ value, max = 10, suffix = "", best }: { value: number; max?: number; suffix?: string; best: boolean }) {
  const pct = Math.round((Math.max(0, Math.min(max, value)) / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-[var(--surface-3)]">
        <div className={cx("h-1.5 rounded-full", best ? "bg-[var(--accent)]" : "bg-[var(--muted)]")} style={{ width: `${pct}%` }} />
      </div>
      <span className={cx("min-w-5 text-right text-xs tabular-nums", best ? "font-semibold text-[var(--foreground)]" : "text-[var(--muted)]")}>
        {value}
        {suffix}
      </span>
    </div>
  );
}

function ActionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-3)]"
    >
      {children}
    </Link>
  );
}

function Tags({ items, tone = "neutral" }: { items: string[]; tone?: "neutral" | "accent" }) {
  if (items.length === 0) return <span className="text-[var(--muted)]">–</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Badge key={item} tone={tone}>
          {item}
        </Badge>
      ))}
    </div>
  );
}

export function ShortlistCompare() {
  const { ids, ready, remove, clear } = useShortlist();
  const { userContext } = useUserContext();

  // Unbekannte IDs (gelöschte/umbenannte Profile) werden still ignoriert.
  const profiles = useMemo(() => ids.map((id) => getProfile(id)).filter((p): p is Profile => Boolean(p)), [ids]);

  const scores = useMemo(() => {
    const map = new Map<string, MatchResult>();
    if (!userContext) return map;
    for (const p of profiles) map.set(p.id, scoreMatch(userContext, p));
    return map;
  }, [profiles, userContext]);

  const bestScore = useMemo(() => Math.max(-1, ...Array.from(scores.values(), (s) => s.score)), [scores]);
  const bestComp = useMemo(() => Math.max(-1, ...Array.from(scores.values(), (s) => s.complementarity)), [scores]);
  const compare = profiles.length > 1;

  if (!ready) {
    return <p className="text-sm text-[var(--muted)]">Shortlist wird geladen …</p>;
  }

  if (profiles.length === 0) {
    // IDs vorhanden, aber kein Profil mehr dazu (Datenstand geändert) → aufräumen anbieten.
    const stale = ids.length > 0;
    return (
      <EmptyState
        title={stale ? "Gemerkte Profile nicht mehr vorhanden" : "Noch nichts gemerkt"}
        body={
          stale
            ? "Die gespeicherten Einträge passen zu keinem Profil mehr."
            : "Markiere Kandidat:innen mit „Merken“, um sie hier nebeneinander zu vergleichen."
        }
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <LinkButton href="/candidates">Kandidat:innen entdecken</LinkButton>
            {stale && (
              <Button type="button" variant="secondary" onClick={clear}>
                Shortlist leeren
              </Button>
            )}
          </div>
        }
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">
          {profiles.length} {profiles.length === 1 ? "gemerkter Kontakt" : "gemerkte Kontakte"}
          {!userContext && (
            <>
              {" · "}
              <Link href="/onboarding" className="underline hover:text-[var(--foreground)]">
                Onboarding ausfüllen
              </Link>
              , um Match-Scores zu sehen
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/team">Ins Team-Radar</LinkButton>
          <Button type="button" variant="secondary" onClick={clear}>
            Alle entfernen
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th scope="col" className={stickyCell}>
                Kriterium
              </th>
              {profiles.map((p) => (
                <th key={p.id} scope="col" className="min-w-[200px] p-3 text-left align-top font-normal">
                  <div className="flex items-start gap-2">
                    <Avatar src={p.photoUrl} name={p.name} size={36} />
                    <div className="min-w-0">
                      <Link href={`/candidates/${p.id}`} className="block truncate font-semibold text-[var(--foreground)] hover:underline">
                        {p.name}
                      </Link>
                      <p className="truncate text-xs text-[var(--muted)]">{p.headline}</p>
                      <Badge tone="accent" className="mt-1">
                        {ROLE_LABELS[p.networkRole]}
                      </Badge>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row
              label="Match-Score"
              profiles={profiles}
              render={(p) => {
                const match = scores.get(p.id);
                if (!match) return <span className="text-[var(--muted)]">–</span>;
                const best = compare && match.score === bestScore;
                return (
                  <div>
                    <span className={cx("text-lg font-semibold tabular-nums", best ? "text-[var(--accent)]" : "text-[var(--foreground)]")}>{match.score}</span>
                    <span className="text-xs text-[var(--muted)]"> / 100</span>
                    {match.reasons[0] && <p className="mt-0.5 text-xs text-[var(--muted)]">{match.reasons[0].label}</p>}
                    {match.risks[0] && <p className="mt-0.5 text-xs text-[var(--warning)]">{match.risks[0]}</p>}
                  </div>
                );
              }}
            />

            <Row
              label="Komplementarität"
              profiles={profiles}
              render={(p) => {
                const match = scores.get(p.id);
                if (!match) return <span className="text-[var(--muted)]">–</span>;
                return <DimBar value={match.complementarity} max={100} suffix="%" best={compare && match.complementarity === bestComp} />;
              }}
            />

            {FOUNDER_DIM_KEYS.map((key) => {
              const max = Math.max(...profiles.map((p) => p.dims[key]));
              return (
                <Row
                  key={key}
                  label={FOUNDER_DIM_LABELS[key]}
                  profiles={profiles}
                  render={(p) => <DimBar value={p.dims[key]} best={compare && p.dims[key] === max} />}
                />
              );
            })}

            <Row
              label="Persönlichkeit"
              profiles={profiles}
              render={(p) => (
                <div>
                  <Badge>{PERSONALITY_LABELS[p.personality.type]}</Badge>
                  <p className="mt-1 line-clamp-3 text-xs text-[var(--muted)]">{p.personality.summary}</p>
                </div>
              )}
            />

            <Row label="Verticals" profiles={profiles} render={(p) => <Tags items={p.verticals} tone="accent" />} />

            <Row label="Sucht" profiles={profiles} render={(p) => <Tags items={p.lookingFor} />} />

            <Row
              label="Events"
              profiles={profiles}
              render={(p) =>
                p.events.length === 0 ? (
                  <span className="text-[var(--muted)]">–</span>
                ) : (
                  <ul className="space-y-0.5 text-xs">
                    {p.events.map((slug) => (
                      <li key={slug}>
                        <Link href={`/events/${slug}`} className="text-[var(--foreground)] hover:underline">
                          {getEvent(slug)?.name ?? slug}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )
              }
            />

            <Row
              label="Aktionen"
              profiles={profiles}
              render={(p) => (
                <div className="flex flex-wrap gap-1.5">
                  <ActionLink href={`/candidates/${p.id}`}>Profil</ActionLink>
                  <ActionLink href={`/outreach?profile=${encodeURIComponent(p.id)}`}>Outreach</ActionLink>
                  <ActionLink href={`/prep/${p.id}`}>Prep</ActionLink>
                  <Button type="button" size="sm" variant="ghost" className="text-[var(--danger)]" onClick={() => remove(p.id)}>
                    Entfernen
                  </Button>
                </div>
              )}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ShortlistCompare;
