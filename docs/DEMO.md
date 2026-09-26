# Voya – Demo-Drehbuch (Hackathon-Pitch)

Ziel: kompletter End-to-End-Flow in **unter 3 Minuten**. Eine Person spricht und klickt, eine
zweite hält den Fallback-Plan bereit (Abschnitt C).

Der Flow zeigt alle Acceptance Criteria aus `project.md` (Abschnitt 13): Bedarf beschreiben →
gerankte Kandidaten mit Begründung → Detail-Ansicht → Outreach-Entwurf → Team-Lücken →
KI-gestützte Gesprächsvorbereitung.

---

## A. Vorbereitung (10 Minuten vor der Demo)

Checkliste, alles abhaken:

- [ ] `.env.local` im Projekt-Root enthält `OPENAI_API_KEY=sk-…` (ohne Key läuft alles im
      Offline-Modus, siehe C – funktioniert, aber ohne Voice und ohne LLM-Texte).
- [ ] `npm run dev` läuft, Terminal sichtbar lassen (zeigt Requests, beruhigt bei Nachfragen).
- [ ] Smoke-Test grün: `node scripts/smoke.mjs` (Default `http://localhost:3000`). Wenn
      `/api/realtime/session` als „ok (kein Key)" erscheint, fehlt der Key → Offline-Modus.
- [ ] Browser-Tab auf `http://localhost:3000/` geöffnet, Zoom auf 125 % (Beamer), zweiter Tab
      auf `/candidates/max-brandt` als Sprung-Ziel, falls die Navigation hakt.
- [ ] Mikrofon-Freigabe für `localhost` einmal vorab erteilt (auf `/assistant` den Voice-Button
      drücken, „Zulassen" klicken, wieder stoppen). Sonst blockiert der Browser-Dialog die Demo.
- [ ] Demo-Nutzer laden: auf `/` bzw. `/onboarding` gibt es „Demo-Profil laden" (setzt
      `DEMO_USER_CONTEXT` aus `src/lib/user-context.ts`). Alternativ in `/settings`.
      Der Demo-Nutzer ist **Marvin**: Tech-Founder (Full-Stack & AI), sucht **Commercial
      Co-Founder** und **Investor**, Verticals **b2b saas / ai**, Stage „idea", Idee: „AI-Tool, das
      Gründer:innen die richtigen Co-Founder und Investoren auf Konferenzen findet."
- [ ] Shortlist leeren (localStorage-Key `founderradar.shortlist.v1`) oder bewusst mit
      `max-brandt` und `markus-fellner` vorbefüllen, wenn der Team-Radar-Schritt schnell gehen soll.
- [ ] Lautsprecher-Test: Voice-Simulation einmal 10 Sekunden anspielen.

### Demo-Profile (Mock-Daten aus `src/data/profiles/`)

Diese drei passen zu Marvins Kontext und sollten im Ranking oben stehen:

