"use client";
/**
 * Text-Chat mit Voya. Spricht `/api/chat` (Contract: ChatRequest → ChatResponse).
 * UI-Aktionen aus der Antwort gehen an `onUiAction`, Kontext-Patches in den Nutzer-Kontext.
 * Der Verlauf wird über `onMessagesChange` nach oben gereicht (Voice-Agent knüpft daran an).
 */
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { getProfile } from "@/lib/data";
import type { AgentMode, ChatMessage, ChatRequest, ChatResponse, UiAction } from "@/lib/types";
import { useUserContext } from "@/lib/user-context";
import { Badge, Button, Card, Chip, Textarea, cx } from "@/components/ui";

export interface ChatPanelProps {
  mode: AgentMode;
  /** Bei prep-simulation: welche Person der Agent spielt. */
  candidateId?: string;
  /** Zuletzt gezeigte Person („Gerade im Gespräch“) – für den Quick-Chip „Bereite ein Interview mit … vor“. */
  currentCandidateId?: string;
  onUiAction: (action: UiAction) => void;
  /** Lokale Begrüßung des Assistenten (ohne API-Aufruf). */
  initialAssistantMessage?: string;
  /** Wird bei jeder Änderung des Verlaufs aufgerufen (ohne system-Nachrichten). */
  onMessagesChange?: (messages: ChatMessage[]) => void;
}

const DEFAULT_GREETING =
  "Hi, ich bin Voya. Lass uns jemanden finden, mit dem du wirklich etwas aufbauen willst.\n\nWas möchtest du gründen – und welche Stärke soll dein Co-Founder mitbringen, die dir selbst noch fehlt?";

const SIMULATION_GREETING =
  "Kurz vorab: Das ist eine Simulation auf Basis des Profils – keine echten Aussagen der Person. Wenn du bereit bist, eröffne ich das Gespräch in der Rolle.";

const MODE_LABELS: Record<AgentMode, string> = {
  interview: "Suchprofil",
  "prep-simulation": "Simulation",
  general: "Frei",
};

