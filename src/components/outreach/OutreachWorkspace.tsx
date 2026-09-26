"use client";
/**
 * Outreach-Arbeitsfläche: priorisierte Kontakte (Top-10 aus dem Matching), pro Kontakt
 * Kanal wählen und per POST /api/outreach eine personalisierte Nachricht erzeugen.
 *
 * Muss in <Suspense> gerendert werden (useSearchParams).
 */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { getProfiles } from "@/lib/data";
import { rankCandidates } from "@/lib/matching";
import type { MatchResult, NetworkRole, OutreachDraft, Profile, UserContext } from "@/lib/types";
import { PERSONALITY_LABELS } from "@/lib/types";
import { useUserContext } from "@/lib/user-context";
import { Avatar, Badge, Button, Card, EmptyState, LinkButton, cx } from "@/components/ui";
import OutreachDraftCard from "./OutreachDraftCard";

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

interface RowState {
  channel?: Channel;
  draft?: OutreachDraft;
  loading: boolean;
  error?: string;
  /** Zählt erfolgreiche Generierungen – als React-Key, damit die Card zurückgesetzt wird. */
  version: number;
}

const EMPTY_ROW: RowState = { loading: false, version: 0 };

function defaultChannelFor(profile: Profile | undefined): Channel {
  if (!profile) return "email";
  if (profile.email) return "email";
  if (profile.linkedinUrl) return "linkedin";
  return "email";
}

