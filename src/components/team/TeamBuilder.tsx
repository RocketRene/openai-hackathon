"use client";
/**
 * Team-Builder: Ich + ausgewählte Kandidat:innen → Radar-Chart, Team-Analyse, Rollen-Empfehlungen
 * und die drei Ergänzungen, die den Team-Score am stärksten heben würden.
 * Startauswahl: Shortlist aus localStorage ("founderradar.shortlist.v1", string[] Profil-IDs).
 */
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { getProfiles } from "@/lib/data";
import {
  analyzeTeam,
  FOUNDER_ROLE_LABELS,
  formatDim,
  memberFromProfile,
  memberFromUser,
  suggestAdditions,
  USER_MEMBER_ID,
} from "@/lib/team";
import { FOUNDER_DIM_KEYS, FOUNDER_DIM_LABELS, type Profile, type TeamMember } from "@/lib/types";
import { useUserContext } from "@/lib/user-context";
import { Avatar, Badge, Button, Card, EmptyState, Input, LinkButton, ScoreBar, Select } from "@/components/ui";
import RadarChart, { COMBINED_SERIES_COLOR, DEFAULT_SERIES_COLORS, type RadarSeries } from "./RadarChart";

const SHORTLIST_KEY = "founderradar.shortlist.v1";
const SHORTLIST_EVENT = "founderradar:shortlist-changed";
const MAX_SELECT_OPTIONS = 60;

/* Shortlist als externer Store (localStorage) – ohne Effekt, ohne Hydration-Mismatch. */
function subscribeShortlist(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SHORTLIST_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SHORTLIST_EVENT, callback);
  };
}

function readShortlistRaw(): string {
  try {
    return window.localStorage.getItem(SHORTLIST_KEY) ?? "";
  } catch {
    return "";
  }
}

const getServerShortlist = () => "";

