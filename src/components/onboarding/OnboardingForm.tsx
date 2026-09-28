"use client";
/**
 * Onboarding als 3-Schritte-Stepper über den kompletten UserContext:
 *   1 „Du"          – Name, Headline, LinkedIn, eigene Rolle, Stage (+ IdeaLab-Profil übernehmen)
 *   2 „Deine Idee"  – Idee / offen für Ideen, Verticals, Stärken
 *   3 „Wen du suchst" – Netzwerk-Rollen, Team-Rollen, Team-Radar, Rahmenbedingungen
 * Liest/schreibt ausschließlich über useUserContext (src/lib/user-context.ts),
 * Profile nur über den Daten-Zugang (src/lib/data.ts).
 */
import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getProfiles, getVerticals } from "@/lib/data";
import { DEFAULT_USER_CONTEXT, useUserContext } from "@/lib/user-context";
import type { FounderRole, NetworkRole, Profile, Stage, UserContext } from "@/lib/types";
import { Avatar, Badge, Button, Card, Chip, Field, Input, Textarea, cx } from "@/components/ui";
import { formatVertical } from "@/components/candidates/CandidateCard";
import DimsSliders from "./DimsSliders";

/* ------------------------------------------------------------------ */
/* Vokabular                                                           */
/* ------------------------------------------------------------------ */

const FOUNDER_ROLES: { value: FounderRole; label: string }[] = [
  { value: "tech", label: "Tech" },
  { value: "commercial", label: "Commercial / Sales" },
  { value: "product", label: "Product" },
  { value: "design", label: "Design" },
  { value: "operations", label: "Operations" },
  { value: "domain-expert", label: "Domain-Expert:in" },
];

const NETWORK_ROLES: { value: NetworkRole; label: string; hint: string }[] = [
  { value: "cofounder", label: "Co-Founder", hint: "jemand, der mitgründet" },
  { value: "investor", label: "Investor:in", hint: "Angels & VCs" },
  { value: "mentor", label: "Mentor:in", hint: "Rat & Erfahrung" },
  { value: "talent", label: "Talent", hint: "erste Hires" },
  { value: "expert", label: "Expert:in", hint: "Fachwissen auf Zeit" },
];

const STAGES: { value: Stage; label: string }[] = [
  { value: "idea", label: "Idee" },
  { value: "pre-seed", label: "Pre-Seed" },
  { value: "seed", label: "Seed" },
  { value: "series-a", label: "Series A" },
  { value: "growth", label: "Growth" },
];

const STEPS: { key: "you" | "idea" | "search"; title: string; text: string }[] = [
  { key: "you", title: "Du", text: "Wer du bist" },
  { key: "idea", title: "Deine Idee", text: "Woran du arbeitest" },
  { key: "search", title: "Wen du suchst", text: "Was dir fehlt" },
];

function founderRoleLabel(role?: FounderRole): string | undefined {
  return FOUNDER_ROLES.find((r) => r.value === role)?.label;
}

function networkRoleLabel(role: NetworkRole): string {
  return NETWORK_ROLES.find((r) => r.value === role)?.label ?? role;
}

const NAME_INPUT_ID = "onboarding-name";

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

/* ------------------------------------------------------------------ */
/* Kleine UI-Bausteine                                                 */
/* ------------------------------------------------------------------ */

function GroupLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-2">
      <p className="text-sm font-medium text-[var(--foreground)]">{children}</p>
      {hint && <p className="text-xs text-[var(--muted)]">{hint}</p>}
    </div>
  );
}

function TagList({ items, onRemove }: { items: string[]; onRemove: (item: string) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item} tone="accent" className="gap-1 pr-1">
          {item}
          <button
            type="button"
            onClick={() => onRemove(item)}
            aria-label={`${item} entfernen`}
            className="ml-0.5 rounded-full px-1 leading-none hover:bg-[var(--accent)] hover:text-[var(--accent-contrast)]"
          >
            ×
          </button>
        </Badge>
      ))}
    </div>
  );
}

