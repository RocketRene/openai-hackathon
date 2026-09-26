# FounderRadar – OpenAI Hackathon 2026

Findet aus Konferenz-/LinkedIn-Daten die richtigen Kontakte für Gründer:innen (Co-Founder,
Investoren, Mentoren, Talente), erzeugt persönlichkeitsangepassten Outreach und bereitet per
Voice-Agent (OpenAI Realtime) auf das Gespräch vor.

## Start

```bash
npm install
cp .env.example .env.local   # OPENAI_API_KEY eintragen (optional – ohne Key laufen Fallbacks)
npm run dev
```

Öffne http://localhost:3000.

## Struktur

- `src/app/` – Seiten (Dashboard, Agent, Kandidaten, Outreach, Prep, Team-Radar, Tipps, Events)
- `src/app/api/` – Route-Handler (Chat-Agent, Realtime-Token, Outreach, Prep, Profile)
- `src/lib/` – Typen, Daten-Gateway, Matching, Agent-Tools/Prompts
- `src/data/` – Profile (Mock + Import aus `exports/`), Events
- `scripts/` – Import des LinkedIn/IdeaLab-Exports nach `src/data/profiles/imported.json`
- `docs/` – Transkript, Features, Parallel-Arbeit, Design-Handoff

Mehr: [AGENTS.md](AGENTS.md), [docs/FEATURES.md](docs/FEATURES.md).
