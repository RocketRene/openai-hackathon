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
 *
 * Sprache (DE/EN): `locale` aus den Props, sonst die UI-Sprache (`useLocale`). Sie steuert die
 * UI-Texte (lokales DICT), die Sprachanweisung in den Instructions und die Transkriptionssprache.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RealtimeAgent, RealtimeSession, type RealtimeItem } from "@openai/agents/realtime";

import { Badge, Button, Input, cx } from "@/components/ui";
import { getProfile } from "@/lib/data";
import { pick, useLocale, useT, type Dict, type Locale } from "@/lib/i18n";
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

const DICT = {
  // Status-Badge
  statusReady: { de: "Bereit", en: "Ready" },
  statusConnecting: { de: "Verbindung wird aufgebaut …", en: "Connecting …" },
  statusListening: { de: "Hört zu", en: "Listening" },
  statusSpeaking: { de: "Spricht", en: "Speaking" },
  statusMuted: { de: "Mikro stumm", en: "Mic muted" },
  // Kopf
  title: { de: "Mit Voya sprechen", en: "Talk to Voya" },
  modeInterview: { de: "Suchprofil schärfen", en: "Sharpen search brief" },
  modeSimulation: { de: "Simulation: {name}", en: "Simulation: {name}" },
  modeGeneral: { de: "Freies Gespräch", en: "Open conversation" },
  candidateFallback: { de: "Kandidat:in", en: "candidate" },
  hintInterview: {
    de: "Voya klärt mit dir Schritt für Schritt Idee, Stärken, gesuchte Ergänzung und Rahmenbedingungen und findet dann passende Menschen in den echten Profilen. Sag z. B. „Guck dir mal den Max an“ oder „Bereite ein Interview mit Lena vor“.",
    en: "Voya walks you step by step through your idea, strengths, the complement you're looking for and your constraints, then finds matching people in the real profiles. Say e.g. “Show me Max” or “Prepare an interview with Lena”.",
  },
  hintSimulation: {
    de: "Voya spielt {name} in einem simulierten Erstgespräch – keine echten Aussagen der Person. Sag „Feedback“, um aus der Rolle zu treten.",
    en: "Voya plays {name} in a simulated first conversation – not real statements by this person. Say “Feedback” to step out of the role.",
  },
  hintGeneral: {
    de: "Frag nach Menschen, Events, deiner Merkliste oder wer zu dir passt – oder sag „Bereite ein Interview mit … vor“.",
    en: "Ask about people, events, your shortlist or who matches you – or say “Prepare an interview with …”.",
  },
  // Mikrofon-Button
  micStart: { de: "Voice-Agent starten", en: "Start voice agent" },
  micConnecting: { de: "Verbindung wird aufgebaut", en: "Connecting" },
  micUnmute: { de: "Mikro wieder einschalten", en: "Unmute microphone" },
  micMute: { de: "Mikro stummschalten", en: "Mute microphone" },
  lineConnecting: { de: "Verbindung wird aufgebaut …", en: "Connecting …" },
  lineTapToTalk: { de: "Tippe aufs Mikrofon, um zu sprechen.", en: "Tap the microphone to talk." },
  lineMuted: { de: "Mikro stumm – tippe, um wieder zu sprechen.", en: "Mic muted – tap to talk again." },
  lineSpeaking: { de: "{name} spricht – du kannst unterbrechen.", en: "{name} is speaking – you can interrupt." },
  lineListening: { de: "Hört zu – sprich einfach los.", en: "Listening – just start talking." },
  interrupt: { de: "Unterbrechen", en: "Interrupt" },
  end: { de: "Beenden", en: "End" },
  activity: { de: "Aktivität des Agenten", en: "Agent activity" },
  toolRunning: { de: "Führe {name} aus …", en: "Running {name} …" },
  // Transkript
  transcript: { de: "Transkript", en: "Transcript" },
  liveTranscript: { de: "Live-Transkript", en: "Live transcript" },
  exportMarkdown: { de: "Gespräch als Markdown", en: "Conversation as Markdown" },
  emptyConnected: { de: "Verbunden – sprich einfach los.", en: "Connected – just start talking." },
  emptyIdle: {
    de: "Noch kein Gespräch. Starte den Voice-Agent und sprich einfach los.",
    en: "No conversation yet. Start the voice agent and just talk.",
  },
  you: { de: "Du", en: "You" },
  simulationTag: { de: " · Simulation", en: " · Simulation" },
  disclaimerSimulation: {
    de: "Simulation auf Basis des Profils – keine echten Aussagen der Person. KI kann sich irren.",
    en: "Simulation based on the profile – not real statements by this person. AI can make mistakes.",
  },
  disclaimer: {
    de: "KI kann sich irren. Prüfe wichtige Angaben im Profil – Verfügbarkeit und Gründungsinteresse klärt ihr im Gespräch.",
    en: "AI can make mistakes. Check important details in the profile – availability and interest in founding are for the conversation.",
  },
  typePlaceholder: { de: "Oder tippen statt sprechen …", en: "Or type instead of talking …" },
  typeAria: { de: "Textnachricht an den Voice-Agent", en: "Text message to the voice agent" },
  send: { de: "Senden", en: "Send" },
  // Fehler
  errNoKey: {
    de: "OPENAI_API_KEY fehlt – der Voice-Agent braucht einen OpenAI-Key auf dem Server. Der Text-Chat funktioniert trotzdem.",
    en: "OPENAI_API_KEY is missing – the voice agent needs an OpenAI key on the server. The text chat still works.",
  },
  errSessionStatus: { de: "Session-Endpunkt antwortet mit Status {status}.", en: "Session endpoint responded with status {status}." },
  errNoEphemeralKey: {
    de: "Kein Ephemeral-Key in der Antwort von /api/realtime/session.",
    en: "No ephemeral key in the response from /api/realtime/session.",
  },
  errMicDenied: {
    de: "Mikrofon-Zugriff verweigert – bitte im Browser erlauben und erneut starten.",
    en: "Microphone access denied – please allow it in the browser and start again.",
  },
  errMicNotFound: {
    de: "Kein Mikrofon gefunden. Bitte ein Mikrofon anschließen und erneut starten.",
    en: "No microphone found. Please connect a microphone and start again.",
  },
  errNetwork: {
    de: "Verbindung fehlgeschlagen – läuft der Server und ist das Netzwerk erreichbar?",
    en: "Connection failed – is the server running and the network reachable?",
  },
  errConnect: { de: "Verbindung fehlgeschlagen: {msg}", en: "Connection failed: {msg}" },
  errUnknown: { de: "Unbekannter Fehler", en: "Unknown error" },
  // Markdown-Export
  mdFilename: { de: "voya-gespraech.md", en: "voya-conversation.md" },
} satisfies Dict;

