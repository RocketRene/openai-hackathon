import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import OutreachWorkspace, { OutreachWorkspaceSkeleton } from "@/components/outreach/OutreachWorkspace";

export const metadata: Metadata = {
  title: "Outreach – Voya",
  description: "Personalisierte Nachrichten – passend zum Persönlichkeitstyp",
};

export default function OutreachPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Kontakt aufnehmen"
        title="Outreach"
        subtitle="Personalisierte Nachrichten für deine priorisierten Kontakte – passend zum Persönlichkeitstyp der Person, per E-Mail oder LinkedIn."
      />
      <Suspense fallback={<OutreachWorkspaceSkeleton />}>
        <OutreachWorkspace />
      </Suspense>
    </div>
  );
}
