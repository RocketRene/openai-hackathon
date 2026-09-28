"use client";
/**
 * Outreach-Arbeitsfläche als Zwei-Spalten-Workspace (ab lg):
 * links priorisierte Kontakte (Top-10 aus dem Matching) mit Rollen-Filter, Kanalwahl und
 * "Nachricht erzeugen"; rechts der Composer mit dem ausgewählten Entwurf.
 * Entwürfe kommen per POST /api/outreach, `?profile=` pinnt einen Kontakt nach oben.
 *
 * Muss in <Suspense> gerendert werden (useSearchParams).
 */
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { getProfiles } from "@/lib/data";
import { rankCandidates } from "@/lib/matching";
import type { MatchResult, NetworkRole, OutreachDraft, Profile, UserContext } from "@/lib/types";
import { useUserContext } from "@/lib/user-context";
import { Avatar, Badge, Button, Card, Chip, EmptyState, LinkButton, Skeleton, cx } from "@/components/ui";
import OutreachDraftCard, { CHANNEL_LABELS, ComposerHeader, ComposerSkeleton, personalityLabel } from "./OutreachDraftCard";

type Channel = OutreachDraft["channel"];
type RoleFilter = NetworkRole | "all";

const TOP_N = 10;
const BATCH_N = 5;

const NETWORK_ROLE_LABELS: Record<NetworkRole, string> = {
  cofounder: "Co-Founder",
  investor: "Investor:innen",
  mentor: "Mentor:innen",
  talent: "Talente",
  expert: "Expert:innen",
};

const NETWORK_ROLE_ORDER: NetworkRole[] = ["cofounder", "investor", "mentor", "expert", "talent"];

const CHANNELS: Channel[] = ["email", "linkedin"];

interface RowState {
  channel?: Channel;
  draft?: OutreachDraft;
  loading: boolean;
  error?: string;
  /** Zählt erfolgreiche Generierungen – als React-Key, damit der Composer zurückgesetzt wird. */
  version: number;
}

const EMPTY_ROW: RowState = { loading: false, version: 0 };

function defaultChannelFor(profile: Profile | undefined): Channel {
  if (!profile) return "email";
  if (profile.email) return "email";
  if (profile.linkedinUrl) return "linkedin";
  return "email";
}

async function requestDraft(profileId: string, userContext: UserContext, channel: Channel): Promise<OutreachDraft> {
  const res = await fetch("/api/outreach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profileId, userContext, channel }),
  });

  if (!res.ok) {
    let message = `Die Nachricht konnte nicht erzeugt werden (HTTP ${res.status}).`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      /* Antwort war kein JSON */
    }
    throw new Error(message);
  }

  const draft = (await res.json()) as Partial<OutreachDraft>;
  if (!draft || typeof draft.body !== "string") {
    throw new Error("Ungültige Antwort von /api/outreach.");
  }
  return {
    profileId: draft.profileId ?? profileId,
    channel: draft.channel ?? channel,
    subject: draft.subject,
    body: draft.body,
    personalityNotes: Array.isArray(draft.personalityNotes) ? draft.personalityNotes : [],
    generatedBy: draft.generatedBy === "llm" ? "llm" : "template",
  };
}

/* ------------------------------------------------------------------ */
/* Kleine Bausteine                                                    */
/* ------------------------------------------------------------------ */

function ScorePill({ score }: { score: number }) {
  const value = Math.round(score);
  const tone =
    value >= 75
      ? "bg-[var(--success-soft)] text-[var(--success)]"
      : value >= 50
        ? "bg-[var(--accent-soft)] text-[var(--accent)]"
        : "bg-[var(--surface-2)] text-[var(--muted)]";
  return (
    <span
      className={cx("inline-flex h-7 min-w-10 shrink-0 items-center justify-center rounded-full px-2 text-xs font-semibold tabular-nums", tone)}
      title={`Match-Score ${value} / 100`}
      aria-label={`Match-Score ${value} von 100`}
    >
      {value}
    </span>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70"
      aria-hidden
    />
  );
}

