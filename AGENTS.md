<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# FounderRadar – Agent-Leitfaden

Gilt für alle KI-Agenten (Claude, Codex, Cursor …) und Menschen in diesem Repo.

## Worum es geht

Hackathon-MVP (OpenAI Hackathon, 26.09.2026). Ein Dashboard für Gründer:innen, das aus gescrapten
Konferenz-/LinkedIn-Daten die richtigen Kontakte findet (Co-Founder, Investoren, Mentoren, Talente),
personalisierten Outreach passend zum Persönlichkeitstyp erzeugt und per Voice-Agent auf das
Gespräch vorbereitet.

- Briefing-Transkript: [docs/transcript.md](docs/transcript.md) (Roh: `transcriptMVP.txt`)
- Feature-Liste: [docs/FEATURES.md](docs/FEATURES.md)
- Parallel-Arbeit & Datei-Ownership: [docs/PARALLEL-WORK.md](docs/PARALLEL-WORK.md)
- Echte Daten: `exports/all-enriched-profiles.json` (569 Teilnehmer:innen der IdeaLab! 2026,
  Vallendar, mit LinkedIn-Anreicherung). API-Doku der Quell-App: `idealab_api_doku.md`.

## Stack

- Next.js 16 (App Router, `src/`), TypeScript, Tailwind v4. **Nur OpenAI** als LLM-Anbieter:
  `@openai/agents` (Text + Realtime/Voice), `openai` SDK, `zod` für Tool-Schemas.
- Kein weiteres UI-Framework. UI-Primitives in `src/components/ui/index.tsx`, Design-Tokens in
  `src/app/globals.css` (CSS-Variablen; Komponenten nutzen nur `var(--…)`).
- Ohne `OPENAI_API_KEY` muss alles mit Template-/Regel-Fallbacks funktionieren (Demo-Sicherheit).

## Architektur-Regeln (kurz)

1. **Ein Daten-Zugang:** Alles über `src/lib/data.ts`. Nie JSON direkt in Seiten importieren.
2. **Shared Contracts:** `src/lib/types.ts`, `src/lib/data.ts`, `src/lib/user-context.ts`,
   `src/components/ui/index.tsx`, `src/app/globals.css`, `src/app/layout.tsx`, `package.json`
   sind gemeinsam. Nur ändern, wenn du der Owner bist (siehe PARALLEL-WORK.md). Brauchst du einen
   neuen Typ: lokal im eigenen Modul definieren und im Abschlussbericht melden.
3. **Hardcoden ist erlaubt.** MVP-Modus: lieber ein funktionierender Fallback als ein perfektes
   Backend. Mock-Daten in derselben Struktur wie die echten (`Profile` in types.ts).
4. **Client vs. Server:** `"use client"` nur wo nötig (Hooks, Browser-APIs, Voice). Route-Handler
   unter `src/app/api/**/route.ts`. Der API-Key bleibt serverseitig; Voice bekommt ein
   Ephemeral-Token über `/api/realtime/session`.
5. **Route-Params sind Promises** (`const { id } = await params`). Keine `PageProps`/`LayoutProps`-
   Helfer benutzen (generierte Typen fehlen in Worktrees), sondern explizit
   `{ params: Promise<{ id: string }> }` typisieren.
6. **Sprache:** UI-Texte Deutsch, Code/Identifier Englisch.
7. **Kein `next build`/`next dev` in parallelen Agenten** (gemeinsames `.next`). Prüfen mit
   `npx tsc --noEmit` und `npx eslint <eigene Dateien>`.

## Team-Rollen (aus dem Meeting)

- Marvin: Koordination, Backend/Agent. René: Web-App/Backend. Jolanda: Design-Pivot nach dem MVP.
- Design-Handoff: [docs/DESIGN.md](docs/DESIGN.md) (Tokens, Komponenten, wo pivotieren).
