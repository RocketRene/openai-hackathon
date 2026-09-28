/**
 * Zahlformatierung, die der aktiven Sprache folgt (DE: 1.234,5 / 42 % – EN: 1,234.5 / 42%).
 * Server-seitig vorbereitet, <T> wählt clientseitig die Variante.
 */
import { T } from "@/lib/i18n";

function nf(locale: string, digits: number) {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatNumber(value: number, digits = 0): { de: string; en: string } {
  return { de: nf("de-DE", digits).format(value), en: nf("en-US", digits).format(value) };
}

/** Zahl in der aktiven Sprache, z. B. 1.234 / 1,234. */
export function Num({ value, digits = 0 }: { value: number; digits?: number }) {
  const f = formatNumber(value, digits);
  return <T de={f.de} en={f.en} />;
}

/** Anteil in Prozent, z. B. „42 %“ / „42%“. */
export function Pct({ part, total }: { part: number; total: number }) {
  const f = formatNumber(total ? (part / total) * 100 : 0, 0);
  return <T de={`${f.de} %`} en={`${f.en}%`} />;
}
