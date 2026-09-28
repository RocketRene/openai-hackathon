"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";
import { useLocale } from "@/lib/i18n";

type NavItem = { href: string; label: string; labelEn: string; hint: string; hintEn: string; icon: string };

const GROUPS: { title: string; titleEn: string; items: NavItem[] }[] = [
  {
    title: "Finden",
    titleEn: "Find",
    items: [
      { href: "/", label: "Dashboard", labelEn: "Dashboard", hint: "Überblick & Top-Matches", hintEn: "Overview & top matches", icon: "◫" },
      { href: "/assistant", label: "Agent", labelEn: "Agent", hint: "Interview, Voice, Kandidaten", hintEn: "Interview, voice, candidates", icon: "◉" },
      { href: "/candidates", label: "Kandidaten", labelEn: "Candidates", hint: "Suchen & filtern", hintEn: "Search & filter", icon: "⌕" },
      { href: "/events", label: "Events", labelEn: "Events", hint: "Konferenzen & Teilnehmer", hintEn: "Conferences & attendees", icon: "▣" },
      { href: "/network", label: "Netzwerk", labelEn: "Network", hint: "Das Ökosystem in Zahlen", hintEn: "The ecosystem in numbers", icon: "◎" },
    ],
  },
  {
    title: "Ansprechen",
    titleEn: "Reach out",
    items: [
      { href: "/shortlist", label: "Shortlist", labelEn: "Shortlist", hint: "Gemerkte Kontakte", hintEn: "Saved contacts", icon: "☆" },
      { href: "/outreach", label: "Outreach", labelEn: "Outreach", hint: "Personalisierte Nachrichten", hintEn: "Personalised messages", icon: "✉" },
      { href: "/team", label: "Team-Radar", labelEn: "Team radar", hint: "Was fehlt im Team?", hintEn: "What is missing in the team?", icon: "◈" },
      { href: "/tips", label: "Tipps", labelEn: "Tips", hint: "Was fehlt dem Start-up?", hintEn: "What does the start-up need?", icon: "✦" },
    ],
  },
  {
    title: "Du",
    titleEn: "You",
    items: [
      { href: "/onboarding", label: "Mein Profil", labelEn: "My profile", hint: "Kontext & Selbsteinschätzung", hintEn: "Context & self-assessment", icon: "◐" },
      { href: "/settings", label: "Einstellungen", labelEn: "Settings", hint: "Status & Daten", hintEn: "Status & data", icon: "⚙" },
    ],
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [locale] = useLocale();
  const en = locale === "en";
  return (
    <nav className="flex h-full flex-col gap-5 p-4">
      <Link href="/" className="flex items-center gap-2.5 px-1 py-1" onClick={onNavigate}>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold text-[var(--accent-contrast)] shadow-[var(--shadow-sm)]">
          FR
        </span>
        <span>
          <span className="block text-sm font-semibold tracking-tight">Voya</span>
          <span className="block text-[11px] text-[var(--muted)]">{en ? "Co-founders · Investors · Mentors" : "Co-Founder · Investoren · Mentor:innen"}</span>
        </span>
      </Link>

      {GROUPS.map((group) => (
        <div key={group.title}>
          <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{en ? group.titleEn : group.title}</p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "group flex items-center gap-3 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm transition",
                    active
                      ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                      : "text-[var(--foreground)] hover:bg-[var(--surface-2)]",
                  )}
                >
                  <span
                    className={cx(
                      "flex h-7 w-7 items-center justify-center rounded-md text-base",
                      active ? "bg-[var(--surface)] text-[var(--accent)]" : "bg-[var(--surface-2)] text-[var(--muted)] group-hover:text-[var(--foreground)]",
                    )}
                    aria-hidden
                  >
                    {item.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block leading-5">{en ? item.labelEn : item.label}</span>
                    <span className="block truncate text-[11px] font-normal text-[var(--muted)]">{en ? item.hintEn : item.hint}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mt-auto rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[11px] text-[var(--muted)]">
        {en ? "OpenAI Hackathon 2026 · IdeaLab data: 569 profiles" : "OpenAI Hackathon 2026 · IdeaLab-Daten: 569 Profile"}
      </div>
    </nav>
  );
}
