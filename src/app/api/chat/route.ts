/**
 * POST /api/chat – Body `ChatRequest` → `ChatResponse` (Contract: docs/PARALLEL-WORK.md).
 * Ohne OPENAI_API_KEY antwortet der regelbasierte Fallback (kein 500).
 * `locale` ("de" | "en", Default "de") bestimmt die Antwortsprache des Agenten.
 */
import { NextResponse } from "next/server";
import { z } from "zod";

import { runFallbackChat } from "@/lib/agent/fallback-interviewer";
import { runChat } from "@/lib/agent/server-agent";
import type { ChatRequest, ChatResponse, UserContext } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    }),
  ),
  mode: z.enum(["interview", "prep-simulation", "general"]).default("interview"),
  userContext: z.record(z.string(), z.unknown()).nullable().optional(),
  candidateId: z.string().optional(),
  locale: z.enum(["de", "en"]).optional(),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON im Request-Body." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Ungültiger Body: erwartet { messages: ChatMessage[], mode: AgentMode, userContext?, candidateId?, locale? }.",
        issues: parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
      },
      { status: 400 },
    );
  }

  const req: ChatRequest = {
    messages: parsed.data.messages,
    mode: parsed.data.mode,
    userContext: (parsed.data.userContext as unknown as UserContext | null | undefined) ?? null,
    candidateId: parsed.data.candidateId,
    locale: parsed.data.locale ?? "de",
  };

  try {
    const res: ChatResponse = await runChat(req);
    return NextResponse.json(res);
  } catch (err) {
    console.error("[api/chat] runChat fehlgeschlagen:", err);
    try {
      return NextResponse.json(runFallbackChat(req));
    } catch (inner) {
      console.error("[api/chat] Fallback fehlgeschlagen:", inner);
      return NextResponse.json({ error: "Chat fehlgeschlagen." }, { status: 500 });
    }
  }
}
