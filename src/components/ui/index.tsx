/**
 * UI-Primitives (Tailwind, bewusst klein). Design-Tokens liegen in src/app/globals.css.
 * Die Designerin pivotiert hier + in globals.css, ohne Seiten anfassen zu müssen.
 *
 * Stabile API (Props sind Contract, das Aussehen dahinter nicht):
 * Button, LinkButton, Card, Badge, Input, Textarea, Select, Label, Field, PageHeader, EmptyState,
 * Avatar, ScoreBar, cx – plus ScoreRing, Stat, Skeleton, SectionTitle, Chip, Divider, Kicker.
 * Farben ausschließlich über var(--…). Keine Icon-Library – die wenigen Icons sind Inline-SVG.
 */
import Link from "next/link";
import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
export { cx };

/* ------------------------------------------------------------------ */
/* Button & LinkButton                                                 */
/* ------------------------------------------------------------------ */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-[var(--shadow-sm)] hover:bg-[var(--accent-strong)] hover:shadow-[var(--shadow)] active:bg-[var(--accent-strong)] active:shadow-none",
  secondary:
    "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-sm)] hover:border-[var(--surface-3)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)]",
  outline: "border border-[var(--accent)]/40 bg-transparent text-[var(--accent)] hover:bg-[var(--accent-soft)] active:bg-[var(--accent-soft)]",
  ghost: "bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)]",
  danger: "bg-[var(--danger)] text-[var(--accent-contrast)] shadow-[var(--shadow-sm)] hover:brightness-95 active:brightness-90",
};
const sizeClasses = {
  sm: "h-9 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
} as const;

