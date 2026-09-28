import type { Metadata } from "next";
import { CandidateList } from "@/components/candidates/CandidateList";
import { PageHeader } from "@/components/ui";
import { getProfiles } from "@/lib/data";
import { T } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Kandidaten · Voya",
  description: "Durchsuchbare Profile aus IdeaLab 2026 und Demo-Daten, priorisiert nach Match-Score.",
};

export default function CandidatesPage() {
  const profiles = getProfiles();
  const real = profiles.filter((p) => p.source?.type === "linkedin" || p.source?.type === "conference").length;
  const totalDe = profiles.length.toLocaleString("de-DE");
  const realDe = real.toLocaleString("de-DE");
  const totalEn = profiles.length.toLocaleString("en-US");
  const realEn = real.toLocaleString("en-US");
  return (
    <div>
      <PageHeader
        kicker={<T de="Netzwerk" en="Network" />}
        title={<T de="Kandidaten" en="Candidates" />}
        subtitle={
          <T
            de={`${totalDe} Profile – ${realDe} davon von der IdeaLab 2026 – nach Rolle, Vertical, Event und Persönlichkeitstyp durchsuchbar und für dich priorisiert.`}
            en={`${totalEn} profiles – ${realEn} of them from IdeaLab 2026 – searchable by role, vertical, event and personality type, and prioritized for you.`}
          />
        }
      />
      <CandidateList />
    </div>
  );
}
