# Prompt Compliance Matrix (pre-commit)

**Data:** 2026-07-01

| ID | Requisito | Stato | Evidenza |
|----|-----------|-------|----------|
| R01 | Repository analizzato | COMPLETATO | `01_INITIAL_AUDIT.md`, `AUDIT_MASTER_LOG.md` |
| R02 | Subagenti reali usati | COMPLETATO | 12+ Task subagents |
| R03 | Output separati | COMPLETATO | `docs/agentic-audit/*` |
| R04 | Supabase live | COMPLETATO | MCP + verify script |
| R05 | RLS live | COMPLETATO | MCP list_tables |
| R06 | Policy live | PARZIALE | USING(true) su pmp_app |
| R07 | R2 live | COMPLETATO | verify:r2 |
| R08 | Upload R2 utente | NON DIMOSTRATO | 0 documenti |
| R09 | Groq reale | COMPLETATO | ai:ping + live /api/ai/ping |
| R10 | Frontend audit | COMPLETATO | `04_FRONTEND_AUDIT.md` |
| R11 | Backend audit | COMPLETATO | `05_BACKEND_AUDIT.md` |
| R12 | Env audit | COMPLETATO | `08_ENV_DEPLOY_AUDIT.md` |
| R13 | Auth analizzata | PARZIALE | Fix prod; seed password prod |
| R14 | Mock scan | COMPLETATO | `07_MOCK_STATIC_FALLBACK_AUDIT.md` |
| R15 | Test | COMPLETATO | 25/25 |
| R16 | Build | COMPLETATO | build OK |
| R17 | Browser live | PARZIALE | API smoke only |
| R18 | Commit | PENDING | — |
| R19 | Deploy | PARZIALE | Pre-existing READY; post-push TBD |
