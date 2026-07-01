# Env & Deploy Secrets Audit

**Data/ora audit:** 2026-07-01  
**Agente:** env-secrets-auditor  
**Repository:** Plant Monitor Performance  
**Scope:** `.env.example`, `.gitignore`, uso env nel codice, `NEXT_PUBLIC_*`, service role, Groq, R2, Vercel production/preview  
**Regola:** nessun valore segreto reale in questo report.

---

## 1. Executive summary

| Area | Esito | Note |
|------|-------|------|
| `.gitignore` | OK | `.env`, `.env.local`, `.env.*.local` esclusi |
| Tracciamento Git | OK | Solo `.env.example` versionato |
| `.env` locale | OK | Tutte le variabili richieste presenti, nessun placeholder |
| Vercel Production | OK | 18 variabili configurate (encrypted) |
| Vercel Preview | OK | Stesso set di Production |
| `NEXT_PUBLIC_*` | OK | Solo URL + anon key Supabase (+ API URL opzionale dev) |
| Service role | OK | Solo server-side |
| Groq | OK | Solo server-side, presente su Vercel |
| R2 | OK | Solo server-side, presente su Vercel |
| Esposizione chiavi nel frontend | Nessuna | Nessun `NEXT_PUBLIC_GROQ_*`, `NEXT_PUBLIC_R2_*`, service role in `apps/web/src` |
| Rischi residui | Bassi | Project ref in `.env.example`/codice; fallback JWT dev; health endpoint pubblico |

**Stato finale:** **CONFORME con fix minori consigliati** — nessun blocker critico su env/deploy.

---

## 2. Metodologia

1. Lettura `.cursor/agents/env-secrets-auditor.md` e regole workspace.
2. Analisi `.env.example`, `.gitignore`, `git ls-files` su file env.
3. Grep su `process.env`, `NEXT_PUBLIC_*`, service role, Groq, R2 in codice TS/JS.
4. Verifica separazione client (`apps/web/src`) vs server (`apps/web/server`).
5. Script `scripts/audit-vercel-env.mjs` su `.env` locale (solo presenza, no valori).
6. `vercel env ls` su progetto `uase-sereco/pmp-web` (production + preview) — solo nomi, valori encrypted.
7. Nessuna lettura/stampa di valori da `.env` o `.env.local`.

---

## 3. `.gitignore`

```gitignore
.env
.env.local
.env.*.local
```

| Controllo | Esito |
|-----------|-------|
| `.env` ignorato | Sì |
| `.env.local` ignorato | Sì |
| `.env.*.local` ignorato | Sì |
| `.env.example` ignorato | No (corretto — template pubblico) |

**Evidenza Git:** `git ls-files` restituisce solo `.env.example`. File `.env` e `.env.local` esistono in locale ma non sono tracciati.

---

## 4. `.env.example`

### 4.1 Variabili documentate

| Variabile | Categoria | Note template |
|-----------|-----------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Pubblica | Contiene URL progetto reale (vedi §7) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Pubblica | Placeholder `your-anon-key` |
| `SUPABASE_SERVICE_ROLE_KEY` | Segreta server | Placeholder `your-service-role-key` |
| `DATABASE_URL` | Segreta server | Template con `[PASSWORD]` |
| `SUPABASE_DB_PASSWORD` | Segreta server | Vuota |
| `SUPABASE_ACCESS_TOKEN` | Segreta script | Commentata |
| `API_PORT` | Dev | `4000` |
| `NEXT_PUBLIC_API_URL` | Pubblica opzionale | Commentata |
| `JWT_SECRET` | Segreta server | `change-me-in-production` |
| `AUTH_ENABLED` | Config | `false` |
| `CRON_SECRET` | Segreta server | Vuota |
| `GROQ_API_KEY` | Segreta server | Vuota |
| `GROQ_MODEL` | Config server | Default modello |
| `MAX_PDF_SIZE_MB` | Config | `25` |
| `STORAGE_BACKEND` | Config | `r2` |
| `STORAGE_PATH` | Dev | Path locale |
| `R2_ACCOUNT_ID` | Segreta server | Vuota |
| `R2_ACCESS_KEY_ID` | Segreta server | Vuota |
| `R2_SECRET_ACCESS_KEY` | Segreta server | Vuota |
| `R2_BUCKET_NAME` | Config | `pmp-documents` |
| `R2_OBJECT_PREFIX` | Config | `documents` |
| `CLOUDFLARE_API_TOKEN` | Segreta script | Commentata |

### 4.2 Problemi nel template

