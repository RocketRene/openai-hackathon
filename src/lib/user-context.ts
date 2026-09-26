"use client";
/**
 * Client-seitiger Store für den Nutzer-Kontext (MVP: localStorage).
 * Alle Komponenten lesen/schreiben über diese Funktionen bzw. den Hook – nie direkt localStorage.
 */
import { useCallback, useEffect, useState } from "react";
import type { UserContext } from "./types";

const STORAGE_KEY = "founderradar.userContext.v1";
const CHANGE_EVENT = "founderradar:usercontext-changed";

export const DEFAULT_USER_CONTEXT: UserContext = {
  name: "",
  headline: "",
  linkedinUrl: "",
  founderRole: undefined,
  lookingFor: ["cofounder"],
  lookingForRoles: [],
  verticals: [],
  stage: "idea",
  idea: "",
  openToIdeas: false,
  strengths: [],
  dims: { vision: 5, design: 5, tech: 5, detail: 5, execution: 5 },
  notes: "",
  completedInterview: false,
  updatedAt: new Date(0).toISOString(),
};

/** Demo-Kontext, damit das Dashboard ohne Onboarding sofort etwas zeigt. */
export const DEMO_USER_CONTEXT: UserContext = {
  ...DEFAULT_USER_CONTEXT,
  name: "Marvin",
  headline: "Tech-Founder, Full-Stack & AI",
  founderRole: "tech",
  lookingFor: ["cofounder", "investor"],
  lookingForRoles: ["commercial"],
  verticals: ["b2b saas", "ai"],
  stage: "idea",
  idea: "AI-Tool, das Gründer:innen die richtigen Co-Founder und Investoren auf Konferenzen findet.",
  openToIdeas: true,
  strengths: ["Prototyping", "AI/LLM", "Backend", "schnelle Umsetzung"],
  dims: { vision: 7, design: 4, tech: 9, detail: 5, execution: 8 },
  completedInterview: false,
  updatedAt: new Date().toISOString(),
};

export function loadUserContext(): UserContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return { ...DEFAULT_USER_CONTEXT, ...(JSON.parse(raw) as Partial<UserContext>) };
  } catch {
    return null;
  }
}

export function saveUserContext(ctx: UserContext): void {
  if (typeof window === "undefined") return;
  try {
    const next = { ...ctx, updatedAt: new Date().toISOString() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* ignore */
  }
}

export function patchUserContext(patch: Partial<UserContext>): UserContext {
  const current = loadUserContext() ?? DEFAULT_USER_CONTEXT;
  const next = { ...current, ...patch };
  saveUserContext(next);
  return next;
}

export function clearUserContext(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* ignore */
  }
}

/**
 * Hook: liefert den Kontext (null bis geladen), plus Setter.
 * `ready` ist false, solange localStorage noch nicht gelesen wurde (Hydration).
 */
export function useUserContext() {
  const [ctx, setCtx] = useState<UserContext | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setCtx(loadUserContext());
    sync();
    setReady(true);
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = useCallback((patch: Partial<UserContext>) => {
    setCtx(patchUserContext(patch));
  }, []);

  const replace = useCallback((next: UserContext) => {
    saveUserContext(next);
    setCtx(loadUserContext());
  }, []);

  const loadDemo = useCallback(() => {
    saveUserContext(DEMO_USER_CONTEXT);
    setCtx(loadUserContext());
  }, []);

  return { userContext: ctx, ready, update, replace, loadDemo, clear: clearUserContext };
}
