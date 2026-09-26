import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEvent, getProfile } from "@/lib/data";
import type { Event as EventInfo, Profile } from "@/lib/types";
import CandidateProfile from "@/components/candidates/CandidateProfile";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const profile = getProfile(id);
  if (!profile) return { title: "Kandidat:in nicht gefunden – FounderRadar" };
  return {
    title: `${profile.name} – FounderRadar`,
    description: profile.headline || profile.about?.slice(0, 160) || undefined,
  };
}

export default async function CandidatePage({ params }: Props) {
  const { id } = await params;
  const profile = getProfile(id);
  if (!profile) notFound();

  // Event-Namen serverseitig auflösen, damit die Client-Komponente kein Profil-JSON bündeln muss.
  const events = profile.events.map((slug) => getEvent(slug)).filter((e): e is EventInfo => Boolean(e));

  // source.raw (kompletter Scrape-Dump) bleibt auf dem Server – der Client braucht nur Typ und Datum.
  const lean: Profile = profile.source
    ? { ...profile, source: { type: profile.source.type, scrapedAt: profile.source.scrapedAt } }
    : profile;

  return <CandidateProfile profile={lean} events={events} />;
}
