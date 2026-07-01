# Agentic Team Setup Report

**Data/ora setup:** 2026-07-01 11:34:05 +02:00  
**Repository:** Plant Monitor Performance  
**Prompt:** PROMPT 1 — Installazione squadra agentica reale Cursor  
**Stato:** SETUP COMPLETATO

---

## 1. Regola globale creata

| File | Stato |
|------|-------|
| `.cursor/rules/agentic-master-method.mdc` | Creato |
| `alwaysApply` | `true` |

Contenuto: metodo operativo obbligatorio, regola anti mono-agente, regola dati reali, regola sicurezza, regola AI security, regola completamento.

---

## 2. Elenco agenti creati (17)

| # | Nome agente | File | readonly | is_background | Responsabilità |
|---|-------------|------|----------|---------------|----------------|
| 1 | orchestrator | `.cursor/agents/orchestrator.md` | false | false | Coordina subagenti, diagnosi, piano operativo, execution log, compliance finale |
| 2 | codebase-mapper | `.cursor/agents/codebase-mapper.md` | true | true | Mappa struttura repo, framework, dipendenze, aree critiche |
| 3 | frontend-ux-auditor | `.cursor/agents/frontend-ux-auditor.md` | false | true | Audit UX/UI, metriche finte, form, dashboard, empty/loading state |
| 4 | backend-api-auditor | `.cursor/agents/backend-api-auditor.md` | false | true | Audit API, server actions, auth, Supabase, R2, Groq, endpoint |
| 5 | supabase-db-auditor | `.cursor/agents/supabase-db-auditor.md` | true | true | Audit Supabase live: schema, RLS, policy, migrazioni |
| 6 | r2-document-auditor | `.cursor/agents/r2-document-auditor.md` | false | true | Audit R2: upload, download, signed URL, metadati, sicurezza |
| 7 | groq-ai-auditor | `.cursor/agents/groq-ai-auditor.md` | false | true | Audit integrazione Groq, callAI, sicurezza server-side |
| 8 | env-secrets-auditor | `.cursor/agents/env-secrets-auditor.md` | false | true | Audit env, segreti, .env.example, esposizione chiavi |
| 9 | security-privacy-auditor | `.cursor/agents/security-privacy-auditor.md` | false | true | Audit sicurezza difensiva: auth, RLS, IDOR, XSS, privacy |
| 10 | ai-security-prompt-injection-auditor | `.cursor/agents/ai-security-prompt-injection-auditor.md` | false | true | Audit prompt injection, exfiltration, validazione output AI |
| 11 | malware-supply-chain-auditor | `.cursor/agents/malware-supply-chain-auditor.md` | false | true | Audit supply-chain, npm scripts, upload pericolosi |
| 12 | mock-static-removal-auditor | `.cursor/agents/mock-static-removal-auditor.md` | false | true | Scansione mock/fake/demo/fallback/hardcoded nei flussi reali |
| 13 | migration-alignment-auditor | `.cursor/agents/migration-alignment-auditor.md` | false | false | Allineamento DB/frontend/backend, migrazioni SQL |
| 14 | qa-test-runner | `.cursor/agents/qa-test-runner.md` | false | false | Lint, typecheck, test, build, smoke test locale |
| 15 | devops-vercel-github-agent | `.cursor/agents/devops-vercel-github-agent.md` | false | false | Commit, push, deploy Vercel, wait automatici, verifica production |
| 16 | browser-live-tester | `.cursor/agents/browser-live-tester.md` | false | false | Test browser su dominio Vercel live, login, flussi reali |
| 17 | final-compliance-gate | `.cursor/agents/final-compliance-gate.md` | false | false | Matrice compliance finale, blocco false conclusioni |

---

## 3. Output previsto per agente

| Agente | Output audit / report |
|--------|----------------------|
| orchestrator | `AUDIT_MASTER_LOG.md`, `09_DIAGNOSTICA_COMPLETA.md`, `10_PIANO_OPERATIVO.md`, `11_EXECUTION_LOG.md`, `19B_PROMPT_COMPLIANCE_MATRIX.md`, `23B_FINAL_COMPLIANCE_GATE.md`, `24_FINAL_DELIVERY_REPORT.md` |
| codebase-mapper | `01_INITIAL_AUDIT.md` |
| supabase-db-auditor | `02_DB_SUPABASE_AUDIT.md` |
| r2-document-auditor | `03_R2_DOCUMENT_AUDIT.md`, `15_R2_ALIGNMENT_REPORT.md` |
| frontend-ux-auditor | `04_FRONTEND_AUDIT.md` (+ aggiorna `11_EXECUTION_LOG.md` in fase fix) |
| backend-api-auditor | `05_BACKEND_AUDIT.md` (+ aggiorna `11_EXECUTION_LOG.md` in fase fix) |
| security-privacy-auditor | `06_SECURITY_AUDIT.md`, `17_SECURITY_FIX_REPORT.md` |
| mock-static-removal-auditor | `07_MOCK_STATIC_FALLBACK_AUDIT.md`, `12_MOCK_REMOVAL_REPORT.md` |
| env-secrets-auditor | `08_ENV_DEPLOY_AUDIT.md` |
| ai-security-prompt-injection-auditor | `08B_AI_SECURITY_PROMPT_INJECTION_AUDIT.md`, `16B_AI_SECURITY_FIX_REPORT.md` |
| malware-supply-chain-auditor | `08C_MALWARE_SUPPLY_CHAIN_AUDIT.md`, `17B_MALWARE_SUPPLY_CHAIN_FIX_REPORT.md` |
| migration-alignment-auditor | `13_DB_FRONTEND_BACKEND_ALIGNMENT.md`, `14_MIGRATION_REPORT.md`, `23_FINAL_ALIGNMENT_REPORT.md` |
| qa-test-runner | `18_LOCAL_TEST_REPORT.md`, `19_FINAL_PRE_COMMIT_AUDIT.md` |
| devops-vercel-github-agent | `20_GIT_COMMIT_PUSH_REPORT.md`, `21_VERCEL_DEPLOY_REPORT.md` |
| browser-live-tester | `22_BROWSER_LIVE_TEST_REPORT.md` |
| groq-ai-auditor | `16_GROQ_AI_REPORT.md` |
| final-compliance-gate | `19B_PROMPT_COMPLIANCE_MATRIX.md`, `23B_FINAL_COMPLIANCE_GATE.md`, `24_FINAL_DELIVERY_REPORT.md` |

