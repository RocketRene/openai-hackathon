import { SectionTitle } from "@/components/ui";
import { T } from "@/lib/i18n";
import type { Bi } from "./shared";

const STEPS: Array<{ title: Bi; text: Bi }> = [
  {
    title: { de: "Kontext geben", en: "Share your context" },
    text: {
      de: "Onboarding ausfüllen oder den Agenten interviewen lassen: Rolle, Vertical, Idee und Stärken.",
      en: "Complete the onboarding or let the agent interview you: role, vertical, idea and strengths.",
    },
  },
  {
    title: { de: "Kandidaten sichten", en: "Review candidates" },
    text: {
      de: "Der Match-Score priorisiert Co-Founder, Investor:innen, Mentor:innen und Talente für dich.",
      en: "The match score ranks co-founders, investors, mentors and talent for you.",
    },
  },
  {
    title: { de: "Outreach senden", en: "Send outreach" },
    text: {
      de: "Personalisierte Nachrichten passend zum Persönlichkeitstyp – weniger, aber bessere Anschreiben.",
      en: "Personalized messages tailored to personality type – fewer, but better messages.",
    },
  },
  {
    title: { de: "Gespräch vorbereiten", en: "Prepare the conversation" },
    text: {
      de: "Prep-Pack mit Talking Points, Eisbrechern und Red Flags – optional als Voice-Simulation.",
      en: "Prep pack with talking points, icebreakers and red flags – optionally as a voice simulation.",
    },
  },
];

/** „So funktioniert's“ als 4-Schritte-Stepper (Server-Component). */
export default function HowItWorks() {
  return (
    <section aria-label="So funktioniert Voya">
      <SectionTitle>
        <T de="So funktioniert’s" en="How it works" />
      </SectionTitle>
      <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <li
            key={step.title.de}
            className="relative rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold tabular-nums text-[var(--accent)]">
                {index + 1}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                <T de={`Schritt ${index + 1}`} en={`Step ${index + 1}`} />
              </span>
            </div>
            <h3 className="mt-4 text-sm font-semibold tracking-tight text-[var(--foreground)]">
              <T {...step.title} />
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
              <T {...step.text} />
            </p>
            {index < STEPS.length - 1 && (
              <span
                aria-hidden
                className="absolute -right-4 top-1/2 hidden w-4 -translate-y-1/2 justify-center text-sm text-[var(--muted)] lg:flex"
              >
                →
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
