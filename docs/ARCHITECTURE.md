# FounderRadar – Architektur

Technischer Überblick für alle, die nach dem Hackathon weiterbauen (Design-Pivot, Backend-Ausbau,
Datenbank). Ergänzt [DESIGN.md](DESIGN.md) (Oberfläche) und [PARALLEL-WORK.md](PARALLEL-WORK.md)
(Dateien, Ownership, Contracts). Stand: 26.09.2026.

## 1. Überblick

Next.js 16 (App Router, alles unter `src/`), TypeScript, Tailwind v4. Genau **ein** LLM-Anbieter:
OpenAI – `@openai/agents` für den Text-Agenten, `@openai/agents-realtime` für Voice (kommt als
Abhängigkeit von `@openai/agents` mit, auch erreichbar als `@openai/agents/realtime`), das
`openai`-SDK für Textgenerierung, `zod` für Tool- und Antwort-Schemas.

Es gibt keinen eigenen Server außer den Next.js-Route-Handlern und keine Datenbank: Profile und
Events liegen als JSON im Repo, Nutzerdaten im Browser (localStorage). Ohne `OPENAI_API_KEY` läuft
alles mit regelbasierten Fallbacks – die Demo darf nie an einem fehlenden Key scheitern.

```
exports/all-enriched-profiles.json ──▶ scripts/import-idealab.mjs ──▶ src/data/profiles/imported.json ─┐
src/data/profiles/<mock>.json (6 Dateien) ──────────────────────────────────────────────────────────────┤
src/data/events.json ────────────────────────────────────────────────────────────────────────────────────┤
                                                                                                         ▼
                                                                                    src/lib/data.ts  (Gateway)
                                                                                      │                 │
                                     Server Components (Seiten) ◀─────────────────────┘                 └──▶ Route-Handler  src/app/api/**
                                              │                                                                    │
                                              ▼  HTML / RSC                                                        ▼  JSON
Browser ─────────────────────────────────────────────────────────────────────────────────────────── Client-Komponenten
   ├─ localStorage: UserContext (src/lib/user-context.ts), Shortlist (src/lib/shortlist.ts)
   └─ WebRTC ──▶ OpenAI Realtime  (Ephemeral-Token von /api/realtime/session)
```

## 2. Datenfluss: Export → Import → JSON → Gateway → Seiten/APIs

### 2.1 Quelle: `exports/`

- `exports/all-enriched-profiles.json` – Format `idealab-enriched-profiles-v1`. 569 Teilnehmer:innen
  der IdeaLab! 2026 (WHU Vallendar, 25./26.09.2026), exportiert aus der Event-App (Endpunkte in
  `idealab_api_doku.md`) und mit LinkedIn-Daten angereichert. Pro Eintrag ein `candidate`-Block
  (`display_name`, `role`, `company`, `job_title`, `university`, `bio`, `avatar_url`, `interests`,
  `match_score`, `startup_stage`, `startup_one_liner`) und ein `profile`-Block mit dem Detailprofil.
- `exports/sample-attendees.csv` – CSV-Teilnehmerliste als zweite Quelle (Paket attendee-import,
  Parser in `src/lib/attendees.ts`).

Die App liest **nie** direkt aus `exports/`. Der Ordner ist Rohmaterial für den Import.

### 2.2 Import: `scripts/import-idealab.mjs`

Node-Skript ohne Build-Abhängigkeit (`node scripts/import-idealab.mjs`). Es liest den Export,
normalisiert jeden Eintrag auf den Typ `Profile` (`src/lib/types.ts`) und schreibt
`src/data/profiles/imported.json`. Konvention für die Normalisierung:

- `id` = stabiler Slug (Name, bei Kollision mit Kürzel der Quell-UUID), `photoUrl` = `avatar_url`,
  `events = ["idealab-2026"]`, `source = { type: "conference" | "linkedin", scrapedAt, raw }`.
