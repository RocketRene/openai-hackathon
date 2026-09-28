"use client";
/**
 * Composer: zeigt den ausgewählten Outreach-Entwurf – Betreff, großer editierbarer Text mit
 * Zeichen-Zähler, Kopieren / als E-Mail bzw. LinkedIn öffnen, Badge KI/Vorlage und ein
 * aufklappbares "Warum so formuliert".
 *
 * Der Eltern-Component sollte bei einem neuen Entwurf einen neuen `key` vergeben, damit der
 * editierte Text zurückgesetzt wird. `ComposerHeader` und `ComposerSkeleton` nutzt der
 * Workspace auch für Lade-, Fehler- und Leerzustände, damit die rechte Spalte ruhig bleibt.
 *
 * Zweisprachig (DE/EN) über ein lokales DICT + useT; Datenwerte (Namen, Headline, Summary) bleiben roh.
 */
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import type { OutreachDraft, PersonalityType, Profile } from "@/lib/types";
import { useLocale, useT, type Dict, type Locale } from "@/lib/i18n";
import { Avatar, Badge, Button, Card, Input, Label, Skeleton, Textarea, cx } from "@/components/ui";

const LINKEDIN_MAX_CHARS = 300;

export type OutreachChannel = OutreachDraft["channel"];

type Bi = { de: string; en: string };

export const CHANNEL_LABELS: Record<OutreachChannel, Bi> = {
  email: { de: "E-Mail", en: "Email" },
  linkedin: { de: "LinkedIn", en: "LinkedIn" },
};

export function channelLabel(channel: OutreachChannel, locale: Locale): string {
  return CHANNEL_LABELS[channel][locale];
}

const PERSONALITY_LABELS: Record<PersonalityType, Bi> = {
  visionary: { de: "Visionär:in", en: "Visionary" },
  builder: { de: "Builder", en: "Builder" },
  operator: { de: "Operator", en: "Operator" },
  connector: { de: "Connector", en: "Connector" },
  analyst: { de: "Analyst:in", en: "Analyst" },
};

export function personalityLabel(profile: Profile, locale: Locale): string {
  const type = profile.personality?.type;
  const label = type ? PERSONALITY_LABELS[type] : undefined;
  return label ? label[locale] : locale === "en" ? "Unknown" : "Unbekannt";
}

const DICT = {
  generating: { de: "Entwurf wird erzeugt …", en: "Generating draft …" },
  regenerate: { de: "Neu erzeugen", en: "Regenerate" },
  regenerateTitle: { de: "Entwurf neu erzeugen", en: "Regenerate the draft" },
  ai: { de: "KI", en: "AI" },
  template: { de: "Vorlage", en: "Template" },
  subject: { de: "Betreff", en: "Subject" },
  message: { de: "Nachricht", en: "Message" },
  chars: { de: "{n} Zeichen", en: "{n} characters" },
  charsOf: { de: "{n} / {max} Zeichen", en: "{n} / {max} characters" },
  tooLong: {
    de: "Zu lang – LinkedIn-Kontaktanfragen erlauben maximal {max} Zeichen.",
    en: "Too long – LinkedIn connection requests allow at most {max} characters.",
  },
  limitHint: {
    de: "LinkedIn-Kontaktanfragen sind auf {max} Zeichen begrenzt.",
    en: "LinkedIn connection requests are limited to {max} characters.",
  },
  copy: { de: "Kopieren", en: "Copy" },
  copied: { de: "Kopiert", en: "Copied" },
  copyFailed: { de: "Kopieren fehlgeschlagen", en: "Copy failed" },
  openEmail: { de: "Als E-Mail öffnen", en: "Open as email" },
  openLinkedIn: { de: "LinkedIn öffnen", en: "Open LinkedIn" },
  noEmail: { de: "Keine E-Mail-Adresse hinterlegt", en: "No email address on file" },
  noLinkedIn: { de: "Kein LinkedIn-Profil hinterlegt", en: "No LinkedIn profile on file" },
  reset: { de: "Zurücksetzen", en: "Reset" },
  resetTitle: { de: "Auf den erzeugten Entwurf zurücksetzen", en: "Reset to the generated draft" },
  altLinkedIn: { de: "LinkedIn als Alternative oder Text kopieren.", en: "Use LinkedIn instead or copy the text." },
  altEmail: { de: "E-Mail als Alternative oder Text kopieren.", en: "Use email instead or copy the text." },
  copyOther: { de: "Text kopieren und über einen anderen Kanal senden.", en: "Copy the text and send it via another channel." },
  why: { de: "Warum so formuliert", en: "Why it's phrased this way" },
  noNotes: { de: "Keine Hinweise vorhanden.", en: "No notes available." },
} satisfies Dict;

/* ------------------------------------------------------------------ */
/* Kleine Icons (inline, keine Dependency)                             */
/* ------------------------------------------------------------------ */

function IconMail({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className={cx("h-4 w-4", className)} aria-hidden>
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
      <path d="m3 6 7 5 7-5" />
    </svg>
  );
}