const buttonBase =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] font-medium transition-[background-color,border-color,box-shadow,transform,filter] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]";

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cx("fr-spin h-4 w-4 shrink-0", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: keyof typeof sizeClasses; loading?: boolean }) {
  return (
    <button
      className={cx(buttonBase, sizeClasses[size], variantClasses[variant], focusRing, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  target,
}: {
  href: string;
  variant?: Variant;
  size?: keyof typeof sizeClasses;
  className?: string;
  children: ReactNode;
  target?: string;
}) {
  return (
    <Link
      href={href}
      target={target}
      rel={target === "_blank" ? "noreferrer" : undefined}
      className={cx(buttonBase, sizeClasses[size], variantClasses[variant], focusRing, className)}
    >
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Card, SectionTitle, Kicker, Divider                                 */
/* ------------------------------------------------------------------ */

const cardPadding = { none: "", sm: "p-3", md: "p-4 sm:p-5", lg: "p-5 sm:p-6" } as const;

export function Card({
  className,
  children,
  title,
  action,
  description,
  padding = "md",
  interactive = false,
}: {
  className?: string;
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  padding?: keyof typeof cardPadding;
  interactive?: boolean;
}) {
  return (
    <section
      className={cx(
        "rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]",
        cardPadding[padding],
        interactive && "transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[var(--surface-3)] hover:shadow-[var(--shadow)]",
        className,
      )}
    >
      {(title || action || description) && (
        <header className={cx("mb-4 flex items-start justify-between gap-3", padding === "none" && "px-4 pt-4")}>
          <div className="min-w-0">
            {title && <h3 className="text-[15px] font-semibold tracking-tight text-[var(--foreground)]">{title}</h3>}
            {description && <p className="mt-0.5 text-xs text-[var(--muted)]">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="text-title text-[var(--foreground)]">{children}</h2>
      {action}
    </div>
  );
}

export function Kicker({ children }: { children: ReactNode }) {
  return <p className="text-eyebrow mb-1.5">{children}</p>;
}

/** Trennlinie, optional mit mittigem Label. */
export function Divider({ label, className }: { label?: string; className?: string }) {
  if (!label) return <hr className={cx("border-0 border-t border-[var(--border)]", className)} />;
  return (
    <div className={cx("flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--muted)]", className)} role="separator">
      <span className="h-px flex-1 bg-[var(--border)]" />
      {label}
      <span className="h-px flex-1 bg-[var(--border)]" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Badge & Chip                                                        */
/* ------------------------------------------------------------------ */

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";
const badgeTones: Record<Tone, string> = {
  neutral: "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]",
  accent: "border-transparent bg-[var(--accent-soft)] text-[var(--accent)]",
  success: "border-transparent bg-[var(--success-soft)] text-[var(--success)]",
  warning: "border-transparent bg-[var(--warning-soft)] text-[var(--warning)]",
  danger: "border-transparent bg-[var(--danger-soft)] text-[var(--danger)]",
};

export function Badge({ children, tone = "neutral", className, dot = false }: { children: ReactNode; tone?: Tone; className?: string; dot?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4", badgeTones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

/** Umschaltbarer Filter-Chip. */
export function Chip({ active, children, onClick, className }: { active?: boolean; children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-[background-color,border-color,color] duration-150",
        active
          ? "border-transparent bg-[var(--accent)] text-[var(--accent-contrast)] shadow-[var(--shadow-sm)]"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--surface-3)] hover:bg-[var(--surface-2)]",
        focusRing,
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Formulare                                                           */
/* ------------------------------------------------------------------ */

const inputBase =
  "w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] shadow-[var(--shadow-sm)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--muted)] hover:border-[var(--surface-3)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)] disabled:cursor-not-allowed disabled:bg-[var(--surface-2)] disabled:opacity-60";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(inputBase, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(inputBase, "min-h-24 py-2 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(inputBase, "h-10 pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-[var(--muted)]">
      {children}
    </label>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-[var(--muted)]">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PageHeader & EmptyState                                             */
/* ------------------------------------------------------------------ */

export function PageHeader({
  title,
  subtitle,
  action,
  eyebrow,
  kicker,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** Kleiner Text über dem Titel. */
  eyebrow?: string;
  /** Alias für eyebrow (ältere Aufrufe). */
  kicker?: string;
}) {
  const over = eyebrow ?? kicker;
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {over && <Kicker>{over}</Kicker>}
        <h1 className="text-display text-[var(--foreground)]">{title}</h1>
        {subtitle && <p className="mt-2 text-sm leading-relaxed text-[var(--muted)] sm:text-base">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

export function EmptyState({ title, body, action, icon }: { title: string; body?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface)]/60 px-6 py-12 text-center">
      {icon && <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">{icon}</div>}
      <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-md text-sm text-[var(--muted)]">{body}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Avatar                                                              */
/* ------------------------------------------------------------------ */

/** Deterministischer Farbton (0–360) aus dem Namen – gleiche Person, gleiche Farbe. */
function hueFromName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function Avatar({ src, name, size = 40, className }: { src?: string; name: string; size?: number; className?: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const ring = "shrink-0 rounded-full ring-2 ring-[var(--surface)] shadow-[var(--shadow-sm)]";
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={cx(ring, "bg-[var(--surface-2)] object-cover", className)}
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className={cx(ring, "fr-avatar flex select-none items-center justify-center font-semibold", className)}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size / 2.8)), "--avatar-hue": hueFromName(name) } as CSSProperties}
      aria-label={name}
      role="img"
    >
      {initials}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scores                                                              */
/* ------------------------------------------------------------------ */

type ScoreTone = "accent" | "success" | "warning" | "danger";
const scoreColor: Record<ScoreTone, string> = {
  accent: "var(--accent)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
};

export function ScoreBar({ value, max = 100, label, tone = "accent" }: { value: number; max?: number; label?: string; tone?: ScoreTone }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  const color = scoreColor[tone];
  return (
    <div>
      {label && (
        <div className="mb-1 flex items-baseline justify-between gap-3 text-xs text-[var(--muted)]">
          <span className="truncate">{label}</span>
          <span className="font-semibold tabular-nums text-[var(--foreground)]">
            {value}
            {max !== 100 && <span className="font-normal text-[var(--muted)]">/{max}</span>}
          </span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-3)]" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, color-mix(in srgb, ${color} 55%, var(--surface-3)), ${color})` }}
        />
      </div>
    </div>
  );
}

/** Kreis-Score 0–100 mit Wert in der Mitte. */
export function ScoreRing({
  value,
  size = 64,
  label,
  tone = "accent",
  className,
}: {
  value: number;
  size?: number;
  label?: string;
  tone?: ScoreTone;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const stroke = Math.max(4, Math.round(size / 11));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = scoreColor[tone];
  return (
    <div className={cx("inline-flex shrink-0 flex-col items-center gap-1", className)}>
      <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`${label ? `${label}: ` : ""}${pct} von 100`}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct / 100)}
            className="transition-[stroke-dashoffset] duration-500"
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center font-semibold tabular-nums text-[var(--foreground)]"
          style={{ fontSize: Math.max(11, Math.round(size / 3.4)) }}
        >
          {pct}
        </span>
      </div>
      {label && <span className="text-[11px] text-[var(--muted)]">{label}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stat & Skeleton                                                     */
/* ------------------------------------------------------------------ */

/** KPI-Kachel. Mit href klickbar. */
export function Stat({
  label,
  value,
  hint,
  icon,
  href,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  href?: string;
  className?: string;
}) {
  const inner = (
    <div
      className={cx(
        "flex h-full items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]",
        href && "transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[var(--surface-3)] hover:shadow-[var(--shadow)]",
        className,
      )}
    >
      {icon && <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--accent-soft)] text-[var(--accent)]">{icon}</div>}
      <div className="min-w-0">
        <div className="text-2xl font-semibold tabular-nums tracking-tight text-[var(--foreground)]">{value}</div>
        <div className="mt-0.5 text-sm font-medium text-[var(--foreground)]">{label}</div>
        {hint && <div className="text-xs text-[var(--muted)]">{hint}</div>}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className={cx("block rounded-[var(--radius-lg)]", focusRing)}>
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("fr-skeleton rounded-[var(--radius-sm)]", className ?? "h-4 w-full")} aria-hidden />;
}
