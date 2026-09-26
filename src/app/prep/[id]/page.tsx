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

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
      <PageHeader title={`Gespräch vorbereiten: ${profile.name}`} subtitle={profile.headline} />
      <PrepWorkspace profile={profile} />
    </main>
  );
}
