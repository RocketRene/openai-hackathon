import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import NetworkOverview from "@/components/network/NetworkOverview";

export const metadata: Metadata = {
  title: "Netzwerk-Analyse – Voya",
  description: "Das Ökosystem hinter den Daten: Rollen, Verticals, Standorte, Hochschulen und Events aller Teilnehmer:innen.",
};

export default function NetworkPage() {
  return (
    <div>
      <PageHeader title="Netzwerk-Analyse" subtitle="Das Ökosystem hinter den Daten" />
      <NetworkOverview />
    </div>
  );
}
