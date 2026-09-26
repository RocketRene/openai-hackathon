/**
 * BarList – horizontale Balkenliste (Server-Component).
 * Label links, Wert rechts, Balkenbreite relativ zum Maximum. Optional verlinkt.
 */
import Link from "next/link";

export interface BarListItem {
  label: string;
  value: number;
  href?: string;
  /** Optionaler Zusatz rechts neben dem Wert, z. B. "42 %". */
  hint?: string;
}

export interface BarListProps {
  items: BarListItem[];
  /** Bezugsgröße für 100 % Balkenbreite. Default: größter Wert der Liste. */
  max?: number;
  /** Formatierung des Wertes (Default: de-DE, max. 1 Nachkommastelle). */
  format?: (value: number) => string;
  emptyText?: string;
}

const defaultFormat = (v: number) => new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(v);

export default function BarList({ items, max, format = defaultFormat, emptyText = "Keine Daten" }: BarListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-[var(--muted)]">{emptyText}</p>;
  }
  const ceiling = Math.max(max ?? 0, ...items.map((i) => i.value), 1);

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const pct = Math.max(0, Math.min(100, Math.round((item.value / ceiling) * 100)));
        const label = item.href ? (
          <Link href={item.href} className="hover:text-[var(--accent)] hover:underline" title={item.label}>
            {item.label}
          </Link>
        ) : (
          <span title={item.label}>{item.label}</span>
        );
        return (
          <li key={`${item.label}-${item.href ?? ""}`}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 flex-1 truncate text-[var(--foreground)]">{label}</span>
              <span className="shrink-0 tabular-nums text-[var(--muted)]">
                <span className="font-medium text-[var(--foreground)]">{format(item.value)}</span>
                {item.hint && <span className="ml-1.5 text-xs">{item.hint}</span>}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
              <div className="h-2 rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
