"use client";
/**
 * Zeigt einen erzeugten Outreach-Entwurf: editierbarer Text, Zeichen-Zähler,
 * Kopieren / als E-Mail bzw. LinkedIn öffnen, plus "Warum so formuliert".
 *
 * Der Eltern-Component sollte bei einem neuen Entwurf einen neuen `key` vergeben,
 * damit der editierte Text zurückgesetzt wird.
 */
import { useState } from "react";
import type { OutreachDraft, Profile } from "@/lib/types";
import { PERSONALITY_LABELS } from "@/lib/types";
import { Badge, Button, Card, Input, Textarea, cx } from "@/components/ui";

const LINKEDIN_MAX_CHARS = 300;

const linkClasses =
  "inline-flex items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-3)]";

export interface OutreachDraftCardProps {
  draft: OutreachDraft;
  profile: Profile;
}

function personalityLabel(profile: Profile): string {
  const type = profile.personality?.type;
  return (type && PERSONALITY_LABELS[type]) || "Unbekannt";
}

export default function OutreachDraftCard({ draft, profile }: OutreachDraftCardProps) {
  const isEmail = draft.channel === "email";
  const [subject, setSubject] = useState(draft.subject ?? "");
  const [body, setBody] = useState(draft.body);
  const [copyState, setCopyState] = useState<"idle" | "ok" | "fail">("idle");

  const length = body.length;
  const overLimit = !isEmail && length > LINKEDIN_MAX_CHARS;

  const mailtoHref = profile.email
    ? `mailto:${profile.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : null;
  const linkedinHref = profile.linkedinUrl || null;

  // Primäre Aktion passend zum Kanal, Fallback auf das, was vorhanden ist.
  const primaryAction: { href: string; label: string; external: boolean } | null =
    isEmail && mailtoHref
      ? { href: mailtoHref, label: "Als E-Mail öffnen", external: false }
      : linkedinHref
        ? { href: linkedinHref, label: "Auf LinkedIn öffnen", external: true }
        : mailtoHref
          ? { href: mailtoHref, label: "Als E-Mail öffnen", external: false }
          : null;

  async function copyToClipboard() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard nicht verfügbar");
      await navigator.clipboard.writeText(body);
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

  return (
    <Card
      title={
        <span className="flex flex-wrap items-center gap-2">
          <span>Entwurf für {profile.name}</span>
          <Badge tone="neutral">{isEmail ? "E-Mail" : "LinkedIn"}</Badge>
          <Badge tone={draft.generatedBy === "llm" ? "accent" : "neutral"}>
            {draft.generatedBy === "llm" ? "KI" : "Vorlage"}
          </Badge>
        </span>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          {isEmail && (
            <div>
              <label htmlFor={`subject-${profile.id}`} className="mb-1 block text-xs font-medium text-[var(--muted)]">
                Betreff
              </label>
              <Input
                id={`subject-${profile.id}`}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Betreff"
              />
            </div>
          )}

          <div>
            <label htmlFor={`body-${profile.id}`} className="mb-1 block text-xs font-medium text-[var(--muted)]">
              Nachricht
            </label>
            <Textarea
              id={`body-${profile.id}`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={isEmail ? 10 : 6}
              className={cx("font-sans leading-relaxed", overLimit && "border-[var(--warning)]")}
            />
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className={overLimit ? "font-medium text-[var(--warning)]" : "text-[var(--muted)]"}>
                {isEmail ? `${length} Zeichen` : `${length} / ${LINKEDIN_MAX_CHARS} Zeichen`}
              </span>
              {!isEmail && (
                <span className={overLimit ? "text-[var(--warning)]" : "text-[var(--muted)]"}>
                  {overLimit
                    ? `Zu lang: LinkedIn-Kontaktanfragen erlauben max. ${LINKEDIN_MAX_CHARS} Zeichen.`
                    : `Hinweis: LinkedIn-Kontaktanfragen sind auf ${LINKEDIN_MAX_CHARS} Zeichen begrenzt.`}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={copyToClipboard} type="button">
              {copyState === "ok" ? "Kopiert!" : copyState === "fail" ? "Kopieren fehlgeschlagen" : "Kopieren"}
            </Button>
            {edited && (
              <Button size="sm" variant="ghost" onClick={resetToDraft} type="button" title="Auf den erzeugten Entwurf zurücksetzen">
                Zurücksetzen
              </Button>
            )}
            {primaryAction && (
              <a
                href={primaryAction.href}
                className={linkClasses}
                {...(primaryAction.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {primaryAction.label}
              </a>
            )}
            {isEmail && !mailtoHref && linkedinHref && (
              <span className="text-xs text-[var(--muted)]">Keine E-Mail-Adresse hinterlegt – LinkedIn als Alternative.</span>
            )}
            {!primaryAction && (
              <span className="text-xs text-[var(--muted)]">Weder E-Mail noch LinkedIn-Profil hinterlegt.</span>
            )}
          </div>
        </div>

        <aside className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Warum so formuliert</h4>
          <p className="mt-1 text-sm text-[var(--foreground)]">
            Persönlichkeitstyp: <Badge tone="accent">{personalityLabel(profile)}</Badge>
          </p>
          {notes.length > 0 ? (
            <ul className="mt-2 space-y-1.5 text-sm text-[var(--foreground)]">
              {notes.map((note, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden className="text-[var(--accent)]">
                    •
                  </span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">Keine Hinweise vorhanden.</p>
          )}
        </aside>
      </div>
    </Card>
  );
}