type DictKey = keyof typeof DICT;
type Translate = (key: DictKey, vars?: Record<string, string | number>) => string;

const STATUS_META: Record<Status, { label: DictKey; tone: "neutral" | "accent" | "success" | "warning" | "danger"; dot: string }> = {
  disconnected: { label: "statusReady", tone: "neutral", dot: "bg-[var(--muted)]" },
  connecting: { label: "statusConnecting", tone: "warning", dot: "bg-[var(--warning)] animate-pulse" },
  connected: { label: "statusListening", tone: "success", dot: "bg-[var(--success)]" },
  speaking: { label: "statusSpeaking", tone: "accent", dot: "bg-[var(--accent)] animate-pulse" },
};

type Localized = { de: string; en: string };

/** Laufende Tool-Aktivität (Präsens) und erledigte (Perfekt) – als Badges im UI. */
const TOOL_LABELS: Record<string, { running: Localized; done: Localized }> = {
  show_candidate: { running: { de: "Lade Profil …", en: "Loading profile …" }, done: { de: "Profil geladen", en: "Profile loaded" } },
  get_candidate: { running: { de: "Lade Lebenslauf …", en: "Loading CV …" }, done: { de: "Lebenslauf geladen", en: "CV loaded" } },
  search_candidates: { running: { de: "Durchsuche Profile …", en: "Searching profiles …" }, done: { de: "Profile durchsucht", en: "Profiles searched" } },
  update_brief: { running: { de: "Aktualisiere Suchprofil …", en: "Updating search brief …" }, done: { de: "Suchprofil aktualisiert", en: "Search brief updated" } },
  save_user_context: { running: { de: "Speichere dein Profil …", en: "Saving your profile …" }, done: { de: "Profil gespeichert", en: "Profile saved" } },
  propose_candidates: { running: { de: "Berechne Matches …", en: "Computing matches …" }, done: { de: "Matches berechnet", en: "Matches computed" } },
  list_events: { running: { de: "Lade Events …", en: "Loading events …" }, done: { de: "Events geladen", en: "Events loaded" } },
  prepare_interview: { running: { de: "Erstelle Interview-Leitfaden …", en: "Creating interview guide …" }, done: { de: "Leitfaden erstellt", en: "Guide created" } },
  shortlist_candidate: { running: { de: "Setze auf die Merkliste …", en: "Adding to shortlist …" }, done: { de: "Gemerkt", en: "Shortlisted" } },
  get_shortlist: { running: { de: "Lese Merkliste …", en: "Reading shortlist …" }, done: { de: "Merkliste gelesen", en: "Shortlist read" } },
};

