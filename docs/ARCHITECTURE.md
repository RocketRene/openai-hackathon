# Voya – Architektur

Technischer Überblick für alle, die nach dem Hackathon weiterbauen (Design-Pivot, Backend-Ausbau,
Datenbank). Ergänzt [DESIGN.md](DESIGN.md) (Oberfläche) und [PARALLEL-WORK.md](PARALLEL-WORK.md)
(Dateien, Ownership, Contracts). Stand: 28.09.2026.

## 1. Überblick

Next.js 16 (App Router, alles unter `src/`), TypeScript, Tailwind v4. Genau **ein** LLM-Anbieter:
OpenAI – `@openai/agents` für den Text-Agenten, `@openai/agents/realtime` (kommt mit
`@openai/agents`) für Voice, das `openai`-SDK für Textgenerierung und das Realtime-Client-Secret,
`zod` für Tool- und Antwort-Schemas.

Es gibt keinen eigenen Server außer den Next.js-Route-Handlern und keine Datenbank: Profile und
Events liegen als JSON im Repo, Nutzerdaten im Browser (localStorage). Ohne `OPENAI_API_KEY` läuft
alles mit regelbasierten Fallbacks – die Demo darf nie an einem fehlenden Key scheitern.

Die App ist zweisprachig (DE/EN, Abschnitt 6). Daneben liegt im Repo unter `web/` **Renés Voya
Voice Studio** – eine eigenständige Vite/React-App mit eigenem Server (Abschnitt 5.4).

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
   ├─ localStorage: UserContext (src/lib/user-context.ts), Shortlist (src/lib/shortlist.ts), Sprache (src/lib/i18n.tsx)
   └─ WebRTC ──▶ OpenAI Realtime  (Ephemeral-Token von /api/realtime/session)
