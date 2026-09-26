/**
 * POST /api/realtime/session – Ephemeral Client Secret für den Voice-Agent.
 * ---------------------------------------------------------------
 * Der echte OPENAI_API_KEY bleibt auf dem Server. Der Browser holt sich hier ein
 * kurzlebiges Client Secret (`ek_…`) und verbindet sich damit per WebRTC direkt
 * mit der OpenAI Realtime API. Nutzung im Frontend (VoiceAgent.tsx):
 *
 *   import { RealtimeAgent, RealtimeSession } from "@openai/agents/realtime";
 *   const res = await fetch("/api/realtime/session", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify({ mode: "interview", candidateId }),
 *   });
 *   if (!res.ok) { const { error } = await res.json(); … } // 503 = kein Key
 *   const { value, model } = await res.json();
 *   const session = new RealtimeSession(new RealtimeAgent({ name, instructions }), { model });
 *   await session.connect({ apiKey: value });
 *
 * Contract (docs/PARALLEL-WORK.md):
 *   Body  { mode?: AgentMode, candidateId?: string } – optional, tolerant geparst.
 *         Instructions/Tools setzt der Client selbst über RealtimeAgent; mode und
 *         candidateId werden hier nur validiert und fürs Server-Log genutzt.
 *   200   { value: string, expiresAt?: number, model: string }
 *         expiresAt = Ablauf des Secrets in Unix-SEKUNDEN (wie von OpenAI geliefert).
 *   503   { error } – OPENAI_API_KEY fehlt (Voice-Modus nicht verfügbar).
 *   502   { error } – OpenAI-API-Fehler (Fehlertext ohne Key-Leak).
 */

import OpenAI, { APIError } from "openai";
import type { AgentMode } from "@/lib/types";

export const runtime = "nodejs";

const DEFAULT_MODEL = "gpt-realtime";
const VOICE = "marin";
/** Gültigkeit des Client Secrets in Sekunden (erlaubt 10–7200, OpenAI-Default 600). */
const SECRET_TTL_SECONDS = 600;
/** Timeout für den Aufruf an OpenAI, damit die UI nicht hängt. */
const OPENAI_TIMEOUT_MS = 15_000;

const AGENT_MODES: readonly AgentMode[] = ["interview", "prep-simulation", "general"];

interface SessionRequestBody {
  mode?: AgentMode;
  candidateId?: string;
}

interface SessionResponse {
  value: string;
  expiresAt?: number;
  model: string;
}

/** Body ist optional; ungültiges JSON oder fremde Felder werden ignoriert. */
async function parseBody(request: Request): Promise<SessionRequestBody> {
  try {
    const raw: unknown = await request.json();
    if (!raw || typeof raw !== "object") return {};
    const { mode, candidateId } = raw as Record<string, unknown>;
    return {
      mode: AGENT_MODES.includes(mode as AgentMode) ? (mode as AgentMode) : undefined,
      candidateId:
        typeof candidateId === "string" && candidateId.trim() ? candidateId.trim() : undefined,
    };
  } catch {
    return {};
  }
}

/** Entfernt den API-Key (und alles, was wie einer aussieht) aus Fehlertexten. */
function redact(text: string, apiKey: string): string {
  return text
    .split(apiKey)
    .join("[redacted]")
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-[redacted]");
}

function describeError(err: unknown, apiKey: string): string {
  let message = "Unbekannter Fehler beim Erstellen der Realtime-Session";
  if (err instanceof APIError) {
    // err.message enthält den HTTP-Status bereits ("401 Incorrect API key …").
    message = `OpenAI Realtime API: ${err.message}`;
  } else if (err instanceof Error) {
    message = `OpenAI Realtime API nicht erreichbar: ${err.message}`;
  }
  return redact(message, apiKey);
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY fehlt – Voice-Modus nicht verfügbar" },
      { status: 503 },
    );
  }

  const model = process.env.OPENAI_REALTIME_MODEL?.trim() || DEFAULT_MODEL;
  const { mode = "general", candidateId } = await parseBody(request);

  try {
    const client = new OpenAI({ apiKey, timeout: OPENAI_TIMEOUT_MS, maxRetries: 1 });
    const secret = await client.realtime.clientSecrets.create({
      expires_after: { anchor: "created_at", seconds: SECRET_TTL_SECONDS },
      session: {
        type: "realtime",
        model,
        audio: { output: { voice: VOICE } },
      },
    });

    console.info("[realtime/session] Client Secret erstellt", {
      mode,
      candidateId: candidateId ?? null,
      model,
      expiresAt: secret.expires_at,
    });

    const payload: SessionResponse = {
      value: secret.value,
      expiresAt: secret.expires_at,
      model,
    };
    return Response.json(payload, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const error = describeError(err, apiKey);
    console.error("[realtime/session]", error);
    return Response.json({ error }, { status: 502 });
  }
}
