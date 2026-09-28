"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";
import { useLocale, type Locale } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/* Navigation (auch vom Header genutzt – Seitentitel aus der Route)   */
/* ------------------------------------------------------------------ */

type IconName =
  | "dashboard"
  | "agent"
  | "candidates"
  | "shortlist"
  | "outreach"
  | "team"
  | "tips"
  | "events"
  | "network"
  | "profile"
  | "settings";

export type NavItem = { href: string; label: string; labelEn: string; title: string; titleEn: string; icon: IconName };
export type NavGroup = { title: string; titleEn: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Finden",
    titleEn: "Find",
    items: [
      { href: "/", label: "Dashboard", labelEn: "Dashboard", title: "Überblick & Top-Matches", titleEn: "Overview & top matches", icon: "dashboard" },
      { href: "/assistant", label: "Agent", labelEn: "Agent", title: "Interview per Text & Voice", titleEn: "Interview via text & voice", icon: "agent" },
      { href: "/candidates", label: "Kandidaten", labelEn: "Candidates", title: "Suchen & filtern", titleEn: "Search & filter", icon: "candidates" },
      { href: "/shortlist", label: "Shortlist", labelEn: "Shortlist", title: "Gemerkte Kontakte", titleEn: "Saved contacts", icon: "shortlist" },
    ],
  },
  {
    title: "Vorbereiten",
    titleEn: "Prepare",
    items: [
      { href: "/outreach", label: "Outreach", labelEn: "Outreach", title: "Personalisierte Nachrichten", titleEn: "Personalised messages", icon: "outreach" },
      { href: "/team", label: "Team-Radar", labelEn: "Team radar", title: "Was fehlt im Team?", titleEn: "What is missing in the team?", icon: "team" },
      { href: "/tips", label: "Tipps", labelEn: "Tips", title: "Was fehlt dem Start-up?", titleEn: "What does the start-up need?", icon: "tips" },
    ],
  },
  {
    title: "Kontext",
    titleEn: "Context",
    items: [
      { href: "/events", label: "Events", labelEn: "Events", title: "Konferenzen & Teilnehmer:innen", titleEn: "Conferences & attendees", icon: "events" },
      { href: "/network", label: "Netzwerk", labelEn: "Network", title: "Das Ökosystem in Zahlen", titleEn: "The ecosystem in numbers", icon: "network" },
      { href: "/onboarding", label: "Mein Profil", labelEn: "My profile", title: "Kontext & Selbsteinschätzung", titleEn: "Context & self-assessment", icon: "profile" },
      { href: "/settings", label: "Einstellungen", labelEn: "Settings", title: "Status & Daten", titleEn: "Status & data", icon: "settings" },
    ],
  },
];

function isActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Seitentitel aus der Route ableiten (für den Header). Routen ohne Nav-Eintrag bekommen einen Fallback. */
export function getPageTitle(pathname: string, locale: Locale = "de"): string {
  const en = locale === "en";
  if (pathname.startsWith("/prep/")) return en ? "Conversation prep" : "Gesprächsvorbereitung";
  if (pathname.startsWith("/styleguide")) return "Styleguide";
  for (const group of NAV_GROUPS) {
    const hit = group.items.find((item) => isActive(item.href, pathname));
    if (hit) return en ? hit.labelEn : hit.label;
  }
  return "Voya";
}

/* ------------------------------------------------------------------ */
/* Inline-Icons (24er Raster, Stroke) – keine Icon-Library             */
/* ------------------------------------------------------------------ */

