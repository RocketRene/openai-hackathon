/**
 * Radar-Chart (reines SVG, keine Hooks) für die fünf Gründer-Dimensionen.
 * Responsiv über viewBox, fünf Achsen mit FOUNDER_DIM_LABELS, dezente Gitterringe bei 2/4/6/8/10,
 * Polygone mit 20 % Füllung, hervorgehobene Serie (z. B. „Team kombiniert“) mit Werten an den Achsen,
 * Legende als Chips mit Farbpunkt. Farben kommen als Props – ausschließlich Design-Tokens (var(--…)).
 */
import { FOUNDER_DIM_KEYS, FOUNDER_DIM_LABELS, type FounderDims } from "@/lib/types";

export interface RadarSeries {
  label: string;
  dims: FounderDims;
  /** CSS-Farbe, bevorzugt ein Token wie var(--accent). */
  color: string;
  /** Hervorgehoben: dickere Linie, größere Punkte, Werte an den Achsen (z. B. „Team kombiniert“). */
  emphasis?: boolean;
}

export interface RadarChartProps {
  series: RadarSeries[];
  /** Höhe des Charts in viewBox-Einheiten (Breite = size + Platz für Achsen-Labels). Skaliert auf 100 % Breite. */
  size?: number;
  showLegend?: boolean;
  className?: string;
}

/** Palette für Personen-Serien – nur Tokens, damit Dark-Mode und Pivot der Designerin mitgehen. */
export const DEFAULT_SERIES_COLORS = ["var(--accent)", "var(--success)", "var(--warning)", "var(--danger)", "var(--muted)"];
/** Farbe für die kombinierte Team-Serie. */
export const COMBINED_SERIES_COLOR = "var(--foreground)";

const RINGS = [2, 4, 6, 8, 10];
const MAX = 10;
/** Zusätzliche Breite links/rechts für die Achsen-Labels („Umsetzung“, „Design / Visuell“). */
const LABEL_GUTTER = 90;
/** Vertikaler Abstand für Labels oben/unten. */
const VERTICAL_PADDING = 48;
/** Abstand der Labels vom äußeren Ring. */
const LABEL_OFFSET = 18;
const LINE_HEIGHT = 14;

function clamp(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.min(MAX, n)) : 0;
}

/** Wert mit deutschem Dezimaltrenner, max. eine Nachkommastelle. */
function fmt(n: number): string {
  return String(Math.round(clamp(n) * 10) / 10).replace(".", ",");
}

function polar(cx: number, cy: number, r: number, index: number, total: number) {
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / total;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), angle };
}

