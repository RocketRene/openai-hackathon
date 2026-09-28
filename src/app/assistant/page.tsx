import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { T } from "@/lib/i18n";
import AssistantWorkspace from "@/components/assistant/AssistantWorkspace";

export const metadata: Metadata = {
  title: "Agent – Voya",
  description: "Interview, Kandidaten, Vorbereitung – per Text oder Voice",
};

export default function AssistantPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <PageHeader
        title="Agent"
        subtitle={
          <T de="Interview, Kandidaten, Vorbereitung – per Text oder Voice" en="Interview, candidates, preparation – via text or voice" />
        }
      />
      <AssistantWorkspace />
    </div>
  );
}
