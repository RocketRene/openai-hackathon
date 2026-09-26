import Link from "next/link";
import { getEvents, getProfiles } from "@/lib/data";
import type { NetworkRole } from "@/lib/types";

interface Stat {
  label: string;
  value: number;
  href: string;
  hint: string;
}

/** KPI-Kacheln über den gesamten Datenbestand (Server-Component). */
export default function StatsRow() {
  const profiles = getProfiles();
  const countByRole = (role: NetworkRole) => profiles.filter((p) => p.networkRole === role).length;

  const stats: Stat[] = [
    { label: "Kontakte gesamt", value: profiles.length, href: "/candidates", hint: "alle Profile" },
    { label: "Co-Founder", value: countByRole("cofounder"), href: "/candidates?networkRole=cofounder", hint: "suchen ein Team" },
    { label: "Investoren", value: countByRole("investor"), href: "/candidates?networkRole=investor", hint: "Angels & VCs" },
    { label: "Mentor:innen", value: countByRole("mentor"), href: "/candidates?networkRole=mentor", hint: "Rat & Erfahrung" },
    { label: "Talente", value: countByRole("talent"), href: "/candidates?networkRole=talent", hint: "erste Hires" },
    { label: "Events", value: getEvents().length, href: "/events", hint: "Konferenzen & Meetups" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {stats.map((s) => (
        <Link
          key={s.label}
          href={s.href}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-[var(--accent)]"
        >
          <div className="text-2xl font-semibold text-[var(--foreground)]">{s.value}</div>
          <div className="text-sm font-medium text-[var(--foreground)]">{s.label}</div>
          <div className="text-xs text-[var(--muted)]">{s.hint}</div>
        </Link>
      ))}
    </div>
  );
}
