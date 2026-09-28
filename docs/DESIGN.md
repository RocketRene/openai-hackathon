# Voya – Design-Handoff

Für Jolanda: Du übernimmst nach dem MVP das Design und sollst dafür niemanden fragen müssen.
Dieses Dokument sagt dir, **was** das Produkt sein soll, **wo** im Code Design entsteht und
**wie** du sicher pivotierst, ohne die Funktionen zu brechen.

Stand: 28.09.2026. Live-Referenz aller Bausteine: `http://localhost:3000/styleguide` (zweisprachig,
Umschalter oben rechts im Header). Technik-Hintergrund (Datenfluss, Agent, APIs):
[ARCHITECTURE.md](ARCHITECTURE.md). Ownership und Contracts: [PARALLEL-WORK.md](PARALLEL-WORK.md).

---

## 1. Zielbild: „cleanes Dashboard“

Aus dem Briefing (`transcriptMVP.txt`, ab 00:04:10):

> „allgemein vom Design her wird das ein cleanes Dashboard“
>
> „Machst du so fertig, dass eine Kollegin da selbstständig drauf am Design pivoten kann.“

Was das für dich bedeutet:

- **Dashboard-Charakter.** Sidebar-Navigation links (drei Gruppen: Finden · Ansprechen · Du),
  Inhalt in Cards, klare Hierarchie (Kicker → Seitentitel → Abschnitt → Card → Inhalt), wenig
  Dekoration, ein Akzent. Vorbild laut Briefing: LinkedIn-Suche, aber „pivotiert auf den Use Case
  Co-Founder“ – Rolle im Ökosystem, gesuchte Rolle, Vertical, Event, Match-Score und
  Persönlichkeitstyp stehen im Vordergrund, nicht Feeds und Likes.
- **Nutzungssituation.** Gründer:innen auf einer Konferenz, zwischen zwei Gesprächen, oft am Handy,
  bei Tageslicht. Abends am Laptop zur Vorbereitung. Daher: Mobile-first, große Touch-Ziele, hoher
  Kontrast, Dark-Mode.
- **Ton.** Professionell und warm. Es geht um Co-Founder- und Investoren-Kontakte – Vertrauen ist
  wichtiger als „Startup-bunt“. Aber schnell und direkt: eine Aktion pro Card, kein Rätselraten.
- **Der Agent ist Teil des UI.** Sagt jemand „guck dir mal den Max an“, erscheint Max’ Profil live
  neben dem Chat-/Voice-Panel. Live-Panel, Kandidaten-Cards und der Interview-Leitfaden
  (`prepare_interview`) sind die wichtigsten wiederkehrenden Elemente – hier lohnt sich die meiste
  Design-Zeit.
- **Zwei Sprachen.** Die App ist Deutsch/Englisch umschaltbar (Header-Toggle). Jeder Text, den du
  anfasst, hat ein DE/EN-Paar – siehe Regel 2 in Abschnitt 4.

Der MVP ist „vollständig, ruhig, Indigo“. Alles, was du siehst, funktioniert; alles, was du
änderst, soll weiter funktionieren.

---

## 2. Wo pivotieren – drei Ebenen

Fast das gesamte Erscheinungsbild liegt an **drei Stellen**. Die Seiten (`src/app/**/page.tsx`)
und Feature-Komponenten benutzen nur diese Bausteine. Für einen Restyle musst du die Seiten im
Idealfall gar nicht anfassen.

| Ebene | Datei(en) | Was du damit änderst |
|---|---|---|
| 1 Tokens | `src/app/globals.css` | Farben (Light + Dark), Radien, Schatten, Fokusring, Schrift, Sidebar – wirkt sofort überall |
| 2 Primitives | `src/components/ui/index.tsx` | Form, Abstände, Zustände aller Buttons, Cards, Badges, Chips, Stats, Inputs … |
| 3 Layout | `src/app/layout.tsx`, `src/components/layout/AppShell.tsx`, `Sidebar.tsx`, `src/lib/i18n.tsx` (LanguageToggle) | Sidebar, Header, Seitenraster, Sprachumschalter |

Diese Dateien sind **gemeinsame Dateien** ([PARALLEL-WORK.md](PARALLEL-WORK.md)). Solange die
parallelen Agenten noch bauen, laufen Änderungen daran über Marvin (Koordination). Nach dem
MVP-Merge gehören sie dir.

