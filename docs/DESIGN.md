# Voya – Design-Handoff

Für Jolanda: Du übernimmst nach dem MVP das Design und sollst dafür niemanden fragen müssen.
Dieses Dokument sagt dir, **was** das Produkt sein soll, **wo** im Code Design entsteht und
**wie** du sicher pivotierst, ohne die Funktionen zu brechen.

Stand: 28.09.2026 (Design-System-Paket gemergt: warme Neutrals, Indigo-Akzent, neue Primitives).
Live-Referenz aller Bausteine: `http://localhost:3000/styleguide` (zweisprachig, Umschalter oben
rechts im Header). Technik-Hintergrund (Datenfluss, Agent, APIs): [ARCHITECTURE.md](ARCHITECTURE.md).
Ownership und Contracts: [PARALLEL-WORK.md](PARALLEL-WORK.md).

---

## 1. Zielbild: „cleanes Dashboard“

Aus dem Briefing (`transcriptMVP.txt`, ab 00:04:10):

> „allgemein vom Design her wird das ein cleanes Dashboard“
>
> „Machst du so fertig, dass eine Kollegin da selbstständig drauf am Design pivoten kann.“

Was das für dich bedeutet:

- **Dashboard-Charakter.** Sidebar-Navigation links (drei Gruppen: Finden · Vorbereiten · Kontext),
  Inhalt in Cards, klare Hierarchie (Eyebrow → Seitentitel → Abschnitt → Card → Inhalt), wenig
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

Der Stand ist „vollständig, ruhig, warm, Indigo“. Alles, was du siehst, funktioniert; alles, was du
änderst, soll weiter funktionieren.

---

## 2. Wo pivotieren – drei Ebenen

Fast das gesamte Erscheinungsbild liegt an **drei Stellen**. Die Seiten (`src/app/**/page.tsx`)
und Feature-Komponenten benutzen nur diese Bausteine. Für einen Restyle musst du die Seiten im
Idealfall gar nicht anfassen.

| Ebene | Datei(en) | Was du damit änderst |
|---|---|---|
| 1 Tokens | `src/app/globals.css` | Farben (Light + Dark), Radien, Schatten, Fokusring, Typo-Skala, Sidebar/Header-Maße – wirkt sofort überall |
| 2 Primitives | `src/components/ui/index.tsx` | Form, Abstände, Zustände aller Buttons, Cards, Badges, Chips, Stats, Scores, Inputs … |
| 3 Layout | `src/app/layout.tsx`, `src/components/layout/AppShell.tsx`, `Sidebar.tsx`, `src/lib/i18n.tsx` (LanguageToggle) | Sidebar, Header, Seitenraster, Wortmarke, Icons, Sprachumschalter |

Diese Dateien sind **gemeinsame Dateien** ([PARALLEL-WORK.md](PARALLEL-WORK.md)). Solange die
parallelen Agenten noch bauen, laufen Änderungen daran über Marvin (Koordination). Nach dem
MVP-Merge gehören sie dir.

### 2.1 Ebene 1: Design-Tokens (`src/app/globals.css`)

Alle Werte sind CSS-Variablen auf `:root`. Der Dark-Mode überschreibt dieselben Variablen in
`@media (prefers-color-scheme: dark)`. Komponenten benutzen **ausschließlich** `var(--…)`, nie
Hex-Werte oder Tailwind-Palettenfarben. Richtung: warm getönte Neutrals statt Tailwind-Grau, ein
charakterstarker Akzent (tiefes Indigo), Tiefe über feine Rahmen und weiche Schatten.

**Farben**

