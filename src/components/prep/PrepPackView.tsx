/**
 * Anzeige eines PrepPack (Ergebnis von POST /api/prep): wahrscheinliche Fragen,
 * Talking Points, Eisbrecher, Red Flags und Persönlichkeits-Hinweise.
 */
import type { ReactNode } from "react";
import type { Personality, PrepPack, PrepQuestion, Profile } from "@/lib/types";
import { PERSONALITY_LABELS } from "@/lib/types";
import { Badge, Card } from "@/components/ui";

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function BulletList({ items, empty, marker }: { items: string[]; empty: string; marker?: ReactNode }) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-[var(--muted)]">{empty}</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-[var(--foreground)]">
          <span className="mt-[3px] shrink-0 text-[var(--accent)]" aria-hidden>
            {marker ?? "•"}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function QuestionItem({ q, index, defaultOpen }: { q: PrepQuestion; index: number; defaultOpen: boolean }) {
  return (
    <details
      className="group rounded-md border border-[var(--border)] bg-[var(--surface-2)] open:bg-[var(--surface)]"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-start gap-3 px-3 py-2.5 text-sm font-medium text-[var(--foreground)] [&::-webkit-details-marker]:hidden">
        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[11px] font-semibold text-[var(--accent)]">
          {index + 1}
        </span>
        <span className="flex-1">{q.question}</span>
        <span className="mt-0.5 text-xs text-[var(--muted)] transition group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="space-y-3 border-t border-[var(--border)] px-3 py-3 text-sm">
        {q.why && (
          <div>
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Warum diese Frage kommt</p>
            <p className="text-[var(--foreground)]">{q.why}</p>
          </div>
        )}
        {q.suggestedAnswerOutline && (
          <div className="rounded-md bg-[var(--accent-soft)] p-3">
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">So könntest du antworten</p>
            <p className="whitespace-pre-line text-[var(--foreground)]">{q.suggestedAnswerOutline}</p>
          </div>
        )}
      </div>
    </details>
  );
}

export default function PrepPackView({ pack, profile }: { pack: PrepPack; profile: Profile }) {
  const vorname = firstName(profile.name);
  const personality = profile.personality as Personality | undefined;
  const questions = pack.likelyQuestions ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--muted)]">
          Vorbereitung auf dein Gespräch mit <span className="font-medium text-[var(--foreground)]">{profile.name}</span>.
        </p>
        <Badge tone={pack.generatedBy === "llm" ? "accent" : "neutral"}>
          {pack.generatedBy === "llm" ? "KI-generiert" : "Regel-/Template-basiert"}
        </Badge>
      </div>

      <Card title={`Das wird ${vorname} wahrscheinlich wissen wollen`} action={<Badge>{questions.length} Fragen</Badge>}>
        {questions.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Keine Fragen generiert.</p>
        ) : (
          <div className="space-y-2">
            {questions.map((q, i) => (
              <QuestionItem key={`${i}-${q.question}`} q={q} index={i} defaultOpen={i === 0} />
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Talking Points">
          <BulletList items={pack.talkingPoints ?? []} empty="Keine Talking Points." />
        </Card>
        <Card title="Eisbrecher">
          <BulletList items={pack.iceBreakers ?? []} empty="Keine Eisbrecher." marker="☕" />
        </Card>
      </div>

      <Card title="Red Flags – hier solltest du nachhaken" action={<Badge tone="warning">Kritisch prüfen</Badge>}>
        <BulletList items={pack.redFlagsToProbe ?? []} empty="Keine Red Flags identifiziert." marker="⚑" />
      </Card>

      <Card
        title={`So tickt ${vorname}`}
        action={personality ? <Badge tone="accent">{PERSONALITY_LABELS[personality.type] ?? personality.type}</Badge> : undefined}
      >
        {personality?.summary && <p className="mb-3 text-sm text-[var(--muted)]">{personality.summary}</p>}
        <BulletList items={pack.personalityNotes ?? []} empty="Keine Persönlichkeits-Hinweise." marker="→" />
        {personality?.communicationStyle && (
          <p className="mt-3 rounded-md bg-[var(--surface-2)] p-3 text-xs text-[var(--muted)]">
            <span className="font-semibold text-[var(--foreground)]">Kommunikationsstil: </span>
            {personality.communicationStyle}
          </p>
        )}
      </Card>
    </div>
  );
}
