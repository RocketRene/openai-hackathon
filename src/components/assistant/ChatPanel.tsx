"use client";
/**
 * Text-Chat mit dem Agenten. Spricht `/api/chat` (Contract: ChatRequest → ChatResponse).
 * UI-Aktionen aus der Antwort gehen an `onUiAction`, Kontext-Patches in den Nutzer-Kontext.
 *
 * Sprache (DE/EN): UI-Texte über das lokale DICT; die UI-Sprache geht als `ChatRequest.locale`
 * an den Text-Agenten. Die Start-Nachricht wechselt mit der Sprache, solange noch keine
 * Nutzer-Nachricht gesendet wurde.
 */
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { AgentMode, ChatMessage, ChatRequest, ChatResponse, UiAction } from "@/lib/types";
import { COMMON, useLocale, useT, type Dict, type Locale } from "@/lib/i18n";
import { useUserContext } from "@/lib/user-context";
import { getProfile } from "@/lib/data";
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
  /**
   * Optional kontrolliert: Verlauf von außen (z. B. AssistantWorkspace hält ihn gemeinsam mit dem
   * Voice-Agent). Wenn gesetzt, ist `onMessagesChange` die einzige Schreibstelle.
   */
  messages?: ChatMessage[];
  /** Meldet jeden neuen Verlauf nach oben (auch im unkontrollierten Modus). */
  onMessagesChange?: (messages: ChatMessage[]) => void;
}

/** Start-Nachricht (Deutsch) – bleibt als Default exportiert. */
export const DEFAULT_GREETING =
  "Hi, ich bin Voya. Lass uns jemanden finden, mit dem du wirklich etwas aufbauen willst.\n\nWas möchtest du gründen – und welche Stärke soll dein Co-Founder mitbringen, die dir selbst noch fehlt?";

/** Start-Nachricht je Sprache. */
export const GREETINGS: Record<Locale, string> = {
  de: DEFAULT_GREETING,
  en: "Hi, I'm Voya. Let's find someone you really want to build with.\n\nWhat do you want to build – and which strength should your co-founder bring that you're still missing?",
};

export function greetingFor(locale: Locale): string {
  return GREETINGS[locale] ?? DEFAULT_GREETING;
}

const GREETING_SET = new Set<string>(Object.values(GREETINGS));

/** Ist der Text eine unserer Start-Nachrichten (egal in welcher Sprache)? */
export function isDefaultGreeting(text: string): boolean {
  return GREETING_SET.has(text);
}

const DICT = {
  title: { de: "Mit Voya schreiben", en: "Write to Voya" },
  descSimulation: { de: "Simulation – keine echten Aussagen der Person.", en: "Simulation – not real statements by this person." },
  desc: { de: "Voya kann sich irren. Prüfe wichtige Angaben im Profil.", en: "Voya can make mistakes. Check important details in the profile." },
  modeInterview: { de: "Suchprofil", en: "Search brief" },
  modeSimulation: { de: "Simulation", en: "Simulation" },
  modeGeneral: { de: "Frei", en: "Open" },
  // Quick-Chips
  qpStart: { de: "Interview starten", en: "Start interview" },
  qpStartMsg: { de: "Lass uns starten – stell mir die erste Frage.", en: "Let's start – ask me the first question." },
  qpMissing: { de: "Was fehlt mir noch im Suchprofil?", en: "What's missing in my brief?" },
  qpMatching: { de: "Zeig mir passende Menschen", en: "Show me matching candidates" },
  qpMatchingMsg: { de: "Zeig mir passende Kandidat:innen für mein Suchprofil.", en: "Show me matching candidates for my search brief." },
  qpInterview: { de: "Bereite ein Interview mit {name} vor", en: "Prepare an interview with {name}" },
  qpInterviewMsg: { de: "Bereite ein Interview mit {name} vor.", en: "Prepare an interview with {name}." },
  qpInterviewPrefix: { de: "Bereite ein Interview mit ", en: "Prepare an interview with " },
  qpInvestors: { de: "Wer investiert in Pre-Seed?", en: "Which investors do pre-seed?" },
  qpInvestorsMsg: { de: "Wer sind Investoren für Pre-Seed?", en: "Which investors do pre-seed?" },
  qpShow: { de: "Guck dir mal die Lena an", en: "Show me Max" },
  qpOpen: { de: "Los geht's – eröffne das Gespräch", en: "Let's go – open the conversation" },
  qpOpenMsg: { de: "Los geht's – eröffne das Gespräch in deiner Rolle.", en: "Let's go – open the conversation in your role." },
  qpFeedback: { de: "Feedback", en: "Feedback" },
  qpFeedbackMsg: { de: "Feedback: Wie habe ich mich geschlagen?", en: "Feedback: how did I do?" },
  suggestions: { de: "Vorschläge", en: "Suggestions" },
  // Eingabe
  placeholder: {
    de: "Oder schreib mir deine Gedanken … (Enter sendet, Shift+Enter für Zeilenumbruch)",
    en: "Or write me your thoughts … (Enter sends, Shift+Enter for a new line)",
  },
  inputAria: { de: "Nachricht an Voya", en: "Message to Voya" },
  sending: { de: "Sendet …", en: "Sending …" },
  send: { de: "Senden", en: "Send" },
  typing: { de: "Der Agent schreibt", en: "The agent is typing" },
  // Fehler
  noReply: { de: "(Keine Antwort erhalten.)", en: "(No reply received.)" },
  noAnswerHttp: { de: "Der Agent hat nicht geantwortet (HTTP {status}).", en: "The agent did not respond (HTTP {status})." },
  unknownError: { de: "Unbekannter Fehler beim Senden.", en: "Unknown error while sending." },
} satisfies Dict;

