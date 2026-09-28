import { PageHeader } from "@/components/ui";
import { T } from "@/lib/i18n";
import SettingsPanel from "@/components/settings/SettingsPanel";

export const metadata = {
  title: "Einstellungen · Settings – Voya",
};

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title={<T de="Einstellungen" en="Settings" />}
        subtitle={
          <T
            de="Systemstatus, Sprache, dein lokaler Kontext und die Datenquellen – alles an einem Ort."
            en="System status, language, your local context and the data sources – all in one place."
          />
        }
      />
      <SettingsPanel />
    </div>
  );
}
