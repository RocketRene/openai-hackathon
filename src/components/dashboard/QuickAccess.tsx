import Link from "next/link";
import { SectionTitle } from "@/components/ui";

interface QuickLink {
  href: string;
  icon: string;
  title: string;
  text: string;
}

const QUICK_LINKS: QuickLink[] = [
  {
    href: "/assistant",
    icon: "◉",
    title: "Agent & Voice",
    text: "Lass dich per Text oder Sprache interviewen und bekomme sofort passende Kandidaten.",
  },
  {
    href: "/candidates",
    icon: "⌕",
    title: "Kandidaten",
    text: "Alle Profile nach Rolle, Vertical, Event, Persönlichkeit und Match-Score durchsuchen.",
  },
  {
    href: "/outreach",
    icon: "✉",
    title: "Outreach",
    text: "Personalisierte Nachrichten, die zum Persönlichkeitstyp der Person passen.",
  },
  {
    href: "/team",
    icon: "◈",
    title: "Team-Radar",
    text: "Auf einen Blick sehen, welche Stärken deinem Gründerteam noch fehlen.",
  },
  {
    href: "/tips",
    icon: "✦",
    title: "Tipps",
    text: "Konkrete Empfehlungen für dein Start-up auf Basis deines Kontexts.",
  },
  {
    href: "/events",
    icon: "▣",
    title: "Events",
    text: "Konferenzen und Meetups mit Teilnehmerlisten – die Quelle deiner Kontakte.",
  },
  {
    href: "/shortlist",
    icon: "☆",
    title: "Shortlist",
    text: "Alle gemerkten Kandidaten an einem Ort, bereit für Outreach und Prep.",
  },
  {
    href: "/network",
    icon: "◎",
    title: "Netzwerk-Analyse",
    text: "Wer kennt wen? Verbindungen zwischen Kontakten, Verticals und Events.",
  },
];

/** Schnellzugriff als Karten-Grid: Icon-Badge, Titel, ein Satz (Server-Component). */
export default function QuickAccess() {
  return (
    <section aria-label="Schnellzugriff">
      <SectionTitle>Schnellzugriff</SectionTitle>
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
                {item.title}
                <span
                  aria-hidden
                  className="text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
                >
                  →
                </span>
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-[var(--muted)]">{item.text}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
