import type { Metadata } from "next";
import TeamBuilder from "@/components/team/TeamBuilder";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Team-Radar – FounderRadar",
  description: "Vision, Design, Technik, Detail und Umsetzung im Gründerteam – was ist stark, was fehlt noch?",
};

export default function TeamPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Team-Radar"
        subtitle="Vision · Design/Visuell · Technik · Detail · Umsetzung – wie gut kann dieses Business werden, und wer fehlt noch im Team?"
      />
      <TeamBuilder />
    </div>
  );
}
