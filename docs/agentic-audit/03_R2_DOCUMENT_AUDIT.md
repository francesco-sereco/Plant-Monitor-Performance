# R2 Document Audit — Plant Monitor Performance

**Agente:** `r2-document-auditor`  
**Data audit:** 2026-07-01  
**Repository:** `c:\REPOSITORY\Plant Monitor Performance`  
**Tipo:** Audit only (nessuna modifica codice)

---

## 1. Scope

| Area | Path / componente |
|------|-------------------|
| Storage abstraction | `apps/web/server/lib/storage/` (`index.ts`, `r2-storage.ts`, `local-storage.ts`, `types.ts`) |
| Config & env | `apps/web/server/lib/config.ts`, `apps/web/server/lib/env.ts`, `.env.example` |
| API documenti | `apps/web/server/modules/documents/documents.routes.ts` |
| Bootstrap API | `apps/web/server/app.ts`, `apps/web/api/index.ts` |
| Metadati DB | `apps/web/prisma/schema.prisma` → modello `Document`, tabella `documents` su Supabase PostgreSQL |
| Frontend | `apps/web/src/app/documents/page.tsx` |
| Script ops | `scripts/setup-r2.mjs`, `scripts/verify-r2.mjs`, `scripts/verify-stack.mjs`, `scripts/audit-vercel-env.mjs` |
| ADR | `docs/ADR-002-file-storage.md` |

**Fuori scope:** parser PDF, import Groq, Supabase Storage (esplicitamente non usato).

---

## 2. Metodi di verifica

| Metodo | Esito |
|--------|-------|
| Lettura statica codice storage, routes, config, schema Prisma | Completato |
| Grep esposizione chiavi R2 nel frontend (`NEXT_PUBLIC_*`, `R2_*` in `src/`) | Completato — nessuna esposizione |
| `node scripts/verify-r2.mjs` (HeadBucket + Put/Get/Delete su bucket) | **OK** — exit 0 |
| `node scripts/audit-vercel-env.mjs` (presenza variabili locali) | **OK** — 14 variabili presenti |
| List oggetti R2 prefix `documents/` via AWS SDK | **0 oggetti** (bucket vuoto, esclusi file `.pmp-verify-*`) |
| Query Prisma `documents` (Supabase PostgreSQL) | **0 record** (attivi e soft-deleted) |
| `GET https://pmp-web-five.vercel.app/api/health` | **OK** — `files.backend=r2`, `bucket=pmp-documents`, `authEnabled=true` |
| Upload PDF end-to-end via `POST /api/documents/upload` | **NON ESEGUITO** |
| Download PDF end-to-end via `GET /api/documents/:id/download` | **NON ESEGUITO** (nessun documento in DB) |
| Verifica orfani DB↔R2 su dati reali | **N/A** — entrambi vuoti |
| Test unitari/integrazione storage | **ASSENTI** |

---

## 3. Architettura documentale (evidenza)

### 3.1 Separazione stack (conforme ADR-002 e PRD §5.3)

```
PDF fisico  → Cloudflare R2 (bucket privato pmp-documents, prefix documents/)
Metadati    → Supabase PostgreSQL (tabella documents via Prisma)
Accesso file → Solo backend Express (stream), NO signed URL pubblici
```

`assertDataStackSeparation()` in `env.ts` avvisa se `SUPABASE_STORAGE_BUCKET` è impostato ma non usato.

### 3.2 Backend storage

**Selezione backend** (`config.ts`):

- `STORAGE_BACKEND` esplicito (`r2` | `local`), oppure
- auto-detect: se tutte le `R2_*` sono presenti → `r2`, altrimenti `local`.

**R2 client** (`r2-storage.ts`):

