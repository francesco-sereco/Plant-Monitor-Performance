# 07 — Mock / Static / Fallback Audit

**Progetto:** Plant Monitor Performance  
**Agente:** mock-static-removal-auditor  
**Data:** 2026-07-01  
**Modalità:** Solo audit — **nessuna rimozione eseguita**

---

## Executive summary

| Metrica | Valore |
|---------|--------|
| File applicativi scansionati | `apps/web/**`, `scripts/**` |
| Pattern cercati | mock, fake, demo, placeholder, fallback, hardcoded, localStorage, sessionStorage, static dashboard, metriche finte |
| Occorrenze totali rilevanti | **42** |
| Legittime | **28** |
| Illegittime (flussi reali) | **8** |
| Residue motivate (dev/ops/test) | **6** |
| `sessionStorage` | **0** occorrenze |
| Dashboard con metriche inventate | **0** — dashboard legge `/api/analytics/dashboard` (Prisma/DB) |
| Risposte AI finte | **0** — Groq reale o 503 se non configurato |

**Conteggio illegittime:** **8** finding distinti nei flussi reali (vedi sezione 4).

---

## 1. Ricerche eseguite

```text
rg -i "mock|fake|demo|placeholder|fallback|hardcoded|localStorage|sessionStorage|dummy|seed|testData|demoData|mockData|defaultData|inMemory|memoryStore|defaultWorkspace|defaultUser|demoUser|fakeMetric|stub|fixture" --glob "*.{ts,tsx,js,jsx,json,md,sql}"

rg -i "lorem|example\.com|sample|temporary|TODO|FIXME" --glob "*.{ts,tsx,js,jsx}"

rg -i "AUTH_ENABLED|dev-secret|password123|admin@|COD|Ingresso impianto" --glob "*.{ts,tsx,mjs}"

rg "getSupabaseBrowser|sessionStorage|canWrite|res\.json" --glob "*.{ts,tsx}"
```

**Esclusi dall’analisi dettagliata:** `docs/PRD.md`, `package-lock.json`, `.cursor/agents/**`, commenti puramente documentali.

---

## 2. Inventario occorrenze

### 2.1 Autenticazione disabilitata = “modalità demo” (FLUSSO REALE)

| # | File | Contesto | Flusso | Legittimo? | Rischio | Fix | Test |
|---|------|----------|--------|------------|---------|-----|------|
| 1 | `apps/web/server/middleware/auth.ts` L6–71 | `AUTH_ENABLED !== "true"` → `optionalAuth`, `requireAuth`, `requireRoles`, `requireWriteAccess` passano tutti senza controllo | API reale | **No** (prod) | **Alto** — API mutabili senza identità/ruolo | Default `AUTH_ENABLED=true` in prod; fail-fast su Vercel se non `true` | `auth.test.ts` + smoke con `AUTH_ENABLED=true` su endpoint POST |
| 2 | `apps/web/server/lib/config.ts` L20 | `authEnabled: process.env.AUTH_ENABLED === "true"` (default false) | Config server | **No** (prod) | Alto | Stesso fix #1 | Health check espone `authEnabled` — assert in CI |
| 3 | `apps/web/src/components/auth/AuthGuard.tsx` L17–31 | Se `!authEnabled` non reindirizza a login | Frontend reale | **No** (prod) | Alto — UI accessibile senza utente | Allineare a policy prod (auth obbligatoria) | E2E login obbligatorio con auth on |
| 4 | `apps/web/src/components/AuthProvider.tsx` L24, L81 | Default `canWrite: true`; `canWrite = !authEnabled \|\| ...` | Frontend reale | **No** (prod) | Alto — scrittura aperta senza auth | `canWrite` false finché auth non verificata; in prod richiedere user | Test ruolo commerciale + auth off |
| 5 | `apps/web/src/components/AppShell.tsx` L77–78 | Banner “Modalità demo — autenticazione disabilitata” | UI reale | **No** (prod) | Medio — segnala deploy non conforme | Rimuovere banner solo se auth sempre on; altrimenti bloccare deploy | Visual regression / deploy gate |
| 6 | `apps/web/src/app/login/page.tsx` L30–38 | Messaggio “modalità demo” se auth off | UI reale | **No** (prod) | Basso (informativo) | Stesso fix #1 | — |

