/**
 * Server-seitiger Text-Agent (das "Gehirn") auf Basis des OpenAI Agents SDK.
 * ---------------------------------------------------------------
 * - Ohne OPENAI_API_KEY → regelbasierter Fallback (runFallbackChat).
 * - Mit Key: Agent mit modusabhängigen Instructions + Tools; UI-Aktionen und
 *   Kontext-Patches werden pro Request gesammelt und als ChatResponse zurückgegeben.
 * - Jeder Fehler des LLM-Pfads fällt auf den Fallback zurück (kein 500 im Demo).
 */
import { Agent, assistant, gpt5ReasoningSettingsRequired, run, system, user, type AgentInputItem, type ModelSettings } from "@openai/agents";

import { getProfile } from "@/lib/data";
import type { ChatMessage, ChatRequest, ChatResponse, UiAction, UserContext } from "@/lib/types";
import { runFallbackChat } from "./fallback-interviewer";
import { buildInstructions } from "./prompts";
import { createAgentTools, withPatch, type ToolContext } from "./tools";

const HISTORY_LIMIT = 20;
const MAX_TURNS = 8;

export const DEFAULT_TEXT_MODEL = "gpt-5-mini";

export function isLlmConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function resolveModel(): string {
  return process.env.OPENAI_TEXT_MODEL?.trim() || DEFAULT_TEXT_MODEL;
}

function modelSettingsFor(model: string): ModelSettings {
  // Reasoning-Modelle (gpt-5*) auf niedrige Effort stellen: schneller, günstiger, für Chat ausreichend.
  return gpt5ReasoningSettingsRequired(model) ? { reasoning: { effort: "low" } } : {};
}

/** Chat-Historie → AgentInputItems (letzte HISTORY_LIMIT Nachrichten, leere überspringen). */
export function toInputItems(messages: ChatMessage[], mode: ChatRequest["mode"]): AgentInputItem[] {
  const items: AgentInputItem[] = [];
  for (const m of messages.slice(-HISTORY_LIMIT)) {
    const content = (m.content ?? "").trim();
    if (!content) continue;
    if (m.role === "user") items.push(user(content));
    else if (m.role === "assistant") items.push(assistant(content));
    else items.push(system(content));
  }
  const hasUser = items.some((i) => "role" in i && i.role === "user");
  if (!hasUser) {
    // Responses API braucht Input; das Gespräch startet auf Nutzerseite noch ohne Text.
    items.push(
      user(
        mode === "prep-simulation"
          ? "(Das Gespräch beginnt. Eröffne es kurz in deiner Rolle und stelle deine erste Frage.)"
          : "(Der Nutzer hat den Chat gerade geöffnet. Begrüße kurz und stelle deine erste Frage.)",
      ),
    );
  }
  return items;
}

export async function runChat(req: ChatRequest): Promise<ChatResponse> {
  if (!isLlmConfigured()) return runFallbackChat(req);

  const uiActions: UiAction[] = [];
  let patch: Partial<UserContext> = {};
  const base: UserContext | null = req.userContext ?? null;

  const ctx: ToolContext = {
    emit: (a) => uiActions.push(a),
    getUserContext: () => withPatch(base, patch),
    setUserContext: (p) => {
      patch = { ...patch, ...p };
    },
  };

  const candidate = req.mode === "prep-simulation" && req.candidateId ? getProfile(req.candidateId) : undefined;
  const model = resolveModel();

  try {
    const agent = new Agent({
      name: "FounderRadar",
      instructions: buildInstructions(req.mode, base, candidate),
      // In der Simulation bleibt die Person in der Rolle – keine Tools nötig.
      tools: req.mode === "prep-simulation" && candidate ? [] : createAgentTools(ctx),
      model,
      modelSettings: modelSettingsFor(model),
    });

    const result = await run(agent, toInputItems(req.messages ?? [], req.mode), { maxTurns: MAX_TURNS });
    const reply = typeof result.finalOutput === "string" ? result.finalOutput.trim() : "";

    return {
      reply: reply || "Ich habe das im Hintergrund erledigt – schau ins Panel. Wie soll es weitergehen?",
      uiActions,
      userContextPatch: Object.keys(patch).length > 0 ? patch : undefined,
    };
  } catch (err) {
    console.error("[agent-core] LLM-Lauf fehlgeschlagen, Fallback aktiv:", err instanceof Error ? err.message : err);
    const fallback = runFallbackChat(req);
    return {
      ...fallback,
      reply: `(Hinweis: KI-Modell gerade nicht erreichbar, ich antworte im Regel-Modus.) ${fallback.reply}`,
    };
  }
}