### 2.1 Ebene 1: Design-Tokens (`src/app/globals.css`)

Alle Werte sind CSS-Variablen auf `:root`. Der Dark-Mode überschreibt dieselben Variablen in
`@media (prefers-color-scheme: dark)`. Komponenten benutzen **ausschließlich** `var(--…)`, nie
Hex-Werte oder Tailwind-Palettenfarben.

**Farben**

| Variable | Bedeutung | Light | Dark | Wo sie wirkt |
|---|---|---|---|---|
| `--background` | Seitenhintergrund | `#f5f6f8` | `#0b0f19` | `body` |
| `--foreground` | Primärer Text | `#0f172a` | `#e5e7eb` | Text, Titel, Button secondary/ghost, Chip inaktiv |
| `--muted` | Sekundärtext | `#64748b` | `#94a3b8` | Untertitel, Labels, Hints, Badge neutral, Placeholder, Sidebar-Hints |
| `--surface` | Flächen erster Ebene | `#ffffff` | `#111827` | Card, Stat, Inputs, Header (85 % + blur), Chip inaktiv |
| `--surface-2` | Flächen zweiter Ebene | `#f1f3f7` | `#171f2e` | Hover (secondary/ghost/Chip/Nav), Badge neutral, Skeleton, Sidebar-Icons |
| `--surface-3` | Flächen dritter Ebene | `#e5e8ef` | `#232d40` | ScoreBar-Track, Skeleton-Schimmer, Scrollbar |
| `--border` | Rahmenlinien | `#e4e7ee` | `#232d40` | Card, Inputs, Chip, Header/Sidebar-Trenner, EmptyState (gestrichelt) |
| `--accent` | Markenfarbe, primäre Aktion | `#4f46e5` | `#818cf8` | Button primary, Chip aktiv, Kicker, Wortmarke, aktive Navigation (Text), ScoreBar, Fokus-Rahmen der Inputs |
| `--accent-strong` | Hover der Primäraktion | `#4338ca` | `#a5b4fc` | Button primary `:hover` |
| `--accent-soft` | Sanfte Akzentfläche | `#eef2ff` | `#1e1b4b` | Badge accent, Avatar-Fallback, aktive Navigation (Fläche), EmptyState-Icon, Outline-Hover, `::selection` |
| `--accent-contrast` | Text auf `--accent` | `#ffffff` | `#0b0f19` | Button primary, Chip aktiv, Wortmarke, LanguageToggle aktiv |
| `--success` / `--success-soft` | Positiv (Text / Fläche) | `#15803d` / `#dcfce7` | `#4ade80` / `#14532d` | Badge success, ScoreBar tone success, Voice „verbunden“ |
| `--warning` / `--warning-soft` | Hinweis (Text / Fläche) | `#b45309` / `#fef3c7` | `#fbbf24` / `#78350f` | Badge warning, Risiken, Voice „verbinde“ |
| `--danger` / `--danger-soft` | Fehler / destruktiv | `#b91c1c` / `#fee2e2` | `#f87171` / `#7f1d1d` | Button danger, Badge danger, Red Flags |
| `--sidebar-bg` | Hintergrund der Sidebar | `#ffffff` | `#0e131f` | AppShell (Desktop-Aside und mobiler Drawer) |

**Form, Tiefe, Layout**

| Variable | Wert (Light / Dark) | Wo sie wirkt |
|---|---|---|
| `--ring` | `rgba(79,70,229,.35)` / `rgba(129,140,248,.45)` | `focus-visible`-Ring aller Buttons, Chips, Links; `focus:ring` der Inputs |
| `--shadow-sm` | `0 1px 2px …` / `0 1px 2px rgba(0,0,0,.4)` | Card, Stat, Button primary/secondary, Inputs, Profil-Pill |
| `--shadow-md` | `0 8px 24px -12px …` / `0 12px 32px -16px …` | Stat mit `href` beim Hover, mobiler Sidebar-Drawer |
| `--radius` | `12px` | Card, Stat, EmptyState, Swatches |
| `--radius-sm` | `8px` | Button, LinkButton, Inputs, Skeleton, Navigationseinträge |
| `--sidebar-width` | `256px` | Breite der Desktop-Sidebar (`md:` und größer) |

