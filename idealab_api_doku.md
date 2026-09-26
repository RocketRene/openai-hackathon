# IdeaLab API — Client-Doku (statisch aus dem APK)

> **Herkunft & Scope.** Diese Doku wurde **rein statisch** aus dem offiziellen Client
> `io.venua.idealab` (`base.apk`) rekonstruiert — dekompiliert mit jadx, ausgelesen aus
> `io/venua/idealab/**`. Es wurde **kein Request an die Produktions-API gesendet**, **kein
> fremder Token benutzt** und **nichts an fremden Konten verändert**. Jeder Endpunkt hier ist
> ein aus dem Client-Code belegtes String-Literal bzw. ein Pfad-Builder — die Quelle steht
> jeweils in Klammern. Verben/Bodies stammen aus den `*Gateway`-Klassen und
> `@Serializable`-DTOs.
>
> Konfidenz-Markierung: **[belegt]** = Pfad/Body direkt im Client gefunden ·
> **[abgeleitet]** = Pfad wird zur Laufzeit zusammengesetzt, Struktur aus DTO/Package erschlossen.

---

## 1. Grundlagen

| Sache | Wert | Quelle |
|---|---|---|
| Base-URL (Prod) | `https://api.inno-com.org/v1` | `core/kernel/config/ApiConfig.BUILD_BASE_URL_OVERRIDE` |
| Base-URL (Fallback/unkonfiguriert) | `https://api.idealab.invalid/v1` | `ApiConfig.UNCONFIGURED_BASE_URL` |
| Debug-Override | launch-/build-Override, nur in Debug-Builds; muss `http`/`https` + valide Authority sein | `ApiConfig.resolveBaseUrl` |
| Analytics (separater Host) | `https://eu.i.posthog.com` | dex-strings (PostHog) |
| WebSocket | `wss://…/v1/ws/chat` (aus `https` → `wss`) | `ApiRoutes.buildWebSocketUrl` |
| HTTP-Stack | OkHttp (HTTP/2) + kotlinx.serialization (JSON) | dex |
| Client-Kennung | `User-Agent: okhttp/5.5.0`, Package `io.venua.idealab` | apk |
| Event-Konstanten | `IdeaLab! 2026`, Vallendar, Tage `2026-09-25`/`2026-09-26` | `ApiConfig` |

**URL-Bau:** `baseUrl` + `/` + `path` (Pfade sind **ohne** führenden Slash, z. B. `me/tickets`),
percent-encoded über `ApiRoutes.buildUrl`.

### 1.1 Auth-Schema

- Header an authentifizierten Requests: **`Authorization: Bearer <access_token>`**
  (`ApiClient`, Literale `"Authorization"` / `"Bearer "`).
- `Content-Type: application/json` bei Body-Requests. Methoden, die zwingend einen Body haben:
  `POST, PUT, PATCH, PROPPATCH, REPORT` (`ApiClient.METHODS_REQUIRING_BODY`).
- **Conditional GET:** GET-Responses werden per **ETag / If-None-Match** gecached
  (`ConditionalGet`, `ServerTimingParser`, `"ETag"`); manche Pfade sind explizit „stores nothing".
- **Token-Ablage:** verschlüsselt im `SecureStore` (Android Keystore/Tink), Schlüssel
  `refresh_token` (`ApiClient.REFRESH_TOKEN_KEY`). Access-Token nur im Speicher (`accessToken`-Mirror).
- **Auto-Refresh:** Bei abgelaufenem Access-Token ruft `ApiClient.refreshAccessToken()` einmalig
  `auth/refresh` auf, ersetzt beide Tokens (rotierendes Refresh-Token) und wiederholt den Request.

---

## 2. Authentication  ·  `io.venua.idealab.authentication`

