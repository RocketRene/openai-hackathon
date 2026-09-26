"use client";
/**
 * Onboarding-Formular über den kompletten UserContext.
 * Liest/schreibt ausschließlich über useUserContext (src/lib/user-context.ts),
 * Profile nur über den Daten-Zugang (src/lib/data.ts).
 * Vokabular (Verticals, Rollen) lokal – Quelle: docs/PARALLEL-WORK.md.
 */
import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { getProfiles } from "@/lib/data";
import { DEFAULT_USER_CONTEXT, useUserContext } from "@/lib/user-context";
import type { FounderRole, NetworkRole, Profile, Stage, UserContext } from "@/lib/types";
import { Avatar, Badge, Button, Card, Field, Input, LinkButton, Select, Textarea, cx } from "@/components/ui";
import DimsSliders from "./DimsSliders";

/* ------------------------------------------------------------------ */
/* Vokabular (aus docs/PARALLEL-WORK.md, Kleinschreibung)              */
/* ------------------------------------------------------------------ */

const VERTICALS = [
  "ai",
  "fintech",
  "healthtech",
  "climate",
  "b2b saas",
  "consumer",
  "robotics",
  "defense",
  "edtech",
  "mobility",
  "proptech",
  "deeptech",
  "ecommerce",
  "hr tech",
  "legaltech",
  "energy",
  "biotech",
  "media",
];

const FOUNDER_ROLES: { value: FounderRole; label: string }[] = [
  { value: "tech", label: "Tech" },
  { value: "commercial", label: "Commercial / Sales" },
  { value: "product", label: "Product" },
  { value: "design", label: "Design" },
  { value: "operations", label: "Operations" },
  { value: "domain-expert", label: "Domain-Expert:in" },
];

const NETWORK_ROLES: { value: NetworkRole; label: string }[] = [
  { value: "cofounder", label: "Co-Founder" },
  { value: "investor", label: "Investor" },
  { value: "mentor", label: "Mentor" },
  { value: "talent", label: "Talent" },
  { value: "expert", label: "Expert:in" },
];

const STAGES: { value: Stage; label: string }[] = [
  { value: "idea", label: "Idee" },
  { value: "pre-seed", label: "Pre-Seed" },
  { value: "seed", label: "Seed" },
  { value: "series-a", label: "Series A" },
  { value: "growth", label: "Growth" },
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

function CheckChip({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <label
      className={cx(
        "inline-flex cursor-pointer select-none items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition",
        checked
          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-2)]",
      )}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-[var(--accent)]" />
      {label}
    </label>
  );
}

