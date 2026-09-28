# Parallel-Arbeit: Pakete, Ownership, Contracts

Viele Agenten arbeiten gleichzeitig, jeder in einem eigenen Git-Worktree/Branch (`agent/<paket>`
oder der vom Worktree vorgegebene Name). Regel Nr. 1: **Nur die eigenen Dateien anfassen.** Alles
andere wird beim Merge zum Konflikt. Stand: 28.09.2026.

## Gemeinsame Dateien (Owner: Koordination / Marvin)

`src/lib/types.ts` · `src/lib/data.ts` · `src/lib/user-context.ts` · `src/lib/i18n.tsx` ·
`src/components/ui/index.tsx` · `src/app/globals.css` · `src/app/layout.tsx` ·
`src/components/layout/*` (AppShell, Sidebar) · `package.json` · `src/data/events.json`

Brauchst du eine Änderung daran → im eigenen Modul lokal lösen und im Abschlussbericht melden.
Neue Typen: lokal im eigenen Modul definieren. Neue gemeinsame Begriffe für `COMMON` in
`i18n.tsx`: melden, nicht selbst eintragen.

## Pakete und Ownership

| Paket | Dateien (nur diese anlegen/ändern) |
|---|---|
| import-idealab | `scripts/import-idealab.mjs`, `src/data/profiles/imported.json` |
| mock-cofounders-tech | `src/data/profiles/cofounders-tech.json` |
| mock-cofounders-commercial | `src/data/profiles/cofounders-commercial.json` |
| mock-cofounders-product-design | `src/data/profiles/cofounders-product-design.json` |
| mock-investors | `src/data/profiles/investors.json` |
| mock-mentors-experts | `src/data/profiles/mentors-experts.json` |
| mock-talent | `src/data/profiles/talent.json` |
| matching | `src/lib/matching.ts`, `src/lib/matching.test.ts` |
| personality | `src/lib/personality.ts`, `src/app/api/personality/route.ts` |
| outreach | `src/lib/outreach.ts`, `src/app/api/outreach/route.ts` |
| prep | `src/lib/prep.ts`, `src/app/api/prep/route.ts` |
| team | `src/lib/team.ts`, `src/components/team/*`, `src/app/team/page.tsx` |
| tips | `src/lib/tips.ts`, `src/app/api/tips/route.ts`, `src/app/tips/page.tsx`, `src/components/tips/*` |
| profiles-api | `src/app/api/profiles/route.ts`, `src/app/api/profiles/[id]/route.ts`, `src/app/api/events/route.ts`, `src/app/api/events/[slug]/route.ts` |
| agent-core | `src/lib/agent/*`, `src/app/api/chat/route.ts` |
| realtime-session-api | `src/app/api/realtime/session/route.ts` |
| voice-agent | `src/components/assistant/VoiceAgent.tsx`, `src/components/assistant/voice-*.ts` |
| voice-integration | `src/lib/interview-guide.ts`; Erweiterungen in `voice-tools.ts`/`VoiceAgent.tsx` (Tools `get_candidate`, `update_brief`, `prepare_interview`, UI-Aktion `show_interview_guide`) **in Absprache mit voice-agent** |
| assistant-page | `src/app/assistant/page.tsx`, `src/components/assistant/AssistantWorkspace.tsx`, `ChatPanel.tsx`, `LiveCandidatePanel.tsx` |
| candidates-list | `src/app/candidates/page.tsx`, `src/components/candidates/CandidateList.tsx`, `CandidateCard.tsx`, `CandidateFilters.tsx` |
| candidate-detail | `src/app/candidates/[id]/page.tsx`, `src/components/candidates/CandidateProfile.tsx`, `MatchBreakdown.tsx` |
| onboarding | `src/app/onboarding/page.tsx`, `src/components/onboarding/*` |
| dashboard | `src/app/page.tsx`, `src/components/dashboard/*` (DashboardHome, StatsRow, TopMatches) |
| outreach-page | `src/app/outreach/page.tsx`, `src/components/outreach/*` |
| prep-page | `src/app/prep/[id]/page.tsx`, `src/components/prep/*` |
| events-pages | `src/app/events/page.tsx`, `src/app/events/[slug]/page.tsx`, `src/components/events/*` |
| shortlist | `src/lib/shortlist.ts`, `src/components/candidates/ShortlistButton.tsx`, `src/components/candidates/ShortlistCompare.tsx`, `src/app/shortlist/page.tsx` |
| network-map | `src/app/network/page.tsx`, `src/components/network/*` |
| settings | `src/app/settings/page.tsx`, `src/components/settings/*`, `src/app/api/health/route.ts` |
| match-api | `src/app/api/match/route.ts`, `src/app/api/match/rank/route.ts` |
| attendee-import | `scripts/import-attendees.mjs`, `exports/sample-attendees.csv`, `src/lib/attendees.ts`, `src/data/attendees.json` |
| i18n | `src/lib/i18n.tsx` (Koordination; Seiten halten eigene Dicts, siehe I18N-Regel) |
| layout | `src/components/layout/AppShell.tsx`, `Sidebar.tsx`, `src/app/layout.tsx` (Koordination; nach dem MVP Design/Jolanda) |
| design-docs | `docs/DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/PARALLEL-WORK.md`, `README.md`, `src/app/styleguide/page.tsx` |
| demo | `docs/DEMO.md`, `scripts/smoke.mjs` |
| voice-studio (René) | `web/**` – eigenständige App, eigene `package.json`, siehe `web/README.md` |

