"use client";
/**
 * Match-Aufschlüsselung für ein Profil: Score, Gründe, Risiken, Komplementarität.
 * Rechnet deterministisch mit scoreMatch() aus dem Nutzer-Kontext (localStorage).
 * Ohne Kontext: Hinweis + "Demo-Kontext laden", damit die Demo nie leer ist.
 */
import Link from "next/link";
import { useMemo } from "react";
import { FOUNDER_DIM_KEYS, FOUNDER_DIM_LABELS, type Profile } from "@/lib/types";
import { scoreMatch } from "@/lib/matching";
import { useUserContext } from "@/lib/user-context";
import { Badge, Button, Card, LinkButton, ScoreBar } from "@/components/ui";

type Tone = "success" | "accent" | "warning" | "neutral";

function scoreTone(score: number): { tone: Tone; label: string } {
  if (score >= 70) return { tone: "success", label: "Starker Match" };
  if (score >= 45) return { tone: "accent", label: "Guter Match" };
  if (score >= 25) return { tone: "warning", label: "Teilweise passend" };
  return { tone: "neutral", label: "Schwacher Match" };
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

export default function MatchBreakdown({ profile }: { profile: Profile }) {
  const { userContext, ready, loadDemo } = useUserContext();
  const match = useMemo(() => (userContext ? scoreMatch(userContext, profile) : null), [userContext, profile]);

  if (!ready) {
    return (
      <Card title="Match">
        <p className="text-sm text-[var(--muted)]">Match wird berechnet …</p>
      </Card>
    );
  }

  if (!userContext || !match) {
    return (
      <Card title="Match">
        <p className="text-sm font-medium text-[var(--foreground)]">Wir kennen dein Gründer:innen-Profil noch nicht.</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Lege es im Onboarding an – oder lade den Demo-Kontext, um sofort zu sehen, wie gut {firstName(profile.name)} zu dir
          passt.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={loadDemo}>Demo-Kontext laden</Button>
          <LinkButton href="/onboarding" variant="secondary">
            Onboarding starten
          </LinkButton>
        </div>
      </Card>
    );
  }

  const { tone, label } = scoreTone(match.score);
  const you = userContext.name?.trim() || "dir";
  const them = firstName(profile.name);

  return (
    <Card title="Match" action={<Badge tone={tone}>{label}</Badge>}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-4xl font-semibold tabular-nums tracking-tight text-[var(--foreground)]">{match.score}</span>
          <span className="text-sm text-[var(--muted)]"> / 100</span>
        </div>
        <p className="text-sm text-[var(--muted)]">
          Passung von {profile.name} zu {you}
        </p>
      </div>
      <div className="mt-3">
        <ScoreBar value={match.score} />
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Warum es passt</h4>
          {match.reasons.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--muted)]">Keine klaren Überschneidungen mit deinem Profil gefunden.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {match.reasons.map((reason, i) => (
                <li
                  key={`${reason.label}-${i}`}
                  className="flex items-start justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)]">{reason.label}</p>
                    <p className="text-xs text-[var(--muted)]">{reason.detail}</p>
                  </div>
                  <Badge tone="success" className="shrink-0 tabular-nums">
                    +{reason.weight}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Worauf du achten solltest</h4>
          {match.risks.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--muted)]">Keine offensichtlichen Risiken.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {match.risks.map((risk, i) => (
                <li key={`${risk}-${i}`}>
                  <Badge tone="warning" className="whitespace-normal py-1 text-left leading-snug">
                    {risk}
                  </Badge>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5">
            <ScoreBar label="Komplementarität" value={match.complementarity} />
            <p className="mt-1 text-xs text-[var(--muted)]">Wie stark {them} deine schwächeren Team-Dimensionen ergänzt.</p>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Team-Dimensionen im Vergleich</h4>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-xs text-[var(--muted)]">
              <th className="py-1 text-left font-medium">Dimension</th>
              <th className="py-1 text-right font-medium">Du</th>
              <th className="py-1 text-right font-medium">{them}</th>
            </tr>
          </thead>
          <tbody>
            {FOUNDER_DIM_KEYS.map((key) => {
              const mine = userContext.dims?.[key] ?? 0;
              const theirs = profile.dims?.[key] ?? 0;
              const complements = theirs > mine;
              return (
                <tr key={key} className="border-t border-[var(--border)]">
                  <td className="py-1.5 text-[var(--foreground)]">{FOUNDER_DIM_LABELS[key]}</td>
                  <td className="py-1.5 text-right tabular-nums text-[var(--muted)]">{mine}</td>
                  <td
                    className={
                      complements
                        ? "py-1.5 text-right font-semibold tabular-nums text-[var(--success)]"
                        : "py-1.5 text-right tabular-nums text-[var(--muted)]"
                    }
                  >
                    {theirs}
                    {complements && <span className="ml-1 text-xs">▲</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-[var(--muted)]">
        Regelbasiert berechnet, ohne LLM – nachvollziehbar und ohne API-Key.{" "}
        <Link href="/onboarding" className="font-medium text-[var(--accent)] hover:underline">
          Deinen Kontext anpassen
        </Link>
      </p>
    </Card>
  );
}
