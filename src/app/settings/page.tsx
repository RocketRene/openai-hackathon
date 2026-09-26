import { PageHeader } from "@/components/ui";
import SettingsPanel from "@/components/settings/SettingsPanel";

export const metadata = {
  title: "Einstellungen – Voya",
};

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <PageHeader title="Einstellungen" subtitle="Status, Daten und dein Kontext" />
      <SettingsPanel />
    </div>
  );
}