function Stepper({ current, done, onJump }: { current: number; done: boolean[]; onJump: (i: number) => void }) {
  const pct = Math.round(((current + 1) / STEPS.length) * 100);
  return (
    <div>
      <ol className="grid grid-cols-3 gap-2" aria-label="Schritte">
        {STEPS.map((step, i) => {
          const active = i === current;
          const complete = done[i] && !active;
          return (
            <li key={step.key} className="min-w-0">
              <button
                type="button"
                onClick={() => onJump(i)}
                aria-current={active ? "step" : undefined}
                className={cx(
                  "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] border px-2.5 py-2 text-left transition sm:px-3",
                  active
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]",
                )}
              >
                <span
                  className={cx(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    active
                      ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                      : complete
                        ? "bg-[var(--success-soft)] text-[var(--success)]"
                        : "bg-[var(--surface-2)] text-[var(--muted)]",
                  )}
                >
                  {complete ? "✓" : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={cx("block truncate text-sm font-medium", active ? "text-[var(--accent)]" : "text-[var(--foreground)]")}>{step.title}</span>
                  <span className="hidden truncate text-xs text-[var(--muted)] sm:block">{step.text}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[var(--surface-3)]" aria-hidden>
        <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Schritt {current + 1} von {STEPS.length}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Außen: wartet auf localStorage, remountet das Formular bei          */
/* externen Änderungen (Speichern, Demo, Reset) über den key.          */
/* ------------------------------------------------------------------ */

export default function OnboardingForm() {
  const { userContext, ready, replace, loadDemo, clear } = useUserContext();
  const router = useRouter();
  // Schritt und Speicherstatus leben hier, weil FormBody beim Speichern (key=updatedAt) neu gemountet wird.
  const [step, setStep] = useState(0);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  if (!ready) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="fr-skeleton h-14 rounded-[var(--radius-sm)]" />
        <div className="fr-skeleton h-72 rounded-[var(--radius)]" />
      </div>
    );
  }

  const initial = userContext ?? DEFAULT_USER_CONTEXT;

  return (
    <FormBody
      key={initial.updatedAt}
      initial={initial}
      hasProfile={Boolean(userContext)}
      step={step}
      onStep={setStep}
      savedAt={savedAt}
      onSave={(ctx, next) => {
        replace(ctx);
        setSavedAt(new Date().toISOString());
        if (next) router.push(next);
      }}
      onLoadDemo={() => {
        loadDemo();
        setSavedAt(null);
      }}
      onClear={() => {
        if (!window.confirm("Profil wirklich zurücksetzen? Alle Angaben gehen verloren.")) return;
        clear();
        setStep(0);
        setSavedAt(null);
      }}
    />
  );
}

export { OnboardingForm };

/* ------------------------------------------------------------------ */
/* Innen: das eigentliche Formular                                      */
/* ------------------------------------------------------------------ */

function FormBody({
  initial,
  hasProfile,
  step,
  onStep: setStep,
  savedAt,
  onSave,
  onLoadDemo,
  onClear,
}: {
  initial: UserContext;
  hasProfile: boolean;
  step: number;
  onStep: (step: number) => void;
  savedAt: string | null;
  onSave: (ctx: UserContext, next?: string) => void;
  onLoadDemo: () => void;
  onClear: () => void;
}) {
  const [form, setForm] = useState<UserContext>(initial);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strengthInput, setStrengthInput] = useState("");
  const [verticalInput, setVerticalInput] = useState("");
  const [profileQuery, setProfileQuery] = useState("");
  const [importedFrom, setImportedFrom] = useState<string | null>(null);

  const patch = (p: Partial<UserContext>) => {
    setForm((f) => ({ ...f, ...p }));
    setDirty(true);
  };

  /* --- IdeaLab-Profil übernehmen --- */
  const allProfiles = useMemo(() => getProfiles(), []);
  const profileHits = useMemo(() => {
    const q = profileQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return allProfiles.filter((p) => p.name.toLowerCase().includes(q) || p.headline.toLowerCase().includes(q)).slice(0, 6);
  }, [allProfiles, profileQuery]);

  const applyProfile = (p: Profile) => {
    setForm((f) => ({
      ...f,
      name: p.name,
      headline: p.headline,
      linkedinUrl: p.linkedinUrl ?? f.linkedinUrl ?? "",
      verticals: [...p.verticals],
      dims: { ...p.dims },
      founderRole: p.founderRole ?? f.founderRole,
    }));
    setDirty(true);
    setImportedFrom(p.name);
    setProfileQuery("");
    setError(null);
  };

  const onProfileKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (profileHits[0]) applyProfile(profileHits[0]);
    }
  };

  /* --- Verticals --- */
  const verticalChips = useMemo(() => Array.from(new Set([...getVerticals(), ...form.verticals])), [form.verticals]);

  const addVertical = () => {
    const v = verticalInput.trim().toLowerCase();
    if (!v) return;
    if (!form.verticals.includes(v)) patch({ verticals: [...form.verticals, v] });
    setVerticalInput("");
  };

  const onVerticalKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addVertical();
    }
  };

  /* --- Stärken (Tag-Input) --- */
  const addStrength = () => {
    const parts = strengthInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    patch({ strengths: Array.from(new Set([...form.strengths, ...parts])) });
    setStrengthInput("");
  };

  const onStrengthKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addStrength();
    }
  };

  /* --- Validierung & Navigation --- */
  const nameOk = form.name.trim().length > 0;
  const stepDone = [nameOk, form.idea.trim().length > 0 || form.openToIdeas || form.verticals.length > 0, form.lookingFor.length > 0];

  const requireName = (): boolean => {
    if (nameOk) {
      setError(null);
      return true;
    }
    setError("Bitte gib deinen Namen an – so spricht dich der Agent an.");
    setStep(0);
    window.setTimeout(() => {
      const el = document.getElementById(NAME_INPUT_ID);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      el?.focus();
    }, 0);
    return false;
  };

  const goTo = (i: number) => {
    if (i > 0 && !requireName()) return;
    setError(null);
    setStep(Math.max(0, Math.min(STEPS.length - 1, i)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const normalized = (): UserContext => ({
    ...form,
    name: form.name.trim(),
    headline: form.headline?.trim() ?? "",
    linkedinUrl: form.linkedinUrl?.trim() ?? "",
    idea: form.idea.trim(),
    constraints: form.constraints?.trim() || undefined,
    strengths: form.strengths.map((s) => s.trim()).filter(Boolean),
  });

  const handleSave = (next?: string) => {
    if (!requireName()) return;
    onSave(normalized(), next);
    setDirty(false);
  };

  const wantsCofounder = form.lookingFor.includes("cofounder");
  const seeksOwnRole = form.founderRole !== undefined && form.lookingForRoles.includes(form.founderRole);
  const isLast = step === STEPS.length - 1;

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (isLast) handleSave("/candidates");
        else goTo(step + 1);
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Stepper current={step} done={stepDone} onJump={goTo} />
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onLoadDemo}>
            Demo-Kontext laden
          </Button>
          {hasProfile && (
            <Button type="button" variant="ghost" size="sm" onClick={onClear}>
              Zurücksetzen
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-[var(--radius-sm)] border border-[var(--danger)]/40 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      {/* ------------------------------------------------------------ */}
      {/* Schritt 1: Du                                                 */}
      {/* ------------------------------------------------------------ */}
      {step === 0 && (
        <div className="space-y-5 fr-fade-in">
          <Card
            title="Warst du bei der IdeaLab 2026?"
            description="Dann such deinen Namen – Headline, LinkedIn, Verticals, Rolle und Team-Radar werden vorbefüllt."
            action={importedFrom ? <Badge tone="success">Übernommen: {importedFrom}</Badge> : undefined}
          >
            <Input
              type="search"
              placeholder="Deinen Namen eingeben …"
              value={profileQuery}
              onChange={(e) => setProfileQuery(e.target.value)}
              onKeyDown={onProfileKey}
              aria-label="Teilnehmerprofil suchen"
            />
            {profileQuery.trim().length >= 2 && (
              <div className="mt-2 space-y-1">
                {profileHits.length === 0 && <p className="text-xs text-[var(--muted)]">Kein Profil gefunden – dann einfach unten selbst ausfüllen.</p>}
                {profileHits.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyProfile(p)}
                    className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-2 text-left transition hover:border-[var(--accent)]/50 hover:bg-[var(--surface-2)]"
                  >
                    <Avatar src={p.photoUrl} name={p.name} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--foreground)]">{p.name}</p>
                      <p className="truncate text-xs text-[var(--muted)]">{p.headline}</p>
                    </div>
                    <Badge tone="accent" className="hidden sm:inline-flex">
                      {founderRoleLabel(p.founderRole) ?? networkRoleLabel(p.networkRole)}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card title="Über dich">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name *">
                <Input
                  id={NAME_INPUT_ID}
                  value={form.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder="Vor- und Nachname"
                  autoComplete="name"
                  aria-invalid={error ? true : undefined}
                />
              </Field>
              <Field label="Headline" hint="Ein Satz, wie auf LinkedIn.">
                <Input value={form.headline ?? ""} onChange={(e) => patch({ headline: e.target.value })} placeholder="z. B. Tech-Founder, Full-Stack & AI" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="LinkedIn-URL">
                  <Input
                    type="url"
                    value={form.linkedinUrl ?? ""}
                    onChange={(e) => patch({ linkedinUrl: e.target.value })}
                    placeholder="https://www.linkedin.com/in/…"
                    inputMode="url"
                  />
                </Field>
              </div>
            </div>

            <div className="mt-5">
              <GroupLabel hint="Welche Rolle füllst du selbst aus?">Meine Rolle im Gründerteam</GroupLabel>
              <div className="flex flex-wrap gap-1.5">
                {FOUNDER_ROLES.map((r) => (
                  <Chip key={r.value} active={form.founderRole === r.value} onClick={() => patch({ founderRole: form.founderRole === r.value ? undefined : r.value })}>
                    {r.label}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <GroupLabel hint="Wo steht dein Vorhaben gerade?">Stage</GroupLabel>
              <div className="flex flex-wrap gap-1.5">
                {STAGES.map((s) => (
                  <Chip key={s.value} active={(form.stage ?? "idea") === s.value} onClick={() => patch({ stage: s.value })}>
                    {s.label}
                  </Chip>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------ */}
      {/* Schritt 2: Deine Idee                                         */}
      {/* ------------------------------------------------------------ */}
      {step === 1 && (
        <div className="space-y-5 fr-fade-in">
          <Card title="Deine Idee" description="Zwei, drei Sätze reichen – oder sag, dass du offen bist.">
            <Textarea
              rows={4}
              value={form.idea}
              onChange={(e) => patch({ idea: e.target.value })}
              placeholder="Woran arbeitest du – oder was reizt dich?"
            />
            <label
              className={cx(
                "mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-sm)] border px-3 py-2.5 transition",
                form.openToIdeas ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]",
              )}
            >
              <span>
                <span className="block text-sm font-medium text-[var(--foreground)]">Ich bin offen für Ideen</span>
                <span className="block text-xs text-[var(--muted)]">Dann zählt beim Matching vor allem, wie gut ihr euch ergänzt – weniger das Vertical.</span>
              </span>
              <input
                type="checkbox"
                role="switch"
                aria-checked={form.openToIdeas}
                checked={form.openToIdeas}
                onChange={(e) => patch({ openToIdeas: e.target.checked })}
                className="h-5 w-5 shrink-0 accent-[var(--accent)]"
              />
            </label>
          </Card>

          <Card title="Verticals" description="In welchen Branchen suchst du Anschluss? Mehrere möglich.">
            <div className="flex flex-wrap gap-1.5">
              {verticalChips.map((v) => (
                <Chip key={v} active={form.verticals.includes(v)} onClick={() => patch({ verticals: toggle(form.verticals, v) })}>
                  {formatVertical(v)}
                </Chip>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                value={verticalInput}
                onChange={(e) => setVerticalInput(e.target.value)}
                onKeyDown={onVerticalKey}
                placeholder="Eigenes Vertical, Enter fügt hinzu"
                aria-label="Eigenes Vertical"
              />
              <Button type="button" variant="secondary" onClick={addVertical} disabled={!verticalInput.trim()}>
                Hinzufügen
              </Button>
            </div>
          </Card>

          <Card title="Deine Stärken" description="Was bringst du mit? Mehrere auf einmal mit Komma trennen.">
            <TagList items={form.strengths} onRemove={(s) => patch({ strengths: form.strengths.filter((x) => x !== s) })} />
            <div className="flex gap-2">
              <Input
                value={strengthInput}
                onChange={(e) => setStrengthInput(e.target.value)}
                onKeyDown={onStrengthKey}
                placeholder="z. B. Prototyping, Sales, Fundraising"
                aria-label="Stärke hinzufügen"
              />
              <Button type="button" variant="secondary" onClick={addStrength} disabled={!strengthInput.trim()}>
                Hinzufügen
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------ */}
      {/* Schritt 3: Wen du suchst                                      */}
      {/* ------------------------------------------------------------ */}
      {step === 2 && (
        <div className="space-y-5 fr-fade-in">
          <Card title="Wen suchst du?">
            <fieldset>
              <GroupLabel hint="Mehrere möglich – alle laufen über denselben Match-Mechanismus.">Ich suche</GroupLabel>
              <div className="grid gap-2 sm:grid-cols-2">
                {NETWORK_ROLES.map((r) => {
                  const active = form.lookingFor.includes(r.value);
                  return (
                    <button
                      key={r.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => patch({ lookingFor: toggle(form.lookingFor, r.value) })}
                      className={cx(
                        "flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                        active ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]",
                      )}
                    >
                      <span>
                        <span className={cx("block text-sm font-medium", active ? "text-[var(--accent)]" : "text-[var(--foreground)]")}>{r.label}</span>
                        <span className="block text-xs text-[var(--muted)]">{r.hint}</span>
                      </span>
                      <span
                        className={cx(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs",
                          active ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]" : "border-[var(--border)]",
                        )}
                        aria-hidden
                      >
                        {active ? "✓" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="mt-5">
              <GroupLabel
                hint={
                  wantsCofounder
                    ? "Das Matching bevorzugt Co-Founder mit genau diesen Rollen."
                    : "Optional – hilft dem Team-Radar auch, wenn du gerade keinen Co-Founder suchst."
                }
              >
                Mir fehlt im Team
              </GroupLabel>
              <div className="flex flex-wrap gap-1.5">
                {FOUNDER_ROLES.map((r) => (
                  <Chip key={r.value} active={form.lookingForRoles.includes(r.value)} onClick={() => patch({ lookingForRoles: toggle(form.lookingForRoles, r.value) })}>
                    {r.label}
                  </Chip>
                ))}
              </div>
              {seeksOwnRole && (
                <p className="mt-2 text-xs text-[var(--warning)]">
                  Du suchst deine eigene Rolle ({founderRoleLabel(form.founderRole)}) – Absicht? Meist ergänzt eine andere Rolle das Team besser.
                </p>
              )}
            </fieldset>
          </Card>

          <Card title="Selbsteinschätzung (Team-Radar)" description="Ehrlich ist besser als bescheiden: Aus diesen Werten berechnet Voya, wer dich ergänzt.">
            <DimsSliders value={form.dims} onChange={(dims) => patch({ dims })} />
          </Card>

          <Card title="Rahmenbedingungen" description="Standort oder remote, Zeit pro Woche, Start, Finanzierung, Ausschlusskriterien.">
            <Textarea
              rows={3}
              value={form.constraints ?? ""}
              onChange={(e) => patch({ constraints: e.target.value })}
              placeholder="z. B. Berlin oder remote, Vollzeit ab Januar, bootstrapped bis Seed, kein Krypto"
            />
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------ */}
      {/* Navigation                                                    */}
      {/* ------------------------------------------------------------ */}
      <div className="sticky bottom-0 -mx-4 border-t border-[var(--border)] bg-[var(--background)]/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-[var(--radius)] sm:border sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button type="button" variant="secondary" onClick={() => goTo(step - 1)}>
                Zurück
              </Button>
            )}
            <span className="text-xs text-[var(--muted)]">
              {dirty ? "Ungespeicherte Änderungen" : savedAt ? "Gespeichert" : hasProfile ? "Profil geladen" : "Noch kein Profil"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!isLast && (
              <Button type="button" variant="ghost" onClick={() => handleSave()}>
                Speichern
              </Button>
            )}
            {isLast ? (
              <Button type="submit">Speichern & Matches ansehen</Button>
            ) : (
              <Button type="submit">Weiter</Button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