| ID | Severità | Problema |
|----|----------|----------|
| ENV-01 | Media | `NEXT_PUBLIC_SUPABASE_URL` usa URL Supabase reale del progetto (`kctqmywrtxekvwiynfla.supabase.co`) invece di placeholder generico |
| ENV-02 | Media | `DATABASE_URL` nel template espone project ref e host pooler reali |
| ENV-03 | Bassa | `JWT_SECRET=change-me-in-production` è placeholder esplicito (corretto per example, ma da non copiare in prod) |

**Nessuna chiave API reale** (anon, service role, Groq, R2) nel file versionato.

---

## 5. Stato `.env` locale (solo presenza)

Eseguito audit presenza senza stampare valori.

| Esito | Dettaglio |
|-------|-----------|
| File presente | Sì (root monorepo) |
| `.env.local` presente | Sì (non tracciato) |
| Variabili richieste | Tutte presenti |
| Placeholder | Nessuno |

Variabili verificate presenti e non-placeholder:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `JWT_SECRET`, `AUTH_ENABLED`, `STORAGE_BACKEND`, `R2_*` (4 chiavi), `GROQ_API_KEY`, `GROQ_MODEL`, `CRON_SECRET`, `SUPABASE_DB_PASSWORD`.

Script `scripts/audit-vercel-env.mjs`: exit 0, 14 variabili OK.

---

## 6. `NEXT_PUBLIC_*` — esposizione client

### 6.1 Variabili `NEXT_PUBLIC_` in uso

| Variabile | Dove | Legittima? |
|-----------|------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `apps/web/src/lib/supabase.ts`, `apps/web/src/lib/env.ts` | Sì — URL pubblico Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Stesso | Sì — chiave anon (RLS) |
| `NEXT_PUBLIC_API_URL` | `apps/web/src/lib/api.ts`, pagine measurements/documents | Sì — solo override dev; default `""` (same-origin prod) |

### 6.2 Assenti dal client (corretto)

Nessuna occorrenza di:
- `NEXT_PUBLIC_GROQ_*`
- `NEXT_PUBLIC_R2_*`
- `NEXT_PUBLIC_*SECRET*`
- `SUPABASE_SERVICE_ROLE_KEY` in `apps/web/src/**`

### 6.3 Caricamento env in Next.js

`apps/web/next.config.ts` carica `.env` dalla root monorepo (`../../.env`). Le variabili `NEXT_PUBLIC_*` sono inlined nel bundle client da Next — comportamento atteso.

---

## 7. Service role Supabase

| Aspetto | Esito |
|---------|-------|
| Variabile | `SUPABASE_SERVICE_ROLE_KEY` |
| Client browser | Non usata |
| Server | `apps/web/server/lib/config.ts`, `apps/web/server/lib/supabase.ts` (`getSupabaseAdmin`) |
| Script dev | `scripts/seed-supabase-rest.mjs`, `scripts/verify-supabase.mjs` |
| Esposizione bundle | No |

`getSupabaseAdmin()` crea client con service role solo lato Express/server. Commento esplicito nel codice: *"solo lato server, bypassa RLS"*.

**Rischio:** se la chiave finisse in `NEXT_PUBLIC_*` o in un componente client, bypasserebbe RLS. Stato attuale: **non esposto**.

---

## 8. Groq

| Aspetto | Esito |
|---------|-------|
| Variabili | `GROQ_API_KEY`, `GROQ_MODEL` |
| Accesso | `apps/web/server/lib/env.ts` → `getGroqEnv()` |
| Route | `apps/web/server/modules/ai/*` — protette da `requireAuth` / `requireRoles` |
| Client Groq | `groq.client.ts` — Authorization Bearer in header server-side |
| Log | Errori Groq non loggano la API key |
| Vercel | `GROQ_API_KEY`, `GROQ_MODEL` su Production e Preview |

Commento in `env.ts`: *"MAI usare NEXT_PUBLIC_ per la API key"* — rispettato.

`/api/ai/status` espone solo `configured`, `model`, `provider` — non la chiave.

---

## 9. Cloudflare R2

