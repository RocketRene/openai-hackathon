"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

const NAV: { href: string; label: string; hint: string }[] = [
  { href: "/", label: "Dashboard", hint: "Überblick & Top-Matches" },
  { href: "/assistant", label: "Agent", hint: "Interview, Voice, Kandidaten" },
  { href: "/candidates", label: "Kandidaten", hint: "Suchen & filtern" },
  { href: "/outreach", label: "Outreach", hint: "Personalisierte Nachrichten" },
  { href: "/shortlist", label: "Shortlist", hint: "Gemerkte Kontakte" },
  { href: "/team", label: "Team-Radar", hint: "Was fehlt im Team?" },
  { href: "/tips", label: "Tipps", hint: "Was fehlt dem Start-up?" },
  { href: "/events", label: "Events", hint: "Konferenzen & Teilnehmer" },
  { href: "/network", label: "Netzwerk-Analyse", hint: "Das Ökosystem in Zahlen" },
  { href: "/onboarding", label: "Mein Profil", hint: "Kontext & Selbsteinschätzung" },
  { href: "/settings", label: "Einstellungen", hint: "Status & Daten" },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex h-full flex-col gap-1 p-3">
      <Link href="/" className="mb-4 flex items-center gap-2 px-2 py-1" onClick={onNavigate}>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[var(--accent)] text-sm font-bold text-white">FR</span>
        <span className="text-base font-semibold tracking-tight">FounderRadar</span>
      </Link>
      {NAV.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cx(
              "rounded-md px-3 py-2 text-sm transition",
              active
                ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                : "text-[var(--foreground)] hover:bg-[var(--surface-2)]",
            )}
          >
            <div>{item.label}</div>
            <div className="text-xs text-[var(--muted)]">{item.hint}</div>
          </Link>
        );
      })}
      <div className="mt-auto px-3 py-2 text-xs text-[var(--muted)]">OpenAI Hackathon 2026 · MVP</div>
    </nav>
  );
}
