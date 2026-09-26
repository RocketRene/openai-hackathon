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
      <PageHeader title="Dein Profil" subtitle="Damit der Agent und das Matching wissen, wen du suchst" />
      <OnboardingForm />
    </div>
  );
}