const INTERVIEW_CHIP_PREFIX = "Bereite ein Interview mit ";
const INPUT_ID = "voya-chat-input";

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: unknown };
    if (typeof data?.error === "string" && data.error.trim()) return data.error;
  } catch {
    /* Body war kein JSON */
  }
  return `Voya hat nicht geantwortet (HTTP ${res.status}).`;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export default function ChatPanel({
  mode,
  candidateId,
  currentCandidateId,
  onUiAction,
  initialAssistantMessage,
  onMessagesChange,
}: ChatPanelProps) {
  const { userContext, update } = useUserContext();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: initialAssistantMessage ?? (mode === "prep-simulation" ? SIMULATION_GREETING : DEFAULT_GREETING) },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const onMessagesChangeRef = useRef(onMessagesChange);

  useEffect(() => {
    onMessagesChangeRef.current = onMessagesChange;
  }, [onMessagesChange]);

  // Verlauf nach oben reichen (Voice-Agent bekommt ihn als Kontext).
  useEffect(() => {
    onMessagesChangeRef.current?.(messages.filter((m) => m.role !== "system"));
  }, [messages]);

  // Immer ans Ende scrollen, wenn neue Nachrichten kommen (nur innerhalb der Liste, nicht die Seite).
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const requestReply = useCallback(
    async (history: ChatMessage[]) => {
      setLoading(true);
      setError(null);
      try {
        const body: ChatRequest = { messages: history, userContext, mode, candidateId };
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await readErrorMessage(res));

        const data = (await res.json()) as Partial<ChatResponse>;
        const reply = typeof data.reply === "string" && data.reply.trim() ? data.reply : "(Keine Antwort erhalten.)";
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);

        if (data.userContextPatch && Object.keys(data.userContextPatch).length > 0) {
          update(data.userContextPatch);
        }
        for (const action of data.uiActions ?? []) onUiAction(action);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unbekannter Fehler beim Senden.");
      } finally {
        setLoading(false);
      }
    },
    [userContext, mode, candidateId, update, onUiAction],
  );

  const send = useCallback(
    (text: string) => {
      const content = text.trim();
      if (!content || loading) return;
      const history: ChatMessage[] = [...messages, { role: "user", content }];
      setMessages(history);
      setInput("");
      void requestReply(history);
    },
    [messages, loading, requestReply],
  );

  /** Letzte Nutzer-Nachricht erneut schicken, ohne sie zu duplizieren. */
  const retry = useCallback(() => {
    if (loading) return;
    const last = messages[messages.length - 1];
    if (last?.role === "user") void requestReply(messages);
  }, [messages, loading, requestReply]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(input);
    }
  };

  /** Ohne gezeigte Person: Satzanfang ins Eingabefeld, den Namen ergänzt die Nutzer:in. */
  const prefillInterview = useCallback(() => {
    setInput(INTERVIEW_CHIP_PREFIX);
    document.getElementById(INPUT_ID)?.focus();
  }, []);

  // Quick-Chips: mit der gerade gezeigten Person, falls vorhanden.
  const current = currentCandidateId ? getProfile(currentCandidateId) : undefined;
  const interviewChip = current ? `${INTERVIEW_CHIP_PREFIX}${firstName(current.name)} vor` : `${INTERVIEW_CHIP_PREFIX}… vor`;
  const quickPrompts: { label: string; onClick: () => void }[] =
    mode === "prep-simulation"
      ? [
          { label: "Los geht's – eröffne das Gespräch", onClick: () => send("Los geht's – eröffne das Gespräch in deiner Rolle.") },
          { label: "Feedback", onClick: () => send("Feedback: Wie habe ich mich geschlagen?") },
        ]
      : [
          { label: "Was fehlt mir noch im Suchprofil?", onClick: () => send("Was fehlt mir noch im Suchprofil?") },
          { label: "Zeig mir passende Menschen", onClick: () => send("Zeig mir passende Kandidat:innen für mein Suchprofil.") },
          {
            label: interviewChip,
            onClick: () => (current ? send(`Bereite ein Interview mit ${current.name} vor.`) : prefillInterview()),
          },
          { label: "Wer investiert in Pre-Seed?", onClick: () => send("Wer sind Investoren für Pre-Seed?") },
          { label: "Guck dir mal die Lena an", onClick: () => send("Guck dir mal die Lena an") },
        ];

  return (
    <Card
      title="Mit Voya schreiben"
      description={mode === "prep-simulation" ? "Simulation – keine echten Aussagen der Person." : "Voya kann sich irren. Prüfe wichtige Angaben im Profil."}
      action={<Badge tone="accent">{MODE_LABELS[mode] ?? mode}</Badge>}
    >
      <div
        ref={listRef}
        className="flex h-[360px] flex-col gap-3 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] p-3 sm:h-[420px]"
        aria-live="polite"
      >
        {messages
          .filter((m) => m.role !== "system")
          .map((m, i) => (
            <MessageBubble key={i} message={m} assistantName={mode === "prep-simulation" ? "Simulation" : "Voya"} />
          ))}
        {loading && <TypingIndicator />}
      </div>

      {error && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={retry} disabled={loading}>
            Erneut versuchen
          </Button>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2" aria-label="Vorschläge">
        {quickPrompts.map((q) => (
          <Chip key={q.label} onClick={q.onClick} className={cx(loading && "pointer-events-none opacity-50")}>
            {q.label}
          </Chip>
        ))}
      </div>

      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Textarea
          id={INPUT_ID}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder="Oder schreib mir deine Gedanken … (Enter sendet, Shift+Enter für Zeilenumbruch)"
          aria-label="Nachricht an Voya"
          disabled={loading}
          className="resize-none"
        />
        <Button type="submit" disabled={loading || !input.trim()} className="shrink-0">
          {loading ? "Sendet …" : "Senden"}
        </Button>
      </form>
    </Card>
  );
}

function MessageBubble({ message, assistantName }: { message: ChatMessage; assistantName: string }) {
  const isUser = message.role === "user";
  return (
    <div className={cx("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cx(
          "max-w-[85%] whitespace-pre-wrap break-words rounded-[var(--radius-sm)] px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "rounded-br-sm bg-[var(--accent)] text-[var(--accent-contrast)]"
            : "rounded-bl-sm border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]",
        )}
      >
        <span className="block text-[10px] font-semibold uppercase tracking-wide opacity-70">{isUser ? "Du" : assistantName}</span>
        {message.content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start" aria-label="Voya denkt nach und prüft Profile">
      <div className="flex items-center gap-1 rounded-[var(--radius-sm)] rounded-bl-sm border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:300ms]" />
      </div>
    </div>
  );
}