function toPoints(points: { x: number; y: number }[]): string {
  return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

function describe(s: RadarSeries, sep: string): string {
  return `${s.label}: ${FOUNDER_DIM_KEYS.map((k) => `${FOUNDER_DIM_LABELS[k]} ${fmt(s.dims[k])}`).join(sep)}`;
}

export default function RadarChart({ series, size = 400, showLegend = true, className }: RadarChartProps) {
  const width = size + 2 * LABEL_GUTTER;
  const height = size;
  const cx = width / 2;
  const cy = height / 2;
  const radius = size / 2 - VERTICAL_PADDING;
  const n = FOUNDER_DIM_KEYS.length;

  /** Deren Werte stehen an den Achsen: die hervorgehobene Serie – oder die einzige. */
  const valueSeries = series.find((s) => s.emphasis) ?? (series.length === 1 ? series[0] : undefined);
  /** Hervorgehobene Serien zuletzt zeichnen, damit sie oben liegen. */
  const drawOrder = [...series].sort((a, b) => Number(Boolean(a.emphasis)) - Number(Boolean(b.emphasis)));

  const axes = FOUNDER_DIM_KEYS.map((key, i) => {
    const end = polar(cx, cy, radius, i, n);
    const labelPos = polar(cx, cy, radius + LABEL_OFFSET, i, n);
    const cos = Math.cos(labelPos.angle);
    const sin = Math.sin(labelPos.angle);
    const anchor: "start" | "middle" | "end" = Math.abs(cos) < 0.25 ? "middle" : cos > 0 ? "start" : "end";
    const baseline: "auto" | "middle" | "hanging" = sin < -0.25 ? "auto" : sin > 0.25 ? "hanging" : "middle";
    // Lange Labels („Design / Visuell“) auf zwei Zeilen brechen.
    const lines = FOUNDER_DIM_LABELS[key].split(" / ");
    const value = valueSeries ? fmt(valueSeries.dims[key]) : null;
    const total = lines.length + (value ? 1 : 0);
    // Oben: Zeilen stapeln nach oben; unten: nach unten; seitlich: vertikal zentriert.
    const firstDy = baseline === "auto" ? -(total - 1) * LINE_HEIGHT : baseline === "hanging" ? 0 : -((total - 1) * LINE_HEIGHT) / 2;
    return { key, lines, value, end, labelPos, anchor, baseline, firstDy };
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
            strokeLinejoin="round"
          />
        ))}
        {/* Achsen */}
        {axes.map((a) => (
          <line key={a.key} x1={cx} y1={cy} x2={a.end.x} y2={a.end.y} style={{ stroke: "var(--border)" }} strokeWidth={1} />
        ))}
        {/* Ring-Beschriftung entlang der oberen Achse (mit Halo, damit sie über der Linie lesbar bleibt) */}
        {RINGS.map((v) => (
          <text
            key={v}
            x={cx + 6}
            y={cy - (v / MAX) * radius + 3.5}
            fontSize={9.5}
            style={{ fill: "var(--muted)", paintOrder: "stroke", stroke: "var(--surface-2)", strokeWidth: 3, strokeLinejoin: "round" }}
          >
            {v}
          </text>
        ))}
        {/* Serien */}
        {drawOrder.map((s, si) => {
          const pts = FOUNDER_DIM_KEYS.map((k, i) => polar(cx, cy, (clamp(s.dims[k]) / MAX) * radius, i, n));
          return (
            <g key={`${s.label}-${si}`}>
              <title>{describe(s, " · ")}</title>
              <polygon
                points={toPoints(pts)}
                style={{ fill: s.color, fillOpacity: s.emphasis ? 0.1 : 0.2, stroke: s.color, strokeWidth: s.emphasis ? 3 : 2 }}
                strokeLinejoin="round"
              />
              {pts.map((p, i) => (
                <circle
                  key={FOUNDER_DIM_KEYS[i]}
                  cx={p.x}
                  cy={p.y}
                  r={s.emphasis ? 4.5 : 3.5}
                  style={{ fill: s.color, stroke: "var(--surface)", strokeWidth: s.emphasis ? 2 : 1.5 }}
                />
              ))}
            </g>
          );
        })}
        {/* Achsen-Labels (+ Wert der hervorgehobenen Serie) */}
        {axes.map((a) => (
          <text key={a.key} x={a.labelPos.x} y={a.labelPos.y} textAnchor={a.anchor} dominantBaseline={a.baseline}>
            {a.lines.map((line, li) => (
              <tspan
                key={line}
                x={a.labelPos.x}
                dy={li === 0 ? a.firstDy : LINE_HEIGHT}
                fontSize={13}
                fontWeight={600}
                style={{ fill: "var(--foreground)" }}
              >
                {line}
              </tspan>
            ))}
            {a.value && (
              <tspan x={a.labelPos.x} dy={LINE_HEIGHT} fontSize={12} fontWeight={500} style={{ fill: "var(--muted)" }}>
                {a.value}
              </tspan>
            )}
          </text>
        ))}
      </svg>
      {showLegend && series.length > 0 && (
        <figcaption className="mt-4 flex flex-wrap justify-center gap-1.5">
          {series.map((s, si) => (
            <span
              key={`${s.label}-${si}`}
              className={
                s.emphasis
                  ? "inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs font-semibold text-[var(--foreground)]"
                  : "inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)]"
              }
            >
              <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
              {s.label}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}
