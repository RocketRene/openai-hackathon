"use client";
/**
 * „Dein Suchprofil“ (Voya-Brief): das sichtbare, editierbare Objekt, das der Agent per
 * save_user_context fortschreibt. Vier Felder: Idee, was du mitbringst, die gesuchte Ergänzung,
 * Rahmenbedingungen. Speichert ausschließlich über useUserContext().update.
 *
 * Sprache (DE/EN): UI-Texte über das lokale DICT, Rollen-Labels über COMMON.
 */
import { useEffect, useState } from "react";
import type { FounderRole, NetworkRole, UserContext } from "@/lib/types";
import { COMMON, useT, type Dict } from "@/lib/i18n";
import { useUserContext } from "@/lib/user-context";
import { Badge, Button, Card, Chip, Field, Input, Textarea, cx } from "@/components/ui";

const NETWORK_ROLES: NetworkRole[] = ["cofounder", "investor", "mentor", "talent", "expert"];
const FOUNDER_ROLES: FounderRole[] = ["tech", "commercial", "product", "design", "operations", "domain-expert"];

const DICT = {
  title: { de: "Dein Suchprofil", en: "Your search brief" },
  empty: {
    de: "Noch leer. Der Agent füllt es im Interview, oder du lädst den Demo-Kontext.",
    en: "Still empty. The agent fills it in during the interview, or you load the demo context.",
  },
  updatedByAgent: { de: "Vom Agenten aktualisiert", en: "Updated by the agent" },
  agentHint: { de: "Der Agent ergänzt, du kannst korrigieren.", en: "The agent fills it in, you can correct it." },
  idea: { de: "Idee", en: "Idea" },
  ideaHint: { de: "Ein bis zwei Sätze: Problem, Zielgruppe, Stand.", en: "One or two sentences: problem, target group, status." },
  ideaPlaceholder: { de: "Woran arbeitest du – oder bist du offen für Ideen?", en: "What are you working on – or are you open to ideas?" },
  strengths: { de: "Was du mitbringst", en: "What you bring" },
  strengthsHint: { de: "Stärken, durch Komma getrennt.", en: "Strengths, separated by commas." },
  strengthsPlaceholder: { de: "z. B. Prototyping, AI/LLM, Vertrieb", en: "e.g. prototyping, AI/LLM, sales" },
  complement: { de: "Die gesuchte Ergänzung", en: "The complement you're looking for" },
  contactKind: { de: "Welche Art Kontakte", en: "Which kind of contacts" },
  missingRoles: { de: "Fehlende Team-Rollen", en: "Missing team roles" },
  complementHint: { de: "Oben: wen du suchst. Unten: welche Team-Rolle fehlt.", en: "Top: who you're looking for. Bottom: which team role is missing." },
  constraints: { de: "Rahmenbedingungen", en: "Constraints" },
  constraintsHint: {
    de: "Standort/remote, Zeit, Start, Finanzierung, Ausschlusskriterien.",
    en: "Location/remote, time, start, funding, deal-breakers.",
  },
  constraintsPlaceholder: {
    de: "z. B. Berlin oder remote, Vollzeit ab Januar, Bootstrapping bis Seed, kein reines Agenturmodell",
    en: "e.g. Berlin or remote, full-time from January, bootstrapping until seed, no pure agency model",
  },
} satisfies Dict;

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
  const t = useT(DICT);
  const tc = useT(COMMON);

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
    const timer = setTimeout(() => setShowAgentHint(false), AGENT_HINT_MS);
    return () => clearTimeout(timer);
  }, [showAgentHint, seenAgentUpdate]);

  if (!ready) return null;

  if (!userContext) {
    return (
      <Card title={t("title")} className={className}>
        <p className="text-sm text-[var(--muted)]">{t("empty")}</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={loadDemo}>
          {tc("loadDemo")}
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
      title={t("title")}
      className={className}
      action={
        showAgentHint ? (
          <Badge tone="success">{t("updatedByAgent")}</Badge>
        ) : (
          <span className="text-xs text-[var(--muted)]">{t("agentHint")}</span>
        )
      }
    >
      <div className="space-y-4">
        <Field label={t("idea")} hint={t("ideaHint")}>
          <Textarea
            value={idea}
            rows={2}
            placeholder={t("ideaPlaceholder")}
            onChange={(e) => setIdeaDraft(e.target.value)}
            onBlur={() => {
              if (ideaDraft !== null && ideaDraft.trim() !== ctx.idea) commit({ idea: ideaDraft.trim() });
              setIdeaDraft(null);
            }}
            aria-label={t("idea")}
          />
        </Field>

        <Field label={t("strengths")} hint={t("strengthsHint")}>
          <Input
            value={strengths}
            placeholder={t("strengthsPlaceholder")}
            onChange={(e) => setStrengthsDraft(e.target.value)}
            onBlur={() => {
              if (strengthsDraft !== null) {
                const next = splitList(strengthsDraft);
                if (next.join("|") !== ctx.strengths.join("|")) commit({ strengths: next });
              }
              setStrengthsDraft(null);
            }}
            aria-label={t("strengths")}
          />
        </Field>

        <div>
          <p className="mb-1.5 block text-xs font-medium text-[var(--muted)]">{t("complement")}</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("contactKind")}>
            {NETWORK_ROLES.map((r) => (
              <Chip key={r} active={ctx.lookingFor.includes(r)} onClick={() => commit({ lookingFor: toggle(ctx.lookingFor, r) })}>
                {tc(r)}
              </Chip>
            ))}
          </div>
          <div
            className={cx("mt-2 flex flex-wrap gap-1.5", !ctx.lookingFor.includes("cofounder") && "opacity-60")}
            role="group"
            aria-label={t("missingRoles")}
          >
            {FOUNDER_ROLES.map((r) => (
              <Chip
                key={r}
                active={ctx.lookingForRoles.includes(r)}
                onClick={() => commit({ lookingForRoles: toggle(ctx.lookingForRoles, r) })}
                className="h-7 text-[11px]"
              >
                {tc(r)}
              </Chip>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-[var(--muted)]">{t("complementHint")}</p>
        </div>

        <Field label={t("constraints")} hint={t("constraintsHint")}>
          <Textarea
            value={constraints}
            rows={3}
            placeholder={t("constraintsPlaceholder")}
            onChange={(e) => setConstraintsDraft(e.target.value)}
            onBlur={() => {
              if (constraintsDraft !== null && constraintsDraft.trim() !== (ctx.constraints ?? "")) {
                commit({ constraints: constraintsDraft.trim() });
              }
              setConstraintsDraft(null);
            }}
            aria-label={t("constraints")}
          />
        </Field>
      </div>
    </Card>
  );
}
