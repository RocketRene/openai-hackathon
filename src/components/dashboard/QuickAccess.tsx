import Link from "next/link";
import { SectionTitle } from "@/components/ui";
import { T } from "@/lib/i18n";
import type { Bi } from "./shared";

interface QuickLink {
  href: string;
  icon: string;
  title: Bi;
  text: Bi;
}

const QUICK_LINKS: QuickLink[] = [
  {
    href: "/assistant",
    icon: "◉",
    title: { de: "Agent & Voice", en: "Agent & Voice" },
    text: {
      de: "Lass dich per Text oder Sprache interviewen und bekomme sofort passende Kandidaten.",
      en: "Get interviewed by text or voice and see matching candidates right away.",
    },
  },
  {
    href: "/candidates",
    icon: "⌕",
    title: { de: "Kandidaten", en: "Candidates" },
    text: {
      de: "Alle Profile nach Rolle, Vertical, Event, Persönlichkeit und Match-Score durchsuchen.",
      en: "Browse all profiles by role, vertical, event, personality and match score.",
    },
  },
  {
    href: "/outreach",
    icon: "✉",
    title: { de: "Outreach", en: "Outreach" },
    text: {
      de: "Personalisierte Nachrichten, die zum Persönlichkeitstyp der Person passen.",
      en: "Personalized messages tailored to the person's personality type.",
    },
  },
  {
    href: "/team",
    icon: "◈",
    title: { de: "Team-Radar", en: "Team radar" },
    text: {
      de: "Auf einen Blick sehen, welche Stärken deinem Gründerteam noch fehlen.",
      en: "See at a glance which strengths your founding team still lacks.",
    },
  },
  {
    href: "/tips",
    icon: "✦",
    title: { de: "Tipps", en: "Tips" },
    text: {
      de: "Konkrete Empfehlungen für dein Start-up auf Basis deines Kontexts.",
      en: "Concrete recommendations for your start-up based on your context.",
    },
  },
  {
    href: "/events",
    icon: "▣",
    title: { de: "Events", en: "Events" },
    text: {
      de: "Konferenzen und Meetups mit Teilnehmerlisten – die Quelle deiner Kontakte.",
      en: "Conferences and meetups with attendee lists – the source of your contacts.",
    },
  },
  {
    href: "/shortlist",
    icon: "☆",
    title: { de: "Shortlist", en: "Shortlist" },
    text: {
      de: "Alle gemerkten Kandidaten an einem Ort, bereit für Outreach und Prep.",
      en: "All saved candidates in one place, ready for outreach and prep.",
    },
  },
  {
    href: "/network",
    icon: "◎",
    title: { de: "Netzwerk-Analyse", en: "Network analysis" },
    text: {
      de: "Wer kennt wen? Verbindungen zwischen Kontakten, Verticals und Events.",
      en: "Who knows whom? Connections between contacts, verticals and events.",
    },
  },
];

/** Schnellzugriff als Karten-Grid: Icon-Badge, Titel, ein Satz (Server-Component). */
export default function QuickAccess() {
  return (
    <section aria-label="Schnellzugriff">
      <SectionTitle>
        <T de="Schnellzugriff" en="Quick access" />
      </SectionTitle>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)]/50 hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent-soft)] text-base text-[var(--accent)] transition group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-contrast)]"
            >
              {item.icon}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--foreground)]">
                <T {...item.title} />
                <span
                  aria-hidden
                  className="text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
                >
                  →
                </span>
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-[var(--muted)]">
                <T {...item.text} />
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