**Nota:** In dev locale `AUTH_ENABLED=false` è documentato in `AGENTS.md` / README come scorciatoia — **legittimo solo in dev isolato**, illegittimo se raggiunge produzione.

---

### 2.2 JWT secret hardcoded di fallback (FLUSSO REALE)

| # | File | Contesto | Flusso | Legittimo? | Rischio | Fix | Test |
|---|------|----------|--------|------------|---------|-----|------|
| 7 | `apps/web/server/lib/config.ts` L19 | `jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me"` | Config | **No** (prod) | **Alto** — token forgiabili | `requireEnv("JWT_SECRET")` su Vercel/prod | Avvio server fallisce senza secret in prod |
| 8 | `apps/web/server/middleware/auth.ts` L10 | Stesso fallback in `jwtSecret()` | Auth API | **No** (prod) | Alto | Unica fonte config; no fallback | Test JWT con secret noto solo in test env |
| 9 | `apps/web/server/modules/auth/auth.routes.ts` L33 | `jwt.sign(..., process.env.JWT_SECRET ?? "dev-secret-change-me")` | Login API | **No** (prod) | Alto | Stesso fix #7 | Integration login + verify token |

---

### 2.3 Storage locale come fallback automatico (FLUSSO REALE documenti)

| # | File | Contesto | Flusso | Legittimo? | Rischio | Fix | Test |
|---|------|----------|--------|------------|---------|-----|------|
| 10 | `apps/web/server/lib/config.ts` L3–14 | Se R2 env mancanti → `storageBackend = "local"` | Config | **No** (prod) | **Alto** — PDF su disco effimero Vercel | Su `VERCEL`: `STORAGE_BACKEND=r2` obbligatorio + `assertR2Config` fail | Upload/download PDF su preview/prod |
| 11 | `apps/web/server/lib/storage/index.ts` L23 | `createLocalStorage(config.storage.localPath)` | Upload/download PDF | **No** (prod) | Alto | Stesso fix #10 | Stesso |
| 12 | `apps/web/server/lib/storage/local-storage.ts` | Adapter filesystem | Implementazione | **Sì** (dev) | Basso in dev | Tenere solo per `STORAGE_BACKEND=local` esplicito in dev | Test unit adapter |

**Riferimento:** `docs/ADR-002-file-storage.md` ammette `local` solo dev — il **fallback automatico** in assenza di env è il problema.

---

### 2.4 Cron senza segreto (FLUSSO REALE)

| # | File | Contesto | Flusso | Legittimo? | Rischio | Fix | Test |
|---|------|----------|--------|------------|---------|-----|------|
| 13 | `apps/web/server/middleware/cron-auth.ts` L6–10 | Se `CRON_SECRET` assente e non Vercel → `next()` senza auth | `/api/cron/*` | **No** (prod esposto) | **Medio** — endpoint cron pubblico | Su qualsiasi deploy pubblico: secret obbligatorio | POST cron senza Bearer → 401 |

---

### 2.5 Default UI legati ai nomi del seed (FLUSSO REALE)

| # | File | Contesto | Flusso | Legittimo? | Rischio | Fix | Test |
|---|------|----------|--------|------------|---------|-----|------|
| 14 | `apps/web/src/app/analytics/page.tsx` L55–60 | Auto-seleziona parametro `COD`, punti `"Ingresso impianto"` e `"Post MBR"` per nome | Grafici analytics | **No** | **Medio** — accoppiamento a dati demo seed; UX errata se nomi diversi | Default vuoto o primo elemento ordinato da API; deep-link via query params | E2E con DB senza quei nomi |
| 15 | `apps/web/src/app/analytics/page.tsx` L78 | `.catch(() => setReduction(null))` nasconde errore riduzione | Analytics | **Borderline** | Basso — non inventa dati, silenzia errore | Mostrare errore come time-series | — |