**Tailwind-Anbindung** (`@theme inline`): `--color-background`/`--color-foreground` machen
`bg-background`/`text-foreground` verfügbar; `--font-sans` → `--font-geist-sans`, `--font-mono` →
`--font-geist-mono` (Geist, geladen in `layout.tsx` über `next/font/google`).

**Globale Hilfsklassen** (unterhalb der Tokens): `.fr-fade-in` (Einblenden 0,25 s), `.fr-scroll`
(schmale Scrollbar in Panels), `.fr-skeleton` (Shimmer, wird von `<Skeleton>` benutzt).

**Regeln für Tokens**

- Jede neue Farbvariable bekommt **beide** Werte: im `:root`-Block **und** im Dark-Block.
- Benennung nach Zweck (`--accent`, `--surface-2`), nicht nach Farbe (`--indigo-500`).
- Text-/Flächen-Paare (`--x` + `--x-soft`) brauchen zusammen mindestens Kontrast 4.5:1 – so
  funktionieren Badges in beiden Modi. `--accent` auf `--accent-contrast` ebenso.
- Tokens, die es noch nicht gibt und die du eventuell willst: `--font-display` (Titelschrift),
  `--radius-lg` (falls Cards runder werden sollen als Buttons), `--accent-muted` (dezentere
  Akzentlinien). Anlegen, in `index.tsx` verwenden, fertig.

### 2.2 Ebene 2: UI-Primitives (`src/components/ui/index.tsx`)

Eine Datei, bewusst klein, reines Tailwind. Alle Seiten importieren nur von hier:
`import { Button, Card, Badge } from "@/components/ui"`. Die **Props sind Contract** – Namen und
Varianten dürfen sich nicht ändern, das Aussehen dahinter komplett. Alle `title`/`label`-Props sind
`ReactNode`, damit `<T de en />` hineinpasst.

| Komponente | Props | Varianten / Verhalten |
|---|---|---|
| `cx(...parts)` | Strings, `false`, `null`, `undefined` | Klassen zusammenfügen, leere Werte filtern |
| `Button` | alle `<button>`-Attribute + `variant`, `size`, `className` | `variant`: `primary` (Standard) · `secondary` · `outline` · `ghost` · `danger`; `size`: `sm` (32 px) · `md` (40 px, Standard) · `lg` (48 px); `disabled` → 50 % Deckkraft; `focus-visible`-Ring `--ring` |
| `LinkButton` | `href`, `variant`, `size`, `className`, `target`, `children` | Gleiche Optik wie `Button`, rendert `next/link`; `target="_blank"` setzt `rel="noreferrer"` |
| `Card` | `title?`, `description?`, `action?`, `padding?`, `className`, `children` | `<section>` mit Rahmen, `--surface`, `--shadow-sm`, `--radius`; Header nur wenn `title`/`description`/`action`; `padding`: `none` · `sm` (12) · `md` (20, Standard) · `lg` (24) |
| `SectionTitle` | `children`, `action?`, `className` | `<h2>` `text-base font-semibold`, Aktion rechts; gliedert Seiten in Abschnitte (`mb-3`) |
| `Kicker` | `children` | Überzeile in `--accent`, `text-[11px] uppercase tracking-[0.12em]` |
| `Badge` | `tone?`, `className`, `children` | `tone`: `neutral` (Standard) · `accent` · `success` · `warning` · `danger`; Pille `text-[11px]`, Farben aus `--x`/`--x-soft` |
| `Chip` | `active?`, `onClick?`, `className`, `children` | Umschaltbarer Filter (`<button type="button">`, 32 px): aktiv `--accent`/`--accent-contrast`, inaktiv `--surface` + Rahmen, Hover `--surface-2` |
| `Input` / `Textarea` / `Select` | alle nativen Attribute + `className` | Volle Breite, `--surface`, Rahmen `--border`, Fokus: Rahmen `--accent` + Ring `--ring`; `Select` mit `<option>`-Kindern |
| `Label` | `htmlFor?`, `children` | `text-xs font-medium`, `--muted`, `mb-1.5` |
| `Field` | `label`, `hint?`, `children` | `Label` + Eingabefeld + optionaler Hint-Text |
| `PageHeader` | `title`, `subtitle?`, `action?`, `kicker?` | Optionaler `Kicker`, `<h1>` `text-2xl sm:text-3xl`, Untertitel `--muted`, Aktionen rechts (Flex-Wrap); `mb-8` |
| `EmptyState` | `title`, `body?`, `action?`, `icon?` | Gestrichelter Rahmen, zentriert; `icon` sitzt in einem Kreis `--accent-soft`/`--accent` |
| `Avatar` | `src?`, `name`, `size` (Standard 40), `className` | Mit `src`: rundes Bild mit Ring `--surface`; ohne: bis zu zwei Initialen auf `--accent-soft` |
| `ScoreBar` | `value`, `max` (100), `label?`, `tone?` | Balken 6 px, Track `--surface-3`, Füllung nach `tone`: `accent` (Standard) · `success` · `warning` · `danger`; mit `label` Zeile „Label … Wert“ |
| `Stat` | `label`, `value`, `hint?`, `href?`, `className` | KPI-Kachel: `value` `text-2xl`, `label`, `hint` `--muted`; mit `href` als `next/link`, Hover hebt Rahmen (`--accent`) und Schatten (`--shadow-md`) |
| `Skeleton` | `className?` | Ladeplatzhalter mit Shimmer (`.fr-skeleton`); Standard `h-4 w-full`, Form frei über `className` (`rounded-full` für Kreise) |

