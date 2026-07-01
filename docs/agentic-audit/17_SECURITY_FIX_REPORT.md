# Security Fix Report — Prompt 2

**Data:** 2026-07-01  
**Agente:** security-privacy-auditor + orchestrator  
**Report audit origine:** `06_SECURITY_AUDIT.md`  
**Stato fix:** PARZIALE — P0 applicati, P1+ aperti

---

## Fix applicati

| ID audit | Problema | Fix | File | Test |
|----------|----------|-----|------|------|
| SEC-001 | Auth off in prod | `assertProductionConfig()` — `AUTH_ENABLED=true` su Vercel | `env.ts`, `app.ts` | build PASS |
| SEC-002 | JWT fallback debole | `getJwtSecret()` — min 32 char, no dev secret in prod | `env.ts`, `auth.ts`, `config.ts`, `auth.routes.ts` | test PASS |
| SEC-016 | CORS permissivo | `resolveCorsOrigin()` whitelist | `app.ts` | build PASS |
| SEC-022 | Cron aperto | `requireCronSecret` — sempre secret richiesto | `cron-auth.ts` | — |
| SEC-014 | customerId/plantId | Forzato `plant.customerId` su POST session | `measurements.routes.ts` | — |
| SEC-018 (parz.) | FK upload | `validateDocumentRelations()` | `documents.routes.ts` | — |
| — | Audit download | `writeAuditLog` su download | `documents.routes.ts` | — |

---

## Non risolti (P1+)

| ID | Problema | Severità | Note |
|----|----------|----------|------|
| SEC-011/012 | IDOR download PDF | CRITICO | Qualsiasi utente auth → qualsiasi UUID |
| SEC-013 | Link download senza Bearer | ALTO | Frontend `<a href>` |
| SEC-003 | Rate limit login | ALTO | — |
| SEC-007 | Assistenza modifica limiti | ALTO | PRD §31 |
| SEC-004 | JWT in localStorage | ALTO | Accettato MVP |
| SEC-010 | RLS non granulare | MEDIO | Documentato |
| SEC-017 | Security headers | MEDIO | — |
| SEC-018 | Magic-byte PDF | MEDIO | Solo MIME multer |
| SEC-021 | Health disclosure | MEDIO | — |

---

## Evidenza codice fix

```typescript
// env.ts — assertProductionConfig
if (process.env.VERCEL !== "1") return;
if (process.env.AUTH_ENABLED !== "true") {
  throw new Error("AUTH_ENABLED deve essere true su Vercel");
}
getJwtSecret();
// ... R2 + CRON_SECRET
```

```typescript
// cron-auth.ts — no bypass
if (!secret) return res.status(503).json({ error: "CRON_SECRET non configurato" });
```

---

## Verifica

| Verifica | Esito |
|----------|-------|
| `npm test` | 25/25 PASS |
| `npm run build` | PASS |
| Production health `authEnabled=true` | ✅ (deploy precedente) |
| Fix su production deploy | ❌ Fix in working tree, non deployati |

---

## Handoff

- **P0 fix:** APPLICATI (7 file)
- **Commit/deploy:** PENDENTE
- **IDOR:** BLOCKER per "allineato"
- **Stato:** PARZIALE
