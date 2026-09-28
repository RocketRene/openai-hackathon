"use client";
/**
 * Einstellungen (DE/EN): Status (/api/health), Sprache, Nutzer-Kontext (Export/Import/Demo/Löschen),
 * Datenquellen, Team und Hinweis auf das separate Voice Studio (web/).
 * Alle Texte liegen im lokalen DICT (siehe src/lib/i18n.tsx).
 */
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import type { UserContext } from "@/lib/types";
import { DEFAULT_USER_CONTEXT, useUserContext } from "@/lib/user-context";
import { LanguageToggle, useLocale, useT, type Dict } from "@/lib/i18n";
import { Avatar, Badge, Button, Card, EmptyState, LinkButton, Skeleton, cx } from "@/components/ui";

/** Antwort von GET /api/health (modul-lokaler Typ, siehe src/app/api/health/route.ts). */
interface HealthResponse {
  openaiConfigured: boolean;
  textModel: string;
  realtimeModel: string;
  profiles: number;
  events: number;
  sources: {
    linkedin: number;
    conference: number;
    mock: number;
    manual: number;
  };
}

type SourceKey = keyof HealthResponse["sources"];
const SOURCE_KEYS: SourceKey[] = ["linkedin", "conference", "mock", "manual"];

const DICT = {
  // Status
  statusTitle: { de: "Status", en: "Status" },
  statusDesc: { de: "Live aus /api/health – Modelle, Schlüssel und Datenbestand.", en: "Live from /api/health – models, keys and data set." },
  reload: { de: "Neu laden", en: "Reload" },
  healthError: { de: "/api/health konnte nicht geladen werden ({error}).", en: "Could not load /api/health ({error})." },
  unknownError: { de: "Unbekannter Fehler", en: "Unknown error" },
  openai: { de: "OpenAI", en: "OpenAI" },
  openaiHintOn: { de: "OPENAI_API_KEY ist gesetzt – Agent, Outreach, Prep und Voice nutzen das Modell.", en: "OPENAI_API_KEY is set – agent, outreach, prep and voice use the model." },
  openaiHintOff: { de: "Kein OPENAI_API_KEY in .env.local – alle Funktionen laufen mit Template-Fallbacks.", en: "No OPENAI_API_KEY in .env.local – everything runs on template fallbacks." },
  configured: { de: "konfiguriert", en: "configured" },
  notConfigured: { de: "nicht konfiguriert", en: "not configured" },
  checking: { de: "prüft …", en: "checking …" },
  models: { de: "Modelle", en: "Models" },
  modelsHint: { de: "Anpassbar über OPENAI_TEXT_MODEL und OPENAI_REALTIME_MODEL.", en: "Configurable via OPENAI_TEXT_MODEL and OPENAI_REALTIME_MODEL." },
  modelText: { de: "Text", en: "Text" },
  modelRealtime: { de: "Realtime", en: "Realtime" },
  dataset: { de: "Datenbestand", en: "Data set" },
  datasetHint: { de: "Profile nach Quelle – so wie sie src/lib/data.ts liefert.", en: "Profiles by source – as served by src/lib/data.ts." },
  profiles: { de: "Profile", en: "Profiles" },
  events: { de: "Events", en: "Events" },
  srcLinkedin: { de: "LinkedIn (IdeaLab)", en: "LinkedIn (IdeaLab)" },
  srcConference: { de: "Konferenz-Listen", en: "Conference lists" },
  srcMock: { de: "Demo-Profile", en: "Demo profiles" },
  srcManual: { de: "Manuell", en: "Manual" },
  withoutSource: { de: "{count} Profile ohne Quellenangabe.", en: "{count} profiles without a source." },

  // Sprache
  langTitle: { de: "Sprache", en: "Language" },
  langDesc: { de: "Oberfläche und Agent in einer Sprache.", en: "Interface and agent in one language." },
  langLabel: { de: "Sprache der Oberfläche", en: "Interface language" },
  langActive: { de: "Aktiv: Deutsch", en: "Active: English" },
  langAgent: { de: "Gilt auch für den Agenten: Text- und Voice-Agent antworten in dieser Sprache. Die Wahl wird lokal im Browser gespeichert.", en: "Also applies to the agent: the text and voice agent answer in this language. Your choice is stored locally in the browser." },

  // Mein Kontext
  ctxTitle: { de: "Mein Kontext", en: "My context" },
  ctxDesc: { de: "Onboarding und Agent-Interview – liegt nur lokal in diesem Browser.", en: "Onboarding and agent interview – stored only in this browser." },
  ctxLoading: { de: "lädt …", en: "loading …" },
  ctxEmpty: { de: "leer", en: "empty" },
  interviewDone: { de: "Interview abgeschlossen", en: "Interview completed" },
  interviewOpen: { de: "Interview offen", en: "Interview open" },
  ctxStoredFor: { de: "Gespeichert für", en: "Stored for" },
  ctxUnnamed: { de: "unbenannt", en: "unnamed" },
  ctxUpdated: { de: "aktualisiert {date}", en: "updated {date}" },
  ctxHint: { de: "Exportiere den Kontext als JSON, um ihn zu sichern oder auf einem anderen Gerät zu importieren.", en: "Export the context as JSON to back it up or import it on another device." },
  exportJson: { de: "Exportieren", en: "Export" },
  importJson: { de: "Importieren", en: "Import" },
  loadDemo: { de: "Demo laden", en: "Load demo" },
  clearCtx: { de: "Löschen", en: "Delete" },
  copy: { de: "Kopieren", en: "Copy" },
  copied: { de: "Kopiert ✓", en: "Copied ✓" },
  emptyTitle: { de: "Noch kein Kontext gespeichert", en: "No context stored yet" },
  emptyBody: { de: "Starte das Onboarding oder lade den Demo-Kontext, um Matches, Outreach und Prep zu personalisieren.", en: "Start onboarding or load the demo context to personalise matches, outreach and prep." },
  startOnboarding: { de: "Onboarding starten", en: "Start onboarding" },
  msgExported: { de: "Kontext als JSON exportiert.", en: "Context exported as JSON." },
  msgImported: { de: "Kontext „{name}“ importiert.", en: "Context “{name}” imported." },
  msgDemo: { de: "Demo-Kontext geladen.", en: "Demo context loaded." },
  msgCleared: { de: "Kontext gelöscht.", en: "Context deleted." },
  msgNotJson: { de: "Import abgebrochen: Die Datei ist kein gültiges JSON.", en: "Import cancelled: the file is not valid JSON." },
  msgNotObject: { de: "Import abgebrochen: Die Datei enthält kein JSON-Objekt.", en: "Import cancelled: the file does not contain a JSON object." },
  msgFieldInvalid: { de: "Import abgebrochen: Feld „{field}“ fehlt oder ist ungültig.", en: "Import cancelled: field “{field}” is missing or invalid." },
  clearConfirm: { de: "Kontext wirklich löschen? Onboarding-Daten und Interview-Notizen gehen verloren.", en: "Really delete the context? Onboarding data and interview notes will be lost." },

  // Datenquellen
  srcTitle: { de: "Datenquellen", en: "Data sources" },
  srcDesc: { de: "Woher die Profile kommen – und wie du den Bestand aktualisierst.", en: "Where the profiles come from – and how to refresh the data set." },
  srcIdealabTitle: { de: "IdeaLab!-Export (echte Profile)", en: "IdeaLab! export (real profiles)" },
  srcIdealabBody: { de: "Die Teilnehmer:innen der IdeaLab! 2026 (Vallendar) liegen mit LinkedIn-Anreicherung in exports/all-enriched-profiles.json. Der Import normalisiert sie ins Profile-Format und schreibt src/data/profiles/imported.json.", en: "The IdeaLab! 2026 (Vallendar) attendees live, enriched with LinkedIn data, in exports/all-enriched-profiles.json. The import normalises them into the Profile format and writes src/data/profiles/imported.json." },
  srcMockTitle: { de: "Demo-Profile (Mock)", en: "Demo profiles (mock)" },
  srcMockBody: { de: "Handgeschriebene Profile in src/data/profiles/*.json – gleiche Struktur wie echte Profile, für die Demo ohne Export.", en: "Hand-written profiles in src/data/profiles/*.json – same structure as real profiles, for the demo without an export." },
  srcAfter: { de: "Danach den Dev-Server neu starten. Alle Daten laufen über src/lib/data.ts – Seiten importieren nie direkt JSON.", en: "Restart the dev server afterwards. All data flows through src/lib/data.ts – pages never import JSON directly." },

  // Team
  teamTitle: { de: "Team", en: "Team" },
  teamDesc: { de: "Voya – OpenAI Hackathon, 26.09.2026", en: "Voya – OpenAI Hackathon, 26 Sep 2026" },
  roleMarvin: { de: "Koordination, Backend & Agent", en: "Coordination, backend & agent" },
  roleRene: { de: "Voice Studio (web/) & Backend", en: "Voice Studio (web/) & backend" },
  roleJolanda: { de: "Design", en: "Design" },
  roleYouna: { de: "Projektbeschreibung (project.md)", en: "Project description (project.md)" },

  // Voice Studio
  studioTitle: { de: "Voya Voice Studio", en: "Voya Voice Studio" },
  studioDesc: { de: "Renés separate React-App unter web/ – läuft unabhängig von diesem Dashboard.", en: "René's separate React app under web/ – runs independently of this dashboard." },
  studioBody: { de: "Vite-Frontend mit eigenem Express-Server (Node 22.12+). Der Server bindet nur an Loopback.", en: "Vite front end with its own Express server (Node 22.12+). The server binds to loopback only." },
  studioAfter: { de: "Danach erreichbar unter http://localhost:5173 (Port 5173).", en: "Then available at http://localhost:5173 (port 5173)." },
  studioOpen: { de: "Öffnen", en: "Open" },
} satisfies Dict;

