import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import AssistantWorkspace from "@/components/assistant/AssistantWorkspace";

export const metadata: Metadata = {
  title: "Agent – Voya",
  description: "Interview, Kandidaten, Vorbereitung – per Text oder Voice",
};

export default function AssistantPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <PageHeader title="Agent" subtitle="Interview, Kandidaten, Vorbereitung – per Text oder Voice" />
      <AssistantWorkspace />
    </div>
  );
}
