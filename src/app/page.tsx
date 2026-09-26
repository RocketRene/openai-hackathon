import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import DashboardHome from "@/components/dashboard/DashboardHome";

export const metadata: Metadata = {
  title: "Voya – Dashboard",
  description: "Finde die richtigen Menschen für dein Start-up – aus IdeaLab 2026 und darüber hinaus.",
};

export default function Home() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Voya"
        subtitle="Finde die richtigen Menschen für dein Start-up – aus IdeaLab 2026 und darüber hinaus"
      />
      <DashboardHome />
    </div>
  );
}
