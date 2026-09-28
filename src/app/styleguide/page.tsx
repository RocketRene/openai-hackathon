/**
 * Styleguide – Referenzseite für den Design-Pivot (docs/DESIGN.md).
 * ---------------------------------------------------------------
 * Server Component, reine Anzeige: alle Design-Tokens aus src/app/globals.css (Light- und
 * Dark-Wert als Swatch, Live-Fläche über var(--…)), die Typo-Skala und ALLE UI-Primitives aus
 * src/components/ui/index.tsx in allen Varianten/Größen/Tones – plus Layout-Bausteine
 * (LogoMark, NavIcon, LanguageToggle, <T>). Kein eigenes <main>: die AppShell setzt Breite
 * und Abstände. Ändert sich globals.css oder ui/index.tsx, ändert sich diese Seite mit.
 */
import type { Metadata } from "next";
import type { ComponentProps, ReactNode } from "react";
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
import { LogoMark, NavIcon } from "@/components/layout/Sidebar";
import { LanguageToggle, T } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Styleguide – Voya",
  description: "Design-Tokens, UI-Primitives, Typografie und Layout-Bausteine von Voya in allen Varianten.",
};

/* ------------------------------------------------------------------ */
/* Daten                                                               */
/* ------------------------------------------------------------------ */

type ButtonVariant = NonNullable<ComponentProps<typeof Button>["variant"]>;
type ButtonSize = NonNullable<ComponentProps<typeof Button>["size"]>;
type BadgeTone = NonNullable<ComponentProps<typeof Badge>["tone"]>;
type ScoreTone = NonNullable<ComponentProps<typeof ScoreBar>["tone"]>;
type CardPadding = NonNullable<ComponentProps<typeof Card>["padding"]>;

interface ColorToken {
  name: string;
  light: string;
  dark: string;
  usage: { de: string; en: string };
}

/**
 * Farb-Tokens aus src/app/globals.css. Die Hex-Werte hier sind Dokumentation (Stand beim
 * Schreiben) – die große Fläche zeigt immer den LIVE aktiven Wert über var(--…).
 */
const COLOR_TOKENS: ColorToken[] = [
  { name: "--background", light: "#f7f6f2", dark: "#131217", usage: { de: "Seitenhintergrund (warm), .fr-app-bg", en: "Page background (warm), .fr-app-bg" } },
  { name: "--foreground", light: "#1b1a17", dark: "#ece9e2", usage: { de: "Primärer Text", en: "Primary text" } },
  { name: "--muted", light: "#6d6860", dark: "#a09b92", usage: { de: "Sekundärtext, Labels, Hints, Caption", en: "Secondary text, labels, hints, caption" } },
  { name: "--surface", light: "#ffffff", dark: "#1b1a20", usage: { de: "Cards, Eingabefelder, Header, Avatar-Ring", en: "Cards, inputs, header, avatar ring" } },
  { name: "--surface-2", light: "#f2f0ea", dark: "#232228", usage: { de: "Hover (secondary/ghost/Nav), Badge neutral, Skeleton", en: "Hover (secondary/ghost/nav), neutral badge, skeleton" } },
  { name: "--surface-3", light: "#e6e2d9", dark: "#2e2d34", usage: { de: "Pressed, Score-Track, Scrollbar", en: "Pressed, score track, scrollbar" } },
  { name: "--surface-elevated", light: "#ffffff", dark: "#222127", usage: { de: "Popover, Drawer, Dialog (spätere Bausteine)", en: "Popover, drawer, dialog (future parts)" } },
  { name: "--border", light: "#e5e1d8", dark: "#2c2b32", usage: { de: "Rahmenlinien, Divider", en: "Borders, divider" } },
  { name: "--sidebar-bg", light: "#fcfbf8", dark: "#17161c", usage: { de: "Sidebar, mobiler Drawer", en: "Sidebar, mobile drawer" } },
  { name: "--accent", light: "#4338ca", dark: "#a5b4fc", usage: { de: "Primäre Aktion, Links, Nav aktiv, Score-Füllung, Logo", en: "Primary action, links, active nav, score fill, logo" } },
  { name: "--accent-strong", light: "#3730a3", dark: "#c7d2fe", usage: { de: "Akzent Hover / Pressed", en: "Accent hover / pressed" } },
  { name: "--accent-soft", light: "#e9e7fb", dark: "#2a2857", usage: { de: "Badge accent, Nav aktiv, Avatar-Fallback, Stat-Icon", en: "Accent badge, active nav, avatar fallback, stat icon" } },
  { name: "--accent-contrast", light: "#ffffff", dark: "#131217", usage: { de: "Text auf Akzent (Buttons, Chip aktiv, ::selection)", en: "Text on accent (buttons, active chip, ::selection)" } },
  { name: "--success", light: "#1b7a47", dark: "#5ed394", usage: { de: "Positiv – Text, hohe Scores", en: "Positive – text, high scores" } },
  { name: "--success-soft", light: "#dcf3e4", dark: "#16402b", usage: { de: "Positiv – Fläche", en: "Positive – surface" } },
  { name: "--warning", light: "#a2570b", dark: "#f2b95a", usage: { de: "Hinweis – Text, Risiken", en: "Warning – text, risks" } },
  { name: "--warning-soft", light: "#fbeed3", dark: "#4a3110", usage: { de: "Hinweis – Fläche", en: "Warning – surface" } },
  { name: "--danger", light: "#b73333", dark: "#f28b8b", usage: { de: "Fehler / destruktiv – Text, Red Flags", en: "Error / destructive – text, red flags" } },
  { name: "--danger-soft", light: "#fce3e0", dark: "#4e2020", usage: { de: "Fehler / destruktiv – Fläche", en: "Error / destructive – surface" } },
];

/** Nicht-Farb-Tokens (Fokus, Tiefe, Form, Layout). */
const SHAPE_TOKENS: { name: string; light: string; dark: string; usage: { de: string; en: string } }[] = [
  { name: "--ring", light: "rgba(67, 56, 202, 0.4)", dark: "rgba(165, 180, 252, 0.5)", usage: { de: "Fokusring aller interaktiven Bausteine", en: "Focus ring of all interactive parts" } },
  { name: "--shadow-sm", light: "1–2 px, sehr weich", dark: "0 1px 2px rgba(0,0,0,.35)", usage: { de: "Cards, Buttons, Inputs, Avatar", en: "Cards, buttons, inputs, avatar" } },
  { name: "--shadow", light: "8–20 px, weich", dark: "10–24 px", usage: { de: "Hover-Lift (Card interactive, Stat, Primary); --shadow-md ist Alias", en: "Hover lift (interactive card, stat, primary); --shadow-md is an alias" } },
  { name: "--shadow-lg", light: "12–32 px", dark: "16–40 px", usage: { de: "Drawer, Popover", en: "Drawer, popover" } },
  { name: "--radius-sm", light: "8px", dark: "8px", usage: { de: "Skeleton, kleine Flächen", en: "Skeleton, small surfaces" } },
  { name: "--radius", light: "10px", dark: "10px", usage: { de: "Buttons, Inputs, Nav-Einträge, Stat-Icon", en: "Buttons, inputs, nav items, stat icon" } },
  { name: "--radius-lg", light: "14px", dark: "14px", usage: { de: "Cards, Stat, EmptyState", en: "Cards, stat, empty state" } },
  { name: "--sidebar-width", light: "264px", dark: "264px", usage: { de: "Desktop-Sidebar (AppShell, ab md:)", en: "Desktop sidebar (AppShell, from md:)" } },
  { name: "--header-height", light: "56px / 64px ab md:", dark: "56px / 64px", usage: { de: "Header der AppShell", en: "AppShell header" } },
];

