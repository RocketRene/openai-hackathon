import SettingsHeader from "@/components/settings/SettingsHeader";
import SettingsPanel from "@/components/settings/SettingsPanel";

export const metadata = {
  title: "Einstellungen · Settings – Voya",
};

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <SettingsHeader />
      <SettingsPanel />
    </div>
  );
}