**Regeln für Primitives**

- Neue Bausteine kommen **in dieselbe Datei** und werden von dort exportiert.
- Zustände nicht vergessen: `hover`, `focus-visible` (Ring `--ring`), `disabled`, `aria-*`.
- Was Feature-Teams lokal improvisiert haben und beim Pivot in `index.tsx` einwandern sollte:
  `FilterChip` (OutreachWorkspace → `Chip`), `CheckChip`/`ToggleChip` (OnboardingForm),
  `LoadingSkeleton` (PrepWorkspace → `Skeleton`), KPI-Kacheln in `dashboard/StatsRow.tsx`
  (→ `Stat`), Status-Badges im `VoiceAgent`. Suchen: `grep -rn "function [A-Z][A-Za-z]*Chip\|Skeleton" src/components`.
- Noch nicht vorhanden, bei Bedarf ergänzen: Tabs, Dialog/Drawer, Toast, Tabelle
  (`ShortlistCompare` hat eine eigene), Tooltip, Chat-Bubble, Mikrofon-Button.

### 2.3 Ebene 3: Layout, Navigation, Sprache

- `src/app/layout.tsx` – Root-Layout: lädt Geist Sans/Mono, `<html lang="de">` (wird vom
  Sprachumschalter zur Laufzeit gesetzt), rendert `<AppShell>` um alle Seiten.
- `src/components/layout/AppShell.tsx` (`"use client"`):
  - **Sidebar** links, Desktop (`md:`) fest mit `--sidebar-width`, sticky, eigener Scroll
    (`.fr-scroll`); mobil als Drawer (`w-72`, Overlay `bg-black/40`), geöffnet über den ☰-Button.
  - **Header** `h-14`, `bg-[var(--surface)]/85` + `backdrop-blur`, `border-b`. Links: Menü-Button
    (mobil) und ein Claim, der auf `/assistant` wechselt. Rechts: `<LanguageToggle />`,
    „Agent starten“ (`LinkButton`, auf `/assistant` secondary), Profil-Pill (Avatar + Name +
    Rollen-Badge, Link auf `/onboarding`) oder „Profil anlegen“.
  - **Inhalt** `<main class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">`. Seiten rendern
    **kein eigenes `<main>`** und keinen Seitenabstand.
- `src/components/layout/Sidebar.tsx`: Wortmarke (Kachel „FR“ auf `--accent`, Name, Claim), drei
  Gruppen `Finden` / `Ansprechen` / `Du` mit Icon-Kachel, Label und Hint (DE/EN in den Daten),
  aktiver Eintrag `--accent-soft`/`--accent` + `aria-current="page"`; unten Datenstand-Box.
- `src/lib/i18n.tsx`: `LanguageToggle` (Pille mit DE/EN, `aria-pressed`), `useLocale`, `useT`,
  `<T de en />`, `pick`, `COMMON`. Der Toggle ist Teil des Headers – wenn du den Header neu baust,
  nimm ihn mit.
- Seitentitel setzen die Seiten selbst über `PageHeader` (gern mit `kicker` = Gruppenname der
  Sidebar). Das Layout rendert keine Überschrift.
- Sonderseiten: `src/app/loading.tsx` (Spinner), `error.tsx` und `not-found.tsx` (beide
  `EmptyState`).

