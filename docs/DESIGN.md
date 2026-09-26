# FounderRadar – Design-Handoff

Für Jolanda: Du übernimmst nach dem MVP das Design und sollst dafür niemanden fragen müssen.
Dieses Dokument sagt dir, **was** das Produkt sein soll, **wo** im Code Design entsteht und
**wie** du sicher pivotierst, ohne die Funktionen zu brechen.

Stand: 26.09.2026 (Hackathon-Tag). Live-Referenz aller Bausteine: `http://localhost:3000/styleguide`.
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
Hex-Werte oder Tailwind-Palettenfarben.

| Variable | Bedeutung | Light | Dark | Wo sie wirkt |
|---|---|---|---|---|
| `--background` | Seitenhintergrund | `#f6f7f9` | `#0b0f17` | `body` |
| `--foreground` | Primärer Text | `#111827` | `#e5e7eb` | `body`, Titel, Button secondary/ghost |
| `--muted` | Sekundärtext | `#6b7280` | `#9ca3af` | Untertitel, Labels, Hints, Badge neutral, Placeholder |
| `--surface` | Flächen erster Ebene | `#ffffff` | `#111827` | Card, Input, Textarea, Select |
| `--surface-2` | Flächen zweiter Ebene | `#f1f3f6` | `#1f2937` | Button secondary, Badge neutral, Ghost-Hover |
| `--surface-3` | Flächen dritter Ebene / Hover | `#e5e8ee` | `#273446` | Secondary-Hover, ScoreBar-Track |
| `--border` | Rahmenlinien | `#e2e5ea` | `#273446` | Card, Inputs, Badge neutral, EmptyState (gestrichelt) |
| `--accent` | Markenfarbe, primäre Aktion | `#2563eb` | `#3b82f6` | Button primary, Fokus-Rahmen, ScoreBar-Füllung, Badge accent (Text), Avatar-Initialen |
| `--accent-soft` | Sanfte Akzentfläche | `#dbeafe` | `#1e3a8a` | Badge accent (Fläche), Avatar-Fallback (Fläche) |
| `--success` / `--success-soft` | Positiv (Text / Fläche) | `#15803d` / `#dcfce7` | `#4ade80` / `#14532d` | Badge success, hohe Scores |
| `--warning` / `--warning-soft` | Hinweis (Text / Fläche) | `#b45309` / `#fef3c7` | `#fbbf24` / `#78350f` | Badge warning, Risiken |
| `--danger` / `--danger-soft` | Fehler / destruktiv (Text / Fläche) | `#b91c1c` / `#fee2e2` | `#f87171` / `#7f1d1d` | Button danger, Badge danger, Red Flags |
| `--sidebar-width` | Breite der Desktop-Sidebar | `240px` | – | Layout (`src/components/layout/*`) |

Zusätzlich im `@theme inline`-Block (Anbindung an Tailwind v4):

| Variable | Bedeutung |
|---|---|
| `--color-background`, `--color-foreground` | Machen `bg-background` / `text-foreground` als Tailwind-Klassen verfügbar |
| `--font-sans` → `--font-geist-sans` | Fließtext (Geist Sans, geladen in `layout.tsx` über `next/font/google`) |
| `--font-mono` → `--font-geist-mono` | Monospace (Geist Mono), z. B. für Zahlen und Code |

**Regeln für Tokens**

- Jede neue Farbvariable bekommt **beide** Werte: im `:root`-Block **und** im Dark-Block.
- Benennung nach Zweck (`--accent`, `--surface-2`), nicht nach Farbe (`--blue-500`). So kannst du
  die Farbwelt tauschen, ohne dass Namen lügen.
- Text-/Flächen-Paare (`--x` + `--x-soft`) brauchen zusammen mindestens Kontrast 4.5:1 – so
  funktionieren die Badges in beiden Modi.
- Tokens, die es noch **nicht** gibt und die du vermutlich brauchst: `--radius` (aktuell hart als
  `rounded-md`/`rounded-lg` in den Primitives), `--shadow`, `--ring` (Fokusring), `--accent-hover`,
  `--accent-foreground` (statt `text-white` auf gefüllten Buttons), `--font-display` für Titel.
  Lege sie an und ersetze die harten Werte in `index.tsx`.

### 2.2 Ebene 2: UI-Primitives (`src/components/ui/index.tsx`)