const TYPE_SCALE: { cls: string; px: string; usage: { de: string; en: string } }[] = [
  { cls: "text-display", px: "26–32 px (clamp)", usage: { de: "Seitentitel (PageHeader)", en: "Page title (PageHeader)" } },
  { cls: "text-title", px: "20 px", usage: { de: "Abschnitts-Titel (SectionTitle)", en: "Section title (SectionTitle)" } },
  { cls: "text-body", px: "15 px / 1.5", usage: { de: "Fließtext – Body-Standard", en: "Body text – default" } },
  { cls: "text-caption", px: "12 px, --muted", usage: { de: "Hinweise, Meta", en: "Hints, meta" } },
  { cls: "text-eyebrow", px: "11 px, Versalien, --accent", usage: { de: "Kicker / Eyebrow", en: "Kicker / eyebrow" } },
  { cls: "text-[11px]", px: "11 px", usage: { de: "Badge, Sidebar-Meta, Toggle", en: "Badge, sidebar meta, toggle" } },
  { cls: "text-xs", px: "12 px", usage: { de: "Labels, Chip, Button sm", en: "Labels, chip, small button" } },
  { cls: "text-sm", px: "14 px", usage: { de: "Standard-UI, Listen, Button md, Nav", en: "Default UI, lists, medium button, nav" } },
  { cls: "text-2xl", px: "24 px", usage: { de: "Kennzahlen (Stat)", en: "KPI values (Stat)" } },
];

const FONT_WEIGHTS: { cls: string; label: string }[] = [
  { cls: "font-normal", label: "Normal (400)" },
  { cls: "font-medium", label: "Medium (500)" },
  { cls: "font-semibold", label: "Semibold (600)" },
  { cls: "font-bold", label: "Bold (700)" },
];

const BUTTON_VARIANTS: { variant: ButtonVariant; label: string }[] = [
  { variant: "primary", label: "Primär" },
  { variant: "secondary", label: "Sekundär (Outline neutral)" },
  { variant: "outline", label: "Outline (Akzent)" },
  { variant: "ghost", label: "Ghost" },
  { variant: "danger", label: "Danger" },
];

const BUTTON_SIZES: { size: ButtonSize; px: string }[] = [
  { size: "sm", px: "36" },
  { size: "md", px: "40" },
  { size: "lg", px: "48" },
];

const BADGE_TONES: { tone: BadgeTone; label: string }[] = [
  { tone: "neutral", label: "fintech" },
  { tone: "accent", label: "Co-Founder" },
  { tone: "success", label: "Match 82" },
  { tone: "warning", label: "Risiko" },
  { tone: "danger", label: "Red Flag" },
];

const SCORE_TONES: { tone: ScoreTone; value: number; label: string }[] = [
  { tone: "accent", value: 62, label: "accent (Standard)" },
  { tone: "success", value: 88, label: "success" },
  { tone: "warning", value: 41, label: "warning" },
  { tone: "danger", value: 17, label: "danger" },
];

const CARD_PADDINGS: CardPadding[] = ["none", "sm", "md", "lg"];

const SECTIONS: { id: string; label: string }[] = [
  { id: "tokens", label: "Tokens" },
  { id: "typografie", label: "Typografie" },
  { id: "buttons", label: "Buttons" },
  { id: "chips", label: "Badge & Chip" },
  { id: "cards", label: "Card · SectionTitle · Divider" },
  { id: "stats", label: "Stat" },
  { id: "formulare", label: "Formulare" },
  { id: "pageheader", label: "PageHeader & Kicker" },
  { id: "emptystate", label: "EmptyState" },
  { id: "avatar", label: "Avatar" },
  { id: "scores", label: "Scores" },
  { id: "skeleton", label: "Skeleton" },
  { id: "layout", label: "Layout & i18n" },
];

const SAMPLE_TEXT = "Die richtigen Kontakte finden – Co-Founder, Investoren, Mentor:innen.";

const I18N_SNIPPET = `// Server- oder Client-Component:
<T de="Kandidaten" en="Candidates" />

// Client-Component mit lokalem Wörterbuch:
const DICT: Dict = { title: { de: "Kandidaten", en: "Candidates" } };
const t = useT(DICT);            // t("title"), Platzhalter {name}
const [locale, setLocale] = useLocale();
pick(locale, "Merken", "Save");  // für String-Props
COMMON.shortlisted[locale];      // gemeinsame Begriffe`;

/* ------------------------------------------------------------------ */
/* Lokale Hilfskomponenten (nur für diese Seite)                       */
/* ------------------------------------------------------------------ */

/** Abschnitt mit SectionTitle (Titel links, Quelle als Badge rechts) und Beschreibung. */
function Section({
  id,
  title,
  source,
  description,
  children,
}: {
  id: string;
  title: ReactNode;
  source: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <SectionTitle action={<Badge>{source}</Badge>}>{title}</SectionTitle>
      {description && <p className="-mt-1 mb-4 text-sm text-[var(--muted)]">{description}</p>}
      {children}
    </section>
  );
}