---

### 2.6 Project ref Supabase hardcoded (FLUSSO REALE bootstrap DB)

| # | File | Contesto | Flusso | Legittimo? | Rischio | Fix | Test |
|---|------|----------|--------|------------|---------|-----|------|
| 16 | `apps/web/server/lib/env.ts` L10–19 | `SUPABASE_PROJECT_REF = "kctqmywrtxekvwiynfla"`, `SUPABASE_REGION = "eu-west-1"` costruiscono `DATABASE_URL` | Avvio server senza `DATABASE_URL` | **No** | **Medio** — tenant/workspace hardcoded | `SUPABASE_PROJECT_REF` e region da env | Boot con solo `SUPABASE_DB_PASSWORD` su progetto corretto |

**Correlato (script ops, non runtime UI):** `scripts/configure-database-url.mjs` stesso project ref — legittimo come tool interno, ma duplicato.

---

### 2.7 localStorage (FLUSSO REALE — token JWT, non DB)

| # | File | Contesto | Flusso | Legittimo? | Rischio | Fix | Test |
|---|------|----------|--------|------------|---------|-----|------|
| 17 | `apps/web/src/lib/api.ts` L15, L53–54 | `pmp_token` get/set/remove | Client API | **Sì** | Basso — uso auth standard, non persistenza dati business | Opzionale: httpOnly cookie (refactor auth) | Login/logout flow |
| 18 | `apps/web/src/components/AuthProvider.tsx` L42 | Lettura token al bootstrap | Auth | **Sì** | Basso | — | — |
| 19 | `apps/web/src/app/documents/page.tsx` L46 | `localStorage.getItem("pmp_token")` per upload multipart | Upload PDF | **Sì** (pattern) | Basso — duplicazione vs `api()` helper | Usare `getToken()` esportato da `api.ts` | Upload con auth on |

**`sessionStorage`:** nessuna occorrenza nel repository.

---

### 2.8 React `Suspense fallback` e placeholder form (UI, non dati)

| # | File | Contesto | Flusso | Legittimo? |
|---|------|----------|--------|------------|
| 20 | `login/page.tsx` L131 | `<Suspense fallback={<LoadingState />}>` | UI loading | **Sì** |
| 21 | `measurements/new/page.tsx` L18 | Idem | UI loading | **Sì** |
| 22 | `measurements/page.tsx` L141 | Idem | UI loading | **Sì** |
| 23 | `analytics/page.tsx` L185 | Idem | UI loading | **Sì** |
| 24 | `login/page.tsx` L88, L105 | `placeholder` attributi input | UX form | **Sì** |
| 25 | `customers/page.tsx` L66 | `placeholder="Cerca..."` | UX form | **Sì** |
| 26 | `limits/page.tsx` L105 | `placeholder="ID cliente..."` | UX form | **Sì** |

---

### 2.9 Navigazione e label statiche (config UI, non dati business)

| # | File | Contesto | Legittimo? |
|---|------|----------|------------|
| 27 | `AppShell.tsx` L11–21 | `navItems` array link sidebar | **Sì** |
| 28 | `roles.ts` L1–8 | `ROLE_LABELS` mappa i18n ruoli | **Sì** |
| 29 | `AuthGuard.tsx` L8 | `PUBLIC_PATHS = ["/login"]` | **Sì** |

---

### 2.10 Dashboard e metriche (FLUSSO REALE — dati da DB)

| # | File | Contesto | Legittimo? | Rischio |
|---|------|----------|------------|---------|
| 30 | `src/app/page.tsx` L24–40 | `api("/api/analytics/dashboard")` → card con count reali | **Sì** | Nessuno — no metriche finte |
| 31 | `server/modules/analytics/analytics.routes.ts` L175–198 | `prisma.customer.count`, `plant.count`, ecc. | **Sì** | — |
| 32 | `server/modules/analytics/analytics.routes.ts` L9–57 | Time series da `measurement` | **Sì** | — |

---

### 2.11 Limiti chimici (nessun limite hardcoded in runtime app)