| Variable | Bedeutung | Light | Dark | Wo sie wirkt |
|---|---|---|---|---|
| `--background` | Seitenhintergrund (warm) | `#f7f6f2` | `#131217` | `body`, `.fr-app-bg` |
| `--foreground` | Primärer Text | `#1b1a17` | `#ece9e2` | Text, Titel, Button secondary/ghost, Chip inaktiv |
| `--muted` | Sekundärtext | `#6d6860` | `#a09b92` | Untertitel, Labels, Hints, Caption, Badge neutral, Placeholder, Nav-Icons inaktiv |
| `--surface` | Flächen erster Ebene | `#ffffff` | `#1b1a20` | Card, Stat, Inputs, Header (80 % + blur), Avatar-Ring, Chip inaktiv |
| `--surface-2` | Flächen zweiter Ebene | `#f2f0ea` | `#232228` | Hover (secondary/ghost/Nav/Chip), Badge neutral, Skeleton, disabled Inputs |
| `--surface-3` | Pressed / Track | `#e6e2d9` | `#2e2d34` | Active-Zustände, ScoreBar-/ScoreRing-Track, Scrollbar, Hover-Rahmen |
| `--surface-elevated` | Schwebende Flächen | `#ffffff` | `#222127` | Popover, Drawer, Dialog (für spätere Bausteine) |
| `--border` | Rahmenlinien | `#e5e1d8` | `#2c2b32` | Card, Inputs, Chip, Divider, Sidebar-Rand, EmptyState (gestrichelt) |
| `--sidebar-bg` | Sidebar-Hintergrund | `#fcfbf8` | `#17161c` | Sidebar, Mobile-Drawer |
| `--accent` | Markenfarbe, primäre Aktion | `#4338ca` | `#a5b4fc` | Button primary, Links, Nav aktiv, Chip aktiv, Kicker/Eyebrow, Score-Füllung, LogoMark, Fokus-Outline |
| `--accent-strong` | Akzent Hover / Pressed | `#3730a3` | `#c7d2fe` | Button primary hover/active |
| `--accent-soft` | Sanfte Akzentfläche | `#e9e7fb` | `#2a2857` | Badge accent, Nav aktiv, Avatar-Fallback, Stat-Icon, EmptyState-Icon, Outline-Hover |
| `--accent-contrast` | Text auf Akzent | `#ffffff` | `#131217` | Button primary/danger, Chip aktiv, LanguageToggle aktiv, `::selection`, LogoMark |
| `--success` / `--success-soft` | Positiv (Text / Fläche) | `#1b7a47` / `#dcf3e4` | `#5ed394` / `#16402b` | Badge success, Score tone success, Voice „verbunden“ |
| `--warning` / `--warning-soft` | Hinweis (Text / Fläche) | `#a2570b` / `#fbeed3` | `#f2b95a` / `#4a3110` | Badge warning, Risiken, Voice „verbinde“ |
| `--danger` / `--danger-soft` | Fehler / destruktiv (Text / Fläche) | `#b73333` / `#fce3e0` | `#f28b8b` / `#4e2020` | Button danger, Badge danger, Red Flags |

**Fokus, Tiefe, Form, Layout**

| Variable | Wert (Light / Dark) | Wo sie wirkt |
|---|---|---|
| `--ring` | Akzent 40 % / Akzent 50 % | `focus-visible`-Ring aller Buttons, Chips, Links, Nav-Einträge; `focus:ring` der Inputs |
| `--shadow-sm` | 1–2 px, sehr weich / `0 1px 2px rgba(0,0,0,.35)` | Card, Stat, Button primary/secondary, Inputs, Avatar, Profil-Pill |
| `--shadow` | 8–20 px, weich (Dark fast unsichtbar) | Hover-Lift (Card `interactive`, Stat mit `href`, Button primary hover); `--shadow-md` ist Alias |
| `--shadow-lg` | 12–32 px | Mobile-Drawer, Popover |
| `--radius-sm` / `--radius` / `--radius-lg` | `8px` / `10px` / `14px` | Skeleton · Buttons, Inputs, Nav-Einträge, Stat-Icon · Cards, Stat, EmptyState |
| `--sidebar-width` | `264px` | Breite der Desktop-Sidebar (ab `md:`) |
| `--header-height` | `56px`, ab `md:` `64px` | Header der AppShell |

**Tailwind-Anbindung** (`@theme inline`): `bg-background`, `text-foreground`, `text-muted`,
`bg-surface`, `bg-surface-2/3`, `border-border`, `text-accent`, `bg-accent-soft` sind als Klassen
verfügbar; `--font-sans`/`--font-mono` → Geist Sans/Mono (geladen in `layout.tsx` über
`next/font/google`).

