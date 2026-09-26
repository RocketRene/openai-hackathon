"use client";
/**
 * Einstellungen: Systemstatus (/api/health), Nutzer-Kontext (Export/Import/Demo/Löschen),
 * Datenquellen-Erklärung und Team.
 */
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import type { UserContext } from "@/lib/types";
import { DEFAULT_USER_CONTEXT, useUserContext } from "@/lib/user-context";
import { Badge, Button, Card } from "@/components/ui";

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

const SOURCE_LABELS: Record<keyof HealthResponse["sources"], string> = {
  linkedin: "LinkedIn (IdeaLab-Export)",
  conference: "Konferenz-Teilnehmerlisten",
  mock: "Demo-Profile",
  manual: "Manuell angelegt",
};

const TEAM = [
  { name: "Marvin", role: "Koordination, Backend & Agent" },
  { name: "René", role: "Web-App & Backend" },
  { name: "Jolanda", role: "Design" },
  { name: "Youna", role: "Projektbeschreibung (project.md)" },
];

/** Minimale Plausibilitätsprüfung für importierte Kontexte. Gibt eine Fehlermeldung oder null zurück. */
function validateUserContext(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "Die Datei enthält kein JSON-Objekt.";
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj.name !== "string") return "Feld „name“ fehlt oder ist kein Text.";
  if (typeof obj.idea !== "string") return "Feld „idea“ fehlt oder ist kein Text.";
  if (!Array.isArray(obj.lookingFor)) return "Feld „lookingFor“ fehlt oder ist keine Liste.";
  if (!Array.isArray(obj.lookingForRoles)) return "Feld „lookingForRoles“ fehlt oder ist keine Liste.";
  if (!Array.isArray(obj.verticals)) return "Feld „verticals“ fehlt oder ist keine Liste.";
  if (!Array.isArray(obj.strengths)) return "Feld „strengths“ fehlt oder ist keine Liste.";
  if (!obj.dims || typeof obj.dims !== "object") return "Feld „dims“ fehlt.";
  const dims = obj.dims as Record<string, unknown>;
  for (const key of ["vision", "design", "tech", "detail", "execution"]) {
    if (typeof dims[key] !== "number") return `Feld „dims.${key}“ fehlt oder ist keine Zahl.`;
  }
  return null;
}

function StatusRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="text-right font-medium text-[var(--foreground)]">{value}</span>
    </div>
  );
}

