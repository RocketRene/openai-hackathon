"use client";
/**
 * Text-Chat mit dem Agenten. Spricht `/api/chat` (Contract: ChatRequest → ChatResponse).
 * UI-Aktionen aus der Antwort gehen an `onUiAction`, Kontext-Patches in den Nutzer-Kontext.
 */
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { AgentMode, ChatMessage, ChatRequest, ChatResponse, UiAction } from "@/lib/types";
import { useUserContext } from "@/lib/user-context";
import { Button, Card, Textarea, cx } from "@/components/ui";

export interface ChatPanelProps {
  mode: AgentMode;
  /** Bei prep-simulation: welche Person der Agent spielt. */
  candidateId?: string;
  onUiAction: (action: UiAction) => void;
  /** Lokale Begrüßung des Assistenten (ohne API-Aufruf). */
  initialAssistantMessage?: string;
  /**
   * Optional kontrolliert: Verlauf von außen (z. B. AssistantWorkspace hält ihn gemeinsam mit dem
   * Voice-Agent). Wenn gesetzt, ist `onMessagesChange` die einzige Schreibstelle.
   */
  messages?: ChatMessage[];
  /** Meldet jeden neuen Verlauf nach oben (auch im unkontrollierten Modus). */
  onMessagesChange?: (messages: ChatMessage[]) => void;
}

export const DEFAULT_GREETING =
  "Hi! Ich bin dein Voya. Erzähl mir kurz: Welche Rolle hast du und wen suchst du?";

const QUICK_PROMPTS = [
  "Interview starten",
  "Zeig mir passende Kandidaten",
  "Guck dir mal den Max an",
  "Wer sind Investoren für Pre-Seed?",
  "Bereite mich auf das Gespräch mit Lena vor",
];

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: unknown };
    if (typeof data?.error === "string" && data.error.trim()) return data.error;
  } catch {
    /* Body war kein JSON */
  }
  return `Der Agent hat nicht geantwortet (HTTP ${res.status}).`;
}

export default function ChatPanel({
  mode,
  candidateId,
  onUiAction,
  initialAssistantMessage,
  messages: controlledMessages,
  onMessagesChange,
}: ChatPanelProps) {
  const { userContext, update } = useUserContext();
  const [internalMessages, setInternalMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: initialAssistantMessage ?? DEFAULT_GREETING },
  ]);
  const messages = controlledMessages ?? internalMessages;
  // Aktuellster Verlauf für asynchrone Appends (Antwort vom Server), auch im kontrollierten Modus.
  const messagesRef = useRef(messages);
  const onMessagesChangeRef = useRef(onMessagesChange);
  useEffect(() => {
    messagesRef.current = messages;
    onMessagesChangeRef.current = onMessagesChange;
  }, [messages, onMessagesChange]);
  const controlled = controlledMessages !== undefined;

  const setMessages = useCallback(
    (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      const next = typeof updater === "function" ? updater(messagesRef.current) : updater;
      messagesRef.current = next;
      if (!controlled) setInternalMessages(next);
      onMessagesChangeRef.current?.(next);
    },
    [controlled],
  );

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
    [userContext, mode, candidateId, update, onUiAction, setMessages],
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
    [messages, loading, requestReply, setMessages],
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

  return (
    <Card
      title="Text-Chat"
      action={
        <span className="text-xs text-[var(--muted)]">
          Modus: <span className="font-medium text-[var(--foreground)]">{mode}</span>
        </span>
      }
    >
      <div
        ref={listRef}
        className="flex h-[380px] flex-col gap-3 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--background)] p-3 sm:h-[440px]"
        aria-live="polite"
      >
        {messages
          .filter((m) => m.role !== "system")
          .map((m, i) => (
            <MessageBubble key={i} message={m} />
          ))}
        {loading && <TypingIndicator />}
      </div>

      {error && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={retry} disabled={loading}>
            Erneut versuchen
          </Button>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => send(q)}
            disabled={loading}
            className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs text-[var(--foreground)] transition hover:bg-[var(--surface-3)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {q}
          </button>
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
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder="Schreib dem Agenten … (Enter sendet, Shift+Enter für Zeilenumbruch)"
          aria-label="Nachricht an den Agenten"
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

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cx("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cx(
          "max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "rounded-br-sm bg-[var(--accent)] text-white"
            : "rounded-bl-sm border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]",
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start" aria-label="Der Agent schreibt">
      <div className="flex items-center gap-1 rounded-lg rounded-bl-sm border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:300ms]" />
      </div>
    </div>
  );
}
