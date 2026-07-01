# Prompt Compliance Matrix — Prompt 2

**Data:** 2026-07-01  
**Agente:** final-compliance-gate  
**Prompt:** Prompt Master / Prompt 2 — Plant Monitor Performance  
**Esito complessivo:** **MVP tecnico parzialmente allineato**

---

## Matrice requisiti

| # | Requisito | Stato | Evidenza | File/Comando | Gap | Criticità | Azione |
|---|-----------|-------|----------|--------------|-----|-----------|--------|
| 1 | Subagenti reali usati | COMPLETATO | 12 agenti, report separati | `docs/agentic-audit/`, `.cursor/agents/` | browser-live bloccato | Bassa | Fornire credenziali test |
| 2 | Supabase live | COMPLETATO | `npm run verify:supabase` exit 0 | `scripts/verify-supabase.mjs` | — | — | — |
| 3 | RLS live | PARZIALE | Migrazione applicata; policy `USING (true)` | `20260630160000_enable_rls/migration.sql` | No least-privilege | Media | Documentare threat model |
| 4 | Policy Supabase | PARZIALE | `pmp_app_all` su 15 tabelle | migration SQL | Permissive | Media | Future granular policies |
| 5 | R2 live | COMPLETATO | `verify:r2` + health `backend=r2` | `scripts/verify-r2.mjs`, `/api/health` | No E2E PDF | Media | Upload/download test |
| 6 | Groq reale | COMPLETATO | `ai:ping` risposta OK | `16_GROQ_AI_REPORT.md` | No system prompt | Bassa | Hardening futuro |
| 7 | Browser live autenticato | BLOCCATO | verify-live senza login | — | No password test | **Alta** | `TEST_USER_*` env |
| 8 | Mock/static scan | PARZIALE | 8 finding; 6 fixati | `07`, `12_MOCK_REMOVAL_REPORT.md` | Dev auth banner | Bassa | Deploy fix |
| 9 | Sicurezza auth/privacy | PARZIALE | P0 fix in working tree | `17_SECURITY_FIX_REPORT.md` | IDOR, rate limit | **Alta** | Fix IDOR + commit |
| 10 | Prompt injection AI | PARZIALE | Superficie minima protetta | `08B`, `16B` | Futuro PDF | Media | Guardrail pre-import |
| 11 | Malware/supply-chain | PARZIALE | Audit OK, 8 CVE dev | `08C`, `17B` | Magic-byte PDF | Media | P2 hardening |
| 12 | Build | COMPLETATO | `npm run build` exit 0 | `18_LOCAL_TEST_REPORT.md` | — | — | — |
| 13 | Test | COMPLETATO | 25/25 Vitest | `npm test` | No HTTP integration | Media | IDOR test |
| 14 | Commit fix | NON DIMOSTRATO | `git status` unstaged | working tree | Non su remote | **Alta** | Commit + push |
| 15 | Deploy production fix | NON DIMOSTRATO | Prod su `44de967` | Vercel URL | Fix non deployati | **Alta** | Push → redeploy |
| 16 | Prisma necessario | COMPLETATO | ADR-001 documentato | `docs/ADR-001-database.md` | Stack method note | Bassa | Nessuna rimozione |
| 17 | Limiti configurabili | COMPLETATO | DB + API resolve | `resolve-limit.ts` + 9 test | UI scopeId | Bassa | Select dinamiche |
| 18 | Fuori limite colore+testo | COMPLETATO | `ComplianceBadge` | `04_FRONTEND_AUDIT.md` | — | — | — |
| 19 | PDF storage privato | PARZIALE | R2 privato, API download | `03_R2_DOCUMENT_AUDIT.md` | IDOR + JWT link | **Alta** | Auth oggetto + fetch |
| 20 | Env secrets | COMPLETATO | 18 var Vercel prod | `08_ENV_DEPLOY_AUDIT.md` | `.env.example` default | Bassa | Commento prod |
| 21 | Frontend dati reali | COMPLETATO | API-only, no mock | `04`, `07` | Empty state UX | Bassa | UX P1 |
| 22 | Backend validazione Zod | PARZIALE | Mutazioni OK | `05_BACKEND_AUDIT.md` | Query params | Media | Zod query |
| 23 | CI/CD | NON APPLICABILE | No `.github/workflows` | — | Assente | Bassa | Future CI |
| 24 | E2E Playwright | NON APPLICABILE | Non in scope MVP | — | Assente | Bassa | Post-MVP |

---

## Conteggio stati

| Stato | Count |
|-------|-------|
| COMPLETATO | 10 |
| PARZIALE | 10 |
| BLOCCATO | 1 |
| NON DIMOSTRATO | 2 |
| NON APPLICABILE | 2 |

---

## Criteri Prompt Master — verdetto

| Criterio obbligatorio per "MVP tecnico allineato" | Soddisfatto? |
|---------------------------------------------------|--------------|
| Supabase live | ✅ |
| RLS live | ⚠️ PARZIALE |
| R2 live | ✅ |
| Groq reale | ✅ |
| Browser live autenticato | ❌ BLOCCATO |
| Mock scan + remediation | ⚠️ PARZIALE |
| Sicurezza dimostrata | ❌ IDOR aperto |
| Build + test | ✅ |
| Commit + deploy fix | ❌ NON DIMOSTRATO |

**Verdetto:** Non si può dichiarare "MVP tecnico allineato". **Esito: MVP tecnico parzialmente allineato.**
