"use client";
/**
 * Voice-Agent „Voya“ (OpenAI Realtime über WebRTC) – Paket "voice-agent".
 * ---------------------------------------------------------------
 * Contract: default export, Props = VoiceAgentProps (src/lib/types.ts).
 * Ablauf: POST /api/realtime/session → Ephemeral-Key → RealtimeSession.connect()
 * (Browser fragt nach Mikrofon-Berechtigung). Tool-Calls des Agenten landen
 * als UiAction bei `onUiAction`, das Live-Transkript bei `onTranscript`.
 * Kontext-Props (initialMessages, visibleCandidateIds, candidate) werden beim
 * Verbinden in die Instructions eingebettet – als Kontext, nicht als Anweisung.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { RealtimeAgent, RealtimeSession, type RealtimeItem } from "@openai/agents/realtime";

import { Badge, Button, Input, cx } from "@/components/ui";
import { getProfile } from "@/lib/data";
import type { ChatMessage, Profile, UiAction, VoiceAgentProps } from "@/lib/types";
import { buildVoiceInstructions } from "./voice-prompts";
import { createVoiceTools } from "./voice-tools";

type Status = "disconnected" | "connecting" | "connected" | "speaking";

interface TranscriptItem {
  id: string;
  role: "user" | "assistant";
  text: string;
  inProgress: boolean;
}

interface ToolEvent {
  id: number;
  name: string;
  label: string;
}

const STATUS_META: Record<Status, { label: string; tone: "neutral" | "accent" | "success" | "warning" | "danger"; dot: string }> = {
  disconnected: { label: "Bereit", tone: "neutral", dot: "bg-[var(--muted)]" },
  connecting: { label: "Verbinde …", tone: "warning", dot: "bg-[var(--warning)] animate-pulse" },
  connected: { label: "Voya hört zu", tone: "success", dot: "bg-[var(--success)]" },
  speaking: { label: "Voya spricht", tone: "accent", dot: "bg-[var(--accent)] animate-pulse" },
};

/** Laufende Tool-Aktivität (Präsens) und erledigte (Perfekt) – als Badges im UI. */
const TOOL_LABELS: Record<string, { running: string; done: string }> = {
  search_candidates: { running: "Durchsuche Profile …", done: "Profile durchsucht" },
  get_candidate: { running: "Lade Lebenslauf …", done: "Lebenslauf geladen" },
  show_candidate: { running: "Lade Profil …", done: "Profil geladen" },
  update_brief: { running: "Aktualisiere Suchprofil …", done: "Suchprofil aktualisiert" },
  save_user_context: { running: "Speichere dein Profil …", done: "Profil gespeichert" },
  propose_candidates: { running: "Berechne Matches …", done: "Matches berechnet" },
  prepare_interview: { running: "Erstelle Interview-Leitfaden …", done: "Leitfaden erstellt" },
  list_events: { running: "Lade Events …", done: "Events geladen" },
};

const SESSION_ENDPOINT = "/api/realtime/session";
const MAX_RECENT_TOOLS = 4;

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

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

