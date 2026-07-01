# Backend / API Audit Report

**Agente:** backend-api-auditor  
**Data/ora audit:** 2026-07-01  
**Repository:** Plant Monitor Performance  
**Scope:** `apps/web/server/`, `apps/web/api/index.ts` (Vercel entry), middleware auth/cron/error, Prisma data access, R2 storage, Groq AI  
**Fase:** Audit only — nessuna modifica codice  
**Stato:** COMPLETATO (analisi statica)

---

## 1. Agente e metodo

| Campo | Valore |
|-------|--------|
| Agente | `backend-api-auditor` (`.cursor/agents/backend-api-auditor.md`) |
| Metodo | Revisione statica del codice sorgente, inventario endpoint, tracciamento auth/validazione/errori, grep pattern rischiosi |
| Evidenza | Lettura diretta di 34 file TS server (esclusi test), `app.ts`, middleware, 14 router moduli, lib storage/supabase/prisma/env |
| Non eseguito | Test runtime, chiamate HTTP live, verifica env produzione Vercel, penetration test |

---

## 2. Architettura backend

```
Vercel rewrite: /api/* → apps/web/api/index.ts → server/app.ts (Express)
```

| Layer | Tecnologia | Note |
|-------|------------|------|
| HTTP | Express 4 | Single app exportata come serverless function Vercel |
| Dati | Prisma → PostgreSQL (Supabase) | Accesso diretto via `DATABASE_URL`; **non** via Supabase JS client |
| Auth | JWT custom (`jsonwebtoken`) | Flag `AUTH_ENABLED`; ruoli: admin, assistenza, commerciale |
| File | R2 (prod) / local filesystem (dev) | PDF privati, download stream via API |
| AI | Groq REST (`groq.client.ts`) | Solo backend; key `GROQ_API_KEY` |
| Supabase client admin | `getSupabaseAdmin()` in `lib/supabase.ts` | **Definito ma mai importato/usato** |

**Assenza Next.js App Router API routes / server actions:** nessun file in `apps/web/app/api/`; tutta la API passa da Express.

---

## 3. Inventario endpoint (47 route)

### 3.1 Pubblici (senza JWT quando `AUTH_ENABLED=true`)

| Metodo | Path | Middleware | Note |
|--------|------|------------|------|
| GET | `/api/health` | — | Espone stato stack (Supabase, R2 bucket, Groq) |
| POST | `/api/auth/login` | Zod loginSchema | Credenziali → JWT 8h |
| GET | `/api/auth/status` | — | Ritorna `{ authEnabled }` |
| GET | `/api/cron/db-check` | `requireCronSecret` | Keepalive DB; bypass locale se no `CRON_SECRET` |

### 3.2 Protetti da `requireAuthUnlessPublic` (global `/api`)

Tutti gli endpoint sotto richiedono JWT valido **solo se** `AUTH_ENABLED=true`. Con auth disabilitata, passano tutti senza token.

| Modulo | Prefix | GET | POST | PATCH | DELETE | Write guard |
|--------|--------|-----|------|-------|--------|-------------|
| auth | `/api/auth` | `/me` | `/login` | — | — | `/me` → requireAuth |
| ai | `/api/ai` | `/status` | `/ping` | — | — | `/ping` → requireRoles(admin, assistenza) |
| sectors | `/api/sectors` | `/`, — | `/` | `/:id` | `/:id` | requireWriteAccess |
| customers | `/api/customers` | `/`, `/:id` | `/` | `/:id` | `/:id` | requireWriteAccess |
| plant-types | `/api/plant-types` | `/` | `/` | `/:id` | `/:id` | requireWriteAccess |
| plants | `/api/plants` | `/`, `/:id` | `/` | `/:id` | `/:id` | requireWriteAccess |
| units | `/api/units` | `/` | `/` | `/:id` | — | requireWriteAccess |
| chemical-parameters | `/api/chemical-parameters` | `/` | `/` | `/:id` | — | requireWriteAccess |
| sampling-points | `/api/sampling-points` | `/` | `/` | `/:id` | — | requireWriteAccess |
| limits | `/api/limits` | `/`, `/resolve` | `/` | `/:id` | `/:id` | requireWriteAccess |
| measurement-sessions | `/api/measurement-sessions` | `/`, `/export`, `/:id` | `/` | `/:id` | `/:id` | requireWriteAccess |
| measurements | `/api/measurements` | — | — | `/:id` | `/:id` | requireWriteAccess |
| analytics | `/api/analytics` | 4 route | — | — | — | Solo lettura |
| documents | `/api/documents` | `/`, `/:id/download` | `/upload` | — | `/:id` | upload/delete → requireWriteAccess |

