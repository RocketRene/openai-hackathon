"use client";
/**
 * Match-Karte für ein Profil: großer Score in Tier-Farbe, Kurzfazit (explainMatch), Gründe mit
 * Gewicht-Balken, Risiken als Warn-Badges, Komplementarität und die fünf Team-Dimensionen
 * „Ich vs. Person“. Rechnet deterministisch mit scoreMatch() aus dem Nutzer-Kontext (localStorage).
 * Ohne Kontext: EmptyState + „Demo-Kontext laden“, damit die Demo nie leer ist.
 */
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { FOUNDER_DIM_KEYS, FOUNDER_DIM_LABELS, type Profile } from "@/lib/types";
import { MATCH_TIER_LABELS, explainMatch, matchTier, scoreMatch, type MatchTier } from "@/lib/matching";
import { useUserContext } from "@/lib/user-context";
import { Badge, Button, Card, EmptyState, LinkButton, ScoreBar, Skeleton, cx } from "@/components/ui";

type BadgeTone = "success" | "accent" | "warning" | "neutral";

/** Tier → Badge-Ton + CSS-Farbtoken (nur var(--…)). */
const TIER_STYLE: Record<MatchTier, { badge: BadgeTone; color: string }> = {
  top: { badge: "success", color: "var(--success)" },
  gut: { badge: "accent", color: "var(--accent)" },
  möglich: { badge: "warning", color: "var(--warning)" },
  schwach: { badge: "neutral", color: "var(--muted)" },
};

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function clampPct(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <h4 className={cx("text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]", className)}>{children}</h4>;
}

