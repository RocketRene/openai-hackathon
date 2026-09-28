"use client";
/**
 * Team-Builder: Ich + ausgewählte Kandidat:innen → Radar-Chart, Team-Score, Stärken/Lücken,
 * Rollen-Empfehlungen und die drei Ergänzungen, die den Team-Score am stärksten heben würden.
 * Startauswahl: Shortlist aus localStorage ("founderradar.shortlist.v1", string[] Profil-IDs).
 * Layout ab lg zweispaltig: links Radar + Mitglieder, rechts Score, Analyse, Top-Ergänzungen.
 */
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { getProfiles } from "@/lib/data";
import {
  analyzeTeam,
  FOUNDER_ROLE_LABELS,
  formatDim,
  GAP_THRESHOLD,
  memberFromProfile,
  memberFromUser,
  STRENGTH_THRESHOLD,
  suggestAdditions,
  USER_MEMBER_ID,
} from "@/lib/team";
import { FOUNDER_DIM_KEYS, FOUNDER_DIM_LABELS, type NetworkRole, type Profile, type TeamMember } from "@/lib/types";
import { useUserContext } from "@/lib/user-context";
import { Avatar, Badge, Button, Card, EmptyState, Input, Label, LinkButton, ScoreBar, Skeleton, cx } from "@/components/ui";
import RadarChart, { COMBINED_SERIES_COLOR, DEFAULT_SERIES_COLORS, type RadarSeries } from "./RadarChart";

const SHORTLIST_KEY = "founderradar.shortlist.v1";
const SHORTLIST_EVENT = "founderradar:shortlist-changed";
const MAX_RESULTS = 6;

type Tone = "success" | "accent" | "warning" | "danger";
const TONE_COLOR: Record<Tone, string> = {
  success: "var(--success)",
  accent: "var(--accent)",
  warning: "var(--warning)",
  danger: "var(--danger)",
};

const NETWORK_ROLE_LABELS: Record<NetworkRole, string> = {
  cofounder: "Co-Founder:in",
  investor: "Investor:in",
  mentor: "Mentor:in",
  talent: "Talent",
  expert: "Expert:in",
};

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

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

function scoreVerdict(score: number): { text: string; tone: Tone } {
  if (score >= 80) return { text: "Sehr stark", tone: "success" };
  if (score >= 65) return { text: "Solide", tone: "accent" };
  if (score >= 50) return { text: "Ausbaufähig", tone: "warning" };
  return { text: "Lückenhaft", tone: "danger" };
}

/** Farbe einer kombinierten Dimension: Stärke grün, solide Akzent, Lücke orange bzw. rot. */
function dimTone(value: number): Tone {
  if (value >= STRENGTH_THRESHOLD) return "success";
  if (value >= GAP_THRESHOLD) return "accent";
  if (value >= 4) return "warning";
  return "danger";
}

function roleLabel(p: Profile): string {
  return p.founderRole ? FOUNDER_ROLE_LABELS[p.founderRole] : NETWORK_ROLE_LABELS[p.networkRole];
}

/** Alle Suchbegriffe müssen in Name, Headline oder Rolle vorkommen. */
function matchesQuery(p: Profile, q: string): boolean {
  const haystack = `${p.name} ${p.headline} ${roleLabel(p)} ${p.founderRole ?? ""} ${p.networkRole}`.toLowerCase();
  return q.split(/\s+/).filter(Boolean).every((term) => haystack.includes(term));
}

/** Der Advice aus lib/team beginnt mit „<Dimension> liegt bei x/10.“ – das zeigt schon die Badge. */
function adviceBody(advice: string): string {
  const rest = advice.replace(/^[^.]*\/10\.\s*/, "");
  return rest || advice;
}

/* ---------------------------------------------------------------- */
/* Kleine Bausteine                                                  */
/* ---------------------------------------------------------------- */

function SectionLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{children}</h4>
      {hint && <span className="text-[11px] text-[var(--muted)]">{hint}</span>}
    </div>
  );
}