const ICON_PATHS: Record<IconName, string> = {
  dashboard: "M4 5a1 1 0 0 1 1-1h5v7H4V5Zm0 9h6v6H5a1 1 0 0 1-1-1v-5Zm10-10h5a1 1 0 0 1 1 1v3h-6V4Zm0 7h6v8a1 1 0 0 1-1 1h-5v-9Z",
  agent: "M12 3a4 4 0 0 1 4 4v4a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4Zm-7 8a7 7 0 0 0 14 0M12 18v3m-4 0h8",
  candidates: "M11 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm4.5 10.5L20 19",
  shortlist: "m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z",
  outreach: "M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm0 1 9 6 9-6",
  team: "M12 3v9l6.5 3.8M12 12 5.5 15.8M12 3a9 9 0 1 1-9 9 9 9 0 0 1 9-9Z",
  tips: "M9 18h6m-5 3h4M12 3a6 6 0 0 0-3.5 10.9c.8.6 1.3 1.3 1.5 2.1h4c.2-.8.7-1.5 1.5-2.1A6 6 0 0 0 12 3Z",
  events: "M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm-1 5h16M8 3v4m8-4v4",
  network: "M12 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-7 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm14 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM12 5v6m0 0-6 5m6-5 6 5",
  profile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3 1.6-1.2-1.5-2.6-1.9.6a7 7 0 0 0-1.7-1l-.3-2H10.4l-.3 2a7 7 0 0 0-1.7 1l-1.9-.6L5 10.8 6.6 12 5 13.2l1.5 2.6 1.9-.6a7 7 0 0 0 1.7 1l.3 2h3.2l.3-2a7 7 0 0 0 1.7-1l1.9.6 1.5-2.6L19.4 12Z",
};

export function NavIcon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg className={cx("h-[18px] w-[18px] shrink-0", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

/** Wortmarke: Radar-Kreise mit Punkt. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={cx("shrink-0", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <g fill="none" stroke="var(--accent-contrast)" strokeWidth="1.6">
        <circle cx="16" cy="16" r="10" strokeOpacity="0.45" />
        <circle cx="16" cy="16" r="6" strokeOpacity="0.75" />
        <path d="M16 16 23.5 8.5" strokeLinecap="round" />
      </g>
      <circle cx="16" cy="16" r="2.2" fill="var(--accent-contrast)" />
      <circle cx="21" cy="19" r="1.4" fill="var(--accent-contrast)" fillOpacity="0.85" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Sidebar                                                             */
/* ------------------------------------------------------------------ */

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [locale] = useLocale();
  const en = locale === "en";
  return (
    <nav className="flex h-full flex-col gap-6 p-4" aria-label={en ? "Main navigation" : "Hauptnavigation"}>
      <Link href="/" className="flex items-center gap-3 rounded-[var(--radius)] px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" onClick={onNavigate}>
        <LogoMark size={34} className="shadow-[var(--shadow-sm)]" />
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold tracking-tight text-[var(--foreground)]">Voya</span>
          <span className="block truncate text-[11px] text-[var(--muted)]">{en ? "Find the right people" : "Die richtigen Menschen finden"}</span>
        </span>
      </Link>

      <div className="flex flex-col gap-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{en ? group.titleEn : group.title}</p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href, pathname);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      title={en ? item.titleEn : item.title}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "relative flex h-10 items-center gap-3 rounded-[var(--radius)] px-3 text-sm transition-[background-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                        active ? "bg-[var(--accent-soft)] font-semibold text-[var(--accent)]" : "text-[var(--foreground)] hover:bg-[var(--surface-2)]",
                      )}
                    >
                      {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--accent)]" aria-hidden />}
                      <NavIcon name={item.icon} className={active ? "text-[var(--accent)]" : "text-[var(--muted)]"} />
                      <span className="truncate">{en ? item.labelEn : item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5">
        <p className="flex items-center gap-2 text-[11px] font-medium text-[var(--foreground)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" aria-hidden />
          OpenAI Hackathon 2026
        </p>
        <p className="mt-0.5 text-[11px] text-[var(--muted)]">{en ? "IdeaLab data · 569 profiles" : "IdeaLab-Daten · 569 Profile"}</p>
        <Link href="/styleguide" onClick={onNavigate} className="mt-1.5 inline-block text-[11px] font-medium text-[var(--accent)] hover:underline">
          Styleguide →
        </Link>
      </div>
    </nav>
  );
}
