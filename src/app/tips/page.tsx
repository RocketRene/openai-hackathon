import type { Metadata } from "next";
import TipsPanel from "@/components/tips/TipsPanel";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Tipps – FounderRadar",
  description: "Was deinem Start-up noch fehlt: Team, Skills, Produkt, Fundraising, Netzwerk.",
};

export default function TipsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <PageHeader title="Tipps" subtitle="Was deinem Start-up noch fehlt" />
      <TipsPanel />
    </div>
  );
}
