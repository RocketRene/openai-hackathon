"use client";
/**
 * „Dein Suchprofil“ (Voya-Brief): das sichtbare, editierbare Objekt, das der Agent per
 * save_user_context fortschreibt. Vier Felder: Idee, was du mitbringst, die gesuchte Ergänzung,
 * Rahmenbedingungen. Speichert ausschließlich über useUserContext().update.
 */
import { useEffect, useState } from "react";
import type { FounderRole, NetworkRole, UserContext } from "@/lib/types";
import { useUserContext } from "@/lib/user-context";
import { Badge, Button, Card, Chip, Field, Input, Textarea, cx } from "@/components/ui";

const NETWORK_ROLES: { value: NetworkRole; label: string }[] = [
  { value: "cofounder", label: "Co-Founder" },
  { value: "investor", label: "Investor:in" },
  { value: "mentor", label: "Mentor:in" },
  { value: "talent", label: "Talent" },
  { value: "expert", label: "Expert:in" },
];

const FOUNDER_ROLES: { value: FounderRole; label: string }[] = [
  { value: "tech", label: "Tech" },
  { value: "commercial", label: "Commercial" },
  { value: "product", label: "Produkt" },
  { value: "design", label: "Design" },
  { value: "operations", label: "Operations" },
  { value: "domain-expert", label: "Fachexpertise" },
];

/** Wie lange der Hinweis „Vom Agenten aktualisiert“ sichtbar bleibt (ms). */
const AGENT_HINT_MS = 6000;

function splitList(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

export interface BriefEditorProps {
  /** Zeitstempel (Date.now()) der letzten Änderung durch ein Agenten-Tool – zeigt kurz einen Hinweis. */
  agentUpdatedAt?: number | null;
  className?: string;
}

export default function BriefEditor({ agentUpdatedAt, className }: BriefEditorProps) {
  const { userContext, ready, update, loadDemo } = useUserContext();

  // Lokale Entwürfe für Text-Felder; Chips speichern sofort.
  const [ideaDraft, setIdeaDraft] = useState<string | null>(null);
  const [strengthsDraft, setStrengthsDraft] = useState<string | null>(null);
  const [constraintsDraft, setConstraintsDraft] = useState<string | null>(null);
  const [showAgentHint, setShowAgentHint] = useState(false);
  const [seenAgentUpdate, setSeenAgentUpdate] = useState<number | null>(null);

  // Neue Agenten-Änderung: Entwürfe verwerfen (damit die Änderung sichtbar wird) und Hinweis zeigen.
  // State-Anpassung während des Renderns statt setState im Effect (React-Empfehlung).
  if (agentUpdatedAt && agentUpdatedAt !== seenAgentUpdate) {
    setSeenAgentUpdate(agentUpdatedAt);
    setIdeaDraft(null);
    setStrengthsDraft(null);
    setConstraintsDraft(null);
    setShowAgentHint(true);
  }

  // Hinweis nach ein paar Sekunden wieder ausblenden.
  useEffect(() => {
    if (!showAgentHint) return;
    const t = setTimeout(() => setShowAgentHint(false), AGENT_HINT_MS);
    return () => clearTimeout(t);
  }, [showAgentHint, seenAgentUpdate]);

  if (!ready) return null;

  if (!userContext) {
    return (
      <Card title="Dein Suchprofil" className={className}>
        <p className="text-sm text-[var(--muted)]">
          Noch leer. Der Agent füllt es im Interview, oder du lädst den Demo-Kontext.
        </p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={loadDemo}>
          Demo-Kontext laden
        </Button>
      </Card>
    );
  }

  const ctx: UserContext = userContext;
  const idea = ideaDraft ?? ctx.idea;
  const strengths = strengthsDraft ?? ctx.strengths.join(", ");
  const constraints = constraintsDraft ?? ctx.constraints ?? "";

  const commit = (patch: Partial<UserContext>) => update(patch);

  return (
    <Card
      title="Dein Suchprofil"
      className={className}
      action={
        showAgentHint ? (
          <Badge tone="success">Vom Agenten aktualisiert</Badge>
        ) : (
          <span className="text-xs text-[var(--muted)]">Der Agent ergänzt, du kannst korrigieren.</span>
        )
      }
    >
      <div className="space-y-4">
        <Field label="Idee" hint="Ein bis zwei Sätze: Problem, Zielgruppe, Stand.">
          <Textarea
            value={idea}
            rows={2}
            placeholder="Woran arbeitest du – oder bist du offen für Ideen?"
            onChange={(e) => setIdeaDraft(e.target.value)}
            onBlur={() => {
              if (ideaDraft !== null && ideaDraft.trim() !== ctx.idea) commit({ idea: ideaDraft.trim() });
              setIdeaDraft(null);
            }}
            aria-label="Idee"
          />
        </Field>

        <Field label="Was du mitbringst" hint="Stärken, durch Komma getrennt.">
          <Input
            value={strengths}
            placeholder="z. B. Prototyping, AI/LLM, Vertrieb"
            onChange={(e) => setStrengthsDraft(e.target.value)}
            onBlur={() => {
              if (strengthsDraft !== null) {
                const next = splitList(strengthsDraft);
                if (next.join("|") !== ctx.strengths.join("|")) commit({ strengths: next });
              }
              setStrengthsDraft(null);
            }}
            aria-label="Was du mitbringst"
          />
        </Field>

        <div>
          <p className="mb-1.5 block text-xs font-medium text-[var(--muted)]">Die gesuchte Ergänzung</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Welche Art Kontakte">
            {NETWORK_ROLES.map((r) => (
              <Chip
                key={r.value}
                active={ctx.lookingFor.includes(r.value)}
                onClick={() => commit({ lookingFor: toggle(ctx.lookingFor, r.value) })}
              >
                {r.label}
              </Chip>
            ))}
          </div>
          <div
            className={cx("mt-2 flex flex-wrap gap-1.5", !ctx.lookingFor.includes("cofounder") && "opacity-60")}
            role="group"
            aria-label="Fehlende Team-Rollen"
          >
            {FOUNDER_ROLES.map((r) => (
              <Chip
                key={r.value}
                active={ctx.lookingForRoles.includes(r.value)}
                onClick={() => commit({ lookingForRoles: toggle(ctx.lookingForRoles, r.value) })}
                className="h-7 text-[11px]"
              >
                {r.label}
              </Chip>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-[var(--muted)]">Oben: wen du suchst. Unten: welche Team-Rolle fehlt.</p>
        </div>

        <Field label="Rahmenbedingungen" hint="Standort/remote, Zeit, Start, Finanzierung, Ausschlusskriterien.">
          <Textarea
            value={constraints}
            rows={3}
            placeholder="z. B. Berlin oder remote, Vollzeit ab Januar, Bootstrapping bis Seed, kein reines Agenturmodell"
            onChange={(e) => setConstraintsDraft(e.target.value)}
            onBlur={() => {
              if (constraintsDraft !== null && constraintsDraft.trim() !== (ctx.constraints ?? "")) {
                commit({ constraints: constraintsDraft.trim() });
              }
              setConstraintsDraft(null);
            }}
            aria-label="Rahmenbedingungen"
          />
        </Field>
      </div>
    </Card>
  );
}