---

## 3. Seiten-Inventar

Alle Routen liegen unter `src/app/`. Ordner mit `[id]`/`[slug]` sind dynamisch. „Paket“ verweist
auf die Ownership-Tabelle in [PARALLEL-WORK.md](PARALLEL-WORK.md).

| Route | Sidebar | Zweck | Hauptkomponenten | Paket |
|---|---|---|---|---|
| `/` | Finden · Dashboard | Einstieg: KPI-Kacheln, Top-Matches, nächste Schritte; ohne Onboarding mit Demo-Kontext | `page.tsx`, `dashboard/DashboardHome.tsx`, `StatsRow.tsx`, `TopMatches.tsx` | dashboard |
| `/assistant` | Finden · Agent | Interview per Text **und** Voice, Modus Interview/Frei; Live-Panel zeigt Kandidaten, die der Agent nennt; Interview-Leitfaden | `assistant/page.tsx`, `assistant/AssistantWorkspace.tsx`, `ChatPanel.tsx`, `LiveCandidatePanel.tsx`, `VoiceAgent.tsx` | assistant-page, voice-agent, voice-integration |
| `/candidates` | Finden · Kandidaten | Durchsuchbare Liste mit Filtern (Rolle, Team-Rolle, Vertical, Event, Persönlichkeit, Stage) und Match-Score | `candidates/page.tsx`, `candidates/CandidateList.tsx`, `CandidateCard.tsx`, `CandidateFilters.tsx`, `ShortlistButton.tsx` | candidates-list, shortlist |
| `/candidates/[id]` | – | Profil-Detail: Foto, LinkedIn-Daten, Persönlichkeitstyp, Match-Begründung, Aktionen (Outreach, Prep, Shortlist) | `candidates/[id]/page.tsx`, `CandidateProfile.tsx`, `MatchBreakdown.tsx` | candidate-detail |
| `/events`, `/events/[slug]` | Finden · Events | Konferenzen (Quelle der Kontakte) und Teilnehmer:innen | `events/*/page.tsx`, `events/EventCard.tsx`, `AttendeeStats.tsx` | events-pages |
| `/network` | Finden · Netzwerk | Das Ökosystem in Zahlen (Rollen, Verticals, Events als Balkenlisten) | `network/page.tsx`, `network/NetworkOverview.tsx`, `BarList.tsx` | network-map |
| `/shortlist` | Ansprechen · Shortlist | Gemerkte Kontakte (localStorage) mit Vergleichstabelle; Sprungbrett zu Outreach/Prep | `shortlist/page.tsx`, `candidates/ShortlistCompare.tsx`, `ShortlistButton.tsx` | shortlist |
| `/outreach` | Ansprechen · Outreach | Nachrichtenentwürfe (E-Mail/LinkedIn) pro Kandidat, angepasst an den Persönlichkeitstyp, Filter-Chips nach Rolle, Herkunfts-Badge | `outreach/page.tsx`, `outreach/OutreachWorkspace.tsx`, `OutreachDraftCard.tsx` | outreach-page |
| `/prep/[id]` | – | Gesprächsvorbereitung: wahrscheinliche Fragen, Talking Points, Eisbrecher, Red Flags; Voice-Simulation (Agent spielt die Person) | `prep/[id]/page.tsx`, `prep/PrepWorkspace.tsx`, `PrepPackView.tsx`, `SimulationPanel.tsx` | prep-page |
| `/team` | Ansprechen · Team-Radar | Radar über Vision · Design · Technik · Detail · Umsetzung für mich + ausgewählte Kandidaten; Lücken, empfohlene Rollen | `team/page.tsx`, `team/TeamBuilder.tsx`, `RadarChart.tsx` | team |
| `/tips` | Ansprechen · Tipps | „Was fehlt meinem Start-up?“ nach Kategorie und Priorität | `tips/page.tsx`, `tips/TipsPanel.tsx` | tips |
| `/onboarding` | Du · Mein Profil | Formular: Rolle, Vertical, Idee/„offen für alles“, Stärken, Selbsteinschätzung (Slider), LinkedIn-URL → `UserContext` | `onboarding/page.tsx`, `onboarding/OnboardingForm.tsx`, `DimsSliders.tsx` | onboarding |
| `/settings` | Du · Einstellungen | Systemstatus (Key, Modelle, Profile/Events, Quellen), Demo-Kontext laden, zurücksetzen | `settings/page.tsx`, `settings/SettingsPanel.tsx` | settings |
| `/styleguide` | – | Alle Tokens und Primitives in allen Varianten – deine Referenzseite | `styleguide/page.tsx` | design-docs |

