import { getEvents, getProfiles } from "@/lib/data";
import type { NetworkRole } from "@/lib/types";
import { Stat } from "@/components/ui";

interface StatItem {
  label: string;
  value: number;
  href: string;
  hint: string;
}

function fmt(n: number): string {
  return n.toLocaleString("de-DE");
}

/** KPI-Zeile über den gesamten Datenbestand (Server-Component, Zahlen aus dem Gateway). */
export default function StatsRow() {
  const profiles = getProfiles();
  const countByRole = (role: NetworkRole) => profiles.filter((p) => p.networkRole === role).length;
  const enriched = profiles.filter((p) => p.source?.type === "linkedin").length;
  const real = profiles.filter((p) => p.source?.type === "linkedin" || p.source?.type === "conference").length;

  const stats: StatItem[] = [
    { label: "Profile", value: profiles.length, href: "/candidates", hint: `${fmt(real)} aus IdeaLab 2026` },
    { label: "LinkedIn-angereichert", value: enriched, href: "/candidates?source=idealab", hint: "mit Werdegang & Skills" },
    { label: "Co-Founder", value: countByRole("cofounder"), href: "/candidates?networkRole=cofounder", hint: "suchen ein Team" },
    { label: "Investor:innen", value: countByRole("investor"), href: "/candidates?networkRole=investor", hint: "Angels & VCs" },
    { label: "Mentor:innen", value: countByRole("mentor"), href: "/candidates?networkRole=mentor", hint: "Rat & Erfahrung" },
    { label: "Events", value: getEvents().length, href: "/events", hint: "Konferenzen & Meetups" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="Kennzahlen">
      {stats.map((s) => (
        <Stat key={s.label} label={s.label} value={fmt(s.value)} hint={s.hint} href={s.href} />
      ))}
    </div>
  );
}