**Achtung:** `--radius-sm/-lg` und `--shadow-sm/-lg` überschreiben bewusst die gleichnamigen
Tailwind-Theme-Variablen. `rounded-lg` und `shadow-sm` in Feature-Komponenten nehmen dadurch die
Token-Werte an – gewollt, damit der Restyle auch dort wirkt, wo noch keine Primitives benutzt werden.

**Typo-Skala** (Utility-Klassen in `globals.css`; Body ist 15 px / 1.5, Überschriften mit leicht
negativem Letter-Spacing und `text-wrap: balance`): `.text-display` (Seitentitel, 26–32 px clamp) ·
`.text-title` (Abschnitte, 20 px) · `.text-body` (15 px) · `.text-caption` (12 px, gedämpft) ·
`.text-eyebrow` (11 px Versalien in Akzent). Zahlen (Scores, Stat) mit `tabular-nums`.

**Helfer-Klassen:** `.fr-app-bg` (dezenter Akzent-Verlauf für den Content-Bereich), `.fr-scroll`
(schmale Scrollbars in Panels), `.fr-fade-in`, `.fr-skeleton`, `.fr-spin` (Button `loading`),
`.fr-avatar` (Fallback-Farbe mit `--avatar-hue`). `::selection`, Fokus-Outline, Scrollbars und
`prefers-reduced-motion` sind global gesetzt.

**Regeln für Tokens**

- Jede neue Farbvariable bekommt **beide** Werte: im `:root`-Block **und** im Dark-Block.
- Benennung nach Zweck (`--accent`, `--surface-2`), nicht nach Farbe (`--indigo-500`).
- Text-/Flächen-Paare (`--x` + `--x-soft`) brauchen zusammen mindestens Kontrast 4.5:1; `--accent`
  auf `--accent-contrast` ebenso.
- Bestehende Token-Namen nie umbenennen – Feature-Komponenten referenzieren sie direkt.
- Noch nicht vorhanden, bei Bedarf anlegen: `--font-display` (Titelschrift für `.text-display`),
  `--accent-muted` (dezentere Akzentlinien).

### 2.2 Ebene 2: UI-Primitives (`src/components/ui/index.tsx`)

Eine Datei, bewusst klein, reines Tailwind. Alle Seiten importieren nur von hier:
`import { Button, Card, Badge } from "@/components/ui"`. Die **Props sind Contract** – Namen und
Varianten dürfen sich nicht ändern, das Aussehen dahinter komplett. Optionale Props dürfen
hinzukommen. Alle `title`/`label`-Props sind `ReactNode`, damit `<T de en />` hineinpasst.