| Verb | Pfad | Request-Body | Response | Quelle |
|---|---|---|---|---|
| POST | `auth/login` | `{ "email": …, "password": … }` | `{ "access_token": …, "refresh_token": … }` | **[belegt]** `ApiAuthenticationGateway.signIn` (`"POST"`,`"auth/login"`), `LoginRequest`/`LoginForm` |
| POST | `auth/refresh` | `{ "refresh_token": … }` | `{ "access_token": …, "refresh_token": … }` | **[belegt]** `ApiClient.RefreshRequest`/`RefreshResponse` (`"auth/refresh"`) |
| POST | `auth/logout` | `{ "refresh_token": … }` | `LogoutResponse` | **[belegt]** `ApiClient` (`"auth/logout"`) |
| POST | Passwort-Setup / Code-Verify | `RequestCodeRequest` → `email`; `VerifyCodeRequest` → `email`,`code`; `ForgotPasswordRequest` → `email` | Token-Bundle bzw. Status | **[abgeleitet]** `ApiPasswordSetupGateway` (`"code"`,`"verifyCode"`), `ApiActivationGateway`; genauer Pfad wird zur Laufzeit gebaut |

**DTO — `LoginRequest`/`LoginForm`:** Felder `email`, `password` (beide required).
**DTO — `RefreshRequest`:** `refresh_token`. **`RefreshResponse`:** `access_token`, `refresh_token`.

### 2.1 Eigenen Token selbst erneuern (dein eigenes Konto)

Nur mit **deinen eigenen** Test-Credentials bzw. deinem eigenen Refresh-Token — so macht es der Client auch:

```bash
# a) Login → erstes Token-Paar (eigenes Konto)
curl -s https://api.inno-com.org/v1/auth/login \
  -H 'Content-Type: application/json' \
  -H 'User-Agent: okhttp/5.5.0' \
  -d '{"email":"DEINE_MAIL","password":"DEIN_PASSWORT"}'
# → {"access_token":"…","refresh_token":"…"}

# b) Access-Token erneuern, wenn es abgelaufen ist (Refresh rotiert!)
curl -s https://api.inno-com.org/v1/auth/refresh \
  -H 'Content-Type: application/json' \
  -H 'User-Agent: okhttp/5.5.0' \
  -d '{"refresh_token":"DEIN_REFRESH_TOKEN"}'
# → neues {"access_token":"…","refresh_token":"…"}  (altes Refresh-Token ist danach verbraucht)
```

> Wichtig: Das Refresh-Token ist **single-use/rotierend** — nach jedem `auth/refresh` gilt nur
> noch das neu zurückgegebene. Immer das jeweils letzte speichern.

---

## 3. Profile  ·  `io.venua.idealab.profile` / `networking`

| Verb | Pfad | Body / Query | Response | Quelle |
|---|---|---|---|---|
| GET | `profiles/me` | — | `ProfileData` | **[belegt]** `NetworkingPaths.ME`, mehrere Gateways |
| PATCH | `profiles/me` | `ProfileUpdateRequest` | `ProfileData` | **[abgeleitet]** `dashboard/application/ProfileUpdateRequest` |
| POST/PUT | `profiles/me/avatar` | **multipart/form-data**, Teil `image/jpeg` | Avatar-Meta | **[belegt]** `ProfilePhotoMultipart` (`"profiles/me/avatar"`, `multipart/form-data; boundary=`) |
| GET | `profiles/{id}` | — | `ProfileData` | **[belegt]** `NetworkingPaths.profile()` = `"profiles/" + id` |
| POST | `profiles/{id}/block` | `{ "reason": … }` | — | **[belegt]** `NetworkingPaths.block()`, `BlockBody` |
| POST | `profiles/{id}/report` | `{ "category": …, "details": … }` | — | **[belegt]** `NetworkingPaths.report()`, `ReportBody` |
| GET | `me/tickets` | — | `TicketsEnvelope` | **[belegt]** `ApiRoutes.TICKET_CREDENTIALS_PATH` |
| GET/POST | `me/export` | — | `ExportDataResponse` (DSGVO-Datenexport) | **[belegt]** `"me/export"`, `profile/infrastructure/ExportDataResponse` |

---

## 4. Matching  ·  `io.venua.idealab.matching`