**Totale:** 47 handler HTTP mappati.

---

## 4. Evidenza positiva

| Area | Evidenza | Valutazione |
|------|----------|-------------|
| Validazione input mutazioni | Zod su auth, customers, plants, limits, measurements, documents upload, AI ping | Buono |
| Error handling centralizzato | `asyncHandler` + `errorHandler`; Zod → 400; Prisma P2002 → 409; altro → 500 generico | Buono |
| Service role non in frontend | `SUPABASE_SERVICE_ROLE_KEY` solo in `server/lib/config.ts`; frontend usa anon key helper non referenziato altrove | OK |
| Groq key backend-only | `getGroqEnv()` legge `GROQ_API_KEY`; commento esplicito anti-`NEXT_PUBLIC_` | OK |
| PDF upload | multer memory, MIME `application/pdf`, size limit `MAX_PDF_SIZE_MB`, UUID filename | OK |
| R2 privato | Nessun URL pubblico; download via stream autorizzato API | OK (con riserva auth) |
| Ruolo commerciale read-only | `requireWriteAccess` blocca write per `commerciale` | OK (se auth attiva) |
| AI endpoint ristretto | `/api/ai/ping` → admin + assistenza | OK |
| Audit log parziale | limits, measurement_sessions, documents → `writeAuditLog` | Parziale |
| Compliance limiti | `resolveLimit` + priority plant > customer > plant_type > sector > global; snapshot su measurement | OK |
| Cron Vercel | `requireCronSecret`; 503 su Vercel se secret mancante | OK in prod |
| Test unitari backend | auth.test, resolve-limit, limit-priority, groq.client, ai.service, db-check | Presenti |

---

## 5. Problemi rilevati

### 5.1 CRITICAL

#### C1 — API completamente aperta se `AUTH_ENABLED≠true`

| Campo | Dettaglio |
|-------|-----------|
| **Severity** | CRITICAL |
| **File** | `apps/web/server/middleware/auth.ts` (L6-7, L38-40, L46-48, L67-69), `apps/web/server/app.ts` (L68) |
| **Rischio** | Con default `.env.example` (`AUTH_ENABLED=false`), **tutti** gli endpoint dati (clienti, rilevazioni, PDF download/upload, limiti, analytics) sono accessibili senza autenticazione. In produzione equivale a data breach totale. |
| **Proposta** | In produzione (`VERCEL=1`): fail-fast se `AUTH_ENABLED` non è `true`. Oppure invertire default a `true` e usare `AUTH_ENABLED=false` solo in dev locale documentato. |

#### C2 — JWT secret debole di fallback

| Campo | Dettaglio |
|-------|-----------|
| **Severity** | CRITICAL |
| **File** | `apps/web/server/middleware/auth.ts` (L10), `apps/web/server/lib/config.ts` (L19), `apps/web/server/modules/auth/auth.routes.ts` (L33) |
| **Rischio** | Fallback `"dev-secret-change-me"` se `JWT_SECRET` assente → token forgeable, impersonation admin. |
| **Proposta** | `requireEnv("JWT_SECRET")` in startup quando auth attiva; lunghezza minima ≥32 char; rifiutare avvio in prod senza secret esplicito. |

