import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import OutreachWorkspace from "@/components/outreach/OutreachWorkspace";

export const metadata: Metadata = {
  title: "Outreach – Voya",
  description: "Personalisierte Nachrichten – passend zum Persönlichkeitstyp",
};

export default function OutreachPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <PageHeader title="Outreach" subtitle="Personalisierte Nachrichten – passend zum Persönlichkeitstyp" />
      <Suspense fallback={<p className="text-sm text-[var(--muted)]">Lade priorisierte Kontakte…</p>}>
        <OutreachWorkspace />
      </Suspense>
    </div>
  );
}
