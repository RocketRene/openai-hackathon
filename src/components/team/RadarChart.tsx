/**
 * Radar-Chart (reines SVG, keine Hooks) für die fünf Gründer-Dimensionen.
 * Fünf Achsen mit FOUNDER_DIM_LABELS, Gitterringe bei 2/4/6/8/10, halbtransparente Polygone, Legende.
 * Farben kommen als Props (Design-Tokens via var(--…) oder feste Hex-Werte).
 */
import { FOUNDER_DIM_KEYS, FOUNDER_DIM_LABELS, type FounderDims } from "@/lib/types";

export interface RadarSeries {
  label: string;
  dims: FounderDims;
  color: string;
}

export interface RadarChartProps {
  series: RadarSeries[];
  /** Höhe des Charts in px (Breite = size + Platz für Achsen-Labels). */
  size?: number;
  showLegend?: boolean;
  className?: string;
}

/** Palette für Personen-Serien: zuerst der Akzent-Token, dann kontrastreiche Festfarben. */
export const DEFAULT_SERIES_COLORS = ["var(--accent)", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];
/** Farbe für die kombinierte Team-Serie. */
export const COMBINED_SERIES_COLOR = "var(--foreground)";

const RINGS = [2, 4, 6, 8, 10];
const MAX = 10;
/** Zusätzliche Breite links/rechts für die Achsen-Labels. */
const LABEL_GUTTER = 60;
/** Vertikaler Abstand für Labels oben/unten. */
const VERTICAL_PADDING = 40;

function clamp(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.min(MAX, n)) : 0;
}

function polar(cx: number, cy: number, r: number, index: number, total: number) {
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / total;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), angle };
}

function toPoints(points: { x: number; y: number }[]): string {
  return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

function describe(s: RadarSeries, sep: string): string {
  return `${s.label}: ${FOUNDER_DIM_KEYS.map((k) => `${FOUNDER_DIM_LABELS[k]} ${clamp(s.dims[k])}`).join(sep)}`;
}

export default function RadarChart({ series, size = 320, showLegend = true, className }: RadarChartProps) {
  const width = size + 2 * LABEL_GUTTER;
  const height = size;
  const cx = width / 2;
  const cy = height / 2;
  const radius = size / 2 - VERTICAL_PADDING;
  const n = FOUNDER_DIM_KEYS.length;

  const axes = FOUNDER_DIM_KEYS.map((key, i) => {
    const end = polar(cx, cy, radius, i, n);
    const labelPos = polar(cx, cy, radius + 16, i, n);
    const cos = Math.cos(labelPos.angle);
    const sin = Math.sin(labelPos.angle);
    const anchor: "start" | "middle" | "end" = Math.abs(cos) < 0.25 ? "middle" : cos > 0 ? "start" : "end";
    const baseline: "auto" | "middle" | "hanging" = sin < -0.25 ? "auto" : sin > 0.25 ? "hanging" : "middle";
    // Lange Labels ("Design / Visuell") auf zwei Zeilen brechen.
    const lines = FOUNDER_DIM_LABELS[key].split(" / ");
    return { key, lines, end, labelPos, anchor, baseline };
  });

  return (
    <figure className={className}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ maxWidth: width, display: "block", margin: "0 auto", overflow: "visible" }}
        role="img"
        aria-label={series.length ? `Team-Radar. ${series.map((s) => describe(s, ", ")).join("; ")}` : "Team-Radar ohne Daten"}
      >
        {/* Fläche + Gitterringe */}
        {RINGS.map((v) => (
          <polygon
            key={v}
            points={toPoints(FOUNDER_DIM_KEYS.map((_, i) => polar(cx, cy, (v / MAX) * radius, i, n)))}
            style={{ fill: v === MAX ? "var(--surface-2)" : "none", stroke: "var(--border)" }}
            strokeWidth={1}
          />
        ))}
        {/* Achsen */}
        {axes.map((a) => (
          <line key={a.key} x1={cx} y1={cy} x2={a.end.x} y2={a.end.y} style={{ stroke: "var(--border)" }} strokeWidth={1} />
        ))}
        {/* Ring-Beschriftung entlang der oberen Achse */}
        {RINGS.map((v) => (
          <text key={v} x={cx + 5} y={cy - (v / MAX) * radius + 3} fontSize={9} style={{ fill: "var(--muted)", opacity: 0.8 }}>
            {v}
          </text>
        ))}
        {/* Serien */}
        {series.map((s, si) => {
          const pts = FOUNDER_DIM_KEYS.map((k, i) => polar(cx, cy, (clamp(s.dims[k]) / MAX) * radius, i, n));
          return (
            <g key={`${s.label}-${si}`}>
              <title>{describe(s, " · ")}</title>
              <polygon
                points={toPoints(pts)}
                style={{ fill: s.color, fillOpacity: 0.18, stroke: s.color }}
                strokeWidth={2}
                strokeLinejoin="round"
              />
              {pts.map((p, i) => (
                <circle key={FOUNDER_DIM_KEYS[i]} cx={p.x} cy={p.y} r={3} style={{ fill: s.color }} />
              ))}
            </g>
          );
        })}
        {/* Achsen-Labels */}
        {axes.map((a) => (
          <text
            key={a.key}
            x={a.labelPos.x}
            y={a.labelPos.y}
            fontSize={11}
            fontWeight={500}
            textAnchor={a.anchor}
            dominantBaseline={a.baseline}
            style={{ fill: "var(--muted)" }}
          >
            {a.lines.map((line, li) => (
              <tspan key={line} x={a.labelPos.x} dy={li === 0 ? 0 : 12}>
                {line}
              </tspan>
            ))}
          </text>
        ))}
      </svg>
      {showLegend && series.length > 0 && (
        <figcaption className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
          {series.map((s, si) => (
            <span key={`${s.label}-${si}`} className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
              {s.label}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}