- `networkRole`, `founderRole`, `verticals`, `lookingFor` werden heuristisch aus `role`,
  `job_title`, `company`, `interests` abgeleitet – mit dem Vokabular aus PARALLEL-WORK.md
  (kleingeschrieben, damit Filter überall greifen).
- `dims` und `personality` bekommen plausible Startwerte; `/api/personality` verfeinert sie bei
  Bedarf zur Laufzeit.

Das Ergebnis wird committet. Details stehen im Kopfkommentar des Skripts.

### 2.3 Ablage: `src/data/`

- `src/data/profiles/*.json` – jeweils ein `Profile[]`. Nach Zielgruppe aufgeteilt, damit parallel
  daran gearbeitet werden kann: `cofounders-tech`, `cofounders-commercial`,
  `cofounders-product-design`, `investors`, `mentors-experts`, `talent` (Mock, Fotos über
  `https://i.pravatar.cc/200?u=<id>`) und `imported` (echte Daten).
- `src/data/events.json` – `Event[]` (`idealab-2026`, `bits-and-pretzels-2026`, `slush-2026` …).
  Profile referenzieren Events über `events: string[]` (Slugs).
- Mock- und echte Daten haben dieselbe Struktur. Die UI unterscheidet höchstens über `source.type`.

### 2.4 Gateway: `src/lib/data.ts`

Der einzige Datenzugang. Importiert alle JSON-Dateien statisch, führt sie zu `ALL_PROFILES`
zusammen und bietet synchrone Funktionen (Contract):

| Funktion | Zweck |
|---|---|
| `getProfiles()` | alle Profile |
| `getProfile(id)` | ein Profil oder `undefined` |
| `findProfileByName(name)` | Teilstring-Suche in Name oder Slug – für „guck dir mal den Max an" |
| `searchProfiles(filters)` | UND-Verknüpfung aller `ProfileFilters` + Volltext über Name, Headline, Ort, About, Skills, Verticals, lookingFor, Erfahrung, Tags |
| `getEvents()`, `getEvent(slug)` | Events |
| `getProfilesForEvent(slug)` | Teilnehmer:innen eines Events |
| `getVerticals()` | alle vorkommenden Verticals, sortiert (für Filter-Dropdowns) |

Regeln:

- Seiten und Komponenten importieren **nie** JSON direkt – nur das Gateway. Nur so lässt sich der
  Speicher später tauschen (Abschnitt 11).
- Das Gateway läuft server- und clientseitig. Aber: Wer es in einer `"use client"`-Datei
  importiert, bündelt alle Profile ins Browser-Bundle. Bei 569 echten Profilen inklusive `raw`
  ist das spürbar. Daher: Listen in Server Components laden oder über `/api/profiles` holen und
  Client-Komponenten die Daten als Props geben.

### 2.5 Konsumenten

- **Server Components** (`page.tsx` ohne `"use client"`) rufen das Gateway direkt und rendern HTML.
  Dynamische Routen erhalten `params` als Promise: `const { id } = await params`.
- **Route-Handler** (`src/app/api/**/route.ts`) rufen das Gateway serverseitig und liefern JSON:
  `GET /api/profiles?query=&networkRole=&founderRole=&vertical=&event=&personality=`,
  `GET /api/profiles/[id]`, `GET /api/events`, `GET /api/health`.
- **Client-Komponenten** bekommen Daten als Props oder laden sie per `fetch` von den APIs.

## 3. Nutzer-Kontext (Browser, `src/lib/user-context.ts`)

Kein Login im MVP. Der `UserContext` (Rolle, Verticals, Idee, Stärken, Selbsteinschätzung der fünf
Dimensionen, Interview-Notizen) liegt im `localStorage` unter `founderradar.userContext.v1`.

- **Zugriff nur über das Modul:** Hook `useUserContext()` liefert
  `{ userContext, ready, update(patch), replace(ctx), loadDemo(), clear() }`. Außerhalb von
  Komponenten: `loadUserContext()`, `saveUserContext()`, `patchUserContext(patch)`,
  `clearUserContext()`.
