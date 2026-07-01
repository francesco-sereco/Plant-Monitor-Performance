# Final Pre-Commit Audit — Prompt 2

**Data:** 2026-07-01  
**Agente:** qa-test-runner + final-compliance-gate  
**Branch:** `master`  
**HEAD remoto:** `44de967`  
**Working tree:** modifiche unstaged (fix sicurezza + report audit)

---

## Checklist pre-commit

| Controllo | Esito | Evidenza |
|-----------|-------|----------|
| `npm test` | ✅ PASS | 25/25 Vitest |
| `npm run build` | ✅ PASS | Next.js 15, exit 0 |
| `npm run verify:supabase` | ✅ PASS | Auth + REST |
| `npm run verify:r2` | ✅ PASS | Bucket R/W |
| `npm run ai:ping` | ✅ PASS | Groq reale |
| `verify-live.mjs` production | ✅ PASS | https://pmp-web-five.vercel.app |
| `npm run lint` | ⚠️ NON ESEGUITO | — |
| Nessun segreto in diff | ✅ | Solo `.env.example` template |
| Test integrazione IDOR | ❌ ASSENTE | — |
| Browser auth E2E | ❌ BLOCCATO | No credenziali test |

---

## File modificati (da committare)

### Codice applicativo

| File | Tipo modifica |
|------|---------------|
| `apps/web/server/lib/env.ts` | `getJwtSecret`, `assertProductionConfig` |
| `apps/web/server/lib/config.ts` | JWT via getter |
| `apps/web/server/app.ts` | CORS whitelist, assert prod |
| `apps/web/server/middleware/auth.ts` | `getJwtSecret` |
| `apps/web/server/middleware/cron-auth.ts` | Secret obbligatorio |
| `apps/web/server/modules/auth/auth.routes.ts` | `getJwtSecret` |
| `apps/web/server/modules/documents/documents.routes.ts` | FK validation, audit download |
| `apps/web/server/modules/measurements/measurements.routes.ts` | customerId alignment |
| `apps/web/src/app/analytics/page.tsx` | Defaults da API |
| `.env.example` | Documentazione env |

### Documentazione audit

| Path | Contenuto |
|------|-----------|
| `docs/agentic-audit/*` | Report agentici Prompt 2 |
| `.cursor/agents/` | Definizioni agenti |
| `.cursor/rules/agentic-master-method.mdc` | Regola metodo |

---

## Raccomandazione commit

**Messaggio suggerito:**
```
Harden production config: auth, JWT, CORS, cron, document FK validation

Fail-fast on Vercel without AUTH_ENABLED, strong JWT_SECRET, R2, and CRON_SECRET.
Add CORS whitelist, document relation validation, measurement customerId alignment,
and analytics defaults from API. Include Prompt 2 agentic audit reports.
```

**Non committare:** `apps/web/.next/`, `.env`, `.env.local`

---

## Blocker pre-declarazione MVP

1. Commit non eseguito in questa sessione (su richiesta utente)
2. Production deploy non include fix working tree
3. IDOR download ancora aperto
4. Browser auth test bloccato

---

## Esito

**PRONTO PER COMMIT** con riserva — test/build OK; **NON** dichiarare MVP allineato post-commit senza redeploy + browser test.
