/**
 * Styleguide – Referenzseite für den Design-Pivot (docs/DESIGN.md).
 * ---------------------------------------------------------------
 * Server Component, reine Anzeige: alle Design-Tokens aus src/app/globals.css (Light- und
 * Dark-Wert als Swatch, Live-Fläche über var(--…)), die Typo-Skala und ALLE UI-Primitives aus
 * src/components/ui/index.tsx in allen Varianten/Größen/Tones – plus Layout-Bausteine
 * (LanguageToggle, <T>) aus src/lib/i18n.tsx. Kein eigenes <main>: die AppShell setzt Breite
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
  EmptyState,
  Field,
  Input,
  Kicker,
  Label,
  LinkButton,
  PageHeader,
  ScoreBar,
  SectionTitle,
  Select,
  Skeleton,
  Stat,
  Textarea,
} from "@/components/ui";
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
  { name: "--background", light: "#f5f6f8", dark: "#0b0f19", usage: { de: "Seitenhintergrund", en: "Page background" } },
  { name: "--foreground", light: "#0f172a", dark: "#e5e7eb", usage: { de: "Primärer Text", en: "Primary text" } },
  { name: "--muted", light: "#64748b", dark: "#94a3b8", usage: { de: "Sekundärtext, Labels, Hints", en: "Secondary text, labels, hints" } },
  { name: "--surface", light: "#ffffff", dark: "#111827", usage: { de: "Cards, Eingabefelder, Header", en: "Cards, inputs, header" } },
  { name: "--surface-2", light: "#f1f3f7", dark: "#171f2e", usage: { de: "Hover-Flächen, neutrale Badges, Skeleton", en: "Hover surfaces, neutral badges, skeleton" } },
  { name: "--surface-3", light: "#e5e8ef", dark: "#232d40", usage: { de: "ScoreBar-Track, Skeleton-Schimmer", en: "ScoreBar track, skeleton shimmer" } },
  { name: "--border", light: "#e4e7ee", dark: "#232d40", usage: { de: "Rahmenlinien", en: "Borders" } },
  { name: "--accent", light: "#4f46e5", dark: "#818cf8", usage: { de: "Primäre Aktion, aktiver Chip, Kicker, Fokus", en: "Primary action, active chip, kicker, focus" } },
  { name: "--accent-strong", light: "#4338ca", dark: "#a5b4fc", usage: { de: "Hover des Primär-Buttons", en: "Primary button hover" } },
  { name: "--accent-soft", light: "#eef2ff", dark: "#1e1b4b", usage: { de: "Akzent-Flächen: Badge, Avatar-Fallback, aktive Navigation", en: "Accent surfaces: badge, avatar fallback, active nav" } },
  { name: "--accent-contrast", light: "#ffffff", dark: "#0b0f19", usage: { de: "Text auf --accent (Buttons, Chips, Wortmarke)", en: "Text on --accent (buttons, chips, logo)" } },
  { name: "--success", light: "#15803d", dark: "#4ade80", usage: { de: "Positiv – Text, hohe Scores", en: "Positive – text, high scores" } },
  { name: "--success-soft", light: "#dcfce7", dark: "#14532d", usage: { de: "Positiv – Fläche", en: "Positive – surface" } },
  { name: "--warning", light: "#b45309", dark: "#fbbf24", usage: { de: "Hinweis – Text, Risiken", en: "Warning – text, risks" } },
  { name: "--warning-soft", light: "#fef3c7", dark: "#78350f", usage: { de: "Hinweis – Fläche", en: "Warning – surface" } },
  { name: "--danger", light: "#b91c1c", dark: "#f87171", usage: { de: "Fehler / destruktiv – Text, Red Flags", en: "Error / destructive – text, red flags" } },
  { name: "--danger-soft", light: "#fee2e2", dark: "#7f1d1d", usage: { de: "Fehler / destruktiv – Fläche", en: "Error / destructive – surface" } },
  { name: "--sidebar-bg", light: "#ffffff", dark: "#0e131f", usage: { de: "Hintergrund der Sidebar", en: "Sidebar background" } },
];

/** Nicht-Farb-Tokens (Form, Tiefe, Layout). */
const SHAPE_TOKENS: { name: string; light: string; dark: string; usage: { de: string; en: string } }[] = [
  { name: "--ring", light: "rgba(79, 70, 229, 0.35)", dark: "rgba(129, 140, 248, 0.45)", usage: { de: "Fokusring aller interaktiven Bausteine", en: "Focus ring of all interactive parts" } },
  { name: "--shadow-sm", light: "0 1px 2px …", dark: "0 1px 2px rgba(0,0,0,.4)", usage: { de: "Cards, Buttons, Inputs", en: "Cards, buttons, inputs" } },
  { name: "--shadow-md", light: "0 8px 24px -12px …", dark: "0 12px 32px -16px …", usage: { de: "Hover auf Stat mit Link, mobile Sidebar", en: "Stat hover, mobile sidebar" } },
  { name: "--radius", light: "12px", dark: "12px", usage: { de: "Cards, Stat, EmptyState", en: "Cards, stat, empty state" } },
  { name: "--radius-sm", light: "8px", dark: "8px", usage: { de: "Buttons, Inputs, Skeleton, Navigation", en: "Buttons, inputs, skeleton, nav" } },
  { name: "--sidebar-width", light: "256px", dark: "256px", usage: { de: "Breite der Desktop-Sidebar (AppShell)", en: "Desktop sidebar width (AppShell)" } },
];