| Verb | Pfad | Query / Body | Response | Quelle |
|---|---|---|---|---|
| GET | `matching/candidates` | optional `role`, `interest` (mehrfach), `page`, `limit` | `MatchCandidateListDto` | **[belegt]** `MatchingEndpoint.candidates()` |
| GET | `matching/candidates?segment=complement&page=&limit=` | Paging | `MatchCandidateListDto` | **[belegt]** `MatchingEndpoint.complementCandidates()` |
| POST | `matching/swipes` | `{ "subject_profile_id": …, "direction": "like"\|… }` | `{ "matched": bool }` | **[belegt]** `SwipeBody`, `SwipeAnswer`, `ApiPendingLikesGateway` |
| GET | `matching/likes?direction=like` | — | `PendingLikeListResponse` | **[belegt]** `PendingLikeDirection` (`"matching/likes?direction="`) |
| GET | `matching/jobs?page=&limit=` | Paging | `MatchJobListDto` | **[belegt]** `MatchingEndpoint.jobs()` |
| POST | `matching/job-swipes` | `JobSwipeRequestDto` | `JobSwipeResponseDto` | **[belegt]** `"matching/job-swipes"` |
| GET | `matching/job-swipes?direction=like` | — | Liste | **[belegt]** `MatchingEndpoint.LIKED_JOB_SWIPES` |

### 4.1 DTO — `MatchCandidateDto` (das Kandidaten-Objekt)

Felder (in Serialisierungs-Reihenfolge): `id`, `display_name`, `role`, `company`, `job_title`,
`university`, `bio`, `avatar_url`, `interests` (Liste), `match_score` (Int),
`photo_focal_point` (`{x,y}`), `startup_stage`, `startup_one_liner`.
Quelle: `MatchCandidateDto$$serializer`. (Deckt sich 1:1 mit den Feldern in `idealab_candidates.json`.)

---

## 5. Connections  ·  `io.venua.idealab.networking`

| Verb | Pfad | Body / Query | Quelle |
|---|---|---|---|
| GET | `connections?status=accepted` | — | **[belegt]** mitm-Log + `NetworkingPaths.CONNECTIONS` |
| GET | `connections?status=pending&direction=incoming\|outgoing` | — | **[belegt]** `NetworkingPaths.pendingRequests()` |
| POST | `connections` | `{ "target_profile_id": …, "note": … }` | **[belegt]** `ApiAttendeeDetailGateway` (`"POST"`,`"connections"`), `ConnectionRequestBody` |
| PATCH | `connections/{id}` | `ConnectionRequestAnswer` `{ "id": … }` (annehmen/ablehnen) | **[belegt]** `ApiConnectionRequestsGateway` (PATCH), `NetworkingPaths.connection()` |
| DELETE | `connections/{id}` | — (Verbindung zurückziehen/entfernen) | **[belegt]** `ApiAttendeeDetailGateway` (`"DELETE"`) |

---

## 6. Meetings  ·  `io.venua.idealab.meetings`

| Verb | Pfad | Body | Quelle |
|---|---|---|---|
| GET | `meetings?status=accepted` | — | **[belegt]** mitm-Log, `ApiMeetingsGateway` |
| POST | `meetings` | `MeetingCreateRequestDto` | **[belegt]** `ApiMeetingsGateway` (`"POST"`,`"meetings"`) |
| GET | `meetings/{id}` | — | **[belegt]** `ApiMeetingsGateway` (GET) |
| PATCH | `meetings/{id}` | `MeetingUpdateRequestDto` | **[belegt]** `ApiMeetingsGateway` (PATCH) |
| GET | `meetings/suggestions` (+ `/{id}`) | — | **[abgeleitet]** `MeetingSuggestionsResponseDto`, `MeetingSlotSuggestionDto` |

DTO-Felder: `MeetingItemDto`, `MeetingParticipantDto`, `MeetingSlotSuggestionDto` (Teilnehmer, Slots).

---

## 7. Chat / Messages  ·  `io.venua.idealab.chat` / `notifications`

| Verb | Pfad | Notiz | Quelle |
|---|---|---|---|
| GET (Upgrade) | `ws/chat` → `wss://…/v1/ws/chat` | WebSocket-Chat (101 Switching Protocols) | **[belegt]** `"ws/chat"`, `buildWebSocketUrl`, `webSocketRequest` |
| GET | `messages/{id}` | einzelne Nachricht | **[belegt]** mitm-Log |
| PATCH | `messages/{id}` | Nachricht ändern (z. B. gelesen) | **[belegt]** mitm-Log |
| GET | `device-inbox/messages` | Geräte-Inbox | **[belegt]** mitm-Log |
| POST | `device-inbox/messages/ack` bzw. `…/read` | Ack/Read | **[abgeleitet]** Package + `"/read"` |
| POST | Push-Registrierung | `DeviceTokenRequest` (`deviceToken`/`fcmToken`) | **[abgeleitet]** `notifications/infrastructure/DeviceTokenRequest`, `SendMessageRequest` |

