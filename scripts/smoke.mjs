#!/usr/bin/env node
/**
 * FounderRadar – Smoke-Test gegen die laufende App.
 * ---------------------------------------------------------------
 * Wofür: Vor der Demo (und nach jedem Merge) in 10 Sekunden prüfen, ob alle API-Routen aus
 * docs/PARALLEL-WORK.md ("Contracts zwischen Paketen") und alle Seiten antworten und die
 * Antworten grob die vereinbarte Form haben.
 *
 * Starten:
 *   npm run dev                       # in einem Terminal
 *   node scripts/smoke.mjs            # Default: http://localhost:3000
 *   node scripts/smoke.mjs http://localhost:3001
 *
 * Voraussetzung: Node >= 20 (fetch eingebaut), keine Dependencies.
 *
 * Hinweis: Ohne OPENAI_API_KEY müssen alle Antworten Template-Fallbacks sein (kein 500).
 * Einzige Ausnahme: /api/realtime/session darf 503 { error } liefern – das wird als
 * "ok (kein Key)" gewertet. Routen, die 404 liefern, werden als "fehlt" markiert; das
 * Skript bricht dabei nicht ab. Exit-Code 1, sobald mindestens ein Check fehlschlägt.
 */

const BASE_URL = (process.argv[2] ?? "http://localhost:3000").replace(/\/+$/, "");
const TIMEOUT_MS = 20_000;

/** Entspricht DEMO_USER_CONTEXT aus src/lib/user-context.ts (fest kopiert, kein Import). */
const USER_CONTEXT = {
  name: "Marvin",
  headline: "Tech-Founder, Full-Stack & AI",
  linkedinUrl: "",
  founderRole: "tech",
  lookingFor: ["cofounder", "investor"],
  lookingForRoles: ["commercial"],
  verticals: ["b2b saas", "ai"],
  stage: "idea",
  idea: "AI-Tool, das Gründer:innen die richtigen Co-Founder und Investoren auf Konferenzen findet.",
  openToIdeas: true,
  strengths: ["Prototyping", "AI/LLM", "Backend", "schnelle Umsetzung"],
  dims: { vision: 7, design: 4, tech: 9, detail: 5, execution: 8 },
  notes: "",
  completedInterview: false,
  updatedAt: new Date().toISOString(),
};

