"use client";
/**
 * Gesprächs-Simulation: oben der Voice-Agent (Realtime), darunter eine Text-Simulation
 * über POST /api/chat (mode "prep-simulation"). Der Agent spielt die Kandidat:in.
 */
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { ChatMessage, ChatRequest, ChatResponse, Profile, UserContext } from "@/lib/types";
import { Avatar, Badge, Button, Card, Textarea, cx } from "@/components/ui";
import VoiceAgent from "@/components/assistant/VoiceAgent";

const QUICK_CHIPS = [
  "Hi, schön dich kennenzulernen – woran arbeitest du gerade?",
  "Was suchst du aktuell in einem Co-Founder oder Partner?",
  "Wie würdest du unsere Zusammenarbeit im Alltag sehen?",
  "Was müsste ich dir zeigen, damit du mitmachst?",
  "Feedback",
];

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
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

  return (
    <div className="space-y-4">
      <Card title="Sprach-Simulation" action={<Badge tone="accent">Voice</Badge>}>
        <p className="mb-3 text-sm text-[var(--muted)]">
          Übe das Gespräch laut: Der Voice-Agent spielt {profile.name} und reagiert auf das, was du sagst.
        </p>
        <VoiceAgent mode="prep-simulation" candidate={profile} userContext={userContext} onUiAction={() => {}} />
      </Card>

      <Card
        title="Text-Simulation"
        action={
          <Button variant="ghost" size="sm" onClick={reset} disabled={messages.length === 0 && !error}>
            Neu starten
          </Button>
        }
      >
        <div className="mb-3 flex items-start gap-3 rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <Avatar src={profile.photoUrl} name={profile.name} size={32} />
          <p className="text-sm text-[var(--foreground)]">
            Du sprichst jetzt mit <span className="font-medium">{profile.name}</span> (gespielt vom Agenten). Sag{" "}
            <span className="font-medium">„Feedback“</span>, um eine Einschätzung zu deinem Gesprächsverlauf zu bekommen.
          </p>
        </div>

        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1" aria-live="polite">
          {messages.length === 0 && !sending && (
            <p className="py-6 text-center text-sm text-[var(--muted)]">
              Noch keine Nachrichten. Starte mit einem der Vorschläge oder schreib selbst etwas.
            </p>
          )}
          {messages.map((m, i) => {
            const isUser = m.role === "user";
            return (
              <div key={i} className={cx("flex gap-2", isUser ? "justify-end" : "justify-start")}>
                {!isUser && <Avatar src={profile.photoUrl} name={profile.name} size={28} />}
                <div
                  className={cx(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                    isUser
                      ? "bg-[var(--accent)] text-white"
                      : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)]",
                  )}
                >
                  {!isUser && <p className="mb-0.5 text-[11px] font-semibold text-[var(--muted)]">{vorname}</p>}
                  {m.content}
                </div>
              </div>
            );
          })}
          {sending && (
            <div className="flex gap-2">
              <Avatar src={profile.photoUrl} name={profile.name} size={28} />
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--muted)]">
                {vorname} überlegt …
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-md border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => void send(chip)}
              disabled={sending}
              className={cx(
                "rounded-full border px-3 py-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-50",
                chip === "Feedback"
                  ? "border-transparent bg-[var(--accent-soft)] text-[var(--accent)] hover:opacity-80"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-2)]",
              )}
            >
              {chip}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="mt-3 flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder={`Schreib ${vorname} etwas … (Enter zum Senden, Shift+Enter für Zeilenumbruch)`}
            disabled={sending}
            aria-label="Nachricht"
          />
          <Button type="submit" disabled={sending || !input.trim()}>
            Senden
          </Button>
        </form>
      </Card>
    </div>
  );
}
