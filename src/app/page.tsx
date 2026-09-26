import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import DashboardHome from "@/components/dashboard/DashboardHome";

export const metadata: Metadata = {
  title: "FounderRadar – Dashboard",
  description: "Finde die richtigen Menschen für dein Start-up – aus IdeaLab 2026 und darüber hinaus.",
};

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <PageHeader
        title="FounderRadar"
        subtitle="Finde die richtigen Menschen für dein Start-up – aus IdeaLab 2026 und darüber hinaus"
      />
      <DashboardHome />
    </div>
  );
}
