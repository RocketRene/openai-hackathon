# Voya – Co-Founder Studio

Öffentliche Cloudflare-App: https://voya.ventosa.workers.dev

Voya kombiniert Text- und Sprachgespräche mit den vorhandenen IdeaLab-/LinkedIn-Profilen.
Während eines Gesprächs zeigt die App das passende Profil mit Foto, LinkedIn-Link und
Berufserfahrung. Das Voice-Modell ist GPT-Realtime-2.1 mit Reasoning-Stufe `medium`.

- App und Deployment: `/Users/rene/github.com/RocketRene/openai-hackathon/web/README.md`
- API-Client und Export-Werkzeuge: `/Users/rene/github.com/RocketRene/openai-hackathon/docs/idealab-client.md`
- Die parallel entwickelte Voya-App liegt weiterhin im Repository-Hauptverzeichnis.

---

# Voya – OpenAI Hackathon 2026

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