export default function SettingsPanel() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const { userContext, ready, replace, clear, loadDemo } = useUserContext();
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
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
        if (!cancelled) setHealthError(err instanceof Error ? err.message : "Unbekannter Fehler");
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
    a.download = `founderradar-kontext-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setMessage({ tone: "success", text: "Kontext als JSON exportiert." });
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      const error = validateUserContext(parsed);
      if (error) {
        setMessage({ tone: "danger", text: `Import abgebrochen: ${error}` });
        return;
      }
      const next: UserContext = { ...DEFAULT_USER_CONTEXT, ...(parsed as UserContext) };
      replace(next);
      setMessage({ tone: "success", text: `Kontext „${next.name || "ohne Namen"}“ importiert.` });
    } catch {
      setMessage({ tone: "danger", text: "Import abgebrochen: Die Datei ist kein gültiges JSON." });
    }
  }

  function handleLoadDemo() {
    loadDemo();
    setMessage({ tone: "success", text: "Demo-Kontext geladen." });
  }

  function handleClear() {
    if (!window.confirm("Kontext wirklich löschen? Onboarding-Daten und Interview-Notizen gehen verloren.")) return;
    clear();
    setMessage({ tone: "success", text: "Kontext gelöscht." });
  }

  const hasContext = ready && userContext !== null;

  return (
    <div className="flex flex-col gap-6">
      {/* ---------------- Status ---------------- */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Systemstatus</h2>
          <Button variant="ghost" size="sm" onClick={handleReloadHealth} disabled={healthLoading}>
            Neu laden
          </Button>
        </div>
        {healthError && (
          <p className="mb-3 rounded-md border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
            /api/health konnte nicht geladen werden ({healthError}).
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          <Card
            title="OpenAI"
            action={
              healthLoading ? (
                <Badge>lädt …</Badge>
              ) : health?.openaiConfigured ? (
                <Badge tone="success">konfiguriert</Badge>
              ) : (
                <Badge tone="warning">nicht konfiguriert</Badge>
              )
            }
          >
            {healthLoading ? (
              <p className="text-sm text-[var(--muted)]">Status wird geladen …</p>
            ) : health?.openaiConfigured ? (
              <p className="text-sm text-[var(--muted)]">
                <code className="rounded bg-[var(--surface-2)] px-1 py-0.5 text-xs">OPENAI_API_KEY</code> ist gesetzt.
                Agent, Outreach, Prep und Voice nutzen das Modell.
              </p>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Kein <code className="rounded bg-[var(--surface-2)] px-1 py-0.5 text-xs">OPENAI_API_KEY</code> gefunden.
                Trage ihn in <code className="rounded bg-[var(--surface-2)] px-1 py-0.5 text-xs">.env.local</code> ein und
                starte den Dev-Server neu. Bis dahin laufen alle Funktionen mit Template-Fallbacks.
              </p>
            )}
          </Card>

          <Card title="Modelle">
            <StatusRow
              label="Text"
              value={<code className="text-xs">{healthLoading ? "…" : health?.textModel ?? "–"}</code>}
            />
            <StatusRow
              label="Realtime / Voice"
              value={<code className="text-xs">{healthLoading ? "…" : health?.realtimeModel ?? "–"}</code>}
            />
            <p className="mt-2 text-xs text-[var(--muted)]">
              Anpassbar über <code>OPENAI_TEXT_MODEL</code> und <code>OPENAI_REALTIME_MODEL</code>.
            </p>
          </Card>

          <Card title="Datenbestand">
            <StatusRow label="Profile" value={healthLoading ? "…" : health?.profiles ?? "–"} />
            <StatusRow label="Events" value={healthLoading ? "…" : health?.events ?? "–"} />
            {health && (
              <div className="mt-2 border-t border-[var(--border)] pt-2">
                {(Object.keys(SOURCE_LABELS) as Array<keyof HealthResponse["sources"]>).map((key) => (
                  <StatusRow key={key} label={SOURCE_LABELS[key]} value={health.sources[key]} />
                ))}
                {withoutSource > 0 && <StatusRow label="Ohne Quellenangabe" value={withoutSource} />}
              </div>
            )}
          </Card>
        </div>
      </section>

      {/* ---------------- Mein Kontext ---------------- */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">Mein Kontext</h2>
        <Card
          title={
            hasContext ? (
              <>
                Gespeichert für <span className="text-[var(--accent)]">{userContext.name || "unbenannt"}</span>
              </>
            ) : (
              "Kein Kontext gespeichert"
            )
          }
          action={
            hasContext ? (
              <Badge tone={userContext.completedInterview ? "success" : "neutral"}>
                {userContext.completedInterview ? "Interview abgeschlossen" : "Interview offen"}
              </Badge>
            ) : undefined
          }
        >
          <p className="mb-3 text-sm text-[var(--muted)]">
            Dein Kontext (Onboarding + Agent-Interview) liegt nur lokal im Browser. Exportiere ihn als JSON, um ihn zu
            sichern oder auf einem anderen Gerät zu importieren.
          </p>

          <div className="mb-3 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={handleExport} disabled={!hasContext}>
              Als JSON exportieren
            </Button>
            <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
              JSON importieren
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportFile}
            />
            <Button variant="secondary" size="sm" onClick={handleLoadDemo}>
              Demo-Kontext laden
            </Button>
            <Button variant="danger" size="sm" onClick={handleClear} disabled={!hasContext}>
              Kontext löschen
            </Button>
          </div>

          {message && (
            <p
              className={
                message.tone === "success"
                  ? "mb-3 rounded-md bg-[var(--success-soft)] px-3 py-2 text-sm text-[var(--success)]"
                  : "mb-3 rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]"
              }
            >
              {message.text}
            </p>
          )}

          {!ready ? (
            <p className="text-sm text-[var(--muted)]">Kontext wird geladen …</p>
          ) : hasContext ? (
            <pre className="max-h-96 overflow-auto rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs leading-relaxed text-[var(--foreground)]">
              {JSON.stringify(userContext, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Noch nichts gespeichert. Starte das Onboarding oder lade den Demo-Kontext.
            </p>
          )}
        </Card>
      </section>

      {/* ---------------- Datenquellen ---------------- */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">Datenquellen</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="IdeaLab!-Export (echte Profile)">
            <p className="text-sm text-[var(--muted)]">
              Die 569 Teilnehmer:innen der IdeaLab! 2026 (Vallendar) liegen mit LinkedIn-Anreicherung in{" "}
              <code className="rounded bg-[var(--surface-2)] px-1 py-0.5 text-xs">exports/all-enriched-profiles.json</code>.
              Der Import normalisiert sie ins <code className="text-xs">Profile</code>-Format:
            </p>
            <pre className="mt-2 overflow-auto rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs text-[var(--foreground)]">
              node scripts/import-idealab.mjs
            </pre>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Ergebnis: <code>src/data/profiles/imported.json</code> (Quelle „linkedin“). Danach Dev-Server neu starten.
            </p>
          </Card>
          <Card title="Demo-Profile (Mock)">
            <p className="text-sm text-[var(--muted)]">
              Für die Demo ohne echten Export liegen handgeschriebene Profile in{" "}
              <code className="rounded bg-[var(--surface-2)] px-1 py-0.5 text-xs">src/data/profiles/*.json</code>{" "}
              (Co-Founder Tech/Commercial/Product, Investoren, Mentor:innen, Talente). Sie haben dieselbe Struktur wie
              echte Profile und sind mit Quelle „mock“ markiert.
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Alle Daten laufen über <code>src/lib/data.ts</code> – Seiten importieren nie direkt JSON.
            </p>
          </Card>
        </div>
      </section>

      {/* ---------------- Team ---------------- */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">Team</h2>
        <Card>
          <ul className="grid gap-3 sm:grid-cols-2">
            {TEAM.map((member) => (
              <li key={member.name} className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]">
                  {member.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">{member.name}</p>
                  <p className="text-xs text-[var(--muted)]">{member.role}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[var(--muted)]">
            Voya – OpenAI Hackathon, 26.09.2026.
          </p>
        </Card>
      </section>
    </div>
  );
}