---

## 8. Inhalte / Agenda / Venue (überwiegend GET, ETag-gecached)

| Verb | Pfad | Response-DTO | Quelle |
|---|---|---|---|
| GET | `app-config` | Remote-Feature-Config | **[belegt]** mitm + `"app-config"` |
| GET | `formats` | Session-Formate | **[belegt]** `"formats"` |
| GET | `partners` | `PartnerListResponse` (+ `PartnerFullDetail`, `TeamMember`) | **[belegt]** `"partners"` |
| GET | `speakers` | Speaker-Liste | **[belegt]** `"speakers"` |
| GET | `stages` | Bühnen | **[belegt]** `"stages"` |
| GET | `sessions`, `sessions/{id}` | Agenda-Sessions | **[belegt]** mitm + `"sessions"` |
| GET | `saved-sessions`, `saved-sessions/calendar.ics` | gemerkte Sessions / iCal | **[belegt]** `"saved-sessions/calendar.ics"` |
| GET | `workshops` | `WorkshopListResponse`/`WorkshopItem`/`WorkshopOffer` | **[belegt]** `"workshops"` |
| POST | `workshops/{id}/registration` · `…/offers/{id}/{join\|accept\|decline}` | `WorkshopRegistrationOutcome` | **[belegt]** Pfad-Fragmente `"/registration"`,`"/offers/"`,`"/join"`,`"/accept"`,`"/decline"` |
| GET | `jobs`, `jobs/{id}` | Job-Liste/Detail | **[belegt]** `"GET","jobs/"+id` |
| GET | `stories`, POST `stories/{id}/view-state` | `Story`/`StoryItem`, `StoryViewStateRequest` | **[belegt]** `"stories"`, `"/view-state"`, `ApiStoryViewStateGateway` |
| GET | `venue/floorplans` | Grundrisse | **[belegt]** `"venue/floorplans"` |
| GET/POST | `venue/route` | `VenueRouteRequest` → `VenueRouteResponse` (Indoor-Routing) | **[belegt]** `"venue/route"`, `core/model/VenueRoute*` |
| GET | `onboarding/roles` | Rollen-Katalog fürs Onboarding | **[belegt]** `"onboarding/roles"` |
| GET | `notifications/unread-count` | ungelesen-Zähler | **[belegt]** `"notifications/unread-count"` |
| POST | `notifications/read-all` | alles gelesen | **[belegt]** `"notifications/read-all"` |
| GET | `menu/developer-banner` | Dev-/Feature-Banner | **[belegt]** `"menu/developer-banner"` |
| GET/PATCH | Reminder-Settings (`…/reminder`) | `ReminderSettingsResponse`/`…UpdateRequest` | **[belegt]** `ApiReminderSettingsGateway`, `"/reminder"` |
| POST | `support/transportation/connection` | Transport-/Anreise-Chat | **[belegt]** `ApiTransportationChatGateway` |

---

## 9. Deep-Link- / Web-Hosts (aus dem Manifest)

`idealab.io`, `idealab.inno-com.org`, `www.idealab.io/{imprint,privacy-policy,terms-and-conditions}`.

---

## 10. Feature-Module (Clean Architecture)

Jedes Modul hat `application` / `domain` / `infrastructure` (+ `presentation`):
`agenda, analytics, authentication, chat, jobs, matching, meetings, networking, notifications,
partners, profile, schedule, settings, stories, venue, workshops` — plus
`core/{network, session, appconfig, kernel, storage, model, …}`.
Die API-Clients heißen durchgängig `Api<Feature>Gateway` und rufen `ApiClient.request(method, path, …)`.

---

## 11. Was hier bewusst NICHT drinsteht

- Keine mitgeschnittenen/fremden Tokens, keine Live-Antworten von `api.inno-com.org`.
- Kein automatisiertes Abgreifen weiterer Nutzerprofile und keine LinkedIn-Anreicherung.
- Diese Datei dokumentiert die **Client-Sicht**; die tatsächlichen Server-Berechtigungen
  (was ein Token wirklich darf) lassen sich hieraus nur ableiten, nicht beweisen — dafür wäre
  ein autorisierter Test gegen eine Staging-Umgebung nötig.
