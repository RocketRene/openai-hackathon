#!/usr/bin/env node
/**
 * Teilnehmerlisten-Import: CSV → src/data/attendees.json
 * ---------------------------------------------------------------
 * „Von Konferenzen scrapen wir die E-Mails“: Veranstalter geben Teilnehmerlisten heraus
 * (Event-App-Export, Badge-Scan, Excel). Dieses Skript liest so eine CSV, normalisiert sie und
 * schreibt sie als JSON-Array nach src/data/attendees.json. src/lib/attendees.ts ordnet die
 * Einträge dann unseren Profilen zu (LinkedIn-Username oder normalisierter Name) → E-Mail für
 * den Outreach (mailto:).
 *
 * Aufruf:  node scripts/import-attendees.mjs [pfad/zur/liste.csv] [--reset]
 *   - ohne Pfad: exports/sample-attendees.csv
 *   - Trenner (Komma / Semikolon / Tab) wird an der Kopfzeile erkannt, Anführungszeichen nach
 *     RFC 4180 (auch Zeilenumbrüche und "" innerhalb eines Feldes)
 *   - Spalten (Groß-/Kleinschreibung egal, deutsche/englische Synonyme): name | vorname+nachname,
 *     email, company, event, linkedin_url – nur email ist Pflicht
 *   - Mehrfachaufruf ist idempotent: gemerged wird nach E-Mail; --reset verwirft den Bestand
 *
 * Nur Node-Builtins, keine Abhängigkeiten.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_INPUT = path.join(ROOT, "exports", "sample-attendees.csv");
const OUTPUT = path.join(ROOT, "src", "data", "attendees.json");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COLUMN_ALIASES = {
  name: ["name", "full_name", "fullname", "display_name", "teilnehmer", "teilnehmerin", "attendee", "participant"],
  firstName: ["first_name", "firstname", "vorname", "given_name"],
  lastName: ["last_name", "lastname", "nachname", "surname", "family_name"],
  email: ["email", "e_mail", "mail", "email_address", "e_mail_adresse", "emailaddress"],
  company: ["company", "firma", "unternehmen", "organisation", "organization", "org", "startup"],
  event: ["event", "event_slug", "konferenz", "conference", "veranstaltung"],
  linkedinUrl: ["linkedin_url", "linkedin", "linkedinurl", "linkedin_profile", "linkedin_profil", "li_url"],
};

/* ---------- Normalisierung (identisch in src/lib/attendees.ts – synchron halten!) ---------- */

const SPECIAL_LETTERS = { ß: "ss", ø: "o", æ: "ae", œ: "oe", đ: "d", ł: "l", þ: "th", ð: "d" };