| Komponente | Props | Varianten / Verhalten |
|---|---|---|
| `cx(...parts)` | Strings, `false`, `null`, `undefined` | Klassen zusammenfügen, leere Werte filtern |
| `Button` | `<button>`-Attribute + `variant`, `size`, `loading?`, `className` | `variant`: `primary` (Akzent + Schatten) · `secondary` (Outline neutral) · `outline` (Akzent-Rahmen) · `ghost` · `danger`; `size`: `sm` 36 px · `md` 40 px (Standard) · `lg` 48 px; `hover`/`active` (1 px nach unten), `focus-visible`-Ring; `disabled` → 50 %; `loading` → Spinner + disabled + `aria-busy` |
| `LinkButton` | `href`, `variant?`, `size?`, `target?`, `className?`, `children` | Gleiche Optik wie `Button`, rendert `next/link`; `target="_blank"` setzt `rel="noreferrer"` |
| `Card` | `title?`, `description?`, `action?`, `padding?`, `interactive?`, `className?`, `children` | `<section>` mit `--radius-lg` + `--shadow-sm`; Header nur bei `title`/`description`/`action`; `padding`: `none` · `sm` (12) · `md` (16/20, Standard) · `lg` (20/24); `interactive` → Hover-Lift mit `--shadow` |
| `SectionTitle` | `children`, `action?`, `className?` | `<h2>` in `.text-title`, Aktion rechts; gliedert Seiten in Abschnitte (`mb-3`) |
| `Kicker` | `children` | Kleiner Versalien-Text in Akzent (`.text-eyebrow`) |
| `Divider` | `label?`, `className?` | Trennlinie; mit `label` mittiger Text (`role="separator"`) |
| `Badge` | `tone?`, `dot?`, `className?`, `children` | `tone`: `neutral` (Standard) · `accent` · `success` · `warning` · `danger`; Pille 11 px; `dot` → Statuspunkt in Textfarbe |
| `Chip` | `active?`, `onClick?`, `className?`, `children` | Filter-Chip 36 px, `aria-pressed`; aktiv = Akzent gefüllt, inaktiv `--surface` + Rahmen, Hover `--surface-2` |
| `Input` / `Textarea` / `Select` | native Attribute + `className` | 40 px, `--radius`, `--surface`; Hover-Rahmen `--surface-3`; Fokus Rahmen `--accent` + Ring `--ring`; `disabled` gedämpft auf `--surface-2` |
| `Label` | `htmlFor?`, `children` | `text-xs font-medium`, `--muted`, `mb-1.5` |
| `Field` | `label`, `hint?`, `children` | `Label` + Feld + optionaler Hint |
| `PageHeader` | `title`, `subtitle?`, `action?`, `eyebrow?` (`kicker?` als Alias) | `<h1>` in `.text-display`, Eyebrow (`Kicker`) darüber, Untertitel `--muted`, Aktionen rechts (Flex-Wrap); `mb-8` |
| `EmptyState` | `title`, `body?`, `action?`, `icon?` | Gestrichelter Rahmen (`--radius-lg`), zentriert; `icon` in Kreis `--accent-soft`/`--accent` |
| `Avatar` | `src?`, `name`, `size?` (40), `className?` | Rund mit Ring `--surface` + `--shadow-sm`; ohne `src` Initialen (max. 2) mit deterministischem Farbton aus dem Namen (`oklch(from --accent-soft …)`, Fallback `--accent-soft`); `role="img"` |
| `ScoreBar` | `value`, `max?` (100), `label?`, `tone?` | Balken 8 px mit Verlauf, Track `--surface-3`, Label links, Wert rechts (`/max` bei `max ≠ 100`), `role="progressbar"`; `tone`: `accent` (Standard) · `success` · `warning` · `danger` |
| `ScoreRing` | `value`, `size?` (64), `label?`, `tone?`, `className?` | SVG-Kreis 0–100, Wert in der Mitte, Label darunter |
| `Stat` | `label`, `value`, `hint?`, `icon?`, `href?`, `className?` | KPI-Kachel (`--radius-lg`): `value` `text-2xl tabular-nums`, `icon` in Kachel `--accent-soft`; mit `href` als `next/link` mit Hover-Lift |
| `Skeleton` | `className?` | Shimmer-Platzhalter (`.fr-skeleton`, `aria-hidden`); Standard `h-4 w-full`, Form frei über `className` (`rounded-full` für Kreise) |

**Regeln für Primitives**

- Neue Bausteine kommen **in dieselbe Datei** und werden von dort exportiert. Icons als Inline-SVG
  (24er Raster, Stroke) – keine Icon-Library. Navigations-Icons liegen in `Sidebar.tsx` (`NavIcon`).
- Jeder interaktive Baustein hat `hover`, `active`, `focus-visible` (Ring in `--ring`) und `disabled`.
- Was Feature-Teams lokal improvisiert haben und beim Pivot in `index.tsx` einwandern sollte:
  `FilterChip` (OutreachWorkspace → `Chip`), `CheckChip`/`ToggleChip` (OnboardingForm),
  `LoadingSkeleton` (PrepWorkspace → `Skeleton`), KPI-Kacheln in `dashboard/StatsRow.tsx`
  (→ `Stat`), Status-Badges im `VoiceAgent` (→ `Badge dot`). Suchen:
  `grep -rn "function [A-Z][A-Za-z]*Chip\|Skeleton" src/components`.
- Noch nicht vorhanden, bei Bedarf ergänzen: Tabs, Dialog/Drawer (auf `--surface-elevated`), Toast,
  Tabelle (`ShortlistCompare` hat Karten-Spalten), Tooltip, Chat-Bubble, Mikrofon-Button.

### 2.3 Ebene 3: Layout, Navigation, Sprache