type DictKey = keyof typeof DICT;

const MODE_LABEL_KEYS: Record<AgentMode, DictKey> = {
  interview: "modeInterview",
  "prep-simulation": "modeSimulation",
  general: "modeGeneral",
};

const INPUT_ID = "voya-chat-input";

/** Quick-Chip: entweder eine fertige Nachricht oder die Interview-Aktion (nutzt die gezeigte Person). */
type QuickPrompt = { label: string; message: string } | { label: string; action: "interview" };

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: unknown };
    if (typeof data?.error === "string" && data.error.trim()) return data.error;
  } catch {
    /* Body war kein JSON */
  }
  return fallback;
}

export default function ChatPanel({
  mode,
  candidateId,
  currentCandidateId,
  onUiAction,
  initialAssistantMessage,
  messages: controlledMessages,
  onMessagesChange,
}: ChatPanelProps) {
  const { userContext, update } = useUserContext();
  const [locale] = useLocale();
  const t = useT(DICT);
  const tc = useT(COMMON);
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

  // Start-Nachricht folgt der Sprache – nur, solange noch keine Nutzer-Nachricht gesendet wurde.
  useEffect(() => {
    const current = messagesRef.current;
    if (current.some((m) => m.role === "user")) return;
    const greeting = greetingFor(locale);
    let changed = false;
    const next = current.map((m) => {
      if (m.role === "assistant" && isDefaultGreeting(m.content) && m.content !== greeting) {
        changed = true;
        return { ...m, content: greeting };
      }
      return m;
    });
    if (changed) setMessages(next);
  }, [locale, setMessages]);

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
        const body: ChatRequest = { messages: history, userContext, mode, candidateId, locale };
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await readErrorMessage(res, t("noAnswerHttp", { status: res.status })));

        const data = (await res.json()) as Partial<ChatResponse>;
        const reply = typeof data.reply === "string" && data.reply.trim() ? data.reply : t("noReply");
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);

        if (data.userContextPatch && Object.keys(data.userContextPatch).length > 0) {
          update(data.userContextPatch);
        }
        for (const action of data.uiActions ?? []) onUiAction(action);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("unknownError"));
      } finally {
        setLoading(false);
      }
    },
    [userContext, mode, candidateId, locale, t, update, onUiAction, setMessages],
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

  /** Ohne gezeigte Person: Satzanfang ins Eingabefeld, den Namen ergänzt die Nutzer:in. */
  const prefillInterview = useCallback(() => {
    setInput(t("qpInterviewPrefix"));
    document.getElementById(INPUT_ID)?.focus();
  }, [t]);

  // Quick-Chips im Voya-Ton – reine Daten; mit der gerade gezeigten Person, falls vorhanden.
  const current = currentCandidateId ? getProfile(currentCandidateId) : undefined;
  const interviewChip = t("qpInterview", { name: current ? firstName(current.name) : "…" });
  const quickPrompts: QuickPrompt[] =
    mode === "prep-simulation"
      ? [
          { label: t("qpOpen"), message: t("qpOpenMsg") },
          { label: t("qpFeedback"), message: t("qpFeedbackMsg") },
        ]
      : [
          ...(mode === "interview" ? [{ label: t("qpStart"), message: t("qpStartMsg") }] : []),
          { label: t("qpMissing"), message: t("qpMissing") },
          { label: t("qpMatching"), message: t("qpMatchingMsg") },
          { label: interviewChip, action: "interview" },
          { label: t("qpInvestors"), message: t("qpInvestorsMsg") },
          { label: t("qpShow"), message: t("qpShow") },
        ];

  const onQuickPrompt = useCallback(
    (q: QuickPrompt) => {
      if ("message" in q) {
        send(q.message);
      } else if (current) {
        send(t("qpInterviewMsg", { name: current.name }));
      } else {
        prefillInterview();
      }
    },
    [send, current, prefillInterview, t],
  );

  return (
    <Card
      title={t("title")}
      description={mode === "prep-simulation" ? t("descSimulation") : t("desc")}
      action={<Badge tone="accent">{t(MODE_LABEL_KEYS[mode] ?? "modeGeneral")}</Badge>}
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
        {loading && <TypingIndicator label={t("typing")} />}
      </div>

      {error && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={retry} disabled={loading}>
            {tc("retry")}
          </Button>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2" aria-label={t("suggestions")}>
        {quickPrompts.map((q) => (
          <Chip key={q.label} onClick={() => onQuickPrompt(q)} className={cx(loading && "pointer-events-none opacity-50")}>
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
          placeholder={t("placeholder")}
          aria-label={t("inputAria")}
          disabled={loading}
          className="resize-none"
        />
        <Button type="submit" disabled={loading || !input.trim()} className="shrink-0">
          {loading ? t("sending") : t("send")}
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

function TypingIndicator({ label }: { label: string }) {
  return (
    <div className="flex justify-start" aria-label={label}>
      <div className="flex items-center gap-1 rounded-lg rounded-bl-sm border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:300ms]" />
      </div>
    </div>
  );
}