/** "Dr. Henrik Ólafsson" → "dr henrik olafsson" */
function normalizeName(name) {
  return String(name ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[ßøæœđłþð]/g, (c) => SPECIAL_LETTERS[c] ?? c)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Username aus einer LinkedIn-URL, egal wie unsauber (Query-Params, de.linkedin.com, ohne Schema). */
function linkedinUsername(url) {
  if (!url) return undefined;
  const match = /linkedin\.com\/in\/([^/?#\s]+)/i.exec(url);
  if (!match) return undefined;
  try {
    return decodeURIComponent(match[1]).toLowerCase();
  } catch {
    return match[1].toLowerCase();
  }
}

/* ---------- Feld-Normalisierung ---------- */

function normalizeLinkedinUrl(raw) {
  const value = String(raw ?? "").trim();
  if (!value) return undefined;
  const user = linkedinUsername(value);
  return user ? `https://www.linkedin.com/in/${encodeURIComponent(user)}` : value;
}

/** "IdeaLab! 2026" → "idealab-2026", "Bits & Pretzels 2026" → "bits-and-pretzels-2026" (Slugs wie in src/data/events.json). */
function normalizeEvent(raw) {
  const key = normalizeName(String(raw ?? "").replace(/&/g, " and ")).replace(/ /g, "-");
  return key || undefined;
}

function normalizeDisplayName(raw) {
  const name = String(raw ?? "").replace(/\s+/g, " ").trim();
  // "Nachname, Vorname" → "Vorname Nachname" (häufiges Export-Format)
  const parts = name.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length === 2 ? `${parts[1]} ${parts[0]}` : name;
}

/** Notnagel ohne Namensspalte: "max.brandt@…" → "Max Brandt" */
function nameFromEmail(email) {
  return email
    .split("@")[0]
    .split(/[._\-+]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

/* ---------- CSV ---------- */

function detectDelimiter(headerLine) {
  const counts = new Map([[",", 0], [";", 0], ["\t", 0]]);
  let inQuotes = false;
  for (const c of headerLine) {
    if (c === '"') inQuotes = !inQuotes;
    else if (!inQuotes && counts.has(c)) counts.set(c, counts.get(c) + 1);
  }
  let best = ",";
  for (const [delimiter, n] of counts) if (n > counts.get(best)) best = delimiter;
  return best;
}

function parseCsv(text, delimiter) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"' && field === "") {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

const normalizeHeader = (h) =>
  String(h ?? "")
    .replace(/^﻿/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

function resolveColumns(headerCells) {
  const headers = headerCells.map(normalizeHeader);
  const find = (aliases) => {
    const idx = headers.findIndex((h) => aliases.includes(h));
    return idx === -1 ? undefined : idx;
  };
  return Object.fromEntries(Object.entries(COLUMN_ALIASES).map(([key, aliases]) => [key, find(aliases)]));
}

function rowToAttendee(row, cols) {
  const cell = (idx) => (idx === undefined ? "" : String(row[idx] ?? "").trim());
  const email = cell(cols.email).toLowerCase();
  if (!EMAIL_RE.test(email)) return null;
  const rawName = cell(cols.name) || [cell(cols.firstName), cell(cols.lastName)].filter(Boolean).join(" ");
  const name = normalizeDisplayName(rawName) || nameFromEmail(email);
  return {
    name,
    email,
    company: cell(cols.company) || undefined,
    event: normalizeEvent(cell(cols.event)),
    linkedinUrl: normalizeLinkedinUrl(cell(cols.linkedinUrl)),
  };
}

/* ---------- Merge & Ausgabe ---------- */

function merge(prev, next) {
  const out = { ...prev };
  for (const key of ["name", "company", "event", "linkedinUrl"]) if (next[key]) out[key] = next[key];
  return out;
}

/** Feste Schlüsselreihenfolge, leere Felder weglassen, nameKey immer frisch berechnen. */
function toRecord(a) {
  const out = { name: a.name, email: a.email };
  if (a.company) out.company = a.company;
  if (a.event) out.event = a.event;
  if (a.linkedinUrl) out.linkedinUrl = a.linkedinUrl;
  out.nameKey = normalizeName(a.name);
  return out;
}

function loadExisting() {
  if (!existsSync(OUTPUT)) return [];
  try {
    const parsed = JSON.parse(readFileSync(OUTPUT, "utf8"));
    return Array.isArray(parsed) ? parsed.filter((a) => a && typeof a.email === "string") : [];
  } catch {
    console.warn(`Hinweis: ${path.relative(ROOT, OUTPUT)} war nicht lesbar und wird neu aufgebaut.`);
    return [];
  }
}

function main() {
  const args = process.argv.slice(2);
  const reset = args.includes("--reset");
  const inputArg = args.find((a) => !a.startsWith("--"));
  const input = inputArg ? path.resolve(process.cwd(), inputArg) : DEFAULT_INPUT;

  if (!existsSync(input)) {
    console.error(`CSV nicht gefunden: ${input}`);
    process.exit(1);
  }

  const text = readFileSync(input, "utf8").replace(/^﻿/, "");
  const headerLine = text.split(/\r?\n/).find((line) => line.trim() !== "") ?? "";
  const delimiter = detectDelimiter(headerLine);
  const rows = parseCsv(text, delimiter);
  if (rows.length < 2) {
    console.error("CSV enthält keine Datenzeilen.");
    process.exit(1);
  }

  const cols = resolveColumns(rows[0]);
  if (cols.email === undefined) {
    console.error(`Keine E-Mail-Spalte gefunden. Kopfzeile: ${rows[0].join(" | ")}`);
    process.exit(1);
  }
  if (cols.name === undefined && cols.firstName === undefined && cols.lastName === undefined) {
    console.warn("Hinweis: keine Namensspalte – Namen werden aus der E-Mail abgeleitet.");
  }

  const existing = reset ? [] : loadExisting();
  const byEmail = new Map(existing.map((a) => [a.email.toLowerCase(), a]));
  const before = byEmail.size;
  let added = 0;
  let mergedCount = 0;
  let skipped = 0;

  for (const row of rows.slice(1)) {
    const attendee = rowToAttendee(row, cols);
    if (!attendee) {
      skipped++;
      continue;
    }
    const prev = byEmail.get(attendee.email);
    if (prev) {
      byEmail.set(attendee.email, merge(prev, attendee));
      mergedCount++;
    } else {
      byEmail.set(attendee.email, attendee);
      added++;
    }
  }

  const result = [...byEmail.values()]
    .map(toRecord)
    .sort((a, b) => a.nameKey.localeCompare(b.nameKey) || a.email.localeCompare(b.email));

  mkdirSync(path.dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(result, null, 2)}\n`);

  const delimiterLabel = delimiter === "\t" ? "Tab" : `"${delimiter}"`;
  console.log(`Teilnehmerliste: ${path.relative(ROOT, input)} (Trenner: ${delimiterLabel})`);
  console.log(
    `${rows.length - 1} Zeilen gelesen · ${added} neu · ${mergedCount} zusammengeführt · ${skipped} übersprungen (ohne gültige E-Mail)`,
  );
  console.log(`→ ${path.relative(ROOT, OUTPUT)}: ${result.length} Teilnehmer:innen (vorher ${before})`);
}

main();