- `src/app/layout.tsx` – Root-Layout: lädt Geist Sans/Mono, `<html lang="de">` (wird vom
  Sprachumschalter zur Laufzeit gesetzt), `color-scheme: light dark` und `theme-color`
  (Light/Dark) über `viewport`, rendert `<AppShell>` um alle Seiten.
- `src/components/layout/Sidebar.tsx`: Wortmarke mit `LogoMark` (Inline-SVG, Radar-Kreise auf
  `--accent`), Navigation in drei Gruppen **Finden** (Dashboard, Agent, Kandidaten, Shortlist) ·
  **Vorbereiten** (Outreach, Team-Radar, Tipps) · **Kontext** (Events, Netzwerk, Mein Profil,
  Einstellungen) mit `NavIcon`, Labels DE/EN in den Daten (`label`/`labelEn`, `title`/`titleEn`),
  Active-State mit Akzent-Balken links + `--accent-soft` + `aria-current="page"`. Unten Statusblock
  („OpenAI Hackathon 2026 · IdeaLab-Daten“) mit Link `/styleguide`. Exportiert `NAV_GROUPS`,
  `getPageTitle(pathname, locale)`, `NavIcon`, `LogoMark`.
- `src/components/layout/AppShell.tsx` (`"use client"`):
  - **Sidebar** links, Desktop (`md:`) fest mit `--sidebar-width`, sticky, eigener Scroll
    (`.fr-scroll`); mobil als Drawer (`min(20rem, 85vw)`, Overlay mit Blur, `role="dialog"`,
    Schließen per ✕, Escape oder Routenwechsel).
  - **Header** `h-[var(--header-height)]`, `bg-[var(--surface)]/80` + `backdrop-blur-md`,
    `border-b`. Links: Burger (mobil), `LogoMark` (mobil), **Seitentitel aus der Route**
    (`getPageTitle`). Rechts: `<LanguageToggle />`, „Agent starten“ (`LinkButton` mit Mikrofon-Icon,
    außer auf `/assistant`, ab `sm:`), Profil-Pill (Avatar + Name + Rollen-Badge, Link auf
    `/onboarding`) oder „Profil anlegen“.
  - **Inhalt** auf `.fr-app-bg`: `<main class="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">`.
    Seiten rendern **kein eigenes `<main>`** und keinen Seitenabstand.
- `src/lib/i18n.tsx`: `LanguageToggle` (Pille mit DE/EN, `aria-pressed`), `useLocale`, `useT`,
  `<T de en />`, `pick`, `COMMON`. Der Toggle ist Teil des Headers – wenn du den Header neu baust,
  nimm ihn mit.
