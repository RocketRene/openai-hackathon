import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import OnboardingForm from "@/components/onboarding/OnboardingForm";

export const metadata: Metadata = {
  title: "Dein Profil – Voya",
  description: "Onboarding: Rolle, gesuchte Kontakte, Verticals, Idee, Stärken und Selbsteinschätzung.",
};

export default function OnboardingPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        kicker="Onboarding"
        title="Dein Profil"
        subtitle="Fünf kurze Abschnitte – damit Agent und Matching wissen, wer du bist und wen du suchst. Alles lässt sich später ändern."
      />
      <OnboardingForm />
    </div>
  );
}
