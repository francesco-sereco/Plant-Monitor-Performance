# Mock Removal Report — Prompt 2

**Data:** 2026-07-01  
**Agente:** mock-static-removal-auditor + orchestrator (remediation)  
**Report audit origine:** `07_MOCK_STATIC_FALLBACK_AUDIT.md`

---

## Executive summary

**8 finding illegittimi** identificati in audit. **6 remediation P0/P1** applicate in questa sessione. **2 residui** accettati per dev (auth off locale, seed script). **Nessun mock dati in-memory** nei flussi runtime.

**Stato:** PARZIALE — guardrail produzione rafforzati; dati sempre da DB/API.

---

## Matrice remediation

| ID | Finding | Azione | File | Stato | Evidenza |
|----|---------|--------|------|-------|----------|
| I-01 | Auth disabilitata default prod | `assertProductionConfig()` richiede `AUTH_ENABLED=true` su Vercel | `env.ts`, `app.ts` | **RISOLTO** | Throw su boot Vercel |
| I-02 | JWT fallback `dev-secret-change-me` | `getJwtSecret()` — no fallback in prod | `env.ts`, `auth.ts`, `config.ts` | **RISOLTO** | Min 32 char prod |
| I-03 | Storage local auto-fallback prod | R2 obbligatorio su Vercel in `assertProductionConfig` | `env.ts` | **RISOLTO** | Fail-fast |
| I-04 | Cron senza secret | `requireCronSecret` sempre 503 se mancante | `cron-auth.ts` | **RISOLTO** | No bypass locale in prod |
| I-05 | Analytics default seed names | Primo param/punto da API ordinati | `analytics/page.tsx` | **RISOLTO** | No hardcode COD/Ingresso |
| I-06 | `canWrite: true` auth off | Mitigato da fail-fast prod; dev intenzionale | `AuthProvider.tsx` | **PARZIALE** | Dev only |
| I-07 | SUPABASE_PROJECT_REF hardcoded | Da env / `NEXT_PUBLIC_SUPABASE_URL` | `env.ts` | **RISOLTO** | Grep no ref fisso |
| I-08 | Banner modalità demo | Resta in dev; non visibile se auth on prod | `AppShell.tsx` | **ACCETTATO** | Sintomo I-01 risolto in prod |

---

## Non rimosso (legittimo)

| Elemento | Motivazione |
|----------|-------------|
| `prisma/seed.ts` | Dev/staging only — script `db:seed` |
| `vi.mock` in test | Standard Vitest |
| `localStorage` token JWT | Auth, non DB business |
| `Suspense fallback` | UI loading, non dati |
| `STORAGE_BACKEND=local` esplicito | ADR-002 dev |

---

## Verifica post-remediation

| Test | Esito |
|------|-------|
| `npm test` | 25/25 PASS |
| `npm run build` | PASS |
| Grep `dev-secret-change-me` in auth routes prod path | Solo dev fallback in `getJwtSecret` |
| Analytics page — no `"COD"` / `"Ingresso impianto"` | PASS |

---

## Gap residui

1. `.env.example` ancora `AUTH_ENABLED=false` — documentazione dev; prod enforced via `assertProductionConfig`
2. Seed su production DB — rischio operativo, non codice mock
3. Nessun E2E che provi assenza dati finti con DB vuoto

---

## Handoff

- **Rimosse (runtime prod):** 6/8 finding critici
- **Residue motivate:** 2 (dev auth banner, seed script)
- **Stato:** PARZIALE — conforme anti-mock su dati; guardrail prod OK dopo deploy fix
