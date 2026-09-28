# Voya – Co-Founder Studio

OpenAI Hackathon 2026 (IdeaLab! 2026, WHU Vallendar). Voya findet aus Konferenz- und
LinkedIn-Daten die richtigen Menschen für dein Start-up – Co-Founder, Investor:innen,
Mentor:innen, Talente – erzeugt persönlichkeitsangepassten Outreach und bereitet per Text- und
Voice-Agent (OpenAI Realtime) auf das Gespräch vor. Sagst du „guck dir mal den Max an“, erscheint
Max’ Profil live neben dem Gespräch.

Zwei Apps in einem Repo:

| | Ort | Stack | Start |
|---|---|---|---|
| **Voya** (Dashboard, Agent, Kandidaten, Outreach, Prep, Team-Radar) | Repo-Root, `src/` | Next.js 16, TypeScript, Tailwind v4, `@openai/agents` | `npm run dev` → http://localhost:3000 |
| **Voya Voice Studio** (Renés Sprach-Studio mit Profilkarte im Gespräch, Interview-Leitfaden, Cloudflare-Deployment) | `web/` | Vite + React, eigener Node-Server, Cloudflare Worker | siehe [web/README.md](web/README.md) → http://localhost:5173 · live: https://voya.ventosa.workers.dev |

## Features

- **Dashboard** – KPI-Kacheln über 569 echte IdeaLab-Profile, Top-Matches, nächste Schritte.
- **Agent** (`/assistant`) – Interview per Text oder Voice; der Agent fragt nach Rolle, Vertical,
  Idee und Stärken, schlägt Kandidaten vor und öffnet Profile live im Panel. Voice läuft über OpenAI
  Realtime (WebRTC, Ephemeral-Token). Ohne API-Key antwortet ein regelbasierter Interviewer.
- **Kandidaten** – durchsuchbare Liste mit Filtern (Rolle im Ökosystem, Team-Rolle, Vertical,
  Event, Persönlichkeitstyp, Phase) und erklärbarem Match-Score (deterministisch, ohne LLM).
- **Profil-Detail** – Foto, LinkedIn-Daten (Erfahrung, Ausbildung, Skills), Persönlichkeitstyp,
  Match-Begründung und Risiken, Aktionen: Outreach, Gespräch vorbereiten, Merken.
- **Outreach** – Nachrichtenentwürfe (E-Mail / LinkedIn), angepasst an den Persönlichkeitstyp,
  mit Herkunfts-Badge („KI“ oder „Vorlage“).
- **Prep** – „Was wird die Person wissen wollen?“, Talking Points, Eisbrecher, Red Flags; Voice-
  Simulation, in der der Agent die Person spielt. Interview-Leitfaden (30 Minuten, belegbar aus
  dem Profil) als Markdown.
- **Shortlist** mit Vergleichstabelle, **Team-Radar** (Vision · Design · Technik · Detail ·
  Umsetzung), **Tipps** („Was fehlt meinem Start-up?“), **Events**, **Netzwerk** in Zahlen.
- **Sprache DE/EN** – Umschalter im Header, Default Deutsch; Sidebar, Seiten und Agent folgen.
- **Design-System** – Tokens in `globals.css`, Primitives in `ui/index.tsx`, Referenz unter
  `/styleguide`.

Alles funktioniert **ohne** `OPENAI_API_KEY` mit Template-/Regel-Fallbacks (kein Voice, keine
LLM-Texte) – die Demo darf nie an einem fehlenden Key scheitern.

## Start

```bash
npm install
cp .env.example .env.local   # OPENAI_API_KEY eintragen (optional – ohne Key laufen Fallbacks)
npm run dev                  # http://localhost:3000
```

Weitere Befehle:

```bash
npm run typecheck            # tsc --noEmit
npm run lint                 # eslint
npm run import:idealab       # exports/all-enriched-profiles.json → src/data/profiles/imported.json
node scripts/smoke.mjs       # prüft alle Seiten und API-Routen gegen die laufende App
```

`.env.local`: `OPENAI_API_KEY` (Text-Agent, Voice, Generierung), optional `OPENAI_TEXT_MODEL`
(Standard `gpt-5-mini`) und `OPENAI_REALTIME_MODEL` (Standard `gpt-realtime`). Status unter
`/settings` bzw. `GET /api/health`.

## Sprache

Die Oberfläche ist Deutsch/Englisch (Toggle „DE | EN“ oben rechts, gespeichert in `localStorage`
unter `voya.locale`). Technik: `src/lib/i18n.tsx` – `useLocale`, `useT(dict)` mit lokalen
Wörterbüchern pro Seite, `<T de="…" en="…" />` für Server-Components, `COMMON` für gemeinsame
Begriffe. Der Agent bekommt die Sprache über `ChatRequest.locale` / `VoiceAgentProps.locale`.
Doku-Sprache ist Deutsch, Code und Identifier sind Englisch.

## Struktur

```
src/app/            Seiten (Dashboard, Agent, Kandidaten, Events, Netzwerk, Shortlist, Outreach,
                    Prep, Team-Radar, Tipps, Onboarding, Einstellungen, Styleguide) + globals.css
src/app/api/        Route-Handler: chat, realtime/session, outreach, prep, tips, personality,
                    match, match/rank, profiles, events, health
src/components/     ui/ (Primitives) · layout/ (AppShell, Sidebar) · assistant/ (Chat, Voice,
                    Live-Panel) · candidates/ dashboard/ outreach/ prep/ team/ tips/ events/ …
src/lib/            types.ts (Contract) · data.ts (Daten-Gateway) · user-context.ts · i18n.tsx ·
                    matching.ts · agent/ (Text-Agent) · interview-guide.ts · outreach/prep/tips/…
src/data/           Profile (Mock + imported.json aus exports/), Events, Attendees
scripts/            import-idealab.mjs, import-attendees.mjs, smoke.mjs
exports/            Rohdaten: IdeaLab-Export (569 Profile, LinkedIn-angereichert), CSV
web/                Voya Voice Studio (René) – eigenständig, eigene package.json
docs/               ARCHITECTURE.md, DESIGN.md, PARALLEL-WORK.md, DEMO.md, FEATURES.md,
                    transcript.md, idealab-client.md
```

## Dokumentation

- [AGENTS.md](AGENTS.md) – Leitfaden für alle Agenten und Menschen im Repo (Stack, Regeln, Rollen)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) – Datenfluss, Agent (Text/Voice), i18n, APIs, DB-Migration
- [docs/DESIGN.md](docs/DESIGN.md) – Design-Handoff für Jolanda: Tokens, Primitives, Layout, Pivot-Checkliste
- [docs/PARALLEL-WORK.md](docs/PARALLEL-WORK.md) – Pakete, Ownership, Contracts, I18N-Regel, Git-Workflow
- [docs/DEMO.md](docs/DEMO.md) – Demo-Drehbuch, [docs/FEATURES.md](docs/FEATURES.md) – Funktionsumfang
- [web/README.md](web/README.md) – Voice Studio: Start, Konfiguration, Cloudflare-Deployment
- [docs/idealab-client.md](docs/idealab-client.md) – API-Client und Export-Werkzeuge der IdeaLab-App

## Team

Marvin (Koordination, Backend/Agent) · René (Voice Studio, Web-App/Backend) · Jolanda (Design-Pivot
nach dem MVP).
