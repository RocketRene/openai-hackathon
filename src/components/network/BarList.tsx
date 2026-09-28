/**
 * BarList – horizontale Balkenliste (Server-Component).
 * Label links, Wert rechts (monospaced), darunter der Balken relativ zum Maximum.
 * Labels und Hinweise sind ReactNodes, damit <T de en /> hineinpasst. Optional verlinkt.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { T } from "@/lib/i18n";
import { Num } from "./format";

export interface BarListItem {
  /** Stabiler React-Key; Default: label (wenn String) bzw. Index. */
  key?: string;
  label: ReactNode;
  value: number;
  href?: string;
  /** Tooltip – sinnvoll, wenn das Label kein String ist oder abgeschnitten wird. */
  title?: string;
  /** Dezenter Zusatz links neben dem Wert, z. B. Prozentanteil oder Datum. */
  hint?: ReactNode;
}

export interface BarListProps {
  items: BarListItem[];
  /** Bezugsgröße für 100 % Balkenbreite. Default: größter Wert der Liste. */
  max?: number;
  /** Formatierung des Wertes (Default: sprachabhängig, ganze Zahl oder 1 Nachkommastelle). */
  format?: (value: number) => ReactNode;
  emptyText?: ReactNode;
}

const defaultFormat = (v: number) => <Num value={v} digits={Number.isInteger(v) ? 0 : 1} />;

const linkClass =
  "rounded-sm underline-offset-4 decoration-[var(--accent)]/40 transition-colors hover:text-[var(--accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

export default function BarList({ items, max, format = defaultFormat, emptyText }: BarListProps) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-[var(--muted)]">{emptyText ?? <T de="Keine Daten" en="No data" />}</p>;
  }
  const ceiling = Math.max(max ?? 0, ...items.map((i) => i.value), 1);

  return (
    <ul className="space-y-3">
      {items.map((item, index) => {
        const pct = Math.max(0, Math.min(100, Math.round((item.value / ceiling) * 100)));
        const isText = typeof item.label === "string";
        const title = item.title ?? (isText ? (item.label as string) : undefined);
        const key = item.key ?? (isText ? `${item.label}-${item.href ?? ""}` : String(index));
        const label = item.href ? (
          <Link href={item.href} title={title} className={linkClass}>
            {item.label}
          </Link>
        ) : (
          <span title={title}>{item.label}</span>
        );
        return (
          <li key={key}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--foreground)]">{label}</span>
              <span className="flex shrink-0 items-baseline gap-2.5 font-mono text-xs tabular-nums">
                {item.hint !== undefined && item.hint !== null && <span className="text-[var(--muted)]">{item.hint}</span>}
                <span className="min-w-[3ch] text-right text-sm font-medium text-[var(--foreground)]">{format(item.value)}</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]" aria-hidden="true">
              <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
