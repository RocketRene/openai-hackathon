"use client";
/**
 * Voice-Agent (OpenAI Realtime über WebRTC) – Paket "voice-agent".
 * ---------------------------------------------------------------
 * Contract: default export, Props = VoiceAgentProps (src/lib/types.ts).
 * Ablauf: POST /api/realtime/session → Ephemeral-Key → RealtimeSession.connect()
 * (Browser fragt nach Mikrofon-Berechtigung). Tool-Calls des Agenten landen
 * als UiAction bei `onUiAction`, das Live-Transkript bei `onTranscript`.
 *
 * Aus Voya übernommen (web/src/useVoice.ts):
 * - Beim Verbinden werden die letzten Text-Chat-Nachrichten (`initialMessages`) als
 *   conversation.item.create in die Session geschoben; die erste Antwort knüpft daran an.
 * - Ändern sich die sichtbaren Profile (`visibleCandidateIds`), bekommt der Agent ein
 *   System-Item „Aktuell sichtbare Profile (UI-Kontext, keine Nutzeranweisung)“.
 * - Zustände „Verbindung wird aufgebaut …“, „Hört zu“, „Spricht“, „Mikro stumm“; großer
 *   Mikrofon-Button; Gespräch als Markdown exportieren.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RealtimeAgent, RealtimeSession, type RealtimeItem } from "@openai/agents/realtime";

import { Badge, Button, Input, cx } from "@/components/ui";
import { getProfile } from "@/lib/data";
import type { ChatMessage, VoiceAgentProps } from "@/lib/types";
import { downloadTextFile } from "./InterviewGuideCard";
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
  disconnected: { label: "Bereit", tone: "neutral", dot: "bg-[var(--muted)]" },
  connecting: { label: "Verbindung wird aufgebaut …", tone: "warning", dot: "bg-[var(--warning)] animate-pulse" },
  connected: { label: "Hört zu", tone: "success", dot: "bg-[var(--success)]" },
  speaking: { label: "Spricht", tone: "accent", dot: "bg-[var(--accent)] animate-pulse" },
};

/** Laufende Tool-Aktivität (Präsens) und erledigte (Perfekt) – als Badges im UI. */
const TOOL_LABELS: Record<string, { running: string; done: string }> = {
  show_candidate: { running: "Lade Profil …", done: "Profil geladen" },
  get_candidate: { running: "Lade Lebenslauf …", done: "Lebenslauf geladen" },
  search_candidates: { running: "Durchsuche Profile …", done: "Profile durchsucht" },
  update_brief: { running: "Aktualisiere Suchprofil …", done: "Suchprofil aktualisiert" },
  save_user_context: { running: "Speichere dein Profil …", done: "Profil gespeichert" },
  propose_candidates: { running: "Berechne Matches …", done: "Matches berechnet" },
  list_events: { running: "Lade Events …", done: "Events geladen" },
  prepare_interview: { running: "Erstelle Interview-Leitfaden …", done: "Leitfaden erstellt" },
  shortlist_candidate: { running: "Setze auf die Merkliste …", done: "Gemerkt" },
  get_shortlist: { running: "Lese Merkliste …", done: "Merkliste gelesen" },
};

const SESSION_ENDPOINT = "/api/realtime/session";
/** Wie viele Nachrichten aus dem Text-Chat in die Voice-Session übernommen werden (Voya: 20). */
const HISTORY_LIMIT = 20;
const HISTORY_ITEM_PREFIX = "ctx_";

let itemCounter = 0;
function nextItemId(): string {
  itemCounter += 1;
  return `${HISTORY_ITEM_PREFIX}${Date.now().toString(36)}_${itemCounter}`;
}