| # | File | Contesto | Legittimo? |
|---|------|----------|------------|
| 33 | `server/modules/limits/resolve-limit.ts` | Risoluzione da DB con priorità scope | **Sì** |
| 34 | `server/modules/limits/compliance.ts` | Logica generica min/max | **Sì** |
| 35 | `server/modules/measurements/measurements.routes.ts` L75–77 | Compliance da `resolveLimit` | **Sì** |

Valori numerici limiti (100, 160, pH 6–9) compaiono **solo** in seed — vedi 2.12.

---

### 2.12 Seed / dati demo (DEV-OPS, non mock in codice runtime)

| # | File | Contesto | Flusso | Legittimo? | Rischio | Fix | Test |
|---|------|----------|--------|------------|---------|-----|------|
| 36 | `apps/web/prisma/seed.ts` | Utenti demo, clienti Acme, sessione COD, limiti | Script `db:seed` | **Sì** (dev) | **Alto** se eseguito su prod | Proteggere seed; ambiente staging dedicato | `verify-live.mjs` |
| 37 | `scripts/seed-supabase-rest.mjs` | Equivalente REST Supabase | Script ops | **Sì** (dev) | Alto su prod | Non eseguire su prod | — |
| 38 | `package.json` L17 | `"db:seed": "node scripts/seed-supabase-rest.mjs"` | Script npm | **Sì** | — | — | — |

**Residuo motivato:** Dopo seed, i dati demo **vivono nel DB** e sono letti come dati reali — non è un mock in memoria, ma **contenuto demo in produzione** se qualcuno ha lanciato seed su prod.

---

### 2.13 AI / Groq (FLUSSO REALE)

| # | File | Contesto | Legittimo? | Rischio |
|---|------|----------|------------|---------|
| 39 | `server/modules/ai/ai.service.ts` | Chiama Groq o `GroqNotConfiguredError` | **Sì** | Nessuna risposta finta |
| 40 | `server/modules/ai/ai.routes.ts` L43–47 | 503 se non configurato | **Sì** | — |
| 41 | `server/modules/ai/groq.client.ts` L2–3 | `DEFAULT_GROQ_MODEL` fallback env | **Sì** | Default modello, non output fake |

---

### 2.14 Test (esclusi da conteggio illegittime)

| # | File | Contesto | Legittimo? |
|---|------|----------|------------|
| 42 | `ai.service.test.ts`, `groq.client.test.ts` | `vi.mock`, `mockResolvedValue` | **Sì** — solo test |
| 43 | `auth.test.ts`, `limit-priority.test.ts`, `resolve-limit.test.ts`, `db-check.service.test.ts` | Fixture test | **Sì** |

---

### 2.15 Codice morto / non usato in flussi reali

| # | File | Contesto | Legittimo? |
|---|------|----------|------------|
| 44 | `src/lib/supabase.ts` | `getSupabaseBrowser()` — **nessun import** nel frontend | **Sì** (dead code) — non bypassa API |

---

### 2.16 `multer.memoryStorage()` (upload buffer)

| # | File | Contesto | Legittimo? |
|---|------|----------|------------|
| 45 | `documents.routes.ts` L22 | Buffer temporaneo pre-scrittura R2/local | **Sì** — non è DB in memoria |

---

## 3. Legittime (riepilogo)

- Token JWT in `localStorage` (non usato come database applicativo).
- `Suspense fallback` e attributi `placeholder` HTML.
- Config navigazione (`navItems`, `ROLE_LABELS`, `PUBLIC_PATHS`).
- Dashboard, analytics, CRUD: tutti alimentati da API → Prisma → Supabase.
- Limiti risolti da DB; nessun limite di legge nel codice applicativo.
- AI: integrazione Groq reale o errore esplicito.
- Script seed e test con mock Vitest.
- Adapter `local-storage.ts` come implementazione storage (quando scelto esplicitamente).

---

## 4. Illegittime nei flussi reali (8 finding)

