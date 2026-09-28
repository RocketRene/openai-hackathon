"use client";
/**
 * Leichtgewichtige Zweisprachigkeit (DE/EN) ohne Dependencies.
 * ---------------------------------------------------------------
 * - `useLocale()` liefert die aktive Sprache (localStorage `voya.locale`, Default "de").
 * - `useT(dict)` gibt eine t()-Funktion für ein seiten-/komponentenlokales Wörterbuch zurück.
 *   Jede Seite/Komponente hält ihr eigenes `Dict` (kein zentrales Registrieren → keine Merge-Konflikte).
 * - `<T de="…" en="…" />` rendert je nach Sprache – funktioniert auch als Kind von Server-Components.
 * - `<LanguageToggle />` sitzt im Header (AppShell).
 * Der Agent (Text/Voice) bekommt die Sprache über `ChatRequest.locale` bzw. `VoiceAgentProps.locale`.
 */
import { useCallback, useSyncExternalStore, type ReactNode } from "react";

export type Locale = "de" | "en";
export type Dict = Record<string, { de: string; en: string }>;

const STORAGE_KEY = "voya.locale";
const CHANGE_EVENT = "voya:locale-changed";

function subscribe(cb: () => void) {
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function getSnapshot(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

export function normalizeLocale(raw: string | null | undefined): Locale {
  return raw === "en" ? "en" : "de";
}

/** Nicht-Hook-Variante (z. B. in Event-Handlern oder Tools). */
export function getLocale(): Locale {
  if (typeof window === "undefined") return "de";
  return normalizeLocale(getSnapshot());
}

export function setLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
    window.dispatchEvent(new Event(CHANGE_EVENT));
    document.documentElement.lang = locale;
  } catch {
    /* ignore */
  }
}

export function useLocale(): [Locale, (locale: Locale) => void] {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return [normalizeLocale(raw), setLocale];
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}

/**
 * t()-Funktion für ein lokales Wörterbuch: `const t = useT(dict); t("title")`, Platzhalter `{name}`.
 * Unbekannte Keys fallen auf den Key selbst zurück (nie leer).
 */
export function useT<D extends Dict>(dict: D) {
  const [locale] = useLocale();
  return useCallback(
    (key: keyof D & string, vars?: Record<string, string | number>) => {
      const entry = dict[key];
      const text = entry ? entry[locale] ?? entry.de : key;
      return interpolate(text, vars);
    },
    [dict, locale],
  );
}

/** Rendert `de` oder `en` – auch innerhalb von Server-Components nutzbar. */
export function T({ de, en }: { de: ReactNode; en: ReactNode }) {
  const [locale] = useLocale();
  return <>{locale === "en" ? en : de}</>;
}

/** Wählt aus einem {de,en}-Paar (für Props, die Strings erwarten). */
export function pick(locale: Locale, de: string, en: string): string {
  return locale === "en" ? en : de;
}

export function LanguageToggle({ className }: { className?: string }) {
  const [locale, set] = useLocale();
  const base = "h-7 rounded-full px-2.5 text-[11px] font-semibold transition";
  return (
    <div
      className={["inline-flex items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--surface)] p-0.5", className ?? ""].join(" ")}
      role="group"
      aria-label="Sprache / Language"
    >
      {(["de", "en"] as Locale[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => set(l)}
          aria-pressed={locale === l}
          className={[
            base,
            locale === l ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "text-[var(--muted)] hover:text-[var(--foreground)]",
          ].join(" ")}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

/** Gemeinsame Begriffe, die viele Seiten brauchen. */
export const COMMON: Dict = {
  cofounder: { de: "Co-Founder", en: "Co-founder" },
  investor: { de: "Investor:in", en: "Investor" },
  mentor: { de: "Mentor:in", en: "Mentor" },
  talent: { de: "Talent", en: "Talent" },
  expert: { de: "Expert:in", en: "Expert" },
  tech: { de: "Tech", en: "Tech" },
  commercial: { de: "Commercial", en: "Commercial" },
  product: { de: "Product", en: "Product" },
  design: { de: "Design", en: "Design" },
  operations: { de: "Operations", en: "Operations" },
  "domain-expert": { de: "Domain-Expert", en: "Domain expert" },
  save: { de: "Speichern", en: "Save" },
  cancel: { de: "Abbrechen", en: "Cancel" },
  loading: { de: "Lädt …", en: "Loading …" },
  error: { de: "Etwas ist schiefgelaufen.", en: "Something went wrong." },
  retry: { de: "Erneut versuchen", en: "Retry" },
  loadDemo: { de: "Demo-Kontext laden", en: "Load demo context" },
  openProfile: { de: "Profil öffnen", en: "Open profile" },
  outreach: { de: "Outreach", en: "Outreach" },
  prep: { de: "Gespräch vorbereiten", en: "Prepare conversation" },
  shortlist: { de: "Merken", en: "Save" },
  shortlisted: { de: "Gemerkt ✓", en: "Saved ✓" },
  score: { de: "Match-Score", en: "Match score" },
  more: { de: "Mehr laden", en: "Load more" },
  all: { de: "Alle", en: "All" },
};