- Seitentitel setzen die Seiten selbst über `PageHeader` (gern mit `eyebrow` = Gruppenname der
  Sidebar); der Header zeigt zusätzlich den kurzen Navigations-Titel, damit man auf Mobile immer
  weiß, wo man ist.
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
| `/shortlist` | Finden · Shortlist | Gemerkte Kontakte (localStorage) als Karten-Spalten mit Score-Pill und Dimensionen; Sprungbrett zu Outreach/Prep | `shortlist/page.tsx`, `candidates/ShortlistCompare.tsx`, `ShortlistButton.tsx` | shortlist |
| `/outreach` | Vorbereiten · Outreach | Nachrichtenentwürfe (E-Mail/LinkedIn) pro Kandidat, angepasst an den Persönlichkeitstyp, Filter-Chips nach Rolle, Herkunfts-Badge | `outreach/page.tsx`, `outreach/OutreachWorkspace.tsx`, `OutreachDraftCard.tsx` | outreach-page |
| `/prep/[id]` | – (Header: „Gesprächsvorbereitung“) | Wahrscheinliche Fragen, Talking Points, Eisbrecher, Red Flags; Voice-Simulation (Agent spielt die Person) | `prep/[id]/page.tsx`, `prep/PrepWorkspace.tsx`, `PrepPackView.tsx`, `SimulationPanel.tsx` | prep-page |
| `/team` | Vorbereiten · Team-Radar | Radar über Vision · Design · Technik · Detail · Umsetzung für mich + ausgewählte Kandidaten; Lücken, empfohlene Rollen | `team/page.tsx`, `team/TeamBuilder.tsx`, `RadarChart.tsx` | team |
| `/tips` | Vorbereiten · Tipps | „Was fehlt meinem Start-up?“ nach Kategorie und Priorität | `tips/page.tsx`, `tips/TipsPanel.tsx` | tips |
| `/events`, `/events/[slug]` | Kontext · Events | Konferenzen (Quelle der Kontakte) mit Hero-Card, KPI-Reihe, Rollen-Chips; Teilnehmer:innen | `events/*/page.tsx`, `events/EventCard.tsx`, `AttendeeStats.tsx` | events-pages |
| `/network` | Kontext · Netzwerk | Das Ökosystem in Zahlen (Rollen, Verticals, Events als Balkenlisten) | `network/page.tsx`, `network/NetworkOverview.tsx`, `BarList.tsx` | network-map |
| `/onboarding` | Kontext · Mein Profil | Stepper-Formular: Rolle, Vertical, Idee/„offen für alles“, Stärken (Tag-Input), Selbsteinschätzung (Slider), LinkedIn-URL → `UserContext` | `onboarding/page.tsx`, `onboarding/OnboardingForm.tsx`, `DimsSliders.tsx` | onboarding |
| `/settings` | Kontext · Einstellungen | Systemstatus (Key, Modelle, Profile/Events, Quellen), Demo-Kontext laden, zurücksetzen | `settings/page.tsx`, `settings/SettingsPanel.tsx` | settings |
| `/styleguide` | – (Link im Sidebar-Fuß) | Alle Tokens und Primitives in allen Varianten – deine Referenzseite | `styleguide/page.tsx` | design-docs |

Wiederkehrende Muster, die du über alle Seiten hinweg gestalten solltest:

1. **Kandidaten-Card** (Liste, Shortlist, Dashboard, Live-Panel): Avatar, Name, Headline, Badges
   (Rolle, Vertical, Persönlichkeit), ScoreBar oder ScoreRing, eine Primäraktion, Shortlist-Stern.
2. **Score-Anzeige**: Match-Score 0–100 (`ScoreRing` als Pill/Kreis, `ScoreBar` in Listen),
   Komplementarität 0–100, Dimensionen 0–10 (`max=10`). Vorschlag für `tone`: ab 70 `success`,
   40–69 `accent`, darunter `warning`.
3. **Generierte Inhalte** (Outreach, Prep, Match-Erklärung, Tipps): Textblöcke mit Herkunfts-Badge
   (`generatedBy: "llm" | "template"` → „KI“ / „Vorlage“) – sichtbar, aber dezent.
4. **Agent-Panel**: Chat-Verlauf, Eingabe, Mikrofon-Zustand (getrennt / verbinde / hört zu /
   spricht als `Badge dot`), Tool-Aktivität („Profil wird geladen …“), rechts oder darunter das
   Live-Kandidaten-Panel und der Interview-Leitfaden (Markdown-Download).
5. **Filterzeile**: `Chip`s in einer Flex-Wrap-Zeile, „Alle“ zuerst, genau einer aktiv.
6. **KPI-Zeile**: `Stat`-Kacheln mit `icon`, 2 Spalten mobil, bis 6 auf `lg:`.

---

## 4. Regeln (gelten für alle, auch nach dem Pivot)

1. **Farben nur über `var(--…)`.** Keine Tailwind-Palettenfarben (`bg-blue-500`), keine Hex-Werte
   in Komponenten. Muster: `bg-[var(--surface)]`, `text-[var(--muted)]`, `border-[var(--border)]`
   oder die `@theme`-Klassen `bg-surface`, `text-muted`, `border-border`. Text auf Akzentflächen:
   `--accent-contrast` (nicht `text-white`). Einzige Ausnahme: der Styleguide dokumentiert die
   Hex-Werte als Text.