Wiederkehrende Muster, die du über alle Seiten hinweg gestalten solltest:

1. **Kandidaten-Card** (Liste, Shortlist, Dashboard, Live-Panel): Avatar, Name, Headline, Badges
   (Rolle, Vertical, Persönlichkeit), ScoreBar, eine Primäraktion, Shortlist-Stern.
2. **Score-Anzeige**: Match-Score 0–100, Komplementarität 0–100, Dimensionen 0–10. `ScoreBar`
   hat dafür `tone`; Vorschlag: ab 70 `success`, 40–69 `accent`, darunter `warning`.
3. **Generierte Inhalte** (Outreach, Prep, Match-Erklärung, Tipps): Textblöcke mit Herkunfts-Badge
   (`generatedBy: "llm" | "template"` → „KI“ / „Vorlage“) – sichtbar, aber dezent.
4. **Agent-Panel**: Chat-Verlauf, Eingabe, Mikrofon-Zustand (getrennt / verbinde / hört zu /
   spricht als `Badge`), Tool-Aktivität („Profil wird geladen …“), rechts oder darunter das
   Live-Kandidaten-Panel und der Interview-Leitfaden (Markdown-Download).
5. **Filterzeile**: `Chip`s in einer Flex-Wrap-Zeile, „Alle“ zuerst, genau einer aktiv.
6. **KPI-Zeile**: `Stat`-Kacheln, 2 Spalten mobil, bis 6 auf `lg:`.

---

## 4. Regeln (gelten für alle, auch nach dem Pivot)

1. **Farben nur über `var(--…)`.** Keine Tailwind-Palettenfarben (`bg-blue-500`), keine Hex-Werte
   in Komponenten. Muster: `bg-[var(--surface)]`, `text-[var(--muted)]`, `border-[var(--border)]`.
   Text auf Akzentflächen: `--accent-contrast` (nicht `text-white`). Einzige Ausnahme: der
   Styleguide dokumentiert die Hex-Werte als Text.
2. **Zweisprachig DE/EN.** Jeder sichtbare Text hat ein Paar: in Server-Components
   `<T de="…" en="…" />`, in Client-Components ein lokales Wörterbuch (`const DICT: Dict = …`,
   `const t = useT(DICT)`), für String-Props `pick(locale, de, en)`. Gemeinsame Begriffe stehen in
   `COMMON` (`src/lib/i18n.tsx`). Anrede „du“, Gendern mit Doppelpunkt (Gründer:innen).
   Fachbegriffe bleiben englisch, wenn das Ökosystem sie so benutzt (Co-Founder, Seed, Match-Score).
   Code und Identifier Englisch.
3. **Mobile-first.** Basis-Styles fürs Handy (375 px), Erweiterungen über `sm:` `md:` `lg:`.
   Seitenränder kommen von der AppShell (16 / 24 / 32 px), kein horizontales Scrollen, Touch-Ziele
   mindestens 40 px hoch (`Button md`, `Chip` 32 px nur in Filterzeilen).
4. **Dark-Mode via `prefers-color-scheme`.** Kein Umschalter, keine `.dark`-Klasse. Jede Farbe muss
   in beiden Modi funktionieren, jedes neue Token braucht einen Dark-Wert.
5. **Kontrast & Fokus.** Text mindestens 4.5:1 (AA), großer Text 3:1. Jeder interaktive Baustein hat
   einen sichtbaren `focus-visible`-Zustand (Ring `--ring`).
6. **Keine neuen Dependencies ohne Absprache.** `package.json` ist gemeinsam. Google-Fonts über
   `next/font/google` sind ohne neues Paket möglich. Icons: Inline-SVG (siehe Styleguide,
   `StarIcon`/`SearchIcon`) oder Unicode-Symbole wie in der Sidebar; `lucide-react` o. Ä. nur nach
   Absprache mit Marvin.
7. **Ownership.** Während der Parallel-Phase nur eigene Dateien ändern
   ([PARALLEL-WORK.md](PARALLEL-WORK.md)). Kein `next build`/`next dev` in parallelen
   Agent-Worktrees – lokal bei dir ist `npm run dev` natürlich erlaubt.