function IconButton({
  onClick,
  label,
  tone = "neutral",
  children,
}: {
  onClick: () => void;
  label: string;
  tone?: "neutral" | "accent" | "danger";
  children: ReactNode;
}) {
  const tones = {
    neutral: "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
    accent: "border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] shadow-[var(--shadow-sm)] hover:bg-[var(--accent-soft)]",
    danger: "text-[var(--muted)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cx("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] transition", tones[tone], focusRing)}
    >
      {children}
    </button>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" className="h-4 w-4" aria-hidden>
      <circle cx="9" cy="9" r="5.5" />
      <path d="M13.5 13.5 17 17" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" className="h-4 w-4" aria-hidden>
      <path d="M10 4v12M4 10h12" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" className="h-4 w-4" aria-hidden>
      <path d="m5 5 10 10M15 5 5 15" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M15.5 5.5a3 3 0 0 1 0 5.5M17 14a5 5 0 0 1 3.5 5" />
    </svg>
  );
}

function TeamSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start" aria-busy>
      <div className="flex flex-col gap-6">
        <Card>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mx-auto mt-6 aspect-square w-full max-w-xs" />
        </Card>
        <Card>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-12 w-full" />
          <Skeleton className="mt-2 h-12 w-full" />
        </Card>
      </div>
      <div className="flex flex-col gap-6">
        <Card padding="lg">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-12 w-28" />
          <Skeleton className="mt-4 h-2 w-full" />
        </Card>
        <Card>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-4 h-16 w-full" />
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Hauptkomponente                                                   */
/* ---------------------------------------------------------------- */

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
    if (members.length >= 2) s.push({ label: "Team kombiniert", dims: analysis.combined, color: COMBINED_SERIES_COLOR, emphasis: true });
    return s;
  }, [members, analysis]);

  const trimmedQuery = query.trim();
  const results = useMemo(() => {
    const q = trimmedQuery.toLowerCase();
    if (!q) return [];
    const selected = new Set(effectiveIds);
    return profiles
      .filter((p) => !selected.has(p.id) && matchesQuery(p, q))
      .sort(
        (a, b) =>
          Number(b.networkRole === "cofounder") - Number(a.networkRole === "cofounder") || a.name.localeCompare(b.name, "de"),
      )
      .slice(0, MAX_RESULTS);
  }, [profiles, effectiveIds, trimmedQuery]);

  const add = (id: string) => setSelectedIds([...effectiveIds.filter((x) => x !== id), id]);
  const remove = (id: string) => setSelectedIds(effectiveIds.filter((x) => x !== id));

  if (!ready) return <TeamSkeleton />;

  if (!userContext) {
    return (
      <EmptyState
        icon={<UsersIcon />}
        title="Noch kein eigenes Profil"
        body="Für das Team-Radar brauchen wir deine Selbsteinschätzung in Vision, Design, Technik, Detail und Umsetzung. Lege dein Profil im Onboarding an – oder lade den Demo-Kontext und probiere es direkt aus."
        action={
          <>
            <Button onClick={loadDemo}>Demo-Kontext laden</Button>
            <LinkButton href="/onboarding" variant="secondary">
              Zum Onboarding
            </LinkButton>
          </>
        }
      />
    );
  }

  const verdict = scoreVerdict(analysis.successScore);
  const candidateCount = members.length - 1;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
      {/* ------------------------------------------------------------ */}
      {/* Links: Radar + Mitglieder                                     */}
      {/* ------------------------------------------------------------ */}
      <div className="flex min-w-0 flex-col gap-6">
        <Card
          title="Radar"
          description="Fünf Gründer-Dimensionen · „Team kombiniert“ = stärkster Wert + 0,3 × zweitstärkster (max. 10)"
          action={<Badge tone="neutral">Skala 0–10</Badge>}
        >
          <RadarChart series={series} size={400} className="pt-1" />
        </Card>

        <Card
          title={`Mitglieder (${members.length})`}
          description={
            <>
              Startauswahl ist deine{" "}
              <Link href="/shortlist" className="underline decoration-[var(--border)] underline-offset-2 hover:text-[var(--foreground)]">
                Shortlist
              </Link>
              .
            </>
          }
          action={
            selectedIds !== null && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(null)}>
                Zurück zur Shortlist
              </Button>
            )
          }
        >
          <ul className="-mx-2 flex flex-col">
            {members.map((m, i) => {
              const isMe = m.id === USER_MEMBER_ID;
              const p = isMe ? undefined : profileById.get(m.id);
              const role = m.founderRole ? FOUNDER_ROLE_LABELS[m.founderRole] : p ? NETWORK_ROLE_LABELS[p.networkRole] : undefined;
              const headline = isMe ? userContext.headline || "Dein Profil" : p?.headline;
              return (
                <li key={m.id} className="flex items-center gap-3 rounded-[var(--radius-sm)] px-2 py-2 transition hover:bg-[var(--surface-2)]">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: DEFAULT_SERIES_COLORS[i % DEFAULT_SERIES_COLORS.length] }}
                    aria-hidden
                  />
                  <Avatar src={p?.photoUrl} name={m.name} size={36} />
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
                    <p className="truncate text-xs text-[var(--muted)]">
                      {role}
                      {role && headline ? " · " : ""}
                      {headline}
                    </p>
                  </div>
                  {m.founderRole && (
                    <span className="hidden shrink-0 sm:inline-flex">
                      <Badge tone="accent">{FOUNDER_ROLE_LABELS[m.founderRole]}</Badge>
                    </span>
                  )}
                  {!isMe && (
                    <IconButton onClick={() => remove(m.id)} label={`${m.name} aus dem Team entfernen`} tone="danger">
                      <XIcon />
                    </IconButton>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-4 border-t border-[var(--border)] pt-4">
            {profiles.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">
                Noch keine Kandidat:innen in der Datenbank – sobald Profile importiert sind, kannst du sie hier ins Team holen.
              </p>
            ) : (
              <>
                <Label htmlFor="team-search">Kandidat:in hinzufügen</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--muted)]">
                    <SearchIcon />
                  </span>
                  <Input
                    id="team-search"
                    type="search"
                    autoComplete="off"
                    className="pl-9"
                    placeholder="Name, Headline oder Rolle – z. B. „Design“"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                {trimmedQuery ? (
                  <ul
                    className="fr-fade-in mt-2 divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)]"
                    aria-label="Suchergebnisse"
                  >
                    {results.length === 0 ? (
                      <li className="px-3 py-3 text-sm text-[var(--muted)]">Keine Treffer für „{trimmedQuery}“.</li>
                    ) : (
                      results.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => {
                              add(p.id);
                              setQuery("");
                            }}
                            className={cx("flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-[var(--surface-2)]", focusRing)}
                          >
                            <Avatar src={p.photoUrl} name={p.name} size={28} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-[var(--foreground)]">{p.name}</span>
                              <span className="block truncate text-xs text-[var(--muted)]">
                                {roleLabel(p)}
                                {p.headline ? ` · ${p.headline}` : ""}
                              </span>
                            </span>
                            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[var(--accent)]">
                              <PlusIcon />
                              <span className="hidden sm:inline">Hinzufügen</span>
                            </span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {candidateCount === 0
                      ? "Aktuell nur du – füge Kandidat:innen hinzu, um das Team zu simulieren."
                      : `${profiles.length} Profile durchsuchbar.`}
                  </p>
                )}
              </>
            )}
          </div>
        </Card>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* Rechts: Score, Analyse, Top-Ergänzungen                        */}
      {/* ------------------------------------------------------------ */}
      <div className="flex min-w-0 flex-col gap-6">
        <Card padding="lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Team-Score</p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-5xl font-semibold tabular-nums tracking-tight" style={{ color: TONE_COLOR[verdict.tone] }}>
                  {analysis.successScore}
                </span>
                <span className="text-sm text-[var(--muted)]">/ 100</span>
              </div>
            </div>
            <Badge tone={verdict.tone}>{verdict.text}</Badge>
          </div>
          <div className="mt-4">
            <ScoreBar value={analysis.successScore} tone={verdict.tone} />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
            60 % Niveau der kombinierten Dimensionen, 25 % Balance zwischen ihnen, bis 15 Punkte für die Teamgröße 2–3.{" "}
            {candidateCount === 0 ? "Aktuell nur du." : `Team: du + ${candidateCount}.`}
          </p>

          <ul className="mt-5 flex flex-col gap-3 border-t border-[var(--border)] pt-4">
            {FOUNDER_DIM_KEYS.map((k) => {
              const value = analysis.combined[k];
              return (
                <li key={k}>
                  <div className="mb-1 flex items-baseline justify-between text-xs">
                    <span className="text-[var(--muted)]">{FOUNDER_DIM_LABELS[k]}</span>
                    <span className="font-medium tabular-nums text-[var(--foreground)]">{formatDim(value)}</span>
                  </div>
                  <ScoreBar value={value} max={10} tone={dimTone(value)} />
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="Team-Analyse" description="Was das Team heute trägt – und wo es noch dünn ist.">
          <div className="flex flex-col gap-5">
            <section>
              <SectionLabel hint={`≥ ${formatDim(STRENGTH_THRESHOLD)}`}>Stärken</SectionLabel>
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
            </section>

            <section className="border-t border-[var(--border)] pt-4">
              <SectionLabel hint={`< ${formatDim(GAP_THRESHOLD)}`}>Lücken</SectionLabel>
              {analysis.gaps.length ? (
                <ul className="flex flex-col gap-2">
                  {analysis.gaps.map((g) => (
                    <li key={g.dim} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-[var(--foreground)]">{FOUNDER_DIM_LABELS[g.dim]}</span>
                        <Badge tone={g.score < 4 ? "danger" : "warning"}>{formatDim(g.score)} / 10</Badge>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">{adviceBody(g.advice)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                  <Badge tone="success">Alles abgedeckt</Badge>
                  <span>Keine Dimension unter 6,5.</span>
                </div>
              )}
            </section>

            <section className="border-t border-[var(--border)] pt-4">
              <SectionLabel>Empfohlene Rollen</SectionLabel>
              {analysis.recommendedRoles.length ? (
                <div className="flex flex-wrap gap-2">
                  {analysis.recommendedRoles.map((role) => (
                    <LinkButton key={role} variant="secondary" size="sm" href={`/candidates?founderRole=${role}&networkRole=cofounder`}>
                      {FOUNDER_ROLE_LABELS[role]} finden →
                    </LinkButton>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--muted)]">Euer Team braucht aktuell keine zusätzliche Rolle.</p>
              )}
            </section>
          </div>
        </Card>

        <Card title="Top-Ergänzungen" description="Simulation: Wer hebt den Team-Score am stärksten?">
          {suggestions.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              {profiles.length === 0
                ? "Noch keine Kandidat:innen in der Datenbank."
                : "Keine Person in der Datenbank würde den Team-Score aktuell weiter erhöhen."}
            </p>
          ) : (
            <ul className="-mx-2 flex flex-col">
              {suggestions.map((s, i) => (
                <li
                  key={s.profile.id}
                  className={cx(
                    "flex items-center gap-3 rounded-[var(--radius-sm)] px-2 py-2.5 transition hover:bg-[var(--surface-2)]",
                    i > 0 && "border-t border-[var(--border)]",
                  )}
                >
                  <Avatar src={s.profile.photoUrl} name={s.profile.name} size={36} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/candidates/${s.profile.id}`} className="block truncate text-sm font-medium text-[var(--foreground)] hover:underline">
                      {s.profile.name}
                    </Link>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {roleLabel(s.profile)} · Match {s.matchScore}
                      {s.closesGaps.length > 0 && ` · schließt ${s.closesGaps.map((k) => FOUNDER_DIM_LABELS[k]).join(", ")}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-[var(--success)]">+{s.delta}</p>
                    <p className="text-[11px] tabular-nums text-[var(--muted)]">→ {s.successScore}</p>
                  </div>
                  <IconButton onClick={() => add(s.profile.id)} label={`${s.profile.name} ins Team holen`} tone="accent">
                    <PlusIcon />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