function parseShortlist(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function scoreVerdict(score: number): { text: string; tone: "success" | "accent" | "warning" | "danger" } {
  if (score >= 80) return { text: "Sehr stark", tone: "success" };
  if (score >= 65) return { text: "Solide", tone: "accent" };
  if (score >= 50) return { text: "Ausbaufähig", tone: "warning" };
  return { text: "Lückenhaft", tone: "danger" };
}

function roleLabel(p: Profile): string {
  return p.founderRole ? FOUNDER_ROLE_LABELS[p.founderRole] : p.networkRole;
}

export default function TeamBuilder() {
  const { userContext, ready, loadDemo } = useUserContext();
  const profiles = useMemo(() => getProfiles(), []);
  const profileById = useMemo(() => new Map(profiles.map((p) => [p.id, p] as const)), [profiles]);

  const shortlistRaw = useSyncExternalStore(subscribeShortlist, readShortlistRaw, getServerShortlist);
  const shortlistIds = useMemo(() => parseShortlist(shortlistRaw).filter((id) => profileById.has(id)), [shortlistRaw, profileById]);

  /** null = noch nicht angefasst → die Shortlist ist die Auswahl. */
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);
  const [query, setQuery] = useState("");
  const effectiveIds = selectedIds ?? shortlistIds;

  const members: TeamMember[] = useMemo(() => {
    if (!userContext) return [];
    const list = [memberFromUser(userContext)];
    for (const id of effectiveIds) {
      const p = profileById.get(id);
      if (p) list.push(memberFromProfile(p));
    }
    return list;
  }, [userContext, effectiveIds, profileById]);

  const analysis = useMemo(() => analyzeTeam(members), [members]);
  const suggestions = useMemo(
    () => (userContext ? suggestAdditions(userContext, members, profiles, 3) : []),
    [userContext, members, profiles],
  );

  const series: RadarSeries[] = useMemo(() => {
    const s: RadarSeries[] = members.map((m, i) => ({
      label: m.id === USER_MEMBER_ID ? `${m.name} (ich)` : m.name,
      dims: m.dims,
      color: DEFAULT_SERIES_COLORS[i % DEFAULT_SERIES_COLORS.length],
    }));
    if (members.length >= 2) s.push({ label: "Team kombiniert", dims: analysis.combined, color: COMBINED_SERIES_COLOR });
    return s;
  }, [members, analysis]);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selected = new Set(effectiveIds);
    return profiles
      .filter((p) => !selected.has(p.id) && (!q || p.name.toLowerCase().includes(q)))
      .sort(
        (a, b) =>
          Number(b.networkRole === "cofounder") - Number(a.networkRole === "cofounder") || a.name.localeCompare(b.name, "de"),
      )
      .slice(0, MAX_SELECT_OPTIONS);
  }, [profiles, effectiveIds, query]);

  const add = (id: string) => setSelectedIds([...effectiveIds.filter((x) => x !== id), id]);
  const remove = (id: string) => setSelectedIds(effectiveIds.filter((x) => x !== id));

  if (!ready) {
    return (
      <Card>
        <p className="text-sm text-[var(--muted)]">Lade dein Profil …</p>
      </Card>
    );
  }

  if (!userContext) {
    return (
      <EmptyState
        title="Noch kein eigenes Profil"
        body="Für das Team-Radar brauchen wir deine Selbsteinschätzung in Vision, Design, Technik, Detail und Umsetzung. Lege dein Profil im Onboarding an – oder lade den Demo-Kontext."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={loadDemo}>Demo-Kontext laden</Button>
            <LinkButton href="/onboarding" variant="secondary">
              Zum Onboarding
            </LinkButton>
          </div>
        }
      />
    );
  }

  const verdict = scoreVerdict(analysis.successScore);
  const candidateCount = members.length - 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Radar" action={<span className="text-xs text-[var(--muted)]">Skala 0–10</span>}>
          <RadarChart series={series} size={320} />
        </Card>

        <Card
          title={`Team (${members.length})`}
          action={
            selectedIds !== null && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(null)}>
                Zurück zur Shortlist
              </Button>
            )
          }
        >
          <ul className="flex flex-col gap-2">
            {members.map((m, i) => {
              const isMe = m.id === USER_MEMBER_ID;
              const p = isMe ? undefined : profileById.get(m.id);
              return (
                <li key={m.id} className="flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: DEFAULT_SERIES_COLORS[i % DEFAULT_SERIES_COLORS.length] }}
                    aria-hidden
                  />
                  <Avatar src={p?.photoUrl} name={m.name} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--foreground)]">
                      {isMe ? (
                        <>
                          {m.name} <span className="font-normal text-[var(--muted)]">(ich)</span>
                        </>
                      ) : (
                        <Link href={`/candidates/${m.id}`} className="hover:underline">
                          {m.name}
                        </Link>
                      )}
                    </p>
                    <p className="truncate text-xs text-[var(--muted)]">{isMe ? userContext.headline || "Dein Profil" : p?.headline}</p>
                  </div>
                  {m.founderRole && <Badge tone="accent">{FOUNDER_ROLE_LABELS[m.founderRole]}</Badge>}
                  {!isMe && (
                    <Button variant="ghost" size="sm" onClick={() => remove(m.id)} aria-label={`${m.name} entfernen`} title="Entfernen">
                      ×
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>

          {profiles.length === 0 ? (
            <p className="mt-3 text-xs text-[var(--muted)]">
              Noch keine Kandidat:innen in der Datenbank – sobald Profile importiert sind, kannst du sie hier ins Team holen.
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input placeholder="Nach Name suchen …" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Kandidat:innen suchen" />
              <Select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    add(e.target.value);
                    setQuery("");
                  }
                }}
                aria-label="Kandidat:in hinzufügen"
              >
                <option value="">{options.length ? `Kandidat:in hinzufügen … (${options.length})` : "Keine Treffer"}</option>
                {options.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {roleLabel(p)}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <p className="mt-2 text-xs text-[var(--muted)]">
            Startauswahl ist deine{" "}
            <Link href="/shortlist" className="underline">
              Shortlist
            </Link>
            .{candidateCount === 0 && " Füge Kandidat:innen hinzu, um das Team zu simulieren."}
          </p>
        </Card>
      </div>

      <Card title="Team-Analyse" action={<Badge tone={verdict.tone}>{verdict.text}</Badge>}>
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <ScoreBar value={analysis.successScore} label="Team-Erfolgsscore (0–100)" />
            <p className="mt-2 text-xs text-[var(--muted)]">
              Niveau der kombinierten Dimensionen, Balance zwischen ihnen und Teamgröße (2–3 ist ideal).{" "}
              {candidateCount === 0 ? "Aktuell nur du – füge Kandidat:innen hinzu." : `Team: du + ${candidateCount}.`}
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {FOUNDER_DIM_KEYS.map((k) => (
                <li key={k}>
                  <ScoreBar value={analysis.combined[k]} max={10} label={FOUNDER_DIM_LABELS[k]} />
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Stärken (≥ 8)</h4>
              {analysis.strengths.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {analysis.strengths.map((k) => (
                    <Badge key={k} tone="success">
                      {FOUNDER_DIM_LABELS[k]} {formatDim(analysis.combined[k])}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--muted)]">Noch keine Dimension ≥ 8 – hier hilft eine starke Ergänzung.</p>
              )}
            </div>

            <div>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Lücken (&lt; 6,5)</h4>
              {analysis.gaps.length ? (
                <ul className="flex flex-col gap-2">
                  {analysis.gaps.map((g) => (
                    <li key={g.dim} className="rounded-md border border-[var(--border)] p-2.5">
                      <Badge tone={g.score < 4 ? "danger" : "warning"} className="mb-1">
                        {FOUNDER_DIM_LABELS[g.dim]} {formatDim(g.score)}
                      </Badge>
                      <p className="text-xs text-[var(--muted)]">{g.advice}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--muted)]">Keine Lücke – alle Dimensionen sind solide abgedeckt.</p>
              )}
            </div>

            <div>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Empfohlene Rollen</h4>
              {analysis.recommendedRoles.length ? (
                <div className="flex flex-wrap gap-2">
                  {analysis.recommendedRoles.map((role) => (
                    <LinkButton key={role} variant="secondary" href={`/candidates?founderRole=${role}&networkRole=cofounder`}>
                      {FOUNDER_ROLE_LABELS[role]} finden →
                    </LinkButton>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--muted)]">Euer Team braucht aktuell keine zusätzliche Rolle.</p>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card title="Top-Ergänzungen" action={<span className="text-xs text-[var(--muted)]">Simulation: Wer hebt den Team-Score am stärksten?</span>}>
        {suggestions.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            {profiles.length === 0
              ? "Noch keine Kandidat:innen in der Datenbank."
              : "Keine Person in der Datenbank würde den Team-Score aktuell weiter erhöhen."}
          </p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-3">
            {suggestions.map((s) => (
              <li key={s.profile.id} className="flex flex-col gap-3 rounded-md border border-[var(--border)] p-3">
                <div className="flex items-center gap-3">
                  <Avatar src={s.profile.photoUrl} name={s.profile.name} size={40} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/candidates/${s.profile.id}`} className="block truncate text-sm font-medium text-[var(--foreground)] hover:underline">
                      {s.profile.name}
                    </Link>
                    <p className="truncate text-xs text-[var(--muted)]">{s.profile.headline}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone="success">
                    +{s.delta} → {s.successScore}
                  </Badge>
                  <Badge tone="neutral">Match {s.matchScore}</Badge>
                  {s.profile.founderRole && <Badge tone="accent">{FOUNDER_ROLE_LABELS[s.profile.founderRole]}</Badge>}
                </div>
                {s.closesGaps.length > 0 && (
                  <p className="text-xs text-[var(--muted)]">Schließt: {s.closesGaps.map((k) => FOUNDER_DIM_LABELS[k]).join(", ")}</p>
                )}
                <Button size="sm" variant="secondary" onClick={() => add(s.profile.id)}>
                  Ins Team holen
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
