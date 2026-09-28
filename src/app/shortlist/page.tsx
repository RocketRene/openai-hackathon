import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { T } from "@/lib/i18n";
import ShortlistCompare from "@/components/candidates/ShortlistCompare";

export const metadata: Metadata = {
  title: "Shortlist – Voya",
  description: "Gemerkte Kontakte im Vergleich · Saved contacts side by side.",
};

export default function ShortlistPage() {
  return (
    <div>
      <PageHeader
        kicker={<T de="Kandidat:innen" en="Candidates" />}
        title="Shortlist"
        subtitle={
          <T
            de="Deine gemerkten Kontakte nebeneinander – Match, Stärken und nächste Schritte auf einen Blick."
            en="Your saved contacts side by side – match, strengths and next steps at a glance."
          />
        }
      />
      <ShortlistCompare />
    </div>
  );
}
