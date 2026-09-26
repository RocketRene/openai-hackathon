"use client";
/**
 * Arbeitsbereich "Gespräch vorbereiten": Kopf mit Profil, Kontext-Hinweis, zwei Bereiche
 * (Vorbereitung = PrepPack aus POST /api/prep, Simulation = Voice + Text-Chat).
 */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Personality, PrepPack, Profile, UserContext } from "@/lib/types";
import { PERSONALITY_LABELS } from "@/lib/types";
import { useUserContext } from "@/lib/user-context";
import { Avatar, Badge, Button, Card, EmptyState, LinkButton, cx } from "@/components/ui";
import PrepPackView from "./PrepPackView";
import SimulationPanel from "./SimulationPanel";

type Section = "prep" | "simulation";

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

function LoadingSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Vorbereitung wird generiert">
      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <div className="h-4 w-1/3 animate-pulse rounded bg-[var(--surface-3)]" />
          <div className="mt-3 space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-[var(--surface-2)]" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-[var(--surface-2)]" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--surface-2)]" />
          </div>
        </Card>
      ))}
      <p className="text-center text-sm text-[var(--muted)]">Vorbereitung wird generiert …</p>
    </div>
  );
}

export default function PrepWorkspace({ profile }: { profile: Profile }) {
  const { userContext, ready, loadDemo } = useUserContext();
  const [section, setSection] = useState<Section>("prep");
  const [pack, setPack] = useState<PrepPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchPrepPack(profile.id, userContext, controller.signal)
      .then((p) => {
        setPack(p);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Unbekannter Fehler.");
        setLoading(false);
      });
    return () => controller.abort();
    // userContext?.updatedAt: bei Kontext-Änderung (z. B. Demo laden) neu generieren.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, profile.id, userContext?.updatedAt, reloadKey]);

  const regenerate = useCallback(() => setReloadKey((k) => k + 1), []);

  const personality = profile.personality as Personality | undefined;

  return (
    <div className="space-y-5">
      {/* Kopf */}
      <Card>
        <div className="flex flex-wrap items-start gap-4">
          <Avatar src={profile.photoUrl} name={profile.name} size={64} />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{profile.name}</h2>
            <p className="text-sm text-[var(--muted)]">{profile.headline}</p>
            {profile.location && <p className="mt-0.5 text-xs text-[var(--muted)]">{profile.location}</p>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="accent">{NETWORK_ROLE_LABELS[profile.networkRole] ?? profile.networkRole}</Badge>
              {profile.founderRole && <Badge>{FOUNDER_ROLE_LABELS[profile.founderRole] ?? profile.founderRole}</Badge>}
              {personality && <Badge tone="success">{PERSONALITY_LABELS[personality.type] ?? personality.type}</Badge>}
              {(profile.verticals ?? []).slice(0, 4).map((v) => (
                <Badge key={v}>{v}</Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <LinkButton href={`/candidates/${profile.id}`} variant="secondary">
              Zum Profil
            </LinkButton>
            <Button variant="secondary" onClick={regenerate} disabled={loading}>
              {loading ? "Generiere …" : "Neu generieren"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Kontext-Hinweis */}
      {ready && !userContext && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--warning)] bg-[var(--warning-soft)] px-4 py-3">
          <p className="text-sm text-[var(--foreground)]">
            <span className="font-medium">Kein Nutzer-Kontext.</span> Ohne deine Idee und Stärken bleibt die Vorbereitung
            generisch – lade den Demo-Kontext oder mach das{" "}
            <Link href="/onboarding" className="underline">
              Onboarding
            </Link>
            .
          </p>
          <Button size="sm" onClick={loadDemo}>
            Demo-Kontext laden
          </Button>
        </div>
      )}

      {/* Bereichs-Umschalter */}
      <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-1" role="tablist" aria-label="Bereich">
        {(
          [
            { id: "prep", label: "Vorbereitung" },
            { id: "simulation", label: "Simulation" },
          ] as { id: Section; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={section === tab.id}
            onClick={() => setSection(tab.id)}
            className={cx(
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition",
              section === tab.id
                ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Vorbereitung */}
      <div role="tabpanel" hidden={section !== "prep"}>
        {loading && !pack && <LoadingSkeleton />}
        {!loading && error && !pack && (
          <EmptyState
            title="Vorbereitung konnte nicht geladen werden"
            body={error}
            action={
              <Button onClick={regenerate}>Erneut versuchen</Button>
            }
          />
        )}
        {pack && (
          <div className={cx(loading && "opacity-60 transition")}>
            {error && !loading && (
              <p className="mb-3 text-sm text-[var(--danger)]">{error} Es wird die letzte Version angezeigt.</p>
            )}
            <PrepPackView pack={pack} profile={profile} />
          </div>
        )}
      </div>

      {/* Simulation – bleibt gemountet, damit eine laufende Voice-Session nicht abbricht */}
      <div role="tabpanel" hidden={section !== "simulation"}>
        <SimulationPanel profile={profile} userContext={userContext} />
      </div>
    </div>
  );
}
