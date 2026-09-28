import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import PrepWorkspace from "@/components/prep/PrepWorkspace";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const profile = getProfile(id);
  return {
    title: profile ? `Gespräch vorbereiten: ${profile.name} – Voya` : "Gespräch vorbereiten – Voya",
  };
}

export default async function PrepPage({ params }: { params: Params }) {
  const { id } = await params;
  const profile = getProfile(id);
  if (!profile) notFound();

  // Layout/Shell (main, max-w, Padding) kommt global aus AppShell.
  return (
    <>
      <PageHeader
        kicker="Vorbereitung & Simulation"
        title="Gespräch vorbereiten"
        subtitle={`Wahrscheinliche Fragen, Talking Points und eine Gesprächssimulation – zugeschnitten auf ${profile.name}.`}
      />
      <PrepWorkspace profile={profile} />
    </>
  );
}
