# Piano Operativo — Prompt 2

**Data:** 2026-07-01  
**Orchestratore:** orchestrator  
**Obiettivo:** Portare Plant Monitor Performance da audit a MVP tecnicamente difendibile in produzione

---

## Fase 0 — Completata (audit)

| Step | Agente | Output | Stato |
|------|--------|--------|-------|
| 0.1 | codebase-mapper | Discovery strutturale | ✅ |
| 0.2 | Parallel audit | 12 report specialistici | ✅ |
| 0.3 | orchestrator | Diagnostica + piano | ✅ |

---

## Fase 1 — Fix P0 sicurezza (completata in working tree)

| # | Azione | Owner | File | Stato |
|---|--------|-------|------|-------|
| 1.1 | `assertProductionConfig()` su Vercel | backend | `env.ts`, `app.ts` | ✅ Applicato |
| 1.2 | `getJwtSecret()` senza fallback prod | backend | `env.ts`, `auth.ts` | ✅ Applicato |
| 1.3 | CORS whitelist | security | `app.ts` | ✅ Applicato |
| 1.4 | CRON_SECRET obbligatorio | backend | `cron-auth.ts` | ✅ Applicato |
| 1.5 | FK validazione upload documenti | backend | `documents.routes.ts` | ✅ Applicato |
| 1.6 | Allineamento customerId/plantId | backend | `measurements.routes.ts` | ✅ Applicato |
| 1.7 | Analytics defaults da API | frontend | `analytics/page.tsx` | ✅ Applicato |
| 1.8 | Project ref da env | env | `env.ts` | ✅ Applicato |

**Pendente:** commit + push + redeploy (Fase 4).

---

## Fase 2 — Fix P1 (da pianificare)

| # | Azione | Priorità | Owner | Dipendenze |
|---|--------|----------|-------|------------|
| 2.1 | Download PDF autenticato (fetch + blob) | P0 | frontend + backend | Credenziali test |
| 2.2 | Autorizzazione oggetto su download (IDOR) | P0 | backend | 2.1 |
| 2.3 | Export CSV con Bearer | P1 | frontend | Credenziali test |
| 2.4 | `useAuthReady` su tutte le pagine | P1 | frontend | — |
| 2.5 | Empty state liste | P1 | frontend | — |
| 2.6 | `requireRoles("admin")` su limiti/parametri master | P1 | backend | PRD §31 |
| 2.7 | Rate limit login | P2 | backend | — |
| 2.8 | Security headers (helmet) | P2 | backend | — |
| 2.9 | Magic-byte PDF upload | P2 | backend | — |

---

## Fase 3 — Verifica

| # | Azione | Agente | Criterio done |
|---|--------|--------|---------------|
| 3.1 | `npm test` + `npm run build` | qa-test-runner | 25/25, build OK | ✅ |
| 3.2 | `verify:supabase`, `verify:r2`, `ai:ping` | qa-test-runner | exit 0 | ✅ |
| 3.3 | `verify-live.mjs` production | qa-test-runner | health + auth | ✅ |
| 3.4 | Browser login + flussi CRUD | browser-live-tester | **BLOCCATO** — no password test |
| 3.5 | Upload/download PDF E2E | r2 + browser | Dataset + auth |
| 3.6 | Lint | qa-test-runner | Non eseguito |

---

## Fase 4 — Deploy

| # | Azione | Agente | Stato |
|---|--------|--------|-------|
| 4.1 | Commit fix sicurezza + report audit | devops | **PENDENTE** |
| 4.2 | Push `origin/master` | devops | **PENDENTE** |
| 4.3 | Wait Vercel deploy | devops | Auto su push |
| 4.4 | Re-run verify-live post-deploy | qa-test-runner | **PENDENTE** |

---

## Fase 5 — Compliance gate

| # | Azione | Agente | Output |
|---|--------|--------|--------|
| 5.1 | Matrice compliance Prompt Master | final-compliance-gate | `19B` |
| 5.2 | Gate finale | final-compliance-gate | `23B` |
| 5.3 | Delivery report | orchestrator | `24` |

**Esito gate:** MVP tecnico parzialmente allineato (non "allineato").

---

## Decisioni architetturali documentate

| Decisione | Motivazione | Report |
|-----------|-------------|--------|
| Prisma su Supabase PG | ADR-001 — relazioni type-safe, migrazioni | `14_MIGRATION_REPORT.md` |
| RLS permissiva `pmp_app` | Backend Express unico accesso; defense-in-depth debole | `13`, `23` |
| JWT in localStorage | MVP interno; refactor cookie futuro | `06_SECURITY_AUDIT.md` |

---

## Timeline suggerita (post Prompt 2)

1. **Oggi:** commit fix P0 + report `docs/agentic-audit/`  
2. **+1h:** redeploy + verify-live  
3. **+1 giorno:** credenziali test → browser-live-tester  
4. **+2 giorni:** fix IDOR + download frontend  
5. **+1 settimana:** UX P1 (empty state, limiti select)