const TEAM: Array<{ name: string; role: keyof typeof DICT }> = [
  { name: "Marvin", role: "roleMarvin" },
  { name: "René", role: "roleRene" },
  { name: "Jolanda", role: "roleJolanda" },
  { name: "Youna", role: "roleYouna" },
];

const SOURCE_LABEL_KEYS: Record<SourceKey, keyof typeof DICT> = {
  linkedin: "srcLinkedin",
  conference: "srcConference",
  mock: "srcMock",
  manual: "srcManual",
};

type Message = { tone: "success" | "danger"; key: keyof typeof DICT; vars?: Record<string, string | number> };

/**
 * Minimale Plausibilitätsprüfung für importierte Kontexte.
 * Gibt null (ok), "__object__" (kein Objekt) oder den Pfad des fehlerhaften Felds zurück.
 */
function validateUserContext(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "__object__";
  const obj = value as Record<string, unknown>;
  if (typeof obj.name !== "string") return "name";
  if (typeof obj.idea !== "string") return "idea";
  for (const key of ["lookingFor", "lookingForRoles", "verticals", "strengths"]) {
    if (!Array.isArray(obj[key])) return key;
  }
  if (!obj.dims || typeof obj.dims !== "object") return "dims";
  const dims = obj.dims as Record<string, unknown>;
  for (const key of ["vision", "design", "tech", "detail", "execution"]) {
    if (typeof dims[key] !== "number") return `dims.${key}`;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Kleine lokale Bausteine                                             */
/* ------------------------------------------------------------------ */

function useCopy(resetMs = 1800) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );
  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), resetMs);
      } catch {
        /* Clipboard nicht verfügbar – still bleiben */
      }
    },
    [resetMs],
  );
  return { copied, copy };
}

