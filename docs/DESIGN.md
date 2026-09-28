# FounderRadar – Design-Handoff

Für Jolanda: Du übernimmst nach dem MVP das Design und sollst dafür niemanden fragen müssen.
Dieses Dokument sagt dir, **was** das Produkt sein soll, **wo** im Code Design entsteht und
**wie** du sicher pivotierst, ohne die Funktionen zu brechen.

Stand: 28.09.2026 (Design-System-Paket gemergt). Live-Referenz aller Bausteine: `http://localhost:3000/styleguide`.
Technik-Hintergrund (Datenfluss, Agent, APIs): [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 1. Zielbild: „cleanes Dashboard"

Aus dem Briefing (`transcriptMVP.txt`, ab 00:04:10):

> „allgemein vom Design her wird das ein cleanes Dashboard"
>
> „Wir machen ein cleanes Frontend. […] ganz grobes Design machst du mir, einen richtigen MVP, wo nur
> alle Funktionen schon drin sind. Sieht noch nicht gut aus. Jolanda, du übernimmst dann das Design,
> wenn das fertig ist."
>
> „Machst du so fertig, dass eine Kollegin da selbstständig drauf am Design pivoten kann."

Was das für dich bedeutet:

- **Dashboard-Charakter.** Sidebar-Navigation links, Inhalt in Cards, klare Hierarchie
  (Seitentitel → Card-Titel → Inhalt), wenig Dekoration. Vorbild laut Briefing: LinkedIn-Suche,
  aber „pivotiert auf den Use Case Co-Founder" – Rolle im Ökosystem, gesuchte Rolle, Vertical,
  Event, Match-Score und Persönlichkeitstyp stehen im Vordergrund, nicht Feeds und Likes.
- **Nutzungssituation.** Gründer:innen auf einer Konferenz, zwischen zwei Gesprächen, oft am Handy,
  bei Tageslicht. Abends am Laptop zur Vorbereitung. Daher: Mobile-first, große Touch-Ziele, hoher
  Kontrast, Dark-Mode.
- **Ton.** Professionell und warm. Es geht um Co-Founder- und Investoren-Kontakte – Vertrauen ist
  wichtiger als „Startup-bunt". Aber schnell und direkt: eine Aktion pro Card, kein Rätselraten.
- **Der Agent ist Teil des UI.** Sagt jemand „guck dir mal den Max an", erscheint Max' Profil live
  neben dem Chat-/Voice-Panel. Das Live-Panel und die Kandidaten-Cards sind die wichtigsten
  wiederkehrenden Elemente – hier lohnt sich die meiste Design-Zeit.

Der MVP ist absichtlich „hässlich, aber vollständig". Alles, was du siehst, funktioniert; alles,
was du änderst, soll weiter funktionieren.

---

## 2. Wo pivotieren – drei Ebenen

Die App ist so gebaut, dass fast das gesamte Erscheinungsbild an **drei Stellen** liegt. Die
Seiten (`src/app/**/page.tsx`) und Feature-Komponenten benutzen nur diese Bausteine. Für einen
Restyle musst du die Seiten im Idealfall gar nicht anfassen.

| Ebene | Datei(en) | Was du damit änderst |
|---|---|---|
| 1 Tokens | `src/app/globals.css` | Farben (Light + Dark), Schrift, Sidebar-Breite – wirkt sofort überall |
| 2 Primitives | `src/components/ui/index.tsx` | Form, Radien, Abstände, Zustände aller Buttons, Cards, Badges, Inputs … |
| 3 Layout | `src/app/layout.tsx`, `src/components/layout/*` | Sidebar, Navigation, Seitenraster, Header |

Diese drei Bereiche sind **gemeinsame Dateien** (siehe [PARALLEL-WORK.md](PARALLEL-WORK.md)).
Solange die vielen parallelen Agenten noch bauen, laufen Änderungen daran über Marvin
(Koordination). Nach dem MVP-Merge gehören sie dir.

### 2.1 Ebene 1: Design-Tokens (`src/app/globals.css`)

Alle Farben sind CSS-Variablen auf `:root`. Der Dark-Mode überschreibt dieselben Variablen in
`@media (prefers-color-scheme: dark)`. Komponenten benutzen **ausschließlich** `var(--…)`, nie
Hex-Werte oder Tailwind-Palettenfarben. Richtung: warm getönte Neutrals, Akzent Indigo.

| Variable | Bedeutung | Light | Dark | Wo sie wirkt |
|---|---|---|---|---|
| `--background` | Seitenhintergrund (warm) | `#f7f6f2` | `#131217` | `body`, `.fr-app-bg` |
| `--foreground` | Primärer Text | `#1b1a17` | `#ece9e2` | Text, Titel, Button secondary/ghost |
| `--muted` | Sekundärtext | `#6d6860` | `#a09b92` | Untertitel, Labels, Hints, Badge neutral, Placeholder |
| `--surface` | Flächen erster Ebene | `#ffffff` | `#1b1a20` | Card, Input, Header, Avatar-Ring |
| `--surface-2` | Flächen zweiter Ebene | `#f2f0ea` | `#232228` | Hover (secondary/ghost/Nav), Badge neutral, Skeleton |
| `--surface-3` | Pressed / Track | `#e6e2d9` | `#2e2d34` | Active-Zustände, ScoreBar-/ScoreRing-Track, Scrollbar |
| `--surface-elevated` | Schwebende Flächen | `#ffffff` | `#222127` | Popover, Drawer, Dialog (für spätere Bausteine) |
| `--border` | Rahmenlinien | `#e5e1d8` | `#2c2b32` | Card, Inputs, Divider, Sidebar-Rand |
| `--sidebar-bg` | Sidebar-Hintergrund | `#fcfbf8` | `#17161c` | Sidebar, Mobile-Drawer |
| `--accent` | Markenfarbe, primäre Aktion | `#4338ca` | `#a5b4fc` | Button primary, Links, Nav aktiv, Score-Füllung, Logo |
| `--accent-strong` | Akzent Hover / Pressed | `#3730a3` | `#c7d2fe` | Button primary hover/active |
| `--accent-soft` | Sanfte Akzentfläche | `#e9e7fb` | `#2a2857` | Badge accent, Nav aktiv, Avatar-Fallback, Stat-Icon |
| `--accent-contrast` | Text auf Akzent | `#ffffff` | `#131217` | Button primary/danger, Chip aktiv, `::selection` |
| `--success` / `--success-soft` | Positiv (Text / Fläche) | `#1b7a47` / `#dcf3e4` | `#5ed394` / `#16402b` | Badge success, hohe Scores |
| `--warning` / `--warning-soft` | Hinweis (Text / Fläche) | `#a2570b` / `#fbeed3` | `#f2b95a` / `#4a3110` | Badge warning, Risiken |
| `--danger` / `--danger-soft` | Fehler / destruktiv (Text / Fläche) | `#b73333` / `#fce3e0` | `#f28b8b` / `#4e2020` | Button danger, Badge danger, Red Flags |
| `--ring` | Fokusring | Akzent 40 % | Akzent 50 % | `focus-visible` auf allen interaktiven Bausteinen |
| `--shadow-sm` / `--shadow` / `--shadow-lg` | Tiefe (weich; im Dark fast unsichtbar) | s. CSS | s. CSS | Cards/Buttons · Hover-Lift · Drawer |
| `--shadow-md` | Alias für `--shadow` | – | – | ältere Aufrufe |
| `--radius-sm` / `--radius` / `--radius-lg` | Radien | `8px` / `10px` / `14px` | – | Skeleton · Buttons/Inputs/Nav · Cards/Stat/EmptyState |
| `--sidebar-width` | Breite der Desktop-Sidebar | `264px` | – | `AppShell` |
| `--header-height` | Höhe des Headers | `56px`, ab `md:` `64px` | – | `AppShell` |

`@theme inline` bindet die wichtigsten Tokens an Tailwind an (`bg-surface`, `text-muted`,
`border-border`, `text-accent` …) und mappt `--font-sans`/`--font-mono` auf Geist Sans/Mono.

**Achtung:** `--radius-sm/-lg` und `--shadow-sm/-lg` überschreiben bewusst die gleichnamigen
Tailwind-Theme-Variablen. `rounded-lg` und `shadow-sm` in Feature-Komponenten nehmen dadurch die
Token-Werte an – gewollt, damit der Restyle auch dort wirkt, wo noch keine Primitives benutzt werden.

**Typo-Skala** (Utility-Klassen in `globals.css`, Body-Text ist 15 px / 1.5, Überschriften mit
leicht negativem Letter-Spacing): `.text-display` (Seitentitel, 26–32 px) · `.text-title`
(Abschnitte, 20 px) · `.text-body` (15 px) · `.text-caption` (12 px, gedämpft) · `.text-eyebrow`
(11 px Versalien in Akzent).

**Helfer-Klassen:** `.fr-app-bg` (dezenter Akzent-Verlauf für den Content-Bereich), `.fr-scroll`
(schmale Scrollbars in Panels), `.fr-fade-in`, `.fr-skeleton`, `.fr-spin`, `.fr-avatar`
(Fallback-Farbe mit `--avatar-hue`). `::selection`, Fokus-Outline und Scrollbars sind global gesetzt.

**Regeln für Tokens**

- Jede neue Farbvariable bekommt **beide** Werte: im `:root`-Block **und** im Dark-Block.
- Benennung nach Zweck (`--accent`, `--surface-2`), nicht nach Farbe (`--blue-500`).
- Text-/Flächen-Paare (`--x` + `--x-soft`) brauchen zusammen mindestens Kontrast 4.5:1.
- Bestehende Token-Namen nie umbenennen – Feature-Komponenten referenzieren sie direkt.

### 2.2 Ebene 2: UI-Primitives (`src/components/ui/index.tsx`)

Eine Datei, bewusst klein, reines Tailwind. Alle Seiten importieren nur von hier:
`import { Button, Card, Badge } from "@/components/ui"`. Die **Props sind Contract** – Namen und
Varianten dürfen sich nicht ändern, das Aussehen dahinter komplett. Optionale Props dürfen
hinzukommen. Live: `/styleguide`.

| Komponente | Props | Varianten / Verhalten |
|---|---|---|
| `cx(...parts)` | Strings, `false`, `null`, `undefined` | Klassen zusammenfügen, leere Werte filtern |
| `Button` | `<button>`-Attribute + `variant`, `size`, `loading?`, `className` | `variant`: `primary` (Akzent + Schatten) · `secondary` (Outline) · `ghost` · `outline` (Akzent-Rahmen) · `danger`; `size`: `sm` 36 px · `md` 40 px · `lg` 48 px; `loading` → Spinner + disabled + `aria-busy` |
| `LinkButton` | `href`, `variant?`, `size?`, `target?`, `className?`, `children` | Gleiche Optik wie `Button`, rendert `next/link` |
| `Card` | `title?`, `description?`, `action?`, `padding?`, `interactive?`, `className?`, `children` | `<section>` mit `--radius-lg` + `--shadow-sm`; Header nur bei `title`/`description`/`action`; `padding`: `none` · `sm` · `md` (Standard) · `lg`; `interactive` → Hover-Lift |
| `SectionTitle` | `children`, `action?`, `className?` | `<h2>` in `.text-title`, Aktion rechts |
| `Kicker` | `children` | Kleiner Versalien-Text in Akzent (`.text-eyebrow`) |
| `Divider` | `label?`, `className?` | Trennlinie, optional mit mittigem Label |
| `Badge` | `tone?`, `dot?`, `className?`, `children` | `tone`: `neutral` (Standard) · `accent` · `success` · `warning` · `danger`; Pille 11 px; `dot` → Statuspunkt in Textfarbe |
| `Chip` | `active?`, `onClick?`, `className?`, `children` | Filter-Chip 36 px, `aria-pressed`; aktiv = Akzent gefüllt |
| `Input` / `Textarea` / `Select` | native Attribute + `className` | 40 px, `--radius`, Fokus Rahmen `--accent` + Ring `--ring`, `disabled` gedämpft |
| `Label` | `htmlFor?`, `children` | `text-xs`, `--muted` |
| `Field` | `label`, `hint?`, `children` | `Label` + Feld + optionaler Hint |
| `PageHeader` | `title`, `subtitle?`, `action?`, `eyebrow?` (`kicker?` als Alias) | `<h1>` in `.text-display`, Eyebrow darüber, Untertitel `--muted`, Aktion rechts; `mb-8` |
| `EmptyState` | `title`, `body?`, `action?`, `icon?` | Gestrichelter Rahmen, zentriert, optionales Icon in Akzent-Kreis |
| `Avatar` | `src?`, `name`, `size?` (40), `className?` | Rund mit Ring; ohne `src` Initialen (max. 2) mit deterministischem Farbton aus dem Namen (`oklch(from …)`, Fallback `--accent-soft`) |
| `ScoreBar` | `value`, `max?` (100), `label?`, `tone?` | Balken 8 px mit Verlauf, Label links, Wert rechts (`/max` bei `max ≠ 100`), `role="progressbar"` |
| `ScoreRing` | `value`, `size?` (64), `label?`, `tone?`, `className?` | SVG-Kreis 0–100, Wert in der Mitte, Label darunter |
| `Stat` | `label`, `value`, `hint?`, `icon?`, `href?`, `className?` | KPI-Kachel; mit `href` klickbar mit Hover-Lift |
| `Skeleton` | `className?` | Shimmer-Platzhalter (Standard `h-4 w-full`) |

**Regeln für Primitives**

- Neue Bausteine kommen **in dieselbe Datei** und werden von dort exportiert. Icons als Inline-SVG
  (keine Icon-Library).
- Jeder interaktive Baustein hat `hover`, `active`, `focus-visible` (Ring in `--ring`) und `disabled`.
- Noch nicht vorhanden (beim Pivot einsammeln, falls Feature-Teams improvisiert haben): Tabs,
  Dialog/Drawer, Toast, Tabelle, Tooltip, Chat-Bubble, Mikrofon-Button (Voice).

### 2.3 Ebene 3: Layout & Navigation (`src/app/layout.tsx`, `src/components/layout/*`)

- `src/app/layout.tsx`: Root-Layout, lädt Geist Sans/Mono, setzt `<html lang="de">`,
  `color-scheme: light dark` und `theme-color` (Light/Dark) über `viewport`, rendert `AppShell`.
- `Sidebar.tsx`: Wortmarke mit `LogoMark` (Inline-SVG, Radar-Kreise), Navigation in drei Gruppen
  („Finden" · „Vorbereiten" · „Kontext") mit Inline-SVG-Icons (`NavIcon`), Active-State mit
  Akzent-Balken links + `--accent-soft`, `title`-Attribut statt Zweitzeile. Unten Statusblock +
  Link `/styleguide`. Exportiert `NAV_GROUPS` und `getPageTitle(pathname)`.
- `AppShell.tsx`: Desktop-Sidebar (`--sidebar-width`, ab `md:`), Mobile-Drawer (Burger, Escape,
  schließt bei Routenwechsel), Header mit `--header-height` (Seitentitel aus der Route, rechts
  Nutzer-Chip → `/onboarding` bzw. „Profil anlegen"), Content-Bereich mit `.fr-app-bg`,
  `<main>` in `max-w-7xl` mit 16 px (mobil) / 32 px (ab `md:`) Innenabstand.
- Seitentitel setzen die Seiten selbst über `PageHeader`; der Header zeigt zusätzlich den
  Navigations-Titel (kurz), damit man auf Mobile immer weiß, wo man ist.

---

## 3. Seiten-Inventar

Alle Routen liegen unter `src/app/`. Ordner mit `[id]`/`[slug]` sind dynamisch. Die Spalte „Paket"
verweist auf die Ownership-Tabelle in [PARALLEL-WORK.md](PARALLEL-WORK.md).

| Route | Zweck | Hauptkomponenten | Paket |
|---|---|---|---|
| `/` | Dashboard: Einstieg, Top-Matches, Team-Status, nächste Schritte (ohne Onboarding mit Demo-Kontext) | `src/app/page.tsx`, `src/components/dashboard/*` | dashboard |
| `/onboarding` | Formular: eigene Rolle, Vertical, Idee oder „offen für alles", Stärken, Selbsteinschätzung (5 Dimensionen), LinkedIn-URL → `UserContext` | `src/app/onboarding/page.tsx`, `src/components/onboarding/*` | onboarding |
| `/assistant` | Agent-Interview per Text **und** Voice; Live-Panel zeigt Kandidaten, die der Agent nennt | `src/app/assistant/page.tsx`, `src/components/assistant/ChatPanel.tsx`, `LiveCandidatePanel.tsx`, `VoiceAgent.tsx` | assistant-page, voice-agent |
| `/candidates` | Durchsuchbare Kandidatenliste mit Filtern (Rolle, Team-Rolle, Vertical, Event, Persönlichkeit) und Match-Score | `src/app/candidates/page.tsx`, `src/components/candidates/CandidateList.tsx`, `CandidateCard.tsx`, `CandidateFilters.tsx`, `ShortlistButton.tsx` | candidates-list, shortlist |
| `/candidates/[id]` | Profil-Detail: Foto, LinkedIn-Daten (Erfahrung, Ausbildung, Skills), Persönlichkeitstyp, Match-Begründung, Aktionen (Outreach, Prep, Shortlist) | `src/app/candidates/[id]/page.tsx`, `src/components/candidates/CandidateProfile.tsx`, `MatchBreakdown.tsx` | candidate-detail |
| `/outreach` | Personalisierte Nachrichtenentwürfe pro Kandidat (E-Mail / LinkedIn), angepasst an den Persönlichkeitstyp, mit Begründung | `src/app/outreach/page.tsx`, `src/components/outreach/*` | outreach-page |
| `/prep/[id]` | Gesprächsvorbereitung: wahrscheinliche Fragen, Talking Points, Eisbrecher, Red Flags; Voice-Simulation (Agent spielt die Person) | `src/app/prep/[id]/page.tsx`, `src/components/prep/*`, `VoiceAgent` (Modus `prep-simulation`) | prep-page |
| `/team` | Team-Radar über Vision · Design/Visuell · Technik · Detail · Umsetzung für mich + ausgewählte Kandidaten; Lücken, empfohlene Rollen, „VC-Tauglichkeit" | `src/app/team/page.tsx`, `src/components/team/*` | team |
| `/tips` | Tipps: „Was fehlt meinem Start-up? Welche Skills brauche ich?" nach Kategorie und Priorität | `src/app/tips/page.tsx` | tips |
| `/events` | Liste der Konferenzen/Meetups (Quelle der Kontakte) | `src/app/events/page.tsx`, `src/components/events/*` | events-pages |
| `/events/[slug]` | Event-Detail mit Teilnehmer:innen | `src/app/events/[slug]/page.tsx`, `src/components/events/*` | events-pages |
| `/shortlist` | Gemerkte Kandidaten (localStorage), Sprungbrett zu Outreach/Prep | `src/app/shortlist/page.tsx`, `ShortlistButton.tsx` | shortlist |
| `/network` | Netzwerk-Karte: Beziehungen/Cluster zwischen mir und Kandidaten | `src/app/network/page.tsx`, `src/components/network/*` | network-map |
| `/settings` | Systemstatus (API-Key konfiguriert? Anzahl Profile/Events), Demo-Kontext laden, Kontext zurücksetzen | `src/app/settings/page.tsx`, `src/app/api/health/route.ts` | settings |
| `/styleguide` | Alle Tokens und Primitives in allen Varianten – deine Referenzseite | `src/app/styleguide/page.tsx` | design-docs |

Wiederkehrende Muster, die du über alle Seiten hinweg gestalten solltest:

1. **Kandidaten-Card** (Liste, Shortlist, Dashboard, Live-Panel): Avatar, Name, Headline,
   Badges (Rolle, Vertical, Persönlichkeit), ScoreBar, eine Primäraktion.
2. **Score-Anzeige**: Match-Score 0–100, Komplementarität 0–100, Dimensionen 0–10. Aktuell alles
   `--accent`; Vorschlag: ab 70 `--success`, 40–69 `--accent`, darunter `--muted`.
3. **Generierte Inhalte** (Outreach, Prep, Tipps): Textblöcke mit Herkunfts-Badge
   (`generatedBy: "llm" | "template"`) – „KI" vs. „Vorlage" soll sichtbar, aber dezent sein.
4. **Agent-Panel**: Chat-Verlauf, Eingabe, Mikrofon-Zustand (aus / verbindet / hört zu / spricht),
   rechts daneben oder darunter das Live-Kandidaten-Panel.

---

## 4. Regeln (gelten für alle, auch nach dem Pivot)

1. **Farben nur über `var(--…)`.** Keine Tailwind-Palettenfarben (`bg-blue-500`), keine Hex-Werte
   in Komponenten. Muster: `bg-[var(--surface)]`, `text-[var(--muted)]`, `border-[var(--border)]`.
   Einzige Ausnahme im MVP: `text-white` auf gefüllten Buttons – bei Bedarf durch ein Token
   `--accent-foreground` ersetzen.
2. **UI-Texte Deutsch**, Code und Identifier Englisch. Anrede „du". Gendern mit Doppelpunkt
   (Gründer:innen, Nutzer:in). Fachbegriffe bleiben englisch, wenn das Ökosystem sie so benutzt
   (Co-Founder, Seed, Pitch, Match-Score).
3. **Mobile-first.** Basis-Styles gelten fürs Handy (375 px), Erweiterungen über `sm:` `md:` `lg:`.
   Seitenränder mindestens 16 px, kein horizontales Scrollen, Touch-Ziele mindestens 40 px hoch.
4. **Dark-Mode via `prefers-color-scheme`.** Kein Umschalter, keine `.dark`-Klasse im MVP. Jede
   Farbe muss in beiden Modi funktionieren, jedes neue Token braucht einen Dark-Wert.
5. **Kontrast & Fokus.** Text mindestens 4.5:1 (AA), großer Text 3:1. Jeder interaktive Baustein
   hat einen sichtbaren `focus-visible`-Zustand.
6. **Keine neuen Dependencies ohne Absprache.** `package.json` ist gemeinsam. Google-Fonts über
   `next/font/google` sind ohne neues Paket möglich. Icon-Bibliotheken (z. B. `lucide-react`)
   brauchen ein `npm install` → mit Marvin klären; Alternative: Inline-SVG in `index.tsx`.
7. **Ownership.** Während der Parallel-Phase nur eigene Dateien ändern
   ([PARALLEL-WORK.md](PARALLEL-WORK.md)). Kein `next build`/`next dev` in parallelen
   Agent-Worktrees – lokal bei dir ist `npm run dev` natürlich erlaubt.

---

## 5. Vorschlag für eine Design-Richtung (Optionen, keine Vorgabe)

Der MVP ist neutral-blau („Tailwind-Standard"). Drei Richtungen, die zum Zielbild passen – jede
ist ein reiner Token-Tausch in `globals.css` plus Feinschliff an den Primitives.

### 5.1 Farbwelt

**Option A – „Radar" (technisch, dunkel-affin).** Tiefes Petrol/Teal als Akzent, kühle Neutrals.
Passt zum Namen und zum Voice-Agent, wirkt präzise. Starker Dark-Mode-Auftritt für Abendsessions.

| Token | Light | Dark |
|---|---|---|
| `--background` | `#f4f6f8` | `#0a0f14` |
| `--surface` / `--surface-2` / `--surface-3` | `#ffffff` / `#eef2f5` / `#e2e8ee` | `#101820` / `#17222c` / `#1f2d3a` |
| `--foreground` / `--muted` | `#0f172a` / `#5b6b7c` | `#e6edf3` / `#94a3b8` |
| `--border` | `#dde3ea` | `#1f2d3a` |
| `--accent` / `--accent-soft` | `#0e7c86` / `#d5f0f2` | `#2dd4bf` / `#134e4a` |

**Option B – „Warm & Clean" (editorial, menschlich).** Warmes Off-White, Anthrazit statt Schwarz,
gebranntes Orange als Akzent. Betont das Menschliche (es geht um Beziehungen) und hebt sich von
üblichen SaaS-Dashboards ab. Vorsicht bei Orange auf Weiß – der angegebene Ton hält AA.

| Token | Light | Dark |
|---|---|---|
| `--background` | `#faf8f5` | `#141210` |
| `--surface` / `--surface-2` / `--surface-3` | `#ffffff` / `#f3efe9` / `#e9e3da` | `#1c1917` / `#292524` / `#3a3532` |
| `--foreground` / `--muted` | `#1c1917` / `#78716c` | `#f5f0ea` / `#a8a29e` |
| `--border` | `#e7e2db` | `#3a3532` |
| `--accent` / `--accent-soft` | `#c2410c` / `#ffedd5` | `#fb923c` / `#7c2d12` |

**Option C – „Indigo Focus" (konservativ, nah am MVP).** Neutrals bleiben, Akzent wechselt zu
Indigo, Status-Farben etwas gedämpfter. Geringstes Risiko, schnellster Weg zu „sieht fertig aus".

| Token | Light | Dark |
|---|---|---|
| `--accent` / `--accent-soft` | `#4f46e5` / `#e0e7ff` | `#818cf8` / `#312e81` |
| `--success` / `--success-soft` | `#047857` / `#d1fae5` | `#34d399` / `#064e3b` |
| Rest | wie MVP | wie MVP |

Status-Farben (`success`/`warning`/`danger`) in allen Optionen nur für Bedeutung einsetzen, nie
als Dekoration – sonst verlieren Match-Scores und Red Flags ihre Lesbarkeit.

### 5.2 Typografie

- **Option 1 – Geist behalten** (bereits geladen, null Aufwand). Titel `font-semibold` mit
  `tracking-tight`, Fließtext 14–16 px, Zahlen (Scores) in Geist Mono mit `tabular-nums`.
- **Option 2 – Display-Schrift für Titel** über `next/font/google` (kein neues Paket), z. B.
  *Bricolage Grotesque* oder *Instrument Sans* für `h1`/`h2`, Geist für alles andere. Gibt dem
  Dashboard Charakter, ohne die Lesbarkeit der Listen zu berühren. Als `--font-display` anlegen.
- **Option 3 – Inter** als sicherer Allrounder, falls Geist zu sehr nach „Vercel" aussieht.

Vorgeschlagene Skala (Tailwind-Klassen, live unter `/styleguide`): `text-xs` 12 px (Badges,
Hints) · `text-sm` 14 px (Standard-UI, Listen) · `text-base` 16 px (Fließtext, Chat) · `text-lg`
18 px (große Card-Titel) · `text-xl` 20 px (Abschnitts-Titel) · `text-2xl` 24 px (Seitentitel) ·
`text-3xl`/`text-4xl` (Dashboard-Kennzahlen).

### 5.3 Abstände, Radien, Tiefe

- **4-px-Raster.** Card-Innenabstand 16 px mobil, 20–24 px ab `md:`. Abstand zwischen Cards
  16/24 px. Seiten-Innenabstand 16 / 24 / 32 px (mobil / tablet / desktop).
- **Radien** als Token: `--radius-sm` 6 px (Badges, kleine Buttons), `--radius` 8–10 px (Buttons,
  Inputs), `--radius-lg` 12–16 px (Cards), `9999px` (Avatar, Pillen). Konsistenz schlägt Größe.
- **Tiefe über Rahmen, nicht Schatten.** „Clean" heißt hier: 1 px Rahmen in `--border`, Schatten
  höchstens `0 1px 2px rgb(0 0 0 / 0.04)`. Im Dark-Mode Flächen über `--surface-2/3` abstufen.
- **Dichte.** Kandidatenlisten dürfen dicht sein (viele Profile, schnelles Scannen), Detail- und
  Prep-Seiten luftiger (Lesen, Vorbereiten).

---

## 6. Checkliste für den Pivot

1. `git pull`, `npm install`, `npm run dev`, `/styleguide` öffnen – Light und Dark nebeneinander.
2. **Farbwelt festlegen** (Abschnitt 5.1) und die Tokens in `globals.css` tauschen – erst `:root`,
   dann der Dark-Block. `/styleguide` neu laden, Badges und Buttons auf Kontrast prüfen.
3. **Neue Tokens anlegen** (`--radius*`, `--ring`, `--accent-foreground`, ggf. `--font-display`)
   und in `index.tsx` die harten Werte (`rounded-md`, `text-white`) dadurch ersetzen.
4. **Primitives durchgehen** – in dieser Reihenfolge, weil sie am häufigsten vorkommen:
   `Card` → `Button`/`LinkButton` → `Badge` → `Avatar`/`ScoreBar` → Eingabefelder →
   `PageHeader`/`EmptyState`. Props nicht ändern, nur Klassen. Fokusring für Buttons ergänzen.
5. **Layout/Sidebar** gestalten (`src/components/layout/*`, `layout.tsx`): Wortmarke, aktiver
   Navigationspunkt, mobile Variante, `--sidebar-width` anpassen.
6. **Seiten-Durchlauf** entlang Abschnitt 3 in beiden Modi und bei 375 px: Wo improvisieren
   Feature-Komponenten eigene Styles (Hex-Werte, Palettenfarben, eigene Buttons)? → auf Primitives
   umstellen bzw. neue Primitives in `index.tsx` ergänzen. Suchen hilft:
   `grep -rn "bg-\(blue\|gray\|zinc\|slate\)-\|#[0-9a-fA-F]\{6\}" src/app src/components`
7. **Die vier Muster** aus Abschnitt 3 (Kandidaten-Card, Score, generierte Inhalte, Agent-Panel)
   gezielt gestalten – sie tragen den Großteil der Wahrnehmung.
8. **Prüfen:** `npx tsc --noEmit` und `npx eslint src/components/ui src/app` ohne neue Fehler;
   Tastatur-Durchlauf (Tab) über eine Seite; Kontrast-Check (DevTools → Elements → der Farbwähler
   zeigt das Kontrastverhältnis an).
9. Committen auf einem eigenen Branch (`design/<thema>`), Screenshots Light/Dark/Mobile in die PR.

---

## 7. Lokal starten und Dark/Light prüfen

```bash
git clone <repo> && cd HackathonIdeaLab
npm install
cp .env.example .env.local     # optional: OPENAI_API_KEY eintragen; ohne Key laufen Template-Fallbacks
npm run dev                    # http://localhost:3000
```

- Styleguide: `http://localhost:3000/styleguide`. Ohne API-Key funktioniert alles außer Voice und
  LLM-generierten Texten – fürs Design reicht das, die Fallbacks liefern realistische Inhalte.
- **Dark/Light umschalten**, ohne das Betriebssystem umzustellen:
  - Chrome/Edge: DevTools öffnen (F12) → `Ctrl/⌘ + Shift + P` → „Rendering" eingeben → im
    Rendering-Panel „Emulate CSS media feature prefers-color-scheme" auf `dark` / `light` setzen.
  - Firefox: Inspector → in der Regel-Ansicht oben die Sonne/Mond-Schaltflächen
    („Dark/Light color scheme simulation").
  - Safari: Web-Inspector → Elemente → Symbolleiste „Erscheinungsbild erzwingen".
- **Mobile prüfen:** DevTools → Geräte-Symbolleiste (`Ctrl/⌘ + Shift + M`), Breite 375 px
  (Smartphone) und 768 px (Tablet). Auf horizontales Scrollen und abgeschnittene Buttons achten.
- Wenn `next dev` läuft, schreibt Next.js einen Hinweisblock in `AGENTS.md` neu – das ist normal
  und muss nicht rückgängig gemacht werden.
- Hilfreiche Befehle: `npx tsc --noEmit` (Typen), `npx eslint src/components/ui` (Lint).