#### C3 — Download PDF IDOR (Insecure Direct Object Reference)

| Campo | Dettaglio |
|-------|-----------|
| **Severity** | CRITICAL |
| **File** | `apps/web/server/modules/documents/documents.routes.ts` (L96-117) |
| **Rischio** | `GET /api/documents/:id/download` verifica solo esistenza documento, **non** autorizzazione per cliente/impianto. Qualunque utente autenticato (o anonimo se auth off) con UUID può scaricare PDF altrui. Violazione regola "PDF solo via API autorizzata". |
| **Proposta** | Verificare permesso utente sul `customerId` del documento; opzionale audit log download; rate limit; UUID non enumerabile mitiga parzialmente ma non sufficiente. |

---

### 5.2 HIGH

#### H1 — Upload documento senza validazione relazioni FK

| Campo | Dettaglio |
|-------|-----------|
| **Severity** | HIGH |
| **File** | `apps/web/server/modules/documents/documents.routes.ts` (L59-82) |
| **Rischio** | `customerId`, `plantId`, `measurementSessionId` accettati senza verificare che plant appartenga a customer o session a plant. Metadati inconsistenti / associazione errata. |
| **Proposta** | Query di validazione cross-entity prima di `prisma.document.create`. |

#### H2 — Sessione rilevazione: `customerId` non allineato a `plantId`

| Campo | Dettaglio |
|-------|-----------|
| **Severity** | HIGH |
| **File** | `apps/web/server/modules/measurements/measurements.routes.ts` (L258-301) |
| **Rischio** | POST accetta `customerId` e `plantId` indipendenti; usa `plant.customerId` per limiti ma salva `data.customerId` nel record. Possibile inconsistenza dati ufficiali. |
| **Proposta** | Forzare `customerId = plant.customerId` o 400 se mismatch. |

#### H3 — Cron endpoint bypass locale

| Campo | Dettaglio |
|-------|-----------|
| **Severity** | HIGH (dev/staging esposti) |
| **File** | `apps/web/server/middleware/cron-auth.ts` (L6-11) |
| **Rischio** | Senza `CRON_SECRET` e fuori Vercel → `next()` senza auth. Endpoint esegue query DB e upsert system_check. |
| **Proposta** | Richiedere sempre secret; solo in test esplicito bypass. |

#### H4 — CORS `origin: true` + `credentials: true`

| Campo | Dettaglio |
|-------|-----------|
| **Severity** | HIGH |
| **File** | `apps/web/server/app.ts` (L39) |
| **Rischio** | Qualsiasi origine può fare richieste credenziate cross-origin se token in header (meno grave) o se auth disabilitata. Amplifica superficie CSRF/cross-origin abuse. |
| **Proposta** | Whitelist origini (`NEXT_PUBLIC_APP_URL`, localhost dev). |

#### H5 — Autorizzazione solo a livello Express; RLS non applicata al backend

| Campo | Dettaglio |
|-------|-----------|
| **Severity** | HIGH (architetturale) |
| **File** | `apps/web/server/lib/prisma.ts`, `apps/web/prisma/migrations/20260630160000_enable_rls/migration.sql` |
| **Rischio** | Prisma usa connessione diretta PostgreSQL (`pmp_app` role con policy `USING (true)`). `getSupabaseAdmin()` mai usato. Tutta la sicurezza dati dipende da middleware Express — single point of failure. Nessun tenant isolation (app single-tenant, OK), ma nessuna difesa in depth. |
| **Proposta** | Documentare modello threat; considerare policy RLS granulari se multi-tenant futuro; non esporre PostgREST anon. |

#### H6 — Operazioni distruttive senza `requireRoles("admin")`