- `ready` ist `false`, bis localStorage gelesen wurde (Hydration). Komponenten rendern
  kontextabhängige Inhalte erst danach – sonst flackert Server-HTML gegen Client-Zustand.
- Änderungen feuern das Fenster-Event `founderradar:usercontext-changed`; der Hook hört zusätzlich
  auf `storage` (mehrere Tabs). Alle Komponenten sehen Änderungen sofort.
- `DEMO_USER_CONTEXT` („Marvin", Tech-Founder, sucht Commercial-Co-Founder und Investoren) macht das
  Dashboard ohne Onboarding sofort vorzeigbar. `DEFAULT_USER_CONTEXT` ist der Leerzustand.
- **Schreiber:** Onboarding-Formular, Agent (UI-Aktion `update_user_context` bzw.
  `userContextPatch` in der Chat-Antwort), Settings (Demo laden / zurücksetzen).
- **Der Server ist zustandslos.** Jede API, die den Kontext braucht, bekommt ihn im Request-Body
  mitgeschickt (`userContext`). Es gibt keine Session.

## 4. Matching (`src/lib/matching.ts`)

Deterministisch, ohne LLM, erklärbar – funktioniert ohne Key und liefert Begründungen fürs UI.

- `scoreMatch(user: UserContext, profile: Profile): MatchResult`
- `rankCandidates(user, profiles): MatchResult[]` – sortiert nach Score absteigend.

| Baustein | Gewicht | Bedingung |
|---|---|---|
| Gesuchte Rolle | +25 | `profile.networkRole` ∈ `user.lookingFor`; sonst Risiko-Hinweis |
| Fehlende Team-Rolle | +25 / −10 | `profile.founderRole` ∈ `user.lookingForRoles`; gleiche Rolle wie die Nutzer:in bei Co-Foundern: −10 + Risiko |
| Gleiches Vertical | +10 je Treffer, max. +20 | Schnittmenge `verticals`; ohne Treffer, aber `openToIdeas`: +5 |
| Komplementäre Stärken | 0 … +20 | `complementarity(user.dims, profile.dims)` × 0,2; ab 50 % als Begründung gelistet |
| Sucht jemanden wie dich | +10 | `profile.lookingFor` enthält Stichwörter zur eigenen `founderRole` (z. B. „technical", „cto") |
| Gleiche Phase | +5 | `stage` identisch |

Der Score wird auf 0–100 begrenzt. `reasons` (Label, Detail, Gewicht) sind nach Gewicht sortiert,
`risks` sind Klartext-Warnungen, `complementarity` (0–100) misst, wie stark das Profil die
Dimensionen auffüllt, in denen die Nutzer:in unter 10 liegt. Das UI (`MatchBreakdown`,
`CandidateCard`) zeigt Begründungen und Risiken direkt an. `POST /api/match` liefert zusätzlich eine
`explanation` (LLM oder Template).

## 5. Agent

Beide Agent-Pfade – Text und Voice – erzeugen dieselben `UiAction`s (`src/lib/types.ts`), das
Frontend hat genau einen Handler dafür.

### 5.1 Text: `POST /api/chat` (Paket agent-core, `src/lib/agent/*`)

- Request `ChatRequest { messages, userContext, mode, candidateId? }`, Antwort
  `ChatResponse { reply, uiActions, userContextPatch? }`.
- Implementiert mit `@openai/agents` (`Agent`, `run`, `tool` + zod-Schemas). Modell aus
  `OPENAI_TEXT_MODEL`.
- Modi (`AgentMode`): `interview` (fragt nach Rolle, Vertical, Idee, Stärken, bis genug Kontext da
  ist, dann Kandidatenvorschläge), `prep-simulation` (der Agent spielt die Person `candidateId` und
  stellt deren Fragen), `general`.
- Tools: lesend `search_profiles`/`find_profile_by_name` (über das Gateway), wirkend
  `show_candidate`, `show_candidates`, `navigate`, `update_user_context`. Wirkende Tools erzeugen
  keine Seiteneffekte auf dem Server, sondern sammeln `UiAction`s, die der Handler in
  `uiActions` zurückgibt.
- Frontend (`ChatPanel`): `show_candidate` → `LiveCandidatePanel` lädt und zeigt das Profil;
  `show_candidates` → Liste; `navigate` → `router.push(href)`; `update_user_context` →
  `patchUserContext(patch)`.
- Ohne Key: regelbasiertes Interview (feste Fragenfolge, Schlüsselwort-Erkennung) und Namenssuche
  für „guck dir mal X an" – die Demo-Kernszene funktioniert auch offline.

### 5.2 Voice: `POST /api/realtime/session` + `src/components/assistant/VoiceAgent.tsx`

```
Browser (VoiceAgent)                      Next.js (Server)                        OpenAI
   │  POST /api/realtime/session               │                                     │
   │  { mode, candidateId? }  ───────────────▶ │  OPENAI_API_KEY, Instructions je   │
   │                                           │  Modus/Kandidat ──────────────────▶ │  Ephemeral Client Secret
   │  ◀── { value, expiresAt, model } ──────── │  ◀──────────────────────────────── │
   │                                           │                                     │
   │  RealtimeSession.connect({ apiKey: value })  – WebRTC, Audio direkt ──────────▶ │
   │  ◀────────────────────────────────────────── Audio + Tool-Calls + Transkript ── │
   │  Tool-Call → onUiAction(action) → gleiche Handler wie im Text-Pfad
```

1. Der Server erzeugt mit dem echten API-Key ein kurzlebiges Client-Secret für das Realtime-Modell
   (`OPENAI_REALTIME_MODEL`, Standard `gpt-realtime`) und gibt `{ value, expiresAt, model }` zurück.
   Ohne Key: `503 { error }`.
2. `VoiceAgent` (Client, `"use client"`) baut mit `RealtimeAgent`/`RealtimeSession` aus
   `@openai/agents-realtime` eine WebRTC-Verbindung mit diesem Secret auf. Audio läuft direkt
   zwischen Browser und OpenAI – nie über unseren Server.
3. Tools sind clientseitig definiert (gleiche Namen wie im Text-Pfad) und rufen
   `props.onUiAction(action)`. Das Transkript kommt über `props.onTranscript(items)`.
4. Contract: default export, Props `VoiceAgentProps { mode, userContext, candidate?, onUiAction,
   onTranscript?, className? }`. Bis das Paket voice-agent gemergt ist, steckt ein Platzhalter mit
   identischer Signatur in der Datei.

Der API-Key bleibt serverseitig; das Client-Secret ist zeitlich begrenzt und an die Session
gebunden.

### 5.3 `UiAction` – die Brücke zwischen Agent und Oberfläche

| Aktion | Wirkung im Frontend |
|---|---|
| `{ type: "show_candidate", profileId }` | Profil im Live-Panel anzeigen (Foto, LinkedIn-Daten, Match) |
| `{ type: "show_candidates", profileIds }` | Mehrere Kandidaten als Liste anzeigen |
| `{ type: "navigate", href }` | Route wechseln, z. B. zu `/prep/<id>` |
| `{ type: "update_user_context", patch }` | Teile des `UserContext` speichern |

## 6. Generierende APIs: LLM-Pfad mit Template-Fallback

Alle POST, JSON rein, JSON raus. Jede Route folgt demselben Muster:

1. Body prüfen (zod), Profil über das Gateway laden (404, wenn unbekannt).
2. Ist `OPENAI_API_KEY` gesetzt → `openai`-SDK mit Structured Output (zod-Schema des Zieltyps),
   Prompt nutzt `Personality.communicationStyle`, `outreachTips`, `avoid` und den `UserContext`.
   Ergebnis `generatedBy: "llm"`.
3. Kein Key, Timeout oder Fehler → Template aus Profil + Persönlichkeitstyp + Match-Gründen,
   `generatedBy: "template"`. Nie ein 500 wegen fehlendem Key.

| Route | Body | Antwort |
|---|---|---|
| `/api/outreach` | `{ profileId, userContext, channel: "email" \| "linkedin" }` | `OutreachDraft` (Betreff, Text, `personalityNotes`) |
| `/api/prep` | `{ profileId, userContext }` | `PrepPack` (wahrscheinliche Fragen mit Antwort-Skizze, Talking Points, Eisbrecher, Red Flags) |
| `/api/tips` | `{ userContext, teamMemberIds? }` | `Tip[]` (Kategorie team/skills/fundraising/product/network, Priorität 1–3) |
| `/api/personality` | `{ profileId }` | `Personality` (Typ visionary/builder/operator/connector/analyst, Kommunikationsstil, Do's/Don'ts) |
| `/api/match` | `{ profileId, userContext }` | `MatchResult & { explanation }` |

Das UI zeigt `generatedBy` als dezentes Badge („KI" / „Vorlage"), damit in der Demo klar ist, was
gerade läuft.

## 7. Weitere Client-Zustände und Berechnungen

- **Shortlist** (`src/lib/shortlist.ts`): localStorage-Key `founderradar.shortlist.v1`, Wert
  `string[]` (Profil-IDs). `ShortlistButton` schreibt, `/shortlist` liest.
- **Team-Radar** (`src/lib/team.ts`): berechnet `TeamAnalysis` (kombinierte Dimensionen, Lücken mit
  Rat, Stärken, `successScore`, empfohlene Rollen) aus `TeamMember[]` = Nutzer:in + ausgewählte
  Kandidaten. Rein clientseitig, synchron.
- **Attendees** (`src/lib/attendees.ts`): CSV-Teilnehmerlisten anderer Events einlesen.

## 8. Verzeichnisstruktur

```
src/
  app/
    layout.tsx                 Root-Layout: Fonts, App-Shell (Sidebar + Inhalt)
    globals.css                Design-Tokens (Light/Dark), Tailwind
    page.tsx                   / Dashboard
    onboarding/ assistant/ candidates/ candidates/[id]/ outreach/ prep/[id]/
    team/ tips/ events/ events/[slug]/ shortlist/ network/ settings/ styleguide/
    api/
      chat/route.ts            Text-Agent (@openai/agents)
      realtime/session/route.ts  Ephemeral-Token für Voice
      outreach/ prep/ tips/ personality/ match/   Generierung mit Fallback
      profiles/ profiles/[id]/ events/ health/    Lesende APIs
  components/
    ui/index.tsx               UI-Primitives (Button, Card, Badge, …)
    layout/                    Sidebar, mobile Navigation
    assistant/                 ChatPanel, LiveCandidatePanel, VoiceAgent
    candidates/ dashboard/ onboarding/ outreach/ prep/ team/ events/ network/
  lib/
    types.ts                   Shared Contract: alle Typen
    data.ts                    Gateway (einziger Datenzugang)
    user-context.ts            Nutzer-Kontext (localStorage + Hook)
    matching.ts                Score + Ranking
    agent/                     Prompts, Tools, Agent-Definition
    outreach.ts prep.ts tips.ts personality.ts team.ts shortlist.ts attendees.ts
  data/
    events.json
    profiles/*.json            Mock (6 Dateien) + imported.json (echt)
scripts/
  import-idealab.mjs           Export → imported.json
  import-attendees.mjs         CSV → attendees
exports/                       Rohdaten (IdeaLab-Export, CSV)
docs/                          transcript.md, FEATURES.md, PARALLEL-WORK.md, DESIGN.md, ARCHITECTURE.md
```

## 9. Konfiguration

`.env.local` (Vorlage `.env.example`):

| Variable | Wirkung |
|---|---|
| `OPENAI_API_KEY` | Schaltet Text-Agent, Voice und LLM-Generierung frei. Fehlt er: Template-/Regel-Fallbacks, Voice-Endpunkt antwortet 503 |
| `OPENAI_TEXT_MODEL` | Modell für Chat und Generierung (Standard `gpt-5`) |
| `OPENAI_REALTIME_MODEL` | Realtime-Modell für Voice (Standard `gpt-realtime`) |

`GET /api/health` meldet `{ openaiConfigured, profiles, events }` – die Settings-Seite zeigt das an.

## 10. Contracts-Referenz

Verbindlich ist [PARALLEL-WORK.md](PARALLEL-WORK.md), Abschnitt „Contracts zwischen Paketen". Kurz:

- Typen nur aus `src/lib/types.ts`; Daten nur über `src/lib/data.ts`; Nutzer-Kontext nur über
  `src/lib/user-context.ts`.
- Matching: `scoreMatch`, `rankCandidates`.
- Alle API-Bodies/Antworten wie in Abschnitt 5/6 und in PARALLEL-WORK.md.
- Vokabular für `verticals` und `lookingFor` (kleingeschrieben) – Filter, Import und Mock-Daten
  müssen dieselben Begriffe verwenden.
- Gemeinsame Dateien (`types.ts`, `data.ts`, `user-context.ts`, `ui/index.tsx`, `globals.css`,
  `layout.tsx`, `components/layout/*`, `package.json`, `events.json`) ändert nur die Koordination.

## 11. Spätere Datenbank-Migration

Die Architektur ist darauf ausgelegt, dass nur der Speicher wechselt, nicht die Seiten:

1. **Gateway-Adapter tauschen.** `src/lib/data.ts` behält seine Funktionsnamen und Rückgabetypen,
   liest aber aus einer Datenbank (z. B. Postgres/Supabase) statt aus JSON. Die Funktionen müssen
   dafür `async` werden – das ist die eine koordinierte Änderung, die alle Aufrufer betrifft
   (Server Components: `await getProfiles()`; Client-Komponenten holen ohnehin über die APIs).
   Empfehlung: erst `server-only` markieren und Client-Nutzung des Gateways auf `/api/profiles`
   umstellen, dann den Adapter wechseln.
2. **Schema = Typen.** `Profile`, `Event`, `UserContext`, `Personality` aus `types.ts` sind die
   Tabellen; `experience`, `education`, `skills`, `lookingFor`, `verticals` als JSONB oder
   Untertabellen. `source.raw` bleibt JSONB.
3. **Import wird Pipeline.** `scripts/import-idealab.mjs` schreibt statt in `imported.json` in die
   DB (Upsert über `source`-ID). Mock-Dateien werden Seed-Daten.
4. **Nutzer:innen und Zustand.** Mit Login (z. B. NextAuth) wandern `UserContext` und Shortlist von
   localStorage in Tabellen pro Nutzer:in. `user-context.ts` behält seine API (`useUserContext`,
   `patchUserContext`), synchronisiert aber gegen den Server. Generierte Outreach-Texte und
   Prep-Packs werden persistiert statt bei jedem Aufruf neu erzeugt.
5. **Caching.** Personality-Analysen und Match-Erklärungen pro Profil/Nutzer:in cachen (Tabelle mit
   `generatedBy`, `model`, `createdAt`), damit LLM-Kosten nicht mit jedem Seitenaufruf wachsen.

## 12. MVP-Kompromisse, die man kennen sollte

- Das Gateway ist synchron und statisch: Neue Profile brauchen einen neuen Build bzw. Import.
- Kein Login, keine Mandanten: Kontext und Shortlist gelten pro Browser.
- Generierte Inhalte werden nicht gespeichert; jeder Aufruf erzeugt sie neu.
- Voice braucht Mikrofon-Freigabe, HTTPS oder `localhost` und einen API-Key.
- Route-Params sind Promises; generierte Next-Typen (`PageProps`/`LayoutProps`) fehlen in Worktrees,
  daher werden Props explizit typisiert.
- `next dev` schreibt den Block `nextjs-agent-rules` in `AGENTS.md` neu – erwartetes Verhalten.
