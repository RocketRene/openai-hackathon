"use client";
/**
 * Gesprächs-Simulation: oben der Voice-Agent (Realtime) in einer hervorgehobenen Card, darunter eine
 * Text-Simulation über POST /api/chat (mode "prep-simulation"). Der Agent spielt die Kandidat:in.
 */
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import type { ChatMessage, ChatRequest, ChatResponse, Profile, UserContext } from "@/lib/types";
import { Avatar, Badge, Button, Kicker, Textarea, cx } from "@/components/ui";
import VoiceAgent from "@/components/assistant/VoiceAgent";
import { IconAlert, IconMic, IconRefresh, IconSend, IconSparkles, firstName } from "./shared";

const FEEDBACK_CHIP = "Feedback";

const QUICK_CHIPS = [
  "Hi, schön dich kennenzulernen – woran arbeitest du gerade?",
  "Was suchst du aktuell in einem Co-Founder oder Partner?",
  "Wie würdest du unsere Zusammenarbeit im Alltag sehen?",
  "Was müsste ich dir zeigen, damit du mitmachst?",
  FEEDBACK_CHIP,
];

function QuickChip({
  children,
  onClick,
  disabled,
  highlight,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1.5 text-left text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50",
        highlight
          ? "border-transparent bg-[var(--accent-soft)] text-[var(--accent)] hover:opacity-80"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-2)]",
      )}
    >
      {children}
    </button>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex h-5 items-center gap-1" aria-label="schreibt …">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)]"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </span>
  );
}

export default function SimulationPanel({
  profile,
  userContext,
}: {
  profile: Profile;
  userContext: UserContext | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, sending]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || sending) return;
      setError(null);
      const next: ChatMessage[] = [...messages, { role: "user", content }];
      setMessages(next);
      setInput("");
      setSending(true);
      try {
        const body: ChatRequest = {
          messages: next,
          userContext,
          mode: "prep-simulation",
          candidateId: profile.id,
        };
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          throw new Error(`Der Agent hat nicht geantwortet (HTTP ${res.status}).`);
        }
        const data = (await res.json()) as ChatResponse;
        const reply = typeof data.reply === "string" && data.reply.trim() ? data.reply : "…";
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unbekannter Fehler beim Senden.");
      } finally {
        setSending(false);
      }
    },
    [messages, profile.id, sending, userContext],
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  const reset = () => {
    setMessages([]);
    setError(null);
    setInput("");
  };

  const vorname = firstName(profile.name);
  const hasMessages = messages.length > 0;

  return (
    <div className="space-y-6">
      {/* Voice-Agent – hervorgehoben */}
      <section
        aria-labelledby="sim-voice-title"
        className="rounded-[var(--radius)] border border-[var(--accent)]/30 bg-[var(--accent-soft)] p-5 shadow-[var(--shadow-sm)]"
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--accent)] shadow-[var(--shadow-sm)]">
              <IconMic size={18} />
            </span>
            <div>
              <Kicker>Sprach-Simulation</Kicker>
              <h3 id="sim-voice-title" className="text-base font-semibold tracking-tight text-[var(--foreground)]">
                Übe das Gespräch laut
              </h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Der Voice-Agent spielt {profile.name} und reagiert live auf das, was du sagst.
              </p>
            </div>
          </div>
          <Badge tone="accent">Voice · Realtime</Badge>
        </div>
        <VoiceAgent mode="prep-simulation" candidate={profile} userContext={userContext} onUiAction={() => {}} />
      </section>

      {/* Text-Simulation */}
      <section
        aria-labelledby="sim-chat-title"
        className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar src={profile.photoUrl} name={profile.name} size={36} />
            <div className="min-w-0">
              <h3 id="sim-chat-title" className="truncate text-sm font-semibold text-[var(--foreground)]">
                {profile.name}
              </h3>
              <p className="text-xs text-[var(--muted)]">
                Text-Simulation · gespielt vom Agenten
                {hasMessages && ` · ${messages.length} ${messages.length === 1 ? "Nachricht" : "Nachrichten"}`}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={reset} disabled={!hasMessages && !error}>
            <IconRefresh size={14} /> Neu starten
          </Button>
        </header>

        {/* Verlauf */}
        <div className="fr-scroll max-h-[520px] min-h-[280px] space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
          {!hasMessages && !sending && (
            <div className="flex min-h-[240px] flex-col items-center justify-center px-4 text-center">
              <Avatar src={profile.photoUrl} name={profile.name} size={56} />
              <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">Starte das Gespräch mit {vorname}</p>
              <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">
                Wähle unten einen Einstieg oder schreib selbst. Sag <span className="font-medium text-[var(--foreground)]">„Feedback“</span>,
                um eine Einschätzung zu deinem Gesprächsverlauf zu bekommen.
              </p>
            </div>
          )}
          {messages.map((m, i) => {
            const isUser = m.role === "user";
            return (
              <div key={i} className={cx("fr-fade-in flex items-end gap-2", isUser ? "justify-end" : "justify-start")}>
                {!isUser && <Avatar src={profile.photoUrl} name={profile.name} size={28} className="mb-0.5" />}
                <div
                  className={cx(
                    "max-w-[85%] whitespace-pre-wrap rounded-[var(--radius)] px-3.5 py-2 text-sm leading-relaxed sm:max-w-[75%]",
                    isUser
                      ? "rounded-br-sm bg-[var(--accent)] text-[var(--accent-contrast)] shadow-[var(--shadow-sm)]"
                      : "rounded-bl-sm border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)]",
                  )}
                >
                  {m.content}
                </div>
              </div>
            );
          })}
          {sending && (
            <div className="fr-fade-in flex items-end gap-2">
              <Avatar src={profile.photoUrl} name={profile.name} size={28} className="mb-0.5" />
              <div className="rounded-[var(--radius)] rounded-bl-sm border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2">
                <TypingDots />
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-[var(--danger)]/40 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
              <IconAlert size={16} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick-Chips */}
        <div className="flex flex-wrap gap-2 border-t border-[var(--border)] px-4 py-3">
          {QUICK_CHIPS.map((chip) => {
            const isFeedback = chip === FEEDBACK_CHIP;
            return (
              <QuickChip key={chip} onClick={() => void send(chip)} disabled={sending} highlight={isFeedback}>
                {isFeedback && <IconSparkles size={12} />}
                {chip}
              </QuickChip>
            );
          })}
        </div>

        {/* Eingabe – bleibt unten sichtbar */}
        <div className="sticky bottom-0 rounded-b-[var(--radius)] border-t border-[var(--border)] bg-[var(--surface)]/95 p-3 backdrop-blur">
          <form onSubmit={onSubmit} className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              style={{ minHeight: "2.5rem" }}
              className="max-h-40 resize-none py-2.5 leading-snug"
              placeholder={`Schreib ${vorname} etwas …`}
              disabled={sending}
              aria-label="Nachricht"
            />
            <Button type="submit" disabled={sending || !input.trim()} aria-label="Senden" className="shrink-0">
              <IconSend size={16} />
              <span className="hidden sm:inline">Senden</span>
            </Button>
          </form>
          <p className="mt-1.5 text-[11px] text-[var(--muted)]">Enter senden · Shift+Enter Zeilenumbruch</p>
        </div>
      </section>
    </div>
  );
}
