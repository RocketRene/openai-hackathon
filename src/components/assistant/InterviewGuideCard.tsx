"use client";
/**
 * Interviewleitfaden-Karte (Voya: prepare_interview): Abschnitte mit Minuten, Fragen,
 * „im Gespräch klären“ und Download als Markdown (Blob-Download wie in Voya).
 */
import type { InterviewGuide } from "@/lib/types";
import { interviewGuideToMarkdown } from "@/lib/interview-guide";
import { Badge, Button, Card } from "@/components/ui";

/** Löst im Browser einen Datei-Download aus (Blob + temporärer Link). */
export function downloadTextFile(filename: string, content: string, type = "text/markdown;charset=utf-8"): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface InterviewGuideCardProps {
  guide: InterviewGuide;
  onClose?: () => void;
  className?: string;
}

export default function InterviewGuideCard({ guide, onClose, className }: InterviewGuideCardProps) {
  const download = () => {
    downloadTextFile(`interview-${slugify(guide.name) || guide.profileId}.md`, interviewGuideToMarkdown(guide));
  };

  return (
    <Card
      title={guide.title}
      className={className}
      action={
        <div className="flex items-center gap-2">
          <Badge tone="accent">{guide.duration}</Badge>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Leitfaden schließen">
              Schließen
            </Button>
          )}
        </div>
      }
    >
      <ol className="space-y-4">
        {guide.sections.map((section, i) => (
          <li key={section.title}>
            <div className="flex items-baseline justify-between gap-2">
              <h4 className="text-sm font-semibold text-[var(--foreground)]">
                <span className="mr-1.5 text-[var(--accent)]">{i + 1}.</span>
                {section.title}
              </h4>
              <span className="shrink-0 text-xs text-[var(--muted)]">{section.minutes} min</span>
            </div>
            <ul className="mt-1.5 space-y-1.5 pl-5">
              {section.questions.map((q) => (
                <li key={q} className="list-disc text-sm leading-relaxed text-[var(--foreground)]">
                  {q}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      {guide.unknowns.length > 0 && (
        <div className="mt-4 rounded-md border border-[var(--warning)] bg-[var(--warning-soft)] px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--warning)]">Im Gespräch klären</p>
          <ul className="mt-1 space-y-1 pl-4">
            {guide.unknowns.map((u) => (
              <li key={u} className="list-disc text-xs text-[var(--foreground)]">
                {u}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
        <Button variant="secondary" size="sm" onClick={download}>
          Als Markdown herunterladen
        </Button>
        <span className="text-xs text-[var(--muted)]">Fragen beziehen sich nur auf Angaben aus dem Profil.</span>
      </div>
    </Card>
  );
}
