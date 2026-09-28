"use client";
/**
 * Match-Aufschlüsselung für ein Profil: Score groß, Gründe als Balken mit Gewicht,
 * Risiken als Warn-Liste, Komplementarität erklärt, Team-Dims im Vergleich.
 * Rechnet deterministisch mit scoreMatch() aus dem Nutzer-Kontext (localStorage).
 * Ohne Kontext: Hinweis + Link Onboarding + "Demo-Kontext laden", damit die Demo nie leer ist.
 */
import Link from "next/link";
import { useMemo } from "react";
import { FOUNDER_DIM_KEYS, FOUNDER_DIM_LABELS, type MatchResult, type Profile, type UserContext } from "@/lib/types";
import { MATCH_TIER_LABELS, matchTier, scoreMatch } from "@/lib/matching";
import { useUserContext } from "@/lib/user-context";
import { Badge, Button, Card, LinkButton, Skeleton, cx } from "@/components/ui";

type Tone = "success" | "accent" | "warning" | "neutral";

function tierTone(score: number): Tone {
  const tier = matchTier(score);
  if (tier === "top") return "success";
  if (tier === "gut") return "accent";
  if (tier === "möglich") return "warning";
  return "neutral";
}

const RING_COLOR: Record<Tone, string> = {
  success: "var(--success)",
  accent: "var(--accent)",
  warning: "var(--warning)",
  neutral: "var(--muted)",
};

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

/** Kreisförmige Score-Anzeige (SVG, tokens-only). */
function ScoreRing({ value, tone }: { value: number; tone: Tone }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative h-24 w-24 shrink-0" role="img" aria-label={`Match-Score ${value} von 100`}>
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={RING_COLOR[tone]}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold leading-none tabular-nums text-[var(--foreground)]">{Math.round(value)}</span>
        <span className="mt-0.5 text-[10px] uppercase tracking-wide text-[var(--muted)]">/ 100</span>
      </div>
    </div>
  );
}

function WarnIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-0.5 shrink-0 text-[var(--warning)]">
      <path d="M12 3 2 20h20L12 3Z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  );
}

export default function MatchBreakdown({ profile }: { profile: Profile }) {
  const { userContext, ready, loadDemo } = useUserContext();
  const match = useMemo(() => (userContext ? scoreMatchSafe(userContext, profile) : null), [userContext, profile]);

  if (!ready) {
    return (
      <Card title="Match">
        <div className="flex items-center gap-5">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      </Card>
    );
  }

  if (!userContext || !match) {
    return (
      <Card title="Match" description="Wie gut diese Person zu dir passt">
        <p className="text-sm font-medium text-[var(--foreground)]">Voya kennt dein Gründer:innen-Profil noch nicht.</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Lege es im Onboarding an – oder lade den Demo-Kontext, um sofort zu sehen, wie gut {firstName(profile.name)} zu dir passt.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <LinkButton href="/onboarding">Zum Onboarding</LinkButton>
          <Button variant="secondary" onClick={loadDemo}>
            Demo-Kontext laden
          </Button>
        </div>
      </Card>
    );
  }

  const tone = tierTone(match.score);
  const tierLabel = MATCH_TIER_LABELS[matchTier(match.score)];
  const them = firstName(profile.name);
  const maxWeight = Math.max(1, ...match.reasons.map((r) => r.weight));

  return (
    <Card title="Match" description={`Passung von ${profile.name} zu ${userContext.name?.trim() || "dir"}`} action={<Badge tone={tone}>{tierLabel}</Badge>}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <ScoreRing value={match.score} tone={tone} />
        <div className="min-w-0 flex-1">
          {match.reasons[0] ? (
            <p className="text-sm leading-relaxed text-[var(--foreground)]">{match.reasons[0].detail}</p>
          ) : (
            <p className="text-sm text-[var(--muted)]">Keine klaren Überschneidungen mit deinem Profil gefunden.</p>
          )}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--muted)]">Komplementarität</span>
              <span className="font-medium tabular-nums text-[var(--foreground)]">{match.complementarity} / 100</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
              <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${match.complementarity}%` }} />
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">Wie stark {them} deine schwächeren Team-Dimensionen ausgleicht.</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Warum es passt</h4>
          {match.reasons.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--muted)]">Erweitere im Profil deine Verticals oder Stärken – dann findet Voya mehr Anknüpfungspunkte.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {match.reasons.map((reason, i) => (
                <li key={`${reason.label}-${i}`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-[var(--foreground)]">{reason.label}</span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-[var(--success)]">+{reason.weight}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
                    <div className="h-full rounded-full bg-[var(--success)]" style={{ width: `${Math.round((reason.weight / maxWeight) * 100)}%` }} />
                  </div>
                  <p className="mt-1 text-xs leading-snug text-[var(--muted)]">{reason.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Worauf du achten solltest</h4>
            {match.risks.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--muted)]">Keine offensichtlichen Risiken.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {match.risks.map((risk, i) => (
                  <li key={`${risk}-${i}`} className="flex items-start gap-2 rounded-[var(--radius-sm)] bg-[var(--warning-soft)]/50 px-3 py-2 text-sm leading-snug text-[var(--foreground)]">
                    <WarnIcon />
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Team-Dimensionen im Vergleich</h4>
            <ul className="mt-3 flex flex-col gap-2.5">
              {FOUNDER_DIM_KEYS.map((key) => {
                const mine = userContext.dims?.[key] ?? 0;
                const theirs = profile.dims?.[key] ?? 0;
                const complements = theirs > mine;
                return (
                  <li key={key}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--foreground)]">{FOUNDER_DIM_LABELS[key]}</span>
                      <span className="tabular-nums text-[var(--muted)]">
                        Du {mine} · {them}{" "}
                        <span className={cx("font-semibold", complements ? "text-[var(--success)]" : "text-[var(--foreground)]")}>{theirs}</span>
                      </span>
                    </div>
                    <div className="relative mt-1 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
                      <div className="absolute inset-y-0 left-0 rounded-full bg-[var(--muted)]/40" style={{ width: `${mine * 10}%` }} />
                      <div
                        className={cx("absolute inset-y-0 left-0 rounded-full", complements ? "bg-[var(--success)]" : "bg-[var(--accent)]")}
                        style={{ width: `${theirs * 10}%`, opacity: 0.85 }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[11px] text-[var(--muted)]">Grau: du · Farbig: {them} (grün = ergänzt dich).</p>
          </div>
        </div>
      </div>

      <p className="mt-5 text-xs text-[var(--muted)]">
        Regelbasiert berechnet, ohne LLM – nachvollziehbar und ohne API-Key.{" "}
        <Link href="/onboarding" className="font-medium text-[var(--accent)] hover:underline">
          Deinen Kontext anpassen
        </Link>
      </p>
    </Card>
  );
}

/** scoreMatch mit Schutz gegen unvollständige Profile (gescrapte Daten). */
function scoreMatchSafe(user: UserContext, profile: Profile): MatchResult | null {
  try {
    return scoreMatch(user, profile);
  } catch {
    return null;
  }
}