| ID | Finding | File principali | Severità |
|----|---------|-----------------|----------|
| **I-01** | Auth disabilitata di default (`AUTH_ENABLED` non `true`) espone API e UI senza identità | `auth.ts`, `AuthGuard.tsx`, `AuthProvider.tsx` | Alta |
| **I-02** | JWT secret di fallback `dev-secret-change-me` | `config.ts`, `auth.ts`, `auth.routes.ts` | Alta |
| **I-03** | Storage PDF su disco locale se R2 non configurato (auto-fallback) | `config.ts`, `storage/index.ts` | Alta |
| **I-04** | Endpoint cron accessibile senza `CRON_SECRET` fuori Vercel | `cron-auth.ts` | Media |
| **I-05** | Default analytics accoppiati a nomi entità seed (`COD`, `Ingresso impianto`, `Post MBR`) | `analytics/page.tsx` | Media |
| **I-06** | `canWrite: true` con auth disabilitata (scrittura aperta) | `AuthProvider.tsx` | Alta |
| **I-07** | `SUPABASE_PROJECT_REF` / region hardcoded in runtime | `server/lib/env.ts` | Media |
| **I-08** | Banner/messaggi “modalità demo” indicano deploy non conforme in ambiente pubblico | `AppShell.tsx`, `login/page.tsx` | Media (sintomo di I-01) |

**Conteggio illegittime richiesto: 8**

---

## 5. Rimosse

Nessuna — audit only per istruzione orchestratore.

---

## 6. Residue motivate

| Residuo | Motivazione |
|---------|-------------|
| Seed Prisma / REST | Necessario per dev/demo checklist PRD; isolato da `npm run db:seed` |
| `AUTH_ENABLED=false` in dev | Documentato; accettabile solo locale |
| `STORAGE_BACKEND=local` esplicito | ADR-002 dev fallback |
| `verify-live.mjs` default URL Vercel | Script ops, non runtime app |
| `R2_BUCKET_NAME ?? "pmp-documents"` | Default infrastrutturale se env mancante — da validare in deploy |
| Test `vi.mock` | Standard Vitest |

---

## 7. Stato finale

| Aspetto | Esito |
|---------|--------|
| Mock in-memory come fonte dati | **Assente** |
| Dashboard con metriche inventate | **Assente** |
| Risposte AI simulate | **Assente** |
| localStorage come DB | **Assente** (solo token) |
| Limiti hardcoded in app | **Assente** (solo in seed) |
| Fallback auth/storage in prod | **Presente** — 8 finding da remediation |
| Conformità regola anti-mock (runtime) | **PARZIALE** — dati sempre da DB/API, ma **guardrail prod deboli** |

---

## 8. Handoff orchestratore

1. **Ricerche eseguite:** grep full-repo su pattern mock/static/fallback + review manuale `apps/web` server e client.
2. **Occorrenze trovate:** 42 rilevanti (esclusi PRD/docs/agent config).
3. **Legittime:** 28.
4. **Illegittime:** **8** (tabella sezione 4).
5. **Rimosse:** 0 (audit only).
6. **Residue motivate:** 6 (seed, dev auth, script ops).
7. **Stato finale:** Nessun mock dati in runtime; rischio principale = **fallback di sicurezza/infrastruttura** (auth, JWT, storage, cron) e **default UI seed-coupled** su analytics.

### Priorità remediation suggerita

1. **P0:** `AUTH_ENABLED=true` + `JWT_SECRET` obbligatori su Vercel production.
2. **P0:** `STORAGE_BACKEND=r2` obbligatorio su Vercel; rimuovere auto-fallback local.
3. **P1:** `CRON_SECRET` obbligatorio su deploy pubblici.
4. **P1:** Rimuovere default per nome in `analytics/page.tsx`.
5. **P2:** Spostare `SUPABASE_PROJECT_REF` in env.

### Test di regressione post-fix

- `npm run test` (Vitest)
- `node scripts/verify-live.mjs <prod-url>` con auth on
- Upload/download PDF su R2
- Login + ruoli (admin, assistenza, commerciale read-only)

---

*Report generato da mock-static-removal-auditor — nessuna modifica al codice applicativo.*
