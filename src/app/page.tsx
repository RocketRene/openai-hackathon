import type { Metadata } from "next";
import DashboardHome from "@/components/dashboard/DashboardHome";

export const metadata: Metadata = {
  title: "Voya – Dashboard",
  description: "Finde die richtigen Menschen für dein Start-up – aus IdeaLab 2026 und darüber hinaus.",
};

export default function Home() {
  return <DashboardHome />;
}
