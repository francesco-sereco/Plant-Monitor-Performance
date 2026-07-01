# Diagnostica Completa — Prompt 2

**Data:** 2026-07-01  
**Orchestratore:** final-compliance-gate + orchestrator  
**Repository:** Plant Monitor Performance  
**Production URL:** https://pmp-web-five.vercel.app

---

## 1. Sintesi esecutiva

Audit agentico Prompt 2 eseguito con **subagenti reali** (12 agenti specializzati). Il codebase è un MVP funzionale: Next.js 15 + Express API + Prisma su Supabase PostgreSQL + R2 + Groq.

**Evidenze positive:** test 25/25, build OK, verify-live/supabase/r2/ai:ping reali su production, fix P0 sicurezza applicati (non ancora committati).

**Gap residui:** browser live autenticato bloccato (nessuna password test), RLS permissiva su ruolo `pmp_app`, IDOR download PDF non risolto, fix non committati/pushati, UX frontend parziale (empty state, download JWT).

**Esito diagnostico:** **MVP tecnico parzialmente allineato** — non dichiarabile "allineato" finché mancano evidenze browser auth, commit deploy fix, e hardening RLS/IDOR.

---

## 2. Stato per area

| Area | Stato | Evidenza | Gap principale |
|------|-------|----------|----------------|
| Struttura codebase | COMPLETATO | `01` (codebase-mapper, fase 1) | Prisma vs stack method — documentato ADR-001 |
| Supabase live | COMPLETATO | `verify:supabase` PASS | RLS `USING (true)` — no least-privilege |
| R2 live | COMPLETATO | `verify:r2` PASS, health `backend=r2` | Nessun E2E upload/download PDF |
| Groq reale | COMPLETATO | `ai:ping` → risposta OK | Nessun system prompt hardened |
| Backend API | PARZIALE | `05_BACKEND_AUDIT.md` + fix EX-01..07 | IDOR download, rate limit, admin-only delete |
| Frontend UX | PARZIALE | `04_FRONTEND_AUDIT.md` | Empty state, download/export JWT, mobile |
| Sicurezza | PARZIALE | Fix P0 in working tree | SEC-012 IDOR, SEC-003 rate limit, headers |
| Mock/static | PARZIALE | `07_MOCK_STATIC_FALLBACK_AUDIT.md` | 8 finding; 6 fix P0 applicati |
| Env/deploy | COMPLETATO | `08_ENV_DEPLOY_AUDIT.md` | `.env.example` ancora `AUTH_ENABLED=false` |
| AI security | PARZIALE | `08B_AI_SECURITY_PROMPT_INJECTION_AUDIT.md` | Superficie minima; futuro PDF ad alto rischio |
| Supply chain | PARZIALE | `08C_MALWARE_SUPPLY_CHAIN_AUDIT.md` | 8 CVE dev; upload solo MIME |
| Privacy | PARZIALE | `08D_PRIVACY_DATA_PROTECTION_AUDIT.md` | Retention, GDPR formale assenti |
| Test locale | COMPLETATO | `18_LOCAL_TEST_REPORT.md` | Lint non eseguito |
| Browser live auth | BLOCCATO | verify-live senza login | Nessuna credenziale test fornita |
| Git commit/push fix | NON DIMOSTRATO | `git status` modifiche unstaged | Fix sicurezza non su `origin/master` |
| Deploy fix | NON DIMOSTRATO | Production su commit `44de967` | Deploy non include fix sessione corrente |

---

## 3. Problemi per gravità (post-fix sessione)

### CRITICAL — risolti in working tree (da committare)

| ID | Problema | Fix applicato | File |
|----|----------|---------------|------|
| C1 | Auth disabilitata in prod | `assertProductionConfig()` fail-fast Vercel | `env.ts`, `app.ts` |
| C2 | JWT secret debole | `getJwtSecret()` min 32 char prod | `env.ts`, `auth.ts`, `config.ts` |
| C3 | Cron aperto senza secret | `requireCronSecret` sempre 503/401 | `cron-auth.ts` |

### CRITICAL — ancora aperti

| ID | Problema | Stato |
|----|----------|-------|
| C4 | IDOR download PDF (qualsiasi utente auth → qualsiasi doc) | **APERTO** — solo audit log aggiunto |
| C5 | Download frontend senza Bearer | **APERTO** — `<a href>` in `documents/page.tsx` |

### HIGH — parzialmente risolti

| ID | Problema | Stato |
|----|----------|-------|
| H1 | FK upload documenti | **RISOLTO** — `validateDocumentRelations()` |
| H2 | customerId/plantId mismatch | **RISOLTO** — forzato `plant.customerId` |
| H3 | CORS `origin: true` | **RISOLTO** — whitelist |
| H4 | RLS non granulare | **APERTO** — policy `pmp_app_all` |
| H5 | Ruoli admin su limiti/parametri | **APERTO** |
| H6 | Rate limit login | **APERTO** |

### MEDIUM — UX / hardening

- Empty state assenti (frontend)
- Analytics defaults seed — **RISOLTO** (primo elemento da API)
- Security headers assenti
- Upload magic-byte PDF assente

---

## 4. Blocker oggettivi

| ID | Blocker | Tipo | Azione |
|----|---------|------|--------|
| BLK-BROWSER | Test browser autenticato | Credenziali | Fornire utente test o `TEST_USER_*` env |
| BLK-COMMIT | Fix sicurezza non committati | Processo | Commit + push + redeploy Vercel |
| BLK-IDOR | Download PDF senza auth oggetto | Sicurezza | Implementare check + fetch autenticato frontend |
| BLK-RLS | Policy permissive `pmp_app` | Architettura | Accettare rischio documentato o policy granulari |

---

## 5. Agenti eseguiti (Prompt 2)

| Agente | Report | Esito |
|--------|--------|-------|
| codebase-mapper | `01_INITIAL_AUDIT.md` (fase 1) | COMPLETATO |
| supabase-db-auditor | (inline in alignment) | PARZIALE |
| r2-document-auditor | `03`, `15` | PARZIALE |
| frontend-ux-auditor | `04` | PARZIALE |
| backend-api-auditor | `05` | COMPLETATO audit |
| security-privacy-auditor | `06`, `08D` | PARZIALE |
| mock-static-removal-auditor | `07` | PARZIALE |
| env-secrets-auditor | `08` | CONFORME |
| groq-ai-auditor | `16` | CONFORME perimetro attuale |
| ai-security-prompt-injection-auditor | `08B` | PARZIALE |
| malware-supply-chain-auditor | `08C` | PARZIALE |
| qa-test-runner | `18` | COMPLETATO |
| browser-live-tester | — | BLOCCATO |
| final-compliance-gate | `19B`, `23B`, `24` | Questo ciclo |

---

## 6. Handoff

1. **Esito:** MVP tecnico parzialmente allineato  
2. **Fix applicati:** 7 file server + analytics (uncommitted)  
3. **Test:** 25/25 + build + script live OK  
4. **Manca:** commit, deploy fix, browser auth, IDOR, RLS granulare, UX P0  
5. **Prossimo passo:** commit fix → redeploy → credenziali test → browser-live-tester
