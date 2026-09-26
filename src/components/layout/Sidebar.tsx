"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

type NavItem = { href: string; label: string; hint: string; icon: string };

const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Finden",
    items: [
      { href: "/", label: "Dashboard", hint: "Überblick & Top-Matches", icon: "◫" },
      { href: "/assistant", label: "Agent", hint: "Interview, Voice, Kandidaten", icon: "◉" },
      { href: "/candidates", label: "Kandidaten", hint: "Suchen & filtern", icon: "⌕" },
      { href: "/events", label: "Events", hint: "Konferenzen & Teilnehmer", icon: "▣" },
      { href: "/network", label: "Netzwerk", hint: "Das Ökosystem in Zahlen", icon: "◎" },
    ],
  },
  {
    title: "Ansprechen",
    items: [
      { href: "/shortlist", label: "Shortlist", hint: "Gemerkte Kontakte", icon: "☆" },
      { href: "/outreach", label: "Outreach", hint: "Personalisierte Nachrichten", icon: "✉" },
      { href: "/team", label: "Team-Radar", hint: "Was fehlt im Team?", icon: "◈" },
      { href: "/tips", label: "Tipps", hint: "Was fehlt dem Start-up?", icon: "✦" },
    ],
  },
  {
    title: "Du",
    items: [
      { href: "/onboarding", label: "Mein Profil", hint: "Kontext & Selbsteinschätzung", icon: "◐" },
      { href: "/settings", label: "Einstellungen", hint: "Status & Daten", icon: "⚙" },
    ],
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex h-full flex-col gap-5 p-4">
      <Link href="/" className="flex items-center gap-2.5 px-1 py-1" onClick={onNavigate}>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold text-[var(--accent-contrast)] shadow-[var(--shadow-sm)]">
          FR
        </span>
        <span>
          <span className="block text-sm font-semibold tracking-tight">FounderRadar</span>
          <span className="block text-[11px] text-[var(--muted)]">Co-Founder · Investoren · Mentor:innen</span>
        </span>
      </Link>

      {GROUPS.map((group) => (
        <div key={group.title}>
          <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{group.title}</p>
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
                    <span className="block leading-5">{item.label}</span>
                    <span className="block truncate text-[11px] font-normal text-[var(--muted)]">{item.hint}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mt-auto rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[11px] text-[var(--muted)]">
        OpenAI Hackathon 2026 · IdeaLab-Daten: 569 Profile
      </div>
    </nav>
  );
}