/** Monospace-Box mit Kopieren-Button (für Befehle und JSON). */
function CodeBlock({ code, className, label }: { code: string; className?: string; label?: string }) {
  const t = useT(DICT);
  const { copied, copy } = useCopy();
  return (
    <div className={cx("relative rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)]", className)}>
      {label && (
        <span className="pointer-events-none absolute left-3 top-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
          {label}
        </span>
      )}
      <pre
        className={cx(
          "fr-scroll overflow-auto p-3 pr-24 font-mono text-xs leading-relaxed text-[var(--foreground)]",
          label && "pt-7",
        )}
      >
        {code}
      </pre>
      <button
        type="button"
        onClick={() => void copy(code)}
        className="absolute right-2 top-2 inline-flex h-7 items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] font-medium text-[var(--muted)] shadow-[var(--shadow-sm)] transition hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        <span aria-live="polite">{copied ? t("copied") : t("copy")}</span>
      </button>
    </div>
  );
}

/** Inline-Code-Pill (Modelle, Dateipfade, ENV-Namen). */
function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--foreground)]">
      {children}
    </code>
  );
}

/** Zeile „Label links, Wert rechts“ innerhalb einer divide-y-Liste. */
function Row({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--foreground)]">{label}</p>
        {hint && <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">{hint}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">{children}</div>
    </div>
  );
}