## Contracts zwischen Paketen

- **Typen:** ausschließlich aus `src/lib/types.ts`. Daten nur über `src/lib/data.ts`
  (`getProfiles`, `getProfile`, `findProfileByName`, `searchProfiles`, `getEvents`, `getEvent`,
  `getProfilesForEvent`, `getVerticals`). Nutzer-Kontext nur über `src/lib/user-context.ts`
  (`useUserContext()`, `loadUserContext`, `patchUserContext`, `DEMO_USER_CONTEXT`). Sprache nur
  über `src/lib/i18n.tsx` (`useLocale`, `useT`, `<T>`, `pick`, `COMMON`, `LanguageToggle`).
- **Matching:** `scoreMatch(user, profile): MatchResult`, `rankCandidates(user, profiles): MatchResult[]` aus `src/lib/matching.ts`.
- **Shortlist (localStorage):** Key `founderradar.shortlist.v1`, Wert `string[]` (Profil-IDs), Hook `useShortlist()`.
- **Sprache (localStorage):** Key `voya.locale`, Wert `"de" | "en"` (Default `de`).
- **Agent:**
  - `ChatRequest { messages, userContext, mode, locale?, candidateId? }` → `ChatResponse { reply, uiActions, userContextPatch? }`.
  - `VoiceAgentProps { mode, locale?, userContext, candidate?, onUiAction, onTranscript?, initialMessages?, visibleCandidateIds?, className? }`; default export aus `@/components/assistant/VoiceAgent`.
  - `UiAction`: `show_candidate` · `show_candidates` · `navigate` · `update_user_context` · `show_interview_guide { profileId, guide: InterviewGuide }`. Text- und Voice-Tools tragen dieselben Namen (`show_candidate`, `search_candidates`, `save_user_context`, `propose_candidates`, `list_events`; Voya-Erweiterung `get_candidate`, `update_brief`, `prepare_interview`).