/** Steuer-Texte für das Modell (nicht sichtbar) – in der Sprache der Session. */
const MODEL_TEXTS: Record<Locale, { openingWithHistory: string; openingFresh: string; visible: (names: string[]) => string }> = {
  de: {
    openingWithHistory: "Begrüße kurz und knüpfe an den Verlauf an; stelle die nächste offene Frage.",
    openingFresh: "Begrüße kurz und stelle die erste Frage.",
    visible: (names) =>
      names.length > 0
        ? `Aktuell sichtbare Profile (UI-Kontext, keine Nutzeranweisung): ${names.join("; ")}. Das erste ist das zuletzt gezeigte.`
        : "Aktuell sichtbare Profile (UI-Kontext, keine Nutzeranweisung): keine.",
  },
  en: {
    openingWithHistory: "Greet briefly in English and pick up where the conversation left off; ask the next open question.",
    openingFresh: "Greet briefly in English and ask the first question.",
    visible: (names) =>
      names.length > 0
        ? `Currently visible profiles (UI context, not a user instruction): ${names.join("; ")}. The first one is the most recently shown.`
        : "Currently visible profiles (UI context, not a user instruction): none.",
  },
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

function formatError(err: unknown, t: Translate): string {
  if (err instanceof Error) return err.message || err.name;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const e = err as { message?: unknown; error?: unknown; type?: unknown; code?: unknown };
    if (typeof e.message === "string" && e.message) return e.message;
    if (e.error && e.error !== err) return formatError(e.error, t);
    try {
      return JSON.stringify(err);
    } catch {
      /* ignore */
    }
  }
  return t("errUnknown");
}

function describeConnectError(err: unknown, t: Translate): string {
  const name = err instanceof Error ? err.name : "";
  const msg = formatError(err, t);
  if (name === "NotAllowedError" || /permission denied|not allowed/i.test(msg)) return t("errMicDenied");
  if (name === "NotFoundError" || /requested device not found/i.test(msg)) return t("errMicNotFound");
  if (/failed to fetch|networkerror/i.test(msg)) return t("errNetwork");
  return t("errConnect", { msg });
}