/** Nur Nachrichten (user/assistant) aus der Realtime-History; Text bzw. Audio-Transkript extrahieren. */
function extractTranscript(history: RealtimeItem[], skipIds: Set<string>): TranscriptItem[] {
  const out: TranscriptItem[] = [];
  for (const item of history) {
    if (item.type !== "message" || item.role === "system") continue;
    if (skipIds.has(item.itemId)) continue;
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

/** Gesprächsverlauf als Markdown (Voya: voya-gespraech.md). */
export function transcriptToMarkdown(items: { role: "user" | "assistant"; text: string }[], assistantName = "Voya"): string {
  const lines: string[] = ["# Gespräch mit Voya", "", `Exportiert am ${new Date().toLocaleString("de-DE")}`, ""];
  for (const item of items) {
    lines.push(`## ${item.role === "user" ? "Du" : assistantName}`, "", item.text, "");
  }
  return lines.join("\n");
}

function MicIcon({ muted, className }: { muted?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
      <path d="M8 21h8" />
      {muted && <path d="M4 4l16 16" />}
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
  const [toolActivity, setToolActivity] = useState<string | null>(null);
  const [recentTools, setRecentTools] = useState<{ id: number; label: string }[]>([]);
  const [textInput, setTextInput] = useState("");

  const sessionRef = useRef<RealtimeSession | null>(null);
  const onUiActionRef = useRef(onUiAction);
  const onTranscriptRef = useRef(onTranscript);
  const initialMessagesRef = useRef<ChatMessage[] | undefined>(initialMessages);
  const lastTranscriptJson = useRef("");
  const injectedItemIds = useRef<Set<string>>(new Set());
  const lastVisibleKey = useRef<string>("");
  /** Zuletzt gezeigte Person („Gerade im Gespräch“) – für „diese Person“ und prepare_interview ohne ID. */
  const currentCandidateRef = useRef<string | undefined>(candidate?.id ?? visibleCandidateIds?.[0]);
  const toolSeq = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Immer die aktuellsten Callbacks/Props benutzen, ohne die Session neu aufzubauen.
  useEffect(() => {
    onUiActionRef.current = onUiAction;
    onTranscriptRef.current = onTranscript;
    initialMessagesRef.current = initialMessages;
  }, [onUiAction, onTranscript, initialMessages]);

  useEffect(() => {
    const first = candidate?.id ?? visibleCandidateIds?.[0];
    if (first) currentCandidateRef.current = first;
  }, [candidate?.id, visibleCandidateIds]);

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

  /** Rohes Client-Event an die Session; false, wenn keine Verbindung besteht. */
  const sendEvent = useCallback((event: { type: string; [key: string]: unknown }): boolean => {
    const s = sessionRef.current;
    if (!s) return false;
    try {
      s.transport.sendEvent(event);
      return true;
    } catch {
      return false;
    }
  }, []);

  /** System-Item „Aktuell sichtbare Profile“ (Voya sendCandidateContext) – Kontext, keine Anweisung. */
  const visibleKey = useMemo(() => (visibleCandidateIds ?? []).join(","), [visibleCandidateIds]);
  const sendVisibleContext = useCallback(() => {
    const ids = visibleKey ? visibleKey.split(",") : [];
    const names = ids.map((id) => {
      const p = getProfile(id);
      return p ? `${p.name} (${p.id})` : id;
    });
    const text =
      names.length > 0
        ? `Aktuell sichtbare Profile (UI-Kontext, keine Nutzeranweisung): ${names.join("; ")}. Das erste ist das zuletzt gezeigte.`
        : "Aktuell sichtbare Profile (UI-Kontext, keine Nutzeranweisung): keine.";
    const id = nextItemId();
    injectedItemIds.current.add(id);
    return sendEvent({
      type: "conversation.item.create",
      item: { id, type: "message", role: "system", content: [{ type: "input_text", text }] },
    });
  }, [visibleKey, sendEvent]);

  useEffect(() => {
    if (!sessionRef.current) return;
    if (visibleKey === lastVisibleKey.current) return;
    if (sendVisibleContext()) lastVisibleKey.current = visibleKey;
  }, [visibleKey, sendVisibleContext]);

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
    // Leeres Transkript = „Session beendet“ für den gemeinsamen Verlauf (AssistantWorkspace).
    lastTranscriptJson.current = "";
    onTranscriptRef.current?.([]);
  }, []);

  const start = useCallback(async () => {
    if (sessionRef.current) return;
    setError(null);
    setToolActivity(null);
    setStatus("connecting");
    setRecentTools([]);
    lastTranscriptJson.current = "";
    onTranscriptRef.current?.([]);

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

      // 2) Agent + Session aufbauen – mit der zuletzt gezeigten Person als Kontext („Gerade im Gespräch“).
      const currentCandidate = candidate ?? (currentCandidateRef.current ? getProfile(currentCandidateRef.current) : undefined);
      const agent = new RealtimeAgent({
        name: "Voya",
        instructions: buildVoiceInstructions(mode, userContext, candidate, { currentCandidate: currentCandidate ?? null }),
        tools: createVoiceTools({
          emit: (action) => {
            if (action.type === "show_candidate" || action.type === "show_interview_guide") {
              currentCandidateRef.current = action.profileId;
            } else if (action.type === "show_candidates" && action.profileIds[0]) {
              currentCandidateRef.current = action.profileIds[0];
            }
            onUiActionRef.current(action);
          },
          getCurrentCandidateId: () => currentCandidateRef.current,
        }),
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

      injectedItemIds.current = new Set();
      setTranscript([]);

      session.on("history_updated", (history) => {
        const items = extractTranscript(history, injectedItemIds.current);
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
        setToolActivity(TOOL_LABELS[tool.name]?.running ?? `Führe ${tool.name} aus …`);
      });
      session.on("agent_tool_end", (_context, _agent, tool) => {
        setToolActivity(null);
        toolSeq.current += 1;
        const label = TOOL_LABELS[tool.name]?.done ?? tool.name;
        setRecentTools((prev) => [{ id: toolSeq.current, label }, ...prev].slice(0, 3));
      });

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

      // 4) Verlauf und UI-Kontext in die Session schieben (Voya useVoice: dc.onopen).
      const history = (initialMessagesRef.current ?? [])
        .filter((m) => (m.role === "user" || m.role === "assistant") && m.content.trim())
        .slice(-HISTORY_LIMIT);
      for (const m of history) {
        const id = nextItemId();
        injectedItemIds.current.add(id);
        sendEvent({
          type: "conversation.item.create",
          item: {
            id,
            type: "message",
            role: m.role,
            content: [{ type: m.role === "user" ? "input_text" : "output_text", text: m.content }],
          },
        });
      }
      if (sendVisibleContext()) lastVisibleKey.current = visibleKey;

      // 5) Der Agent eröffnet das Gespräch – mit Bezug auf den Verlauf, wenn es einen gibt.
      const opening =
        history.length > 0
          ? "Begrüße kurz und knüpfe an den Verlauf an; stelle die nächste offene Frage."
          : "Begrüße kurz und stelle die erste Frage.";
      sendEvent({ type: "response.create", response: { instructions: opening } });
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
  }, [mode, userContext, candidate, sendEvent, sendVisibleContext, visibleKey]);

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
  const statusLabel = connected && muted ? "Mikro stumm" : meta.label;
  const statusTone = connected && muted ? "warning" : meta.tone;

  const isSimulation = mode === "prep-simulation";
  const modeLabel =
    mode === "interview" ? "Suchprofil schärfen" : isSimulation ? `Simulation: ${candidate?.name ?? "Kandidat:in"}` : "Freies Gespräch";
  const hint =
    mode === "interview"
      ? "Voya klärt mit dir Schritt für Schritt Idee, Stärken, gesuchte Ergänzung und Rahmenbedingungen und findet dann passende Menschen in den echten Profilen. Sag z. B. „Guck dir mal den Max an“ oder „Bereite ein Interview mit Lena vor“."
      : isSimulation
        ? `Voya spielt ${candidate?.name ?? "die Kandidat:in"} in einem simulierten Erstgespräch – keine echten Aussagen der Person. Sag „Feedback“, um aus der Rolle zu treten.`
        : "Frag nach Menschen, Events, deiner Merkliste oder wer zu dir passt – oder sag „Bereite ein Interview mit … vor“.";
  const assistantName = mode === "prep-simulation" && candidate ? candidate.name.split(" ")[0] : "Voya";

  const exportTranscript = () => {
    const items = transcript.filter((t) => !t.inProgress || t.text).map(({ role, text }) => ({ role, text }));
    downloadTextFile("voya-gespraech.md", transcriptToMarkdown(items, assistantName));
  };

  // Großer Mikrofon-Button: startet die Verbindung, stummschalten/an bei bestehender Verbindung.
  const micLabel = !connected
    ? status === "connecting"
      ? "Verbindung wird aufgebaut"
      : "Voice-Agent starten"
    : muted
      ? "Mikro wieder einschalten"
      : "Mikro stummschalten";
  const onMicClick = () => {
    if (status === "connecting") return;
    if (!connected) void start();
    else toggleMute();
  };

  return (
    <div className={cx("rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4", className)}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cx("inline-block h-2.5 w-2.5 rounded-full", meta.dot)} aria-hidden="true" />
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Mit Voya sprechen</h3>
          <Badge tone={isSimulation ? "warning" : "neutral"}>{modeLabel}</Badge>
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

      {/* Mikrofon-Button (Voya) + sekundäre Aktionen */}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="relative flex h-20 w-20 items-center justify-center">
          {status === "speaking" && (
            <span
              className="absolute inset-0 animate-ping rounded-full bg-[var(--accent)] opacity-25"
              aria-hidden="true"
            />
          )}
          {status === "connected" && !muted && (
            <span className="absolute inset-0 rounded-full ring-4 ring-[var(--success-soft)]" aria-hidden="true" />
          )}
          <button
            type="button"
            onClick={onMicClick}
            disabled={status === "connecting"}
            aria-label={micLabel}
            aria-pressed={connected ? muted : undefined}
            title={micLabel}
            className={cx(
              "relative flex h-16 w-16 items-center justify-center rounded-full shadow-[var(--shadow-sm)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-wait",
              !connected && "bg-[var(--accent)] text-[var(--accent-contrast)] hover:bg-[var(--accent-strong)]",
              status === "connecting" && "animate-pulse",
              connected && !muted && "bg-[var(--success)] text-white",
              connected && muted && "bg-[var(--warning)] text-white",
            )}
          >
            <MicIcon muted={connected && muted} className="h-7 w-7" />
          </button>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-sm font-medium text-[var(--foreground)]">
            {!connected
              ? status === "connecting"
                ? "Verbindung wird aufgebaut …"
                : "Tippe aufs Mikrofon, um zu sprechen."
              : muted
                ? "Mikro stumm – tippe, um wieder zu sprechen."
                : status === "speaking"
                  ? `${assistantName} spricht – du kannst unterbrechen.`
                  : "Hört zu – sprich einfach los."}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {connected && (
              <>
                {status === "speaking" && (
                  <Button variant="ghost" size="sm" onClick={interrupt}>
                    Unterbrechen
                  </Button>
                )}
                <Button variant="danger" size="sm" onClick={stop}>
                  <StopIcon className="h-3.5 w-3.5" />
                  Beenden
                </Button>
              </>
            )}
          </div>
          {(toolActivity || recentTools.length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5" aria-live="polite" aria-label="Aktivität des Agenten">
              {toolActivity && (
                <Badge tone="accent" className="animate-pulse">
                  {toolActivity}
                </Badge>
              )}
              {recentTools.map((t) => (
                <Badge key={t.id} tone="neutral">
                  ✓ {t.label}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[var(--muted)]">Transkript</span>
        {transcript.length > 0 && (
          <Button variant="ghost" size="sm" onClick={exportTranscript}>
            Gespräch als Markdown
          </Button>
        )}
      </div>
      <div
        ref={listRef}
        className="mt-1 max-h-64 space-y-2 overflow-y-auto rounded-md bg-[var(--surface-2)] p-3"
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
                  {isSimulation && item.role === "assistant" ? " · Simulation" : ""}
                </span>
                {item.text}
              </div>
            </div>
          ))
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-[var(--muted)]">
        {isSimulation
          ? "Simulation auf Basis des Profils – keine echten Aussagen der Person. KI kann sich irren."
          : "KI kann sich irren. Prüfe wichtige Angaben im Profil – Verfügbarkeit und Gründungsinteresse klärt ihr im Gespräch."}
      </p>

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
