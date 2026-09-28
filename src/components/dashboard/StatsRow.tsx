import { getEvents, getProfiles } from "@/lib/data";
import { T } from "@/lib/i18n";
import type { NetworkRole } from "@/lib/types";
import { Stat } from "@/components/ui";
import type { Bi } from "./shared";

interface StatItem {
  label: Bi;
  value: number;
  href: string;
  hint: Bi;
  /** Dezentes Unicode-Icon, passend zur Sidebar. */
  icon: string;
}

/** KPI-Reihe über den gesamten Datenbestand (Server-Component) – jede Kachel verlinkt. */
export default function StatsRow() {
  const profiles = getProfiles();
  const countByRole = (role: NetworkRole) => profiles.filter((p) => p.networkRole === role).length;

  const stats: StatItem[] = [
    {
      label: { de: "Kontakte gesamt", en: "Total contacts" },
      value: profiles.length,
      href: "/candidates",
      hint: { de: "alle Profile", en: "all profiles" },
      icon: "⌕",
    },
    {
      label: { de: "Co-Founder", en: "Co-founders" },
      value: countByRole("cofounder"),
      href: "/candidates?networkRole=cofounder",
      hint: { de: "suchen ein Team", en: "looking for a team" },
      icon: "◈",
    },
    {
      label: { de: "Investor:innen", en: "Investors" },
      value: countByRole("investor"),
      href: "/candidates?networkRole=investor",
      hint: { de: "Angels & VCs", en: "angels & VCs" },
      icon: "◆",
    },
    {
      label: { de: "Mentor:innen", en: "Mentors" },
      value: countByRole("mentor"),
      href: "/candidates?networkRole=mentor",
      hint: { de: "Rat & Erfahrung", en: "advice & experience" },
      icon: "◐",
    },
    {
      label: { de: "Talente", en: "Talent" },
      value: countByRole("talent"),
      href: "/candidates?networkRole=talent",
      hint: { de: "erste Hires", en: "first hires" },
      icon: "✦",
    },
    {
      label: { de: "Events", en: "Events" },
      value: getEvents().length,
      href: "/events",
      hint: { de: "Konferenzen & Meetups", en: "conferences & meetups" },
      icon: "▣",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {stats.map((s) => (
        <Stat
          key={s.href}
          label={<T {...s.label} />}
          value={s.value.toLocaleString("de-DE")}
          hint={<T {...s.hint} />}
          href={s.href}
          icon={
            <span aria-hidden className="text-base leading-none">
              {s.icon}
            </span>
          }
        />
      ))}
    </div>
  );
}