---

## 5. Design-Richtung: Stand und Optionen

Der MVP ist bereits auf **„Indigo Focus“** (ruhige Neutrals, Indigo-Akzent, Rahmen statt
Schatten). Drei Wege von hier – jeder ist ein Token-Tausch in `globals.css` plus Feinschliff:

### 5.1 Farbwelt

**Beibehalten und schärfen (geringstes Risiko).** Akzent bleibt Indigo, du arbeitest an Dichte,
Typo und den vier Mustern aus Abschnitt 3. Schnellster Weg zu „sieht fertig aus“.

**Option „Radar“ (technisch, dunkel-affin).** Tiefes Petrol/Teal als Akzent, kühle Neutrals.
Starker Dark-Mode-Auftritt für Abendsessions.

| Token | Light | Dark |
|---|---|---|
| `--background` | `#f4f6f8` | `#0a0f14` |
| `--surface` / `--surface-2` / `--surface-3` | `#ffffff` / `#eef2f5` / `#e2e8ee` | `#101820` / `#17222c` / `#1f2d3a` |
| `--foreground` / `--muted` | `#0f172a` / `#5b6b7c` | `#e6edf3` / `#94a3b8` |
| `--border` | `#dde3ea` | `#1f2d3a` |
| `--accent` / `--accent-strong` / `--accent-soft` | `#0e7c86` / `#0b6570` / `#d5f0f2` | `#2dd4bf` / `#5eead4` / `#134e4a` |
| `--accent-contrast` | `#ffffff` | `#0a0f14` |

**Option „Warm & Clean“ (editorial, menschlich).** Warmes Off-White, Anthrazit statt Schwarz,
gebranntes Orange als Akzent – betont das Menschliche (es geht um Beziehungen). Der angegebene
Orange-Ton hält AA auf Weiß.

| Token | Light | Dark |
|---|---|---|
| `--background` | `#faf8f5` | `#141210` |
| `--surface` / `--surface-2` / `--surface-3` | `#ffffff` / `#f3efe9` / `#e9e3da` | `#1c1917` / `#292524` / `#3a3532` |
| `--foreground` / `--muted` | `#1c1917` / `#78716c` | `#f5f0ea` / `#a8a29e` |
| `--border` | `#e7e2db` | `#3a3532` |
| `--accent` / `--accent-strong` / `--accent-soft` | `#c2410c` / `#9a3412` / `#ffedd5` | `#fb923c` / `#fdba74` / `#7c2d12` |
| `--accent-contrast` | `#ffffff` | `#141210` |

Status-Farben (`success`/`warning`/`danger`) in allen Optionen nur für Bedeutung einsetzen, nie
als Dekoration – sonst verlieren Match-Scores und Red Flags ihre Lesbarkeit.

### 5.2 Typografie

- **Geist behalten** (bereits geladen, null Aufwand). Titel `font-semibold` + `tracking-tight`,
  Fließtext 14–16 px, Zahlen (Scores, Stat) in Geist Mono oder mit `tabular-nums`.
- **Display-Schrift für Titel** über `next/font/google` (kein neues Paket), z. B. *Bricolage
  Grotesque* oder *Instrument Sans* für `h1`/`h2`, Geist für alles andere. Als `--font-display`
  anlegen und in `PageHeader`/`SectionTitle` verwenden.
- Skala (live unter `/styleguide`): `text-[11px]` Badge/Kicker · `text-xs` 12 Labels/Chips ·
  `text-sm` 14 Standard-UI · `text-base` 16 Fließtext/SectionTitle · `text-lg` 18 · `text-xl` 20 ·
  `text-2xl` 24 Seitentitel mobil/Stat · `text-3xl` 30 Seitentitel Desktop.

### 5.3 Abstände, Radien, Tiefe

- **4-px-Raster.** Card-Innenabstand 12 / 20 / 24 px (`padding` sm/md/lg). Abstand zwischen Cards
  12–16 px (`gap-3`/`gap-4`), zwischen Abschnitten 32–56 px.
- **Radien als Token** – `--radius` 12 px (Cards) und `--radius-sm` 8 px (Buttons, Inputs);
  `rounded-full` für Avatar, Badge, Chip, Toggle. Konsistenz schlägt Größe.
