/**
 * Teilnehmerlisten → E-Mail-Adressen für den Outreach.
 * ---------------------------------------------------------------
 * „Von Konferenzen scrapen wir die E-Mails“: Veranstalter geben Teilnehmerlisten heraus
 * (Event-App-Export, Badge-Scan, Excel). `scripts/import-attendees.mjs` normalisiert so eine
 * CSV nach `src/data/attendees.json`; dieses Modul ordnet die Einträge unseren Profilen zu –
 * über den LinkedIn-Username (sicher) oder den normalisierten Namen (Fallback).
 *
 * Outreach-Flow: `src/lib/outreach.ts` liefert den OutreachDraft (Betreff + Text), dieses Modul
 * die Adresse: `getEmailForProfile(profile)` → `mailtoLink(profile, draft)` → Button
 * „In Mail-App öffnen“ auf der Outreach-Seite. Die App versendet nichts selbst (nur `mailto:`),
 * braucht also keinen Mail-Server – demo-sicher. `attendeeCoverage()` zeigt im Dashboard, für
 * wie viele Kandidat:innen wir überhaupt eine Adresse haben.
 *
 * Isomorph: statischer JSON-Import, keine Node-APIs → Server- und Client-Komponenten.
 * Profile weiterhin nur über `src/lib/data.ts` laden; dieses Modul kennt nur die Teilnehmerliste.
 */
import type { Profile } from "./types";
import attendeesJson from "@/data/attendees.json";

/** Ein Eintrag der importierten Teilnehmerliste (erzeugt von scripts/import-attendees.mjs). */
export interface Attendee {
  name: string;
  /** Kleingeschrieben, eindeutig – der Merge-Schlüssel des Imports. */
  email: string;
  company?: string;
  /** Event-Slug wie in src/data/events.json, z. B. "idealab-2026". */
  event?: string;
  /** Kanonisch: https://www.linkedin.com/in/<username> */
  linkedinUrl?: string;
  /** Kleingeschrieben, ohne Akzente/Sonderzeichen – siehe normalizeName(). */
  nameKey: string;
}

const ATTENDEES: Attendee[] = attendeesJson as unknown as Attendee[];

/* ---------- Normalisierung (identisch in scripts/import-attendees.mjs – synchron halten!) ---------- */

const SPECIAL_LETTERS: Record<string, string> = { ß: "ss", ø: "o", æ: "ae", œ: "oe", đ: "d", ł: "l", þ: "th", ð: "d" };

/** "Dr. Henrik Ólafsson" → "dr henrik olafsson" */
export function normalizeName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[ßøæœđłþð]/g, (c) => SPECIAL_LETTERS[c] ?? c)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Username aus einer LinkedIn-URL, egal wie unsauber (Query-Params, de.linkedin.com, ohne Schema). */
export function linkedinUsername(url?: string | null): string | undefined {
  if (!url) return undefined;
  const match = /linkedin\.com\/in\/([^/?#\s]+)/i.exec(url);
  if (!match) return undefined;
  try {
    return decodeURIComponent(match[1]).toLowerCase();
  } catch {
    return match[1].toLowerCase();
  }
}

/** Titel und Initialen raus, nur Vor- + Nachname: "dr max a brandt" → "max brandt". */
const TITLE_TOKENS = new Set(["dr", "prof", "dipl", "ing", "mba", "msc", "bsc", "phd", "med", "rer", "nat", "jur"]);
function looseKey(nameKey: string): string | undefined {
  const tokens = nameKey.split(" ").filter((t) => t.length > 1 && !TITLE_TOKENS.has(t));
  return tokens.length >= 2 ? `${tokens[0]} ${tokens[tokens.length - 1]}` : undefined;
}

/* ---------- Indizes (einmal beim Laden, die Liste ist klein) ---------- */

const byLinkedin = new Map<string, Attendee>();
const byNameKey = new Map<string, Attendee[]>();
const byLooseKey = new Map<string, Attendee[]>();

function push(index: Map<string, Attendee[]>, key: string, attendee: Attendee): void {
  const list = index.get(key);
  if (list) list.push(attendee);
  else index.set(key, [attendee]);
}

for (const attendee of ATTENDEES) {
  const user = linkedinUsername(attendee.linkedinUrl);
  if (user && !byLinkedin.has(user)) byLinkedin.set(user, attendee);
  const key = attendee.nameKey || normalizeName(attendee.name);
  if (key) push(byNameKey, key, attendee);
  const loose = looseKey(key);
  if (loose) push(byLooseKey, loose, attendee);
}

/**
 * Bei Namensvettern gewinnt, wer beim selben Event war. Bleibt es mehrdeutig, nimmt der exakte
 * Namens-Match trotzdem den ersten Treffer, der lose Match (nur Vor-/Nachname) lieber keinen.
 */
function pick(candidates: Attendee[] | undefined, profile: Profile, requireUnique: boolean): Attendee | undefined {
  if (!candidates?.length) return undefined;
  const sameEvent = candidates.filter((a) => a.event && profile.events.includes(a.event));
  if (sameEvent.length === 1) return sameEvent[0];
  if (candidates.length === 1) return candidates[0];
  return requireUnique ? undefined : candidates[0];
}

/* ---------- Public API ---------- */

export function getAttendees(): Attendee[] {
  return ATTENDEES;
}

/** LinkedIn-Username zuerst (eindeutig), sonst exakter Namens-Match, sonst Vor-/Nachname ohne Titel. */
export function findAttendeeForProfile(profile: Profile): Attendee | undefined {
  const user = linkedinUsername(profile.linkedinUrl);
  if (user) {
    const hit = byLinkedin.get(user);
    if (hit) return hit;
  }
  const key = normalizeName(profile.name);
  if (!key) return undefined;
  const exact = pick(byNameKey.get(key), profile, false);
  if (exact) return exact;
  const loose = looseKey(key);
  return loose ? pick(byLooseKey.get(loose), profile, true) : undefined;
}

/** E-Mail für den Outreach: eigene Adresse im Profil bevorzugt, sonst aus der Teilnehmerliste. */
export function getEmailForProfile(profile: Profile): string | undefined {
  const own = profile.email?.trim();
  if (own) return own;
  return findAttendeeForProfile(profile)?.email;
}

/** Für das Dashboard: für wie viele Kandidat:innen haben wir eine Adresse? */
export function attendeeCoverage(profiles: Profile[]): { withEmail: number; total: number } {
  let withEmail = 0;
  for (const profile of profiles) if (getEmailForProfile(profile)) withEmail++;
  return { withEmail, total: profiles.length };
}

/** mailto:-Link für den Outreach-Button (nimmt direkt einen OutreachDraft); undefined ohne Adresse. */
export function mailtoLink(profile: Profile, draft?: { subject?: string; body?: string }): string | undefined {
  const email = getEmailForProfile(profile);
  if (!email) return undefined;
  const params = new URLSearchParams();
  if (draft?.subject) params.set("subject", draft.subject);
  if (draft?.body) params.set("body", draft.body);
  const query = params.toString().replace(/\+/g, "%20");
  return `mailto:${email}${query ? `?${query}` : ""}`;
}
