import type { Metadata } from "next";
import TeamBuilder from "@/components/team/TeamBuilder";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Team-Radar – Voya",
  description: "Vision, Design, Technik, Detail und Umsetzung im Gründerteam – was ist stark, was fehlt noch?",
};

export default function TeamPage() {
  return (
    <div>
      <PageHeader
        kicker="Team"
        title="Team-Radar"
        subtitle="Vision · Design/Visuell · Technik · Detail · Umsetzung – wie stark ist das Team heute, und wer fehlt noch?"
      />
      <TeamBuilder />
    </div>
  );
}