- Endpoint: `https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
- Region: `auto`
- SDK: `@aws-sdk/client-s3` (`PutObject`, `HeadObject`, `GetObject`)
- Object key: `{R2_OBJECT_PREFIX}/{uuid}.pdf` (es. `documents/abc-123.pdf`)
- Content-Type impostato su upload

**Interfaccia** (`DocumentStorage`):

- `save`, `exists`, `createReadStream` — nessun `delete`, nessun presigned URL.

### 3.3 Variabili ambiente

| Variabile | Lato | Default | Note |
|-----------|------|---------|------|
| `STORAGE_BACKEND` | Backend | auto | `r2` in `.env.example` |
| `R2_ACCOUNT_ID` | Backend only | — | Richiesto se backend=r2 |
| `R2_ACCESS_KEY_ID` | Backend only | — | Mai `NEXT_PUBLIC_` |
| `R2_SECRET_ACCESS_KEY` | Backend only | — | Mai `NEXT_PUBLIC_` |
| `R2_BUCKET_NAME` | Backend | `pmp-documents` | |
| `R2_OBJECT_PREFIX` | Backend | `documents` | |
| `MAX_PDF_SIZE_MB` | Backend | `25` | Multer limit |
| `STORAGE_PATH` | Backend | `./storage/documents` | Solo fallback `local` |
| `CLOUDFLARE_API_TOKEN` | Script setup | — | Non usato dall'API runtime |

`assertR2Config()` in `app.ts` blocca l'avvio se `STORAGE_BACKEND=r2` e mancano credenziali.

### 3.4 API documenti

| Endpoint | Auth | Note |
|----------|------|------|
| `GET /api/documents` | `requireAuthUnlessPublic` | Filtro opzionale `customerId`, `plantId` |
| `POST /api/documents/upload` | `requireWriteAccess` + multer | Solo `application/pdf`, max size configurabile |
| `GET /api/documents/:id/download` | `requireAuthUnlessPublic` | Stream da R2, `Content-Disposition: attachment` |
| `DELETE /api/documents/:id` | `requireWriteAccess` | Soft delete (`deletedAt`), **non** elimina file R2 |

**Naming file:**

- `storedFilename = crypto.randomUUID() + path.extname(originalname)` — previene collisioni e path traversal sul nome salvato.
- `storagePath` salvato in DB è la chiave R2 completa.

### 3.5 Metadati Supabase (PostgreSQL)

Modello `Document` (`schema.prisma`):

- `customerId`, `plantId?`, `measurementSessionId?`
- `documentType` enum (`takeoff_report`, `lab_autocontrol`, `other_pdf`)
- `originalFilename`, `storedFilename`, `storagePath`, `mimeType`, `fileSize`
- `uploadStatus`, `uploadedById`, `uploadedAt`, `deletedAt`

RLS abilitata su `documents` con policy `pmp_app_all` per ruolo Prisma backend — coerente con architettura API-centrica (non PostgREST pubblico).

### 3.6 Signed URL

**Non implementati** — scelta architetturale corretta per PRD: download sempre via API autorizzata con stream backend. Nessun uso di `@aws-sdk/s3-request-presigner`.

### 3.7 Frontend

- Upload: `fetch` con `Authorization: Bearer` se token presente.
- Download: link `<a href="/api/documents/:id/download">` **senza** header Authorization.

---

## 4. Evidenza live

### 4.1 R2 connectivity (locale)

```
=== Verifica Cloudflare R2 ===
R2_ACCOUNT_ID: OK
R2_ACCESS_KEY_ID: OK
R2_SECRET_ACCESS_KEY: OK
R2_BUCKET_NAME: OK
STORAGE_BACKEND: r2
Bucket "pmp-documents": raggiungibile
Read/write/delete: OK
```

Comando: `node scripts/verify-r2.mjs` — exit code 0.

### 4.2 Env audit (locale)

`node scripts/audit-vercel-env.mjs` — exit code 0, tutte le variabili R2 e Supabase presenti senza placeholder.

### 4.3 Produzione Vercel

`GET https://pmp-web-five.vercel.app/api/health`:

```json
{
  "status": "ok",
  "authEnabled": true,
  "files": {
    "provider": "cloudflare-r2",
    "backend": "r2",
    "bucket": "pmp-documents"
  }
}
```

R2 configurato in produzione; auth attiva.

### 4.4 Inventario dati reali

| Fonte | Conteggio |
|-------|-----------|
| Oggetti R2 sotto `documents/` | 0 |
| Record `documents` (PostgreSQL) | 0 attivi, 0 soft-deleted |

Nessun documento reale da verificare; nessun orfano rilevabile.

---

## 5. Checklist sicurezza

| Controllo | Stato | Evidenza |
|-----------|-------|----------|
| Chiavi R2 solo backend | **OK** | Solo `server/lib/config.ts`; zero match in `src/` |
| Bucket privato (no URL pubblico) | **OK** | Nessun public access / custom domain nel codice; accesso via S3 API |
| Download via API autorizzata | **PARZIALE** | Pattern corretto, ma link frontend senza JWT (vedi §6) |
| Signed URL non esposti | **OK** | Non implementati |
| PDF solo (`mimetype`) | **PARZIALE** | Nessun magic-byte `%PDF-` |
| Limite dimensione | **OK** | Multer + `MAX_PDF_SIZE_MB` |
| Path traversal su `storagePath` | **OK** | Path generato server-side UUID; non accetta input utente |
| Soft delete senza purge R2 | **RISCHIO** | File restano su R2 dopo delete logico |
| Validazione `plantId` ⊆ `customerId` | **MANCANTE** | Upload accetta qualsiasi coppia IDs |
| Cross-tenant | **N/A** | MVP single-tenant; nessun workspace_id |
| Auth su download in produzione | **PROBLEMA** | `authEnabled=true` su Vercel, link `<a>` non invia Bearer |
| Test automatici storage | **MANCANTE** | Nessun test in repo |
| Record orfani DB↔R2 | **N/A** | Dataset vuoto |
| File orfani R2 | **N/A** | Bucket vuoto |

---

## 6. Problemi rilevati

### P1 — Download rotto con auth attiva (ALTA)

**Dove:** `apps/web/src/app/documents/page.tsx` L118, `documents.routes.ts` L96-116

Il download usa un link diretto `<a href=".../download">`. Con `AUTH_ENABLED=true` (produzione Vercel), il browser non invia `Authorization: Bearer`. L'API risponde 401.

