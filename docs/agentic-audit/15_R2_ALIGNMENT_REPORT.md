# R2 Alignment Report — Plant Monitor Performance

**Agente:** `r2-document-auditor`  
**Data:** 2026-07-01  
**Report correlato:** [03_R2_DOCUMENT_AUDIT.md](./03_R2_DOCUMENT_AUDIT.md)

---

## Executive summary

L'integrazione **infrastrutturale** Cloudflare R2 è **allineata** allo stack definito in ADR-002: file PDF su bucket privato `pmp-documents`, metadati su Supabase PostgreSQL, credenziali solo backend, nessun Supabase Storage, nessuna chiave R2 nel frontend.

Il **flusso documentale end-to-end** resta **PARZIALE**: connectivity R2 verificata live, produzione configurata su R2 con auth attiva, ma download frontend incompatibile con JWT e nessun upload/download PDF testato su dati reali.

**Stato allineamento:** `PARZIALE`

---

## Matrice allineamento

| Requisito stack | Atteso | Reale | Allineato |
|-----------------|--------|-------|-----------|
| File su R2 | Sì | `createR2Storage` + S3 API | ✅ |
| Metadati su Supabase PG | Sì | Prisma `Document` → `documents` | ✅ |
| Permessi backend | Sì | Express auth middleware | ⚠️ download link senza JWT |
| No chiavi R2 frontend | Sì | Zero `NEXT_PUBLIC_R2_*` | ✅ |
| Bucket privato | Sì | Accesso solo API backend | ✅ |
| Download via API | Sì | `createReadStream` + pipe | ⚠️ auth prod |
| Signed URL pubblici | No | Non implementati | ✅ |
| Setup/verify script | Sì | `setup-r2.mjs`, `verify-r2.mjs` | ✅ |
| Produzione Vercel R2 | Sì | `/api/health` → `backend: r2` | ✅ |
| Test E2E documenti | Sì (DoD) | Assenti | ❌ |
| Purge R2 on delete | Consigliato | Soft delete only | ❌ |

---

## Evidenza rapida

```
verify-r2.mjs          → exit 0 (HeadBucket, Put, Get, Delete)
audit-vercel-env.mjs   → exit 0 (R2_* presenti)
R2 objects documents/  → 0
DB documents           → 0
Vercel /api/health     → files.backend=r2, authEnabled=true
```

---

## Gap critici → owner suggerito

| Gap | Priorità | Owner |
|-----|----------|-------|
| Download `<a href>` senza Bearer con auth prod | P0 | frontend + backend |
| Nessun test upload/download PDF | P1 | qa-test-runner |
| Soft delete non elimina R2 | P2 | backend |
| Validazione plant/customer su upload | P2 | backend |

---

## Handoff (7 punti)

1. **R2 live verificato:** Sì  
2. **Bucket verificati:** `pmp-documents` / prefix `documents/`  
3. **Upload testato:** No (solo R2 write script)  
4. **Download testato:** No (API non esercitata; auth prod problematica)  
5. **Sicurezza:** Chiavi OK; download auth KO in produzione  
6. **Blocker:** P1 download JWT; dataset vuoto  
7. **Stato finale:** **PARZIALE**

---

## Criterio di chiusura

Passare a **ALLINEATO** richiede:

- [ ] Fix download autenticato verificato su Vercel live  
- [ ] Almeno 1 upload PDF reale → record DB + oggetto R2 coerenti  
- [ ] Download dello stesso PDF con utente autenticato  
- [ ] (Opzionale) policy purge o job cleanup su soft delete