| Aspetto | Esito |
|---------|-------|
| Variabili | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_OBJECT_PREFIX` |
| Risoluzione backend | `apps/web/server/lib/config.ts` — `STORAGE_BACKEND=r2` o auto-detect da credenziali |
| Uso | `apps/web/server/lib/storage/r2-storage.ts` — S3Client server-side |
| Client/browser | Nessun accesso diretto a R2 |
| Vercel | Tutte le `R2_*` su Production e Preview |

`assertR2Config()` lancia errore all'avvio se `STORAGE_BACKEND=r2` ma mancano credenziali — fail-fast corretto.

Script setup: `CLOUDFLARE_API_TOKEN` solo per `scripts/setup-r2.mjs`, escluso da sync Vercel (`sync-vercel-env.mjs` skip list).

---

## 10. JWT, auth e cron

| Variabile | Uso | Rischio |
|-----------|-----|---------|
| `JWT_SECRET` | `config.ts`, `auth.ts`, `auth.routes.ts` | Fallback hardcoded `dev-secret-change-me` se assente |
| `AUTH_ENABLED` | `=== "true"` per abilitare auth | Default `false` in example |
| `CRON_SECRET` | `cron-auth.ts` — Bearer su `/api/cron/*` | Su Vercel: 503 se mancante; in dev: skip se assente |

| ID | Severità | Problema |
|----|----------|----------|
| ENV-04 | Media | Fallback `JWT_SECRET` in codice (`dev-secret-change-me`) — pericoloso se `AUTH_ENABLED=true` in prod senza env |
| ENV-05 | Bassa | `/api/health` pubblico espone metadati infra (provider, bucket name, flag configured) — non segreti, ma information disclosure |

Cron Vercel (`vercel.json`): `/api/cron/db-check` ogni 5 giorni — richiede `CRON_SECRET` in produzione (implementato).

---

## 11. Hardcoded project reference

In `apps/web/server/lib/env.ts`:

```typescript
const SUPABASE_PROJECT_REF = "kctqmywrtxekvwiynfla";
const SUPABASE_REGION = "eu-west-1";
```

Usato per costruire `DATABASE_URL` da `SUPABASE_DB_PASSWORD`. Non è un segreto, ma **identifica il progetto Supabase** nel codice sorgente versionato.

| ID | Severità | Raccomandazione |
|----|----------|-----------------|
| ENV-06 | Bassa | Spostare project ref in env (`SUPABASE_PROJECT_REF`) o rimuovere costruzione automatica URL |

---

## 12. Vercel environment

**Progetto:** `uase-sereco/pmp-web`  
**Verifica:** `vercel env ls` (valori mostrati come Encrypted)

### 12.1 Production (18 variabili)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `SUPABASE_DB_PASSWORD`, `JWT_SECRET`, `AUTH_ENABLED`, `STORAGE_BACKEND`, `MAX_PDF_SIZE_MB`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_OBJECT_PREFIX`, `CRON_SECRET`, `GROQ_API_KEY`, `GROQ_MODEL`

### 12.2 Preview

Stesso set di Production (18 variabili).

### 12.3 Non richieste su Vercel (corretto)

Documentato in `audit-vercel-env.mjs` e README:
`NEXT_PUBLIC_API_URL`, `API_PORT`, `STORAGE_PATH`, `SUPABASE_ACCESS_TOKEN`, `CLOUDFLARE_API_TOKEN`

### 12.4 Gap script audit

`scripts/audit-vercel-env.mjs` **non include** `GROQ_API_KEY`, `GROQ_MODEL`, `CRON_SECRET` nella lista `REQUIRED` — gap di tooling, non di deploy (presenti su Vercel).

---

## 13. Tooling env

| Script | Scopo | Sicurezza |
|--------|-------|-----------|
| `scripts/audit-vercel-env.mjs` | Presenza/placeholder in `.env` | Non stampa valori |
| `scripts/sync-vercel-env.mjs` | Push `.env` → Vercel | Skip chiavi dev-only; non stampa valori |
| `scripts/setup-cron-secret.mjs` | Genera `CRON_SECRET` | Scrive `.env` + sync Vercel |
| `scripts/setup-r2.mjs` | Setup bucket/token R2 | Può scrivere credenziali in `.env` |
| `scripts/verify-supabase.mjs` | Test connessione | Usa chiavi ma non le logga |
| `scripts/verify-r2.mjs` | Test R2 | Usa credenziali da env |

---

## 14. Logging e leakage

| Controllo | Esito |
|-----------|-------|
| Log di API key / password / token | Non trovati in server modules |
| Log Groq body con secrets | No |
| Seed password in console | `prisma/seed.ts` logga `password123` per utenti dev — accettabile solo in dev |
| Report audit | Nessun segreto in questo file |

---

## 15. Matrice conformità

| Requisito | Stato | Evidenza |
|-----------|-------|----------|
| `.env` locali non committati | OK | git ls-files |
| `.env.example` senza segreti reali | PARZIALE | URL/project ref reali (ENV-01, ENV-02) |
| Service role solo server | OK | grep + code review |
| Groq solo server | OK | grep + code review |
| R2 solo server | OK | storage module |
| NEXT_PUBLIC solo valori pubblici | OK | 3 variabili legittime |
| Vercel prod configurato | OK | vercel env ls |
| CRON_SECRET in prod | OK | presente su Vercel |
| AUTH + JWT in prod | OK | variabili presenti; forza segreta non verificabile |

---

## 16. Handoff

### 16.1 Env richieste

**Obbligatorie (runtime produzione):**

| Variabile | Ruolo |
|-----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server |
| `SUPABASE_SERVICE_ROLE_KEY` | Server admin Supabase |
| `DATABASE_URL` | Prisma / PostgreSQL |
| `JWT_SECRET` | JWT auth (se `AUTH_ENABLED=true`) |
| `AUTH_ENABLED` | Toggle auth |
| `STORAGE_BACKEND` | `r2` o `local` |
| `R2_ACCOUNT_ID` | R2 (se backend r2) |
| `R2_ACCESS_KEY_ID` | R2 |
| `R2_SECRET_ACCESS_KEY` | R2 |
| `R2_BUCKET_NAME` | R2 |
| `CRON_SECRET` | Protezione cron Vercel |
| `GROQ_API_KEY` | AI (opzionale funzionale, richiesta se si usa `/api/ai/*`) |

**Opzionali / dev / script:**

`GROQ_MODEL`, `R2_OBJECT_PREFIX`, `MAX_PDF_SIZE_MB`, `SUPABASE_DB_PASSWORD`, `SUPABASE_ACCESS_TOKEN`, `CLOUDFLARE_API_TOKEN`, `API_PORT`, `STORAGE_PATH`, `NEXT_PUBLIC_API_URL`

### 16.2 Env mancanti

| Ambiente | Mancanti |
|----------|----------|
| `.env` locale | Nessuna (audit presenza OK) |
| Vercel Production | Nessuna (18/18) |
| Vercel Preview | Nessuna (18/18) |
| `.env.example` | `CRON_SECRET`, `GROQ_API_KEY` documentate ma vuote (corretto per template) |

### 16.3 Chiavi esposte

| Tipo | Stato |
|------|-------|
| Service role nel frontend | **Non esposto** |
| Groq API key nel frontend | **Non esposto** |
| R2 credentials nel frontend | **Non esposto** |
| JWT secret nel frontend | **Non esposto** |
| Supabase anon key nel client | **Esposto by design** (RLS) |
| Project ref in repo | **Esposto** in `.env.example` e `env.ts` (non è chiave, ma identificativo progetto) |

### 16.4 Fix richiesti

| Priorità | ID | Azione |
|----------|-----|--------|
| P2 | ENV-01, ENV-02 | Sostituire URL/project ref reali in `.env.example` con placeholder (`https://your-project.supabase.co`, `[PROJECT_REF]`) |
| P2 | ENV-04 | Rimuovere fallback `dev-secret-change-me` in produzione: `requireEnv('JWT_SECRET')` se `AUTH_ENABLED=true` e `NODE_ENV=production` |
| P3 | ENV-06 | Estrarre `SUPABASE_PROJECT_REF` in variabile env o eliminare costruzione URL hardcoded |
| P3 | — | Estendere `scripts/audit-vercel-env.mjs` con `GROQ_API_KEY`, `CRON_SECRET` in REQUIRED |
| P3 | ENV-05 | Valutare se restringere `/api/health` (auth o rate limit) per ridurre information disclosure |

### 16.5 Blocker

| Blocker | Stato |
|---------|-------|
| Segreti committati in Git | **Nessuno** |
| Chiavi private nel bundle client | **Nessuno** |
| Vercel production senza variabili critiche | **Nessuno** |
| R2/Groq esposti via NEXT_PUBLIC | **Nessuno** |

### 16.6 Stato finale

**CONFORME con miglioramenti consigliati (P2–P3).**

- Separazione client/server dei segreti: **corretta**.
- Deploy Vercel: **completo** per lo stack standard (Supabase + R2 + Groq + Cron).
- `.gitignore` e tracciamento Git: **corretti**.
- Unico debito significativo: **identificativi progetto Supabase** nel template e nel codice, e **fallback JWT dev** da eliminare prima di auth in produzione.

---

## 17. Cosa controllare (manuale)

1. Rotazione periodica `JWT_SECRET`, `CRON_SECRET`, `R2_SECRET_ACCESS_KEY` se compromessi.
2. Confermare che `AUTH_ENABLED` su Vercel rifletta l’intenzione (attualmente configurato).
3. Verificare che `.env.local` non sovrascriva accidentalmente valori critici in dev.
4. Dopo fix ENV-01/02: `git diff .env.example` senza URL reali.
5. Eseguire `node scripts/audit-vercel-env.mjs` prima di ogni deploy.

---

*Report generato da env-secrets-auditor — audit only, nessuna modifica al codice applicativo.*