Tutti i report vanno in `docs/agentic-audit/`.

---

## 4. Quando invocare ciascun agente

| Fase | Agenti da invocare |
|------|-------------------|
| Avvio audit | orchestrator → codebase-mapper (parallelo con supabase-db-auditor, env-secrets-auditor) |
| Audit infrastruttura dati | supabase-db-auditor, r2-document-auditor, migration-alignment-auditor |
| Audit applicativo | frontend-ux-auditor, backend-api-auditor, mock-static-removal-auditor |
| Audit sicurezza | security-privacy-auditor, env-secrets-auditor, ai-security-prompt-injection-auditor, malware-supply-chain-auditor |
| Audit AI | groq-ai-auditor, ai-security-prompt-injection-auditor |
| Esecuzione fix | orchestrator assegna a specialisti (frontend, backend, migration, security) |
| Verifica locale | qa-test-runner |
| Deploy | devops-vercel-github-agent |
| Verifica live | browser-live-tester |
| Chiusura | final-compliance-gate → orchestrator per delivery report |

---

## 5. Conferma regola anti mono-agente

**CONFERMATO.**

- Ogni agente ha file dedicato in `.cursor/agents/`.
- Ogni agente ha nome, responsabilità, output obbligatorio e handoff all'orchestratore.
- La rule `agentic-master-method.mdc` (`alwaysApply: true`) vieta simulazione narrativa di ruoli.
- Se i subagenti non sono invocabili, l'esecuzione va dichiarata: **"Esecuzione mono-agente o pseudo-agentica — PARZIALE / NON CONFORME"**.

---

## 6. Conferma Prompt 2

**Il Prompt 2 dovrà usare subagenti reali** tramite il tool Task di Cursor con `subagent_type` appropriato, oppure invocando gli agenti definiti in `.cursor/agents/` secondo il protocollo dell'orchestrator.

Non è ammesso che un singolo agente simuli tutti i ruoli narrativamente.

---

## 7. Limiti ambiente Cursor

| Limite | Impatto |
|--------|---------|
| Subagenti Task tool | Disponibili tipi: `generalPurpose`, `explore`, `shell`, `cursor-guide`, `ci-investigator`, `best-of-n-runner`, `ai-architect`, `deployment-expert`, `performance-optimizer`. Gli agenti custom in `.cursor/agents/` vanno invocati passando le istruzioni del file come prompt al subagente o all'agente principale con ruolo esplicito. |
| MCP Supabase | Disponibile (`plugin-supabase-supabase`) — richiede progetto collegato e credenziali valide per audit live. |
| MCP Vercel | Disponibile (`plugin-vercel-vercel`) — richiede progetto linkato per deploy/log live. |
| MCP Cloudflare | Disponibile per docs/bindings — R2 live richiede credenziali env. |
| Browser automation | Non disponibile di default; browser-live-tester potrebbe risultare BLOCCATO senza strumenti browser o credenziali test. |
| Credenziali | Supabase live, R2 live, Groq reale, login test, Vercel production dipendono da env e permessi non verificati in questo setup. |
| Prisma nel repo | Presente in git status (`node_modules/.prisma`). La rule agentica vieta uso non necessario — da verificare nel Prompt 2. |

---

## 8. Verifica finale Prompt 1

| Controllo | Esito |
|-----------|-------|
| `.cursor/rules/agentic-master-method.mdc` esiste | OK |
| `.cursor/agents/` esiste | OK |
| Tutti i 17 agenti esistono | OK |
| Ogni agente ha frontmatter YAML | OK |
| Ogni agente ha istruzioni operative | OK |
| Ogni agente ha output atteso | OK |
| Ogni agente ha handoff | OK |
| `docs/agentic-audit/00_AGENTIC_TEAM_SETUP.md` esiste | OK |
| Codice applicativo modificato | NO (come richiesto) |
| Audit applicativo eseguito | NO (come richiesto) |
| Commit/push/deploy | NO (come richiesto) |

---

## 9. Prossimo passo

**Puoi lanciare il Prompt 2.**

L'orchestrator dovrà:
1. Verificare che tutti i subagenti siano invocabili.
2. Avviare audit paralleli con codebase-mapper, supabase-db-auditor, env-secrets-auditor.
3. Produrre report separati in `docs/agentic-audit/`.
4. Non dichiarare completamento senza evidenze concrete.