export default function VoiceAgent({
  mode,
  userContext,
  candidate,
  onUiAction,
  onTranscript,
  initialMessages,
  visibleCandidateIds,
  className,
}: VoiceAgentProps) {
  const [status, setStatus] = useState<Status>("disconnected");
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [activeTool, setActiveTool] = useState<ToolEvent | null>(null);
  const [recentTools, setRecentTools] = useState<ToolEvent[]>([]);
  const [textInput, setTextInput] = useState("");

  const sessionRef = useRef<RealtimeSession | null>(null);
  const onUiActionRef = useRef(onUiAction);
  const onTranscriptRef = useRef(onTranscript);
  const initialMessagesRef = useRef<ChatMessage[] | undefined>(initialMessages);
  const visibleIdsRef = useRef<string[] | undefined>(visibleCandidateIds);
  /** Zuletzt gezeigte Person („Gerade im Gespräch“) – Bezug für „diese Person“ und prepare_interview ohne ID. */
  const currentCandidateRef = useRef<string | undefined>(candidate?.id ?? visibleCandidateIds?.[0]);
  const lastTranscriptJson = useRef("");
  const listRef = useRef<HTMLDivElement>(null);
  const toolSeq = useRef(0);

  // Immer die aktuellsten Callbacks/Kontexte benutzen, ohne die Session neu aufzubauen.
  useEffect(() => {
    onUiActionRef.current = onUiAction;
    onTranscriptRef.current = onTranscript;
  }, [onUiAction, onTranscript]);

  useEffect(() => {
    initialMessagesRef.current = initialMessages;
  }, [initialMessages]);

  useEffect(() => {
    visibleIdsRef.current = visibleCandidateIds;
    if (visibleCandidateIds?.[0]) currentCandidateRef.current = visibleCandidateIds[0];
  }, [visibleCandidateIds]);

  useEffect(() => {
    if (candidate?.id) currentCandidateRef.current = candidate.id;
  }, [candidate?.id]);

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

  /** UI-Aktionen weiterleiten und dabei die zuletzt gezeigte Person mitführen. */
  const emit = useCallback((action: UiAction) => {
    if (action.type === "show_candidate" || action.type === "show_interview_guide") {
      currentCandidateRef.current = action.profileId;
    } else if (action.type === "show_candidates" && action.profileIds[0]) {
      currentCandidateRef.current = action.profileIds[0];
    }
    onUiActionRef.current(action);
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
    setActiveTool(null);
  }, []);

  const start = useCallback(async () => {
    if (sessionRef.current) return;
    setError(null);
    setActiveTool(null);
    setRecentTools([]);
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

      // 2) Kontext einsammeln: gezeigte Person, sichtbare Profile, bisheriger Text-Chat.
      const visibleCandidates = (visibleIdsRef.current ?? [])
        .map((id) => getProfile(id))
        .filter((p): p is Profile => Boolean(p));
      const currentCandidate = candidate ?? (currentCandidateRef.current ? getProfile(currentCandidateRef.current) : undefined) ?? visibleCandidates[0];

      // 3) Agent + Session aufbauen.
      const agent = new RealtimeAgent({
        name: "Voya",
        instructions: buildVoiceInstructions(mode, userContext, candidate, {
          currentCandidate: currentCandidate ?? null,
          visibleCandidates,
          priorMessages: initialMessagesRef.current,
        }),
        tools: createVoiceTools({ emit, getCurrentCandidateId: () => currentCandidateRef.current }),
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
        const labels = TOOL_LABELS[tool.name];
        setActiveTool({ id: ++toolSeq.current, name: tool.name, label: labels?.running ?? `Führe ${tool.name} aus …` });
      });
      session.on("agent_tool_end", (_context, _agent, tool) => {
        const labels = TOOL_LABELS[tool.name];
        setActiveTool(null);
        setRecentTools((prev) =>
          [{ id: ++toolSeq.current, name: tool.name, label: labels?.done ?? tool.name }, ...prev].slice(0, MAX_RECENT_TOOLS),
        );
      });

      sessionRef.current = session;

      // 4) Verbinden (WebRTC, Mikrofon-Berechtigung).
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

      // 5) Voya eröffnet das Gespräch (Begrüßung + erste Frage), ohne dass man zuerst sprechen muss.
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
  }, [mode, userContext, candidate, emit]);

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
  const connecting = status === "connecting";
  const meta = STATUS_META[status];
  const statusLabel = connected && muted ? "Mikrofon stumm" : meta.label;
  const statusTone = connected && muted ? "warning" : meta.tone;
  const statusDot = connected && muted ? "bg-[var(--warning)]" : meta.dot;

  const isSimulation = mode === "prep-simulation";
  const modeLabel = mode === "interview" ? "Suchprofil schärfen" : isSimulation ? `Simulation: ${candidate?.name ?? "Kandidat:in"}` : "Freies Gespräch";
  const hint =
    mode === "interview"
      ? "Voya klärt mit dir Schritt für Schritt dein Suchprofil und findet dann passende Menschen in den echten Profilen. Sag z. B. „Guck dir mal den Max an“, um ein Profil zu öffnen."
      : isSimulation
        ? `Voya spielt ${candidate?.name ?? "die Kandidat:in"} in einem simulierten Erstgespräch – keine echten Aussagen der Person. Sag „Feedback“, um aus der Rolle zu treten.`
        : "Frag nach Menschen, Events oder wer zu dir passt – oder sag „Bereite ein Interview mit … vor“.";
  const assistantName = isSimulation && candidate ? firstName(candidate.name) : "Voya";

  const micLabel = connecting ? "Verbindung wird aufgebaut …" : connected ? "Gespräch beenden" : "Gespräch starten";

  return (
    <section
      className={cx(
        "rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] sm:p-5",
        className,
      )}
      aria-label="Voice-Agent Voya"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cx(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]",
              status === "speaking" && "animate-pulse",
            )}
            aria-hidden="true"
          >
            <MicIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">Mit Voya sprechen</h3>
              <Badge tone={isSimulation ? "warning" : "neutral"}>{modeLabel}</Badge>
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">{hint}</p>
          </div>
        </div>
        <Badge tone={statusTone} className="shrink-0">
          <span className={cx("inline-block h-1.5 w-1.5 rounded-full", statusDot)} aria-hidden="true" />
          {statusLabel}
        </Badge>
      </header>

      {error && (
        <div
          role="alert"
          className="mt-3 rounded-[var(--radius-sm)] border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger)]"
        >
          {error}
        </div>
      )}

      {/* Mikro-Button prominent + Steuerung */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => (connected ? stop() : void start())}
          disabled={connecting}
          aria-label={micLabel}
          aria-pressed={connected}
          className={cx(
            "relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-wait",
            connected
              ? "bg-[var(--danger)] text-white shadow-[var(--shadow-md)] hover:opacity-90"
              : "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-[var(--shadow-md)] hover:bg-[var(--accent-strong)]",
            connecting && "animate-pulse",
          )}
        >
          {status === "speaking" && (
            <span className="absolute inset-0 -m-1 animate-ping rounded-full border-2 border-[var(--accent)] opacity-40" aria-hidden="true" />
          )}
          {connected ? <StopIcon className="h-5 w-5" /> : <MicIcon className="h-6 w-6" />}
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--foreground)]">{micLabel}</p>
          <p className="text-xs text-[var(--muted)]">
            {connected ? "Du kannst Voya jederzeit unterbrechen." : "Der Browser fragt einmal nach dem Mikrofon."}
          </p>
        </div>

        {connected && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={toggleMute} aria-pressed={muted}>
              {muted ? "Mikro an" : "Stummschalten"}
            </Button>
            {status === "speaking" && (
              <Button variant="ghost" size="sm" onClick={interrupt}>
                Unterbrechen
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tool-Aktivität als Badges */}
      {(activeTool || recentTools.length > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-live="polite" aria-label="Aktivität des Agenten">
          {activeTool && (
            <Badge tone="accent" className="animate-pulse">
              {activeTool.label}
            </Badge>
          )}
          {recentTools.map((t) => (
            <Badge key={t.id} tone="neutral">
              ✓ {t.label}
            </Badge>
          ))}
        </div>
      )}

      {/* Transkript als Bubbles */}
      <div
        ref={listRef}
        className="mt-4 max-h-64 space-y-2 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] p-3"
        aria-live="polite"
        aria-label="Live-Transkript"
      >
        {transcript.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">
            {connected
              ? "Verbunden – Voya meldet sich gleich. Oder sprich einfach los."
              : `Noch kein Gespräch. Starte das Mikrofon – ${isSimulation ? `${assistantName} eröffnet die Simulation` : "Voya eröffnet mit einer Frage"}.`}
          </p>
        ) : (
          transcript.map((item) => (
            <div key={item.id} className={cx("flex", item.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cx(
                  "max-w-[85%] rounded-[var(--radius-sm)] px-3 py-2 text-sm leading-relaxed",
                  item.role === "user"
                    ? "rounded-br-sm bg-[var(--accent)] text-[var(--accent-contrast)]"
                    : "rounded-bl-sm border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]",
                  item.inProgress && "opacity-70",
                )}
              >
                <span className="block text-[10px] font-semibold uppercase tracking-wide opacity-70">
                  {item.role === "user" ? "Du" : assistantName}
                  {isSimulation && item.role === "assistant" ? " · Simulation" : ""}
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
            aria-label="Textnachricht an Voya"
          />
          <Button type="submit" variant="secondary" disabled={!textInput.trim()}>
            Senden
          </Button>
        </form>
      )}

      <p className="mt-3 text-[11px] text-[var(--muted)]">
        {isSimulation
          ? "Simulation auf Basis des Profils – keine echten Aussagen der Person. Voya kann sich irren."
          : "Voya kann sich irren. Prüfe wichtige Angaben im Profil – Verfügbarkeit und Gründungsinteresse klärt ihr im Gespräch."}
      </p>
    </section>
  );
}
