# Voya: Co-Founder Studio

Lokale React-App für die vorhandenen IdeaLab-/LinkedIn-Kandidaten. Die ursprünglichen Python-Tools bleiben unverändert.

## Starten

Node.js 22.12+ verwenden.

```sh
cd /Users/rene/github.com/RocketRene/openai-hackathon/web
npm install
npm run dev
```

App: http://localhost:5173. Der Server bindet ausschließlich an Loopback. Für einen produktiven Build:

```sh
cd /Users/rene/github.com/RocketRene/openai-hackathon/web
npm run build
npm start
```

Konfigurationsvorlage: `/Users/rene/github.com/RocketRene/openai-hackathon/web/.env.example`.
Lokale Konfiguration: `/Users/rene/github.com/RocketRene/openai-hackathon/web/.env` (Git-ignoriert).
Bestehende Konfiguration nicht überschreiben.

- `OPENAI_API_KEY`: aktiviert Text-Agent und Realtime-Sprache. Niemals mit `VITE_` präfixieren.
- `OPENAI_TEXT_MODEL`: standardmäßig `gpt-4.1-mini`.
- `OPENAI_REALTIME_MODEL`: standardmäßig `gpt-realtime-2.1`, mit normaler Reasoning-Stufe `medium`.
- `REALTIMEKIT_AUTH_TOKEN`: optionaler Teilnehmer-Token eines vorhandenen Cloudflare-RealtimeKit-Meetings.
- `CANDIDATES_FILE`: optionaler absoluter Pfad zum Export; Standard `/Users/rene/github.com/RocketRene/openai-hackathon/exports/all-enriched-profiles.json`.
- `PORT`: standardmäßig 5173.

Nach Konfigurationsänderungen den Server neu starten. Ohne API-Schlüssel funktionieren Profilsuche, Merkliste, Suchprofil, Lebensläufe und lokale Interviewleitfäden. Ein nicht konfigurierter KI-Dialog wird als solcher angezeigt.

## Ablauf

1. Eigene Idee und Stärken besprechen oder das Suchprofil direkt bearbeiten.
2. Der Agent stellt Rückfragen zu Ergänzung, Zeit, Standort, Risiko und Zusammenarbeit.
3. `search_candidates` sucht berufliche Begriffe in den tatsächlichen Profilen. `get_candidate` öffnet Details; `update_brief` aktualisiert bestätigte Anforderungen.
4. Profile können lokal gemerkt und mit dem Agenten besprochen werden.
5. `prepare_interview` erstellt einen 30-Minuten-Leitfaden mit einer konkreten beruflichen Station und offenen Fragen. Download als Markdown. Der Agent kann ihn im Gespräch kontextbezogen ergänzen oder eine ausdrücklich hypothetische Interviewübung begleiten.

Die lokale Suche zählt Suchbegrifftreffer und verwendet keine behaupteten Eignungswahrscheinlichkeiten. Fehlende Angaben werden nicht ergänzt. Sie ist eine lexikalische Suche, keine vollständige semantische Rangfolge; der Agent kann verschiedene Suchbegriffe ausprobieren.

## Verbindungen

Der Sprachagent verwendet OpenAI Realtime über WebRTC mit Unterbrechungen, Transkription und denselben vier Tools wie der Text-Agent. Das Backend erstellt die Session, der Browser verarbeitet Audio und Tool-Events. Mikrofonzugriff beginnt erst nach Klick auf „Gespräch starten“. Ende, Verbindungsfehler und Unmount schließen Tracks und Peer-Verbindung. Text wird während eines Sprachgesprächs nicht parallel gesendet.

Der separat geladene Interviewraum verwendet `@cloudflare/realtimekit-react` und `@cloudflare/realtimekit-react-ui` (`RtkMeeting`). Er benötigt ein bestehendes Cloudflare-Meeting und einen Teilnehmertoken. Jeder Gesprächsteilnehmer braucht einen eigenen Token. Der Raum enthält keinen KI-Teilnehmer und erstellt keine Meetings oder Einladungen. Ein durch RealtimeKit transportierter KI-Bot würde zusätzlich einen serverseitigen Medien-/Bot-Dienst erfordern.

Referenzen:

- [Cloudflare React-Beispiele](https://github.com/cloudflare/realtimekit-web-examples/tree/staging/react-examples)
- [RealtimeKit Quickstart](https://developers.cloudflare.com/realtime/realtimekit/quickstart/)
- [OpenAI WebRTC](https://developers.openai.com/api/docs/guides/voice-webrtc)
- [OpenAI Function Calling](https://developers.openai.com/api/docs/guides/function-calling)

## Daten und Grenzen

Der Export wird nur gelesen, nach Änderung neu geladen und nicht als Frontend-Asset eingebunden. Das Backend gibt ausschließlich ausgewählte berufliche Angaben aus; E-Mail-Adressen, Rohdaten und Zugangsschlüssel bleiben ausgeschlossen. Profiltexte gelten im Agent-Prompt als Daten, nicht als Anweisungen. Quellenstand ist pro Person sichtbar. Der LinkedIn-Linkfilter akzeptiert ausschließlich HTTPS-Links auf linkedin.com bzw. www.linkedin.com mit /in/-Pfad, daher kann seine Anzahl vom historischen Exportzähler abweichen.

Suchprofil und gemerkte IDs bleiben im lokalen Browser. Gespräche werden im Speicher gehalten und können exportiert werden; ein Reload beginnt ein neues Gespräch. Beim KI-Dialog werden Nachrichten und abgerufene berufliche Profildaten an OpenAI übertragen. Es werden keine Personen kontaktiert. Google Fonts wird für die Typografie geladen, mit lokalen Schrift-Fallbacks.

Das Cloudflare-Deployment ist ausdrücklich öffentlich und ohne Anmeldung. Profilsuche, Text-Agent und Sprach-Endpunkte können von allen Besuchern genutzt werden. Der OpenAI-Schlüssel bleibt als Worker-Secret serverseitig. Suchprofil und Gespräch bleiben pro Browser getrennt. Der RealtimeKit-Chunk ist groß und wird erst beim Öffnen des Raums geladen. Der Dependency-Audit meldete eine moderate transitive uuid-Lücke in RealtimeKit; kein erzwungenes Downgrade oder ungeprüfter Major-Override wurde angewendet.

## Prüfung

```sh
cd /Users/rene/github.com/RocketRene/openai-hackathon/web
npm test
npm run build
```

Tests decken Datenminimierung, Linkvalidierung, Wortsuche, Filter, fehlgeschlagene Anreicherung, Interviewgrundlagen, Tool-Validierung, einen vollständigen gemockten Agent-Loop und Providerfehler ab. Browser-Smoke-Test: reale Kandidatensuche, Merkliste, Lebenslauf, Interview und Markdown-Download. Zusätzlich erfolgreicher Live-Text-Agent-Aufruf mit `search_candidates` gegen OpenAI. Der Live-WebRTC-Handshake wurde mit `session.created` für `gpt-realtime` bestätigt. Kein echtes Mikrofon- oder Mehrteilnehmergespräch automatisch gestartet. Mobile Ansicht (390 px) ohne horizontalen Überlauf; Dialoge mit Escape und Fokusführung geprüft.


## Cloudflare-Deployment: Voya

Öffentliche URL: https://voya.ventosa.workers.dev

Verifizierter Stand vom 26.09.2026: 569 Profile, 245 mit LinkedIn-Anreicherung,
247 gültige LinkedIn-Links. Frontend, Profildaten, Interview-API und ein echter
OpenAI-Textdialog wurden ohne Anmeldung erfolgreich geprüft.

Konfiguration: `/Users/rene/github.com/RocketRene/openai-hackathon/web/wrangler.jsonc`.
Worker: `/Users/rene/github.com/RocketRene/openai-hackathon/web/server/worker.mjs`.

```sh
cd /Users/rene/github.com/RocketRene/openai-hackathon/web
npm run secrets:upload
npm run deploy
```

`secrets:upload` überträgt vorhandene Werte von `OPENAI_API_KEY` und optional
`REALTIMEKIT_AUTH_TOKEN` aus der lokalen Umgebung über stdin an Wrangler.
Secret-Werte werden weder protokolliert noch in Dateien für das Deployment geschrieben.
Die Modelle werden als nicht geheime Variablen in der Wrangler-Konfiguration gesetzt.

Der Build übernimmt die normalisierten Profile einschließlich vorhandener
LinkedIn-Berufserfahrung, Ausbildung, Skills, Zusammenfassung und Profil-Links
in das serverseitige Worker-Bundle. Rohdaten und die lokale Konfiguration werden
nicht als statische Dateien ausgeliefert. Der Datenstand wird bei jedem Deployment
neu aus dem lokalen Export übernommen; spätere lokale Anreicherungen benötigen
also ein erneutes Deployment.

Frontend und alle API-Endpunkte sind ohne Anmeldung erreichbar. Ohne
`REALTIMEKIT_AUTH_TOKEN` bleibt nur der separate Interviewraum deaktiviert;
der OpenAI-Sprachagent benötigt diesen Token nicht.


## Profil im Gespräch

Beim Abruf mit `get_candidate` zeigt Voya eine kleine eingebettete Karte direkt
im Gespräch: Profilbild, LinkedIn-Link und zwei berufliche Stationen. Chat,
Mikrofon und Gesprächssteuerung bleiben sichtbar. Auch ein Klick in der
Kandidatenliste wählt nur diese kompakte Karte aus, ohne ein Profilfenster zu öffnen.
Es gibt keinen automatischen Seitensprung zum Profil. Ein vom Agenten erstellter
Interviewleitfaden kann über die Karte heruntergeladen werden.

Im Sprachgespräch erscheinen Profile bereits beim vollständigen Tool-Aufruf.
Doppelte Tool-Ereignisse werden anhand ihrer Call-ID zusammengeführt. Das aktuell
angezeigte Profil wird als Kontext an Text- und Sprachagent übergeben.
