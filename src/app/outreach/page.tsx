import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { T } from "@/lib/i18n";
import OutreachWorkspace, { OutreachWorkspaceSkeleton } from "@/components/outreach/OutreachWorkspace";

export const metadata: Metadata = {
  title: "Outreach – Voya",
  description: "Personalisierte Nachrichten – passend zum Persönlichkeitstyp",
};

export default function OutreachPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        kicker={<T de="Kontakt aufnehmen" en="Reach out" />}
        title="Outreach"
        subtitle={
          <T
            de="Personalisierte Nachrichten für deine priorisierten Kontakte – passend zum Persönlichkeitstyp der Person, per E-Mail oder LinkedIn."
            en="Personalized messages for your prioritized contacts – tuned to the person’s personality type, via email or LinkedIn."
          />
        }
      />
      <Suspense fallback={<OutreachWorkspaceSkeleton />}>
        <OutreachWorkspace />
      </Suspense>
    </div>
  );
}