const TYPE_SCALE: { cls: string; px: string; usage: { de: string; en: string } }[] = [
  { cls: "text-[11px]", px: "11 px", usage: { de: "Badge, Kicker, Sidebar-Hints, Toggle", en: "Badge, kicker, sidebar hints, toggle" } },
  { cls: "text-xs", px: "12 px", usage: { de: "Labels, Hints, Chip, Button sm", en: "Labels, hints, chip, small button" } },
  { cls: "text-sm", px: "14 px", usage: { de: "Standard-UI, Listen, Button md, Card-Titel", en: "Default UI, lists, medium button, card title" } },
  { cls: "text-base", px: "16 px", usage: { de: "Fließtext, Chat, SectionTitle, Button lg", en: "Body text, chat, section title, large button" } },
  { cls: "text-lg", px: "18 px", usage: { de: "Große Card-Titel", en: "Large card titles" } },
  { cls: "text-xl", px: "20 px", usage: { de: "Abschnitts-Titel in Detailseiten", en: "Section titles on detail pages" } },
  { cls: "text-2xl", px: "24 px", usage: { de: "Seitentitel mobil (PageHeader), Stat-Wert", en: "Page title mobile (PageHeader), stat value" } },
  { cls: "text-3xl", px: "30 px", usage: { de: "Seitentitel ab sm: (PageHeader)", en: "Page title from sm: (PageHeader)" } },
];

const FONT_WEIGHTS: { cls: string; label: string }[] = [
  { cls: "font-normal", label: "Normal (400)" },
  { cls: "font-medium", label: "Medium (500)" },
  { cls: "font-semibold", label: "Semibold (600)" },
  { cls: "font-bold", label: "Bold (700)" },
];

const BUTTON_VARIANTS: { variant: ButtonVariant; label: string }[] = [
  { variant: "primary", label: "Primär" },
  { variant: "secondary", label: "Sekundär" },
  { variant: "outline", label: "Outline" },
  { variant: "ghost", label: "Ghost" },
  { variant: "danger", label: "Danger" },
];

