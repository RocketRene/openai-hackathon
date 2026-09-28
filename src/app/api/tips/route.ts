/**
 * POST /api/tips – Body { userContext, teamMemberIds?: string[], locale?: "de" | "en" } → Tip[]
 * ---------------------------------------------------------------
 * Mit OPENAI_API_KEY verfeinert das LLM (Responses API, Structured Outputs) die regelbasierten Tipps.
 * Ohne Key oder bei Fehlern kommt die Regel-Basis zurück. Antwortet immer 200 mit einem Array.
 * Header "X-Tips-Source": "llm" | "rules" verrät dem Client, welcher Pfad gelaufen ist.
 * `locale` steuert die Sprache der Regel-Texte und der LLM-Ausgabe (Default "de").
 */
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getProfile } from "@/lib/data";
import {
  TIPS_JSON_SCHEMA,
  combineDims,
  generateTips,
  normalizeTipLocale,
  normalizeTips,
  normalizeUserContext,
  tipsSystemPrompt,
  tipsUserPrompt,
} from "@/lib/tips";
import type { FounderDims, Profile, Tip } from "@/lib/types";

const DEFAULT_MODEL = "gpt-5-mini";

type TipsSource = "llm" | "rules";

function respond(tips: Tip[], source: TipsSource) {
  return NextResponse.json(tips, { headers: { "X-Tips-Source": source, "Cache-Control": "no-store" } });
}

/** Reasoning-Modelle akzeptieren `reasoning.effort` (schneller mit "low"); klassische Modelle lehnen den Parameter ab. */
function isReasoningModel(model: string) {
  return /^(gpt-5|o\d)/i.test(model);
}

export async function POST(req: Request) {
  let body: { userContext?: unknown; teamMemberIds?: unknown; locale?: unknown } = {};
  try {
    const parsed: unknown = await req.json();
    if (parsed && typeof parsed === "object") body = parsed as typeof body;
  } catch {
    body = {};
  }

  const locale = normalizeTipLocale(body.locale);
  const user = normalizeUserContext(body.userContext);
  const teamMemberIds = Array.isArray(body.teamMemberIds)
    ? body.teamMemberIds.filter((id): id is string => typeof id === "string")
    : [];
  const members = teamMemberIds.map((id) => getProfile(id)).filter((p): p is Profile => Boolean(p));
  const teamDims: FounderDims | undefined = members.length
    ? combineDims([user.dims, ...members.map((m) => m.dims)])
    : undefined;
  const baseTips = generateTips(user, { teamDims, locale });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return respond(baseTips, "rules");

  try {
    const model = process.env.OPENAI_TEXT_MODEL ?? DEFAULT_MODEL;
    const client = new OpenAI({ apiKey, timeout: 45_000, maxRetries: 1 });
    const response = await client.responses.create({
      model,
      instructions: tipsSystemPrompt(locale),
      input: tipsUserPrompt(user, { teamDims, baseTips, locale }),
      ...(isReasoningModel(model) ? { reasoning: { effort: "low" as const } } : {}),
      text: {
        format: { type: "json_schema", name: "founder_tips", schema: TIPS_JSON_SCHEMA, strict: true },
      },
    });
    const parsed: unknown = JSON.parse(response.output_text || "{}");
    const tips = normalizeTips(parsed, baseTips);
    if (tips.length === 0) return respond(baseTips, "rules");
    return respond(tips, "llm");
  } catch (err) {
    console.error("[api/tips] LLM-Verfeinerung fehlgeschlagen, Fallback auf Regeln:", err);
    return respond(baseTips, "rules");
  }
}
