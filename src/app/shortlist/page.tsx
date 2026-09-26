import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import ShortlistCompare from "@/components/candidates/ShortlistCompare";

export const metadata: Metadata = {
  title: "Shortlist – Voya",
  description: "Gemerkte Kontakte im Vergleich.",
};

export default function ShortlistPage() {
  return (
    <div>
      <PageHeader title="Shortlist" subtitle="Deine gemerkten Kontakte im Vergleich" />
      <ShortlistCompare />
    </div>
  );
}