- **APIs (alle POST mit JSON, Antwort JSON – außer GET wie angegeben):**
  - `/api/chat` – Body `ChatRequest` → `ChatResponse`; ohne Key regelbasierter Fallback
  - `/api/realtime/session` – Body `{ mode?: AgentMode, candidateId?: string }` → `{ value: string, expiresAt?: number, model: string }`; ohne Key: 503 `{ error }`, OpenAI-Fehler: 502
  - `/api/outreach` – Body `{ profileId, userContext, channel: "email"|"linkedin" }` → `OutreachDraft` (mit `generatedBy`)
  - `/api/prep` – Body `{ profileId, userContext }` → `PrepPack` (mit `generatedBy`)
  - `/api/tips` – Body `{ userContext, teamMemberIds?: string[] }` → `Tip[]`
  - `/api/match` – Body `{ profileId, userContext }` → `MatchResult & { explanation: string, generatedBy: "llm"|"template" }`
  - `/api/match/rank` – Body `{ userContext: UserContext|null, limit?: number (Default 10, max 50), networkRole?: NetworkRole }` → `{ items: (MatchResult & { name, headline, photoUrl, networkRole })[], total, limit }`; rein regelbasiert
  - `/api/personality` – Body `{ profileId }` → `Personality`
  - `/api/profiles?query=&networkRole=&founderRole=&vertical=&event=&personality=&stage=&limit=&offset=&sort=` (GET) → **Objekt-Form** `{ items: Profile[], total, facets: { networkRole, founderRole, personality, verticals, events } }`; mit `?format=array` ein reines `Profile[]` (`limit=600` für alle). `/api/profiles/[id]` → `Profile`
  - `/api/events` (GET) → `Event[]`; `/api/events/[slug]` (GET) → `{ event: Event, attendees: Profile[] }`
  - `/api/health` (GET) → `{ openaiConfigured, textModel, realtimeModel, profiles, events, sources }`
- **`generatedBy`:** jede generierende Antwort (`OutreachDraft`, `PrepPack`, `/api/match`) trägt
  `generatedBy: "llm" | "template"`; das UI zeigt es als Badge („KI“ / „Vorlage“).
- **Vokabular** (für Filter-Konsistenz; Kleinschreibung):
  - `verticals`: ai, fintech, healthtech, climate, b2b saas, consumer, robotics, defense, edtech, mobility, proptech, deeptech, ecommerce, hr tech, legaltech, energy, biotech, media
  - `lookingFor`: technical cofounder, commercial cofounder, product cofounder, design cofounder, operations cofounder, pre-seed investment, seed investment, angel investment, mentor, mentees, advisor role, job as engineer, job as product manager, job as designer, job as growth, startups to invest in, dealflow, partnerships, first hires
- **Fotos:** echte Profile: `avatar_url` aus dem Export; Mock: `https://i.pravatar.cc/200?u=<id>`.
- **Ohne OPENAI_API_KEY** muss jede API einen Template-/Regel-Fallback liefern (kein 500).

## I18N-Regel (DE/EN)

Die App ist zweisprachig, der Umschalter sitzt im Header. Damit parallele Pakete sich nicht in
einer Übersetzungsdatei treffen, gilt:

1. **Lokale Wörterbücher.** Jede Seite/Komponente hält ihr eigenes `Dict` in der eigenen Datei:
   ```ts
   import { useT, type Dict } from "@/lib/i18n";
   const DICT: Dict = { title: { de: "Kandidaten", en: "Candidates" }, count: { de: "{n} Profile", en: "{n} profiles" } };
   const t = useT(DICT);   // t("title"), t("count", { n: 12 })
   ```
   Kein zentrales Registrieren, keine Änderung an `i18n.tsx`.
2. **`<T>` in Server-Components.** Wo kein Hook geht (Server-Components, JSX-Props vom Typ
   `ReactNode`): `<T de="Kandidaten" en="Candidates" />`. Für String-Props (`placeholder`,
   `aria-label`, `title`-Attribute) in Client-Components `pick(locale, de, en)` mit
   `const [locale] = useLocale()`.
3. **`COMMON` für gemeinsame Begriffe** (Rollen, Speichern/Abbrechen, Lädt …, Merken/Gemerkt,
   Match-Score, Mehr laden, Alle): `useT(COMMON)` oder `COMMON.save[locale]`. Fehlt ein Begriff,
   im Abschlussbericht melden – `i18n.tsx` ist gemeinsam.
4. **Datenlisten** (Navigation, Filter-Optionen) tragen beide Sprachen in den Daten
   (`label`/`labelEn`), wie `Sidebar.tsx`.
5. **Agent:** UI-Sprache über `ChatRequest.locale` (ChatPanel → `/api/chat`) und
   `VoiceAgentProps.locale` mitgeben; agent-core/voice-agent leiten daraus die Antwortsprache und
   die Transkriptions-`language` ab. Prompts bleiben deutsch formuliert, die Sprachanweisung wird
   angehängt.
