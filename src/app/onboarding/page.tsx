import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import OnboardingForm from "@/components/onboarding/OnboardingForm";

export const metadata: Metadata = {
  title: "Dein Profil – Voya",
  description: "Onboarding in drei Schritten: wer du bist, woran du arbeitest, wen du suchst.",
};

export default function OnboardingPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        kicker="Onboarding"
        title="Dein Profil"
        subtitle="Drei kurze Schritte – damit Matching und Agent wissen, wer du bist und wen du suchst."
      />
      <OnboardingForm />
    </div>
  );
}
