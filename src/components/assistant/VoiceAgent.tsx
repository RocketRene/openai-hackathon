"use client";
/**
 * Voice-Agent (OpenAI Realtime über WebRTC) – Paket "voice-agent".
 * ---------------------------------------------------------------
 * Contract: default export, Props = VoiceAgentProps (src/lib/types.ts).
 * Ablauf: POST /api/realtime/session → Ephemeral-Key → RealtimeSession.connect()
 * (Browser fragt nach Mikrofon-Berechtigung). Tool-Calls des Agenten landen
 * als UiAction bei `onUiAction`, das Live-Transkript bei `onTranscript`.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { RealtimeAgent, RealtimeSession, type RealtimeItem } from "@openai/agents/realtime";

import { Badge, Button, Input, cx } from "@/components/ui";
import type { VoiceAgentProps } from "@/lib/types";
import { buildVoiceInstructions } from "./voice-prompts";
import { createVoiceTools } from "./voice-tools";

type Status = "disconnected" | "connecting" | "connected" | "speaking";

interface TranscriptItem {
  id: string;
  role: "user" | "assistant";
  text: string;
  inProgress: boolean;
}

const STATUS_META: Record<Status, { label: string; tone: "neutral" | "accent" | "success" | "warning" | "danger"; dot: string }> = {
  disconnected: { label: "Getrennt", tone: "neutral", dot: "bg-[var(--muted)]" },
  connecting: { label: "Verbinde …", tone: "warning", dot: "bg-[var(--warning)] animate-pulse" },
  connected: { label: "Verbunden – hört zu", tone: "success", dot: "bg-[var(--success)]" },
  speaking: { label: "Spricht …", tone: "accent", dot: "bg-[var(--accent)] animate-pulse" },
};

const TOOL_LABELS: Record<string, string> = {
  show_candidate: "Profil wird geladen …",
  search_candidates: "Suche Kandidat:innen …",
  save_user_context: "Speichere dein Profil …",
  propose_candidates: "Berechne Matches …",
  list_events: "Lade Events …",
};

const SESSION_ENDPOINT = "/api/realtime/session";

/** Nur Nachrichten (user/assistant) aus der Realtime-History; Text bzw. Audio-Transkript extrahieren. */
function extractTranscript(history: RealtimeItem[]): TranscriptItem[] {
  const out: TranscriptItem[] = [];
  for (const item of history) {
    if (item.type !== "message" || item.role === "system") continue;
    const parts = item.content as Array<{ type: string; text?: string; transcript?: string | null }>;
    const text = parts
      .map((c) => (c.type === "input_text" || c.type === "output_text" ? c.text ?? "" : c.transcript ?? ""))
      .filter(Boolean)
      .join(" ")
      .trim();
    if (!text) continue;
    out.push({ id: item.itemId, role: item.role, text, inProgress: item.status === "in_progress" });
  }
  return out;
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message || err.name;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const e = err as { message?: unknown; error?: unknown; type?: unknown; code?: unknown };
    if (typeof e.message === "string" && e.message) return e.message;
    if (e.error && e.error !== err) return formatError(e.error);
    try {
      return JSON.stringify(err);
    } catch {
      /* ignore */
    }
  }
  return "Unbekannter Fehler";
}

function describeConnectError(err: unknown): string {
  const name = err instanceof Error ? err.name : "";
  const msg = formatError(err);
  if (name === "NotAllowedError" || /permission denied|not allowed/i.test(msg)) {
    return "Mikrofon-Zugriff verweigert – bitte im Browser erlauben und erneut starten.";
  }
  if (name === "NotFoundError" || /requested device not found/i.test(msg)) {
    return "Kein Mikrofon gefunden. Bitte ein Mikrofon anschließen und erneut starten.";
  }
  if (/failed to fetch|networkerror/i.test(msg)) {
    return "Verbindung fehlgeschlagen – läuft der Server und ist das Netzwerk erreichbar?";
  }
  return `Verbindung fehlgeschlagen: ${msg}`;
}

