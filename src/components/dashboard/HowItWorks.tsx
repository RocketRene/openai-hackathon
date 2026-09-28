import { SectionTitle } from "@/components/ui";

const STEPS: Array<{ title: string; text: string }> = [
  {
    title: "Kontext geben",
    text: "Onboarding ausfüllen oder den Agenten interviewen lassen: Rolle, Vertical, Idee und Stärken.",
  },
  {
    title: "Kandidaten sichten",
    text: "Der Match-Score priorisiert Co-Founder, Investor:innen, Mentor:innen und Talente für dich.",
  },
  {
    title: "Outreach senden",
    text: "Personalisierte Nachrichten passend zum Persönlichkeitstyp – weniger, aber bessere Anschreiben.",
  },
  {
    title: "Gespräch vorbereiten",
    text: "Prep-Pack mit Talking Points, Eisbrechern und Red Flags – optional als Voice-Simulation.",
  },
];

/** „So funktioniert's“ als 4-Schritte-Stepper (Server-Component). */
export default function HowItWorks() {
  return (
    <section aria-label="So funktioniert Voya">
      <SectionTitle>So funktioniert&apos;s</SectionTitle>
      <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="relative rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold tabular-nums text-[var(--accent)]">
                {index + 1}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                Schritt {index + 1}
              </span>
            </div>
            <h3 className="mt-4 text-sm font-semibold tracking-tight text-[var(--foreground)]">{step.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{step.text}</p>
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
