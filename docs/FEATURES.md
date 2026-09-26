# FounderRadar – Funktionsumfang (abgeleitet aus dem Transkript)

**Produkt in einem Satz:** Ein Dashboard für Gründer:innen, das aus gescrapten Konferenz-/LinkedIn-Daten
die richtigen Kontakte (Co-Founder, Investoren, Mentoren, Talente) priorisiert, personalisierten
Outreach passend zum Persönlichkeitstyp erzeugt und per Voice-Agent auf das Gespräch vorbereitet.

## User Flow

1. **Onboarding** – Nutzer:in gibt Kontext: eigene Rolle (Tech/Commercial/…), Vertical, Idee oder
   „offen für alles", Stärken, optional LinkedIn-URL. Alternativ interviewt der **Agent** (Text oder Voice).
2. **Agent-Interview** – Der Agent fragt nach, bis er genug weiß, und schlägt dann Kandidaten vor.
   Sagt man „guck dir mal den Max an", erscheint Max' komplettes Profil (Foto, LinkedIn-Daten) live im UI.
3. **Kandidaten** – Durchsuchbare Profilliste wie LinkedIn, aber pivotiert auf den Use Case
   (Rolle im Ökosystem, gesuchte Rolle, Vertical, Event, Match-Score, Persönlichkeitstyp).
4. **Outreach** – Pro Kandidat eine personalisierte Nachricht (E-Mail/LinkedIn), angepasst an den
   Persönlichkeitstyp. Priorisierte Liste spart Zeit: weniger, aber bessere Anschreiben.
5. **Gesprächsvorbereitung (Prep)** – „Was wird die Person von dir wissen wollen?", Talking Points,
   Eisbrecher, Red Flags. Plus **Simulation**: Voice-Agent spielt die Kandidatin/den Kandidaten.
6. **Team-Radar** – Chart über Vision · Design/Visuell · Technik · Detail · Umsetzung für mich +
   ausgewählte Kandidaten. Zeigt, was im Gründerteam noch fehlt und wie „VC-tauglich" das Team ist.
7. **Tipps** – „Was fehlt meinem Start-up? Welche Skills brauche ich?" auf Basis des eigenen Kontexts.
8. **Events** – Konferenzen/Meetups mit Teilnehmerlisten (Quelle der gescrapten Kontakte).

## Zielgruppen im Ökosystem (alle über denselben Mechanismus)

- Co-Founder (Tech, Commercial, Product/Design, Operations, Domain-Expert)
- Investoren / VCs (Geld)
- Mentoren / erfahrene Gründer:innen (Advice)
- Talente (Start-ups, die z. B. Engineers suchen – gleiche Funktion, andere Rolle)

## Technik-Entscheidungen aus dem Meeting

- Web-App, cleanes Dashboard; MVP zuerst hässlich-aber-vollständig, Design danach (Jolanda).
- **Nur OpenAI**: Voice-Agent über OpenAI Realtime (`@openai/agents` / `gpt-realtime`), API-Key direkt rein.
- Daten kommen als **LinkedIn-JSON-Dump** (gescrapt); bis dahin Mock-Daten in gleicher Struktur.
- Alles regelmäßig ins Repo pushen. Fragen erst nach dem MVP.
