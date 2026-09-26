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
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <PageHeader
        title="Kandidaten"
        subtitle={`${total.toLocaleString("de-DE")} Profile aus IdeaLab 2026 und Demo-Daten, priorisiert für dich`}
      />
      <CandidateList />
    </div>
  );
}
