# DB / Frontend / Backend Alignment Report

**Data:** 2026-07-01  
**Agente:** migration-alignment-auditor + orchestrator  
**Scope:** Prisma schema, migrazioni SQL, API Express, UI Next.js

---

## Executive summary

Allineamento **strutturale COMPLETATO**: schema Prisma copre entità PRD (clienti, impianti, rilevazioni, limiti, documenti). API e UI usano gli stessi endpoint REST. Gap su **autorizzazione download**, **UX form limiti**, e **RLS non granulare**.

**Stato:** PARZIALE

---

## Matrice allineamento entità

| Entità PRD | Tabella DB | API | UI | Allineato |
|------------|------------|-----|-----|-----------|
| Clienti | `customers` | `/api/customers` | `/customers` | ✅ |
| Impianti | `plants` | `/api/plants` | `/plants` | ✅ |
| Parametri chimici | `chemical_parameters` | `/api/chemical-parameters` | `/parameters` | ✅ |
| Punti campionamento | `sampling_points` | `/api/sampling-points` | (in form rilevazioni) | ✅ |
| Limiti | `limits` | `/api/limits`, `/resolve` | `/limits` | ⚠️ scopeId UUID manuale UI |
| Rilevazioni | `measurement_sessions`, `measurements` | `/api/measurement-sessions` | `/measurements` | ✅ post-fix customerId |
| Documenti | `documents` | `/api/documents` | `/documents` | ⚠️ download JWT |
| Analytics | query aggregate | `/api/analytics/*` | `/analytics` | ✅ post-fix defaults |
| Utenti | `users` | `/api/auth/*` | `/login` | ✅ |
| Audit | `audit_logs` | (interno) | — | ✅ parziale copertura |
| PDF import (futuro) | `pdf_import_jobs` | — | — | N/A MVP |

---

## Allineamento tipi e validazione

| Flusso | Backend Zod | Frontend | Gap |
|--------|-------------|----------|-----|
| POST customer | ✅ | Form parziale vs dettaglio | Campi email/tel mancanti in create |
| POST plant | ✅ | ✅ | — |
| POST measurement-session | ✅ + customerId fix | ✅ | — |
| POST document upload | ✅ + FK validation | multipart manuale | Duplica logica `api()` |
| POST limit | ✅ parziale | scopeId testo | UX non allineata |
| Query analytics | No Zod | ✅ | Validazione date assente |

---

## Priorità limiti (PRD)

```
impianto > cliente > tipologia > settore > globale
```

**Evidenza:** `resolve-limit.ts` + test `resolve-limit.test.ts` (9 test) — **ALLINEATO**.

---

## RLS vs Prisma

| Aspetto | DB | Backend | Gap |
|---------|-----|---------|-----|
| RLS abilitato | ✅ tutte tabelle | N/A (Prisma direct) | — |
| Policy `pmp_app_all` | `USING (true)` | Express auth unico gate | **DEBOLE** — no row-level |
| PostgREST anon | Bloccato (no policy anon) | — | OK |
| Service role in frontend | — | Assente | OK |

**Decisione:** accettabile per MVP single-tenant interno; documentare in ADR se non si evolve a multi-tenant.

---

## Fix applicati in sessione (allineamento dati)

| Fix | File | Effetto |
|-----|------|---------|
| customerId = plant.customerId | `measurements.routes.ts` | Coerenza FK sessione |
| validateDocumentRelations | `documents.routes.ts` | Coerenza metadati documento |
| Analytics defaults da API | `analytics/page.tsx` | Decoupling da seed |

---

## Handoff

1. **Schema ↔ API:** ALLINEATO  
2. **API ↔ UI:** PARZIALE (download, limiti form, empty state)  
3. **RLS ↔ Express:** PARZIALE (policy permissive)  
4. **Azione:** IDOR download, select scope limiti, test E2E documenti