Eine Datei, bewusst klein, reines Tailwind. Alle Seiten importieren nur von hier:
`import { Button, Card, Badge } from "@/components/ui"`. Die **Props sind Contract** – Namen und
Varianten dürfen sich nicht ändern, das Aussehen dahinter komplett.

| Komponente | Props | Varianten / Verhalten |
|---|---|---|
| `cx(...parts)` | Strings, `false`, `null`, `undefined` | Hilfsfunktion: fügt Klassen zusammen, filtert leere Werte |
| `Button` | alle `<button>`-Attribute + `variant`, `size`, `className` | `variant`: `primary` (Standard) · `secondary` · `ghost` · `danger`; `size`: `sm` · `md` (Standard) · `lg`; `disabled` → 50 % Deckkraft |
| `LinkButton` | `href`, `variant`, `className`, `children` | Gleiche Optik wie `Button`, rendert `next/link`; nur Größe `md` |
| `Card` | `title?`, `action?`, `className`, `children` | `<section>` mit Rahmen + `--surface`; Header erscheint nur, wenn `title` oder `action` gesetzt |
| `Badge` | `tone`, `className`, `children` | `tone`: `neutral` (Standard) · `accent` · `success` · `warning` · `danger`; Pille, `text-xs` |
| `Input` | alle `<input>`-Attribute + `className` | Volle Breite, Rahmen `--border`, Fokus `--accent` |
| `Textarea` | alle `<textarea>`-Attribute + `className` | wie `Input` |
| `Select` | alle `<select>`-Attribute + `className`, `children` | wie `Input`; `<option>`s als Kinder |
| `Label` | `htmlFor?`, `children` | `text-xs`, `--muted`, Abstand unten |
| `Field` | `label`, `hint?`, `children` | Kombiniert `Label` + Eingabefeld + optionalen Hint-Text |
| `PageHeader` | `title`, `subtitle?`, `action?` | `<h1>` (2xl, semibold, tracking-tight), Untertitel `--muted`, Aktion rechts; bricht auf Mobile um |
| `EmptyState` | `title`, `body?`, `action?` | Gestrichelter Rahmen, zentriert, für leere Listen |
| `Avatar` | `src?`, `name`, `size` (Standard 40) | Mit `src`: rundes Bild; ohne: Initialen (max. 2) auf `--accent-soft` |
| `ScoreBar` | `value`, `max` (Standard 100), `label?` | Balken 8 px hoch, Track `--surface-3`, Füllung `--accent`; mit `label` erscheint die Zeile „Label … Wert" |

**Regeln für Primitives**

- Neue Bausteine kommen **in dieselbe Datei** und werden von dort exportiert.
- Zustände nicht vergessen: `hover`, `focus-visible`, `disabled`, `aria-*`. Aktuell haben nur die
  Eingabefelder einen Fokus-Stil (`focus:border-accent`); Buttons brauchen noch einen sichtbaren
  Fokusring für Tastatur-Nutzer:innen.
- Bausteine, die es noch nicht gibt und die Feature-Teams lokal improvisiert haben könnten
  (beim Pivot einsammeln und vereinheitlichen): Tabs, Dialog/Drawer, Toast, Skeleton/Loading,
  Tabelle, Tooltip, Radar-Chart (Team-Seite), Chat-Bubble, Mikrofon-Button (Voice).

### 2.3 Ebene 3: Layout & Navigation (`src/app/layout.tsx`, `src/components/layout/*`)

- `src/app/layout.tsx` ist das Root-Layout: lädt Geist Sans/Mono, setzt `<html lang>` und
  `<body class="min-h-full flex flex-col">`, rendert die App-Shell (Sidebar + Inhalt).
- `src/components/layout/` enthält die Shell-Bausteine (Sidebar, mobile Navigation/Topbar).
  Stand beim Schreiben dieses Dokuments war das Verzeichnis im Design-Worktree noch nicht
  vorhanden – es kommt mit dem Fundament-Merge; die Sidebar-Breite ist über `--sidebar-width`
  bereits als Token vorbereitet.
- Zielstruktur: Desktop (`lg:`) feste Sidebar links mit Wortmarke, Navigation (Seiten aus
  Abschnitt 3), unten Nutzer:in/Einstellungen; Inhalt rechts mit `max-w-6xl`, Innenabstand
  24–32 px. Mobile: Topbar mit Titel + Menü-Button oder Bottom-Navigation mit den vier wichtigsten
  Zielen (Start, Agent, Kandidaten, Team).
- Seitentitel setzen die Seiten selbst über `PageHeader`. Das Layout rendert keine Überschrift.

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