2. **Zweisprachig DE/EN.** Jeder sichtbare Text hat ein Paar: in Server-Components
   `<T de="…" en="…" />`, in Client-Components ein lokales Wörterbuch (`const DICT: Dict = …`,
   `const t = useT(DICT)`), für String-Props `pick(locale, de, en)`. Gemeinsame Begriffe stehen in
   `COMMON` (`src/lib/i18n.tsx`). Anrede „du“, Gendern mit Doppelpunkt (Gründer:innen).
   Fachbegriffe bleiben englisch, wenn das Ökosystem sie so benutzt (Co-Founder, Seed, Match-Score).
   Code und Identifier Englisch.
3. **Mobile-first.** Basis-Styles fürs Handy (375 px), Erweiterungen über `sm:` `md:` `lg:`.
   Seitenränder kommen von der AppShell (16 px mobil, 32 px ab `md:`), kein horizontales Scrollen,
   Touch-Ziele mindestens 40 px hoch (`Button md`, Nav-Einträge; `Chip` und `Button sm` 36 px nur
   in dichten Zeilen).
4. **Dark-Mode via `prefers-color-scheme`.** Kein Umschalter, keine `.dark`-Klasse. Jede Farbe muss
   in beiden Modi funktionieren, jedes neue Token braucht einen Dark-Wert.
5. **Kontrast & Fokus.** Text mindestens 4.5:1 (AA), großer Text 3:1. Jeder interaktive Baustein hat
   einen sichtbaren `focus-visible`-Zustand (Ring `--ring`; global zusätzlich Outline in `--accent`).
   Bewegung respektiert `prefers-reduced-motion`.
6. **Keine neuen Dependencies ohne Absprache.** `package.json` ist gemeinsam. Google-Fonts über
   `next/font/google` sind ohne neues Paket möglich. Icons: Inline-SVG (`NavIcon` in `Sidebar.tsx`,
   `StarIcon`/`SearchIcon` im Styleguide als Vorlage); `lucide-react` o. Ä. nur nach Absprache.
7. **Ownership.** Während der Parallel-Phase nur eigene Dateien ändern
   ([PARALLEL-WORK.md](PARALLEL-WORK.md)). Kein `next build`/`next dev` in parallelen
   Agent-Worktrees – lokal bei dir ist `npm run dev` natürlich erlaubt.

---

## 5. Design-Richtung: Stand und Optionen

Der Stand ist **„Warm & Indigo“**: warm getönte Neutrals (`#f7f6f2` statt Kaltgrau), tiefes Indigo
als einziger Akzent, Rahmen statt harter Schatten, weiche Hover-Lifts. Drei Wege von hier – jeder
ist ein Token-Tausch in `globals.css` plus Feinschliff:

### 5.1 Farbwelt

**Beibehalten und schärfen (geringstes Risiko).** Palette bleibt, du arbeitest an Dichte, Typo,
Wortmarke und den sechs Mustern aus Abschnitt 3. Schnellster Weg zu „sieht fertig aus“.

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

**Option „Editorial Orange“ (menschlich, auffällig).** Neutrals bleiben warm, der Akzent wechselt
zu gebranntem Orange – betont das Menschliche (es geht um Beziehungen), hebt sich von üblichen
SaaS-Dashboards ab. Der angegebene Ton hält AA auf Weiß.

| Token | Light | Dark |
|---|---|---|
| `--accent` / `--accent-strong` / `--accent-soft` | `#c2410c` / `#9a3412` / `#ffedd5` | `#fb923c` / `#fdba74` / `#7c2d12` |
| `--ring` | `rgba(194, 65, 12, .4)` | `rgba(251, 146, 60, .5)` |
| Rest | wie Stand | wie Stand |

Status-Farben (`success`/`warning`/`danger`) in allen Optionen nur für Bedeutung einsetzen, nie
als Dekoration – sonst verlieren Match-Scores und Red Flags ihre Lesbarkeit.

### 5.2 Typografie

- **Geist behalten** (bereits geladen, null Aufwand). Skala über die Utility-Klassen
  (`.text-display` … `.text-eyebrow`), Zahlen mit `tabular-nums`.
- **Display-Schrift für Titel** über `next/font/google` (kein neues Paket), z. B. *Bricolage
  Grotesque* oder *Instrument Sans*: als `--font-display` anlegen und nur in `.text-display` /
  `.text-title` verwenden – so bleibt die Lesbarkeit der Listen unberührt.
