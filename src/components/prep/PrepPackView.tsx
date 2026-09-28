/**
 * Anzeige eines PrepPack (Ergebnis von POST /api/prep): nummerierte, aufklappbare Frage-Cards,
 * Talking Points / Eisbrecher / Red Flags nebeneinander und die Persönlichkeit als Zitat-Card.
 */
import type { ReactNode } from "react";
import type { Personality, PrepPack, PrepQuestion, Profile } from "@/lib/types";
import { PERSONALITY_LABELS } from "@/lib/types";
import { Badge, Button, Card, Kicker, SectionTitle, cx } from "@/components/ui";
import {
  IconArrowRight,
  IconCheck,
  IconChevronDown,
  IconCoffee,
  IconFlag,
  IconQuote,
  IconRefresh,
  IconSparkles,
  firstName,
} from "./shared";

function ItemList({
  items,
  empty,
  icon,
  tone = "accent",
  columns = false,
}: {
  items: string[];
  empty: string;
  icon: ReactNode;
  tone?: "accent" | "warning";
  columns?: boolean;
}) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-[var(--muted)]">{empty}</p>;
  }
  return (
    <ul className={cx("grid gap-2.5", columns && "md:grid-cols-2 md:gap-x-8")}>
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-[var(--foreground)]">
          <span
            className={cx(
              "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
              tone === "warning" ? "bg-[var(--warning-soft)] text-[var(--warning)]" : "bg-[var(--accent-soft)] text-[var(--accent)]",
            )}
            aria-hidden
          >
            {icon}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Eyebrow({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "accent" }) {
  return (
    <p
      className={cx(
        "mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]",
        tone === "accent" ? "text-[var(--accent)]" : "text-[var(--muted)]",
      )}
    >
      {children}
    </p>
  );
}

function QuestionCard({ q, index, defaultOpen }: { q: PrepQuestion; index: number; defaultOpen: boolean }) {
  return (
    <details
      className="group rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] transition hover:border-[var(--accent)]/40 open:border-[var(--accent)]/40"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-start gap-3 rounded-[var(--radius-lg)] p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] [&::-webkit-details-marker]:hidden">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]">
          {index + 1}
        </span>
        <span className="flex-1 pt-1 text-sm font-semibold leading-snug text-[var(--foreground)] sm:text-[15px]">{q.question}</span>
        <IconChevronDown size={16} className="mt-1.5 shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180" />
      </summary>
      <div className="grid gap-4 border-t border-[var(--border)] px-4 py-4 md:grid-cols-2 md:gap-6">
        <div>
          <Eyebrow>Warum die Frage kommt</Eyebrow>
          <p className="text-sm leading-relaxed text-[var(--foreground)]">{q.why || "—"}</p>
        </div>
        <div className="rounded-[var(--radius-sm)] bg-[var(--accent-soft)] p-4">
          <Eyebrow tone="accent">So antwortest du</Eyebrow>
          <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--foreground)]">{q.suggestedAnswerOutline || "—"}</p>
        </div>
      </div>
    </details>
  );
}

export default function PrepPackView({
  pack,
  profile,
  onRegenerate,
  regenerating = false,
}: {
  pack: PrepPack;
  profile: Profile;
  /** Optional: „Neu generieren“ in der Toolbar. */
  onRegenerate?: () => void;
  regenerating?: boolean;
}) {
  const vorname = firstName(profile.name);
  const personality = profile.personality as Personality | undefined;
  const questions = pack.likelyQuestions ?? [];
  const talkingPoints = pack.talkingPoints ?? [];
  const iceBreakers = pack.iceBreakers ?? [];
  const redFlags = pack.redFlagsToProbe ?? [];
  const traits = personality?.traits ?? [];
  const isLlm = pack.generatedBy === "llm";

  return (
    <div className="space-y-8">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">
          Vorbereitung auf dein Gespräch mit <span className="font-medium text-[var(--foreground)]">{profile.name}</span>
          <span className="hidden sm:inline">
            {" "}
            · {questions.length} Fragen · {talkingPoints.length} Talking Points
          </span>
        </p>
        <div className="flex items-center gap-2">
          <Badge tone={isLlm ? "accent" : "neutral"}>
            {isLlm ? (
              <>
                <IconSparkles size={12} /> KI-generiert
              </>
            ) : (
              "Vorlage"
            )}
          </Badge>
          {onRegenerate && (
            <Button variant="secondary" size="sm" onClick={onRegenerate} loading={regenerating}>
              {regenerating ? (
                "Generiere …"
              ) : (
                <>
                  <IconRefresh size={14} /> Neu generieren
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Wahrscheinliche Fragen */}
      <section aria-labelledby="prep-questions-title">
        <SectionTitle action={<Badge>{questions.length} Fragen</Badge>}>
          <span id="prep-questions-title">Das wird {vorname} wissen wollen</span>
        </SectionTitle>
        {questions.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] px-6 py-8 text-center text-sm text-[var(--muted)]">
            Keine Fragen generiert.
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((q, i) => (
              <QuestionCard key={`${i}-${q.question}`} q={q} index={i} defaultOpen={i === 0} />
            ))}
          </div>
        )}
      </section>

      {/* Talking Points · Eisbrecher · Red Flags */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Talking Points" description="Das solltest du unterbringen" action={<Badge>{talkingPoints.length}</Badge>}>
          <ItemList items={talkingPoints} empty="Keine Talking Points." icon={<IconCheck size={12} />} />
        </Card>
        <Card title="Eisbrecher" description="Lockere Einstiege ins Gespräch" action={<Badge>{iceBreakers.length}</Badge>}>
          <ItemList items={iceBreakers} empty="Keine Eisbrecher." icon={<IconCoffee size={12} />} />
        </Card>
        <Card title="Red Flags" description="Hier solltest du nachhaken" action={<Badge tone="warning">Kritisch prüfen</Badge>}>
          <ItemList items={redFlags} empty="Keine Red Flags identifiziert." icon={<IconFlag size={12} />} tone="warning" />
        </Card>
      </div>

      {/* Persönlichkeit als Zitat-Card */}
      <Card padding="lg">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Kicker>Persönlichkeit</Kicker>
            <h3 className="text-base font-semibold tracking-tight text-[var(--foreground)]">So tickt {vorname}</h3>
          </div>
          {personality && <Badge tone="accent">{PERSONALITY_LABELS[personality.type] ?? personality.type}</Badge>}
        </div>

        {personality?.summary && (
          <blockquote className="mt-4 flex gap-3">
            <IconQuote size={28} className="shrink-0 text-[var(--accent)] opacity-50" />
            <p className="text-base font-medium leading-relaxed text-[var(--foreground)] sm:text-lg">{personality.summary}</p>
          </blockquote>
        )}

        {traits.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5 pl-10">
            {traits.map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </div>
        )}

        <div className="mt-6 border-t border-[var(--border)] pt-5">
          <Eyebrow>Darauf solltest du dich einstellen</Eyebrow>
          <div className="mt-3">
            <ItemList items={pack.personalityNotes ?? []} empty="Keine Persönlichkeits-Hinweise." icon={<IconArrowRight size={12} />} columns />
          </div>
        </div>

        {personality?.communicationStyle && (
          <div className="mt-5 rounded-[var(--radius-sm)] bg-[var(--surface-2)] px-4 py-3 text-sm leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Kommunikationsstil: </span>
            <span className="text-[var(--muted)]">{personality.communicationStyle}</span>
          </div>
        )}
      </Card>
    </div>
  );
}