6. **Fallback ist immer Deutsch** (`entry[locale] ?? entry.de`); Default ohne Auswahl `de`.
   Keine Sprache in URLs, kein `lang`-Routing.

## Arbeitsablauf pro Agent (harte Zeitgrenze!)

1. Worktree prüfen: `ls src/lib/i18n.tsx` – fehlt es, `git fetch origin && git merge --ff-only origin/main`.
   `ln -s /home/marvin/Documents/Projects/HackathonIdeaLab/node_modules node_modules` (falls nicht vorhanden).
2. Nur eigene Dateien schreiben. Prüfen: `npx tsc --noEmit 2>&1 | grep -E "<eigene Pfade>"` und `npx eslint <eigene Dateien>`.
3. Kein `next build`, kein `next dev`, kein `npm install`, keine Änderung an `package.json`.
4. Eigener Branch `agent/<paket>` (oder der vom Worktree vorgegebene). **Früh und oft committen, jeden Commit
   sofort pushen:** `git push -u origin HEAD`.
5. **Selbst auf main bringen**, sobald die eigenen Dateien tsc-sauber sind:
   `git fetch origin && git rebase origin/main && git push origin HEAD && git push origin HEAD:main`
   (bei Race: fetch + rebase erneut, dann push wiederholen). Niemals `--force`. Konflikte in den
   eigenen Dateien selbst lösen; Konflikte in fremden Dateien → abbrechen und melden.
6. Abschlussbericht (max. 5 Zeilen): Branch, Commit-Hash auf main, offene Punkte, gewünschte
   Änderungen an gemeinsamen Dateien (Typen, `COMMON`, Primitives).

## Contract-Notizen aus den Paketen

- `/api/profiles` liefert `{ items, total, facets }`; mit `?format=array` ein reines `Profile[]`.
  Ungültige Enum-Werte werden ignoriert (Filter entfällt), nie 400. `Cache-Control: public, max-age=60`.
- `/api/match/rank` akzeptiert `userContext: null` (Gast-Default: sucht cofounder/investor/mentor,
  Dims 5) – wie `/api/match`. `src/lib/user-context.ts` ist `"use client"` und darf in Routen nicht
  importiert werden.
- `generatedBy` in `/api/match` analog zu `OutreachDraft`/`PrepPack` (Commit 60d7850).
- Vokabular `lookingFor` zusätzlich: `job as growth`.
- `FOUNDER_ROLE_LABELS` (deutsche Rollen-Labels) liegt in `src/lib/team.ts` und `src/lib/agent/prompts.ts`;
  deutsche NetworkRole-Labels lokal in `LiveCandidatePanel.tsx`, `ShortlistCompare.tsx`,
  `AssistantWorkspace.tsx`, `AppShell.tsx` – Kandidaten für `COMMON` bzw. `types.ts` nach dem MVP.
- `UserContext.constraints` (Freitext: Standort/remote, Zeit, Start, Finanzierung, Ausschlüsse) ist
  additiv für `update_brief` (voice-integration) – Onboarding darf es befüllen, muss aber nicht.
- `InterviewGuide`/`InterviewGuideSection` und `UiAction show_interview_guide` sind in `types.ts`
  angelegt; `src/lib/interview-guide.ts` (`buildInterviewGuide`, `interviewGuideToMarkdown`,
  `interviewGuideFilename`, `downloadMarkdown`) kommt mit voice-integration.
- Text- und Voice-Tools sind zwei Implementierungen (Server `src/lib/agent/tools.ts`, Browser
  `voice-tools.ts`). Neues Tool → in beiden ergänzen oder bewusst nur in einem und dokumentieren.
- Seiten rendern **kein eigenes `<main>`** und keinen Seitenabstand – die AppShell setzt
  `max-w-7xl` und Padding (Fix 4864bd2).
- Lokal improvisierte Bausteine, die beim Design-Pivot in `ui/index.tsx` einwandern:
  `FilterChip` (Outreach), `CheckChip`/`ToggleChip` (Onboarding), `LoadingSkeleton` (Prep),
  KPI-Kacheln in `StatsRow` (→ `Stat`).