function Demo({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="mb-2 font-mono text-[11px] font-medium text-[var(--muted)]">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-[var(--surface-2)] px-1 py-0.5 font-mono text-[11px] text-[var(--foreground)]">{children}</code>;
}

/** Farb-Token: große Live-Fläche (var(--…)) + kleine Light-/Dark-Swatches mit dem dokumentierten Wert. */
function ColorSwatch({ token }: { token: ColorToken }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
      <div className="h-14 w-full border-b border-[var(--border)]" style={{ background: `var(${token.name})` }} title={`var(${token.name})`} />
      <div className="p-3">
        <code className="text-xs font-semibold text-[var(--foreground)]">{token.name}</code>
        <p className="mt-1 text-xs text-[var(--muted)]">
          <T de={token.usage.de} en={token.usage.en} />
        </p>
        <div className="mt-2 flex items-center gap-3 font-mono text-[11px] text-[var(--muted)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3.5 w-3.5 rounded-full border border-[var(--border)]" style={{ background: token.light }} aria-hidden />
            {token.light}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3.5 w-3.5 rounded-full border border-[var(--border)]" style={{ background: token.dark }} aria-hidden />
            {token.dark}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Icon-Platzhalter ohne Icon-Bibliothek (Inline-SVG, 24er Raster). */
function StarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m12 3 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.9 6.1 21l1.2-6.5L2.5 9.9 9.1 9z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
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
        subtitle={
          <T
            de="Alle Design-Tokens, die Typo-Skala und jede UI-Primitive in allen Varianten. Ändert sich globals.css oder ui/index.tsx, ändert sich diese Seite mit."
            en="All design tokens, the type scale and every UI primitive in all variants. Change globals.css or ui/index.tsx and this page changes with it."
          />
        }
        action={
          <>
            <LinkButton href="/" variant="secondary" size="sm">
              <T de="Zum Dashboard" en="To dashboard" />
            </LinkButton>
            <LinkButton href="/assistant" size="sm">
              <NavIcon name="agent" className="h-4 w-4" /> Agent
            </LinkButton>
          </>
        }
      />

      <nav aria-label="Abschnitte" className="mb-8 flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="inline-flex h-9 items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 text-xs font-medium text-[var(--foreground)] transition hover:border-[var(--surface-3)] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <Card className="mb-10" title={<T de="Regeln in Kurzform" en="Rules in short" />} description="docs/DESIGN.md, Abschnitt 4">
        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--foreground)]">
          <li>
            <T de="Farben nur über" en="Colours only via" /> <Code>var(--…)</Code> –{" "}
            <T de="keine Hex-Werte, keine Tailwind-Palettenfarben in Komponenten." en="no hex values, no Tailwind palette colours in components." />
          </li>
          <li>
            <T
              de="UI-Texte zweisprachig (DE/EN) über src/lib/i18n.tsx, Code Englisch. Mobile-first (Basis 375 px), Dark-Mode über die Systemeinstellung, Touch-Ziele ≥ 40 px."
              en="UI copy bilingual (DE/EN) via src/lib/i18n.tsx, code in English. Mobile-first (375 px base), dark mode follows the system setting, touch targets ≥ 40 px."
            />
          </li>
          <li>
            <T de="Pivotieren in drei Ebenen:" en="Pivot on three levels:" /> <Code>src/app/globals.css</Code> (Tokens), <Code>src/components/ui/index.tsx</Code>{" "}
            (Primitives), <Code>src/components/layout/*</Code> (AppShell, Sidebar, Header).
          </li>
        </ul>
      </Card>

      <div className="space-y-14">
        {/* ---------------------------------------------------------- */}
        <Section
          id="tokens"
          title="Design-Tokens"
          source="src/app/globals.css"
          description={
            <T
              de="CSS-Variablen auf :root, der Dark-Block überschreibt dieselben Namen. Große Fläche = aktuell aktiver Wert (var), kleine Punkte = dokumentierter Light-/Dark-Wert. Richtung: warm getönte Neutrals, Akzent Indigo."
              en="CSS variables on :root, the dark block overrides the same names. Large area = currently active value (var), small dots = documented light/dark value. Direction: warm-tinted neutrals, indigo accent."
            />
          }
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {COLOR_TOKENS.map((t) => (
              <ColorSwatch key={t.name} token={t} />
            ))}
          </div>

          <Card className="mt-4" title={<T de="Fokus, Tiefe, Form, Layout" en="Focus, depth, shape, layout" />} description={<T de="Nicht-Farb-Tokens. --radius-sm/-lg und --shadow-sm/-lg überschreiben bewusst die Tailwind-Theme-Variablen." en="Non-colour tokens. --radius-sm/-lg and --shadow-sm/-lg deliberately override the Tailwind theme variables." />}>
            <ul className="divide-y divide-[var(--border)]">
              {SHAPE_TOKENS.map((t) => (
                <li key={t.name} className="grid gap-1 py-2.5 text-xs sm:grid-cols-[10rem_1fr_1fr_1fr] sm:items-center sm:gap-4">
                  <code className="font-semibold text-[var(--foreground)]">{t.name}</code>
                  <span className="text-[var(--muted)]">
                    <T de={t.usage.de} en={t.usage.en} />
                  </span>
                  <span className="font-mono text-[11px] text-[var(--muted)]">Light {t.light}</span>
                  <span className="font-mono text-[11px] text-[var(--muted)]">Dark {t.dark}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="mb-2 font-mono text-[11px] text-[var(--muted)]">--radius-sm / --radius / --radius-lg</p>
                <div className="flex items-end gap-3">
                  <div className="h-10 w-10 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)]" />
                  <div className="h-12 w-12 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)]" />
                  <div className="h-14 w-14 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)]" />
                </div>
              </div>
              <div>
                <p className="mb-2 font-mono text-[11px] text-[var(--muted)]">--shadow-sm / --shadow / --shadow-lg</p>
                <div className="flex items-end gap-3">
                  <div className="h-14 w-14 rounded-[var(--radius-lg)] bg-[var(--surface)] shadow-[var(--shadow-sm)]" />
                  <div className="h-14 w-14 rounded-[var(--radius-lg)] bg-[var(--surface)] shadow-[var(--shadow)]" />
                  <div className="h-14 w-14 rounded-[var(--radius-lg)] bg-[var(--surface)] shadow-[var(--shadow-lg)]" />
                </div>
              </div>
              <div>
                <p className="mb-2 font-mono text-[11px] text-[var(--muted)]">--ring (focus-visible)</p>
                <div className="flex items-end gap-3">
                  <div className="h-10 w-24 rounded-[var(--radius)] bg-[var(--surface)] ring-2 ring-[var(--ring)] ring-offset-2 ring-offset-[var(--background)]" />
                </div>
              </div>
            </div>
            <div className="mt-4">
              <p className="mb-2 font-mono text-[11px] text-[var(--muted)]">--sidebar-width (264px) – der Balken ist genau so breit</p>
              <div className="h-2.5 max-w-full rounded-full bg-[var(--accent)]" style={{ width: "var(--sidebar-width)" }} />
            </div>
          </Card>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Card title={<T de="Schrift-Tokens" en="Font tokens" />} description="@theme inline → Tailwind v4 (bg-surface, text-muted, text-accent …)">
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-[var(--muted)]">
                    <Code>--font-sans</Code> → Geist Sans (<Code>next/font/google</Code>, layout.tsx)
                  </dt>
                  <dd className="mt-1 text-[var(--foreground)]">{SAMPLE_TEXT}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--muted)]">
                    <Code>--font-mono</Code> → Geist Mono
                  </dt>
                  <dd className="mt-1 font-mono text-[var(--foreground)]">score: 82 · dims: 7/4/9/5/8</dd>
                </div>
              </dl>
            </Card>
            <Card title={<T de="Globale Hilfsklassen" en="Global helper classes" />} description="globals.css, unterhalb der Tokens">
              <ul className="space-y-1.5 text-sm text-[var(--foreground)]">
                <li>
                  <Code>.fr-app-bg</Code> – <T de="dezenter Akzent-Verlauf im Content-Bereich (AppShell)" en="subtle accent gradient in the content area (AppShell)" />
                </li>
                <li>
                  <Code>.fr-fade-in</Code> – <T de="sanftes Einblenden für Listen und Cards (0,25 s)" en="soft fade-in for lists and cards (0.25 s)" />
                </li>
                <li>
                  <Code>.fr-scroll</Code> – <T de="schmale Scrollbar in Panels (Sidebar, Transkript)" en="thin scrollbar in panels (sidebar, transcript)" />
                </li>
                <li>
                  <Code>.fr-skeleton</Code> – <T de="Shimmer, von <Skeleton> genutzt" en="shimmer used by <Skeleton>" /> · <Code>.fr-spin</Code> –{" "}
                  <T de="Spinner (Button loading)" en="spinner (Button loading)" />
                </li>
                <li>
                  <Code>.fr-avatar</Code> – <T de="Avatar-Fallback, Farbton aus --avatar-hue (oklch)" en="avatar fallback, hue from --avatar-hue (oklch)" />
                </li>
              </ul>
            </Card>
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section
          id="typografie"
          title={<T de="Typografie" en="Typography" />}
          source="globals.css @layer utilities"
          description={
            <T
              de="Geist Sans. Body 15 px / 1.5, Überschriften mit leicht negativem Letter-Spacing und text-wrap: balance. Die Skala sind Utility-Klassen in globals.css; Zahlen (Scores) mit tabular-nums."
              en="Geist Sans. Body 15 px / 1.5, headings with slightly negative letter-spacing and text-wrap: balance. The scale is a set of utility classes in globals.css; numbers (scores) with tabular-nums."
            />
          }
        >
          <Card>
            <ul className="divide-y divide-[var(--border)]">
              {TYPE_SCALE.map((t) => (
                <li key={t.cls} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-6">
                  <div className="w-52 shrink-0">
                    <code className="text-xs font-semibold text-[var(--foreground)]">{t.cls}</code>
                    <p className="text-xs text-[var(--muted)]">
                      {t.px} · <T de={t.usage.de} en={t.usage.en} />
                    </p>
                  </div>
                  <p className={`${t.cls} min-w-0 truncate text-[var(--foreground)]`}>{SAMPLE_TEXT}</p>
                </li>
              ))}
            </ul>
          </Card>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Card title={<T de="Schriftschnitte" en="Font weights" />}>
              <ul className="space-y-1 text-sm text-[var(--foreground)]">
                {FONT_WEIGHTS.map((w) => (
                  <li key={w.cls} className={w.cls}>
                    {w.label} – Gründer:innen finden Co-Founder
                  </li>
                ))}
              </ul>
            </Card>
            <Card title={<T de="Textfarben" en="Text colours" />}>
              <p className="text-sm text-[var(--foreground)]">--foreground · Primärtext</p>
              <p className="text-sm text-[var(--muted)]">--muted · Sekundärtext</p>
              <p className="text-sm text-[var(--accent)]">--accent · Akzent, Links, Eyebrow</p>
              <p className="text-sm text-[var(--success)]">--success · Positiv</p>
              <p className="text-sm text-[var(--warning)]">--warning · Hinweis</p>
              <p className="text-sm text-[var(--danger)]">--danger · Fehler</p>
            </Card>
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section
          id="buttons"
          title="Button & LinkButton"
          source="ui/index.tsx"
          description={
            <T
              de="Fünf Varianten, drei Größen (sm 36 · md 40 · lg 48 px), Zustände hover / active / focus-visible / disabled / loading (Spinner + aria-busy). LinkButton hat dieselbe Optik und rendert next/link."
              en="Five variants, three sizes (sm 36 · md 40 · lg 48 px), states hover / active / focus-visible / disabled / loading (spinner + aria-busy). LinkButton looks the same and renders next/link."
            />
          }
        >
          <Card>
            <div className="space-y-5">
              {BUTTON_VARIANTS.map((v) => (
                <Demo key={v.variant} label={`variant="${v.variant}" – ${v.label}`}>
                  {BUTTON_SIZES.map((s) => (
                    <Button key={s.size} variant={v.variant} size={s.size}>
                      <T de="Anschreiben" en="Reach out" /> ({s.size} · {s.px})
                    </Button>
                  ))}
                  <Button variant={v.variant} disabled>
                    disabled
                  </Button>
                  <Button variant={v.variant} loading>
                    loading
                  </Button>
                </Demo>
              ))}
              <Demo label={<T de="mit Icon (Inline-SVG, gap-2)" en="with icon (inline SVG, gap-2)" />}>
                <Button>
                  <PlusIcon /> <T de="Kandidat hinzufügen" en="Add candidate" />
                </Button>
                <Button variant="secondary" size="sm">
                  <StarIcon /> <T de="Merken" en="Save" />
                </Button>
                <Button variant="ghost" size="sm" aria-label="Suchen">
                  <SearchIcon />
                </Button>
              </Demo>
            </div>
          </Card>
          <Card className="mt-3" title="LinkButton" description={<>href + variant + size; target=&quot;_blank&quot; setzt rel=noreferrer</>}>
            <div className="space-y-4">
              <Demo label="alle Varianten, size=md">
                {BUTTON_VARIANTS.map((v) => (
                  <LinkButton key={v.variant} href="#buttons" variant={v.variant}>
                    {v.variant}
                  </LinkButton>
                ))}
              </Demo>
              <Demo label="size=sm / md / lg">
                {BUTTON_SIZES.map((s) => (
                  <LinkButton key={s.size} href="#buttons" variant="secondary" size={s.size}>
                    LinkButton {s.size}
                  </LinkButton>
                ))}
                <LinkButton href="https://voya.ventosa.workers.dev" target="_blank" variant="outline" size="sm">
                  target=&quot;_blank&quot; ↗
                </LinkButton>
              </Demo>
            </div>
          </Card>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section
          id="chips"
          title="Badge & Chip"
          source="ui/index.tsx"
          description={
            <T
              de="Badge = reine Anzeige in fünf Tones (Text-/Flächenfarbe aus --x / --x-soft), optional mit dot. Chip = umschaltbarer Filter (Button, 36 px, aria-pressed; active füllt mit --accent)."
              en="Badge = display only in five tones (text/surface colour from --x / --x-soft), optional dot. Chip = toggleable filter (button, 36 px, aria-pressed; active fills with --accent)."
            />
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Card title="Badge" description="tone: neutral · accent · success · warning · danger · dot?">
              <div className="space-y-4">
                <Demo label="tone">
                  {BADGE_TONES.map((b) => (
                    <div key={b.tone} className="flex flex-col items-start gap-1">
                      <Badge tone={b.tone}>{b.label}</Badge>
                      <code className="text-[11px] text-[var(--muted)]">{b.tone}</code>
                    </div>
                  ))}
                </Demo>
                <Demo label="dot – Status (Voice, generatedBy)">
                  <Badge tone="success" dot>
                    <T de="Verbunden – hört zu" en="Connected – listening" />
                  </Badge>
                  <Badge tone="warning" dot>
                    <T de="Verbinde …" en="Connecting …" />
                  </Badge>
                  <Badge tone="accent" dot>
                    <T de="Spricht …" en="Speaking …" />
                  </Badge>
                  <Badge tone="neutral" dot>
                    <T de="Getrennt" en="Disconnected" />
                  </Badge>
                  <Badge tone="accent">KI</Badge>
                  <Badge>Vorlage</Badge>
                </Demo>
              </div>
            </Card>
            <Card title="Chip" description="active?: boolean · onClick?: () => void · aria-pressed">
              <div className="space-y-4">
                <Demo label="active={false}">
                  <Chip>Co-Founder</Chip>
                  <Chip>Investor:in</Chip>
                  <Chip>Mentor:in</Chip>
                  <Chip>Talent</Chip>
                </Demo>
                <Demo label="active={true}">
                  <Chip active>Co-Founder</Chip>
                  <Chip active>fintech</Chip>
                  <Chip active>idealab-2026</Chip>
                </Demo>
                <Demo label={<T de="Filterzeile (typischer Einsatz, genau einer aktiv)" en="Filter row (typical use, exactly one active)" />}>
                  <Chip active>
                    <T de="Alle" en="All" />
                  </Chip>
                  <Chip>Tech</Chip>
                  <Chip>Commercial</Chip>
                  <Chip>Product</Chip>
                  <Chip>
                    <StarIcon /> <T de="Gemerkt" en="Saved" />
                  </Chip>
                </Demo>
              </div>
            </Card>
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section
          id="cards"
          title="Card · SectionTitle · Divider"
          source="ui/index.tsx"
          description={
            <T
              de="Card ist der Container für alles (--radius-lg, --shadow-sm): Header nur mit title, description oder action; padding none/sm/md/lg; interactive = Hover-Lift. SectionTitle gliedert eine Seite (h2 in .text-title, optional action rechts). Divider trennt, optional mit Label."
              en="Card is the container for everything (--radius-lg, --shadow-sm): header only with title, description or action; padding none/sm/md/lg; interactive = hover lift. SectionTitle structures a page (h2 in .text-title, optional action on the right). Divider separates, optionally with a label."
            />
          }
        >
          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <p className="text-sm text-[var(--foreground)]">
                <T de="Ohne Titel – nur Inhalt." en="No title – content only." />
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                <T de="Für Listen-Einträge und kompakte Blöcke." en="For list entries and compact blocks." />
              </p>
            </Card>
            <Card title={<T de="Mit Titel + description" en="With title + description" />} description={<T de="Untertitel in --muted, text-xs" en="Subtitle in --muted, text-xs" />}>
              <p className="text-sm text-[var(--foreground)]">
                <T de="Der Titel ist ein h3 in 15 px semibold." en="The title is an h3 in 15 px semibold." />
              </p>
            </Card>
            <Card
              title={<T de="Titel + Aktion" en="Title + action" />}
              action={
                <Button size="sm" variant="secondary">
                  <T de="Alle anzeigen" en="Show all" />
                </Button>
              }
            >
              <p className="text-sm text-[var(--foreground)]">
                <T de="Die Aktion sitzt rechts im Header." en="The action sits right in the header." />
              </p>
            </Card>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {CARD_PADDINGS.map((p) => (
              <Card key={p} padding={p} className="min-h-20">
                <div className="rounded-[var(--radius-sm)] bg-[var(--accent-soft)] px-2 py-1.5 text-xs text-[var(--accent)]">padding=&quot;{p}&quot;</div>
              </Card>
            ))}
            <Card interactive title="interactive" description={<T de="Hover: hebt sich, --shadow" en="Hover: lifts, --shadow" />}>
              <p className="text-xs text-[var(--muted)]">
                <T de="Für klickbare Karten (Link außen herum)." en="For clickable cards (link wrapped around)." />
              </p>
            </Card>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Card title="SectionTitle" description="children + action?">
              <div className="space-y-6">
                <div>
                  <SectionTitle>
                    <T de="Ohne Aktion" en="Without action" />
                  </SectionTitle>
                  <div className="h-8 rounded-[var(--radius-sm)] border border-dashed border-[var(--border)]" />
                </div>
                <div>
                  <SectionTitle
                    action={
                      <LinkButton href="#cards" variant="ghost" size="sm">
                        <T de="Alle Kandidaten" en="All candidates" /> →
                      </LinkButton>
                    }
                  >
                    <T de="Mit Aktion" en="With action" />
                  </SectionTitle>
                  <div className="h-8 rounded-[var(--radius-sm)] border border-dashed border-[var(--border)]" />
                </div>
                <div>
                  <SectionTitle action={<Badge tone="accent">6</Badge>}>
                    <T de="Mit Zähler-Badge" en="With counter badge" />
                  </SectionTitle>
                  <div className="h-8 rounded-[var(--radius-sm)] border border-dashed border-[var(--border)]" />
                </div>
              </div>
            </Card>
            <Card title="Divider" description="label?: string">
              <p className="text-sm text-[var(--foreground)]">
                <T de="Oben: ohne Label." en="Above: without label." />
              </p>
              <Divider className="my-4" />
              <p className="text-sm text-[var(--foreground)]">
                <T de="Mitte: mit Label." en="Middle: with label." />
              </p>
              <Divider label="oder / or" className="my-4" />
              <p className="text-sm text-[var(--foreground)]">
                <T de="Unten: role=separator, Text in --muted." en="Below: role=separator, text in --muted." />
              </p>
            </Card>
          </div>

          <Card className="mt-3" title={<T de="Beispiel: Kandidaten-Card" en="Example: candidate card" />} action={<ScoreRing value={82} size={44} tone="success" />}>
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
                  <ScoreBar value={82} label="Match-Score" tone="success" />
                </div>
              </div>
              <div className="flex gap-2 sm:flex-col">
                <Button size="sm">
                  <T de="Anschreiben" en="Reach out" />
                </Button>
                <Button size="sm" variant="outline">
                  <T de="Vorbereiten" en="Prepare" />
                </Button>
                <Button size="sm" variant="ghost">
                  <StarIcon /> <T de="Merken" en="Save" />
                </Button>
              </div>
            </div>
          </Card>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section
          id="stats"
          title="Stat"
          source="ui/index.tsx"
          description={
            <T
              de="KPI-Kachel: value groß (text-2xl, tabular-nums), label, optionaler hint und icon (Kachel in --accent-soft). Mit href wird die ganze Kachel ein Link mit Hover-Lift."
              en="KPI tile: value large (text-2xl, tabular-nums), label, optional hint and icon (tile in --accent-soft). With href the whole tile becomes a link with hover lift."
            />
          }
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat value="569" label={<T de="Kontakte" en="Contacts" />} hint={<T de="href + icon" en="href + icon" />} href="/candidates" icon={<NavIcon name="candidates" />} />
            <Stat value="128" label="Co-Founder" hint="href + hint" href="/candidates?networkRole=cofounder" />
            <Stat value="41" label={<T de="Investoren" en="Investors" />} hint="Angels & VCs" href="/candidates?networkRole=investor" icon={<NavIcon name="network" />} />
            <Stat value="3" label="Events" hint={<T de="ohne Link" en="without link" />} icon={<NavIcon name="events" />} />
            <Stat value="82" label="Match-Score" />
            <Stat
              value={
                <span className="text-[var(--success)]">
                  +12 <span className="text-sm font-medium">%</span>
                </span>
              }
              label={<T de="Eigener value-Node" en="Custom value node" />}
              hint={<T de="value ist ReactNode" en="value is a ReactNode" />}
            />
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section
          id="formulare"
          title={<T de="Formulare" en="Forms" />}
          source="ui/index.tsx"
          description={
            <T
              de="Input, Textarea, Select, Label und Field. Höhe 40 px, --radius. Fokus: Rahmen --accent + Ring --ring; disabled gedämpft auf --surface-2."
              en="Input, Textarea, Select, Label and Field. Height 40 px, --radius. Focus: border --accent + ring --ring; disabled dimmed on --surface-2."
            />
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Card title="Field + Input">
              <div className="space-y-4">
                <Field label="Name">
                  <Input placeholder="Wie heißt du? / What's your name?" defaultValue="Marvin" />
                </Field>
                <Field label="LinkedIn-URL" hint={<T de="Optional – wir lesen Headline und Erfahrung daraus." en="Optional – we read headline and experience from it." />}>
                  <Input type="url" placeholder="https://linkedin.com/in/…" />
                </Field>
                <div>
                  <Label htmlFor="sg-disabled">
                    <T de="Deaktiviertes Feld (Label + Input)" en="Disabled field (Label + Input)" />
                  </Label>
                  <Input id="sg-disabled" disabled defaultValue="Nicht änderbar" />
                </div>
                <Field label={<T de="Suche mit Icon davor (Komposition)" en="Search with leading icon (composition)" />}>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                      <SearchIcon />
                    </span>
                    <Input className="pl-9" placeholder="fintech berlin …" />
                  </div>
                </Field>
              </div>
            </Card>
            <Card title="Textarea + Select">
              <div className="space-y-4">
                <Field label={<T de="Deine Idee" en="Your idea" />} hint={<T de="Ein bis zwei Sätze reichen – oder „offen für alles“." en="One or two sentences – or “open to anything”." />}>
                  <Textarea rows={3} defaultValue="AI-Tool, das Gründer:innen die richtigen Co-Founder und Investoren auf Konferenzen findet." />
                </Field>
                <Field label={<T de="Eigene Rolle im Team" en="Your role in the team" />}>
                  <Select defaultValue="tech">
                    <option value="tech">Tech</option>
                    <option value="commercial">Commercial</option>
                    <option value="product">Product</option>
                    <option value="design">Design</option>
                    <option value="operations">Operations</option>
                    <option value="domain-expert">Domain-Expert:in</option>
                  </Select>
                </Field>
                <Field label={<T de="Phase" en="Stage" />}>
                  <Select defaultValue="idea">
                    <option value="idea">Idee</option>
                    <option value="pre-seed">Pre-Seed</option>
                    <option value="seed">Seed</option>
                    <option value="series-a">Series A</option>
                    <option value="growth">Growth</option>
                  </Select>
                </Field>
              </div>
            </Card>
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section
          id="pageheader"
          title="PageHeader & Kicker"
          source="ui/index.tsx"
          description={
            <T
              de="PageHeader steht oben auf jeder Seite: optionaler eyebrow (Alias kicker) über dem h1 in .text-display, subtitle in --muted, action rechts (mehrere Elemente erlaubt). Abstand nach unten mb-8 gehört zur Komponente."
              en="PageHeader sits on top of every page: optional eyebrow (alias kicker) above the h1 in .text-display, subtitle in --muted, action on the right (several elements allowed). Bottom margin mb-8 belongs to the component."
            />
          }
        >
          <Card title="eyebrow + title + subtitle + action">
            <PageHeader
              eyebrow={<T de="Finden" en="Find" />}
              title={<T de="Kandidaten" en="Candidates" />}
              subtitle={<T de="569 Profile · sortiert nach Match-Score" en="569 profiles · sorted by match score" />}
              action={
                <>
                  <Button variant="secondary" size="sm">
                    Filter
                  </Button>
                  <Button size="sm">
                    <T de="Agent fragen" en="Ask the agent" />
                  </Button>
                </>
              }
            />
            <p className="-mt-4 text-xs text-[var(--muted)]">↑ mb-8</p>
          </Card>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Card title={<T de="Nur title" en="Title only" />}>
              <PageHeader title="Shortlist" />
              <p className="-mt-4 text-xs text-[var(--muted)]">↑ mb-8</p>
            </Card>
            <Card title="Kicker (einzeln)" description=".text-eyebrow – 11 px, Versalien, --accent">
              <Kicker>Design-System</Kicker>
              <Kicker>
                <T de="Schritt 2 von 3" en="Step 2 of 3" />
              </Kicker>
              <p className="mt-2 text-sm text-[var(--foreground)]">
                <T de="Der Kicker sitzt direkt über einer Überschrift und ordnet sie ein." en="The kicker sits right above a heading and classifies it." />
              </p>
            </Card>
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section
          id="emptystate"
          title="EmptyState"
          source="ui/index.tsx"
          description={
            <T
              de="Für leere Listen, fehlende Daten, Fehler- und 404-Seiten. Gestrichelter Rahmen (--radius-lg), zentriert; optional icon (Kreis in --accent-soft), body und action."
              en="For empty lists, missing data, error and 404 pages. Dashed border (--radius-lg), centred; optional icon (circle in --accent-soft), body and action."
            />
          }
        >
          <div className="grid gap-3 md:grid-cols-3">
            <EmptyState
              icon={<StarIcon />}
              title={<T de="Noch keine Shortlist" en="No shortlist yet" />}
              body={<T de="Merke dir Kandidaten über den Stern auf einer Profil-Card." en="Save candidates via the star on a profile card." />}
              action={
                <LinkButton href="#cards" size="sm">
                  <T de="Kandidaten ansehen" en="Browse candidates" />
                </LinkButton>
              }
            />
            <EmptyState
              icon={<SearchIcon />}
              title={<T de="Keine Treffer" en="No results" />}
              body={<T de="Lockere die Filter oder frag den Agenten." en="Loosen the filters or ask the agent." />}
              action={
                <>
                  <Button size="sm" variant="secondary">
                    <T de="Filter zurücksetzen" en="Reset filters" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <T de="Agent fragen" en="Ask agent" />
                  </Button>
                </>
              }
            />
            <EmptyState title={<T de="Ohne Icon, ohne Aktion" en="No icon, no action" />} body={<T de="Minimalform – nur title und body." en="Minimal form – title and body only." />} />
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section
          id="avatar"
          title="Avatar"
          source="ui/index.tsx + .fr-avatar"
          description={
            <T
              de="Mit src: rundes Foto mit Ring in --surface. Ohne: bis zu zwei Initialen, Farbton deterministisch aus dem Namen (gleiche Person, gleiche Farbe – in beiden Modi, oklch aus --accent-soft). size in Pixeln (Standard 40)."
              en="With src: round photo with ring in --surface. Without: up to two initials, hue derived deterministically from the name (same person, same colour – in both modes, oklch from --accent-soft). size in pixels (default 40)."
            />
          }
        >
          <Card>
            <div className="grid gap-6 sm:grid-cols-2">
              <Demo label="src – 26 / 32 / 40 / 56 / 80">
                <Avatar src="https://i.pravatar.cc/200?u=styleguide-demo" name="Demo Person" size={26} />
                <Avatar src="https://i.pravatar.cc/200?u=styleguide-demo" name="Demo Person" size={32} />
                <Avatar src="https://i.pravatar.cc/200?u=styleguide-demo" name="Demo Person" size={40} />
                <Avatar src="https://i.pravatar.cc/200?u=styleguide-demo" name="Demo Person" size={56} />
                <Avatar src="https://i.pravatar.cc/200?u=styleguide-demo" name="Demo Person" size={80} />
              </Demo>
              <Demo label={<T de="ohne src – Initialen, Farbton je Name" en="no src – initials, hue per name" />}>
                <Avatar name="Max Brandt" size={26} />
                <Avatar name="Max Brandt" size={32} />
                <Avatar name="Lena Hoffmann" size={40} />
                <Avatar name="Markus Fellner" size={56} />
                <Avatar name="Jolanda" size={80} />
              </Demo>
            </div>
          </Card>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section
          id="scores"
          title="ScoreBar & ScoreRing"
          source="ui/index.tsx"
          description={
            <T
              de="ScoreBar: Balken 8 px mit Verlauf, Track --surface-3, Label links, Wert rechts (mit /max, wenn max ≠ 100), role=progressbar. ScoreRing: SVG-Kreis 0–100 mit Wert in der Mitte, size frei. tone: accent · success · warning · danger."
              en="ScoreBar: 8 px bar with gradient, track --surface-3, label left, value right (with /max when max ≠ 100), role=progressbar. ScoreRing: SVG circle 0–100 with the value in the centre, free size. tone: accent · success · warning · danger."
            />
          }
        >
          <div className="grid gap-3 md:grid-cols-3">
            <Card title="ScoreBar · tone (0–100)">
              <div className="space-y-3">
                {SCORE_TONES.map((s) => (
                  <ScoreBar key={s.tone} value={s.value} label={s.label} tone={s.tone} />
                ))}
              </div>
            </Card>
            <Card title={<T de="ScoreBar · max=10 und ohne Label" en="ScoreBar · max=10 and without label" />}>
              <div className="space-y-3">
                <ScoreBar value={7} max={10} label="Vision" />
                <ScoreBar value={9} max={10} label="Technik" tone="success" />
                <ScoreBar value={4} max={10} label="Design / Visuell" tone="warning" />
                <ScoreBar value={30} />
                <p className="text-xs text-[var(--muted)]">
                  <T de="Empfehlung: ab 70 success, 40–69 accent, darunter warning." en="Recommendation: 70+ success, 40–69 accent, below warning." />
                </p>
              </div>
            </Card>
            <Card title="ScoreRing">
              <div className="flex flex-wrap items-end gap-5">
                <ScoreRing value={82} label="Match" tone="success" />
                <ScoreRing value={47} label={"Komplementär"} />
                <ScoreRing value={22} label="Risiko" tone="warning" size={56} />
                <ScoreRing value={9} tone="danger" size={48} />
                <ScoreRing value={91} size={96} label="Team-Score" />
                <ScoreRing value={64} size={40} />
              </div>
            </Card>
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section
          id="skeleton"
          title="Skeleton"
          source="ui/index.tsx + .fr-skeleton"
          description={
            <T
              de="Ladeplatzhalter mit Shimmer (aria-hidden). Form über className (Standard h-4 w-full, rounded --radius-sm); Kreise über rounded-full. Respektiert prefers-reduced-motion."
              en="Loading placeholder with shimmer (aria-hidden). Shape via className (default h-4 w-full, rounded --radius-sm); circles via rounded-full. Respects prefers-reduced-motion."
            />
          }
        >
          <div className="grid gap-3 md:grid-cols-3">
            <Card title={<T de="Zeilen" en="Lines" />}>
              <div className="space-y-2">
                <Skeleton />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </Card>
            <Card title={<T de="Formen" en="Shapes" />}>
              <div className="flex flex-wrap items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-14 w-14 rounded-full" />
                <Skeleton className="h-9 w-24 rounded-full" />
                <Skeleton className="h-10 w-28 rounded-[var(--radius)]" />
                <Skeleton className="h-16 w-full rounded-[var(--radius-lg)]" />
              </div>
            </Card>
            <Card title={<T de="Kandidaten-Card lädt" en="Candidate card loading" />}>
              <div className="flex gap-3">
                <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <div className="flex gap-1.5 pt-1">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              </div>
            </Card>
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section
          id="layout"
          title="Layout & i18n"
          source="components/layout/* · lib/i18n.tsx"
          description={
            <T
              de="AppShell = Sidebar (Desktop fest, mobil als Drawer mit Escape) + Header (--header-height: Burger, LogoMark, Seitentitel aus der Route, LanguageToggle, Agent-Button, Profil-Pill) + <main max-w-7xl> auf .fr-app-bg. Seiten rendern kein eigenes <main>. Sprache: useLocale/useT/<T>, gespeichert in localStorage voya.locale."
              en="AppShell = sidebar (fixed on desktop, drawer with Escape on mobile) + header (--header-height: burger, LogoMark, page title from the route, LanguageToggle, agent button, profile pill) + <main max-w-7xl> on .fr-app-bg. Pages render no <main> of their own. Language: useLocale/useT/<T>, stored in localStorage voya.locale."
            />
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Card title="LanguageToggle" description={<T de="Live – schaltet die ganze Seite um (auch diese)." en="Live – switches the whole page (including this one)." />}>
              <div className="flex flex-wrap items-center gap-4">
                <LanguageToggle />
                <p className="text-sm text-[var(--foreground)]">
                  <T de="Aktive Sprache: Deutsch" en="Active language: English" />
                </p>
              </div>
              <p className="mt-3 text-xs text-[var(--muted)]">
                <T
                  de="Der Toggle sitzt im Header der AppShell. Ohne Auswahl gilt „de“. Sidebar-Labels, Seitentitel und der Agent (ChatRequest.locale, VoiceAgentProps.locale) folgen der Auswahl."
                  en="The toggle lives in the AppShell header. Without a choice “de” applies. Sidebar labels, page titles and the agent (ChatRequest.locale, VoiceAgentProps.locale) follow the choice."
                />
              </p>
            </Card>
            <Card
              title={
                <>
                  <Code>{"<T de en />"}</Code> · <Code>useT(dict)</Code>
                </>
              }
              description={<T de="Lokale Wörterbücher pro Seite – kein zentrales Registrieren." en="Local dictionaries per page – no central registration." />}
            >
              <pre className="overflow-x-auto rounded-[var(--radius)] bg-[var(--surface-2)] p-3 font-mono text-[11px] leading-relaxed text-[var(--foreground)]">{I18N_SNIPPET}</pre>
              <p className="mt-3 text-sm text-[var(--foreground)]">
                <T de="Ergebnis:" en="Result:" />{" "}
                <Badge tone="accent">
                  <T de="Gemerkt ✓" en="Saved ✓" />
                </Badge>
              </p>
            </Card>
          </div>

          <Card className="mt-3" title={<T de="Header-Bausteine (Nachbau)" en="Header parts (replica)" />} description="AppShell.tsx – h-[var(--header-height)], bg --surface/80 + backdrop-blur-md, border-b">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius)] text-[var(--foreground)]" aria-hidden>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                </span>
                <LogoMark size={28} />
                <span className="truncate text-[15px] font-semibold tracking-tight text-[var(--foreground)]">
                  <T de="Kandidaten" en="Candidates" />
                </span>
              </div>
              <div className="flex items-center gap-2">
                <LanguageToggle />
                <LinkButton href="#layout" size="sm">
                  <NavIcon name="agent" className="h-4 w-4" /> <T de="Agent starten" en="Start agent" />
                </LinkButton>
                <span className="flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] py-1 pl-1 pr-3 text-sm shadow-[var(--shadow-sm)]">
                  <Avatar name="Marvin" size={30} />
                  <span className="hidden font-medium sm:inline">Marvin</span>
                  <Badge tone="accent">Tech</Badge>
                </span>
              </div>
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              <T de="Der Seitentitel kommt aus getPageTitle(pathname, locale) in Sidebar.tsx – Routen ohne Nav-Eintrag fallen auf „Voya“ zurück." en="The page title comes from getPageTitle(pathname, locale) in Sidebar.tsx – routes without a nav entry fall back to “Voya”." />
            </p>
          </Card>

          <Card className="mt-3" title={<T de="Sidebar-Bausteine (Nachbau)" en="Sidebar parts (replica)" />} description="Sidebar.tsx – LogoMark, NAV_GROUPS (Finden · Vorbereiten · Kontext), NavIcon, Active-Balken">
            <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
              <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--sidebar-bg)] p-3">
                <div className="flex items-center gap-3 px-1 py-1">
                  <LogoMark size={34} className="shadow-[var(--shadow-sm)]" />
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold tracking-tight text-[var(--foreground)]">Voya</span>
                    <span className="block truncate text-[11px] text-[var(--muted)]">
                      <T de="Die richtigen Menschen finden" en="Find the right people" />
                    </span>
                  </span>
                </div>
                <p className="mb-1.5 mt-4 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  <T de="Finden" en="Find" />
                </p>
                <div className="relative flex h-10 items-center gap-3 rounded-[var(--radius)] bg-[var(--accent-soft)] px-3 text-sm font-semibold text-[var(--accent)]">
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--accent)]" aria-hidden />
                  <NavIcon name="dashboard" className="text-[var(--accent)]" />
                  <span className="truncate">Dashboard</span>
                </div>
                <div className="flex h-10 items-center gap-3 rounded-[var(--radius)] px-3 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]">
                  <NavIcon name="agent" className="text-[var(--muted)]" />
                  <span className="truncate">Agent</span>
                </div>
                <div className="flex h-10 items-center gap-3 rounded-[var(--radius)] px-3 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]">
                  <NavIcon name="candidates" className="text-[var(--muted)]" />
                  <span className="truncate">
                    <T de="Kandidaten" en="Candidates" />
                  </span>
                </div>
              </div>
              <div>
                <p className="mb-2 font-mono text-[11px] text-[var(--muted)]">NavIcon – alle Namen (Inline-SVG, 18 px, Stroke 1.75)</p>
                <div className="flex flex-wrap gap-2">
                  {(["dashboard", "agent", "candidates", "shortlist", "outreach", "team", "tips", "events", "network", "profile", "settings"] as const).map((name) => (
                    <span key={name} className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--foreground)]">
                      <NavIcon name={name} className="text-[var(--muted)]" />
                      {name}
                    </span>
                  ))}
                </div>
                <p className="mb-2 mt-4 font-mono text-[11px] text-[var(--muted)]">LogoMark – size 24 / 32 / 48</p>
                <div className="flex items-end gap-3">
                  <LogoMark size={24} />
                  <LogoMark size={32} />
                  <LogoMark size={48} />
                </div>
              </div>
            </div>
          </Card>
        </Section>
      </div>

      <footer className="mt-14 border-t border-[var(--border)] pt-6 text-xs text-[var(--muted)]">
        <T de="Änderungen an" en="Changes to" /> <Code>globals.css</Code>, <Code>ui/index.tsx</Code>, <Code>layout/*</Code> <T de="und" en="and" /> <Code>lib/i18n.tsx</Code>{" "}
        <T de="wirken sich sofort auf diese Seite aus." en="apply to this page immediately." /> Design-Handoff: <Code>docs/DESIGN.md</Code> · Architektur:{" "}
        <Code>docs/ARCHITECTURE.md</Code> · Parallel-Arbeit: <Code>docs/PARALLEL-WORK.md</Code>
      </footer>
    </div>
  );
}
