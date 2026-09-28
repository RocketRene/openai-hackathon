"use client";
/**
 * Arbeitsfläche des Agenten: links Voice + Text-Chat, rechts Suchprofil (Brief), Interviewleitfaden
 * und das Live-Kandidaten-Panel. Alle UI-Aktionen des Agenten (Voice und Text) laufen über
 * `handleUiAction`.
 *
 * Gemeinsamer Verlauf (Voya): Text-Chat und Voice teilen sich `messages`. Der Text-Chat meldet
 * seinen Verlauf hoch, der Voice-Agent bekommt ihn beim Verbinden als `initialMessages` und
 * schreibt sein Transkript als zusammenhängenden Block zurück – so weiß der Text-Chat, was
 * gesprochen wurde, und umgekehrt.
 */
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AgentMode, ChatMessage, InterviewGuide, UiAction } from "@/lib/types";
import { useUserContext } from "@/lib/user-context";
import { Badge, Button, Card, LinkButton, cx } from "@/components/ui";
import VoiceAgent from "@/components/assistant/VoiceAgent";
import BriefEditor from "./BriefEditor";
import ChatPanel, { DEFAULT_GREETING } from "./ChatPanel";
import InterviewGuideCard from "./InterviewGuideCard";
import LiveCandidatePanel from "./LiveCandidatePanel";

/** Wie viele Profile gleichzeitig im Live-Panel stehen (neueste zuerst). */
const MAX_SHOWN_PROFILES = 5;

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

type VoiceItem = { role: "user" | "assistant"; text: string };

/** Position des Voice-Blocks im gemeinsamen Verlauf (eine Voice-Session = ein Block). */
interface VoiceBlock {
  start: number;
  count: number;
}

