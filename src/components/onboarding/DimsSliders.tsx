"use client";
/**
 * Fünf Range-Slider (0–10) für die Selbsteinschätzung auf den Team-Radar-Dimensionen
 * (Vision · Design/Visuell · Technik · Detail · Umsetzung).
 * Rein kontrolliert: `value` rein, `onChange` liefert das komplette FounderDims-Objekt zurück.
 */
import { FOUNDER_DIM_KEYS, FOUNDER_DIM_LABELS, type FounderDimKey, type FounderDims } from "@/lib/types";

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

export interface DimsSlidersProps {
  value: FounderDims;
  onChange: (d: FounderDims) => void;
  /** Kompakte Darstellung ohne Hilfetexte (z. B. in Sidebars). */
  compact?: boolean;
}

export default function DimsSliders({ value, onChange, compact = false }: DimsSlidersProps) {
  return (
    <div className={compact ? "space-y-3" : "space-y-5"}>
      {FOUNDER_DIM_KEYS.map((key) => {
        const id = `dim-${key}`;
        const v = value[key];
        return (
          <div key={key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <label htmlFor={id} className="text-sm font-medium text-[var(--foreground)]">
                {FOUNDER_DIM_LABELS[key]}
              </label>
              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 font-semibold tabular-nums text-[var(--accent)]">{v}</span>
                {describe(v)}
              </span>
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
              className="h-2 w-full cursor-pointer accent-[var(--accent)]"
            />
            {!compact && <p className="mt-1 text-xs text-[var(--muted)]">{DIM_HELP[key]}</p>}
          </div>
        );
      })}
    </div>
  );
}

export { DimsSliders };
