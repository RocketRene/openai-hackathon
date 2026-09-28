"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark, Sidebar, getPageTitle } from "./Sidebar";
import { useUserContext } from "@/lib/user-context";
import { Avatar, Badge, LinkButton, cx } from "@/components/ui";

const ROLE_LABELS: Record<string, string> = {
  tech: "Tech",
  commercial: "Commercial",
  product: "Product",
  design: "Design",
  operations: "Operations",
  "domain-expert": "Domain-Expert",
};

const iconButton =
  "inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius)] text-[var(--foreground)] transition hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { userContext, ready } = useUserContext();
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  // Drawer per Escape schließen (Links schließen ihn über onNavigate)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-[var(--sidebar-width)] shrink-0 border-r border-[var(--border)] bg-[var(--sidebar-bg)] md:block">
        <div className="fr-scroll sticky top-0 h-screen overflow-y-auto">
          <Sidebar />
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="fr-fade-in absolute inset-0 bg-[var(--foreground)]/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <aside className="fr-scroll absolute left-0 top-0 h-full w-[min(20rem,85vw)] overflow-y-auto border-r border-[var(--border)] bg-[var(--sidebar-bg)] shadow-[var(--shadow-lg)]">
            <div className="flex items-center justify-end px-3 pt-3">
              <button type="button" className={iconButton} onClick={() => setOpen(false)} aria-label="Menü schließen">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="fr-app-bg flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[var(--header-height)] items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)]/80 px-4 backdrop-blur-md md:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" className={cx(iconButton, "-ml-2 md:hidden")} onClick={() => setOpen(true)} aria-label="Menü öffnen" aria-expanded={open}>
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <Link href="/" className="md:hidden" aria-label="Zum Dashboard">
              <LogoMark size={28} />
            </Link>
            <h2 className="truncate text-[15px] font-semibold tracking-tight text-[var(--foreground)]">{pageTitle}</h2>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {pathname !== "/assistant" && (
              <LinkButton href="/assistant" size="sm" className="hidden sm:inline-flex">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M12 3a4 4 0 0 1 4 4v4a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4Zm-7 8a7 7 0 0 0 14 0M12 18v3" />
                </svg>
                Agent starten
              </LinkButton>
            )}
            {ready && userContext?.name ? (
              <Link
                href="/onboarding"
                title="Profil bearbeiten"
                className="flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] py-1 pl-1 pr-3 text-sm shadow-[var(--shadow-sm)] transition hover:border-[var(--surface-3)] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                <Avatar name={userContext.name} size={30} />
                <span className="hidden max-w-32 truncate font-medium text-[var(--foreground)] sm:inline">{userContext.name}</span>
                {userContext.founderRole && <Badge tone="accent">{ROLE_LABELS[userContext.founderRole] ?? userContext.founderRole}</Badge>}
              </Link>
            ) : (
              <LinkButton href="/onboarding" size="sm" variant="secondary">
                Profil anlegen
              </LinkButton>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
