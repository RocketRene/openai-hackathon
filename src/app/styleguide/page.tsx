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
  EmptyState,
  Field,
  Input,
  Label,
  LinkButton,
  PageHeader,
  ScoreBar,
  Select,
  Textarea,
} from "@/components/ui";

export const metadata: Metadata = {
  title: "Styleguide – Voya",
  description: "Design-Tokens, UI-Primitives und Typografie von Voya in allen Varianten.",
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

/** Farb-Tokens aus src/app/globals.css. Die Hex-Werte sind der Stand des MVP – die Wahrheit steht in der CSS-Datei. */
const COLOR_TOKENS: ColorToken[] = [
  { name: "--background", light: "#f6f7f9", dark: "#0b0f17", usage: "Seitenhintergrund" },
  { name: "--foreground", light: "#111827", dark: "#e5e7eb", usage: "Primärer Text" },
  { name: "--muted", light: "#6b7280", dark: "#9ca3af", usage: "Sekundärtext, Labels, Hints" },
  { name: "--surface", light: "#ffffff", dark: "#111827", usage: "Cards, Eingabefelder" },
  { name: "--surface-2", light: "#f1f3f6", dark: "#1f2937", usage: "Sekundär-Buttons, neutrale Badges" },
  { name: "--surface-3", light: "#e5e8ee", dark: "#273446", usage: "Hover-Flächen, ScoreBar-Track" },
  { name: "--border", light: "#e2e5ea", dark: "#273446", usage: "Rahmenlinien" },
  { name: "--accent", light: "#2563eb", dark: "#3b82f6", usage: "Primäre Aktion, Fokus, Score-Füllung" },
  { name: "--accent-soft", light: "#dbeafe", dark: "#1e3a8a", usage: "Akzent-Flächen (Badge, Avatar-Fallback)" },
  { name: "--success", light: "#15803d", dark: "#4ade80", usage: "Positiv – Text" },
  { name: "--success-soft", light: "#dcfce7", dark: "#14532d", usage: "Positiv – Fläche" },
  { name: "--warning", light: "#b45309", dark: "#fbbf24", usage: "Hinweis – Text" },
  { name: "--warning-soft", light: "#fef3c7", dark: "#78350f", usage: "Hinweis – Fläche" },
  { name: "--danger", light: "#b91c1c", dark: "#f87171", usage: "Fehler / destruktiv – Text" },
  { name: "--danger-soft", light: "#fee2e2", dark: "#7f1d1d", usage: "Fehler / destruktiv – Fläche" },
];

const TYPE_SCALE: { cls: string; px: string; usage: string }[] = [
  { cls: "text-xs", px: "12 px", usage: "Badges, Labels, Hints" },
  { cls: "text-sm", px: "14 px", usage: "Standard-UI, Listen, Buttons" },
  { cls: "text-base", px: "16 px", usage: "Fließtext, Chat" },
  { cls: "text-lg", px: "18 px", usage: "Große Card-Titel" },
  { cls: "text-xl", px: "20 px", usage: "Abschnitts-Titel" },
  { cls: "text-2xl", px: "24 px", usage: "Seitentitel (PageHeader)" },
  { cls: "text-3xl", px: "30 px", usage: "Dashboard-Kennzahlen" },
  { cls: "text-4xl", px: "36 px", usage: "Hero, große Zahlen" },
];

const FONT_WEIGHTS: { cls: string; label: string }[] = [
  { cls: "font-normal", label: "Normal (400)" },
  { cls: "font-medium", label: "Medium (500)" },
  { cls: "font-semibold", label: "Semibold (600)" },
  { cls: "font-bold", label: "Bold (700)" },
];

const BUTTON_VARIANTS = [
  { variant: "primary", label: "Primär" },
  { variant: "secondary", label: "Sekundär" },
  { variant: "ghost", label: "Ghost" },
  { variant: "danger", label: "Danger" },
] as const;

const BUTTON_SIZES = ["sm", "md", "lg"] as const;

const BADGE_TONES = [
  { tone: "neutral", label: "Vertical: fintech" },
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
  { id: "badges", label: "Badges" },
  { id: "formulare", label: "Formulare" },
  { id: "pageheader", label: "PageHeader" },
  { id: "emptystate", label: "EmptyState" },
  { id: "avatar", label: "Avatar" },
  { id: "scorebar", label: "ScoreBar" },
];

const SAMPLE_TEXT = "Die richtigen Kontakte finden – Co-Founder, Investoren, Mentoren.";

/* ------------------------------------------------------------------ */
/* Lokale Hilfskomponenten (nur für diese Seite)                       */
/* ------------------------------------------------------------------ */

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h2>
      {description && <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>}
      <div className="mt-4">{children}</div>
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
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="h-16 w-full border-b border-[var(--border)]" style={{ background: `var(${token.name})` }} />
      <div className="p-3">
        <code className="text-xs font-semibold text-[var(--foreground)]">{token.name}</code>
        <p className="mt-1 text-xs text-[var(--muted)]">{token.usage}</p>
        <p className="mt-1 font-mono text-[11px] text-[var(--muted)]">
          Hell {token.light} · Dunkel {token.dark}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Seite                                                               */
/* ------------------------------------------------------------------ */

export default function StyleguidePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Styleguide"
        subtitle="Alle Design-Tokens und UI-Primitives in allen Varianten. Ändert sich globals.css oder ui/index.tsx, ändert sich diese Seite mit."
        action={<LinkButton href="/" variant="secondary">Zum Dashboard</LinkButton>}
      />

      <nav aria-label="Abschnitte" className="mb-8 flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
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
          <li>UI-Texte Deutsch, Code Englisch. Mobile-first (Basis 375 px), Dark-Mode über die Systemeinstellung.</li>
          <li>
            Pivotieren in drei Dateien: <code className="font-mono text-xs">src/app/globals.css</code>,{" "}
            <code className="font-mono text-xs">src/components/ui/index.tsx</code>, <code className="font-mono text-xs">src/app/layout.tsx</code>.
            Details: <code className="font-mono text-xs">docs/DESIGN.md</code>.
          </li>
        </ul>
      </Card>

      <div className="space-y-12">
        {/* ---------------------------------------------------------- */}
        <Section
          id="tokens"
          title="Design-Tokens"
          description="CSS-Variablen aus src/app/globals.css. Die Farbfläche zeigt den aktuell aktiven Wert (Light oder Dark, je nach Systemeinstellung)."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {COLOR_TOKENS.map((t) => (
              <Swatch key={t.name} token={t} />
            ))}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <Card title="Layout-Token">
              <code className="text-xs font-semibold text-[var(--foreground)]">--sidebar-width</code>
              <p className="mt-1 text-xs text-[var(--muted)]">Breite der Desktop-Sidebar (240px). Der Balken unten ist genau so breit.</p>
              <div className="mt-3 h-3 max-w-full rounded-full bg-[var(--accent)]" style={{ width: "var(--sidebar-width)" }} />
            </Card>
            <Card title="Schrift-Tokens">
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-[var(--muted)]">
                    <code>--font-sans</code> → Geist Sans
                  </dt>
                  <dd className="text-[var(--foreground)]">{SAMPLE_TEXT}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--muted)]">
                    <code>--font-mono</code> → Geist Mono
                  </dt>
                  <dd className="font-mono text-[var(--foreground)]">score: 82 · dims: 7/4/9/5/8</dd>
                </div>
              </dl>
            </Card>
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section id="typografie" title="Typografie" description="Tailwind-Skala mit Einsatzempfehlung. Titel nutzen font-semibold + tracking-tight.">
          <Card>
            <ul className="divide-y divide-[var(--border)]">
              {TYPE_SCALE.map((t) => (
                <li key={t.cls} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-6">
                  <div className="w-40 shrink-0">
                    <code className="text-xs font-semibold text-[var(--foreground)]">{t.cls}</code>
                    <p className="text-xs text-[var(--muted)]">
                      {t.px} · {t.usage}
                    </p>
                  </div>
                  <p className={`${t.cls} min-w-0 truncate text-[var(--foreground)]`}>{SAMPLE_TEXT}</p>
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
            </Card>
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section id="buttons" title="Button & LinkButton" description="Vier Varianten, drei Größen, deaktivierter Zustand. LinkButton hat dieselbe Optik, rendert aber einen Link (immer Größe md).">
          <Card>
            <div className="space-y-5">
              {BUTTON_VARIANTS.map((v) => (
                <Demo key={v.variant} label={`variant="${v.variant}" – ${v.label}`}>
                  {BUTTON_SIZES.map((size) => (
                    <Button key={size} variant={v.variant} size={size}>
                      Kontakt anschreiben ({size})
                    </Button>
                  ))}
                  <Button variant={v.variant} disabled>
                    Deaktiviert
                  </Button>
                </Demo>
              ))}
            </div>
          </Card>
          <Card className="mt-3" title="LinkButton">
            <Demo label="Alle Varianten">
              {BUTTON_VARIANTS.map((v) => (
                <LinkButton key={v.variant} href="#buttons" variant={v.variant}>
                  {v.label}-Link
                </LinkButton>
              ))}
            </Demo>
          </Card>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section id="cards" title="Card" description="Container für alles. Header erscheint nur, wenn title oder action gesetzt ist.">
          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <p className="text-sm text-[var(--foreground)]">Ohne Titel – nur Inhalt.</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Für Listen-Einträge und kompakte Blöcke.</p>
            </Card>
            <Card title="Mit Titel">
              <p className="text-sm text-[var(--foreground)]">Der Titel ist ein h3 in text-sm font-semibold.</p>
            </Card>
            <Card title="Titel + Aktion" action={<Button size="sm" variant="secondary">Alle anzeigen</Button>}>
              <p className="text-sm text-[var(--foreground)]">Die Aktion sitzt rechts im Header.</p>
            </Card>
          </div>
          <Card className="mt-3" title="Beispiel: Kandidaten-Card" action={<Badge tone="success">Match 82</Badge>}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <Avatar name="Lena Hoffmann" size={56} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--foreground)]">Lena Hoffmann</p>
                <p className="text-sm text-[var(--muted)]">Commercial Co-Founder · Ex-BCG · sucht Tech-Co-Founder im B2B-SaaS</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="accent">Co-Founder</Badge>
                  <Badge>b2b saas</Badge>
                  <Badge>ai</Badge>
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
        <Section id="badges" title="Badge" description="Fünf Tones. Text- und Flächenfarbe kommen aus dem jeweiligen Token-Paar (--x / --x-soft).">
          <Card>
            <Demo label="tone">
              {BADGE_TONES.map((b) => (
                <div key={b.tone} className="flex flex-col items-start gap-1">
                  <Badge tone={b.tone}>{b.label}</Badge>
                  <code className="text-[11px] text-[var(--muted)]">{b.tone}</code>
                </div>
              ))}
            </Demo>
          </Card>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section id="formulare" title="Formulare" description="Input, Textarea, Select, Label und Field. Fokus färbt den Rahmen in --accent.">
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
        <Section id="pageheader" title="PageHeader" description="Steht oben auf jeder Seite: h1 in text-2xl, optionaler Untertitel, optionale Aktion rechts. Bricht auf schmalen Bildschirmen um.">
          <Card>
            <PageHeader
              title="Kandidaten"
              subtitle="127 Profile · sortiert nach Match-Score"
              action={
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm">
                    Filter
                  </Button>
                  <Button size="sm">Agent fragen</Button>
                </div>
              }
            />
            <p className="-mt-3 text-xs text-[var(--muted)]">(Der Abstand nach unten gehört zur Komponente: mb-6.)</p>
          </Card>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section id="emptystate" title="EmptyState" description="Für leere Listen und fehlende Daten. Gestrichelter Rahmen, zentriert, optionale Aktion.">
          <div className="grid gap-3 md:grid-cols-2">
            <EmptyState title="Noch keine Shortlist" body="Merke dir Kandidaten über den Stern auf einer Profil-Card." action={<LinkButton href="#cards">Kandidaten ansehen</LinkButton>} />
            <EmptyState title="Keine Treffer" body="Lockere die Filter oder frag den Agenten." />
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section id="avatar" title="Avatar" description="Mit Bild: rundes Foto. Ohne Bild: bis zu zwei Initialen auf --accent-soft. Größe in Pixeln (Standard 40).">
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
                <Avatar name="Max Mustermann" size={40} />
                <Avatar name="Lena Hoffmann" size={56} />
                <Avatar name="Jolanda" size={80} />
              </Demo>
            </div>
          </Card>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section id="scorebar" title="ScoreBar" description="Fortschritts-/Score-Balken. Mit label erscheint die Zeile „Label … Wert“; max ist standardmäßig 100.">
          <div className="grid gap-3 md:grid-cols-2">
            <Card title="Match-Scores (0–100)">
              <div className="space-y-3">
                <ScoreBar value={82} label="Match-Score" />
                <ScoreBar value={47} label="Komplementarität" />
                <ScoreBar value={15} label="Schwacher Match" />
              </div>
            </Card>
            <Card title="Dimensionen (0–10) und ohne Label">
              <div className="space-y-3">
                <ScoreBar value={7} max={10} label="Vision" />
                <ScoreBar value={9} max={10} label="Technik" />
                <ScoreBar value={4} max={10} label="Design / Visuell" />
                <ScoreBar value={30} />
              </div>
            </Card>
          </div>
        </Section>
      </div>

      <footer className="mt-12 border-t border-[var(--border)] pt-6 text-xs text-[var(--muted)]">
        Änderungen an <code className="font-mono">globals.css</code> und <code className="font-mono">ui/index.tsx</code> wirken sich sofort auf diese Seite aus.
        Design-Handoff: <code className="font-mono">docs/DESIGN.md</code> · Architektur: <code className="font-mono">docs/ARCHITECTURE.md</code>
      </footer>
    </main>
  );
}