| Campo | Dettaglio |
|-------|-----------|
| **Severity** | HIGH |
| **File** | `limits.routes.ts` DELETE, `sectors.routes.ts` DELETE, `plant-types.routes.ts` DELETE |
| **Rischio** | Ruolo `assistenza` può hard-delete limiti, settori, tipologie impianto. Impatto integrità dati e compliance. |
| **Proposta** | DELETE su entità master → solo admin; soft-delete dove possibile. |

---

### 5.3 MEDIUM

#### M1 — `/api/health` information disclosure

| Campo | Dettaglio |
|-------|-----------|
| **Severity** | MEDIUM |
| **File** | `apps/web/server/app.ts` (L45-64) |
| **Rischio** | Espone bucket R2, provider stack, stato config senza auth. |
| **Proposta** | Health minimale pubblico; dettagli solo autenticati admin o rimuovere bucket name. |

#### M2 — Nessun rate limiting su `/api/auth/login`

| Campo | Dettaglio |
|-------|-----------|
| **Severity** | MEDIUM |
| **File** | `apps/web/server/modules/auth/auth.routes.ts` |
| **Rischio** | Brute-force password senza throttling/lockout. |
| **Proposta** | Rate limit IP, exponential backoff, captcha dopo N tentativi. |

#### M3 — Query analytics/measurements senza Zod

| Campo | Dettaglio |
|-------|-----------|
| **Severity** | MEDIUM |
| **File** | `analytics.routes.ts`, `measurements.routes.ts` (query params) |
| **Rischio** | `new Date(String(from))` su input invalido → Invalid Date silent; nessun limite export CSV (potenziale DoS memoria). |
| **Proposta** | Zod per query; paginazione export; max date range. |

#### M4 — Limit create/update: `scopeId` non validato per scope

| Campo | Dettaglio |
|-------|-----------|
| **Severity** | MEDIUM |
| **File** | `apps/web/server/modules/limits/limits.routes.ts` (L11-23, L87-97) |
| **Rischio** | `scopeType=customer` con `scopeId` null o inesistente → limiti orphan/non risolvibili. |
| **Proposta** | Validazione condizionale Zod + FK check. |

#### M5 — PATCH measurement-session non ricalcola compliance

| Campo | Dettaglio |
|-------|-----------|
| **Severity** | MEDIUM |
| **File** | `apps/web/server/modules/measurements/measurements.routes.ts` (L323-351) |
| **Rischio** | Modifica date/plant senza aggiornare snapshot limiti delle misure figlie. |
| **Proposta** | Ricalcolo batch o bloccare campi immutabili post-confirm. |

#### M6 — Audit log incompleto

| Campo | Dettaglio |
|-------|-----------|
| **Severity** | MEDIUM |
| **File** | customers, plants, sectors, units, parameters — nessun `writeAuditLog` |
| **Rischio** | Tracciabilità incompleta vs requisito AGENTS.md per mutazioni. |
| **Proposta** | Estendere audit a tutte le mutazioni. |

#### M7 — Errore multer non-PDF → 500

| Campo | Dettaglio |
|-------|-----------|
| **Severity** | MEDIUM |
| **File** | `documents.routes.ts` (L24-30), `error-handler.ts` |
| **Rischio** | `cb(new Error(...))` non gestito come 400; possibile leak stack in console. |
| **Proposta** | Middleware error handler multer → 400 JSON. |

#### M8 — Project ref Supabase hardcoded

| Campo | Dettaglio |
|-------|-----------|
| **Severity** | MEDIUM |
| **File** | `apps/web/server/lib/env.ts` (L10-11) |
| **Rischio** | `SUPABASE_PROJECT_REF` e region in sorgente; accoppiamento e info reconnaissance. |
| **Proposta** | Derivare da `NEXT_PUBLIC_SUPABASE_URL` o env dedicata. |

---

### 5.4 LOW

#### L1 — `getSupabaseAdmin()` dead code

