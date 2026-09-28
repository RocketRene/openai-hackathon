"use client";
/**
 * Arbeitsbereich "Gespräch vorbereiten": Kopf-Card mit Profil, Kontext-Hinweis und ein Segmented-Control
 * für zwei Bereiche (Vorbereitung = PrepPack aus POST /api/prep, Simulation = Voice + Text-Chat).
 * Beide Bereiche bleiben gemountet und werden nur ein-/ausgeblendet, damit eine laufende Voice-Session weiterläuft.
 */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Personality, PrepPack, Profile, UserContext } from "@/lib/types";
import { PERSONALITY_LABELS } from "@/lib/types";
import { buildInterviewGuide } from "@/lib/interview-guide";
import { useUserContext } from "@/lib/user-context";
import { Avatar, Badge, Button, Card, EmptyState, Kicker, LinkButton, Skeleton, cx } from "@/components/ui";
import InterviewGuideCard from "@/components/assistant/InterviewGuideCard";
import PrepPackView from "./PrepPackView";
import SimulationPanel from "./SimulationPanel";
import { IconAlert, IconArrowRight, IconChat, IconExternal, IconList, IconPin, IconSparkles } from "./shared";

type Section = "prep" | "simulation";

const TABS: { id: Section; label: string; icon: ReactNode }[] = [
  { id: "prep", label: "Vorbereitung", icon: <IconList size={14} /> },
  { id: "simulation", label: "Simulation", icon: <IconChat size={14} /> },
];

const NETWORK_ROLE_LABELS: Record<Profile["networkRole"], string> = {
  cofounder: "Co-Founder",
  investor: "Investor:in",
  mentor: "Mentor:in",
  talent: "Talent",
  expert: "Expert:in",
};

const FOUNDER_ROLE_LABELS: Record<NonNullable<Profile["founderRole"]>, string> = {
  tech: "Tech",
  commercial: "Commercial",
  product: "Produkt",
  design: "Design",
  operations: "Operations",
  "domain-expert": "Domain-Expert:in",
};

async function fetchPrepPack(profileId: string, userContext: UserContext | null, signal?: AbortSignal): Promise<PrepPack> {
  const res = await fetch("/api/prep", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profileId, userContext }),
    signal,
  });
  if (!res.ok) {
    let detail = "";
    try {
      const data = (await res.json()) as { error?: string };
      detail = data.error ? ` – ${data.error}` : "";
    } catch {
      /* ignore */
    }
    throw new Error(`Vorbereitung konnte nicht geladen werden (HTTP ${res.status})${detail}.`);
  }
  return (await res.json()) as PrepPack;
}

/** Skeleton, das die Struktur der fertigen Vorbereitung spiegelt (Toolbar, Fragen, drei Cards, Zitat). */
function PrepSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Vorbereitung wird generiert">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-4 w-64 max-w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-8 w-36" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="mb-4 h-5 w-72 max-w-full" />
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]"
          >
            <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
            <Skeleton className={cx("h-4", i % 2 ? "w-2/3" : "w-1/2")} />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <Skeleton className="mb-4 h-4 w-28" />
            <div className="space-y-2.5">
              <Skeleton />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </Card>
        ))}
      </div>
      <Card padding="lg">
        <Skeleton className="mb-3 h-3 w-24" />
        <Skeleton className="mb-2 h-6 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
      </Card>
      <p className="flex items-center justify-center gap-2 text-sm text-[var(--muted)]">
        <IconSparkles size={14} className="animate-pulse text-[var(--accent)]" />
        Vorbereitung wird generiert …
      </p>
    </div>
  );
}