```

## 2. Datenfluss: Export → Import → JSON → Gateway → Seiten/APIs

Unverändert seit dem MVP-Fundament – nur der Umfang ist gewachsen.

### 2.1 Quelle: `exports/`

- `exports/all-enriched-profiles.json` – Format `idealab-enriched-profiles-v1`. 569 Teilnehmer:innen
  der IdeaLab! 2026 (WHU Vallendar, 25./26.09.2026), exportiert aus der Event-App (Endpunkte in
  `idealab_api_doku.md`, Client-Doku in [idealab-client.md](idealab-client.md)) und mit
  LinkedIn-Daten angereichert. Pro Eintrag ein `candidate`-Block (`display_name`, `role`, `company`,
  `job_title`, `university`, `bio`, `avatar_url`, `interests`, `match_score`, `startup_stage`,
  `startup_one_liner`) und ein `profile`-Block mit dem Detailprofil.
- `exports/sample-attendees.csv` – CSV-Teilnehmerliste als zweite Quelle (Paket attendee-import,
  Parser in `src/lib/attendees.ts`, Ergebnis `src/data/attendees.json`).

Die Next-App liest **nie** direkt aus `exports/`. Der Ordner ist Rohmaterial für den Import.
(Renés `web/` liest den Export dagegen direkt – siehe 5.4.)

### 2.2 Import: `scripts/import-idealab.mjs` (`npm run import:idealab`)

Node-Skript ohne Build-Abhängigkeit. Es liest den Export, normalisiert jeden Eintrag auf den Typ
`Profile` (`src/lib/types.ts`) und schreibt `src/data/profiles/imported.json` (ein Profil pro
Zeile, deterministisch, ohne `source.raw` wegen der Dateigröße). Konvention:

- `id` = stabiler Slug (Name, bei Kollision mit Kürzel der Quell-UUID), `photoUrl` = `avatar_url`,
  `events = ["idealab-2026"]`, `source = { type: "conference" | "linkedin", scrapedAt }`.
- `networkRole`, `founderRole`, `verticals`, `lookingFor` werden heuristisch aus `role`,
  `job_title`, `company`, `interests` abgeleitet – mit dem Vokabular aus PARALLEL-WORK.md
  (kleingeschrieben, damit Filter überall greifen).
- `dims` und `personality` bekommen plausible Startwerte; `/api/personality` verfeinert sie bei
  Bedarf zur Laufzeit.

Das Ergebnis wird committet.

### 2.3 Ablage: `src/data/`

- `src/data/profiles/*.json` – jeweils ein `Profile[]`: `cofounders-tech`, `cofounders-commercial`,
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
| `findProfileByName(name)` | Teilstring-Suche in Name oder Slug – für „guck dir mal den Max an“ |
| `searchProfiles(filters)` | UND-Verknüpfung aller `ProfileFilters` (query, networkRole, founderRole, vertical, event, personality, stage) + Volltext über Name, Headline, Ort, About, Skills, Verticals, lookingFor, Erfahrung, Tags |
| `getEvents()`, `getEvent(slug)` | Events |
| `getProfilesForEvent(slug)` | Teilnehmer:innen eines Events |
| `getVerticals()` | alle vorkommenden Verticals, sortiert (für Filter-Dropdowns) |

Regeln:

- Seiten und Komponenten importieren **nie** JSON direkt – nur das Gateway. Nur so lässt sich der
  Speicher später tauschen (Abschnitt 12).
- Das Gateway läuft server- und clientseitig. Wer es in einer `"use client"`-Datei importiert,
  bündelt alle Profile ins Browser-Bundle (Voice-Tools und `ShortlistCompare` tun das bewusst).
  Listen deshalb in Server Components laden oder über `/api/profiles` holen.

### 2.5 Konsumenten

- **Server Components** (`page.tsx` ohne `"use client"`) rufen das Gateway direkt und rendern HTML.
  Dynamische Routen erhalten `params` als Promise: `const { id } = await params`.
- **Route-Handler** (`src/app/api/**/route.ts`) rufen das Gateway serverseitig und liefern JSON:
  `GET /api/profiles` (Objekt-Form `{ items, total, facets }`, mit `?format=array` ein `Profile[]`),
  `GET /api/profiles/[id]`, `GET /api/events`, `GET /api/events/[slug]` (`{ event, attendees }`),
  `GET /api/health`.
- **Client-Komponenten** bekommen Daten als Props oder laden sie per `fetch` von den APIs.

## 3. Nutzer-Kontext (Browser, `src/lib/user-context.ts`)

Kein Login im MVP. Der `UserContext` (Rolle, Verticals, Idee, Stärken, Selbsteinschätzung der fünf
Dimensionen, Interview-Notizen, Rahmenbedingungen `constraints`) liegt im `localStorage` unter
`founderradar.userContext.v1` (Storage-Keys wurden bei der Umbenennung zu Voya bewusst nicht
geändert).

- **Zugriff nur über das Modul:** Hook `useUserContext()` liefert
  `{ userContext, ready, update(patch), replace(ctx), loadDemo(), clear() }`. Außerhalb von
  Komponenten: `loadUserContext()`, `saveUserContext()`, `patchUserContext(patch)`,
  `clearUserContext()`.
- `ready` ist `false`, bis localStorage gelesen wurde (Hydration). Komponenten rendern
  kontextabhängige Inhalte erst danach.
- Änderungen feuern das Fenster-Event `founderradar:usercontext-changed`; der Hook hört zusätzlich
  auf `storage` (mehrere Tabs).
- `DEMO_USER_CONTEXT` („Marvin“, Tech-Founder, sucht Commercial-Co-Founder und Investoren) macht das
  Dashboard ohne Onboarding sofort vorzeigbar. `DEFAULT_USER_CONTEXT` ist der Leerzustand.
- **Schreiber:** Onboarding-Formular, Text-Agent (`userContextPatch` in der Chat-Antwort bzw.
  UI-Aktion `update_user_context`), Voice-Agent (`save_user_context` schreibt direkt per
  `patchUserContext`), Settings (Demo laden / zurücksetzen).
- **Der Server ist zustandslos.** Jede API, die den Kontext braucht, bekommt ihn im Request-Body
  mitgeschickt (`userContext`). Es gibt keine Session.

## 4. Matching (`src/lib/matching.ts`)

Deterministisch, ohne LLM, erklärbar – funktioniert ohne Key und liefert Begründungen fürs UI.

- `scoreMatch(user: UserContext, profile: Profile): MatchResult`
- `rankCandidates(user, profiles): MatchResult[]` – sortiert nach Score, Komplementarität, ID.

| Baustein | Gewicht | Bedingung |
|---|---|---|
| Gesuchte Rolle | +25 | `profile.networkRole` ∈ `user.lookingFor`; sonst Risiko-Hinweis |
| Fehlende Team-Rolle | +25 / −10 | `profile.founderRole` ∈ `user.lookingForRoles`; gleiche Rolle wie die Nutzer:in bei Co-Foundern: −10 + Risiko |
| Gleiches Vertical | +10 je Treffer, max. +20 | Schnittmenge `verticals`; ohne Treffer, aber `openToIdeas`: +5 |
| Komplementäre Stärken | 0 … +20 | `complementarity(user.dims, profile.dims)` × 0,2 |
| Sucht jemanden wie dich | +10 | `profile.lookingFor` enthält Stichwörter zur eigenen `founderRole` |
| Gleiche Phase | +5 | `stage` identisch |

Der Score wird auf 0–100 begrenzt. `reasons` (Label, Detail, Gewicht) sind nach Gewicht sortiert,
`risks` sind Klartext-Warnungen, `complementarity` (0–100) misst, wie stark das Profil die
Dimensionen auffüllt, in denen die Nutzer:in unter 10 liegt.

APIs darauf: `POST /api/match` (ein Profil, plus `explanation` und `generatedBy`) und
`POST /api/match/rank` (`{ userContext, limit?, networkRole? }` → `{ items, total, limit }`,
`items` = `MatchResult` + `name`, `headline`, `photoUrl`, `networkRole`; rein regelbasiert).

## 5. Agent

Beide Agent-Pfade – Text und Voice – erzeugen dieselben `UiAction`s (`src/lib/types.ts`), das
Frontend hat genau einen Handler dafür (`AssistantWorkspace.handleUiAction`). Beide bekommen die
UI-Sprache mit (`locale`, Abschnitt 6).

### 5.1 Text-Agent: `POST /api/chat` + `src/lib/agent/*` (Paket agent-core)

| Datei | Aufgabe |
|---|---|
| `src/app/api/chat/route.ts` | Route-Handler: zod-Validierung des `ChatRequest`, `runtime = "nodejs"`, `maxDuration = 60`; jeder Fehler fällt auf den Fallback zurück, erst wenn auch der scheitert 500 |
| `src/lib/agent/server-agent.ts` | `runChat(req)`: ohne Key → `runFallbackChat`; mit Key → `Agent` aus `@openai/agents` mit modusabhängigen Instructions, Tools, `maxTurns = 8`, letzte 20 Nachrichten; Modell `OPENAI_TEXT_MODEL` (Standard `gpt-5-mini`, Reasoning-Effort `low` für gpt-5*); bei LLM-Fehler Fallback mit Hinweis-Präfix |
| `src/lib/agent/tools.ts` | `createAgentTools(ctx)` – Tools lesen nur über das Gateway und melden Wirkung über `ToolContext { emit, getUserContext, setUserContext }` (Strict-Mode: optionale Felder sind `.nullable()`) |
| `src/lib/agent/prompts.ts` | Vokabular (`NETWORK_ROLES`, `FOUNDER_ROLES`, `STAGES`, `VERTICALS`, Labels), Interview-Felder, `buildInstructions(mode, userContext, candidate)`, `likelyQuestionsFor(profile)`, `summarizeUserContext` – gemeinsam für LLM und Fallback |
| `src/lib/agent/fallback-interviewer.ts` | `runFallbackChat(req)`: regelbasiertes Interview (fragt fehlende Felder ab, Keyword-Extraktion → `userContextPatch`), erkennt „zeig mir / guck dir mal <Name> an“, schlägt nach genug Kontext Top 3 vor; General-Modus per Keywords; Prep-Simulation mit 3–4 typischen Fragen, „Feedback“ beendet |

- Request `ChatRequest { messages, userContext, mode, locale?, candidateId? }`, Antwort
  `ChatResponse { reply, uiActions, userContextPatch? }`.
- Modi (`AgentMode`): `interview` (fragt Rolle, Gesuchtes, Vertical, Idee, Stärken, Stage ab, dann
  Vorschläge), `prep-simulation` (der Agent spielt `candidateId` – ohne Tools, bleibt in der Rolle),
  `general` (freies Gespräch über Kontakte, Events, Tipps).
- Tools: `search_candidates` (Freitext + Filter, sortiert nach Match, zeigt Treffer),
  `show_candidate` (Name oder ID → Profil im Live-Panel; mehrdeutig → Auswahlliste),
  `get_candidate_details` (Vollprofil ohne Rohdaten inkl. Match und `likelyToAsk`, öffnet nichts),
  `save_user_context` (Patch → `update_user_context`), `propose_candidates` (Ranking gegen den
  Kontext, Top-Treffer ins UI), `list_events`. Wirkende Tools erzeugen keine Seiteneffekte auf dem
  Server, sondern sammeln `UiAction`s, die der Handler in `uiActions` zurückgibt.
- Frontend (`ChatPanel` → `AssistantWorkspace`): `show_candidate`/`show_candidates` →
  `LiveCandidatePanel`; `navigate` → `router.push` (nur interne Pfade); `update_user_context` →
  `useUserContext().update`.

### 5.2 Voice-Agent: `POST /api/realtime/session` + `src/components/assistant/VoiceAgent.tsx`

```
Browser (VoiceAgent)                      Next.js (Server)                        OpenAI
   │  POST /api/realtime/session               │                                     │
   │  { mode, candidateId? }  ───────────────▶ │  OPENAI_API_KEY → clientSecrets.create (TTL 600 s, voice "marin") ▶ │
   │  ◀── { value, expiresAt, model } ──────── │  ◀──────────────────────────────── │
   │                                           │                                     │
   │  RealtimeSession.connect({ apiKey: value })  – WebRTC, Audio direkt ──────────▶ │
   │  ◀────────────────────────────────────────── Audio + Tool-Calls + Transkript ── │
   │  Tool-Call → onUiAction(action) → gleiche Handler wie im Text-Pfad
```

1. **Session-Endpunkt** (`src/app/api/realtime/session/route.ts`, Paket realtime-session-api):
   erzeugt mit dem echten Key ein kurzlebiges Client-Secret für `OPENAI_REALTIME_MODEL` (Standard
   `gpt-realtime`) und liefert `{ value, expiresAt, model }`. Ohne Key `503 { error }`, bei
   OpenAI-Fehler `502 { error }` (Key wird aus Fehlertexten entfernt). `mode`/`candidateId` werden
   nur validiert und geloggt – Instructions und Tools setzt der Client.
2. **`VoiceAgent`** (`"use client"`, Paket voice-agent, default export, Props `VoiceAgentProps`):
   baut `RealtimeAgent({ name: "Voya", instructions: buildVoiceInstructions(mode, userContext,
   candidate), tools: createVoiceTools(...) })` und eine `RealtimeSession` (Transkription
   `gpt-4o-mini-transcribe`, Sprache aus `locale`). Audio läuft direkt zwischen Browser und OpenAI.
   Events: `history_updated` → Transkript (`onTranscript`), `audio_start/stopped` → Status,
   `agent_tool_start/end` → Tool-Aktivität. Nach dem Verbinden schickt der Client
   `response.create`, damit der Agent das Gespräch eröffnet. Cleanup schließt die Session
   (Mikrofon frei).
3. **Prompts** (`voice-prompts.ts`): gesprochen-kurz (kein Markdown, keine Listen),
   `LIKELY_QUESTIONS_BY_ROLE`, `PERSONALITY_TONE`, `buildVoiceInstructions`.
4. **Tools** (`voice-tools.ts`, laufen im Browser, Daten nur über das Gateway):
   `show_candidate`, `search_candidates`, `save_user_context` (schreibt per `patchUserContext`,
   inkl. `dims`), `propose_candidates`, `list_events`. Gleiche Namen wie im Text-Pfad, damit der
   `UiAction`-Handler identisch bleibt.
5. **Voya-Erweiterung** (Paket voice-integration, Port aus Renés `web/`): zusätzliche Tools
   `get_candidate` (Profil im Gespräch öffnen, kompakte Karte), `update_brief` (bestätigte
   Anforderungen und Rahmenbedingungen → `UserContext.constraints`), `prepare_interview`
   (deterministischer 30-Minuten-Leitfaden aus `src/lib/interview-guide.ts`:
   `buildInterviewGuide(profile, user)`, `interviewGuideToMarkdown`, `interviewGuideFilename`,
   `downloadMarkdown`) → UI-Aktion `show_interview_guide`, die den Leitfaden neben dem Chat zeigt
   und als Markdown herunterladbar macht. Typen `InterviewGuide`/`InterviewGuideSection` liegen in
   `types.ts`. Stand 28.09.: Typen und `interview-guide.ts` auf dem Branch, Tool-Verdrahtung in
   Arbeit.
6. **Props** (`VoiceAgentProps`): `mode`, `locale?`, `userContext`, `candidate?`, `onUiAction`,
   `onTranscript?`, `initialMessages?` (Text-Verlauf wird beim Verbinden übergeben),
   `visibleCandidateIds?` (Profile im Live-Panel als Kontext, nicht als Anweisung), `className?`.

Der API-Key bleibt serverseitig; das Client-Secret ist zeitlich begrenzt.

### 5.3 `UiAction` – die Brücke zwischen Agent und Oberfläche

| Aktion | Wirkung im Frontend |
|---|---|
| `{ type: "show_candidate", profileId }` | Profil im Live-Panel anzeigen (Foto, LinkedIn-Daten, Match), neueste zuerst, max. 5 |
| `{ type: "show_candidates", profileIds }` | Mehrere Kandidaten als Liste anzeigen |
| `{ type: "navigate", href }` | Route wechseln (nur interne Pfade), z. B. zu `/prep/<id>` |
| `{ type: "update_user_context", patch }` | Teile des `UserContext` speichern |
| `{ type: "show_interview_guide", profileId, guide }` | Interview-Leitfaden (`InterviewGuide`) neben dem Gespräch zeigen, Markdown-Download |

### 5.4 Renés Voice Studio: `web/`

Eigenständige App im selben Repo, dokumentiert in [`web/README.md`](../web/README.md):

- Vite + React (`web/src/`), eigener Node-Server (`web/server/`), eigene `package.json`, Port 5173,
  Deployment als Cloudflare Worker (`web/wrangler.jsonc`) unter https://voya.ventosa.workers.dev.
- Liest `exports/all-enriched-profiles.json` **direkt** (Pfad über `CANDIDATES_FILE`), lexikalische
  Suche, gibt nur ausgewählte berufliche Angaben heraus (keine E-Mails, keine Rohdaten).
- Text-Agent (`OPENAI_TEXT_MODEL`, Standard `gpt-4.1-mini`) und Realtime-Voice
  (`gpt-realtime-2.1`, Reasoning `medium`) mit vier Tools: `search_candidates`, `get_candidate`,
  `update_brief`, `prepare_interview`. Optional ein RealtimeKit-Interviewraum (Cloudflare).
- Nicht Teil von `npm run dev` im Root; kein gemeinsamer Code mit der Next-App. Die Konzepte
  (kompakte Profilkarte im Gespräch, Suchprofil/Brief, belegbarer Interview-Leitfaden) werden
  über das Paket voice-integration in die Next-App portiert (5.2, Punkt 5).

## 6. Zweisprachigkeit (`src/lib/i18n.tsx`)

Leichtgewichtig, ohne Dependency, ohne zentrales Registrieren – damit parallele Pakete keine
Merge-Konflikte in einer Übersetzungsdatei erzeugen.

- **Zustand:** `localStorage` `voya.locale` (`"de"` Standard, `"en"`), Änderungs-Event
  `voya:locale-changed`; `useSyncExternalStore`, dadurch SSR-sicher (Server rendert `de`, Client
  gleicht ab). `setLocale` setzt zusätzlich `document.documentElement.lang`.
- **API:** `useLocale(): [locale, setLocale]`, `getLocale()`/`setLocale()` außerhalb von Hooks,
  `useT(dict)` → `t(key, vars)` mit Platzhaltern `{name}` und Fallback auf den Key,
  `<T de="…" en="…" />` (auch als Kind von Server-Components), `pick(locale, de, en)` für
  String-Props, `normalizeLocale`, `LanguageToggle` (Header), `COMMON` (gemeinsame Begriffe:
  Rollen, Speichern/Abbrechen, Lädt …, Merken/Gemerkt, Match-Score …).
- **Muster:** Jede Seite/Komponente hält ihr eigenes `Dict` (`Record<string, { de, en }>`).
  Server-Components nutzen `<T>`; Client-Components `useT`. Datenlisten (z. B. Sidebar) tragen
  `label`/`labelEn` in den Daten.
- **Agent:** `ChatRequest.locale` und `VoiceAgentProps.locale` transportieren die UI-Sprache. Die
  Instructions (`buildInstructions`, `buildVoiceInstructions`) sollen daraus eine Sprachanweisung
  ableiten und die Voice-Transkription die passende `language` setzen. Stand 28.09.: Felder im
  Contract vorhanden, Durchreichen aus `ChatPanel`/`AssistantWorkspace` und Auswertung in
  agent-core/voice-agent sind der nächste Schritt dieser Pakete.

## 7. Generierende APIs: LLM-Pfad mit Template-Fallback

Alle POST, JSON rein, JSON raus. Jede Route folgt demselben Muster:

1. Body prüfen (zod oder tolerant), Profil über das Gateway laden (404, wenn unbekannt).
2. Ist `OPENAI_API_KEY` gesetzt → `openai`-SDK (Responses API / Structured Output mit zod-Schema
   des Zieltyps), Prompt nutzt `Personality.communicationStyle`, `outreachTips`, `avoid` und den
   `UserContext`. Ergebnis `generatedBy: "llm"`.
3. Kein Key, Timeout oder Fehler → Template aus Profil + Persönlichkeitstyp + Match-Gründen,
   `generatedBy: "template"`. Nie ein 500 wegen fehlendem Key.

| Route | Body | Antwort |
|---|---|---|
| `/api/outreach` | `{ profileId, userContext, channel: "email" \| "linkedin" }` | `OutreachDraft` (Betreff, Text, `personalityNotes`, `generatedBy`) |
| `/api/prep` | `{ profileId, userContext }` | `PrepPack` (wahrscheinliche Fragen mit Antwort-Skizze, Talking Points, Eisbrecher, Red Flags, `generatedBy`) |
| `/api/tips` | `{ userContext, teamMemberIds? }` | `Tip[]` (Kategorie team/skills/fundraising/product/network, Priorität 1–3) |
| `/api/personality` | `{ profileId }` | `Personality` (Typ visionary/builder/operator/connector/analyst, Kommunikationsstil, Do's/Don'ts) |
| `/api/match` | `{ profileId, userContext }` | `MatchResult & { explanation, generatedBy }` |
| `/api/match/rank` | `{ userContext, limit?, networkRole? }` | `{ items, total, limit }` – rein regelbasiert |

Das UI zeigt `generatedBy` als dezentes Badge („KI“ / „Vorlage“), damit in der Demo klar ist, was
gerade läuft.

## 8. Weitere Client-Zustände und Berechnungen

- **Shortlist** (`src/lib/shortlist.ts`): localStorage-Key `founderradar.shortlist.v1`, Wert
  `string[]` (Profil-IDs), Event `founderradar:shortlist-changed`, Hook `useShortlist()`.
  `ShortlistButton` schreibt, `/shortlist` und `ShortlistCompare` (Vergleichstabelle) lesen.
- **Team-Radar** (`src/lib/team.ts`): berechnet `TeamAnalysis` (kombinierte Dimensionen, Lücken mit
  Rat, Stärken, `successScore`, empfohlene Rollen) aus `TeamMember[]` = Nutzer:in + ausgewählte
  Kandidaten. Rein clientseitig, synchron. `FOUNDER_ROLE_LABELS` liegt hier.
- **Interview-Leitfaden** (`src/lib/interview-guide.ts`, Paket voice-integration): isomorph,
  deterministisch, „belegbar“ – Fragen leiten sich nur aus tatsächlichen Profildaten ab, Unbekanntes
  steht unter `unknowns`.
- **Attendees** (`src/lib/attendees.ts`): CSV-Teilnehmerlisten anderer Events einlesen.

## 9. Verzeichnisstruktur

```
src/
  app/
    layout.tsx                 Root-Layout: Fonts, <AppShell>
    globals.css                Design-Tokens (Light/Dark), Hilfsklassen, Tailwind
    loading.tsx error.tsx not-found.tsx
    page.tsx                   / Dashboard
    onboarding/ assistant/ candidates/ candidates/[id]/ outreach/ prep/[id]/
    team/ tips/ events/ events/[slug]/ shortlist/ network/ settings/ styleguide/
    api/
      chat/route.ts            Text-Agent (@openai/agents) + Fallback
      realtime/session/route.ts  Ephemeral Client Secret für Voice
      outreach/ prep/ tips/ personality/ match/ match/rank/   Generierung/Ranking mit Fallback
      profiles/ profiles/[id]/ events/ events/[slug]/ health/  Lesende APIs
  components/
    ui/index.tsx               UI-Primitives (Button, Card, Badge, Chip, Stat, Skeleton, …)
    layout/                    AppShell (Sidebar + Header + main), Sidebar
    assistant/                 AssistantWorkspace, ChatPanel, LiveCandidatePanel, VoiceAgent, voice-prompts, voice-tools
    candidates/ dashboard/ onboarding/ outreach/ prep/ team/ tips/ events/ network/ settings/
  lib/
    types.ts                   Shared Contract: alle Typen (inkl. UiAction, ChatRequest, VoiceAgentProps, InterviewGuide)
    data.ts                    Gateway (einziger Datenzugang)
    user-context.ts            Nutzer-Kontext (localStorage + Hook)
    i18n.tsx                   DE/EN: useLocale, useT, <T>, LanguageToggle, COMMON
    matching.ts                Score + Ranking
    agent/                     prompts, tools, server-agent, fallback-interviewer
    interview-guide.ts         Leitfaden (Paket voice-integration)
    outreach.ts prep.ts tips.ts personality.ts team.ts shortlist.ts attendees.ts
  data/
    events.json attendees.json
    profiles/*.json            Mock (6 Dateien) + imported.json (echt)
scripts/
  import-idealab.mjs           Export → imported.json  (npm run import:idealab)
  import-attendees.mjs         CSV → attendees.json
  smoke.mjs                    Smoke-Test aller Seiten/APIs gegen die laufende App
exports/                       Rohdaten (IdeaLab-Export, CSV)
web/                           Renés Voya Voice Studio (Vite/React, eigener Server, Cloudflare Worker)
docs/                          transcript.md, FEATURES.md, DEMO.md, PARALLEL-WORK.md, DESIGN.md, ARCHITECTURE.md, idealab-client.md
```

## 10. Konfiguration

`.env.local` (Vorlage `.env.example`):

| Variable | Wirkung |
|---|---|
| `OPENAI_API_KEY` | Schaltet Text-Agent, Voice und LLM-Generierung frei. Fehlt er: Template-/Regel-Fallbacks, Voice-Endpunkt antwortet 503 |
| `OPENAI_TEXT_MODEL` | Modell für Chat und Generierung (Standard im Code `gpt-5-mini`; `.env.example` nennt `gpt-5`) |
| `OPENAI_REALTIME_MODEL` | Realtime-Modell für Voice (Standard `gpt-realtime`) |

`GET /api/health` meldet `{ openaiConfigured, textModel, realtimeModel, profiles, events, sources }` –
die Settings-Seite zeigt das an; `node scripts/smoke.mjs` prüft alle Routen.

Renés `web/` hat eine eigene `.env` (siehe `web/README.md`: `OPENAI_API_KEY`, `OPENAI_TEXT_MODEL`,
`OPENAI_REALTIME_MODEL`, `REALTIMEKIT_AUTH_TOKEN`, `CANDIDATES_FILE`, `PORT`).

## 11. Contracts-Referenz

Verbindlich ist [PARALLEL-WORK.md](PARALLEL-WORK.md), Abschnitt „Contracts zwischen Paketen“. Kurz:

- Typen nur aus `src/lib/types.ts`; Daten nur über `src/lib/data.ts`; Nutzer-Kontext nur über
  `src/lib/user-context.ts`; Sprache nur über `src/lib/i18n.tsx`.
- Matching: `scoreMatch`, `rankCandidates`.
- Alle API-Bodies/Antworten wie in Abschnitt 2.5, 4, 5 und 7.
- Vokabular für `verticals` und `lookingFor` (kleingeschrieben) – Filter, Import, Agent-Tools und
  Mock-Daten müssen dieselben Begriffe verwenden.
- Gemeinsame Dateien (`types.ts`, `data.ts`, `user-context.ts`, `i18n.tsx`, `ui/index.tsx`,
  `globals.css`, `layout.tsx`, `components/layout/*`, `package.json`, `events.json`) ändert nur die
  Koordination.

## 12. Spätere Datenbank-Migration

Die Architektur ist darauf ausgelegt, dass nur der Speicher wechselt, nicht die Seiten:

1. **Gateway-Adapter tauschen.** `src/lib/data.ts` behält seine Funktionsnamen und Rückgabetypen,
   liest aber aus einer Datenbank (z. B. Postgres/Supabase) statt aus JSON. Die Funktionen müssen
   dafür `async` werden – die eine koordinierte Änderung, die alle Aufrufer betrifft. Empfehlung:
   erst `server-only` markieren und Client-Nutzung des Gateways (Voice-Tools, ShortlistCompare) auf
   `/api/profiles` umstellen, dann den Adapter wechseln.
2. **Schema = Typen.** `Profile`, `Event`, `UserContext`, `Personality`, `InterviewGuide` aus
   `types.ts` sind die Tabellen; `experience`, `education`, `skills`, `lookingFor`, `verticals` als
   JSONB oder Untertabellen. `source.raw` bleibt JSONB.
3. **Import wird Pipeline.** `scripts/import-idealab.mjs` schreibt statt in `imported.json` in die
   DB (Upsert über `source`-ID). Mock-Dateien werden Seed-Daten.
4. **Nutzer:innen und Zustand.** Mit Login wandern `UserContext`, Shortlist und Sprache von
   localStorage in Tabellen pro Nutzer:in. `user-context.ts`/`i18n.tsx` behalten ihre API,
   synchronisieren aber gegen den Server. Generierte Outreach-Texte, Prep-Packs und
   Interview-Leitfäden werden persistiert statt bei jedem Aufruf neu erzeugt.
5. **Caching.** Personality-Analysen und Match-Erklärungen pro Profil/Nutzer:in cachen (Tabelle mit
   `generatedBy`, `model`, `createdAt`), damit LLM-Kosten nicht mit jedem Seitenaufruf wachsen.

## 13. MVP-Kompromisse, die man kennen sollte

- Das Gateway ist synchron und statisch: Neue Profile brauchen einen neuen Import bzw. Build.
- Kein Login, keine Mandanten: Kontext, Shortlist und Sprache gelten pro Browser.
- Generierte Inhalte werden nicht gespeichert; jeder Aufruf erzeugt sie neu.
- Voice braucht Mikrofon-Freigabe, HTTPS oder `localhost` und einen API-Key.
- Text-Agent und Voice-Agent definieren ihre Tools getrennt (Server vs. Browser) – gleiche Namen,
  aber zwei Implementierungen; Änderungen an einem Tool gehören in beide.
- `web/` und die Next-App teilen keinen Code; der Export wird von beiden gelesen (Next über den
  Import, `web/` direkt).
- Route-Params sind Promises; generierte Next-Typen (`PageProps`/`LayoutProps`) fehlen in Worktrees,
  daher werden Props explizit typisiert.
- `next dev` schreibt den Block `nextjs-agent-rules` in `AGENTS.md` neu – erwartetes Verhalten.
