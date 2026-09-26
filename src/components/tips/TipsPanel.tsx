"use client";
/**
 * Tipps-Panel: regelbasierte Tipps sofort (ohne API-Key), optional per /api/tips mit KI verfeinert.
 * Liest den Nutzer-Kontext ausschließlich über useUserContext().
 */
import { useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, LinkButton, ScoreBar } from "@/components/ui";
import {
  FOUNDER_ROLE_LABELS,
  NETWORK_ROLE_LABELS,
  STAGE_LABELS,
  TIP_CATEGORY_LABELS,
  TIP_PRIORITY_LABELS,
  generateTips,
  groupTipsByCategory,
  normalizeTips,
  weakestDim,
} from "@/lib/tips";
import { FOUNDER_DIM_KEYS, FOUNDER_DIM_LABELS, type Tip, type UserContext } from "@/lib/types";
import { useUserContext } from "@/lib/user-context";

type TipsSource = "rules" | "llm";

interface AiState {
  /** updatedAt des Kontexts, für den die KI-Tipps gelten – ändert sich das Profil, verfallen sie. */
  forUpdatedAt: string;
  tips: Tip[];
  source: TipsSource;
}

const PRIORITY_TONE: Record<Tip["priority"], "danger" | "warning" | "neutral"> = {
  1: "danger",
  2: "warning",
  3: "neutral",
};

export default function TipsPanel() {
  const { userContext, ready, loadDemo } = useUserContext();
  const [ai, setAi] = useState<AiState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ruleTips = useMemo(() => (userContext ? generateTips(userContext) : []), [userContext]);
  const aiState = ai && userContext && ai.forUpdatedAt === userContext.updatedAt ? ai : null;
  const tips = aiState?.tips ?? ruleTips;

  async function refine() {
    if (!userContext) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userContext }),
      });
      if (!res.ok) throw new Error(`Server antwortete mit Status ${res.status}.`);
      const data: unknown = await res.json();
      if (!Array.isArray(data)) throw new Error("Unerwartetes Antwortformat.");
      const refined = normalizeTips(data, ruleTips);
      if (refined.length === 0) throw new Error("Keine Tipps erhalten.");
      setAi({
        forUpdatedAt: userContext.updatedAt,
        tips: refined,
        source: res.headers.get("x-tips-source") === "llm" ? "llm" : "rules",
      });
    } catch (e) {
      setError(e instanceof Error ? `KI-Verfeinerung fehlgeschlagen: ${e.message}` : "KI-Verfeinerung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return <p className="text-sm text-[var(--muted)]">Profil wird geladen …</p>;
  }

  if (!userContext) {
    return (
      <EmptyState
        title="Noch kein Profil vorhanden"
        body="Die Tipps richten sich nach deiner Rolle, Stage, Idee und Selbsteinschätzung. Lade den Demo-Kontext oder starte das Onboarding."
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

  const groups = groupTipsByCategory(tips);
  const sourceLabel = aiState
    ? aiState.source === "llm"
      ? "KI-verfeinert"
      : "Regeln (kein API-Key konfiguriert)"
    : "regelbasiert";

  return (
    <div className="flex flex-col gap-4">
      <ProfileSummary user={userContext} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">
          {tips.length} Tipps · Quelle: {sourceLabel}
        </p>
        <div className="flex flex-wrap gap-2">
          {aiState && (
            <Button variant="ghost" onClick={() => setAi(null)}>
              Regel-Tipps anzeigen
            </Button>
          )}
          <Button onClick={refine} disabled={loading} aria-busy={loading}>
            {loading ? "Verfeinere …" : "Mit KI verfeinern"}
          </Button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]"
        >
          {error}
        </p>
      )}

      {groups.map((group) => (
        <Card key={group.category} title={`${TIP_CATEGORY_LABELS[group.category]} · ${group.tips.length}`}>
          <ul className="flex flex-col divide-y divide-[var(--border)]">
            {group.tips.map((tip) => (
              <TipItem key={tip.id} tip={tip} />
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

function ProfileSummary({ user }: { user: UserContext }) {
  const weak = weakestDim(user.dims);
  const items: Array<[string, string]> = [
    ["Rolle", user.founderRole ? FOUNDER_ROLE_LABELS[user.founderRole] : "nicht festgelegt"],
    ["Stage", user.stage ? STAGE_LABELS[user.stage] : "nicht festgelegt"],
    ["Schwächste Dimension", `${FOUNDER_DIM_LABELS[weak]} (${user.dims[weak]}/10)`],
    ["Sucht", user.lookingFor.length ? user.lookingFor.map((r) => NETWORK_ROLE_LABELS[r]).join(", ") : "–"],
    ["Fehlende Rollen", user.lookingForRoles.length ? user.lookingForRoles.map((r) => FOUNDER_ROLE_LABELS[r]).join(", ") : "–"],
    ["Verticals", user.verticals.length ? user.verticals.join(", ") : "–"],
  ];

  return (
    <Card
      title={`Dein Profil${user.name ? ` – ${user.name}` : ""}`}
      action={
        <LinkButton href="/onboarding" variant="ghost">
          Bearbeiten
        </LinkButton>
      }
    >
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
        {items.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-[var(--muted)]">{label}</dt>
            <dd className="font-medium text-[var(--foreground)]">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {FOUNDER_DIM_KEYS.map((k) => (
          <ScoreBar key={k} label={FOUNDER_DIM_LABELS[k]} value={user.dims[k]} max={10} />
        ))}
      </div>
    </Card>
  );
}

function TipItem({ tip }: { tip: Tip }) {
  return (
    <li className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-medium text-[var(--foreground)]">{tip.title}</h4>
        <Badge tone={PRIORITY_TONE[tip.priority]}>{TIP_PRIORITY_LABELS[tip.priority]}</Badge>
      </div>
      <p className="text-sm text-[var(--muted)]">{tip.body}</p>
    </li>
  );
}