function personalityLabel(profile: Profile): string {
  const type = profile.personality?.type;
  return (type && PERSONALITY_LABELS[type]) || "Unbekannt";
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

function ChannelToggle({
  value,
  onChange,
  disabled,
}: {
  value: Channel;
  onChange: (next: Channel) => void;
  disabled?: boolean;
}) {
  const options: { value: Channel; label: string }[] = [
    { value: "email", label: "E-Mail" },
    { value: "linkedin", label: "LinkedIn" },
  ];
  return (
    <div role="radiogroup" aria-label="Kanal" className="inline-flex rounded-md border border-[var(--border)] p-0.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cx(
              "rounded px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
              active
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function OutreachWorkspace() {
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("profile");
  const { userContext, ready, loadDemo } = useUserContext();

  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [selectedId, setSelectedId] = useState<string | null>(preselectedId);
  const [batchRunning, setBatchRunning] = useState(false);

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

  const setChannel = useCallback((profileId: string, channel: Channel) => {
    setRows((prev) => ({ ...prev, [profileId]: { ...(prev[profileId] ?? EMPTY_ROW), channel } }));
  }, []);

  const generate = useCallback(
    async (profileId: string, channel: Channel) => {
      if (!userContext) return;
      setSelectedId(profileId);
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
    [userContext],
  );

  const generateTop = useCallback(async () => {
    if (!userContext || batchRunning) return;
    setBatchRunning(true);
    try {
      for (const match of prioritized.slice(0, BATCH_N)) {
        const channel = rows[match.profileId]?.channel ?? defaultChannelFor(profileById.get(match.profileId));
        // Sequenziell, damit die API nicht mit parallelen LLM-Aufrufen geflutet wird.
        await generate(match.profileId, channel);
      }
    } finally {
      setBatchRunning(false);
    }
  }, [userContext, batchRunning, prioritized, rows, profileById, generate]);

  /* ---------------------------------------------------------------- */
  /* Zustände ohne Kontext                                             */
  /* ---------------------------------------------------------------- */

  if (!ready) {
    return <p className="text-sm text-[var(--muted)]">Lade Nutzer-Kontext…</p>;
  }

  if (!userContext) {
    return (
      <EmptyState
        title="Noch kein Nutzer-Kontext vorhanden"
        body="Damit wir Kontakte priorisieren und Nachrichten personalisieren können, brauchen wir dein Profil: Rolle, Idee, was du suchst."
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button onClick={loadDemo} type="button">
              Demo-Kontext laden
            </Button>
            <LinkButton href="/onboarding" variant="secondary">
              Onboarding starten
            </LinkButton>
          </div>
        }
      />
    );
  }

  const anyLoading = batchRunning || Object.values(rows).some((r) => r.loading);
  const generatedCount = Object.values(rows).filter((r) => r.draft).length;

  return (
    <div className="space-y-4">
      <Card
        title="Priorisierte Kontakte"
        action={
          <div className="flex flex-wrap items-center gap-2">
            {generatedCount > 0 && (
              <span className="text-xs text-[var(--muted)]">
                {generatedCount} {generatedCount === 1 ? "Entwurf" : "Entwürfe"}
              </span>
            )}
            <Button size="sm" onClick={generateTop} disabled={anyLoading || prioritized.length === 0} type="button">
              {batchRunning ? "Erzeuge Top 5…" : "Top 5 erzeugen"}
            </Button>
          </div>
        }
      >
        <p className="mb-3 text-sm text-[var(--muted)]">
          Für <span className="font-medium text-[var(--foreground)]">{userContext.name || "dich"}</span> sortiert nach
          Match-Score. Wähle den Kanal und erzeuge eine Nachricht, die auf den Persönlichkeitstyp der Person abgestimmt ist.
        </p>

        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Nach Rolle filtern">
          <FilterChip active={roleFilter === "all"} onClick={() => setRoleFilter("all")}>
            Alle ({ranked.length})
          </FilterChip>
          {NETWORK_ROLE_ORDER.filter((role) => (roleCounts[role] ?? 0) > 0).map((role) => (
            <FilterChip key={role} active={roleFilter === role} onClick={() => setRoleFilter(role)}>
              {NETWORK_ROLE_LABELS[role]} ({roleCounts[role]})
            </FilterChip>
          ))}
        </div>

        {prioritized.length === 0 ? (
          <EmptyState title="Keine Kontakte gefunden" body="Für diesen Filter gibt es aktuell keine passenden Profile." />
        ) : (
          <ol className="space-y-3">
            {prioritized.map((match, index) => {
              const profile = profileById.get(match.profileId);
              if (!profile) return null;
              const row = rows[profile.id] ?? EMPTY_ROW;
              const channel = row.channel ?? defaultChannelFor(profile);
              const selected = selectedId === profile.id;
              const pinned = preselectedId === profile.id;

              return (
                <li
                  key={profile.id}
                  className={cx(
                    "rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 transition",
                    selected && "ring-2 ring-[var(--accent)]",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="w-5 text-right text-xs font-medium text-[var(--muted)]">{index + 1}.</span>
                    <Avatar src={profile.photoUrl} name={profile.name} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/candidates/${profile.id}`}
                          className="text-sm font-medium text-[var(--foreground)] hover:underline"
                        >
                          {profile.name}
                        </Link>
                        <Badge tone="accent">{personalityLabel(profile)}</Badge>
                        <Badge tone="neutral">{NETWORK_ROLE_LABELS[profile.networkRole] ?? profile.networkRole}</Badge>
                        {pinned && <Badge tone="success">Ausgewählt</Badge>}
                      </div>
                      <p className="truncate text-sm text-[var(--muted)]" title={profile.headline}>
                        {profile.headline}
                      </p>
                    </div>
                    <div className="text-right" title="Match-Score">
                      <span className="text-lg font-semibold text-[var(--foreground)]">{Math.round(match.score)}</span>
                      <span className="text-xs text-[var(--muted)]"> / 100</span>
                    </div>
                    <ChannelToggle value={channel} onChange={(next) => setChannel(profile.id, next)} disabled={row.loading} />
                    <Button
                      size="sm"
                      variant={row.draft ? "secondary" : "primary"}
                      onClick={() => generate(profile.id, channel)}
                      disabled={row.loading || batchRunning}
                      type="button"
                    >
                      {row.loading ? "Erzeuge…" : row.draft ? "Neu erzeugen" : "Nachricht erzeugen"}
                    </Button>
                  </div>

                  {row.error && (
                    <p role="alert" className="mt-2 rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
                      {row.error}
                    </p>
                  )}

                  {row.draft && (
                    <div className="mt-3">
                      <OutreachDraftCard key={`${profile.id}-${row.version}`} draft={row.draft} profile={profile} />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        "rounded-full border px-3 py-1 text-xs font-medium transition",
        active
          ? "border-transparent bg-[var(--accent)] text-white"
          : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)]",
      )}
    >
      {children}
    </button>
  );
}
