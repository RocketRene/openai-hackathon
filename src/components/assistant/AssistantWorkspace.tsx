"use client";
/**
 * Arbeitsfläche von Voya: links Voice + Text-Chat, rechts „Gerade im Gespräch“ (Live-Panel),
 * Interview-Leitfaden und das editierbare Suchprofil.
 * Alle UI-Aktionen des Agenten (Voice und Text) laufen über `handleUiAction`.
 */
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getProfile } from "@/lib/data";
import { buildInterviewGuide } from "@/lib/interview-guide";
import type { AgentMode, ChatMessage, InterviewGuide, UiAction, UserContext } from "@/lib/types";
import { DEFAULT_USER_CONTEXT, useUserContext } from "@/lib/user-context";
import { Badge, Button, Card, Input, LinkButton, SectionTitle, Skeleton, Textarea, cx } from "@/components/ui";
import VoiceAgent from "@/components/assistant/VoiceAgent";
import ChatPanel from "./ChatPanel";
import LiveCandidatePanel from "./LiveCandidatePanel";
import { briefToPatch, userContextToBrief, type SearchBrief } from "./voice-tools";

/** Wie viele Profile gleichzeitig im Live-Panel stehen (neueste zuerst). */
const MAX_SHOWN_PROFILES = 6;

const MODES: { value: AgentMode; label: string; hint: string }[] = [
  { value: "interview", label: "Suchprofil", hint: "Voya klärt Schritt für Schritt dein Suchprofil und findet dann passende Menschen." },
  { value: "general", label: "Frei", hint: "Freies Gespräch: Menschen, Investoren, Events, Interview-Vorbereitung." },
];

const NETWORK_ROLE_LABELS: Record<string, string> = {
  cofounder: "Co-Founder",
  investor: "Investoren",
  mentor: "Mentoren",
  talent: "Talente",
  expert: "Expert:innen",
};

/** Nur interne Pfade – der Agent darf keine externen/`javascript:`-URLs pushen. */
function isInternalHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