export default function AssistantWorkspace() {
  const router = useRouter();
  const { userContext, ready, update, loadDemo } = useUserContext();
  const [mode, setMode] = useState<AgentMode>("interview");
  const [shownProfileIds, setShownProfileIds] = useState<string[]>([]);
  const [guide, setGuide] = useState<InterviewGuide | null>(null);
  const [agentUpdatedAt, setAgentUpdatedAt] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: DEFAULT_GREETING }]);
  const voiceBlock = useRef<VoiceBlock | null>(null);

  const handleUiAction = useCallback(
    (action: UiAction) => {
      switch (action.type) {
        case "show_candidate":
          setShownProfileIds((prev) =>
            [action.profileId, ...prev.filter((id) => id !== action.profileId)].slice(0, MAX_SHOWN_PROFILES),
          );
          break;
        case "show_candidates":
          setShownProfileIds(Array.from(new Set(action.profileIds)).slice(0, MAX_SHOWN_PROFILES));
          break;
        case "update_user_context":
          update(action.patch);
          setAgentUpdatedAt(Date.now());
          break;
        case "show_interview_guide":
          setGuide(action.guide);
          setShownProfileIds((prev) =>
            [action.profileId, ...prev.filter((id) => id !== action.profileId)].slice(0, MAX_SHOWN_PROFILES),
          );
          break;
        case "navigate":
          if (isInternalHref(action.href)) router.push(action.href);
          break;
      }
    },
    [router, update],
  );

  /**
   * Voice-Transkript (immer der komplette Stand der laufenden Session) in den gemeinsamen Verlauf
   * mischen: Der Block der aktuellen Session wird ersetzt; eine neue Session hängt einen neuen Block an.
   * Ein leeres Array bedeutet „Session beendet“ (VoiceAgent schickt es bei Stop/Neustart).
   */
  const handleTranscript = useCallback((items: VoiceItem[]) => {
    if (items.length === 0) {
      voiceBlock.current = null;
      return;
    }
    const incoming: ChatMessage[] = items.map((i) => ({ role: i.role, content: i.text }));
    setMessages((prev) => {
      const block = voiceBlock.current;
      if (block && block.start + block.count <= prev.length) {
        voiceBlock.current = { start: block.start, count: incoming.length };
        return [...prev.slice(0, block.start), ...incoming, ...prev.slice(block.start + block.count)];
      }
      voiceBlock.current = { start: prev.length, count: incoming.length };
      return [...prev, ...incoming];
    });
  }, []);

  /** Text-Chat schreibt den Verlauf; danach beginnt ein eventueller Voice-Block neu. */
  const handleMessagesChange = useCallback((next: ChatMessage[]) => {
    setMessages(next);
    const block = voiceBlock.current;
    // Text-Nachrichten hängen hinten an – der Voice-Block bleibt an seiner Position gültig.
    if (block && block.start + block.count > next.length) voiceBlock.current = null;
  }, []);

  /** Kompaktes Profil im Panel angeklickt → nach vorn („Gerade im Gespräch“). */
  const bringToFront = useCallback((id: string) => {
    setShownProfileIds((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, MAX_SHOWN_PROFILES));
  }, []);

  const activeMode = MODES.find((m) => m.value === mode) ?? MODES[0];

  return (
    <div className="space-y-4">
      {ready && !userContext && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--warning)] bg-[var(--warning-soft)] px-4 py-3">
          <p className="text-sm text-[var(--foreground)]">
            <span className="font-medium">Noch kein Suchprofil</span> – Voya klärt es mit dir im Gespräch. Oder lade einen Demo-Kontext,
            um direkt passende Menschen zu sehen.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={loadDemo}>
              Demo-Kontext laden
            </Button>
            <LinkButton href="/onboarding" variant="ghost" className="px-2.5 py-1 text-xs">
              Onboarding ausfüllen
            </LinkButton>
          </div>
        </div>
      )}

      {ready && userContext && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
          <span>
            Kontext: <span className="font-medium text-[var(--foreground)]">{userContext.name || "Ohne Namen"}</span>
            {userContext.founderRole && ` · ${userContext.founderRole}`}
          </span>
          {userContext.lookingFor.length > 0 && (
            <span>· sucht {userContext.lookingFor.map((r) => NETWORK_ROLE_LABELS[r] ?? r).join(", ")}</span>
          )}
          {userContext.verticals.length > 0 && <span>· {userContext.verticals.join(", ")}</span>}
          {userContext.completedInterview ? (
            <Badge tone="success">Interview abgeschlossen</Badge>
          ) : (
            <Badge tone="warning">Interview offen</Badge>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Linke Spalte: Modus, Voice, Chat */}
        <div className="min-w-0 space-y-4">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div
                role="tablist"
                aria-label="Agent-Modus"
                className="inline-flex rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-0.5"
              >
                {MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    role="tab"
                    aria-selected={mode === m.value}
                    onClick={() => setMode(m.value)}
                    className={cx(
                      "rounded px-3 py-1.5 text-sm font-medium transition",
                      mode === m.value
                        ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
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
            onTranscript={handleTranscript}
            initialMessages={messages}
            visibleCandidateIds={shownProfileIds}
          />

          <ChatPanel
            mode={mode}
            onUiAction={handleUiAction}
            messages={messages}
            onMessagesChange={handleMessagesChange}
            currentCandidateId={shownProfileIds[0]}
          />
        </div>

        {/* Rechte Spalte: Suchprofil, Interviewleitfaden, Live-Kandidaten */}
        <div className="min-w-0 space-y-4">
          <BriefEditor agentUpdatedAt={agentUpdatedAt} />

          {guide && <InterviewGuideCard guide={guide} onClose={() => setGuide(null)} />}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Gerade im Gespräch{" "}
                {shownProfileIds.length > 0 && (
                  <span className="ml-1 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
                    {shownProfileIds.length}
                  </span>
                )}
              </h2>
              {shownProfileIds.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setShownProfileIds([])}>
                  Leeren
                </Button>
              )}
            </div>
            <LiveCandidatePanel profileIds={shownProfileIds} onFocus={bringToFront} />
          </div>
        </div>
      </div>
    </div>
  );
}
