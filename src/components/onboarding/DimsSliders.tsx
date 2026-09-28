"use client";
/**
 * Fünf Range-Slider (0–10) für die Selbsteinschätzung auf den Team-Radar-Dimensionen
 * (Vision · Design/Visuell · Technik · Detail · Umsetzung).
 * Rein kontrolliert: `value` rein, `onChange` liefert das komplette FounderDims-Objekt zurück.
 * Optik: eigene gefüllte Spur (nur Tokens), Wert-Pill mit Einordnung, Hilfetext je Dimension.
 */
import { FOUNDER_DIM_KEYS, FOUNDER_DIM_LABELS, type FounderDimKey, type FounderDims } from "@/lib/types";
import { cx } from "@/components/ui";

const DIM_HELP: Record<FounderDimKey, string> = {
  vision: "Große Linien, Strategie, Marktgespür: Wohin soll das Ganze?",
  design: "Visuelles Denken, UX-Gefühl, Sinn für Marke und Form.",
  tech: "Bauen, Architektur, Daten, technische Machbarkeit.",
  detail: "Genauigkeit, Zahlen, Prozesse, saubere Arbeit im Kleinen.",
  execution: "Dinge ins Rollen bringen, Deadlines halten, liefern.",
};

function describe(v: number): string {
  if (v <= 2) return "kaum";
  if (v <= 4) return "Grundlagen";
  if (v <= 6) return "solide";
  if (v <= 8) return "stark";
  return "Kernstärke";
}

/** Nativer Range-Input, entkleidet: die eigene Spur liegt darunter, nur der Daumen bleibt sichtbar. */
const RANGE_CLASS = cx(
  "relative z-10 h-5 w-full cursor-pointer appearance-none rounded-full bg-transparent outline-none",
  "focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  "[&::-webkit-slider-runnable-track]:bg-transparent",
  "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none",
  "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--accent)]",
  "[&::-webkit-slider-thumb]:bg-[var(--surface)] [&::-webkit-slider-thumb]:shadow-[var(--shadow-sm)]",
  "[&::-moz-range-track]:bg-transparent",
  "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full",
  "[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[var(--accent)] [&::-moz-range-thumb]:bg-[var(--surface)]",
);

export interface DimsSlidersProps {
  value: FounderDims;
  onChange: (d: FounderDims) => void;
  /** Kompakte Darstellung ohne Hilfetexte (z. B. in Sidebars). */
  compact?: boolean;
}

export default function DimsSliders({ value, onChange, compact = false }: DimsSlidersProps) {
  return (
    <div className={compact ? "space-y-3" : "space-y-6"}>
      {FOUNDER_DIM_KEYS.map((key) => {
        const id = `dim-${key}`;
        const v = value[key];
        const pct = Math.max(0, Math.min(100, v * 10));
        return (
          <div key={key} className="min-w-0">
            <div className="mb-1.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <label htmlFor={id} className="block text-sm font-medium text-[var(--foreground)]">
                  {FOUNDER_DIM_LABELS[key]}
                </label>
                {!compact && <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">{DIM_HELP[key]}</p>}
              </div>
              <output
                htmlFor={id}
                aria-live="off"
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--accent)]"
              >
                <span className="font-semibold tabular-nums">{v}</span>
                <span className="opacity-70">/ 10</span>
                <span aria-hidden className="opacity-50">
                  ·
                </span>
                <span>{describe(v)}</span>
              </output>
            </div>

            <div className="relative flex h-5 items-center">
              <div aria-hidden className="absolute inset-x-0 h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
                <div className="h-full rounded-full bg-[var(--accent)] transition-[width]" style={{ width: `${pct}%` }} />
              </div>
              <input
                id={id}
                type="range"
                min={0}
                max={10}
                step={1}
                value={v}
                aria-valuetext={`${v} von 10 – ${describe(v)}`}
                onChange={(e) => onChange({ ...value, [key]: Number(e.target.value) })}
                className={RANGE_CLASS}
              />
            </div>

            {!compact && (
              <div className="mt-1 flex justify-between text-[10px] text-[var(--muted)]">
                <span>0 · kaum</span>
                <span>5 · solide</span>
                <span>10 · Kernstärke</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export { DimsSliders };