function IconLinkedIn({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={cx("h-4 w-4", className)} aria-hidden>
      <path d="M4.5 7.5h2.6V16H4.5V7.5Zm1.3-4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM8.7 7.5h2.5v1.2h.04c.35-.66 1.2-1.36 2.47-1.36 2.64 0 3.13 1.74 3.13 4V16h-2.6v-4.1c0-.98-.02-2.24-1.37-2.24-1.37 0-1.58 1.07-1.58 2.17V16H8.7V7.5Z" />
    </svg>
  );
}

function IconCopy({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className={cx("h-4 w-4", className)} aria-hidden>
      <rect x="7" y="7" width="9" height="9" rx="1.5" />
      <path d="M13 7V5.5A1.5 1.5 0 0 0 11.5 4h-6A1.5 1.5 0 0 0 4 5.5v6A1.5 1.5 0 0 0 5.5 13H7" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className={cx("h-4 w-4", className)} aria-hidden>
      <path d="m4.5 10.5 3.5 3.5 7.5-8" />
    </svg>
  );
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={cx("h-4 w-4 transition-transform", open && "rotate-180")}
      aria-hidden
    >
      <path d="m5 7.5 5 5 5-5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Header + Skeleton (wiederverwendet vom Workspace)                   */
/* ------------------------------------------------------------------ */

export function ComposerHeader({
  profile,
  badges,
  action,
}: {
  profile: Profile;
  badges?: ReactNode;
  action?: ReactNode;
}) {
  const [locale] = useLocale();
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] px-5 py-4">
      <Avatar src={profile.photoUrl} name={profile.name} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/candidates/${profile.id}`}
            className="truncate text-sm font-semibold tracking-tight text-[var(--foreground)] hover:underline"
          >
            {profile.name}
          </Link>
          <Badge tone="accent">{personalityLabel(profile, locale)}</Badge>
          {badges}
        </div>
        <p className="mt-0.5 truncate text-xs text-[var(--muted)]" title={profile.headline}>
          {profile.headline}
        </p>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function ComposerSkeleton({ channel = "email" }: { channel?: OutreachChannel }) {
  const t = useT(DICT);
  return (
    <div className="space-y-5 p-5" aria-busy="true" aria-live="polite">
      {channel === "email" && (
        <div className="space-y-2">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className={channel === "email" ? "h-64 w-full" : "h-44 w-full"} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
        <span
          className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]"
          aria-hidden
        />
        {t("generating")}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Composer                                                            */
/* ------------------------------------------------------------------ */

const actionLinkBase =
  "inline-flex h-8 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-3 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";
const actionLinkPrimary =
  "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-[var(--shadow-sm)] hover:bg-[var(--accent-strong)]";
const actionLinkSecondary =
  "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-sm)] hover:bg-[var(--surface-2)]";

function ActionLink({
  href,
  primary,
  external,
  title,
  children,
}: {
  href: string;
  primary?: boolean;
  external?: boolean;
  title?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      title={title}
      className={cx(actionLinkBase, primary ? actionLinkPrimary : actionLinkSecondary)}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

export interface OutreachDraftCardProps {
  draft: OutreachDraft;
  profile: Profile;
  /** Fehler einer erneuten Generierung – wird inline über dem bestehenden Entwurf gezeigt. */
  error?: string;
  onRegenerate?: () => void;
  /** Deaktiviert "Neu erzeugen" (z. B. während der Top-5-Stapel läuft). */
  busy?: boolean;
}

export default function OutreachDraftCard({ draft, profile, error, onRegenerate, busy }: OutreachDraftCardProps) {
  const [locale] = useLocale();
  const t = useT(DICT);
  const isEmail = draft.channel === "email";
  const uid = useId();
  const [subject, setSubject] = useState(draft.subject ?? "");
  const [body, setBody] = useState(draft.body);
  const [copyState, setCopyState] = useState<"idle" | "ok" | "fail">("idle");
  const [whyOpen, setWhyOpen] = useState(false);

  const length = body.length;
  const overLimit = !isEmail && length > LINKEDIN_MAX_CHARS;
  const nearLimit = !isEmail && !overLimit && length > LINKEDIN_MAX_CHARS * 0.85;
  const limitPct = Math.min(100, Math.round((length / LINKEDIN_MAX_CHARS) * 100));

  const mailtoHref = profile.email
    ? `mailto:${profile.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : null;
  const linkedinHref = profile.linkedinUrl || null;

  async function copyToClipboard() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard not available");
      const text = isEmail && subject.trim() ? `${t("subject")}: ${subject.trim()}\n\n${body}` : body;
      await navigator.clipboard.writeText(text);
      setCopyState("ok");
    } catch {
      setCopyState("fail");
    }
    window.setTimeout(() => setCopyState("idle"), 2000);
  }

  const edited = subject !== (draft.subject ?? "") || body !== draft.body;

  function resetToDraft() {
    setSubject(draft.subject ?? "");
    setBody(draft.body);
  }

  const notes = draft.personalityNotes?.length
    ? draft.personalityNotes
    : [profile.personality?.communicationStyle].filter((n): n is string => Boolean(n));

  const whyId = `${uid}-why`;

  return (
    <Card padding="none" className="overflow-hidden fr-fade-in">
      <ComposerHeader
        profile={profile}
        badges={
          <>
            <Badge tone="neutral">{channelLabel(draft.channel, locale)}</Badge>
            <Badge tone={draft.generatedBy === "llm" ? "accent" : "neutral"}>
              {draft.generatedBy === "llm" ? t("ai") : t("template")}
            </Badge>
          </>
        }
        action={
          onRegenerate && (
            <Button size="sm" variant="ghost" onClick={onRegenerate} disabled={busy} type="button" title={t("regenerateTitle")}>
              {t("regenerate")}
            </Button>
          )
        }
      />

      <div className="space-y-5 p-5">
        {error && (
          <p role="alert" className="rounded-[var(--radius-sm)] border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}

        {isEmail && (
          <div>
            <Label htmlFor={`${uid}-subject`}>{t("subject")}</Label>
            <Input
              id={`${uid}-subject`}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("subject")}
              className="font-medium"
            />
          </div>
        )}

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label htmlFor={`${uid}-body`} className="block text-xs font-medium text-[var(--muted)]">
              {t("message")}
            </label>
            <span
              className={cx(
                "text-xs tabular-nums",
                overLimit ? "font-medium text-[var(--danger)]" : nearLimit ? "font-medium text-[var(--warning)]" : "text-[var(--muted)]",
              )}
              aria-live="polite"
            >
              {isEmail
                ? t("chars", { n: length.toLocaleString(locale === "en" ? "en-US" : "de-DE") })
                : t("charsOf", { n: length, max: LINKEDIN_MAX_CHARS })}
            </span>
          </div>
          <Textarea
            id={`${uid}-body`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={isEmail ? 12 : 7}
            spellCheck
            className={cx(
              "resize-y font-sans text-[15px] leading-relaxed",
              isEmail ? "min-h-64" : "min-h-44",
              overLimit && "border-[var(--danger)] focus:border-[var(--danger)]",
            )}
          />
          {!isEmail && (
            <div className="mt-2">
              <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{
                    width: `${limitPct}%`,
                    background: overLimit ? "var(--danger)" : nearLimit ? "var(--warning)" : "var(--accent)",
                  }}
                />
              </div>
              <p className={cx("mt-1.5 text-xs", overLimit ? "text-[var(--danger)]" : "text-[var(--muted)]")}>
                {overLimit ? t("tooLong", { max: LINKEDIN_MAX_CHARS }) : t("limitHint", { max: LINKEDIN_MAX_CHARS })}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={copyToClipboard} type="button" aria-live="polite">
            {copyState === "ok" ? <IconCheck className="text-[var(--success)]" /> : <IconCopy />}
            {copyState === "ok" ? t("copied") : copyState === "fail" ? t("copyFailed") : t("copy")}
          </Button>

          {mailtoHref ? (
            <ActionLink href={mailtoHref} primary={isEmail} title={profile.email}>
              <IconMail />
              {t("openEmail")}
            </ActionLink>
          ) : (
            <Button size="sm" variant="secondary" disabled type="button" title={t("noEmail")}>
              <IconMail />
              {t("openEmail")}
            </Button>
          )}

          {linkedinHref ? (
            <ActionLink href={linkedinHref} primary={!isEmail} external title={linkedinHref}>
              <IconLinkedIn />
              {t("openLinkedIn")}
            </ActionLink>
          ) : (
            <Button size="sm" variant="secondary" disabled type="button" title={t("noLinkedIn")}>
              <IconLinkedIn />
              {t("openLinkedIn")}
            </Button>
          )}

          {edited && (
            <Button size="sm" variant="ghost" onClick={resetToDraft} type="button" title={t("resetTitle")}>
              {t("reset")}
            </Button>
          )}
        </div>

        {isEmail && !mailtoHref && (
          <p className="text-xs text-[var(--muted)]">
            {t("noEmail")} – {linkedinHref ? t("altLinkedIn") : t("copyOther")}
          </p>
        )}
        {!isEmail && !linkedinHref && (
          <p className="text-xs text-[var(--muted)]">
            {t("noLinkedIn")} – {mailtoHref ? t("altEmail") : t("copyOther")}
          </p>
        )}

        <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)]">
          <button
            type="button"
            onClick={() => setWhyOpen((v) => !v)}
            aria-expanded={whyOpen}
            aria-controls={whyId}
            className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-left transition hover:bg-[var(--surface-3)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{t("why")}</span>
              <Badge tone="accent">{personalityLabel(profile, locale)}</Badge>
            </span>
            <span className="text-[var(--muted)]">
              <IconChevron open={whyOpen} />
            </span>
          </button>
          {whyOpen && (
            <div id={whyId} className="border-t border-[var(--border)] px-3 py-3 fr-fade-in">
              {profile.personality?.summary && (
                <p className="mb-2 text-sm text-[var(--muted)]">{profile.personality.summary}</p>
              )}
              {notes.length > 0 ? (
                <ul className="space-y-1.5 text-sm text-[var(--foreground)]">
                  {notes.map((note, i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--muted)]">{t("noNotes")}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