/** Kompakte Kennzahl-Kachel für die Stat-Reihe im Status. */
function MiniStat({ label, value, loading, accent }: { label: ReactNode; value: ReactNode; loading?: boolean; accent?: boolean }) {
  return (
    <div
      className={cx(
        "rounded-[var(--radius-sm)] border px-3 py-2.5 transition",
        accent ? "border-transparent bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--surface-2)]",
      )}
    >
      {loading ? (
        <Skeleton className="h-6 w-12" />
      ) : (
        <div className={cx("text-lg font-semibold tabular-nums tracking-tight", accent ? "text-[var(--accent)]" : "text-[var(--foreground)]")}>
          {value}
        </div>
      )}
      <div className="mt-0.5 truncate text-[11px] font-medium text-[var(--muted)]">{label}</div>
    </div>
  );
}

function Note({ tone, children }: { tone: "success" | "danger"; children: ReactNode }) {
  return (
    <p
      role="status"
      className={cx(
        "rounded-[var(--radius-sm)] px-3 py-2 text-sm",
        tone === "success" ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--danger-soft)] text-[var(--danger)]",
      )}
    >
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export default function SettingsPanel() {
  const t = useT(DICT);
  const [locale] = useLocale();
  const numberLocale = locale === "en" ? "en-GB" : "de-DE";
  const fmt = (n: number) => n.toLocaleString(numberLocale);

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const { userContext, ready, replace, clear, loadDemo } = useUserContext();
  const [message, setMessage] = useState<Message | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as HealthResponse;
      })
      .then((data) => {
        if (!cancelled) setHealth(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setHealthError(err instanceof Error ? err.message : "");
      })
      .finally(() => {
        if (!cancelled) setHealthLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const sourcesTotal = health ? Object.values(health.sources).reduce((sum, n) => sum + n, 0) : 0;
  const withoutSource = health ? Math.max(0, health.profiles - sourcesTotal) : 0;

  function handleReloadHealth() {
    setHealthLoading(true);
    setHealthError(null);
    setReloadKey((k) => k + 1);
  }

  function handleExport() {
    if (!userContext) return;
    const blob = new Blob([JSON.stringify(userContext, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voya-context-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setMessage({ tone: "success", key: "msgExported" });
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      const problem = validateUserContext(parsed);
      if (problem === "__object__") {
        setMessage({ tone: "danger", key: "msgNotObject" });
        return;
      }
      if (problem) {
        setMessage({ tone: "danger", key: "msgFieldInvalid", vars: { field: problem } });
        return;
      }
      const next: UserContext = { ...DEFAULT_USER_CONTEXT, ...(parsed as UserContext) };
      replace(next);
      setMessage({ tone: "success", key: "msgImported", vars: { name: next.name || t("ctxUnnamed") } });
    } catch {
      setMessage({ tone: "danger", key: "msgNotJson" });
    }
  }

  function handleLoadDemo() {
    loadDemo();
    setMessage({ tone: "success", key: "msgDemo" });
  }

  function handleClear() {
    if (!window.confirm(t("clearConfirm"))) return;
    clear();
    setMessage({ tone: "success", key: "msgCleared" });
  }

  const hasContext = ready && userContext !== null;
  const contextJson = hasContext ? JSON.stringify(userContext, null, 2) : "";
  const updatedAt = hasContext && userContext.updatedAt ? new Date(userContext.updatedAt) : null;
  const updatedLabel =
    updatedAt && !Number.isNaN(updatedAt.getTime())
      ? updatedAt.toLocaleDateString(numberLocale, { day: "2-digit", month: "2-digit", year: "numeric" })
      : null;

  return (
    <div className="fr-fade-in flex flex-col gap-5">
      {/* ---------------- Status ---------------- */}
      <Card
        title={t("statusTitle")}
        description={t("statusDesc")}
        action={
          <Button variant="secondary" size="sm" onClick={handleReloadHealth} disabled={healthLoading}>
            <span aria-hidden className={cx("text-sm leading-none", healthLoading && "animate-spin")}>
              ↻
            </span>
            {t("reload")}
          </Button>
        }
      >
        {healthError !== null && (
          <div className="mb-3">
            <Note tone="danger">{t("healthError", { error: healthError || t("unknownError") })}</Note>
          </div>
        )}

        <div className="divide-y divide-[var(--border)]">
          <Row label={t("openai")} hint={healthLoading ? undefined : health?.openaiConfigured ? t("openaiHintOn") : t("openaiHintOff")}>
            {healthLoading ? (
              <Badge>{t("checking")}</Badge>
            ) : health?.openaiConfigured ? (
              <Badge tone="success">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                {t("configured")}
              </Badge>
            ) : (
              <Badge tone="danger">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                {t("notConfigured")}
              </Badge>
            )}
          </Row>

          <Row label={t("models")} hint={t("modelsHint")}>
            {healthLoading ? (
              <>
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
                  {t("modelText")} <Code>{health?.textModel ?? "–"}</Code>
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
                  {t("modelRealtime")} <Code>{health?.realtimeModel ?? "–"}</Code>
                </span>
              </>
            )}
          </Row>

          <div className="pt-4">
            <p className="text-sm font-medium text-[var(--foreground)]">{t("dataset")}</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">{t("datasetHint")}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <MiniStat accent label={t("profiles")} loading={healthLoading} value={health ? fmt(health.profiles) : "–"} />
              <MiniStat accent label={t("events")} loading={healthLoading} value={health ? fmt(health.events) : "–"} />
              {SOURCE_KEYS.map((key) => (
                <MiniStat
                  key={key}
                  label={t(SOURCE_LABEL_KEYS[key])}
                  loading={healthLoading}
                  value={health ? fmt(health.sources[key]) : "–"}
                />
              ))}
            </div>
            {withoutSource > 0 && <p className="mt-2 text-xs text-[var(--muted)]">{t("withoutSource", { count: fmt(withoutSource) })}</p>}
          </div>
        </div>
      </Card>

      {/* ---------------- Sprache / Language ---------------- */}
      <Card title={t("langTitle")} description={t("langDesc")}>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">{t("langLabel")}</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">{t("langActive")}</p>
          </div>
          <LanguageToggle />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">{t("langAgent")}</p>
      </Card>

      {/* ---------------- Mein Kontext ---------------- */}
      <Card
        title={t("ctxTitle")}
        description={t("ctxDesc")}
        action={
          !ready ? (
            <Badge>{t("ctxLoading")}</Badge>
          ) : hasContext ? (
            <Badge tone={userContext.completedInterview ? "success" : "neutral"}>
              {userContext.completedInterview ? t("interviewDone") : t("interviewOpen")}
            </Badge>
          ) : (
            <Badge>{t("ctxEmpty")}</Badge>
          )
        }
      >
        <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] p-2">
          <Button variant="secondary" size="sm" onClick={handleExport} disabled={!hasContext}>
            {t("exportJson")}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
            {t("importJson")}
          </Button>
          <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />
          <Button variant="secondary" size="sm" onClick={handleLoadDemo}>
            {t("loadDemo")}
          </Button>
          <Button variant="danger" size="sm" onClick={handleClear} disabled={!hasContext} className="ml-auto">
            {t("clearCtx")}
          </Button>
        </div>

        {message && (
          <div className="mt-3">
            <Note tone={message.tone}>{t(message.key, message.vars)}</Note>
          </div>
        )}

        <div className="mt-4">
          {!ready ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : hasContext ? (
            <>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-xs text-[var(--muted)]">
                <span>
                  {t("ctxStoredFor")}{" "}
                  <span className="font-medium text-[var(--foreground)]">{userContext.name || t("ctxUnnamed")}</span>
                </span>
                {updatedLabel && <span>{t("ctxUpdated", { date: updatedLabel })}</span>}
              </div>
              <CodeBlock code={contextJson} label="JSON" className="[&>pre]:max-h-80" />
              <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{t("ctxHint")}</p>
            </>
          ) : (
            <EmptyState
              title={t("emptyTitle")}
              body={t("emptyBody")}
              action={
                <>
                  <LinkButton href="/onboarding" size="sm">
                    {t("startOnboarding")}
                  </LinkButton>
                  <Button variant="secondary" size="sm" onClick={handleLoadDemo}>
                    {t("loadDemo")}
                  </Button>
                </>
              }
            />
          )}
        </div>
      </Card>

      {/* ---------------- Datenquellen ---------------- */}
      <Card title={t("srcTitle")} description={t("srcDesc")}>
        <div className="divide-y divide-[var(--border)]">
          <div className="pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-[var(--foreground)]">{t("srcIdealabTitle")}</p>
              <Badge tone="accent">linkedin</Badge>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{t("srcIdealabBody")}</p>
            <CodeBlock code="npm run import:idealab" className="mt-3" />
          </div>
          <div className="pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-[var(--foreground)]">{t("srcMockTitle")}</p>
              <Badge>mock</Badge>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{t("srcMockBody")}</p>
          </div>
        </div>
        <p className="mt-4 border-t border-[var(--border)] pt-3 text-xs leading-relaxed text-[var(--muted)]">{t("srcAfter")}</p>
      </Card>

      {/* ---------------- Team ---------------- */}
      <Card title={t("teamTitle")} description={t("teamDesc")} padding="sm">
        <ul className="divide-y divide-[var(--border)]">
          {TEAM.map((member) => (
            <li
              key={member.name}
              className="flex items-center gap-3 rounded-[var(--radius-sm)] px-2 py-2.5 transition hover:bg-[var(--surface-2)]"
            >
              <Avatar name={member.name} size={36} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--foreground)]">{member.name}</p>
                <p className="truncate text-xs text-[var(--muted)]">{t(member.role)}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* ---------------- Voya Voice Studio (web/) ---------------- */}
      <Card
        title={
          <span className="inline-flex items-center gap-2">
            {t("studioTitle")} <Code>web/</Code>
          </span>
        }
        description={t("studioDesc")}
        action={
          <LinkButton href="http://localhost:5173" target="_blank" variant="outline" size="sm">
            {t("studioOpen")} ↗
          </LinkButton>
        }
      >
        <p className="text-xs leading-relaxed text-[var(--muted)]">{t("studioBody")}</p>
        <CodeBlock code="cd web && npm install && npm run dev" className="mt-3" />
        <p className="mt-2 text-xs text-[var(--muted)]">{t("studioAfter")}</p>
      </Card>
    </div>
  );
}
