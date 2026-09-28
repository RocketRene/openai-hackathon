/**
 * UI-Primitives (Tailwind, bewusst klein). Design-Tokens liegen in src/app/globals.css.
 * Die Designerin pivotiert hier + in globals.css, ohne Seiten anfassen zu müssen.
 * API ist stabil: Button, LinkButton, Card, Badge, Input, Textarea, Select, Label, Field,
 * PageHeader, EmptyState, Avatar, ScoreBar, cx – plus Chip, Stat, Skeleton, SectionTitle, Kicker.
 */
import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
export { cx };

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
const variantClasses: Record<Variant, string> = {
  primary: "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-[var(--shadow-sm)] hover:bg-[var(--accent-strong)]",
  secondary: "bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] shadow-[var(--shadow-sm)] hover:bg-[var(--surface-2)]",
  outline: "bg-transparent text-[var(--accent)] border border-[var(--accent)]/40 hover:bg-[var(--accent-soft)]",
  ghost: "bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-2)]",
  danger: "bg-[var(--danger)] text-white hover:opacity-90",
};
const sizeClasses = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
} as const;

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: keyof typeof sizeClasses }) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        sizeClasses[size],
        variantClasses[variant],
        focusRing,
        className,
      )}
      {...props}
    />
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
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition",
        sizeClasses[size],
        variantClasses[variant],
        focusRing,
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function Card({
  className,
  children,
  title,
  action,
  description,
  padding = "md",
}: {
  className?: string;
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
}) {
  const pad = padding === "none" ? "" : padding === "sm" ? "p-3" : padding === "lg" ? "p-6" : "p-5";
  return (
    <section
      className={cx(
        "rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]",
        pad,
        className,
      )}
    >
      {(title || action || description) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">{title}</h3>}
            {description && <p className="mt-0.5 text-xs text-[var(--muted)]">{description}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="text-base font-semibold tracking-tight text-[var(--foreground)]">{children}</h2>
      {action}
    </div>
  );
}

export function Kicker({ children }: { children: ReactNode }) {
  return <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">{children}</p>;
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
  className?: string;
}) {
  const tones = {
    neutral: "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]",
    accent: "bg-[var(--accent-soft)] text-[var(--accent)] border-transparent",
    success: "bg-[var(--success-soft)] text-[var(--success)] border-transparent",
    warning: "bg-[var(--warning-soft)] text-[var(--warning)] border-transparent",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)] border-transparent",
  };
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4", tones[tone], className)}>
      {children}
    </span>
  );
}

/** Umschaltbarer Filter-Chip. */
export function Chip({
  active,
  children,
  onClick,
  className,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition",
        active
          ? "border-transparent bg-[var(--accent)] text-[var(--accent-contrast)]"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-2)]",
        focusRing,
        className,
      )}
    >
      {children}
    </button>
  );
}

const inputBase =
  "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] shadow-[var(--shadow-sm)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]";

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

export function Field({ label, children, hint }: { label: ReactNode; children: ReactNode; hint?: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-[var(--muted)]">{hint}</p>}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
  kicker,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  kicker?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {kicker && <Kicker>{kicker}</Kicker>}
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm leading-relaxed text-[var(--muted)] sm:text-base">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

export function EmptyState({ title, body, action, icon }: { title: ReactNode; body?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--surface)]/60 px-6 py-12 text-center">
      {icon && <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">{icon}</div>}
      <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-md text-sm text-[var(--muted)]">{body}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function Avatar({ src, name, size = 40, className }: { src?: string; name: string; size?: number; className?: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={cx("shrink-0 rounded-full object-cover ring-2 ring-[var(--surface)]", className)}
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className={cx("flex shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] font-semibold text-[var(--accent)]", className)}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size / 3)) }}
    >
      {initials}
    </div>
  );
}

export function ScoreBar({
  value,
  max = 100,
  label,
  tone = "accent",
}: {
  value: number;
  max?: number;
  label?: string;
  tone?: "accent" | "success" | "warning" | "danger";
}) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  const color = tone === "accent" ? "var(--accent)" : tone === "success" ? "var(--success)" : tone === "warning" ? "var(--warning)" : "var(--danger)";
  return (
    <div>
      {label && (
        <div className="mb-1 flex justify-between text-xs text-[var(--muted)]">
          <span>{label}</span>
          <span className="font-medium text-[var(--foreground)]">{value}</span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
        <div className="h-full rounded-full transition-[width]" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/** KPI-Kachel. */
export function Stat({
  label,
  value,
  hint,
  href,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  href?: string;
  className?: string;
}) {
  const inner = (
    <div
      className={cx(
        "rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] transition",
        href && "hover:border-[var(--accent)]/50 hover:shadow-[var(--shadow-md)]",
        className,
      )}
    >
      <div className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">{value}</div>
      <div className="mt-1 text-sm font-medium text-[var(--foreground)]">{label}</div>
      {hint && <div className="text-xs text-[var(--muted)]">{hint}</div>}
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("fr-skeleton rounded-[var(--radius-sm)]", className ?? "h-4 w-full")} />;
}