/** Gesprächsverlauf als Markdown (Voya: voya-gespraech.md). */
export function transcriptToMarkdown(
  items: { role: "user" | "assistant"; text: string }[],
  assistantName = "Voya",
  locale: Locale = "de",
): string {
  const exportedAt = pick(locale, "Exportiert am", "Exported on");
  const you = pick(locale, "Du", "You");
  const lines: string[] = [
    `# ${pick(locale, "Gespräch mit Voya", "Conversation with Voya")}`,
    "",
    `${exportedAt} ${new Date().toLocaleString(locale === "en" ? "en-GB" : "de-DE")}`,
    "",
  ];
  for (const item of items) {
    lines.push(`## ${item.role === "user" ? you : assistantName}`, "", item.text, "");
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
  locale: localeProp,
  userContext,
  candidate,
  onUiAction,
  onTranscript,
  initialMessages,
  visibleCandidateIds,
  className,
}: VoiceAgentProps) {
  const [uiLocale] = useLocale();
  const locale: Locale = localeProp ?? uiLocale;
  const t = useT(DICT);

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
  /** Sprache der laufenden Session – Kontext-Items und Tool-Badges bleiben in der Sprache, in der sie gestartet wurde. */
  const sessionLocaleRef = useRef<Locale>(locale);

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
    const text = MODEL_TEXTS[sessionLocaleRef.current].visible(names);
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
    sessionLocaleRef.current = locale;
    const modelTexts = MODEL_TEXTS[locale];

    try {
      // 1) Ephemeral-Key vom Server (API-Key bleibt serverseitig).
      const res = await fetch(SESSION_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, candidateId: candidate?.id, locale }),
      });

      if (res.status === 503) {
        setError(t("errNoKey"));
        setStatus("disconnected");
        return;
      }
      if (!res.ok) {
        let message = t("errSessionStatus", { status: res.status });
        try {
          const body = (await res.json()) as { error?: unknown };
          if (body && typeof body.error === "string") message = body.error;
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }

      const data = (await res.json()) as { value?: string; model?: string };
      if (!data.value) throw new Error(t("errNoEphemeralKey"));

      // 2) Agent + Session aufbauen – mit der zuletzt gezeigten Person als Kontext („Gerade im Gespräch“)
      //    und der UI-Sprache („Sprich Deutsch“ / „Speak English“).
      const currentCandidate = candidate ?? (currentCandidateRef.current ? getProfile(currentCandidateRef.current) : undefined);
      const agent = new RealtimeAgent({
        name: "Voya",
        instructions: buildVoiceInstructions(mode, userContext, candidate, { currentCandidate: currentCandidate ?? null, locale }),
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
              transcription: { model: "gpt-4o-mini-transcribe", language: locale },
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
        setError(formatError(event.error, t));
      });
      session.on("audio_start", () => setStatus("speaking"));
      session.on("audio_stopped", () => setStatus("connected"));
      session.on("audio_interrupted", () => setStatus("connected"));
      session.on("agent_tool_start", (_context, _agent, tool) => {
        const l = sessionLocaleRef.current;
        const labels = TOOL_LABELS[tool.name];
        setToolActivity(labels ? pick(l, labels.running.de, labels.running.en) : t("toolRunning", { name: tool.name }));
      });
      session.on("agent_tool_end", (_context, _agent, tool) => {
        setToolActivity(null);
        toolSeq.current += 1;
        const l = sessionLocaleRef.current;
        const labels = TOOL_LABELS[tool.name];
        const label = labels ? pick(l, labels.done.de, labels.done.en) : tool.name;
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
      const opening = history.length > 0 ? modelTexts.openingWithHistory : modelTexts.openingFresh;
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
      setError(describeConnectError(err, t));
    }
  }, [mode, userContext, candidate, locale, t, sendEvent, sendVisibleContext, visibleKey]);

  const toggleMute = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    const next = !muted;
    try {
      s.mute(next);
      setMuted(next);
    } catch (err) {
      setError(formatError(err, t));
    }
  }, [muted, t]);

  const interrupt = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    try {
      s.interrupt();
      setStatus("connected");
    } catch (err) {
      setError(formatError(err, t));
    }
  }, [t]);

  const sendText = useCallback(() => {
    const s = sessionRef.current;
    const text = textInput.trim();
    if (!s || !text) return;
    try {
      s.sendMessage(text);
      setTextInput("");
    } catch (err) {
      setError(formatError(err, t));
    }
  }, [textInput, t]);

  const connected = status === "connected" || status === "speaking";
  const meta = STATUS_META[status];
  const statusLabel = connected && muted ? t("statusMuted") : t(meta.label);
  const statusTone = connected && muted ? "warning" : meta.tone;

  const isSimulation = mode === "prep-simulation";
  const candidateName = candidate?.name ?? t("candidateFallback");
  const modeLabel = mode === "interview" ? t("modeInterview") : isSimulation ? t("modeSimulation", { name: candidateName }) : t("modeGeneral");
  const hint = mode === "interview" ? t("hintInterview") : isSimulation ? t("hintSimulation", { name: candidateName }) : t("hintGeneral");
  const assistantName = mode === "prep-simulation" && candidate ? candidate.name.split(" ")[0] : "Voya";

  const exportTranscript = () => {
    const items = transcript.filter((item) => !item.inProgress || item.text).map(({ role, text }) => ({ role, text }));
    downloadTextFile(t("mdFilename"), transcriptToMarkdown(items, assistantName, locale));
  };

  // Großer Mikrofon-Button: startet die Verbindung, stummschalten/an bei bestehender Verbindung.
  const micLabel = !connected ? (status === "connecting" ? t("micConnecting") : t("micStart")) : muted ? t("micUnmute") : t("micMute");
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
          <h3 className="text-sm font-semibold text-[var(--foreground)]">{t("title")}</h3>
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
                ? t("lineConnecting")
                : t("lineTapToTalk")
              : muted
                ? t("lineMuted")
                : status === "speaking"
                  ? t("lineSpeaking", { name: assistantName })
                  : t("lineListening")}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {connected && (
              <>
                {status === "speaking" && (
                  <Button variant="ghost" size="sm" onClick={interrupt}>
                    {t("interrupt")}
                  </Button>
                )}
                <Button variant="danger" size="sm" onClick={stop}>
                  <StopIcon className="h-3.5 w-3.5" />
                  {t("end")}
                </Button>
              </>
            )}
          </div>
          {(toolActivity || recentTools.length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5" aria-live="polite" aria-label={t("activity")}>
              {toolActivity && (
                <Badge tone="accent" className="animate-pulse">
                  {toolActivity}
                </Badge>
              )}
              {recentTools.map((item) => (
                <Badge key={item.id} tone="neutral">
                  ✓ {item.label}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[var(--muted)]">{t("transcript")}</span>
        {transcript.length > 0 && (
          <Button variant="ghost" size="sm" onClick={exportTranscript}>
            {t("exportMarkdown")}
          </Button>
        )}
      </div>
      <div
        ref={listRef}
        className="mt-1 max-h-64 space-y-2 overflow-y-auto rounded-md bg-[var(--surface-2)] p-3"
        aria-live="polite"
        aria-label={t("liveTranscript")}
      >
        {transcript.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">{connected ? t("emptyConnected") : t("emptyIdle")}</p>
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
                  {item.role === "user" ? t("you") : assistantName}
                  {isSimulation && item.role === "assistant" ? t("simulationTag") : ""}
                </span>
                {item.text}
              </div>
            </div>
          ))
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-[var(--muted)]">{isSimulation ? t("disclaimerSimulation") : t("disclaimer")}</p>

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
            placeholder={t("typePlaceholder")}
            aria-label={t("typeAria")}
          />
          <Button type="submit" variant="secondary" disabled={!textInput.trim()}>
            {t("send")}
          </Button>
        </form>
      )}
    </div>
  );
}