function ToggleChip({ selected, children, onClick }: { selected: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cx(
        "rounded-full border px-3 py-1 text-xs font-medium transition",
        selected
          ? "border-transparent bg-[var(--accent)] text-white"
          : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[var(--surface-3)]",
      )}
    >
      {children}
    </button>
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
            className="ml-0.5 rounded-full px-1 leading-none hover:bg-[var(--accent)] hover:text-white"
          >
            ×
          </button>
        </Badge>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Außen: wartet auf localStorage, remountet das Formular bei          */
/* externen Änderungen (Speichern, Demo, Reset) über den key.          */
/* ------------------------------------------------------------------ */

export default function OnboardingForm() {
  const { userContext, ready, replace, loadDemo, clear } = useUserContext();
  const [saved, setSaved] = useState(false);

  if (!ready) {
    return <p className="text-sm text-[var(--muted)]">Profil wird geladen …</p>;
  }

  const initial = userContext ?? DEFAULT_USER_CONTEXT;

  return (
    <FormBody
      key={initial.updatedAt}
      initial={initial}
      saved={saved}
      onSave={(ctx) => {
        replace(ctx);
        setSaved(true);
      }}
      onLoadDemo={() => {
        loadDemo();
        setSaved(false);
      }}
      onClear={() => {
        if (!window.confirm("Profil wirklich zurücksetzen? Alle Angaben gehen verloren.")) return;
        clear();
        setSaved(false);
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
  saved,
  onSave,
  onLoadDemo,
  onClear,
}: {
  initial: UserContext;
  saved: boolean;
  onSave: (ctx: UserContext) => void;
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
    return allProfiles
      .filter((p) => p.name.toLowerCase().includes(q) || p.headline.toLowerCase().includes(q))
      .slice(0, 8);
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
  };

  const onProfileKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (profileHits[0]) applyProfile(profileHits[0]);
    }
  };

  /* --- Verticals --- */
  const verticalChips = useMemo(
    () => Array.from(new Set([...VERTICALS, ...form.verticals])),
    [form.verticals],
  );

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

  /* --- Speichern --- */
  const handleSave = () => {
    const name = form.name.trim();
    if (!name) {
      setError("Bitte gib deinen Namen an – so spricht dich der Agent an.");
      const el = document.getElementById(NAME_INPUT_ID);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      el?.focus();
      return;
    }
    setError(null);
    onSave({
      ...form,
      name,
      headline: form.headline?.trim() ?? "",
      linkedinUrl: form.linkedinUrl?.trim() ?? "",
      idea: form.idea.trim(),
      strengths: form.strengths.map((s) => s.trim()).filter(Boolean),
    });
  };

  const wantsCofounder = form.lookingFor.includes("cofounder");

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
    >
      {/* IdeaLab-Import */}
      <Card
        title="Aus IdeaLab-Teilnehmerprofil übernehmen"
        action={importedFrom ? <Badge tone="success">Übernommen: {importedFrom}</Badge> : undefined}
      >
        <p className="mb-2 text-xs text-[var(--muted)]">
          Du warst bei der IdeaLab! 2026? Such deinen Namen – Name, Headline, LinkedIn, Verticals, Rolle und
          Team-Radar werden vorbefüllt.
        </p>
        <Input
          type="search"
          placeholder="Name eingeben, z. B. „Max“ …"
          value={profileQuery}
          onChange={(e) => setProfileQuery(e.target.value)}
          onKeyDown={onProfileKey}
          aria-label="Teilnehmerprofil suchen"
        />
        {profileQuery.trim().length >= 2 && (
          <div className="mt-2 space-y-1">
            {profileHits.length === 0 && (
              <p className="text-xs text-[var(--muted)]">Kein Profil gefunden – dann einfach unten selbst ausfüllen.</p>
            )}
            {profileHits.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyProfile(p)}
                className="flex w-full items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 text-left transition hover:bg-[var(--surface-2)]"
              >
                <Avatar src={p.photoUrl} name={p.name} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--foreground)]">{p.name}</p>
                  <p className="truncate text-xs text-[var(--muted)]">{p.headline}</p>
                </div>
                <Badge tone="accent">{founderRoleLabel(p.founderRole) ?? networkRoleLabel(p.networkRole)}</Badge>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Über dich */}
      <Card title="Über dich">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name *">
            <Input
              id={NAME_INPUT_ID}
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Vor- und Nachname"
              autoComplete="name"
            />
          </Field>
          <Field label="Headline" hint="Ein Satz, wie auf LinkedIn.">
            <Input
              value={form.headline ?? ""}
              onChange={(e) => patch({ headline: e.target.value })}
              placeholder="z. B. Tech-Founder, Full-Stack & AI"
            />
          </Field>
          <Field label="LinkedIn-URL">
            <Input
              type="url"
              value={form.linkedinUrl ?? ""}
              onChange={(e) => patch({ linkedinUrl: e.target.value })}
              placeholder="https://www.linkedin.com/in/…"
              inputMode="url"
            />
          </Field>
          <Field label="Meine Rolle im Gründerteam">
            <Select
              value={form.founderRole ?? ""}
              onChange={(e) => patch({ founderRole: (e.target.value || undefined) as FounderRole | undefined })}
            >
              <option value="">– bitte wählen –</option>
              {FOUNDER_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Stage">
            <Select value={form.stage ?? "idea"} onChange={(e) => patch({ stage: e.target.value as Stage })}>
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      {/* Wen suchst du */}
      <Card title="Wen suchst du?">
        <fieldset>
          <legend className="mb-1 block text-xs font-medium text-[var(--muted)]">Ich suche</legend>
          <div className="flex flex-wrap gap-2">
            {NETWORK_ROLES.map((r) => (
              <CheckChip
                key={r.value}
                label={r.label}
                checked={form.lookingFor.includes(r.value)}
                onChange={() => patch({ lookingFor: toggle(form.lookingFor, r.value) })}
              />
            ))}
          </div>
        </fieldset>
        <fieldset className="mt-4">
          <legend className="mb-1 block text-xs font-medium text-[var(--muted)]">Mir fehlt im Team</legend>
          <div className="flex flex-wrap gap-2">
            {FOUNDER_ROLES.map((r) => (
              <CheckChip
                key={r.value}
                label={r.label}
                checked={form.lookingForRoles.includes(r.value)}
                onChange={() => patch({ lookingForRoles: toggle(form.lookingForRoles, r.value) })}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {wantsCofounder
              ? "Das Matching bevorzugt Co-Founder mit genau diesen Rollen."
              : "Optional – hilft dem Team-Radar auch, wenn du gerade keinen Co-Founder suchst."}
          </p>
        </fieldset>
      </Card>

      {/* Verticals */}
      <Card title="Verticals">
        <div className="flex flex-wrap gap-1.5">
          {verticalChips.map((v) => (
            <ToggleChip
              key={v}
              selected={form.verticals.includes(v)}
              onClick={() => patch({ verticals: toggle(form.verticals, v) })}
            >
              {v}
            </ToggleChip>
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

      {/* Idee */}
      <Card title="Deine Idee">
        <Textarea
          rows={4}
          value={form.idea}
          onChange={(e) => patch({ idea: e.target.value })}
          placeholder="Woran arbeitest du – oder was reizt dich? Zwei, drei Sätze reichen."
        />
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--foreground)]">
          <input
            type="checkbox"
            checked={form.openToIdeas}
            onChange={(e) => patch({ openToIdeas: e.target.checked })}
            className="accent-[var(--accent)]"
          />
          Ich bin offen für alle Ideen
        </label>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Offen für alles? Dann zählt beim Matching vor allem, wie gut ihr euch ergänzt – weniger das Vertical.
        </p>
      </Card>

      {/* Stärken */}
      <Card title="Deine Stärken">
        <TagList items={form.strengths} onRemove={(s) => patch({ strengths: form.strengths.filter((x) => x !== s) })} />
        <div className="flex gap-2">
          <Input
            value={strengthInput}
            onChange={(e) => setStrengthInput(e.target.value)}
            onKeyDown={onStrengthKey}
            placeholder="z. B. Prototyping, Sales, Fundraising – Enter fügt hinzu"
            aria-label="Stärke hinzufügen"
          />
          <Button type="button" variant="secondary" onClick={addStrength} disabled={!strengthInput.trim()}>
            Hinzufügen
          </Button>
        </div>
        <p className="mt-1 text-xs text-[var(--muted)]">Mehrere auf einmal mit Komma trennen.</p>
      </Card>

      {/* Team-Radar */}
      <Card title="Selbsteinschätzung (Team-Radar)">
        <p className="mb-3 text-xs text-[var(--muted)]">
          Ehrlich ist besser als bescheiden: Aus diesen Werten berechnet das Matching, wer dich ergänzt.
        </p>
        <DimsSliders value={form.dims} onChange={(dims) => patch({ dims })} />
      </Card>

      {/* Aktionen */}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit">Speichern</Button>
        <Button type="button" variant="secondary" onClick={onLoadDemo}>
          Demo-Profil laden
        </Button>
        <Button type="button" variant="ghost" onClick={onClear}>
          Zurücksetzen
        </Button>
        {dirty && <span className="text-xs text-[var(--muted)]">Ungespeicherte Änderungen</span>}
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      {saved && !dirty && (
        <div role="status" className="rounded-lg border border-[var(--success)] bg-[var(--success-soft)] p-4">
          <p className="text-sm font-medium text-[var(--success)]">Profil gespeichert.</p>
          <p className="mt-1 text-sm text-[var(--foreground)]">
            Der Agent und das Matching nutzen ab jetzt diese Angaben.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <LinkButton href="/assistant">Weiter zum Agent-Interview</LinkButton>
            <LinkButton href="/candidates" variant="secondary">
              Kandidaten ansehen
            </LinkButton>
          </div>
        </div>
      )}
    </form>
  );
}