| Campo | Dettaglio |
|-------|-----------|
| **Severity** | LOW |
| **File** | `apps/web/server/lib/supabase.ts` |
| **Rischio** | Confusione architetturale; future import errati potrebbero bypassare pattern Prisma. |
| **Proposta** | Rimuovere o usare per health check/auth futura. |

#### L2 — `getSupabaseBrowser()` unused in frontend

| Campo | Dettaglio |
|-------|-----------|
| **Severity** | LOW |
| **File** | `apps/web/src/lib/supabase.ts` |
| **Rischio** | Dead code; se usato in futuro senza RLS policies anon → exposure. |
| **Proposta** | Rimuovere finché non serve Supabase Auth realtime. |

#### L3 — Groq: nessun system prompt anti-injection

| Campo | Dettaglio |
|-------|-----------|
| **Severity** | LOW (delegare ad ai-security agent) |
| **File** | `apps/web/server/modules/ai/groq.client.ts` (L64-68) |
| **Rischio** | Solo messaggio user; nessuna delimitazione input; output non validato strutturalmente. |
| **Proposta** | System prompt fisso, max length, sanitization (già 500 char in route). |

#### L4 — JWT 8h senza refresh/revoca

| Campo | Dettaglio |
|-------|-----------|
| **Severity** | LOW |
| **File** | `auth.routes.ts` (L34) |
| **Rischio** | Token rubato valido fino a scadenza. |
| **Proposta** | Refresh token, blacklist, o migrazione Supabase Auth. |

#### L5 — Prisma presente (stack method note)

| Campo | Dettaglio |
|-------|-----------|
| **Severity** | LOW (informativo) |
| **File** | `apps/web/server/lib/prisma.ts` |
| **Rischio** | Metodo agentic preferisce Supabase client; Prisma usato come ORM su PG Supabase — accettabile se documentato. |
| **Proposta** | Nessuna azione immediata; allineare doc architettura. |

---

## 6. Mock / fallback / risposte finte

| Tipo | Trovato | Location | Valutazione |
|------|---------|----------|-------------|
| Mock endpoint API | No | — | OK |
| Risposte success finte | No | Errori reali da Prisma/Groq/R2 | OK |
| Fallback auth fake user | No | Auth off = bypass, non fake user | Rischio C1 |
| Dati statici in handler | No | Dashboard/analytics query DB reale | OK |
| localStorage come DB backend | No | Solo frontend token (`api.ts`) | Fuori scope backend |
| Demo seed | Sì | `apps/web/prisma/seed.ts` | Isolato seed dev, non runtime API |
| Storage local fallback | Sì | `lib/storage/index.ts` | Dev-only se `STORAGE_BACKEND=local`; prod default R2 |

**Conclusione mock/fallback:** nessun mock endpoint backend. Fallback critico: **auth disabilitata** e **storage locale** in assenza credenziali R2.

---

## 7. Supabase / R2 / Groq — sintesi integrazioni

### Supabase
- **Uso reale:** PostgreSQL via Prisma (`DATABASE_URL`)
- **Client JS admin:** implementato, **non usato**
- **Client JS browser:** presente frontend, **non referenziato**
- **RLS:** abilitata su tabelle; role `pmp_app` ha policy permissiva `USING (true)` — non protegge da compromissione backend

### R2
- Upload: `PutObjectCommand`, key prefissata `documents/`
- Download: `GetObjectCommand` stream — **senza signed URL** (corretto per API proxy)
- Exists: `HeadObjectCommand`
- Nessuna esposizione bucket pubblico nel codice

### Groq
- Endpoint: `POST /api/ai/ping`, `GET /api/ai/status`
- Timeout 15s, max_tokens 256, temperature 0.2
- Errori Groq mascherati come 502 generico (no leak API key)
- Non configurato → 503 su ping

---

## 8. Blockers

