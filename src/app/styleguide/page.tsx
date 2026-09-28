/**
 * Styleguide – Referenzseite für den Design-Pivot (docs/DESIGN.md).
 * Server Component, reine Anzeige: alle Design-Tokens aus src/app/globals.css und alle
 * UI-Primitives aus src/components/ui/index.tsx in allen Varianten, plus Typo-Skala.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  Field,
  Input,
  Kicker,
  Label,
  LinkButton,
  PageHeader,
  ScoreBar,
  ScoreRing,
  SectionTitle,
  Select,
  Skeleton,
  Stat,
  Textarea,
} from "@/components/ui";

export const metadata: Metadata = {
  title: "Styleguide – FounderRadar",
  description: "Design-Tokens, UI-Primitives und Typografie von FounderRadar in allen Varianten.",
};

/* ------------------------------------------------------------------ */
/* Daten                                                               */
/* ------------------------------------------------------------------ */

interface ColorToken {
  name: string;
  light: string;
  dark: string;
  usage: string;
}

/** Farb-Tokens aus src/app/globals.css. Die Hex-Werte sind dokumentarisch – die Wahrheit steht in der CSS-Datei. */
const COLOR_TOKENS: ColorToken[] = [
  { name: "--background", light: "#f7f6f2", dark: "#131217", usage: "Seitenhintergrund (warm)" },
  { name: "--foreground", light: "#1b1a17", dark: "#ece9e2", usage: "Primärer Text" },
  { name: "--muted", light: "#6d6860", dark: "#a09b92", usage: "Sekundärtext, Labels, Hints" },
  { name: "--surface", light: "#ffffff", dark: "#1b1a20", usage: "Cards, Eingabefelder" },
  { name: "--surface-2", light: "#f2f0ea", dark: "#232228", usage: "Sekundär-Flächen, Hover" },
  { name: "--surface-3", light: "#e6e2d9", dark: "#2e2d34", usage: "Pressed, ScoreBar-Track" },
  { name: "--surface-elevated", light: "#ffffff", dark: "#222127", usage: "Popover, Drawer, schwebende Flächen" },
  { name: "--border", light: "#e5e1d8", dark: "#2c2b32", usage: "Rahmenlinien" },
  { name: "--sidebar-bg", light: "#fcfbf8", dark: "#17161c", usage: "Sidebar-Hintergrund" },
  { name: "--accent", light: "#4338ca", dark: "#a5b4fc", usage: "Primäre Aktion, Links, Fokus" },
  { name: "--accent-strong", light: "#3730a3", dark: "#c7d2fe", usage: "Akzent Hover / Pressed" },
  { name: "--accent-soft", light: "#e9e7fb", dark: "#2a2857", usage: "Akzent-Flächen (Badge, Nav aktiv)" },
  { name: "--accent-contrast", light: "#ffffff", dark: "#131217", usage: "Text auf Akzent" },
  { name: "--success", light: "#1b7a47", dark: "#5ed394", usage: "Positiv – Text" },
  { name: "--success-soft", light: "#dcf3e4", dark: "#16402b", usage: "Positiv – Fläche" },
  { name: "--warning", light: "#a2570b", dark: "#f2b95a", usage: "Hinweis – Text" },
  { name: "--warning-soft", light: "#fbeed3", dark: "#4a3110", usage: "Hinweis – Fläche" },
  { name: "--danger", light: "#b73333", dark: "#f28b8b", usage: "Fehler / destruktiv – Text" },
  { name: "--danger-soft", light: "#fce3e0", dark: "#4e2020", usage: "Fehler / destruktiv – Fläche" },
];

const SHAPE_TOKENS: { name: string; value: string; usage: string }[] = [
  { name: "--radius-sm", value: "8px", usage: "Skeleton, kleine Flächen" },
  { name: "--radius", value: "10px", usage: "Buttons, Inputs, Nav-Einträge" },
  { name: "--radius-lg", value: "14px", usage: "Cards, Stat, EmptyState" },
  { name: "--shadow-sm", value: "1–2 px", usage: "Cards, Buttons, Inputs" },
  { name: "--shadow", value: "8–20 px, weich", usage: "Hover-Lift, Primary-Hover" },
  { name: "--shadow-lg", value: "12–32 px", usage: "Drawer, Popover" },
  { name: "--ring", value: "Akzent, 40 %", usage: "Fokusring (focus-visible)" },
  { name: "--sidebar-width", value: "264px", usage: "Desktop-Sidebar" },
  { name: "--header-height", value: "56px / 64px", usage: "Header mobil / ab md" },
];