| Wer | ID | Warum in der Demo |
|---|---|---|
| **Max Brandt** | `max-brandt` | Commercial Co-Founder, Ex-McKinsey/WHU, sucht *technical cofounder* für **B2B-SaaS/KI** (Sales-Forecasting), 40+ Kundeninterviews. Persönlichkeitstyp **Visionär** – ideal, um den persönlichkeitsangepassten Outreach zu zeigen („große Vision zuerst, kein Feature-Kleinklein"). Und er heißt Max: „Guck dir mal den Max an" funktioniert wörtlich (`findProfileByName("Max")` trifft nur ihn). Events: idealab-2026, bits-and-pretzels-2026. |
| **Nils Petersen** | `nils-petersen` | Commercial Co-Founder, Business Development bei Celonis, sucht *technical cofounder* für **AI-Dev-Tools**. Typ **Connector** – der Kontrast zu Max zeigt, dass die Outreach-Nachricht wirklich anders klingt (Beziehung/Netzwerk statt Vision). |
| **Markus Fellner** | `markus-fellner` | **Investor** (Business Angel, Exit 2021), investiert in **b2b saas / ai**. Deckt Marvins zweite Suche („Investor") ab und liefert im Prep-Pack die klassischen Angel-Fragen („Warum ihr? Warum jetzt?"). Typ Visionär. |

Ersatz, falls eines der Profile fehlt: `sophia-lindner` (Commercial, FinTech/B2B SaaS, Operator),
`melanie-roth` (Mentorin, Accelerator, b2b saas/ai).

---

## B. Drehbuch (2:45 min)

Sprecher-Text kursiv, Klicks in **fett**, rechts was das Publikum sieht.

### 0:00 – Hook (15 s) · Route `/`

*„Auf der IdeaLab in Vallendar waren 569 Leute. Welche drei davon hätte ich ansprechen
sollen? Und was sage ich denen? Voya beantwortet genau das."*

**Dashboard zeigen.** Publikum sieht: Marvins Kontext-Karte (Tech-Founder, sucht Commercial
Co-Founder + Investor), Top-Matches als Vorschau, Team-Radar klein, nächste Events.

### 0:15 – Kontext: Onboarding oder Agent-Interview (30 s) · `/onboarding` oder `/assistant`

Variante kurz (empfohlen): **Onboarding öffnen**, Demo-Profil ist schon geladen.
*„Ich bin Tech-Founder, B2B-SaaS mit KI, mir fehlt jemand, der verkauft – und ein Angel."*
Zwei Felder kurz anfassen (Vertical, gesuchte Rolle), **Speichern**.

Variante mit Wow-Effekt (nur wenn Zeit und Key da): **`/assistant` öffnen**, Modus Interview,
ins Mikro: *„Ich baue ein AI-Tool für Gründer, bin selbst Techie und brauche einen
Commercial Co-Founder."* Der Agent stellt eine Rückfrage, das Kontext-Panel aktualisiert sich
live (`update_user_context`).

### 0:45 – Kandidatenliste mit Match-Score (25 s) · `/candidates`

**Kandidaten öffnen.** Filter „Co-Founder" + Vertical „b2b saas".
Publikum sieht: Liste sortiert nach Score, ganz oben Max Brandt und Nils Petersen, Score-Badge,
Persönlichkeitstyp-Chip, gesuchte Rolle.
*„Das ist LinkedIn, aber pivotiert auf meine Frage: Wer sucht genau mich? Der Score ist
erklärbar – Rolle passt, Vertical passt, Dims sind komplementär."*
**Auf eine Score-Erklärung zeigen** (MatchBreakdown / Reasons).

### 1:10 – „Guck dir mal den Max an" (20 s) · `/assistant` → Live-Profil

**Zurück zum Assistenten.** Ins Mikro oder tippen: *„Guck dir mal den Max an."*
Publikum sieht: Rechts erscheint das komplette Profil (Foto, Headline, Erfahrung McKinsey,
Skills, Persönlichkeit) – ausgelöst durch die UI-Action `show_candidate`.
*„Der Agent bedient das Dashboard mit. Kein Suchen, kein Klicken."*
**Auf „Profil öffnen" klicken** → `/candidates/max-brandt`.

### 1:30 – Outreach angepasst an Persönlichkeitstyp (30 s) · `/outreach`

**Outreach öffnen**, Max ist vorausgewählt (oder aus der Shortlist), Kanal **LinkedIn**.
Publikum sieht: Nachricht, die mit der Vision einsteigt, kurz ist, konkreten nächsten Schritt
(Kaffee bei Bits & Pretzels) vorschlägt. Daneben „Warum so formuliert": Visionär → große Linien,
keine Feature-Details.
*„Max ist Visionär. Nils ist Connector – dieselbe Anfrage, anderer Ton."*
**Kandidat auf Nils Petersen wechseln**, die Nachricht ändert sich sichtbar (Beziehung,
gemeinsame Kontakte, Celonis-Bezug). Nachricht ist editierbar → kurz eine Zeile ändern.

### 2:00 – Prep-Pack + Voice-Simulation (30 s) · `/prep/max-brandt`

**„Gespräch vorbereiten"** klicken.
Publikum sieht: „Was Max dich fragen wird" (3 Fragen mit Warum + Antwort-Skizze), Talking Points,
Eisbrecher, Red Flags, die man abklopfen sollte (z. B. „Wer hält wie viel Equity? Er hat schon
eine Idee – bist du dann nur der Umsetzer?").
**Voice-Simulation starten**, ins Mikro: *„Hi Max, ich bin Marvin, ich hab dein Profil gesehen."*
Der Agent antwortet als Max (ungeduldig bei Details, will die große Vision hören). Nach einem
Wechsel **Stop**.
*„Das ist mein Sparringspartner, bevor ich den echten Max anspreche."*

### 2:30 – Team-Radar mit Lücke + Tipps (15 s) · `/team` und `/tips`

**Team öffnen**, Max als Mitglied dazu (Shortlist).
Publikum sieht: Radar-Chart Vision · Design · Technik · Detail · Umsetzung für Marvin + Max.
Technik und Vision stark, **Design/Visuell ist die Lücke**, Erfolgs-Score steigt mit Max.
*„Mit Max sind wir VC-tauglicher – aber uns fehlt jemand fürs Produkt."*
**Tipps öffnen**: erster Tipp priorisiert genau diese Lücke (Design-/Product-Co-Founder oder
frühes Design-Hire), dazu Fundraising-Hinweis mit Markus Fellner als Angel.

### 2:45 – Schluss (10 s)

*„Drei Kontakte statt 569. Eine Nachricht, die zum Menschen passt. Und ein Gespräch, das ich
schon einmal geführt habe, bevor es stattfindet. Das ist Voya."*

---

## C. Fallback-Plan

Grundregel aus `AGENTS.md`: Ohne `OPENAI_API_KEY` liefert jede API einen Template-/Regel-Fallback,
kein 500. Das nennen wir in der Demo **„Offline-Modus"** – nicht „kaputt".

| Was ausfällt | Was du tust | Was du sagst |
|---|---|---|
| Mikrofon / Voice-Session (`/api/realtime/session` liefert 503 oder WebRTC hängt) | Im Assistenten **tippen** statt sprechen. Prep-Simulation als Text-Chat (Modus `prep-simulation`, `/api/chat`). | „Voice ist das Sahnehäubchen – der Agent ist derselbe, nur getippt." |
| Kein Netz / kein OpenAI-Key | Alles läuft weiter: Matching ist regelbasiert, Outreach/Prep/Tipps kommen aus Templates (`generatedBy: "template"`). | „Offline-Modus: Wir sind auf einer Konferenz, das WLAN ist weg – das Produkt funktioniert trotzdem. Mit Key werden die Texte individueller." |
| LLM antwortet langsam (> 5 s) | Nicht warten – parallel weiter zur nächsten Route, Ergebnis beim Zurückkommen zeigen. | „Läuft im Hintergrund, wir gehen schon mal weiter." |
| `/assistant` erkennt „Max" nicht | Direkt `/candidates/max-brandt` im zweiten Tab öffnen. | „Ich spring direkt ins Profil." |
| `npm run dev` stirbt | Terminal: `npm run dev` neu starten (10 s). Bis dahin: Slide mit Screenshot der Kandidatenliste. | Kernbotschaften (D) mündlich überbrücken. |
| Team-Radar leer | Auf `/candidates/max-brandt` **Zur Shortlist** klicken, dann `/team` neu laden. | – |

Vor der Demo einmal bewusst den Offline-Modus durchspielen (Key aus `.env.local` nehmen, Dev-Server
neu starten, `node scripts/smoke.mjs` muss trotzdem grün sein). Dann gibt es keine Überraschung.

---

## D. Drei Kernbotschaften für den Pitch

1. **Zeit sparen.** Statt 569 Profile durchzuklicken, zeigt Voya die drei, die
   *mich* suchen – mit erklärbarem Score aus sichtbaren Quelldaten (Rolle, Vertical, komplementäre
   Stärken). Weniger, aber bessere Anschreiben.
2. **Risiko beim Co-Founder-Match senken.** Persönlichkeitstyp, Team-Radar und Red Flags machen
   sichtbar, was im Team fehlt und wo es knirschen könnte – bevor man ein Jahr zusammen baut.
3. **Gesprächsvorbereitung.** Prep-Pack plus Voice-Simulation: Man weiß, was die Person fragen
   wird, und hat das Gespräch schon einmal geführt. Vom „Hi, cooles Profil" zum Gespräch auf
   Augenhöhe.

Nebensatz, falls jemand nach Daten fragt: Grundlage sind Teilnehmerlisten von Events (IdeaLab 2026)
plus öffentliche LinkedIn-Daten; nichts wird ohne Bestätigung verschickt (`project.md`, Abschnitt 11).