function IconInbox() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5" aria-hidden>
      <path d="M3 11.5 5 5h10l2 6.5v3.5H3v-3.5Z" />
      <path d="M3 11.5h4l1.2 2h3.6l1.2-2h4" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5" aria-hidden>
      <circle cx="10" cy="7" r="3.2" />
      <path d="M4 16.5c.8-2.8 3-4.2 6-4.2s5.2 1.4 6 4.2" />
    </svg>
  );
}

function IconSparkle() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5" aria-hidden>
      <path d="M10 3v3M10 14v3M3 10h3M14 10h3M5.5 5.5l2 2M12.5 12.5l2 2M14.5 5.5l-2 2M7.5 12.5l-2 2" />
    </svg>
  );
}

function ChannelChips({
  value,
  onChange,
  disabled,
  profile,
}: {
  value: Channel;
  onChange: (next: Channel) => void;
  disabled?: boolean;
  profile: Profile;
}) {
  return (
    <div
      role="group"
      aria-label={`Kanal – gewählt: ${CHANNEL_LABELS[value]}`}
      className={cx("flex items-center gap-1.5", disabled && "pointer-events-none opacity-50")}
      aria-disabled={disabled || undefined}
    >
      {CHANNELS.map((channel) => {
        const active = value === channel;
        const available = channel === "email" ? Boolean(profile.email) : Boolean(profile.linkedinUrl);
        const hint = available ? undefined : channel === "email" ? "Keine E-Mail-Adresse hinterlegt" : "Kein LinkedIn-Profil hinterlegt";
        return (
          <span key={channel} title={hint} className="inline-flex">
            <Chip active={active} onClick={() => onChange(channel)}>
              <span className={cx(!available && !active && "opacity-60")}>{CHANNEL_LABELS[channel]}</span>
              {!available && <span aria-hidden className="ml-1 text-[10px] font-normal opacity-60">∅</span>}
              <span className="sr-only">{active ? ", gewählt" : ""}{!available ? `, ${hint}` : ""}</span>
            </Chip>
          </span>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Kontakt-Zeile                                                       */
/* ------------------------------------------------------------------ */

function ContactRow({
  profile,
  match,
  index,
  row,
  channel,
  selected,
  pinned,
  busy,
  onSelect,
  onChannel,
  onGenerate,
}: {
  profile: Profile;
  match: MatchResult;
  index: number;
  row: RowState;
  channel: Channel;
  selected: boolean;
  pinned: boolean;
  busy: boolean;
  onSelect: () => void;
  onChannel: (next: Channel) => void;
  onGenerate: () => void;
}) {
  return (
    <li
      className={cx(
        "group rounded-[var(--radius)] border bg-[var(--surface)] p-3 transition fr-fade-in",
        selected
          ? "border-[var(--accent)] shadow-[var(--shadow-md)] ring-1 ring-[var(--accent)]/30"
          : "border-[var(--border)] hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-sm)]",
      )}
      aria-current={selected ? "true" : undefined}
    >
      <div className="flex items-start gap-3">
        <span className="mt-2.5 w-4 shrink-0 text-right text-[11px] font-semibold tabular-nums text-[var(--muted)]">{index + 1}</span>
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          className="flex min-w-0 flex-1 items-start gap-3 rounded-[var(--radius-sm)] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          title={selected ? "Im Composer geöffnet" : "Im Composer öffnen"}
        >
          <Avatar src={profile.photoUrl} name={profile.name} size={40} />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="truncate text-sm font-semibold tracking-tight text-[var(--foreground)]">{profile.name}</span>
              <Badge tone="accent">{personalityLabel(profile)}</Badge>
              {pinned && <Badge tone="success">Vorausgewählt</Badge>}
              {row.draft && !row.loading && <Badge tone="neutral">Entwurf</Badge>}
            </span>
            <span className="mt-0.5 block truncate text-xs text-[var(--muted)]" title={profile.headline}>
              {profile.headline}
            </span>
            <span className="mt-0.5 block text-[11px] text-[var(--muted)]">
              {NETWORK_ROLE_LABELS[profile.networkRole] ?? profile.networkRole}
              {profile.location ? ` · ${profile.location}` : ""}
            </span>
          </span>
        </button>
        <ScorePill score={match.score} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pl-7">
        <ChannelChips value={channel} onChange={onChannel} disabled={row.loading} profile={profile} />
        <Button
          size="sm"
          variant={row.draft ? "secondary" : "primary"}
          onClick={onGenerate}
          disabled={row.loading || busy}
          type="button"
        >
          {row.loading && <Spinner />}
          {row.loading ? "Erzeuge …" : row.draft ? "Neu erzeugen" : "Nachricht erzeugen"}
        </Button>
      </div>

      {row.error && !row.draft && (
        <p role="alert" className="mt-2 ml-7 rounded-[var(--radius-sm)] bg-[var(--danger-soft)] px-3 py-1.5 text-xs text-[var(--danger)]">
          {row.error}
        </p>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Skeleton (auch als Suspense-Fallback der Seite)                     */
/* ------------------------------------------------------------------ */

export function OutreachWorkspaceSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]" aria-busy="true" aria-live="polite">
      <Card padding="none">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="flex flex-wrap gap-2 px-5 pt-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
        <ul className="space-y-3 p-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="rounded-[var(--radius)] border border-[var(--border)] p-3">
              <div className="flex items-start gap-3">
                <Skeleton className="mt-2.5 h-3 w-4" />
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
                <Skeleton className="h-7 w-10 rounded-full" />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 pl-7">
                <div className="flex gap-1.5">
                  <Skeleton className="h-8 w-20 rounded-full" />
                  <Skeleton className="h-8 w-20 rounded-full" />
                </div>
                <Skeleton className="h-8 w-36" />
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Card padding="none" className="hidden lg:block lg:self-start">
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
          <Skeleton className="h-11 w-11 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
        <ComposerSkeleton />
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Workspace                                                           */
/* ------------------------------------------------------------------ */

export default function OutreachWorkspace() {
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("profile");
  const { userContext, ready, loadDemo } = useUserContext();

  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [selectedId, setSelectedId] = useState<string | null>(preselectedId);
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  const profiles = useMemo(() => getProfiles(), []);
  const profileById = useMemo(() => new Map(profiles.map((p) => [p.id, p] as const)), [profiles]);

  const ranked = useMemo<MatchResult[]>(
    () => (userContext ? rankCandidates(userContext, profiles) : []),
    [userContext, profiles],
  );

  const roleCounts = useMemo(() => {
    const counts: Partial<Record<NetworkRole, number>> = {};
    for (const r of ranked) {
      const role = profileById.get(r.profileId)?.networkRole;
      if (role) counts[role] = (counts[role] ?? 0) + 1;
    }
    return counts;
  }, [ranked, profileById]);

  const prioritized = useMemo<MatchResult[]>(() => {
    const filtered =
      roleFilter === "all"
        ? ranked
        : ranked.filter((r) => profileById.get(r.profileId)?.networkRole === roleFilter);

    const pinned = preselectedId ? ranked.find((r) => r.profileId === preselectedId) : undefined;
    if (!pinned) return filtered.slice(0, TOP_N);

    const rest = filtered.filter((r) => r.profileId !== pinned.profileId).slice(0, TOP_N - 1);
    return [pinned, ...rest];
  }, [ranked, roleFilter, preselectedId, profileById]);

  /** Auswahl setzen; auf kleinen Screens (eine Spalte) zum Composer scrollen. */
  const selectContact = useCallback((profileId: string) => {
    setSelectedId(profileId);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      window.requestAnimationFrame(() => {
        composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, []);

  const setChannel = useCallback((profileId: string, channel: Channel) => {
    setRows((prev) => ({ ...prev, [profileId]: { ...(prev[profileId] ?? EMPTY_ROW), channel } }));
  }, []);

  const generate = useCallback(
    async (profileId: string, channel: Channel, options: { select?: boolean } = {}) => {
      if (!userContext) return;
      if (options.select !== false) selectContact(profileId);
      setRows((prev) => ({
        ...prev,
        [profileId]: { ...(prev[profileId] ?? EMPTY_ROW), channel, loading: true, error: undefined },
      }));
      try {
        const draft = await requestDraft(profileId, userContext, channel);
        setRows((prev) => {
          const current = prev[profileId] ?? EMPTY_ROW;
          return {
            ...prev,
            [profileId]: { channel, draft, loading: false, error: undefined, version: current.version + 1 },
          };
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unbekannter Fehler.";
        setRows((prev) => ({
          ...prev,
          [profileId]: { ...(prev[profileId] ?? EMPTY_ROW), channel, loading: false, error: message },
        }));
      }
    },
    [userContext, selectContact],
  );

  const batchRunning = batch !== null;

  const generateTop = useCallback(async () => {
    if (!userContext || batchRunning) return;
    const targets = prioritized.slice(0, BATCH_N);
    if (targets.length === 0) return;
    setBatch({ done: 0, total: targets.length });
    // Composer zeigt den ersten Kontakt, falls noch nichts ausgewählt ist – und springt danach nicht mehr.
    if (!selectedId || !targets.some((t) => t.profileId === selectedId)) selectContact(targets[0].profileId);
    try {
      for (const [i, match] of targets.entries()) {
        const channel = rows[match.profileId]?.channel ?? defaultChannelFor(profileById.get(match.profileId));
        // Sequenziell, damit die API nicht mit parallelen LLM-Aufrufen geflutet wird.
        await generate(match.profileId, channel, { select: false });
        setBatch({ done: i + 1, total: targets.length });
      }
    } finally {
      setBatch(null);
    }
  }, [userContext, batchRunning, prioritized, selectedId, selectContact, rows, profileById, generate]);

  /* ---------------------------------------------------------------- */
  /* Zustände ohne Kontext                                             */
  /* ---------------------------------------------------------------- */

  if (!ready) {
    return <OutreachWorkspaceSkeleton />;
  }

  if (!userContext) {
    return (
      <EmptyState
        icon={<IconUser />}
        title="Noch kein Nutzer-Kontext vorhanden"
        body="Damit wir Kontakte priorisieren und Nachrichten personalisieren können, brauchen wir dein Profil: Rolle, Idee, was du suchst."
        action={
          <>
            <Button onClick={loadDemo} type="button">
              Demo-Kontext laden
            </Button>
            <LinkButton href="/onboarding" variant="secondary">
              Onboarding starten
            </LinkButton>
          </>
        }
      />
    );
  }

  const anyLoading = batchRunning || Object.values(rows).some((r) => r.loading);
  const generatedCount = Object.values(rows).filter((r) => r.draft).length;
  const batchLabel = batch ? `Erzeuge … ${Math.min(batch.done + 1, batch.total)}/${batch.total}` : `Top ${Math.min(BATCH_N, prioritized.length) || BATCH_N} erzeugen`;

  const selectedProfile = selectedId ? profileById.get(selectedId) : undefined;
  const selectedRow = selectedId ? (rows[selectedId] ?? EMPTY_ROW) : EMPTY_ROW;
  const selectedChannel = selectedRow.channel ?? defaultChannelFor(selectedProfile);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* ------------------------------------------------------------ */}
      {/* Links: priorisierte Kontakte                                  */}
      {/* ------------------------------------------------------------ */}
      <Card padding="none" className="min-w-0">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">Priorisierte Kontakte</h2>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Für <span className="font-medium text-[var(--foreground)]">{userContext.name || "dich"}</span> sortiert nach Match-Score
                {generatedCount > 0 && (
                  <>
                    {" · "}
                    <span className="font-medium text-[var(--foreground)]">{generatedCount}</span> {generatedCount === 1 ? "Entwurf" : "Entwürfe"}
                  </>
                )}
              </p>
            </div>
            <Button
              size="sm"
              onClick={generateTop}
              disabled={anyLoading || prioritized.length === 0}
              type="button"
              className="min-w-36 tabular-nums"
              aria-live="polite"
            >
              {batchRunning ? <Spinner /> : <IconSparkle />}
              {batchLabel}
            </Button>
          </div>
          {batch && (
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[var(--surface-3)]" aria-hidden>
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500"
                style={{ width: `${Math.max(6, Math.round((batch.done / batch.total) * 100))}%` }}
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 px-5 pt-4" role="group" aria-label="Nach Rolle filtern">
          <Chip active={roleFilter === "all"} onClick={() => setRoleFilter("all")}>
            Alle
            <span className="ml-1.5 tabular-nums opacity-70">{ranked.length}</span>
          </Chip>
          {NETWORK_ROLE_ORDER.filter((role) => (roleCounts[role] ?? 0) > 0).map((role) => (
            <Chip key={role} active={roleFilter === role} onClick={() => setRoleFilter(role)}>
              {NETWORK_ROLE_LABELS[role]}
              <span className="ml-1.5 tabular-nums opacity-70">{roleCounts[role]}</span>
            </Chip>
          ))}
        </div>

        <div className="p-5">
          {prioritized.length === 0 ? (
            <EmptyState
              icon={<IconInbox />}
              title="Keine Kontakte gefunden"
              body="Für diesen Filter gibt es aktuell keine passenden Profile."
              action={
                roleFilter !== "all" && (
                  <Button size="sm" variant="secondary" onClick={() => setRoleFilter("all")} type="button">
                    Filter zurücksetzen
                  </Button>
                )
              }
            />
          ) : (
            <ol className="space-y-3">
              {prioritized.map((match, index) => {
                const profile = profileById.get(match.profileId);
                if (!profile) return null;
                const row = rows[profile.id] ?? EMPTY_ROW;
                const channel = row.channel ?? defaultChannelFor(profile);
                return (
                  <ContactRow
                    key={profile.id}
                    profile={profile}
                    match={match}
                    index={index}
                    row={row}
                    channel={channel}
                    selected={selectedId === profile.id}
                    pinned={preselectedId === profile.id}
                    busy={batchRunning}
                    onSelect={() => selectContact(profile.id)}
                    onChannel={(next) => setChannel(profile.id, next)}
                    onGenerate={() => generate(profile.id, channel)}
                  />
                );
              })}
            </ol>
          )}
        </div>
      </Card>

      {/* ------------------------------------------------------------ */}
      {/* Rechts: Composer                                              */}
      {/* ------------------------------------------------------------ */}
      {/* Ab lg sticky; wird der Composer höher als der Viewport, scrollt er intern statt abgeschnitten zu werden. */}
      <div
        ref={composerRef}
        className="min-w-0 scroll-mt-20 fr-scroll lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:pb-4"
      >
        {!selectedProfile ? (
          <EmptyState
            icon={<IconInbox />}
            title="Wähle links einen Kontakt"
            body="Klicke auf eine Person oder erzeuge direkt eine Nachricht – der Entwurf erscheint hier zum Bearbeiten, Kopieren und Versenden."
            action={
              prioritized.length > 0 && (
                <Button size="sm" onClick={generateTop} disabled={anyLoading} type="button">
                  {batchLabel}
                </Button>
              )
            }
          />
        ) : selectedRow.draft && !selectedRow.loading ? (
          <OutreachDraftCard
            key={`${selectedProfile.id}-${selectedRow.version}`}
            draft={selectedRow.draft}
            profile={selectedProfile}
            error={selectedRow.error}
            busy={batchRunning}
            onRegenerate={() => generate(selectedProfile.id, selectedChannel)}
          />
        ) : (
          <Card padding="none" className="overflow-hidden fr-fade-in">
            <ComposerHeader profile={selectedProfile} badges={<Badge tone="neutral">{CHANNEL_LABELS[selectedChannel]}</Badge>} />
            {selectedRow.loading ? (
              <ComposerSkeleton channel={selectedChannel} />
            ) : selectedRow.error ? (
              <div className="space-y-4 p-5">
                <p role="alert" className="rounded-[var(--radius-sm)] border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
                  {selectedRow.error}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => generate(selectedProfile.id, selectedChannel)} disabled={batchRunning} type="button">
                    Erneut versuchen
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => generate(selectedProfile.id, selectedChannel === "email" ? "linkedin" : "email")}
                    disabled={batchRunning}
                    type="button"
                  >
                    Stattdessen {selectedChannel === "email" ? "LinkedIn" : "E-Mail"} erzeugen
                  </Button>
                </div>
              </div>
            ) : (
              <div className="px-5 py-10 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                  <IconSparkle />
                </div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Noch kein Entwurf für {selectedProfile.name}</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--muted)]">
                  Die Nachricht wird auf den Persönlichkeitstyp{" "}
                  <span className="font-medium text-[var(--foreground)]">{personalityLabel(selectedProfile)}</span> abgestimmt.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  <Button size="sm" onClick={() => generate(selectedProfile.id, selectedChannel)} disabled={batchRunning} type="button">
                    <IconSparkle />
                    {CHANNEL_LABELS[selectedChannel]}-Nachricht erzeugen
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