const TYPE_SCALE: { cls: string; px: string; usage: string }[] = [
  { cls: "text-display", px: "26–32 px", usage: "Seitentitel (PageHeader)" },
  { cls: "text-title", px: "20 px", usage: "Abschnitts-Titel (SectionTitle)" },
  { cls: "text-body", px: "15 px / 1.5", usage: "Fließtext (Body-Standard)" },
  { cls: "text-caption", px: "12 px", usage: "Hinweise, Meta, gedämpft" },
  { cls: "text-eyebrow", px: "11 px, Versalien", usage: "Kicker / Eyebrow" },
  { cls: "text-xs", px: "12 px", usage: "Badges, Labels" },
  { cls: "text-sm", px: "14 px", usage: "Standard-UI, Listen, Buttons" },
  { cls: "text-2xl", px: "24 px", usage: "Kennzahlen (Stat)" },
];

const FONT_WEIGHTS: { cls: string; label: string }[] = [
  { cls: "font-normal", label: "Normal (400)" },
  { cls: "font-medium", label: "Medium (500)" },
  { cls: "font-semibold", label: "Semibold (600)" },
  { cls: "font-bold", label: "Bold (700)" },
];

const BUTTON_VARIANTS = [
  { variant: "primary", label: "Primär" },
  { variant: "secondary", label: "Sekundär (Outline)" },
  { variant: "ghost", label: "Ghost" },
  { variant: "outline", label: "Outline (Akzent)" },
  { variant: "danger", label: "Danger" },
] as const;

const BUTTON_SIZES = ["sm", "md", "lg"] as const;

const BADGE_TONES = [
  { tone: "neutral", label: "Vertical: FinTech" },
  { tone: "accent", label: "Co-Founder" },
  { tone: "success", label: "Match 82" },
  { tone: "warning", label: "Risiko" },
  { tone: "danger", label: "Red Flag" },
] as const;

const SECTIONS: { id: string; label: string }[] = [
  { id: "tokens", label: "Tokens" },
  { id: "typografie", label: "Typografie" },
  { id: "buttons", label: "Buttons" },
  { id: "cards", label: "Cards" },
  { id: "badges", label: "Badges & Chips" },
  { id: "formulare", label: "Formulare" },
  { id: "pageheader", label: "PageHeader" },
  { id: "scores", label: "Scores" },
  { id: "stat", label: "Stat" },
  { id: "avatar", label: "Avatar" },
  { id: "emptystate", label: "EmptyState" },
  { id: "skeleton", label: "Skeleton" },
];

const SAMPLE_TEXT = "Die richtigen Kontakte finden – Co-Founder, Investoren, Mentor:innen.";

/* ------------------------------------------------------------------ */
/* Lokale Hilfskomponenten (nur für diese Seite)                       */
/* ------------------------------------------------------------------ */

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <SectionTitle>{title}</SectionTitle>
      {description && <p className="-mt-2 mb-4 text-sm text-[var(--muted)]">{description}</p>}
      {children}
    </section>
  );
}