/** Dünner Balken; Farbe als Token-String, damit auch „Ich“ (muted) möglich ist. */
function ThinBar({ pct, color, className }: { pct: number; color: string; className?: string }) {
  return (
    <div className={cx("h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]", className)}>
      <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/** Kreis-Score mit Tier-Farbe (conic-gradient aus Tokens). */
function ScoreRing({ score, color }: { score: number; color: string }) {
  const pct = clampPct(score, 100);
  return (
    <div
      role="img"
      aria-label={`Match-Score ${score} von 100`}
      className="relative h-24 w-24 shrink-0 rounded-full"
      style={{ background: `conic-gradient(${color} ${pct}%, var(--surface-3) 0)` }}
    >
      <div className="absolute inset-[7px] flex flex-col items-center justify-center rounded-full bg-[var(--surface)]">
        <span className="text-[26px] font-semibold leading-none tabular-nums tracking-tight" style={{ color }}>
          {score}
        </span>
        <span className="mt-1 text-[10px] font-medium text-[var(--muted)]">von 100</span>
      </div>
    </div>
  );
}

function SparkIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v3" />
      <path d="M12 18v3" />
      <path d="m5.6 5.6 2.1 2.1" />
      <path d="m16.3 16.3 2.1 2.1" />
      <path d="M3 12h3" />
      <path d="M18 12h3" />
      <path d="m5.6 18.4 2.1-2.1" />
      <path d="m16.3 7.7 2.1-2.1" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** Die fünf Dimensionen der Person allein (ohne Nutzer-Kontext). */
function OwnDims({ profile }: { profile: Profile }) {
  return (
    <div className="mt-6 border-t border-[var(--border)] pt-5">
      <SectionLabel>Team-Dimensionen von {firstName(profile.name)}</SectionLabel>
      <div className="mt-3 flex flex-col gap-3">
        {FOUNDER_DIM_KEYS.map((key) => (
          <ScoreBar key={key} label={FOUNDER_DIM_LABELS[key]} value={profile.dims?.[key] ?? 0} max={10} />
        ))}
      </div>
      <p className="mt-3 text-xs text-[var(--muted)]">Skala 0–10, aus Profil und Werdegang abgeleitet.</p>
    </div>
  );
}

export default function MatchBreakdown({ profile }: { profile: Profile }) {
  const { userContext, ready, loadDemo } = useUserContext();
  const match = useMemo(() => (userContext ? scoreMatch(userContext, profile) : null), [userContext, profile]);
  const summary = useMemo(() => (userContext && match ? explainMatch(match, userContext, profile) : ""), [userContext, match, profile]);

  if (!ready) {
    return (
      <Card title="Match" description="Passung zu deinem Gründer:innen-Profil">
        <div className="flex items-center gap-5">
          <Skeleton className="h-24 w-24 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </Card>
    );
  }

  if (!userContext || !match) {
    return (
      <Card title="Match" description="Passung zu deinem Gründer:innen-Profil">
        <EmptyState
          icon={<SparkIcon />}
          title="Wir kennen dein Gründer:innen-Profil noch nicht"
          body={`Lege es im Onboarding an – oder lade den Demo-Kontext, um sofort zu sehen, wie gut ${firstName(profile.name)} zu dir passt.`}
          action={
            <>
              <Button size="sm" onClick={loadDemo}>
                Demo-Kontext laden
              </Button>
              <LinkButton href="/onboarding" size="sm" variant="secondary">
                Onboarding starten
              </LinkButton>
            </>
          }
        />
        <OwnDims profile={profile} />
      </Card>
    );
  }

  const tier = matchTier(match.score);
  const { badge, color } = TIER_STYLE[tier];
  const them = firstName(profile.name);
  const maxWeight = Math.max(1, ...match.reasons.map((r) => r.weight));
  const complementDims = FOUNDER_DIM_KEYS.filter((key) => (profile.dims?.[key] ?? 0) > (userContext.dims?.[key] ?? 0));

  return (
    <Card title="Match" description="Passung zu deinem Gründer:innen-Profil" action={<Badge tone={badge}>{MATCH_TIER_LABELS[tier]}</Badge>}>
      {/* Score + Kurzfazit */}
      <div className="flex items-start gap-5">
        <ScoreRing score={match.score} color={color} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--foreground)]">{MATCH_TIER_LABELS[tier]}</p>
          {summary && <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{summary}</p>}
        </div>
      </div>

      {/* Gründe */}
      <div className="mt-6">
        <SectionLabel>Warum es passt</SectionLabel>
        {match.reasons.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">Keine klaren Überschneidungen mit deinem Profil gefunden.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3.5">
            {match.reasons.map((reason, i) => (
              <li key={`${reason.label}-${i}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-medium text-[var(--foreground)]">{reason.label}</p>
                  <span className="shrink-0 text-xs font-semibold tabular-nums" style={{ color }}>
                    +{reason.weight}
                  </span>
                </div>
                <ThinBar pct={clampPct(reason.weight, maxWeight)} color={color} className="mt-1.5" />
                {reason.detail && <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">{reason.detail}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Risiken */}
      <div className="mt-6">
        <SectionLabel>Worauf du achten solltest</SectionLabel>
        {match.risks.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">Keine offensichtlichen Risiken.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {match.risks.map((risk, i) => (
              <li key={`${risk}-${i}`} className="max-w-full">
                <Badge tone="warning" className="whitespace-normal py-1 text-left leading-snug">
                  {risk}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Komplementarität */}
      <div className="mt-6 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
        <ScoreBar label="Komplementarität" value={match.complementarity} />
        <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
          Wie stark {them} deine schwächeren Team-Dimensionen ergänzt
          {complementDims.length > 0 ? ` – stärker als du bei ${complementDims.map((k) => FOUNDER_DIM_LABELS[k]).join(", ")}.` : "."}
        </p>
      </div>

      {/* Dims-Vergleich */}
      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <SectionLabel>Team-Dimensionen</SectionLabel>
          <div className="flex items-center gap-3 text-[11px] text-[var(--muted)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--muted)]" aria-hidden />
              Ich
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />
              {them}
            </span>
          </div>
        </div>
        <ul className="mt-3 flex flex-col gap-3">
          {FOUNDER_DIM_KEYS.map((key) => {
            const mine = userContext.dims?.[key] ?? 0;
            const theirs = profile.dims?.[key] ?? 0;
            const complements = theirs > mine;
            return (
              <li key={key}>
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="font-medium text-[var(--foreground)]">{FOUNDER_DIM_LABELS[key]}</span>
                  <span className="tabular-nums text-[var(--muted)]">
                    {mine}
                    <span className="mx-1 opacity-60">·</span>
                    <span className={cx("font-semibold", complements ? "text-[var(--success)]" : "text-[var(--foreground)]")}>{theirs}</span>
                    {complements && (
                      <span className="ml-1 text-[10px] text-[var(--success)]" title="Ergänzt dich in dieser Dimension">
                        ▲
                      </span>
                    )}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-col gap-1">
                  <ThinBar pct={clampPct(mine, 10)} color="var(--muted)" className="h-1" />
                  <ThinBar pct={clampPct(theirs, 10)} color={color} className="h-1" />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-6 border-t border-[var(--border)] pt-4 text-xs leading-relaxed text-[var(--muted)]">
        Regelbasiert berechnet, ohne LLM – nachvollziehbar und ohne API-Key.{" "}
        <Link href="/onboarding" className="font-medium text-[var(--accent)] hover:underline">
          Deinen Kontext anpassen
        </Link>
      </p>
    </Card>
  );
}