const PAGE_ROUTES = [
  "/",
  "/onboarding",
  "/assistant",
  "/candidates",
  "/shortlist",
  "/outreach",
  "/team",
  "/network",
  "/tips",
  "/events",
  "/settings",
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const isArray = (v) => Array.isArray(v);
const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isString = (v) => typeof v === "string";
const isNumber = (v) => typeof v === "number" && Number.isFinite(v);

/** Liefert eine Fehlermeldung (string) oder null, wenn die Form passt. */
function requireFields(body, fields) {
  if (!isObject(body)) return "Antwort ist kein Objekt";
  for (const [key, check, label] of fields) {
    if (!check(body[key])) return `Feld "${key}" fehlt oder ist nicht ${label}`;
  }
  return null;
}

/**
 * Führt einen HTTP-Request mit Timeout aus.
 * Gibt { status, ms, body, text, error } zurück – wirft nie.
 */
async function request(method, path, jsonBody) {
  const url = `${BASE_URL}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = performance.now();
  try {
    const res = await fetch(url, {
      method,
      headers: jsonBody !== undefined ? { "content-type": "application/json" } : undefined,
      body: jsonBody !== undefined ? JSON.stringify(jsonBody) : undefined,
      signal: controller.signal,
      redirect: "manual",
    });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = undefined;
    }
    return { status: res.status, ms: Math.round(performance.now() - started), body, text, error: null };
  } catch (err) {
    const ms = Math.round(performance.now() - started);
    const isTimeout = err?.name === "AbortError";
    // Node verpackt Netzwerkfehler als TypeError("fetch failed") mit .cause (Error oder AggregateError).
    const cause = err?.cause;
    const code =
      cause?.code ?? cause?.errors?.[0]?.code ?? err?.code ?? cause?.message ?? err?.message ?? String(err);
    return { status: 0, ms, body: undefined, text: "", error: isTimeout ? `Timeout nach ${TIMEOUT_MS} ms` : String(code) };
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* Checks                                                              */
/* ------------------------------------------------------------------ */

const results = [];

/**
 * Registriert ein Ergebnis.
 * outcome: "ok" | "fail" | "missing" | "skip"
 */
function record({ name, method, path, status, ms, outcome, note }) {
  results.push({ name, method, path, status, ms, outcome, note: note ?? "" });
  return outcome;
}

/**
 * Generischer Check: Request ausführen, Status prüfen, Shape prüfen.
 * shape(body) → string | null (Fehlermeldung oder ok).
 * Gibt den Response-Body zurück (oder undefined), damit Folge-Checks IDs daraus ziehen können.
 */
async function check({ name, method = "GET", path, body: reqBody, expectStatus = 200, shape, allow503AsNoKey = false }) {
  const res = await request(method, path, reqBody);

  if (res.error) {
    record({ name, method, path, status: res.status, ms: res.ms, outcome: "fail", note: res.error });
    return undefined;
  }
  if (res.status === 404) {
    record({ name, method, path, status: res.status, ms: res.ms, outcome: "missing", note: "Route fehlt (404)" });
    return undefined;
  }
  if (allow503AsNoKey && res.status === 503) {
    const err = requireFields(res.body, [["error", isString, "string"]]);
    record({
      name,
      method,
      path,
      status: res.status,
      ms: res.ms,
      outcome: err ? "fail" : "ok",
      note: err ? `503, aber ${err}` : "ok (kein Key)",
    });
    return res.body;
  }
  if (res.status !== expectStatus) {
    const snippet = res.text.replace(/\s+/g, " ").slice(0, 80);
    record({ name, method, path, status: res.status, ms: res.ms, outcome: "fail", note: `Status ${res.status} statt ${expectStatus}${snippet ? ` – ${snippet}` : ""}` });
    return res.body;
  }
  if (shape) {
    const err = shape(res.body, res);
    if (err) {
      record({ name, method, path, status: res.status, ms: res.ms, outcome: "fail", note: err });
      return res.body;
    }
  }
  record({ name, method, path, status: res.status, ms: res.ms, outcome: "ok" });
  return res.body;
}

function skip(name, method, path, note) {
  record({ name, method, path, status: "-", ms: 0, outcome: "skip", note });
}

/* ------------------------------------------------------------------ */
/* Shapes (grobe Prüfung gegen src/lib/types.ts)                       */
/* ------------------------------------------------------------------ */

const shapeProfile = (p) =>
  requireFields(p, [
    ["id", isString, "string"],
    ["name", isString, "string"],
    ["networkRole", isString, "string"],
    ["dims", isObject, "object"],
    ["personality", isObject, "object"],
    ["lookingFor", isArray, "array"],
    ["verticals", isArray, "array"],
  ]);

const shapeProfileList = (body) => {
  if (!isArray(body)) return "Antwort ist kein Array";
  if (body.length === 0) return "Array ist leer";
  return shapeProfile(body[0]);
};

const shapeEventList = (body) => {
  if (!isArray(body)) return "Antwort ist kein Array";
  if (body.length === 0) return "Array ist leer";
  return requireFields(body[0], [
    ["slug", isString, "string"],
    ["name", isString, "string"],
  ]);
};

const shapeHtml = (body, res) => {
  const ct = res.text.slice(0, 500).toLowerCase();
  if (!ct.includes("<!doctype html") && !ct.includes("<html")) return "Antwort ist kein HTML";
  return null;
};

/* ------------------------------------------------------------------ */
/* Ablauf                                                              */
/* ------------------------------------------------------------------ */

async function main() {
  console.log(`FounderRadar Smoke-Test → ${BASE_URL}  (Timeout ${TIMEOUT_MS / 1000} s pro Request)\n`);

  // --- GET APIs ---
  await check({
    name: "health",
    path: "/api/health",
    shape: (b) =>
      requireFields(b, [
        ["openaiConfigured", (v) => typeof v === "boolean", "boolean"],
        ["profiles", isNumber, "number"],
        ["events", isNumber, "number"],
      ]),
  });

  const profiles = await check({ name: "profiles (alle)", path: "/api/profiles", shape: shapeProfileList });

  await check({
    name: "profiles?networkRole=cofounder",
    path: "/api/profiles?networkRole=cofounder",
    shape: (b) => {
      const err = shapeProfileList(b);
      if (err) return err;
      const wrong = b.find((p) => p.networkRole !== "cofounder");
      return wrong ? `Filter ignoriert: ${wrong.id} hat networkRole=${wrong.networkRole}` : null;
    },
  });

  const firstId = isArray(profiles) && profiles[0]?.id ? profiles[0].id : null;
  // Für die Demo-Checks bevorzugt ein Commercial Co-Founder (passt zu USER_CONTEXT), sonst das erste Profil.
  const demoId =
    (isArray(profiles) && profiles.find((p) => p.networkRole === "cofounder" && p.founderRole === "commercial")?.id) ||
    firstId;

  if (firstId) {
    await check({
      name: "profiles/[id]",
      path: `/api/profiles/${encodeURIComponent(firstId)}`,
      shape: (b) => shapeProfile(b) ?? (b.id === firstId ? null : `id ${b.id} statt ${firstId}`),
    });
  } else {
    skip("profiles/[id]", "GET", "/api/profiles/[id]", "keine Profil-ID aus /api/profiles");
  }

  await check({ name: "events", path: "/api/events", shape: shapeEventList });

  // --- POST APIs ---
  await check({
    name: "chat (interview)",
    method: "POST",
    path: "/api/chat",
    body: {
      messages: [{ role: "user", content: "Ich bin Tech-Founder und suche einen Commercial Co-Founder für B2B-SaaS mit KI." }],
      userContext: USER_CONTEXT,
      mode: "interview",
    },
    shape: (b) =>
      requireFields(b, [
        ["reply", isString, "string"],
        ["uiActions", isArray, "array"],
      ]),
  });

  if (demoId) {
    await check({
      name: "outreach (linkedin)",
      method: "POST",
      path: "/api/outreach",
      body: { profileId: demoId, userContext: USER_CONTEXT, channel: "linkedin" },
      shape: (b) =>
        requireFields(b, [
          ["profileId", isString, "string"],
          ["channel", isString, "string"],
          ["body", (v) => isString(v) && v.trim().length > 0, "nicht-leerer string"],
          ["personalityNotes", isArray, "array"],
          ["generatedBy", (v) => v === "template" || v === "llm", '"template"|"llm"'],
        ]),
    });

    await check({
      name: "prep",
      method: "POST",
      path: "/api/prep",
      body: { profileId: demoId, userContext: USER_CONTEXT },
      shape: (b) =>
        requireFields(b, [
          ["profileId", isString, "string"],
          ["likelyQuestions", (v) => isArray(v) && v.length > 0, "nicht-leeres array"],
          ["talkingPoints", isArray, "array"],
          ["iceBreakers", isArray, "array"],
          ["redFlagsToProbe", isArray, "array"],
          ["generatedBy", (v) => v === "template" || v === "llm", '"template"|"llm"'],
        ]) ?? requireFields(b.likelyQuestions[0], [["question", isString, "string"]]),
    });

    await check({
      name: "match",
      method: "POST",
      path: "/api/match",
      body: { profileId: demoId, userContext: USER_CONTEXT },
      shape: (b) =>
        requireFields(b, [
          ["profileId", isString, "string"],
          ["score", (v) => isNumber(v) && v >= 0 && v <= 100, "number 0–100"],
          ["reasons", isArray, "array"],
          ["risks", isArray, "array"],
          ["complementarity", isNumber, "number"],
          ["explanation", isString, "string"],
        ]),
    });

    await check({
      name: "personality",
      method: "POST",
      path: "/api/personality",
      body: { profileId: demoId },
      shape: (b) =>
        requireFields(b, [
          ["type", isString, "string"],
          ["summary", isString, "string"],
          ["traits", isArray, "array"],
          ["communicationStyle", isString, "string"],
          ["outreachTips", isArray, "array"],
          ["avoid", isArray, "array"],
        ]),
    });
  } else {
    for (const [name, path] of [
      ["outreach (linkedin)", "/api/outreach"],
      ["prep", "/api/prep"],
      ["match", "/api/match"],
      ["personality", "/api/personality"],
    ]) {
      skip(name, "POST", path, "keine Profil-ID aus /api/profiles");
    }
  }

  await check({
    name: "tips",
    method: "POST",
    path: "/api/tips",
    body: { userContext: USER_CONTEXT, teamMemberIds: demoId ? [demoId] : [] },
    shape: (b) => {
      if (!isArray(b)) return "Antwort ist kein Array";
      if (b.length === 0) return "Array ist leer";
      return requireFields(b[0], [
        ["id", isString, "string"],
        ["title", isString, "string"],
        ["body", isString, "string"],
        ["category", isString, "string"],
        ["priority", isNumber, "number"],
      ]);
    },
  });

  await check({
    name: "realtime/session",
    method: "POST",
    path: "/api/realtime/session",
    body: { mode: "interview" },
    allow503AsNoKey: true,
    shape: (b) =>
      requireFields(b, [
        ["value", isString, "string"],
        ["model", isString, "string"],
      ]),
  });

  // --- Seiten (HTML, Status 200) ---
  const pagePaths = [...PAGE_ROUTES];
  if (demoId) {
    pagePaths.push(`/candidates/${encodeURIComponent(demoId)}`, `/prep/${encodeURIComponent(demoId)}`);
  } else {
    skip("page /candidates/[id]", "GET", "/candidates/[id]", "keine Profil-ID");
    skip("page /prep/[id]", "GET", "/prep/[id]", "keine Profil-ID");
  }
  for (const path of pagePaths) {
    await check({ name: `page ${path}`, path, shape: shapeHtml });
  }

  printTable();

  const failed = results.filter((r) => r.outcome === "fail" || r.outcome === "missing").length;
  process.exit(failed > 0 ? 1 : 0);
}

/* ------------------------------------------------------------------ */
/* Ausgabe                                                             */
/* ------------------------------------------------------------------ */

const MARK = { ok: "✓", fail: "✗", missing: "✗", skip: "–" };

function pad(str, width) {
  const s = String(str);
  return s.length >= width ? s : s + " ".repeat(width - s.length);
}

function printTable() {
  const nameW = Math.max(6, ...results.map((r) => r.name.length));
  const pathW = Math.max(4, ...results.map((r) => r.path.length));
  const header = `${pad("", 1)} ${pad("Check", nameW)}  ${pad("Meth", 4)}  ${pad("Pfad", pathW)}  ${pad("Status", 6)}  ${pad("ms", 6)}  Hinweis`;
  console.log(header);
  console.log("-".repeat(header.length + 10));
  for (const r of results) {
    const mark = MARK[r.outcome] ?? "?";
    const note = r.outcome === "missing" ? "fehlt" : r.note;
    console.log(`${mark} ${pad(r.name, nameW)}  ${pad(r.method, 4)}  ${pad(r.path, pathW)}  ${pad(r.status, 6)}  ${pad(r.ms, 6)}  ${note}`);
  }

  const counts = { ok: 0, fail: 0, missing: 0, skip: 0 };
  for (const r of results) counts[r.outcome] = (counts[r.outcome] ?? 0) + 1;
  const slowest = [...results].filter((r) => isNumber(r.ms)).sort((a, b) => b.ms - a.ms)[0];
  console.log("");
  console.log(
    `${counts.ok} ok · ${counts.fail} fehlgeschlagen · ${counts.missing} fehlen · ${counts.skip} übersprungen` +
      (slowest ? ` · langsamster Request: ${slowest.name} (${slowest.ms} ms)` : ""),
  );
  if (counts.fail + counts.missing > 0) {
    console.log("Ergebnis: FEHLER – siehe ✗ oben. Ohne OPENAI_API_KEY müssen trotzdem alle APIs per Template antworten (kein 500).");
  } else {
    console.log("Ergebnis: alles grün.");
  }
}

main().catch((err) => {
  console.error("Smoke-Test ist unerwartet abgebrochen:", err);
  process.exit(1);
});
