import type { Metadata } from "next";
import TipsPanel from "@/components/tips/TipsPanel";
import { PageHeader } from "@/components/ui";
import { T } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Tipps – Voya",
  description: "Was deinem Start-up noch fehlt: Team, Skills, Produkt, Fundraising, Netzwerk.",
};

export default function TipsPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        kicker={<T de="Coaching" en="Coaching" />}
        title={<T de="Tipps" en="Tips" />}
        subtitle={
          <T
            de="Was deinem Start-up noch fehlt – Team, Skills, Produkt, Fundraising und Netzwerk, abgeleitet aus deinem Profil."
            en="What your start-up is still missing – team, skills, product, fundraising and network, derived from your profile."
          />
        }
      />
      <TipsPanel />
    </div>
  );
}
