/**
 * Server-seitiger Text-Agent (das "Gehirn") auf Basis des OpenAI Agents SDK.
 * ---------------------------------------------------------------
 * - Ohne OPENAI_API_KEY → regelbasierter Fallback (runFallbackChat).
 * - Mit Key: Voya-Agent mit modusabhängigen, zweisprachigen Instructions (req.locale) + Tools;
 *   UI-Aktionen und Kontext-Patches werden pro Request gesammelt und als ChatResponse zurückgegeben.
 * - Jeder Fehler des LLM-Pfads fällt auf den Fallback zurück (kein 500 im Demo).
 */
import { Agent, assistant, gpt5ReasoningSettingsRequired, run, system, user, type AgentInputItem, type ModelSettings } from "@openai/agents";

import { getProfile } from "@/lib/data";
import type { ChatMessage, ChatRequest, ChatResponse, UiAction, UserContext } from "@/lib/types";
import { runFallbackChat } from "./fallback-interviewer";
import { type AgentLocale, buildInstructions, normalizeAgentLocale } from "./prompts";
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

const SYNTHETIC_OPENER: Record<AgentLocale, Record<"prep-simulation" | "default", string>> = {
  de: {
    "prep-simulation": "(Das Gespräch beginnt. Eröffne es kurz in deiner Rolle und stelle deine erste Frage.)",
    default: "(Der Nutzer hat den Chat gerade geöffnet. Begrüße kurz und stelle deine erste Frage.)",
  },
  en: {
    "prep-simulation": "(The conversation starts. Open it briefly in your role and ask your first question.)",
    default: "(The user has just opened the chat. Greet briefly and ask your first question.)",
  },
};

const TEXTS: Record<AgentLocale, { silent: string; degraded: string }> = {
  de: {
    silent: "Ich habe das im Hintergrund erledigt – schau ins Panel. Wie soll es weitergehen?",
    degraded: "(Hinweis: KI-Modell gerade nicht erreichbar, ich antworte im Regel-Modus.)",
  },
  en: {
    silent: "Done in the background – have a look at the panel. How should we continue?",
    degraded: "(Note: the AI model is currently unreachable, I'm answering in rule-based mode.)",
  },
};

/** Chat-Historie → AgentInputItems (letzte HISTORY_LIMIT Nachrichten, leere überspringen). */
export function toInputItems(messages: ChatMessage[], mode: ChatRequest["mode"], locale: AgentLocale = "de"): AgentInputItem[] {
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
    const openers = SYNTHETIC_OPENER[normalizeAgentLocale(locale)];
    items.push(user(mode === "prep-simulation" ? openers["prep-simulation"] : openers.default));
  }
  return items;
}

export async function runChat(req: ChatRequest): Promise<ChatResponse> {
  if (!isLlmConfigured()) return runFallbackChat(req);

  const locale = normalizeAgentLocale(req.locale);
  const uiActions: UiAction[] = [];
  let patch: Partial<UserContext> = {};
  const base: UserContext | null = req.userContext ?? null;

  const ctx: ToolContext = {
    emit: (a) => uiActions.push(a),
    getUserContext: () => withPatch(base, patch),
    setUserContext: (p) => {
      patch = { ...patch, ...p };
    },
    locale,
  };

  const candidate = req.mode === "prep-simulation" && req.candidateId ? getProfile(req.candidateId) : undefined;
  const model = resolveModel();

  try {
    const agent = new Agent({
      name: "Voya",
      instructions: buildInstructions(req.mode, base, candidate, locale),
      // In der Simulation bleibt die Person in der Rolle – keine Tools nötig.
      tools: req.mode === "prep-simulation" && candidate ? [] : createAgentTools(ctx),
      model,
      modelSettings: modelSettingsFor(model),
    });

    const result = await run(agent, toInputItems(req.messages ?? [], req.mode, locale), { maxTurns: MAX_TURNS });
    const reply = typeof result.finalOutput === "string" ? result.finalOutput.trim() : "";

    return {
      reply: reply || TEXTS[locale].silent,
      uiActions,
      userContextPatch: Object.keys(patch).length > 0 ? patch : undefined,
    };
  } catch (err) {
    console.error("[agent-core] LLM-Lauf fehlgeschlagen, Fallback aktiv:", err instanceof Error ? err.message : err);
    const fallback = runFallbackChat(req);
    return {
      ...fallback,
      reply: `${TEXTS[locale].degraded} ${fallback.reply}`,
    };
  }
}