export default function VoiceAgent({ mode, userContext, candidate, onUiAction, onTranscript, className }: VoiceAgentProps) {
  const [status, setStatus] = useState<Status>("disconnected");
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [toolActivity, setToolActivity] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");

  const sessionRef = useRef<RealtimeSession | null>(null);
  const onUiActionRef = useRef(onUiAction);
  const onTranscriptRef = useRef(onTranscript);
  const lastTranscriptJson = useRef("");
  const listRef = useRef<HTMLDivElement>(null);

  // Immer die aktuellsten Callbacks benutzen, ohne die Session neu aufzubauen.
  useEffect(() => {
    onUiActionRef.current = onUiAction;
    onTranscriptRef.current = onTranscript;
  }, [onUiAction, onTranscript]);

  // Transkript automatisch ans Ende scrollen.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript]);

  // Cleanup bei Unmount: Verbindung schließen (Mikrofon freigeben).
  useEffect(() => {
    return () => {
      const s = sessionRef.current;
      sessionRef.current = null;
      if (s) {
        try {
          s.close();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  const stop = useCallback(() => {
    const s = sessionRef.current;
    sessionRef.current = null;
    if (s) {
      try {
        s.close();
      } catch {
        /* ignore */
      }
    }
    setStatus("disconnected");
    setMuted(false);
    setToolActivity(null);
  }, []);

  const start = useCallback(async () => {
    if (sessionRef.current) return;
    setError(null);
    setToolActivity(null);
    setStatus("connecting");

    try {
      // 1) Ephemeral-Key vom Server (API-Key bleibt serverseitig).
      const res = await fetch(SESSION_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, candidateId: candidate?.id }),
      });

      if (res.status === 503) {
        setError("OPENAI_API_KEY fehlt – der Voice-Agent braucht einen OpenAI-Key auf dem Server. Der Text-Chat funktioniert trotzdem.");
        setStatus("disconnected");
        return;
      }
      if (!res.ok) {
        let message = `Session-Endpunkt antwortet mit Status ${res.status}.`;
        try {
          const body = (await res.json()) as { error?: unknown };
          if (body && typeof body.error === "string") message = body.error;
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }

      const data = (await res.json()) as { value?: string; model?: string };
      if (!data.value) throw new Error("Kein Ephemeral-Key in der Antwort von /api/realtime/session.");

      // 2) Agent + Session aufbauen.
      const agent = new RealtimeAgent({
        name: "FounderRadar",
        instructions: buildVoiceInstructions(mode, userContext, candidate),
        tools: createVoiceTools({ emit: (action) => onUiActionRef.current(action) }),
      });

      const session = new RealtimeSession(agent, {
        model: data.model || "gpt-realtime",
        config: {
          audio: {
            input: {
              transcription: { model: "gpt-4o-mini-transcribe", language: "de" },
            },
          },
        },
      });

      session.on("history_updated", (history) => {
        const items = extractTranscript(history);
        setTranscript(items);
        const json = JSON.stringify(items.map((i) => [i.role, i.text]));
        if (json !== lastTranscriptJson.current) {
          lastTranscriptJson.current = json;
          onTranscriptRef.current?.(items.map(({ role, text }) => ({ role, text })));
        }
      });
      session.on("error", (event) => {
        setError(formatError(event.error));
      });
      session.on("audio_start", () => setStatus("speaking"));
      session.on("audio_stopped", () => setStatus("connected"));
      session.on("audio_interrupted", () => setStatus("connected"));
      session.on("agent_tool_start", (_context, _agent, tool) => {
        setToolActivity(TOOL_LABELS[tool.name] ?? `Führe ${tool.name} aus …`);
      });
      session.on("agent_tool_end", () => setToolActivity(null));

      sessionRef.current = session;

      // 3) Verbinden (WebRTC, Mikrofon-Berechtigung).
      await session.connect({ apiKey: data.value });

      if (sessionRef.current !== session) {
        // Während des Verbindens wurde beendet/unmounted.
        try {
          session.close();
        } catch {
          /* ignore */
        }
        return;
      }
      setStatus("connected");

      // 4) Der Agent eröffnet das Gespräch (Begrüßung + erste Frage), ohne dass man zuerst sprechen muss.
      try {
        session.transport.sendEvent({ type: "response.create" });
      } catch {
        /* optional – wenn der Transport das nicht kann, spricht die Nutzer:in zuerst */
      }
    } catch (err) {
      const s = sessionRef.current;
      sessionRef.current = null;
      if (s) {
        try {
          s.close();
        } catch {
          /* ignore */
        }
      }
      setStatus("disconnected");
      setError(describeConnectError(err));
    }
  }, [mode, userContext, candidate]);

  const toggleMute = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    const next = !muted;
    try {
      s.mute(next);
      setMuted(next);
    } catch (err) {
      setError(formatError(err));
    }
  }, [muted]);

  const interrupt = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    try {
      s.interrupt();
      setStatus("connected");
    } catch (err) {
      setError(formatError(err));
    }
  }, []);

  const sendText = useCallback(() => {
    const s = sessionRef.current;
    const text = textInput.trim();
    if (!s || !text) return;
    try {
      s.sendMessage(text);
      setTextInput("");
    } catch (err) {
      setError(formatError(err));
    }
  }, [textInput]);

  const connected = status === "connected" || status === "speaking";
  const meta = STATUS_META[status];
  const statusLabel = connected && muted ? "Stumm" : meta.label;
  const statusTone = connected && muted ? "warning" : meta.tone;

  const modeLabel =
    mode === "interview" ? "Interview-Coach" : mode === "prep-simulation" ? `Simulation: ${candidate?.name ?? "Kandidat:in"}` : "Dashboard-Assistent";
  const hint =
    mode === "interview"
      ? "Der Coach interviewt dich kurz und schlägt dann passende Kontakte vor. Sag z. B. „Guck dir mal den Max an“, um ein Profil zu öffnen."
      : mode === "prep-simulation"
        ? `Der Agent spielt ${candidate?.name ?? "die Kandidat:in"} in einem Erstgespräch. Sag „Feedback“, um aus der Rolle zu treten.`
        : "Frag nach Kandidat:innen, Events oder wer zu dir passt.";
  const assistantName = mode === "prep-simulation" && candidate ? candidate.name.split(" ")[0] : "FounderRadar";

  return (
    <div className={cx("rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4", className)}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cx("inline-block h-2.5 w-2.5 rounded-full", meta.dot)} aria-hidden="true" />
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Voice-Agent</h3>
          <Badge tone="neutral">{modeLabel}</Badge>
        </div>
        <Badge tone={statusTone}>{statusLabel}</Badge>
      </header>
      <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>

      {error && (
        <div
          role="alert"
          className="mt-3 rounded-md border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger)]"
        >
          {error}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {connected ? (
          <>
            <Button variant="secondary" size="sm" onClick={toggleMute} aria-pressed={muted}>
              {muted ? "Mikro an" : "Stummschalten"}
            </Button>
            {status === "speaking" && (
              <Button variant="ghost" size="sm" onClick={interrupt}>
                Unterbrechen
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={stop}>
              Beenden
            </Button>
          </>
        ) : (
          <Button onClick={() => void start()} disabled={status === "connecting"}>
            {status === "connecting" ? "Verbinde …" : "Voice-Agent starten"}
          </Button>
        )}
        {toolActivity && <span className="animate-pulse text-xs text-[var(--muted)]">{toolActivity}</span>}
      </div>

      <div
        ref={listRef}
        className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-md bg-[var(--surface-2)] p-3"
        aria-live="polite"
        aria-label="Live-Transkript"
      >
        {transcript.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">
            {connected ? "Verbunden – sprich einfach los." : "Noch kein Gespräch. Starte den Voice-Agent und sprich einfach los."}
          </p>
        ) : (
          transcript.map((item) => (
            <div key={item.id} className={cx("flex", item.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cx(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                  item.role === "user"
                    ? "bg-[var(--accent)] text-white"
                    : "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]",
                  item.inProgress && "opacity-70",
                )}
              >
                <span className="block text-[10px] font-medium uppercase tracking-wide opacity-70">
                  {item.role === "user" ? "Du" : assistantName}
                </span>
                {item.text}
              </div>
            </div>
          ))
        )}
      </div>

      {connected && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            sendText();
          }}
        >
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Oder tippen statt sprechen …"
            aria-label="Textnachricht an den Voice-Agent"
          />
          <Button type="submit" variant="secondary" disabled={!textInput.trim()}>
            Senden
          </Button>
        </form>
      )}
    </div>
  );
}
