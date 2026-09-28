"use client";
/**
 * Zweisprachiger Seitenkopf der Einstellungen. PageHeader erwartet Strings, deshalb läuft die
 * Übersetzung hier über useT statt über <T> in der Server-Page.
 */
import { PageHeader } from "@/components/ui";
import { useT, type Dict } from "@/lib/i18n";

const DICT = {
  title: { de: "Einstellungen", en: "Settings" },
  subtitle: {
    de: "Systemstatus, Sprache, dein lokaler Kontext und die Datenquellen – alles an einem Ort.",
    en: "System status, language, your local context and the data sources – all in one place.",
  },
} satisfies Dict;

export default function SettingsHeader() {
  const t = useT(DICT);
  return <PageHeader title={t("title")} subtitle={t("subtitle")} />;
}
