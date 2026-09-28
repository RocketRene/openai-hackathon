"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { useUserContext } from "@/lib/user-context";
import { Avatar, Badge, Button, LinkButton } from "@/components/ui";
import { LanguageToggle, useLocale } from "@/lib/i18n";

const ROLE_LABELS: Record<string, string> = {
  tech: "Tech",
  commercial: "Commercial",
  product: "Product",
  design: "Design",
  operations: "Operations",
  "domain-expert": "Domain-Expert",
};

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { userContext, ready } = useUserContext();
  const pathname = usePathname();
  const [locale] = useLocale();
  const en = locale === "en";

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-[var(--sidebar-width)] shrink-0 border-r border-[var(--border)] bg-[var(--sidebar-bg)] md:block">
        <div className="sticky top-0 h-screen overflow-y-auto fr-scroll">
          <Sidebar />
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-[var(--sidebar-bg)] shadow-[var(--shadow-md)]">
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)]/85 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setOpen(true)} aria-label="Menü öffnen">
              ☰
            </Button>
            <span className="hidden text-xs text-[var(--muted)] sm:inline">
              {pathname === "/assistant"
                ? en
                  ? "Talk to Voya – e.g. “Show me Max”"
                  : "Sprich mit Voya – sag z. B. „Guck dir mal den Max an“"
                : en
                  ? "Find the right people for your start-up"
                  : "Finde die richtigen Menschen für dein Start-up"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <LinkButton href="/assistant" size="sm" variant={pathname === "/assistant" ? "secondary" : "primary"}>
              ◉ {en ? "Start agent" : "Agent starten"}
            </LinkButton>
            {ready && userContext?.name ? (
              <Link href="/onboarding" className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] py-1 pl-1 pr-3 text-sm shadow-[var(--shadow-sm)]">
                <Avatar name={userContext.name} size={26} />
                <span className="hidden font-medium sm:inline">{userContext.name}</span>
                {userContext.founderRole && <Badge tone="accent">{ROLE_LABELS[userContext.founderRole] ?? userContext.founderRole}</Badge>}
              </Link>
            ) : (
              <LinkButton href="/onboarding" size="sm" variant="secondary">
                {en ? "Create profile" : "Profil anlegen"}
              </LinkButton>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