- **Tiefe über Rahmen, nicht Schatten.** 1 px Rahmen in `--border`, `--shadow-sm` als Hauch,
  `--shadow-md` nur für Hover-Anhebung und Overlays. Im Dark-Mode Flächen über `--surface-2/3`
  abstufen.
- **Dichte.** Kandidatenlisten dürfen dicht sein (viele Profile, schnelles Scannen), Detail- und
  Prep-Seiten luftiger (Lesen, Vorbereiten).

---

## 6. Checkliste für den Pivot

1. `git pull`, `npm install`, `npm run dev`, `/styleguide` öffnen – Light und Dark nebeneinander,
   einmal auf EN umschalten (Header-Toggle), damit du beide Textlängen siehst.
2. **Farbwelt festlegen** (Abschnitt 5.1) und die Tokens in `globals.css` tauschen – erst `:root`,
   dann der Dark-Block. `/styleguide` neu laden, Badges, Chips und Buttons auf Kontrast prüfen.
3. **Form-Tokens** anpassen: `--radius`, `--radius-sm`, `--shadow-*`, `--ring`, ggf.
   `--font-display` anlegen und in `PageHeader`/`SectionTitle` verwenden.
4. **Primitives durchgehen** – in dieser Reihenfolge, weil sie am häufigsten vorkommen:
   `Card` → `Button`/`LinkButton` → `Badge`/`Chip` → `Avatar`/`ScoreBar`/`Stat` → Eingabefelder →
   `PageHeader`/`SectionTitle`/`Kicker` → `EmptyState`/`Skeleton`. Props nicht ändern, nur Klassen.
5. **Layout** gestalten: `AppShell.tsx` (Header, Drawer), `Sidebar.tsx` (Wortmarke, Gruppen,
   aktiver Eintrag, Datenstand-Box), `LanguageToggle` in `i18n.tsx`, `--sidebar-width`/`--sidebar-bg`.
6. **Seiten-Durchlauf** entlang Abschnitt 3 in beiden Modi, beiden Sprachen und bei 375 px. Wo
   improvisieren Feature-Komponenten eigene Styles oder eigene Chips/Skeletons? → auf Primitives
   umstellen bzw. neue Primitives in `index.tsx` ergänzen. Suchen hilft:
   `grep -rn "bg-\(blue\|gray\|zinc\|slate\|indigo\)-\|#[0-9a-fA-F]\{6\}\|text-white" src/app src/components`
7. **Die sechs Muster** aus Abschnitt 3 (Kandidaten-Card, Score, generierte Inhalte, Agent-Panel,
   Filterzeile, KPI-Zeile) gezielt gestalten – sie tragen den Großteil der Wahrnehmung.
8. **Prüfen:** `npx tsc --noEmit` und `npx eslint src/components/ui src/components/layout src/app`
   ohne neue Fehler; Tastatur-Durchlauf (Tab) über eine Seite; Kontrast-Check (DevTools →
   Elements → Farbwähler zeigt das Verhältnis).
9. Committen auf einem eigenen Branch (`design/<thema>`), Screenshots Light/Dark/Mobile/DE/EN in
   die PR.

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
- **Sprache umschalten:** Toggle „DE | EN“ oben rechts (gespeichert in `localStorage` unter
  `voya.locale`).
- **Dark/Light umschalten**, ohne das Betriebssystem umzustellen:
  - Chrome/Edge: DevTools (F12) → `Ctrl/⌘ + Shift + P` → „Rendering“ → „Emulate CSS media feature
    prefers-color-scheme“ auf `dark` / `light`.
  - Firefox: Inspector → Regel-Ansicht → Sonne/Mond („Dark/Light color scheme simulation“).
  - Safari: Web-Inspector → Elemente → „Erscheinungsbild erzwingen“.
- **Mobile prüfen:** DevTools → Geräte-Symbolleiste (`Ctrl/⌘ + Shift + M`), Breite 375 px und
  768 px. Auf horizontales Scrollen, abgeschnittene Buttons und den Drawer achten.
- Wenn `next dev` läuft, schreibt Next.js einen Hinweisblock in `AGENTS.md` neu – das ist normal.
- Hilfreiche Befehle: `npx tsc --noEmit` (Typen), `npx eslint src/components/ui` (Lint),
  `node scripts/smoke.mjs` (alle Seiten und APIs antworten?).
