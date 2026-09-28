"use client";
/**
 * Onboarding-Formular über den kompletten UserContext.
 * Liest/schreibt ausschließlich über useUserContext (src/lib/user-context.ts),
 * Profile nur über den Daten-Zugang (src/lib/data.ts).
 * Vokabular (Verticals, Rollen) lokal – Quelle: docs/PARALLEL-WORK.md.
 *
 * Aufbau: IdeaLab-Import → fünf Karten (Wer bist du · Wen suchst du · Woran arbeitest du ·
 * Deine Stärken · Selbsteinschätzung) → Sticky-Fußleiste (Speichern / Demo laden / Zurücksetzen).
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { getProfiles } from "@/lib/data";
import { DEFAULT_USER_CONTEXT, useUserContext } from "@/lib/user-context";
import type { FounderRole, NetworkRole, Profile, Stage, UserContext } from "@/lib/types";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  Field,
  Input,
  LinkButton,
  ScoreBar,
  Skeleton,
  Textarea,
  cx,
} from "@/components/ui";
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

/** Schnellvorschläge für den Tag-Input – nur Komfort, keine Pflicht. */
const STRENGTH_SUGGESTIONS = [
  "Prototyping",
  "Sales",
  "Fundraising",
  "Produkt",
  "UX/Design",
  "Marketing",
  "Recruiting",
  "Data/AI",
  "Finanzen",
  "Operations",
];

function founderRoleLabel(role?: FounderRole): string | undefined {
  return FOUNDER_ROLES.find((r) => r.value === role)?.label;
}

function networkRoleLabel(role: NetworkRole): string {
  return NETWORK_ROLES.find((r) => r.value === role)?.label ?? role;
}

const NAME_INPUT_ID = "onboarding-name";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

function uniqueCaseInsensitive(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((s) => {
    const k = s.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Wie vollständig ist das Profil? Grobe Heuristik für Fortschrittsanzeige und Fußleiste. */
function completeness(f: UserContext): { pct: number; missing: string[] } {
  const checks: { label: string; done: boolean }[] = [
    { label: "Name", done: f.name.trim().length > 0 },
    { label: "Rolle", done: f.founderRole !== undefined },
    { label: "Gesuchte Kontakte", done: f.lookingFor.length > 0 },
    { label: "Verticals", done: f.verticals.length > 0 || f.openToIdeas },
    { label: "Idee", done: f.idea.trim().length > 0 || f.openToIdeas },
    { label: "Stärken", done: f.strengths.length > 0 },
    { label: "Selbsteinschätzung", done: Object.values(f.dims).some((v) => v !== 5) },
  ];
  const done = checks.filter((c) => c.done).length;
  return {
    pct: Math.round((done / checks.length) * 100),
    missing: checks.filter((c) => !c.done).map((c) => c.label),
  };
}

/* ------------------------------------------------------------------ */
/* Kleine UI-Bausteine                                                 */
/* ------------------------------------------------------------------ */

/** Kartentitel mit dezenter Schrittnummer. */
function StepTitle({ n, children }: { n: number; children: ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className="font-mono text-[11px] font-medium tabular-nums text-[var(--muted)]">{String(n).padStart(2, "0")}</span>
      <span>{children}</span>
    </span>
  );
}

/** Beschriftete Chip-Gruppe: Label links, Meta rechts, Hilfetext unten. */
function ChipGroup({
  label,
  meta,
  hint,
  children,
}: {
  label: string;
  meta?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div role="group" aria-label={label} className="min-w-0">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-[var(--muted)]">{label}</span>
        {meta && <span className="text-xs text-[var(--muted)]">{meta}</span>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
      {hint && <div className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{hint}</div>}
    </div>
  );
}

/** Chip als Umschalter – Zustand zusätzlich für Screenreader. */
function ToggleChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Chip active={active} onClick={onClick}>
      {children}
      <span className="sr-only">{active ? ", ausgewählt" : ""}</span>
    </Chip>
  );
}

/** Segment-Steuerung für eine Einfachauswahl (z. B. Stage). */
function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex max-w-full flex-wrap gap-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] p-1"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cx(
              "h-8 rounded-[calc(var(--radius-sm)_-_3px)] px-3 text-xs font-medium transition",
              FOCUS,
              active
                ? "bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-sm)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Switch-artiger Chip (role=switch) für Ja/Nein. */
function SwitchChip({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx(
        "inline-flex h-9 max-w-full items-center gap-2.5 rounded-full border pl-1.5 pr-3.5 text-sm font-medium transition",
        FOCUS,
        checked
          ? "border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-2)]",
      )}
    >
      <span
        aria-hidden
        className={cx(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-[var(--accent)]" : "bg-[var(--surface-3)]",
        )}
      >
        <span
          className={cx(
            "absolute left-0.5 h-4 w-4 rounded-full bg-[var(--surface)] shadow-[var(--shadow-sm)] transition-transform",
            checked && "translate-x-4",
          )}
        />
      </span>
      <span className="truncate">{children}</span>
    </button>
  );
}

