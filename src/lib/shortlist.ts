"use client";
/**
 * Shortlist ("Merken") – gemerkte Profil-IDs im localStorage.
 * ---------------------------------------------------------------
 * Contract (docs/PARALLEL-WORK.md): Key `founderradar.shortlist.v1`, Wert JSON `string[]`.
 * Andere Pakete (Team-Radar, Kandidatenliste, Assistent) lesen denselben Key – deshalb
 * hier zentral, nie direkt auf localStorage zugreifen.
 */
import { useCallback, useSyncExternalStore } from "react";

export const SHORTLIST_KEY = "founderradar.shortlist.v1";
/** Wird im selben Tab nach jeder Änderung auf `window` gefeuert (andere Tabs bekommen `storage`). */
export const SHORTLIST_CHANGE_EVENT = "founderradar:shortlist-changed";

const EMPTY: string[] = [];

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readRaw(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(SHORTLIST_KEY);
  } catch {
    return null;
  }
}

function parseIds(raw: string | null): string[] {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const ids = parsed.filter((x): x is string => typeof x === "string" && x.length > 0);
    return Array.from(new Set(ids));
  } catch {
    return EMPTY;
  }
}

/** Liest die Shortlist. Auf dem Server oder bei kaputten Daten: leer. */
export function loadShortlist(): string[] {
  return parseIds(readRaw());
}

/** Speichert die Shortlist (dedupliziert) und benachrichtigt alle Hooks im selben Tab. */
export function saveShortlist(ids: string[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(SHORTLIST_KEY, JSON.stringify(Array.from(new Set(ids))));
  } catch {
    /* ignore (Quota, Private Mode …) */
  }
  window.dispatchEvent(new Event(SHORTLIST_CHANGE_EVENT));
}

export function isShortlisted(id: string): boolean {
  return loadShortlist().includes(id);
}

/** Fügt hinzu oder entfernt; gibt die neue Liste zurück. */
export function toggleShortlist(id: string): string[] {
  const current = loadShortlist();
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  saveShortlist(next);
  return next;
}

export function addToShortlist(id: string): string[] {
  const current = loadShortlist();
  if (current.includes(id)) return current;
  const next = [...current, id];
  saveShortlist(next);
  return next;
}

export function removeFromShortlist(id: string): string[] {
  const next = loadShortlist().filter((x) => x !== id);
  saveShortlist(next);
  return next;
}

export function clearShortlist(): void {
  saveShortlist([]);
}

/* ------------------------------------------------------------------ */
/* Hook – useSyncExternalStore: hydration-sicher, kein setState im Effect */
/* ------------------------------------------------------------------ */

let cachedRaw: string | null | undefined;
let cachedIds: string[] = EMPTY;

/** Snapshot muss referenz-stabil sein, solange sich der Rohwert nicht ändert. */
function getSnapshot(): string[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedIds = parseIds(raw);
  }
  return cachedIds;
}

function getServerSnapshot(): string[] {
  return EMPTY;
}

function subscribe(onChange: () => void): () => void {
  // `storage` kommt aus anderen Tabs – nur auf unseren Key (oder `clear()`, key === null) reagieren.
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === SHORTLIST_KEY) onChange();
  };
  window.addEventListener(SHORTLIST_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(SHORTLIST_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function subscribeNoop(): () => void {
  return () => {};
}

/**
 * Hook: gemerkte IDs + Aktionen.
 * `ready` ist false, bis der Client hydriert ist – davor ist `ids` immer leer und darf
 * nicht als "keine Einträge" angezeigt werden.
 */
export function useShortlist() {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  return {
    ids,
    count: ids.length,
    ready,
    has,
    toggle: toggleShortlist,
    add: addToShortlist,
    remove: removeFromShortlist,
    clear: clearShortlist,
  };
}