export default function AssistantWorkspace() {
  const router = useRouter();
  const { userContext, ready, update, loadDemo } = useUserContext();
  const [mode, setMode] = useState<AgentMode>("interview");
  const [shownProfileIds, setShownProfileIds] = useState<string[]>([]);
  const [guide, setGuide] = useState<InterviewGuide | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const bringToFront = useCallback((id: string) => {
    setShownProfileIds((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, MAX_SHOWN_PROFILES));
  }, []);

  const handleUiAction = useCallback(
    (action: UiAction) => {
      switch (action.type) {
        case "show_candidate":
          bringToFront(action.profileId);
          break;
        case "show_candidates":
          setShownProfileIds(Array.from(new Set(action.profileIds)).slice(0, MAX_SHOWN_PROFILES));
          break;
        case "show_interview_guide":
          setGuide(action.guide);
          bringToFront(action.profileId);
          break;
        case "update_user_context":
          update(action.patch);
          break;
        case "navigate":
          if (isInternalHref(action.href)) router.push(action.href);
          break;
      }
    },
    [router, update, bringToFront],
  );

  /** Leitfaden ohne Agent – lokal und deterministisch (funktioniert auch ohne API-Key). */
  const requestGuide = useCallback(
    (id: string) => {
      const profile = getProfile(id);
      if (!profile) return;
      setGuide(buildInterviewGuide(profile, userContext));
      bringToFront(id);
    },
    [userContext, bringToFront],
  );

  const clearPanel = useCallback(() => {
    setShownProfileIds([]);
    setGuide(null);
  }, []);

  const activeMode = MODES.find((m) => m.value === mode) ?? MODES[0];
  const currentId = shownProfileIds[0];

  return (
    <div className="space-y-4">
      {ready && !userContext && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--warning)] bg-[var(--warning-soft)] px-4 py-3">
          <p className="text-sm text-[var(--foreground)]">
            <span className="font-medium">Noch kein Suchprofil</span> – Voya klärt es mit dir im Gespräch. Oder lade einen Demo-Kontext,
            um direkt passende Menschen zu sehen.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={loadDemo}>
              Demo-Kontext laden
            </Button>
            <LinkButton href="/onboarding" variant="ghost" size="sm">
              Onboarding ausfüllen
            </LinkButton>
          </div>
        </div>
      )}

      {ready && userContext && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
          <span>
            Suchprofil von <span className="font-medium text-[var(--foreground)]">{userContext.name || "dir"}</span>
            {userContext.founderRole && ` · ${userContext.founderRole}`}
          </span>
          {userContext.lookingFor.length > 0 && (
            <span>· sucht {userContext.lookingFor.map((r) => NETWORK_ROLE_LABELS[r] ?? r).join(", ")}</span>
          )}
          {userContext.verticals.length > 0 && <span>· {userContext.verticals.join(", ")}</span>}
          {userContext.completedInterview ? (
            <Badge tone="success">Suchprofil geklärt</Badge>
          ) : (
            <Badge tone="warning">Suchprofil offen</Badge>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Linke Spalte: Modus, Voice, Chat */}
        <div className="min-w-0 space-y-4">
          <Card padding="sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div
                role="tablist"
                aria-label="Gesprächsmodus"
                className="inline-flex rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] p-0.5"
              >
                {MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    role="tab"
                    aria-selected={mode === m.value}
                    onClick={() => setMode(m.value)}
                    className={cx(
                      "rounded-[6px] px-3 py-1.5 text-sm font-medium transition",
                      mode === m.value
                        ? "bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-sm)]"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]",
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[var(--muted)]">{activeMode.hint}</p>
            </div>
          </Card>

          <VoiceAgent
            mode={mode}
            userContext={userContext}
            onUiAction={handleUiAction}
            initialMessages={chatMessages}
            visibleCandidateIds={shownProfileIds}
          />

          <ChatPanel mode={mode} onUiAction={handleUiAction} currentCandidateId={currentId} onMessagesChange={setChatMessages} />
        </div>

        {/* Rechte Spalte: Gerade im Gespräch, Leitfaden, Suchprofil */}
        <div className="min-w-0 space-y-4">
          <SectionTitle
            action={
              (shownProfileIds.length > 0 || guide) && (
                <Button variant="ghost" size="sm" onClick={clearPanel}>
                  Leeren
                </Button>
              )
            }
          >
            Gerade im Gespräch
            {shownProfileIds.length > 0 && (
              <span className="ml-2 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
                {shownProfileIds.length}
              </span>
            )}
          </SectionTitle>

          <LiveCandidatePanel
            profileIds={shownProfileIds}
            guide={guide}
            onFocus={bringToFront}
            onRequestGuide={requestGuide}
            onDismissGuide={() => setGuide(null)}
          />

          <SearchBriefCard userContext={userContext} ready={ready} onSave={update} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Suchprofil-Box (Renés Brief: Idee, Stärken, Ergänzung, Rahmen)      */
/* ------------------------------------------------------------------ */

const BRIEF_FIELDS: { key: keyof SearchBrief; label: string; placeholder: string; multiline: boolean }[] = [
  { key: "idea", label: "Deine Idee", placeholder: "Welches Problem möchtest du für wen lösen – und wie weit bist du?", multiline: true },
  { key: "strengths", label: "Was du mitbringst", placeholder: "Stärken, Erfahrung, bisheriger Fortschritt (komma-getrennt)", multiline: false },
  { key: "lookingFor", label: "Die gesuchte Ergänzung", placeholder: "Welche Fähigkeiten oder Rolle fehlen dir? z. B. technischer Co-Founder mit ML-Erfahrung", multiline: false },
  { key: "constraints", label: "Was passen muss", placeholder: "Standort/remote, Zeit, Starttermin, Finanzierung, Ausschlusskriterien", multiline: true },
];

function SearchBriefCard({
  userContext,
  ready,
  onSave,
}: {
  userContext: UserContext | null;
  ready: boolean;
  onSave: (patch: Partial<UserContext>) => void;
}) {
  const stored = useMemo(() => userContextToBrief(userContext), [userContext]);
  // Entwurf nur, solange die Nutzer:in tippt – sonst zeigt die Box den gespeicherten Stand
  // (Änderungen des Agenten per update_brief erscheinen so sofort).
  const [draft, setDraft] = useState<SearchBrief | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const dirty = draft !== null;
  const value = draft ?? stored;

  const completion = (Object.keys(stored) as (keyof SearchBrief)[]).filter((k) => stored[k].trim()).length;

  const edit = (key: keyof SearchBrief, next: string) => setDraft({ ...value, [key]: next });

  const save = () => {
    if (!draft) return;
    const current = userContext ?? DEFAULT_USER_CONTEXT;
    const patch = briefToPatch(draft, current, { mode: "replace" });
    // Geleerte Felder ebenfalls übernehmen.
    if (!draft.idea.trim() && current.idea) patch.idea = "";
    if (!draft.strengths.trim() && current.strengths.length > 0) patch.strengths = [];
    if (!draft.constraints.trim() && current.constraints) patch.constraints = "";
    onSave(patch);
    setDraft(null);
    setSavedAt(Date.now());
  };

  if (!ready) {
    return (
      <Card title="Dein Suchprofil">
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-3/4" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Dein Suchprofil"
      description="Was hier steht, gibt Voya Orientierung – Voya ergänzt es im Gespräch (update_brief), du kannst es jederzeit selbst anpassen."
      action={<Badge tone={completion === 4 ? "success" : "neutral"}>{completion}/4 geklärt</Badge>}
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        {BRIEF_FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={`brief-${f.key}`} className="mb-1.5 block text-xs font-medium text-[var(--muted)]">
              {f.label}
            </label>
            {f.multiline ? (
              <Textarea
                id={`brief-${f.key}`}
                value={value[f.key]}
                placeholder={f.placeholder}
                rows={2}
                className="min-h-16"
                onChange={(e) => edit(f.key, e.target.value)}
              />
            ) : (
              <Input id={`brief-${f.key}`} value={value[f.key]} placeholder={f.placeholder} onChange={(e) => edit(f.key, e.target.value)} />
            )}
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <p className="text-[11px] text-[var(--muted)]">
            {dirty ? "Ungespeicherte Änderungen" : savedAt ? "Gespeichert – lokal in diesem Browser." : "Wird lokal in diesem Browser gespeichert."}
          </p>
          <div className="flex gap-2">
            {dirty && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setDraft(null)}>
                Verwerfen
              </Button>
            )}
            <Button type="submit" size="sm" disabled={!dirty}>
              Suchprofil speichern
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
