import type { Metadata } from "next";
import ShortlistCompare, { ShortlistHeader } from "@/components/candidates/ShortlistCompare";

export const metadata: Metadata = {
  title: "Shortlist – Voya",
  description: "Gemerkte Kontakte im Vergleich · Saved contacts side by side.",
};

export default function ShortlistPage() {
  return (
    <div>
      {/* PageHeader nimmt nur Strings – die DE/EN-Texte kommen deshalb aus der Client-Komponente. */}
      <ShortlistHeader />
      <ShortlistCompare />
    </div>
  );
}
