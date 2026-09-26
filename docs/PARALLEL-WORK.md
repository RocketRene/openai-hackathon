# Parallel-Arbeit: Pakete, Ownership, Contracts

Viele Agenten arbeiten gleichzeitig, jeder in einem eigenen Git-Worktree/Branch (`agent/<paket>`).
Regel Nr. 1: **Nur die eigenen Dateien anfassen.** Alles andere wird beim Merge zum Konflikt.

## Gemeinsame Dateien (Owner: Koordination / Marvin)

`src/lib/types.ts` · `src/lib/data.ts` · `src/lib/user-context.ts` · `src/components/ui/index.tsx` ·
`src/app/globals.css` · `src/app/layout.tsx` · `src/components/layout/*` · `package.json` · `src/data/events.json`

Brauchst du eine Änderung daran → im eigenen Modul lokal lösen und im Abschlussbericht melden.

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
| tips | `src/lib/tips.ts`, `src/app/api/tips/route.ts`, `src/app/tips/page.tsx` |
| profiles-api | `src/app/api/profiles/route.ts`, `src/app/api/profiles/[id]/route.ts`, `src/app/api/events/route.ts` |
| agent-core | `src/lib/agent/*`, `src/app/api/chat/route.ts` |
| realtime-session-api | `src/app/api/realtime/session/route.ts` |
| voice-agent | `src/components/assistant/VoiceAgent.tsx`, `src/components/assistant/voice-*.ts` |
| assistant-page | `src/app/assistant/page.tsx`, `src/components/assistant/ChatPanel.tsx`, `src/components/assistant/LiveCandidatePanel.tsx` |
| candidates-list | `src/app/candidates/page.tsx`, `src/components/candidates/CandidateList.tsx`, `CandidateCard.tsx`, `CandidateFilters.tsx` |
| candidate-detail | `src/app/candidates/[id]/page.tsx`, `src/components/candidates/CandidateProfile.tsx`, `MatchBreakdown.tsx` |
| onboarding | `src/app/onboarding/page.tsx`, `src/components/onboarding/*` |
| dashboard | `src/app/page.tsx`, `src/components/dashboard/*` |
| outreach-page | `src/app/outreach/page.tsx`, `src/components/outreach/*` |
| prep-page | `src/app/prep/[id]/page.tsx`, `src/components/prep/*` |
| events-pages | `src/app/events/page.tsx`, `src/app/events/[slug]/page.tsx`, `src/components/events/*` |
| shortlist | `src/lib/shortlist.ts`, `src/components/candidates/ShortlistButton.tsx`, `src/app/shortlist/page.tsx` |
| network-map | `src/app/network/page.tsx`, `src/components/network/*` |
| settings | `src/app/settings/page.tsx`, `src/app/api/health/route.ts` |
| match-api | `src/app/api/match/route.ts` |
| attendee-import | `scripts/import-attendees.mjs`, `exports/sample-attendees.csv`, `src/lib/attendees.ts` |
| design-docs | `docs/DESIGN.md`, `docs/ARCHITECTURE.md`, `src/app/styleguide/page.tsx` |

## Contracts zwischen Paketen

- **Typen:** ausschließlich aus `src/lib/types.ts`. Daten nur über `src/lib/data.ts`
  (`getProfiles`, `getProfile`, `findProfileByName`, `searchProfiles`, `getEvents`, `getEvent`,
  `getProfilesForEvent`, `getVerticals`). Nutzer-Kontext nur über `src/lib/user-context.ts`
  (`useUserContext()`, `loadUserContext`, `patchUserContext`, `DEMO_USER_CONTEXT`).
- **Matching:** `scoreMatch(user, profile): MatchResult`, `rankCandidates(user, profiles): MatchResult[]` aus `src/lib/matching.ts`.
- **Shortlist (localStorage):** Key `founderradar.shortlist.v1`, Wert `string[]` (Profil-IDs).
- **APIs (alle POST mit JSON, Antwort JSON):**
  - `/api/chat` – Body `ChatRequest` → `ChatResponse`
  - `/api/realtime/session` – Body `{ mode?: AgentMode, candidateId?: string }` → `{ value: string, expiresAt?: number, model: string }`; ohne Key: 503 `{ error }`
  - `/api/outreach` – Body `{ profileId, userContext, channel: "email"|"linkedin" }` → `OutreachDraft`
  - `/api/prep` – Body `{ profileId, userContext }` → `PrepPack`
  - `/api/tips` – Body `{ userContext, teamMemberIds?: string[] }` → `Tip[]`
  - `/api/match` – Body `{ profileId, userContext }` → `MatchResult & { explanation: string }`
  - `/api/personality` – Body `{ profileId }` → `Personality`
  - `/api/profiles?query=&networkRole=&founderRole=&vertical=&event=&personality=` (GET) → `Profile[]`; `/api/profiles/[id]` → `Profile`
  - `/api/health` (GET) → `{ openaiConfigured: boolean, profiles: number, events: number }`
- **VoiceAgent:** default export aus `@/components/assistant/VoiceAgent`, Props `VoiceAgentProps`.
- **Vokabular** (für Filter-Konsistenz; Kleinschreibung):
  - `verticals`: ai, fintech, healthtech, climate, b2b saas, consumer, robotics, defense, edtech, mobility, proptech, deeptech, ecommerce, hr tech, legaltech, energy, biotech, media
  - `lookingFor`: technical cofounder, commercial cofounder, product cofounder, design cofounder, operations cofounder, pre-seed investment, seed investment, angel investment, mentor, mentees, advisor role, job as engineer, job as product manager, job as designer, startups to invest in, dealflow, partnerships, first hires
- **Fotos:** echte Profile: `avatar_url` aus dem Export; Mock: `https://i.pravatar.cc/200?u=<id>`.
- **Ohne OPENAI_API_KEY** muss jede API einen Template-/Regel-Fallback liefern (kein 500).

## Arbeitsablauf pro Agent

1. Im eigenen Worktree: `ln -s /home/marvin/Documents/Projects/HackathonIdeaLab/node_modules node_modules` (falls nicht vorhanden).
2. Nur eigene Dateien schreiben. Prüfen: `npx tsc --noEmit 2>&1 | grep -E "<eigene Pfade>"` und `npx eslint <eigene Dateien>`.
3. Kein `next build`, kein `next dev`, kein `npm install`.
4. Committen auf Branch `agent/<paket>` (nur eigene Dateien). Nicht pushen – der Koordinator merged.
