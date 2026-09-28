import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { T } from "@/lib/i18n";
import NetworkOverview from "@/components/network/NetworkOverview";

export const metadata: Metadata = {
  title: "Netzwerk-Analyse – Voya",
  description: "Das Ökosystem hinter den Daten: Rollen, Verticals, Standorte, Hochschulen und Events aller Teilnehmer:innen.",
};

export default function NetworkPage() {
  return (
    <div>
      <PageHeader
        kicker="IdeaLab 2026"
        title={<T de="Netzwerk-Analyse" en="Network analysis" />}
        subtitle={
          <T
            de="Das Ökosystem hinter den Daten – wer hier ist, worum es geht und woher alle kommen."
            en="The ecosystem behind the data – who’s here, what it’s about and where everyone comes from."
          />
        }
      />
      <NetworkOverview />
    </div>
  );
}