Upload funziona perché usa `fetch` con token; download no.

**Impatto:** Utenti autenticati in produzione non possono scaricare PDF.

### P2 — Soft delete non rimuove oggetto R2 (MEDIA)

**Dove:** `documents.routes.ts` DELETE handler

`deletedAt` impostato ma nessuna chiamata `DeleteObject` su R2. File accumulati, potenziale leak se record ricreato o path indovinato (mitigato da UUID).

### P3 — Validazione upload incompleta (MEDIA)

**Dove:** `documents.routes.ts`

- Solo check `mimetype === application/pdf` — file rinominato possibile.
- `path.extname(originalname)` può essere `.exe` se client invia mimetype spoofato.
- Nessuna verifica che `plantId` appartenga a `customerId`.
- Nessuna verifica esistenza `customerId` prima di upload.

### P4 — Nessun test E2E documenti (MEDIA)

Nessun test automatizzato per upload/download/storage. Flusso documentale non dimostrato con PDF reale.

### P5 — Fallback local in dev senza guardrail visibile (BASSA)

Se mancano credenziali R2 e `STORAGE_BACKEND` non è forzato, il sistema usa disco locale silenziosamente (tranne warning implicito). In produzione `assertR2Config` mitiga.

### P6 — `GET /api/documents` senza scope obbligatorio (BASSA)

Senza `customerId`/`plantId` restituisce tutti i documenti. Accettabile in MVP single-tenant interno; da rivedere con auth granulare.

---

## 7. Conformità PRD / regole progetto

| Requisito | Stato |
|-----------|-------|
| PDF in storage privato | **OK** — R2 privato |
| Download solo via backend | **OK** — stream API (fix auth frontend pendente) |
| Metadati su DB strutturato | **OK** — Prisma/Supabase PostgreSQL |
| Limiti dimensione configurabili | **OK** — `MAX_PDF_SIZE_MB` |
| Nessuna chiave R2 nel frontend | **OK** |
| File fisico R2 + metadati Supabase | **OK** — architettura rispettata |
| Tracciabilità upload (audit) | **OK** — `writeAuditLog` su upload/delete |

---

## 8. Blocker

| ID | Blocker | Tipo |
|----|---------|------|
| B1 | Download PDF non verificato E2E in produzione con auth | **PARZIALE** — codice indica rottura probabile |
| B2 | Nessun documento reale in DB/R2 per test orfani | **PARZIALE** — non bloccante per architettura |
| B3 | P1 download senza Bearer in produzione | **BLOCKER funzionale** per utenti con auth |

**R2 live verificato:** **SÌ** (connectivity + read/write/delete su bucket; health produzione conferma backend r2).

**Documentale allineato end-to-end:** **NO** — infra R2 OK, flusso utente download in produzione da correggere/verificare.

---

## 9. Handoff

| # | Domanda handoff | Risposta |
|---|-----------------|----------|
| 1 | R2 live verificato? | **Sì** — `verify-r2.mjs` OK; produzione `/api/health` → `cloudflare-r2` |
| 2 | Bucket verificati? | **Sì** — `pmp-documents`, prefix `documents/`, 0 oggetti |
| 3 | Upload testato? | **Parziale** — R2 write OK via script; **no** upload PDF via API |
| 4 | Lettura/download testata? | **Parziale** — R2 read OK via script; **no** download via API con auth |
| 5 | Sicurezza | Chiavi backend-only **OK**; bucket privato **OK**; download auth **KO** in prod; soft-delete orphan **attenzione** |
| 6 | Blocker | P1 download JWT; assenza test E2E; dataset vuoto |
| 7 | Stato finale | **PARZIALE** — integrazione R2 infrastrutturale allineata; flusso documentale utente non completato |

### Azioni raccomandate (per agenti successivi)

1. **frontend-ux-auditor / backend-api-auditor:** fix download con auth (fetch blob + token, o cookie session, o endpoint signed short-lived server-side).
2. **qa-test-runner:** test integrazione upload → DB record → R2 object → download stream.
3. **backend-api-auditor:** validazione FK plant/customer su upload; magic-byte PDF.
4. **r2-document-auditor (re-run):** dopo primo upload reale, verificare allineamento `storage_path` DB ↔ chiave R2 e assenza orfani.
5. **devops-vercel-github-agent:** confermare env `R2_*` su Vercel (health già positivo).

---

## 10. Stato finale audit

| Area | Giudizio |
|------|----------|
| Config env R2 | **OK** |
| Implementazione storage R2 | **OK** |
| Separazione dati/file | **OK** |
| Sicurezza chiavi | **OK** |
| API upload | **PARZIALE** (validazione + no test live) |
| API download | **PARZIALE / BLOCCATO** in prod con auth |
| Signed URL | N/A (non richiesti) |
| Metadati Supabase | **OK** (schema + RLS) |
| Orfani DB/R2 | **N/A** (vuoto) |
| **Complessivo** | **PARZIALE** |

*Non dichiarare "documentale allineato" finché P1 non è risolto e verificato con upload/download reale.*