function ProfileHeader({ profile }: { profile: Profile }) {
  const personality = profile.personality as Personality | undefined;
  const lookingFor = (profile.lookingFor ?? []).slice(0, 3);
  return (
    <Card padding="lg">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="shrink-0 self-start rounded-full bg-[var(--accent-soft)] p-1">
          <Avatar src={profile.photoUrl} name={profile.name} size={72} />
        </div>
        <div className="min-w-0 flex-1">
          <Kicker>Gesprächspartner:in</Kicker>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">{profile.name}</h2>
          {profile.headline && <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{profile.headline}</p>}
          {profile.location && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-[var(--muted)]">
              <IconPin size={12} />
              {profile.location}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge tone="accent">{NETWORK_ROLE_LABELS[profile.networkRole] ?? profile.networkRole}</Badge>
            {profile.founderRole && <Badge>{FOUNDER_ROLE_LABELS[profile.founderRole] ?? profile.founderRole}</Badge>}
            {personality && <Badge tone="success">{PERSONALITY_LABELS[personality.type] ?? personality.type}</Badge>}
            {(profile.verticals ?? []).slice(0, 3).map((v) => (
              <Badge key={v}>{v}</Badge>
            ))}
          </div>
          {lookingFor.length > 0 && (
            <p className="mt-3 text-xs text-[var(--muted)]">
              <span className="font-medium text-[var(--foreground)]">Sucht: </span>
              {lookingFor.join(" · ")}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-end">
          <LinkButton href={`/candidates/${profile.id}`} variant="secondary" size="sm">
            Zum Profil <IconArrowRight size={14} />
          </LinkButton>
          {profile.linkedinUrl && (
            <LinkButton href={profile.linkedinUrl} target="_blank" variant="ghost" size="sm">
              LinkedIn <IconExternal size={14} />
            </LinkButton>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function PrepWorkspace({ profile }: { profile: Profile }) {
  const { userContext, ready, loadDemo } = useUserContext();
  const [section, setSection] = useState<Section>("prep");
  const [reloadKey, setReloadKey] = useState(0);
  // Ergebnis der letzten Anfrage, mit dem Key, für den es gilt. Ladezustand wird daraus abgeleitet
  // (kein synchrones setState im Effect). Key ändert sich bei Kontext-Änderung (z. B. Demo laden).
  const [result, setResult] = useState<{ key: string; pack: PrepPack | null; error: string | null } | null>(null);
  const requestKey = ready ? `${profile.id}|${userContext?.updatedAt ?? "none"}|${reloadKey}` : null;

  useEffect(() => {
    if (!requestKey) return;
    const controller = new AbortController();
    fetchPrepPack(profile.id, userContext, controller.signal)
      .then((p) => setResult({ key: requestKey, pack: p, error: null }))
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setResult((prev) => ({
          key: requestKey,
          pack: prev?.pack ?? null,
          error: e instanceof Error ? e.message : "Unbekannter Fehler.",
        }));
      });
    return () => controller.abort();
    // profile.id und userContext sind im requestKey enthalten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const loading = requestKey === null || result?.key !== requestKey;
  const pack = result?.pack ?? null;
  const error = !loading ? result?.error ?? null : null;

  const regenerate = useCallback(() => setReloadKey((k) => k + 1), []);

  // Deterministischer 30-Minuten-Leitfaden (Voya prepare_interview) – ohne API, sofort da.
  const guide = useMemo(() => buildInterviewGuide(profile, ready ? userContext : null), [profile, ready, userContext]);

  return (
    <div className="space-y-6">
      <ProfileHeader profile={profile} />

      {/* Kontext-Hinweis */}
      {ready && !userContext && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--warning)]/40 bg-[var(--warning-soft)] px-4 py-3">
          <div className="flex items-start gap-2.5">
            <IconAlert size={16} className="mt-0.5 shrink-0 text-[var(--warning)]" />
            <p className="text-sm text-[var(--foreground)]">
              <span className="font-medium">Kein Nutzer-Kontext.</span> Ohne deine Idee und Stärken bleibt die Vorbereitung
              generisch – lade den Demo-Kontext oder mach das{" "}
              <Link href="/onboarding" className="font-medium underline underline-offset-2">
                Onboarding
              </Link>
              .
            </p>
          </div>
          <Button size="sm" onClick={loadDemo}>
            Demo-Kontext laden
          </Button>
        </div>
      )}

      {/* Segmented-Control */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Bereich"
          className="inline-flex w-full rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-1 sm:w-auto"
        >
          {TABS.map((tab) => {
            const active = section === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`prep-tab-${tab.id}`}
                aria-selected={active}
                aria-controls={`prep-panel-${tab.id}`}
                onClick={() => setSection(tab.id)}
                className={cx(
                  "inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-full px-4 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] sm:flex-none",
                  active
                    ? "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-[var(--shadow-sm)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]",
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>
        <p className="hidden text-xs text-[var(--muted)] md:block">
          {section === "prep"
            ? "Lies dich ein – dann übe das Gespräch in der Simulation."
            : "Die Simulation läuft weiter, auch wenn du zur Vorbereitung wechselst."}
        </p>
      </div>

      {/* Vorbereitung */}
      <div role="tabpanel" id="prep-panel-prep" aria-labelledby="prep-tab-prep" hidden={section !== "prep"} className="space-y-6">
        <InterviewGuideCard guide={guide} />
        {loading && !pack && <PrepSkeleton />}
        {!loading && error && !pack && (
          <EmptyState
            icon={<IconAlert size={18} />}
            title="Vorbereitung konnte nicht geladen werden"
            body={error}
            action={<Button onClick={regenerate}>Erneut versuchen</Button>}
          />
        )}
        {pack && (
          <div className={cx("space-y-4 transition-opacity", loading && "opacity-60")}>
            {error && !loading && (
              <div className="flex items-start gap-2.5 rounded-[var(--radius-lg)] border border-[var(--danger)]/40 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
                <IconAlert size={16} className="mt-0.5 shrink-0" />
                <p>{error} Es wird die letzte Version angezeigt.</p>
              </div>
            )}
            <PrepPackView pack={pack} profile={profile} onRegenerate={regenerate} regenerating={loading} />
          </div>
        )}
      </div>

      {/* Simulation – bleibt gemountet, damit eine laufende Voice-Session nicht abbricht */}
      <div role="tabpanel" id="prep-panel-simulation" aria-labelledby="prep-tab-simulation" hidden={section !== "simulation"}>
        <SimulationPanel profile={profile} userContext={userContext} />
      </div>
    </div>
  );
}