| ID | Blocker | Impatto audit |
|----|---------|---------------|
| B1 | Nessun accesso env produzione Vercel | Non verificato se `AUTH_ENABLED=true` e `JWT_SECRET` robusto in prod |
| B2 | Nessun test HTTP integrazione eseguito | Stato auth/download non verificato runtime |
| B3 | Supabase MCP non invocato in questa fase | RLS/policy non validate live (delegato a supabase-db-auditor) |

---

## 9. Endpoint da correggere (priorità)

| Priorità | Endpoint | Azione |
|----------|----------|--------|
| P0 | `GET /api/documents/:id/download` | Autorizzazione per customer + audit |
| P0 | Tutti `/api/*` (auth off) | Enforce auth in produzione |
| P0 | Startup | Require `JWT_SECRET` forte |
| P1 | `POST /api/documents/upload` | Validazione FK plant/customer/session |
| P1 | `POST /api/measurement-sessions` | Allineamento customerId/plantId |
| P1 | `GET /api/cron/db-check` | Secret obbligatorio sempre |
| P2 | DELETE limits/sectors/plant-types | Solo admin |
| P2 | `GET /api/health` | Ridurre disclosure |
| P2 | `POST /api/auth/login` | Rate limit |

---

## 10. Test richiesti (post-fix)

| Test | Tipo | Obiettivo |
|------|------|-----------|
| Auth disabled in prod | Integration / deploy check | Fail startup o 401 su tutti i dati |
| Document download IDOR | Integration | User A non scarica doc di customer B |
| Document upload FK | Integration | 400 su plantId non del customerId |
| Measurement session mismatch | Unit/Integration | 400 se customerId ≠ plant.customerId |
| Cron without secret | Integration | 401 locale e Vercel |
| Login brute force | Load | Rate limit attivo |
| JWT weak secret | Unit | Startup rejection |
| Groq ping unauthorized | Integration | 403 commerciale, 401 no token |
| Export CSV large dataset | Performance | Memory bound / pagination |
| R2 roundtrip | E2E | Upload + download stream bytes match |

---

## 11. Handoff

### 11.1 API analizzate
47 endpoint Express su 14 moduli + health + cron. Entry Vercel: `apps/web/api/index.ts`.

### 11.2 Rischi principali
1. Auth bypass totale con `AUTH_ENABLED=false` (default example)
2. JWT secret prevedibile
3. IDOR download PDF
4. Validazione relazioni incompleta su documenti e rilevazioni
5. Autorizzazione solo middleware — nessuna difesa DB granular

### 11.3 Endpoint da correggere
Vedi sezione 9 — priorità P0: documents download, auth prod enforcement, JWT secret.

### 11.4 Mock/fallback trovati
Nessun mock API. Fallback: auth disabled, local storage, JWT/cron secret opzionali in dev.

### 11.5 Test richiesti
Vedi sezione 10 — minimo 10 scenari prima di dichiarare MVP sicuro.

### 11.6 Stato finale

| Criterio | Stato |
|----------|-------|
| Inventario endpoint | COMPLETATO |
| Validazione Zod mutazioni | PARZIALE (query params no) |
| Auth endpoint privati | PARZIALE — dipende da env |
| PDF via API autorizzata | **NON CONFORME** (IDOR) |
| Service role in frontend | CONFORME |
| Groq server-side only | CONFORME |
| Errori sensibili al browser | PARZIALE — console.error stack server-side |
| Cross-tenant | N/A (single-tenant) |
| MVP backend sicuro produzione | **NON CONFORME** — 3 CRITICAL aperti |

---

## 12. Riepilogo severity

| Severity | Count |
|----------|-------|
| CRITICAL | 3 |
| HIGH | 6 |
| MEDIUM | 8 |
| LOW | 5 |

**Prossimo agente suggerito:** security-privacy-auditor (overlap IDOR/auth), r2-document-auditor (download flow), env-secrets-auditor (JWT/AUTH prod).

---

*Report generato da backend-api-auditor — fase audit only, nessuna modifica a `11_EXECUTION_LOG.md` (riservato a fase fix).*
