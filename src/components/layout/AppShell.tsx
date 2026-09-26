"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Sidebar } from "./Sidebar";
import { useUserContext } from "@/lib/user-context";
import { Badge, Button } from "@/components/ui";

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { userContext, ready } = useUserContext();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-[var(--sidebar-width)] shrink-0 border-r border-[var(--border)] bg-[var(--surface)] md:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <Sidebar />
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-[var(--surface)] shadow-xl">
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)]/90 px-4 py-2 backdrop-blur">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setOpen(true)} aria-label="Menü">
              ☰
            </Button>
            <span className="text-sm text-[var(--muted)]">Co-Founder · Investoren · Mentor:innen · Talente</span>
          </div>
          <div className="flex items-center gap-2">
            {ready && userContext?.name ? (
              <Link href="/onboarding" className="flex items-center gap-2 text-sm">
                <Badge tone="accent">{userContext.founderRole ?? "Profil"}</Badge>
                <span className="font-medium">{userContext.name}</span>
              </Link>
            ) : (
              <Link href="/onboarding" className="text-sm text-[var(--accent)]">
                Profil anlegen
              </Link>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