- Live unter `/styleguide`, Abschnitt „Typografie“.

### 5.3 Abstände, Radien, Tiefe

- **4-px-Raster.** Card-Innenabstand 12 / 16–20 / 20–24 px (`padding` sm/md/lg). Abstand zwischen
  Cards 12–16 px (`gap-3`/`gap-4`), zwischen Abschnitten 32–56 px.
- **Radien als Token** – `--radius-lg` 14 px (Cards, Stat), `--radius` 10 px (Buttons, Inputs,
  Nav), `--radius-sm` 8 px (Skeleton); `rounded-full` für Avatar, Badge, Chip, Toggle.
  Konsistenz schlägt Größe.
- **Tiefe über Rahmen, nicht Schatten.** 1 px Rahmen in `--border`, `--shadow-sm` als Hauch,
  `--shadow` nur für Hover-Anhebung, `--shadow-lg` für Overlays. Im Dark-Mode Flächen über
  `--surface-2/3` abstufen (Schatten sind dort fast unsichtbar).
- **Dichte.** Kandidatenlisten dürfen dicht sein (viele Profile, schnelles Scannen), Detail- und
  Prep-Seiten luftiger (Lesen, Vorbereiten).

---

## 6. Checkliste für den Pivot

1. `git pull`, `npm install`, `npm run dev`, `/styleguide` öffnen – Light und Dark nebeneinander,
   einmal auf EN umschalten (Header-Toggle), damit du beide Textlängen siehst.
2. **Farbwelt festlegen** (Abschnitt 5.1) und die Tokens in `globals.css` tauschen – erst `:root`,
   dann der Dark-Block. `/styleguide` neu laden, Badges, Chips, Buttons und Avatar-Fallbacks auf
   Kontrast prüfen.
3. **Form-Tokens** anpassen: `--radius*`, `--shadow*`, `--ring`, ggf. `--font-display` anlegen und in
   `.text-display`/`.text-title` verwenden.
4. **Primitives durchgehen** – in dieser Reihenfolge, weil sie am häufigsten vorkommen:
   `Card` → `Button`/`LinkButton` → `Badge`/`Chip` → `Avatar`/`ScoreBar`/`ScoreRing`/`Stat` →
   Eingabefelder → `PageHeader`/`SectionTitle`/`Kicker`/`Divider` → `EmptyState`/`Skeleton`.
   Props nicht ändern, nur Klassen.
5. **Layout** gestalten: `AppShell.tsx` (Header, Drawer), `Sidebar.tsx` (`LogoMark`, `NavIcon`,
   Gruppen, aktiver Eintrag, Statusblock), `LanguageToggle` in `i18n.tsx`,
   `--sidebar-width`/`--sidebar-bg`/`--header-height`.
6. **Seiten-Durchlauf** entlang Abschnitt 3 in beiden Modi, beiden Sprachen und bei 375 px. Wo
   improvisieren Feature-Komponenten eigene Styles oder eigene Chips/Skeletons? → auf Primitives
   umstellen bzw. neue Primitives in `index.tsx` ergänzen. Suchen hilft:
   `grep -rn "bg-\(blue\|gray\|zinc\|slate\|indigo\)-\|#[0-9a-fA-F]\{6\}\|text-white" src/app src/components`
7. **Die sechs Muster** aus Abschnitt 3 (Kandidaten-Card, Score, generierte Inhalte, Agent-Panel,
   Filterzeile, KPI-Zeile) gezielt gestalten – sie tragen den Großteil der Wahrnehmung.
8. **Prüfen:** `npx tsc --noEmit` und `npx eslint src/components/ui src/components/layout src/app`
   ohne neue Fehler; Tastatur-Durchlauf (Tab) über eine Seite; Kontrast-Check (DevTools →
   Elements → Farbwähler zeigt das Verhältnis); `prefers-reduced-motion` einmal aktivieren.
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

- Styleguide: `http://localhost:3000/styleguide` (auch über den Link im Sidebar-Fuß). Ohne API-Key
  funktioniert alles außer Voice und LLM-generierten Texten – fürs Design reicht das, die Fallbacks
  liefern realistische Inhalte.
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