function Demo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function Swatch({ token }: { token: ColorToken }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
      <div className="h-14 w-full border-b border-[var(--border)]" style={{ background: `var(${token.name})` }} />
      <div className="p-3">
        <code className="text-xs font-semibold text-[var(--foreground)]">{token.name}</code>
        <p className="mt-1 text-xs text-[var(--muted)]">{token.usage}</p>
        <p className="mt-1 font-mono text-[11px] text-[var(--muted)]">
          {token.light} · {token.dark}
        </p>
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Seite                                                               */
/* ------------------------------------------------------------------ */

export default function StyleguidePage() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Design-System"
        title="Styleguide"
        subtitle="Alle Design-Tokens und UI-Primitives in allen Varianten. Ändert sich globals.css oder ui/index.tsx, ändert sich diese Seite mit."
        action={<LinkButton href="/" variant="secondary">Zum Dashboard</LinkButton>}
      />

      <nav aria-label="Abschnitte" className="mb-8 flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="inline-flex h-9 items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 text-xs font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-2)]"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <Card className="mb-10" title="Regeln in Kurzform">
        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--foreground)]">
          <li>
            Farben nur über <code className="font-mono text-xs">var(--…)</code> – keine Hex-Werte, keine Tailwind-Palettenfarben in Komponenten.
          </li>
          <li>UI-Texte Deutsch, Code Englisch. Mobile-first (Basis 375 px), Dark-Mode über die Systemeinstellung, Touch-Ziele ≥ 40 px.</li>
          <li>
            Pivotieren in drei Dateien: <code className="font-mono text-xs">src/app/globals.css</code>,{" "}
            <code className="font-mono text-xs">src/components/ui/index.tsx</code>, <code className="font-mono text-xs">src/components/layout/*</code>.
            Details: <code className="font-mono text-xs">docs/DESIGN.md</code>.
          </li>
        </ul>
      </Card>

      <div className="space-y-14">
        {/* ---------------------------------------------------------- */}
        <Section id="tokens" title="Design-Tokens" description="CSS-Variablen aus src/app/globals.css. Die Farbfläche zeigt den aktuell aktiven Wert (Light oder Dark, je nach Systemeinstellung).">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {COLOR_TOKENS.map((t) => (
              <Swatch key={t.name} token={t} />
            ))}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <Card title="Form, Tiefe & Layout">
              <ul className="divide-y divide-[var(--border)] text-sm">
                {SHAPE_TOKENS.map((t) => (
                  <li key={t.name} className="flex items-baseline justify-between gap-3 py-2">
                    <div>
                      <code className="text-xs font-semibold text-[var(--foreground)]">{t.name}</code>
                      <p className="text-xs text-[var(--muted)]">{t.usage}</p>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-[var(--muted)]">{t.value}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <div className="space-y-3">
              <Card title="Radien & Schatten live">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="h-14 w-14 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] shadow-[var(--shadow-sm)]" title="--radius-sm / --shadow-sm" />
                  <div className="h-14 w-14 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] shadow-[var(--shadow)]" title="--radius / --shadow" />
                  <div className="h-14 w-14 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)] shadow-[var(--shadow-lg)]" title="--radius-lg / --shadow-lg" />
                  <div className="h-14 w-14 rounded-[var(--radius)] bg-[var(--surface)] ring-2 ring-[var(--ring)] ring-offset-2 ring-offset-[var(--background)]" title="--ring" />
                </div>
                <p className="mt-3 text-xs text-[var(--muted)]">sm · md · lg · Fokusring. Schatten sind im Dark-Mode fast unsichtbar – Tiefe kommt dort aus den Flächen.</p>
              </Card>
              <Card title="Schrift-Tokens">
                <p className="text-sm text-[var(--foreground)]">
                  <code className="text-xs text-[var(--muted)]">--font-sans</code> → {SAMPLE_TEXT}
                </p>
                <p className="mt-2 font-mono text-sm text-[var(--foreground)]">
                  <code className="font-sans text-xs text-[var(--muted)]">--font-mono</code> → score: 82 · dims: 7/4/9/5/8
                </p>
              </Card>
            </div>
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section id="typografie" title="Typografie" description="Geist Sans. Body 15 px / 1.5. Überschriften mit leicht negativem Letter-Spacing. Skala als Utility-Klassen in globals.css.">
          <Card>
            <ul className="divide-y divide-[var(--border)]">
              {TYPE_SCALE.map((t) => (
                <li key={t.cls} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-6">
                  <div className="w-44 shrink-0">
                    <code className="text-xs font-semibold text-[var(--foreground)]">.{t.cls}</code>
                    <p className="text-xs text-[var(--muted)]">
                      {t.px} · {t.usage}
                    </p>
                  </div>
                  <p className={`${t.cls} min-w-0 truncate ${t.cls === "text-caption" || t.cls === "text-eyebrow" ? "" : "text-[var(--foreground)]"}`}>{SAMPLE_TEXT}</p>
                </li>
              ))}
            </ul>
          </Card>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Card title="Schriftschnitte">
              <ul className="space-y-1 text-sm text-[var(--foreground)]">
                {FONT_WEIGHTS.map((w) => (
                  <li key={w.cls} className={w.cls}>
                    {w.label} – Gründer:innen finden Co-Founder
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Textfarben">
              <p className="text-sm text-[var(--foreground)]">Primärtext in --foreground</p>
              <p className="text-sm text-[var(--muted)]">Sekundärtext in --muted</p>
              <p className="text-sm text-[var(--accent)]">Akzent / Link in --accent</p>
              <p className="text-sm text-[var(--success)]">Positiv in --success</p>
              <p className="text-sm text-[var(--warning)]">Hinweis in --warning</p>
              <p className="text-sm text-[var(--danger)]">Fehler in --danger</p>
              <p className="mt-2 text-sm">
                Markierter Text: <span className="bg-[var(--accent)] text-[var(--accent-contrast)]">::selection</span> in Akzentfarbe
              </p>
            </Card>
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section id="buttons" title="Button & LinkButton" description="Fünf Varianten, drei Größen, Zustände hover / active / focus-visible / disabled / loading. LinkButton hat dieselbe Optik, rendert aber next/link.">
          <Card>
            <div className="space-y-5">
              {BUTTON_VARIANTS.map((v) => (
                <Demo key={v.variant} label={`variant="${v.variant}" – ${v.label}`}>
                  {BUTTON_SIZES.map((size) => (
                    <Button key={size} variant={v.variant} size={size}>
                      Anschreiben ({size})
                    </Button>
                  ))}
                  <Button variant={v.variant} disabled>
                    Deaktiviert
                  </Button>
                  <Button variant={v.variant} loading>
                    Lädt …
                  </Button>
                </Demo>
              ))}
              <Demo label="Mit Icon">
                <Button>
                  <PlusIcon />
                  Zur Shortlist
                </Button>
                <Button variant="secondary" size="sm">
                  <PlusIcon />
                  Filter
                </Button>
              </Demo>
            </div>
          </Card>
          <Card className="mt-3" title="LinkButton" description="Gleiche Props: href, variant, size, target.">
            <Demo label="Alle Varianten">
              {BUTTON_VARIANTS.map((v) => (
                <LinkButton key={v.variant} href="#buttons" variant={v.variant}>
                  {v.label}
                </LinkButton>
              ))}
            </Demo>
          </Card>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section id="cards" title="Card, SectionTitle & Divider" description="Container für alles. Header erscheint nur, wenn title, description oder action gesetzt ist. padding: none · sm · md · lg; interactive: Hover-Lift.">
          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <p className="text-sm text-[var(--foreground)]">Ohne Titel – nur Inhalt.</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Für Listen-Einträge und kompakte Blöcke.</p>
            </Card>
            <Card title="Mit Titel" description="Optionale Beschreibung unter dem Titel.">
              <p className="text-sm text-[var(--foreground)]">Der Titel ist ein h3 in 15 px semibold.</p>
            </Card>
            <Card title="Titel + Aktion" action={<Button size="sm" variant="secondary">Alle</Button>}>
              <p className="text-sm text-[var(--foreground)]">Die Aktion sitzt rechts im Header.</p>
            </Card>
            <Card interactive title="interactive">
              <p className="text-sm text-[var(--muted)]">Hebt sich beim Hover leicht an – für klickbare Karten.</p>
            </Card>
            <Card padding="sm" title="padding=&quot;sm&quot;">
              <p className="text-sm text-[var(--muted)]">Kompakt (12 px).</p>
            </Card>
            <Card padding="none" title="padding=&quot;none&quot;">
              <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)] text-sm">
                <li className="px-4 py-2.5">Listenzeile 1</li>
                <li className="px-4 py-2.5">Listenzeile 2</li>
              </ul>
            </Card>
          </div>

          <div className="mt-4">
            <SectionTitle action={<Button size="sm" variant="ghost">Aktion</Button>}>SectionTitle mit Aktion</SectionTitle>
            <Divider label="Divider mit Label" className="my-4" />
            <Divider />
          </div>

          <Card className="mt-4" title="Beispiel: Kandidaten-Card" action={<Badge tone="success" dot>Match 82</Badge>}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <Avatar name="Lena Hoffmann" size={56} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--foreground)]">Lena Hoffmann</p>
                <p className="text-sm text-[var(--muted)]">Commercial Co-Founder · Ex-BCG · sucht Tech-Co-Founder im B2B-SaaS</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="accent">Co-Founder</Badge>
                  <Badge>B2B SaaS</Badge>
                  <Badge>AI</Badge>
                  <Badge tone="warning">Connector</Badge>
                </div>
                <div className="mt-3">
                  <ScoreBar value={82} label="Match-Score" />
                </div>
              </div>
              <div className="flex gap-2 sm:flex-col">
                <Button size="sm">Anschreiben</Button>
                <Button size="sm" variant="ghost">
                  Vorbereiten
                </Button>
              </div>
            </div>
          </Card>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section id="badges" title="Badge & Chip" description="Badge: fünf Tones, optional mit dot. Chip: umschaltbarer Filter (active, onClick) – mind. 36 px hoch fürs Touch-Ziel.">
          <div className="grid gap-3 md:grid-cols-2">
            <Card title="Badge">
              <Demo label="tone">
                {BADGE_TONES.map((b) => (
                  <div key={b.tone} className="flex flex-col items-start gap-1">
                    <Badge tone={b.tone}>{b.label}</Badge>
                    <code className="text-[11px] text-[var(--muted)]">{b.tone}</code>
                  </div>
                ))}
              </Demo>
              <div className="mt-4">
                <Demo label="dot">
                  <Badge tone="success" dot>
                    Verbunden
                  </Badge>
                  <Badge tone="warning" dot>
                    Verbinde …
                  </Badge>
                  <Badge tone="accent" dot>
                    Spricht
                  </Badge>
                  <Badge dot>Getrennt</Badge>
                </Demo>
              </div>
            </Card>
            <Card title="Chip">
              <Demo label="Filter-Chips">
                <Chip active>Alle</Chip>
                <Chip>Co-Founder</Chip>
                <Chip>Investoren</Chip>
                <Chip>Mentor:innen</Chip>
                <Chip>Talente</Chip>
              </Demo>
            </Card>
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section id="formulare" title="Formulare" description="Input, Textarea, Select, Label und Field. Fokus: Rahmen in --accent + Ring in --ring. Höhe 40 px.">
          <div className="grid gap-3 md:grid-cols-2">
            <Card title="Field + Input">
              <div className="space-y-4">
                <Field label="Name">
                  <Input placeholder="Wie heißt du?" defaultValue="Marvin" />
                </Field>
                <Field label="LinkedIn-URL" hint="Optional – wir lesen Headline und Erfahrung daraus.">
                  <Input type="url" placeholder="https://linkedin.com/in/…" />
                </Field>
                <div>
                  <Label htmlFor="sg-disabled">Deaktiviertes Feld</Label>
                  <Input id="sg-disabled" disabled defaultValue="Nicht änderbar" />
                </div>
              </div>
            </Card>
            <Card title="Textarea + Select">
              <div className="space-y-4">
                <Field label="Deine Idee" hint="Ein bis zwei Sätze reichen – oder „offen für alles“.">
                  <Textarea rows={3} defaultValue="AI-Tool, das Gründer:innen die richtigen Co-Founder und Investoren auf Konferenzen findet." />
                </Field>
                <Field label="Eigene Rolle im Team">
                  <Select defaultValue="tech">
                    <option value="tech">Tech</option>
                    <option value="commercial">Commercial</option>
                    <option value="product">Product</option>
                    <option value="design">Design</option>
                    <option value="operations">Operations</option>
                    <option value="domain-expert">Domain-Expert:in</option>
                  </Select>
                </Field>
                <Field label="Phase">
                  <Select defaultValue="idea">
                    <option value="idea">Idee</option>
                    <option value="pre-seed">Pre-Seed</option>
                    <option value="seed">Seed</option>
                  </Select>
                </Field>
              </div>
            </Card>
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section id="pageheader" title="PageHeader & Kicker" description="Steht oben auf jeder Seite: optionaler eyebrow, h1 in .text-display, Untertitel gedämpft, Aktion rechts. Bricht auf schmalen Bildschirmen um.">
          <Card>
            <PageHeader
              eyebrow="127 Profile"
              title="Kandidaten"
              subtitle="Sortiert nach Match-Score. Filtere nach Rolle, Vertical, Event oder Persönlichkeitstyp."
              action={
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm">
                    Filter
                  </Button>
                  <Button size="sm">Agent fragen</Button>
                </div>
              }
            />
            <Kicker>Kicker allein</Kicker>
            <p className="text-xs text-[var(--muted)]">Abstand nach unten (mb-8) gehört zum PageHeader.</p>
          </Card>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section id="scores" title="ScoreBar & ScoreRing" description="ScoreBar: Balken mit Verlauf, Label links, Wert rechts, max standardmäßig 100. ScoreRing: SVG-Kreis 0–100 mit Wert in der Mitte. tone: accent · success · warning · danger.">
          <div className="grid gap-3 md:grid-cols-2">
            <Card title="ScoreBar">
              <div className="space-y-3">
                <ScoreBar value={82} label="Match-Score" tone="success" />
                <ScoreBar value={47} label="Komplementarität" />
                <ScoreBar value={15} label="Schwacher Match" tone="warning" />
                <ScoreBar value={7} max={10} label="Vision (0–10)" />
                <ScoreBar value={30} />
              </div>
            </Card>
            <Card title="ScoreRing">
              <Demo label="size · tone · label">
                <ScoreRing value={82} label="Match" tone="success" />
                <ScoreRing value={47} label="Komplementär" />
                <ScoreRing value={22} label="Risiko" tone="warning" size={56} />
                <ScoreRing value={91} size={96} label="Team-Score" />
                <ScoreRing value={64} size={40} />
              </Demo>
            </Card>
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section id="stat" title="Stat" description="KPI-Kachel: label, value, optional hint, icon und href (dann klickbar mit Hover-Lift).">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Kontakte" value={569} hint="alle Profile" href="#stat" />
            <Stat label="Co-Founder" value={214} hint="suchen ein Team" icon={<PlusIcon />} href="#stat" />
            <Stat label="Investoren" value={48} hint="Angels & VCs" />
            <Stat label="Match-Score" value="82 %" hint="Ø Top 10" icon={<PlusIcon />} />
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section id="avatar" title="Avatar" description="Mit Bild: rundes Foto mit Ring. Ohne Bild: bis zu zwei Initialen, Farbton deterministisch aus dem Namen (gleiche Person, gleiche Farbe – in beiden Modi). Größe in Pixeln, Standard 40.">
          <Card>
            <div className="grid gap-6 sm:grid-cols-2">
              <Demo label="Mit Bild (src)">
                <Avatar src="https://i.pravatar.cc/200?u=styleguide-demo" name="Demo Person" size={32} />
                <Avatar src="https://i.pravatar.cc/200?u=styleguide-demo" name="Demo Person" size={40} />
                <Avatar src="https://i.pravatar.cc/200?u=styleguide-demo" name="Demo Person" size={56} />
                <Avatar src="https://i.pravatar.cc/200?u=styleguide-demo" name="Demo Person" size={80} />
              </Demo>
              <Demo label="Ohne Bild (Initialen)">
                <Avatar name="Max Mustermann" size={32} />
                <Avatar name="Lena Hoffmann" size={40} />
                <Avatar name="Jonas Weber" size={56} />
                <Avatar name="Aisha Khan" size={64} />
                <Avatar name="Jolanda" size={80} />
              </Demo>
            </div>
          </Card>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section id="emptystate" title="EmptyState" description="Für leere Listen und fehlende Daten. Gestrichelter Rahmen, zentriert, optionales Icon und Aktion.">
          <div className="grid gap-3 md:grid-cols-2">
            <EmptyState
              icon={<PlusIcon />}
              title="Noch keine Shortlist"
              body="Merke dir Kandidaten über den Stern auf einer Profil-Card."
              action={<LinkButton href="#cards">Kandidaten ansehen</LinkButton>}
            />
            <EmptyState title="Keine Treffer" body="Lockere die Filter oder frag den Agenten." />
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section id="skeleton" title="Skeleton" description="Ladeplatzhalter mit Shimmer. className bestimmt Form und Größe (Standard: h-4 w-full).">
          <Card>
            <div className="flex items-start gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          </Card>
        </Section>
      </div>

      <footer className="mt-14 border-t border-[var(--border)] pt-6 text-xs text-[var(--muted)]">
        Änderungen an <code className="font-mono">globals.css</code> und <code className="font-mono">ui/index.tsx</code> wirken sich sofort auf diese Seite aus.
        Design-Handoff: <code className="font-mono">docs/DESIGN.md</code> · Architektur: <code className="font-mono">docs/ARCHITECTURE.md</code>
      </footer>
    </div>
  );
}
