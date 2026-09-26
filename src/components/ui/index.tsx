/**
 * UI-Primitives (bewusst minimal, Tailwind). Design-Tokens liegen in src/app/globals.css.
 * Die Designerin pivotiert hier + in globals.css, ohne Seiten anfassen zu müssen.
 */
import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
export { cx };

type Variant = "primary" | "secondary" | "ghost" | "danger";
const variantClasses: Record<Variant, string> = {
  primary: "bg-[var(--accent)] text-white hover:opacity-90",
  secondary: "bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[var(--surface-3)] border border-[var(--border)]",
  ghost: "bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-2)]",
  danger: "bg-[var(--danger)] text-white hover:opacity-90",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  const sizeCls = size === "sm" ? "px-2.5 py-1 text-xs" : size === "lg" ? "px-5 py-3 text-base" : "px-3.5 py-2 text-sm";
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        sizeCls,
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

export function LinkButton({
  href,
  variant = "primary",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function Card({ className, children, title, action }: { className?: string; children: ReactNode; title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={cx("rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4", className)}>
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          {title && <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "accent" | "success" | "warning" | "danger"; className?: string }) {
  const tones = {
    neutral: "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]",
    accent: "bg-[var(--accent-soft)] text-[var(--accent)] border-transparent",
    success: "bg-[var(--success-soft)] text-[var(--success)] border-transparent",
    warning: "bg-[var(--warning-soft)] text-[var(--warning)] border-transparent",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)] border-transparent",
  };
  return <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", tones[tone], className)}>{children}</span>;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        "w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cx(
        "w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx(
        "w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-[var(--muted)]">
      {children}
    </label>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--border)] p-8 text-center">
      <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
      {body && <p className="mt-1 text-sm text-[var(--muted)]">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Avatar({ src, name, size = 40 }: { src?: string; name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <div
      className="flex items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}

export function ScoreBar({ value, max = 100, label }: { value: number; max?: number; label?: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      {label && (
        <div className="mb-1 flex justify-between text-xs text-[var(--muted)]">
          <span>{label}</span>
          <span>{value}</span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-[var(--surface-3)]">
        <div className="h-2 rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
