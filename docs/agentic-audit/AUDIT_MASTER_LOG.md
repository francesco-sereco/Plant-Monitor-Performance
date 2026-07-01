# Audit Master Log — Plant Monitor Performance

**Ultimo aggiornamento:** 2026-07-01 (fase iniziale — codebase-mapper)  
**Repository:** `c:\REPOSITORY\Plant Monitor Performance`  
**Remote GitHub:** `https://github.com/francesco-sereco/Plant-Monitor-Performance.git`  
**Branch:** `master` (up to date con `origin/master`)  
**Ultimo commit:** `44de967` — Add Groq AI backend module with openai/gpt-oss-20b as default model.

---

## Fasi audit

| Fase | Agente | Stato | Output | Note |
|------|--------|-------|--------|------|
| 0 | Setup squadra agentica | COMPLETATO | `00_AGENTIC_TEAM_SETUP.md` | 17 agenti in `.cursor/agents/` |
| 1 | codebase-mapper | COMPLETATO | `01_INITIAL_AUDIT.md` | Discovery strutturale completa |
| 2 | supabase-db-auditor | PENDING | `02_DB_SUPABASE_AUDIT.md` | Richiede credenziali live |
| 3 | r2-document-auditor | PENDING | `03_R2_DOCUMENT_AUDIT.md` | Richiede credenziali R2 |
| 4 | frontend-ux-auditor | PENDING | `04_FRONTEND_AUDIT.md` | — |
| 5 | backend-api-auditor | PENDING | `05_BACKEND_AUDIT.md` | — |
| 6 | security-privacy-auditor | PENDING | `06_SECURITY_AUDIT.md` | — |
| 7 | mock-static-removal-auditor | PENDING | `07_MOCK_STATIC_FALLBACK_AUDIT.md` | — |
| 8 | env-secrets-auditor | PENDING | `08_ENV_DEPLOY_AUDIT.md` | — |
| 9 | groq-ai-auditor | PENDING | `16_GROQ_AI_REPORT.md` | Richiede GROQ_API_KEY |
| 10 | qa-test-runner | PENDING | `18_LOCAL_TEST_REPORT.md` | — |
| 11 | devops-vercel-github-agent | PENDING | `20_GIT_COMMIT_PUSH_REPORT.md`, `21_VERCEL_DEPLOY_REPORT.md` | vercel CLI non globale |
| 12 | browser-live-tester | PENDING | `22_BROWSER_LIVE_TEST_REPORT.md` | BLOCCATO senza URL/credenziali |
| 13 | final-compliance-gate | PENDING | `23B_FINAL_COMPLIANCE_GATE.md` | — |

---

## Agenti invocati (sessione corrente)

| Timestamp | Agente | Modalità | Esito |
|-----------|--------|----------|-------|
| 2026-07-01 | codebase-mapper | readonly discovery | Report iniziale prodotto |

---

## Ambiente verificato (codebase-mapper)

| Tool | Disponibilità | Versione / nota |
|------|---------------|-----------------|
| git | OK | 2.54.0.windows.1 |
| gh | OK | 2.92.0 |
| node | OK | v22.22.0 |
| npm | OK | 11.13.0 |
| vercel | PARZIALE | Non in PATH; `npx vercel` → 54.18.6 |
| supabase | PARZIALE | Non in PATH; installabile via `npx supabase` |
| wrangler | PARZIALE | Non in PATH; installabile via `npx wrangler` |
| MCP Supabase | CONFIGURATO | `plugin-supabase-supabase` — non usato in questa fase |
| MCP Vercel | CONFIGURATO | `plugin-vercel-vercel` — non usato in questa fase |
| MCP Cloudflare | CONFIGURATO | docs/bindings — non usato in questa fase |

---

## Stack rilevato

| Layer | Tecnologia |
|-------|------------|
| Monorepo | npm workspaces (`apps/*`) |
| Frontend | Next.js 15 App Router, React 19, Tailwind, Recharts |
| Backend | Express 5 in `apps/web/server/`, esposto su Vercel via `apps/web/api/index.ts` |
| Database | Supabase PostgreSQL + **Prisma ORM** |
| File storage | Cloudflare R2 (`@aws-sdk/client-s3`) con fallback `local` |
| AI | Groq (`groq.client.ts`, `ai.service.ts`) — no `callAI` |
| Auth | JWT custom (bcrypt + jsonwebtoken), `AUTH_ENABLED` env flag |
| Test | Vitest (6 file test server-side) |
| E2E | Assente (no Playwright/Cypress nel repo) |
| CI | Assente (no `.github/workflows`) |

---

## Blocker globali noti

| ID | Blocker | Impatto |
|----|---------|---------|
| BLK-01 | Credenziali `.env` non verificate in audit | Supabase/R2/Groq/Vercel live non dimostrabili |
| BLK-02 | `vercel`/`supabase`/`wrangler` non globali | DevOps agent deve usare `npx` |
| BLK-03 | Nessuna automazione browser in repo | browser-live-tester dipende da tool esterni |
| BLK-04 | File agentici untracked in git | `.cursor/agents/`, `docs/agentic-audit/` non committati |

---

## Conteggio problemi (fase 1)

| Gravità | Conteggio |
|---------|-----------|
| CRITICAL | 1 |
| HIGH | 4 |
| MEDIUM | 10 |
| LOW | 6 |
| INFO | 3 |
| **Totale** | **24** |
| **Blocker operativi** | **4** |

---

## Prossimo passo orchestratore

1. Avviare in parallelo: `supabase-db-auditor`, `env-secrets-auditor`, `backend-api-auditor`.
2. Verificare `AUTH_ENABLED=true` e JWT_SECRET in ambiente target prima di security audit.
3. Eseguire `qa-test-runner` (`npm test`, `npm run build`) per baseline locale.
4. Non dichiarare MVP allineato finché BLK-01 non risolto con evidenze live.
