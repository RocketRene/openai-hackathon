"use client";
/**
 * PLATZHALTER – wird vom Paket "voice-agent" durch die echte OpenAI-Realtime-Implementierung ersetzt.
 * Contract: default export, Props = VoiceAgentProps (src/lib/types.ts).
 */
import type { VoiceAgentProps } from "@/lib/types";

export default function VoiceAgent({ mode, className }: VoiceAgentProps) {
  return (
    <div className={className}>
      <div className="rounded-lg border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
        Voice-Agent ({mode}) wird geladen … (Platzhalter)
      </div>
    </div>
  );
}
