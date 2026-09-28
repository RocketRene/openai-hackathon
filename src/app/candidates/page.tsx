import type { Metadata } from "next";
import { CandidateList } from "@/components/candidates/CandidateList";
import { PageHeader } from "@/components/ui";
import { getProfiles } from "@/lib/data";

export const metadata: Metadata = {
  title: "Kandidaten · Voya",
  description: "Durchsuchbare Profile aus IdeaLab 2026 und Demo-Daten, priorisiert nach Match-Score.",
};

export default function CandidatesPage() {
  const profiles = getProfiles();
  const real = profiles.filter((p) => p.source?.type === "linkedin" || p.source?.type === "conference").length;
  return (
    <div>
      <PageHeader
        kicker="Netzwerk"
        title="Kandidaten"
        subtitle={`${profiles.length.toLocaleString("de-DE")} Profile – ${real.toLocaleString("de-DE")} davon von der IdeaLab 2026 – nach Rolle, Vertical, Event und Persönlichkeitstyp durchsuchbar und für dich priorisiert.`}
      />
      <CandidateList />
    </div>
  );
}
