import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import ShortlistCompare from "@/components/candidates/ShortlistCompare";

export const metadata: Metadata = {
  title: "Shortlist – FounderRadar",
  description: "Gemerkte Kontakte im Vergleich.",
};

export default function ShortlistPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <PageHeader title="Shortlist" subtitle="Deine gemerkten Kontakte im Vergleich" />
      <ShortlistCompare />
    </main>
  );
}
