import { getEvents, getProfiles } from "@/lib/data";
import type { NetworkRole } from "@/lib/types";
import { Stat } from "@/components/ui";

interface StatItem {
  label: string;
  value: number;
  href: string;
  hint: string;
}

/** KPI-Reihe über den gesamten Datenbestand (Server-Component) – jede Kachel verlinkt. */
export default function StatsRow() {
  const profiles = getProfiles();
  const countByRole = (role: NetworkRole) => profiles.filter((p) => p.networkRole === role).length;

  const stats: StatItem[] = [
    { label: "Kontakte gesamt", value: profiles.length, href: "/candidates", hint: "alle Profile" },
    { label: "Co-Founder", value: countByRole("cofounder"), href: "/candidates?networkRole=cofounder", hint: "suchen ein Team" },
    { label: "Investor:innen", value: countByRole("investor"), href: "/candidates?networkRole=investor", hint: "Angels & VCs" },
    { label: "Mentor:innen", value: countByRole("mentor"), href: "/candidates?networkRole=mentor", hint: "Rat & Erfahrung" },
    { label: "Talente", value: countByRole("talent"), href: "/candidates?networkRole=talent", hint: "erste Hires" },
    { label: "Events", value: getEvents().length, href: "/events", hint: "Konferenzen & Meetups" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {stats.map((s) => (
        <Stat key={s.label} label={s.label} value={s.value.toLocaleString("de-DE")} hint={s.hint} href={s.href} />
      ))}
    </div>
  );
}