/** Entfernbare Pille (Tag). */
function Pill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex h-7 max-w-full items-center gap-1 rounded-full bg-[var(--accent-soft)] pl-2.5 pr-1 text-xs font-medium text-[var(--accent)]">
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${label} entfernen`}
        className={cx(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full leading-none transition hover:bg-[var(--accent)] hover:text-[var(--accent-contrast)]",
          FOCUS,
        )}
      >
        ×
      </button>
    </span>
  );
}

/** Tag-Input: Pillen und Eingabe im selben Rahmen. Enter/Komma fügt hinzu, Backspace entfernt die letzte. */
function TagInput({
  tags,
  onChange,
  placeholder,
  suggestions,
  ariaLabel,
}: {
  tags: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    const parts = draft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 0) onChange(uniqueCaseInsensitive([...tags, ...parts]));
    setDraft("");
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
      return;
    }
    if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      e.preventDefault();
      onChange(tags.slice(0, -1));
    }
  };

  const open = (suggestions ?? [])
    .filter((s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()))
    .slice(0, 8);

  return (
    <div>
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex min-h-11 w-full cursor-text flex-wrap items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 shadow-[var(--shadow-sm)] transition focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--ring)]"
      >
        {tags.map((t) => (
          <Pill key={t} label={t} onRemove={() => onChange(tags.filter((x) => x !== t))} />
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={commit}
          placeholder={tags.length === 0 ? placeholder : "Weitere …"}
          aria-label={ariaLabel}
          className="h-7 min-w-32 flex-1 bg-transparent px-1 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
        />
      </div>
      {open.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {open.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(uniqueCaseInsensitive([...tags, s]))}
              className={cx(
                "inline-flex h-7 items-center rounded-full border border-dashed border-[var(--border)] px-2.5 text-xs text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]",
                FOCUS,
              )}
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
      <circle cx="9" cy="9" r="5.5" />
      <path d="m13.5 13.5 3.5 3.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path d="m4.5 10.5 3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Erfolgszustand nach dem Speichern – mit zwei nächsten Schritten. */
function SuccessCard({ name }: { name: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);
  return (
    <section
      ref={ref}
      role="status"
      className="fr-fade-in rounded-[var(--radius)] border border-[var(--success)]/40 bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)]">
          <CheckIcon />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
            Profil gespeichert{name ? `, ${name}` : ""}.
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">
            Der Agent und das Matching nutzen ab jetzt diese Angaben. Du kannst jederzeit zurückkommen und nachschärfen.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <LinkButton href="/assistant">Weiter zum Agent-Interview</LinkButton>
            <LinkButton href="/candidates" variant="secondary">
              Kandidaten ansehen
            </LinkButton>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Platzhalter, bis localStorage gelesen ist (SSR/Hydration). */
function LoadingSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Profil wird geladen">
      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-3 w-64 max-w-full" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
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
    return <LoadingSkeleton />;
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
      .slice(0, 6);
  }, [allProfiles, profileQuery]);
  const showHits = profileQuery.trim().length >= 2;

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
    setError(null);
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
      constraints: form.constraints?.trim() || undefined,
      strengths: form.strengths.map((s) => s.trim()).filter(Boolean),
    });
  };

  const wantsCofounder = form.lookingFor.includes("cofounder");
  const seeksOwnRole = form.founderRole !== undefined && form.lookingForRoles.includes(form.founderRole);
  const { pct, missing } = completeness(form);
  const dimsAvg = (Object.values(form.dims).reduce((a, b) => a + b, 0) / 5).toLocaleString("de-DE", {
    maximumFractionDigits: 1,
  });

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
    >
      {/* Fortschritt */}
      <Card padding="sm">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-1 py-0.5">
          <div className="min-w-56 flex-1">
            <div className="mb-1.5 flex items-baseline justify-between text-xs">
              <span className="font-medium text-[var(--muted)]">Profil-Vollständigkeit</span>
              <span className="font-semibold tabular-nums text-[var(--foreground)]">{pct} %</span>
            </div>
            <ScoreBar value={pct} tone={pct === 100 ? "success" : "accent"} />
          </div>
          <p className="text-xs text-[var(--muted)]">
            {missing.length > 0 ? (
              <>
                Noch offen: <span className="text-[var(--foreground)]">{missing.join(", ")}</span>
              </>
            ) : (
              "Alles ausgefüllt – nur noch speichern."
            )}
          </p>
        </div>
      </Card>

      {/* IdeaLab-Import */}
      <Card
        title="Aus IdeaLab-Teilnehmerprofil übernehmen"
        description="Du warst bei der IdeaLab! 2026? Such deinen Namen – Name, Headline, LinkedIn, Verticals, Rolle und Team-Radar werden vorbefüllt."
        action={
          importedFrom ? (
            <Badge tone="success">Übernommen: {importedFrom}</Badge>
          ) : (
            <Badge>{allProfiles.length} Profile</Badge>
          )
        }
      >
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--muted)]">
            <SearchIcon />
          </span>
          <Input
            type="search"
            className="pl-9"
            placeholder="Name oder Headline, z. B. „Max“ …"
            value={profileQuery}
            onChange={(e) => setProfileQuery(e.target.value)}
            onKeyDown={onProfileKey}
            aria-label="Teilnehmerprofil suchen"
            autoComplete="off"
          />
        </div>
        {showHits && (
          <div className="mt-2">
            {profileHits.length === 0 ? (
              <p className="px-1 text-xs text-[var(--muted)]">Kein Profil gefunden – dann einfach unten selbst ausfüllen.</p>
            ) : (
              <>
                <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)]">
                  {profileHits.map((p, i) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => applyProfile(p)}
                        className={cx(
                          "flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[var(--surface-2)]",
                          FOCUS,
                          i === 0 && "bg-[var(--surface-2)]/60",
                        )}
                      >
                        <Avatar src={p.photoUrl} name={p.name} size={36} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[var(--foreground)]">{p.name}</p>
                          <p className="truncate text-xs text-[var(--muted)]">{p.headline}</p>
                        </div>
                        <Badge tone="accent" className="hidden sm:inline-flex">
                          {founderRoleLabel(p.founderRole) ?? networkRoleLabel(p.networkRole)}
                        </Badge>
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 px-1 text-[11px] text-[var(--muted)]">Enter übernimmt den ersten Treffer.</p>
              </>
            )}
          </div>
        )}
      </Card>

      {/* 01 Wer bist du */}
      <Card
        title={<StepTitle n={1}>Wer bist du</StepTitle>}
        description="So spricht dich der Agent an – und so erscheinst du im Matching."
        action={<Avatar name={form.name.trim() || "?"} size={36} />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name *">
            <Input
              id={NAME_INPUT_ID}
              value={form.name}
              onChange={(e) => {
                patch({ name: e.target.value });
                if (error) setError(null);
              }}
              placeholder="Vor- und Nachname"
              autoComplete="name"
              aria-invalid={error ? true : undefined}
              className="aria-[invalid=true]:border-[var(--danger)]"
            />
          </Field>
          <Field label="Headline" hint="Ein Satz, wie auf LinkedIn.">
            <Input
              value={form.headline ?? ""}
              onChange={(e) => patch({ headline: e.target.value })}
              placeholder="z. B. Tech-Founder, Full-Stack & AI"
            />
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
          <div className="sm:col-span-2">
            <ChipGroup
              label="Meine Rolle im Gründerteam"
              meta={form.founderRole ? founderRoleLabel(form.founderRole) : "Einfachauswahl"}
            >
              {FOUNDER_ROLES.map((r) => (
                <ToggleChip
                  key={r.value}
                  active={form.founderRole === r.value}
                  onClick={() => patch({ founderRole: form.founderRole === r.value ? undefined : r.value })}
                >
                  {r.label}
                </ToggleChip>
              ))}
            </ChipGroup>
          </div>
        </div>
      </Card>

      {/* 02 Wen suchst du */}
      <Card
        title={<StepTitle n={2}>Wen suchst du</StepTitle>}
        description="Welche Kontakte du brauchst und welche Rollen im Team fehlen – das steuert das Matching direkt."
      >
        <div className="space-y-5">
          <ChipGroup label="Ich suche" meta={`${form.lookingFor.length} ausgewählt`}>
            {NETWORK_ROLES.map((r) => (
              <ToggleChip
                key={r.value}
                active={form.lookingFor.includes(r.value)}
                onClick={() => patch({ lookingFor: toggle(form.lookingFor, r.value) })}
              >
                {r.label}
              </ToggleChip>
            ))}
          </ChipGroup>

          <ChipGroup
            label="Mir fehlt im Team"
            meta={form.lookingForRoles.length > 0 ? `${form.lookingForRoles.length} ausgewählt` : "Optional"}
            hint={
              <>
                <p>
                  {wantsCofounder
                    ? "Das Matching bevorzugt Co-Founder mit genau diesen Rollen."
                    : "Hilft dem Team-Radar auch, wenn du gerade keinen Co-Founder suchst."}
                </p>
                {seeksOwnRole && (
                  <p className="mt-1 text-[var(--warning)]">
                    Du suchst deine eigene Rolle ({founderRoleLabel(form.founderRole)}) – Absicht? Meist ergänzt eine
                    andere Rolle das Team besser.
                  </p>
                )}
              </>
            }
          >
            {FOUNDER_ROLES.map((r) => (
              <ToggleChip
                key={r.value}
                active={form.lookingForRoles.includes(r.value)}
                onClick={() => patch({ lookingForRoles: toggle(form.lookingForRoles, r.value) })}
              >
                {r.label}
              </ToggleChip>
            ))}
          </ChipGroup>

          <Field
            label="Rahmenbedingungen"
            hint="Zeit, Standort/remote, Muss- und Ausschlusskriterien – der Agent berücksichtigt das bei Vorschlägen."
          >
            <Textarea
              rows={3}
              value={form.constraints ?? ""}
              onChange={(e) => patch({ constraints: e.target.value })}
              placeholder="z. B. Berlin oder remote · ab Januar 20 h/Woche · kein Krypto, keine Hardware"
            />
          </Field>
        </div>
      </Card>

      {/* 03 Woran arbeitest du */}
      <Card
        title={<StepTitle n={3}>Woran arbeitest du</StepTitle>}
        description="Verticals, Stage und deine Idee – oder die Offenheit für alles."
      >
        <div className="space-y-5">
          <div>
            <ChipGroup
              label="Verticals"
              meta={form.verticals.length > 0 ? `${form.verticals.length} ausgewählt` : "Mehrfachauswahl"}
            >
              {verticalChips.map((v) => (
                <ToggleChip
                  key={v}
                  active={form.verticals.includes(v)}
                  onClick={() => patch({ verticals: toggle(form.verticals, v) })}
                >
                  {v}
                </ToggleChip>
              ))}
            </ChipGroup>
            <div className="mt-3 flex gap-2">
              <Input
                value={verticalInput}
                onChange={(e) => setVerticalInput(e.target.value)}
                onKeyDown={onVerticalKey}
                placeholder="Eigenes Vertical, Enter fügt hinzu"
                aria-label="Eigenes Vertical"
                className="sm:max-w-xs"
              />
              <Button type="button" variant="secondary" onClick={addVertical} disabled={!verticalInput.trim()}>
                Hinzufügen
              </Button>
            </div>
          </div>

          <Field label="Stage">
            <Segmented label="Stage" options={STAGES} value={form.stage ?? "idea"} onChange={(stage) => patch({ stage })} />
          </Field>

          <Field label="Deine Idee">
            <Textarea
              rows={4}
              value={form.idea}
              onChange={(e) => patch({ idea: e.target.value })}
              placeholder="Woran arbeitest du – oder was reizt dich? Zwei, drei Sätze reichen."
            />
          </Field>

          <div>
            <SwitchChip checked={form.openToIdeas} onChange={(openToIdeas) => patch({ openToIdeas })}>
              Ich bin offen für alle Ideen
            </SwitchChip>
            <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
              Offen für alles? Dann zählt beim Matching vor allem, wie gut ihr euch ergänzt – weniger das Vertical.
            </p>
          </div>
        </div>
      </Card>

      {/* 04 Deine Stärken */}
      <Card
        title={<StepTitle n={4}>Deine Stärken</StepTitle>}
        description="Drei bis fünf Schlagworte reichen. Enter oder Komma fügt hinzu, Backspace entfernt die letzte."
        action={form.strengths.length > 0 ? <Badge tone="accent">{form.strengths.length}</Badge> : undefined}
      >
        <TagInput
          tags={form.strengths}
          onChange={(strengths) => patch({ strengths })}
          placeholder="z. B. Prototyping, Sales, Fundraising"
          suggestions={STRENGTH_SUGGESTIONS}
          ariaLabel="Stärke hinzufügen"
        />
      </Card>

      {/* 05 Selbsteinschätzung */}
      <Card
        title={<StepTitle n={5}>Selbsteinschätzung</StepTitle>}
        description="Team-Radar, 0–10 je Dimension. Ehrlich ist besser als bescheiden – daraus berechnet das Matching, wer dich ergänzt."
        action={<Badge>Ø {dimsAvg}</Badge>}
      >
        <DimsSliders value={form.dims} onChange={(dims) => patch({ dims })} />
      </Card>

      {saved && !dirty && <SuccessCard name={form.name.trim()} />}

      {/* Sticky Fußleiste */}
      <div className="sticky bottom-3 z-20 pt-1">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]/90 px-4 py-3 shadow-[var(--shadow-md)] backdrop-blur">
          <div className="flex min-w-0 items-center gap-2 text-xs">
            {error ? (
              <p role="alert" className="font-medium text-[var(--danger)]">
                {error}
              </p>
            ) : dirty ? (
              <>
                <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--warning)]" />
                <span className="text-[var(--muted)]">Ungespeicherte Änderungen</span>
              </>
            ) : saved ? (
              <>
                <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--success)]" />
                <span className="text-[var(--muted)]">Gespeichert</span>
              </>
            ) : (
              <span className="text-[var(--muted)]">{pct} % ausgefüllt</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClear}>
              Zurücksetzen
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={onLoadDemo}>
              Demo laden
            </Button>
            <Button type="submit" size="sm">
              Speichern
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