const BUTTON_SIZES: ButtonSize[] = ["sm", "md", "lg"];

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
  { id: "chips", label: "Chip & Badge" },
  { id: "cards", label: "Card & SectionTitle" },
  { id: "stats", label: "Stat" },
  { id: "formulare", label: "Formulare" },
  { id: "pageheader", label: "PageHeader & Kicker" },
  { id: "emptystate", label: "EmptyState" },
  { id: "avatar", label: "Avatar" },
  { id: "scorebar", label: "ScoreBar" },
  { id: "skeleton", label: "Skeleton" },
  { id: "layout", label: "Layout & i18n" },
];

const SAMPLE_TEXT = "Die richtigen Kontakte finden – Co-Founder, Investoren, Mentoren.";

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
    <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
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

/** Icon-Platzhalter ohne Icon-Bibliothek (Inline-SVG). */
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

/* ------------------------------------------------------------------ */
/* Seite                                                               */
/* ------------------------------------------------------------------ */

export default function StyleguidePage() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        kicker="Design-System"
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
              ◉ Agent
            </LinkButton>
          </>
        }
      />

      <nav aria-label="Abschnitte" className="mb-8 flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="inline-flex h-8 items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
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
              de="UI-Texte zweisprachig (DE/EN) über src/lib/i18n.tsx, Code Englisch. Mobile-first (Basis 375 px), Dark-Mode über die Systemeinstellung."
              en="UI copy bilingual (DE/EN) via src/lib/i18n.tsx, code in English. Mobile-first (375 px base), dark mode follows the system setting."
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
              de="CSS-Variablen auf :root, der Dark-Block überschreibt dieselben Namen. Große Fläche = aktuell aktiver Wert (var), kleine Punkte = dokumentierter Light-/Dark-Wert."
              en="CSS variables on :root, the dark block overrides the same names. Large area = currently active value (var), small dots = documented light/dark value."
            />
          }
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {COLOR_TOKENS.map((t) => (
              <ColorSwatch key={t.name} token={t} />
            ))}
          </div>

          <Card className="mt-4" title={<T de="Form, Tiefe, Layout" en="Shape, depth, layout" />} description={<T de="Nicht-Farb-Tokens" en="Non-colour tokens" />}>
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
                <p className="mb-2 font-mono text-[11px] text-[var(--muted)]">--radius / --radius-sm</p>
                <div className="flex items-end gap-3">
                  <div className="h-14 w-14 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)]" />
                  <div className="h-10 w-10 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)]" />
                </div>
              </div>
              <div>
                <p className="mb-2 font-mono text-[11px] text-[var(--muted)]">--shadow-sm / --shadow-md</p>
                <div className="flex items-end gap-3">
                  <div className="h-14 w-14 rounded-[var(--radius)] bg-[var(--surface)] shadow-[var(--shadow-sm)]" />
                  <div className="h-14 w-14 rounded-[var(--radius)] bg-[var(--surface)] shadow-[var(--shadow-md)]" />
                </div>
              </div>
              <div>
                <p className="mb-2 font-mono text-[11px] text-[var(--muted)]">--ring (focus-visible)</p>
                <div className="flex items-end gap-3">
                  <div className="h-10 w-24 rounded-[var(--radius-sm)] bg-[var(--surface)] ring-2 ring-[var(--ring)]" />
                </div>
              </div>
            </div>
            <div className="mt-4">
              <p className="mb-2 font-mono text-[11px] text-[var(--muted)]">--sidebar-width (256px) – der Balken ist genau so breit</p>
              <div className="h-2.5 max-w-full rounded-full bg-[var(--accent)]" style={{ width: "var(--sidebar-width)" }} />
            </div>
          </Card>

          <Card className="mt-4" title={<T de="Schrift-Tokens" en="Font tokens" />} description="@theme inline → Tailwind v4">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
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

          <Card className="mt-4" title={<T de="Globale Hilfsklassen" en="Global helper classes" />} description="globals.css, unterhalb der Tokens">
            <ul className="space-y-1.5 text-sm text-[var(--foreground)]">
              <li>
                <Code>.fr-fade-in</Code> – <T de="sanftes Einblenden für Listen und Cards (0,25 s)" en="soft fade-in for lists and cards (0.25 s)" />
              </li>
              <li>
                <Code>.fr-scroll</Code> – <T de="schmale Scrollbar in Panels (Sidebar, Transkript)" en="thin scrollbar in panels (sidebar, transcript)" />
              </li>
              <li>
                <Code>.fr-skeleton</Code> – <T de="Shimmer-Hintergrund, von <Skeleton> genutzt" en="shimmer background used by <Skeleton>" />
              </li>
            </ul>
          </Card>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section
          id="typografie"
          title={<T de="Typografie" en="Typography" />}
          source="Tailwind-Skala"
          description={
            <T
              de="Titel nutzen font-semibold + tracking-tight. Zahlen (Scores) in Geist Mono oder mit tabular-nums."
              en="Titles use font-semibold + tracking-tight. Numbers (scores) in Geist Mono or with tabular-nums."
            />
          }
        >
          <Card>
            <ul className="divide-y divide-[var(--border)]">
              {TYPE_SCALE.map((t) => (
                <li key={t.cls} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-6">
                  <div className="w-44 shrink-0">
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
              <p className="text-sm text-[var(--accent)]">--accent · Akzent, Links, Kicker</p>
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
              de="Fünf Varianten (primary, secondary, outline, ghost, danger), drei Größen (sm 32 px, md 40 px, lg 48 px), disabled = 50 % Deckkraft. Fokusring über --ring. LinkButton hat dieselbe Optik und rendert next/link."
              en="Five variants (primary, secondary, outline, ghost, danger), three sizes (sm 32 px, md 40 px, lg 48 px), disabled = 50 % opacity. Focus ring via --ring. LinkButton looks the same and renders next/link."
            />
          }
        >
          <Card>
            <div className="space-y-5">
              {BUTTON_VARIANTS.map((v) => (
                <Demo key={v.variant} label={`variant="${v.variant}" – ${v.label}`}>
                  {BUTTON_SIZES.map((size) => (
                    <Button key={size} variant={v.variant} size={size}>
                      <T de="Anschreiben" en="Reach out" /> ({size})
                    </Button>
                  ))}
                  <Button variant={v.variant} disabled>
                    disabled
                  </Button>
                </Demo>
              ))}
            </div>
          </Card>
          <Card className="mt-3" title="LinkButton" description={<>href + variant + size; target=&quot;_blank&quot; setzt rel=noreferrer</>}>
            <div className="space-y-4">
              <Demo label="alle Varianten, size=md">
                {BUTTON_VARIANTS.map((v) => (
                  <LinkButton key={v.variant} href="#buttons" variant={v.variant}>
                    {v.label}
                  </LinkButton>
                ))}
              </Demo>
              <Demo label="size=sm / md / lg">
                {BUTTON_SIZES.map((size) => (
                  <LinkButton key={size} href="#buttons" variant="secondary" size={size}>
                    LinkButton {size}
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
          title="Chip & Badge"
          source="ui/index.tsx"
          description={
            <T
              de="Chip = umschaltbarer Filter (Button, 32 px hoch, active füllt mit --accent). Badge = reine Anzeige in fünf Tones, Text-/Flächenfarbe aus dem Token-Paar --x / --x-soft."
              en="Chip = toggleable filter (button, 32 px high, active fills with --accent). Badge = display only in five tones, text/surface colour from the token pair --x / --x-soft."
            />
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Card title="Chip" description="active?: boolean · onClick?: () => void">
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
                <Demo label={<T de="Filterzeile (typischer Einsatz)" en="Filter row (typical use)" />}>
                  <Chip active>
                    <T de="Alle" en="All" />
                  </Chip>
                  <Chip>Tech</Chip>
                  <Chip>Commercial</Chip>
                  <Chip>Product</Chip>
                  <Chip>Design</Chip>
                </Demo>
              </div>
            </Card>
            <Card title="Badge" description="tone: neutral · accent · success · warning · danger">
              <div className="space-y-4">
                <Demo label="tone">
                  {BADGE_TONES.map((b) => (
                    <div key={b.tone} className="flex flex-col items-start gap-1">
                      <Badge tone={b.tone}>{b.label}</Badge>
                      <code className="text-[11px] text-[var(--muted)]">{b.tone}</code>
                    </div>
                  ))}
                </Demo>
                <Demo label={<T de="Herkunfts-Badge für generierte Inhalte (generatedBy) und Voice-Status" en="Origin badge for generated content (generatedBy) and voice status" />}>
                  <Badge tone="accent">KI</Badge>
                  <Badge>Vorlage</Badge>
                  <Badge tone="success">● Verbunden</Badge>
                  <Badge tone="warning">Verbinde …</Badge>
                </Demo>
              </div>
            </Card>
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section
          id="cards"
          title="Card & SectionTitle"
          source="ui/index.tsx"
          description={
            <T
              de="Card ist der Container für alles: Header erscheint nur mit title, description oder action; padding none/sm/md/lg. SectionTitle gliedert eine Seite in Abschnitte (h2, optional mit action rechts)."
              en="Card is the container for everything: the header only appears with title, description or action; padding none/sm/md/lg. SectionTitle structures a page into sections (h2, optional action on the right)."
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
                <T de="Der Titel ist ein h3 in text-sm font-semibold." en="The title is an h3 in text-sm font-semibold." />
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

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CARD_PADDINGS.map((p) => (
              <Card key={p} padding={p} className="min-h-20">
                <div className="rounded-[var(--radius-sm)] bg-[var(--accent-soft)] px-2 py-1.5 text-xs text-[var(--accent)]">padding=&quot;{p}&quot;</div>
              </Card>
            ))}
          </div>

          <Card className="mt-3" title="SectionTitle" description="children + action?">
            <div className="space-y-6">
              <div>
                <SectionTitle>
                  <T de="Ohne Aktion" en="Without action" />
                </SectionTitle>
                <div className="h-10 rounded-[var(--radius-sm)] border border-dashed border-[var(--border)]" />
              </div>
              <div>
                <SectionTitle
                  action={
                    <LinkButton href="#cards" variant="ghost" size="sm">
                      <T de="Alle Kandidaten" en="All candidates" /> →
                    </LinkButton>
                  }
                >
                  <T de="Mit Aktion (LinkButton ghost)" en="With action (LinkButton ghost)" />
                </SectionTitle>
                <div className="h-10 rounded-[var(--radius-sm)] border border-dashed border-[var(--border)]" />
              </div>
              <div>
                <SectionTitle action={<Badge tone="accent">6</Badge>}>
                  <T de="Mit Zähler-Badge" en="With counter badge" />
                </SectionTitle>
                <div className="h-10 rounded-[var(--radius-sm)] border border-dashed border-[var(--border)]" />
              </div>
            </div>
          </Card>

          <Card className="mt-3" title={<T de="Beispiel: Kandidaten-Card" en="Example: candidate card" />} action={<Badge tone="success">Match 82</Badge>}>
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
                  ☆ <T de="Merken" en="Save" />
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
              de="KPI-Kachel: value groß (text-2xl), label, optionaler hint. Mit href wird die ganze Kachel ein Link und hebt sich beim Hover (Rahmen --accent, --shadow-md)."
              en="KPI tile: value large (text-2xl), label, optional hint. With href the whole tile becomes a link and lifts on hover (border --accent, --shadow-md)."
            />
          }
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat value="569" label={<T de="Kontakte" en="Contacts" />} hint={<T de="mit Link (href)" en="with link (href)" />} href="/candidates" />
            <Stat value="128" label="Co-Founder" hint="href + hint" href="/candidates?networkRole=cofounder" />
            <Stat value="41" label={<T de="Investoren" en="Investors" />} hint="Angels & VCs" href="/candidates?networkRole=investor" />
            <Stat value="3" label="Events" hint={<T de="ohne Link" en="without link" />} />
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
              de="Input, Textarea, Select, Label und Field. Fokus färbt den Rahmen in --accent und setzt den Ring --ring."
              en="Input, Textarea, Select, Label and Field. Focus colours the border in --accent and adds the --ring."
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
              de="PageHeader steht oben auf jeder Seite: optionaler kicker (Kicker-Komponente), h1 in text-2xl/sm:text-3xl, subtitle in --muted, action rechts (mehrere Elemente erlaubt). Abstand nach unten mb-8 gehört zur Komponente."
              en="PageHeader sits on top of every page: optional kicker (Kicker component), h1 in text-2xl/sm:text-3xl, subtitle in --muted, action on the right (several elements allowed). Bottom margin mb-8 belongs to the component."
            />
          }
        >
          <Card title="kicker + title + subtitle + action">
            <PageHeader
              kicker={<T de="Finden" en="Find" />}
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
            <Card title="Kicker (einzeln)" description="text-[11px] uppercase tracking-[0.12em] in --accent">
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
              de="Für leere Listen, fehlende Daten, Fehler- und 404-Seiten. Gestrichelter Rahmen, zentriert; optional icon (Kreis in --accent-soft), body und action."
              en="For empty lists, missing data, error and 404 pages. Dashed border, centred; optional icon (circle in --accent-soft), body and action."
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
          source="ui/index.tsx"
          description={
            <T
              de="Mit src: rundes Foto mit Ring in --surface. Ohne: bis zu zwei Initialen auf --accent-soft. size in Pixeln (Standard 40)."
              en="With src: round photo with ring in --surface. Without: up to two initials on --accent-soft. size in pixels (default 40)."
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
              <Demo label={<T de="ohne src – Initialen" en="no src – initials" />}>
                <Avatar name="Max Mustermann" size={26} />
                <Avatar name="Max Mustermann" size={32} />
                <Avatar name="Lena Hoffmann" size={40} />
                <Avatar name="Lena Hoffmann" size={56} />
                <Avatar name="Jolanda" size={80} />
              </Demo>
            </div>
          </Card>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section
          id="scorebar"
          title="ScoreBar"
          source="ui/index.tsx"
          description={
            <T
              de="Score-Balken 6 px hoch, Track --surface-3. tone färbt die Füllung (accent · success · warning · danger). Mit label erscheint die Zeile „Label … Wert“; max ist standardmäßig 100."
              en="Score bar 6 px high, track --surface-3. tone colours the fill (accent · success · warning · danger). With label the line “Label … value” appears; max defaults to 100."
            />
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Card title="tone (0–100)">
              <div className="space-y-3">
                {SCORE_TONES.map((s) => (
                  <ScoreBar key={s.tone} value={s.value} label={s.label} tone={s.tone} />
                ))}
              </div>
            </Card>
            <Card title={<T de="max=10 (Dimensionen) und ohne Label" en="max=10 (dimensions) and without label" />}>
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
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section
          id="skeleton"
          title="Skeleton"
          source="ui/index.tsx + .fr-skeleton"
          description={
            <T
              de="Ladeplatzhalter mit Shimmer. Form über className (Standard h-4 w-full, rounded --radius-sm); Kreise über rounded-full."
              en="Loading placeholder with shimmer. Shape via className (default h-4 w-full, rounded --radius-sm); circles via rounded-full."
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
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-16 w-full" />
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
                  <Skeleton className="h-1.5 w-full rounded-full" />
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
              de="AppShell = Sidebar (Desktop fest, mobil als Drawer) + Header (Claim, LanguageToggle, Agent-Button, Profil-Pill) + <main max-w-7xl>. Seiten rendern kein eigenes <main>. Sprache: useLocale/useT/<T>, gespeichert in localStorage voya.locale."
              en="AppShell = sidebar (fixed on desktop, drawer on mobile) + header (claim, LanguageToggle, agent button, profile pill) + <main max-w-7xl>. Pages render no <main> of their own. Language: useLocale/useT/<T>, stored in localStorage voya.locale."
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
                  de="Der Toggle sitzt im Header der AppShell. Ohne Auswahl gilt „de“. Sidebar-Labels, Header-Claim und der Agent (ChatRequest.locale, VoiceAgentProps.locale) folgen der Auswahl."
                  en="The toggle lives in the AppShell header. Without a choice “de” applies. Sidebar labels, header claim and the agent (ChatRequest.locale, VoiceAgentProps.locale) follow the choice."
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
              <pre className="overflow-x-auto rounded-[var(--radius-sm)] bg-[var(--surface-2)] p-3 font-mono text-[11px] leading-relaxed text-[var(--foreground)]">{I18N_SNIPPET}</pre>
              <p className="mt-3 text-sm text-[var(--foreground)]">
                <T de="Ergebnis:" en="Result:" />{" "}
                <Badge tone="accent">
                  <T de="Gemerkt ✓" en="Saved ✓" />
                </Badge>
              </p>
            </Card>
          </div>

          <Card className="mt-3" title={<T de="Header-Bausteine (Nachbau)" en="Header parts (replica)" />} description="AppShell.tsx – h-14, bg --surface/85 + backdrop-blur, border-b">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-4 py-2">
              <span className="text-xs text-[var(--muted)]">
                <T de="Finde die richtigen Menschen für dein Start-up" en="Find the right people for your start-up" />
              </span>
              <div className="flex items-center gap-2">
                <LanguageToggle />
                <LinkButton href="#layout" size="sm">
                  ◉ <T de="Agent starten" en="Start agent" />
                </LinkButton>
                <span className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] py-1 pl-1 pr-3 text-sm shadow-[var(--shadow-sm)]">
                  <Avatar name="Marvin" size={26} />
                  <span className="hidden font-medium sm:inline">Marvin</span>
                  <Badge tone="accent">Tech</Badge>
                </span>
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-[var(--radius-sm)] bg-[var(--accent-soft)] px-2.5 py-2 text-sm font-medium text-[var(--accent)]">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--surface)] text-base" aria-hidden>
                  ◫
                </span>
                <span>
                  <span className="block leading-5">Dashboard</span>
                  <span className="block text-[11px] font-normal text-[var(--muted)]">
                    <T de="Sidebar: aktiver Eintrag" en="Sidebar: active item" />
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--surface-2)] text-base text-[var(--muted)]" aria-hidden>
                  ⌕
                </span>
                <span>
                  <span className="block leading-5">
                    <T de="Kandidaten" en="Candidates" />
                  </span>
                  <span className="block text-[11px] text-[var(--muted)]">
                    <T de="Sidebar: inaktiver Eintrag" en="Sidebar: inactive item" />
                  </span>
                </span>
              </div>
            </div>
          </Card>
        </Section>
      </div>

      <footer className="mt-14 border-t border-[var(--border)] pt-6 text-xs text-[var(--muted)]">
        <T de="Änderungen an" en="Changes to" /> <Code>globals.css</Code>, <Code>ui/index.tsx</Code> <T de="und" en="and" /> <Code>lib/i18n.tsx</Code>{" "}
        <T de="wirken sich sofort auf diese Seite aus." en="apply to this page immediately." /> Design-Handoff: <Code>docs/DESIGN.md</Code> · Architektur:{" "}
        <Code>docs/ARCHITECTURE.md</Code> · Parallel-Arbeit: <Code>docs/PARALLEL-WORK.md</Code>
      </footer>
    </div>
  );
}
