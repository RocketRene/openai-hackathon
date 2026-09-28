import type { Metadata } from "next";
import { CandidateList } from "@/components/candidates/CandidateList";
import { PageHeader } from "@/components/ui";
import { getProfiles } from "@/lib/data";

export const metadata: Metadata = {
  title: "Kandidaten · Voya",
  description: "Durchsuchbare Profile aus IdeaLab 2026 und Demo-Daten, priorisiert nach Match-Score.",
};

export default function CandidatesPage() {
  const total = getProfiles().length;
  return (
    <div>
      <PageHeader
        kicker="Netzwerk"
        title="Kandidaten"
        subtitle={`${total.toLocaleString("de-DE")} Profile aus IdeaLab 2026 und Demo-Daten – gefiltert nach dem, was du suchst, und priorisiert nach Match-Score.`}
      />
      <CandidateList />
    </div>
  );
}
