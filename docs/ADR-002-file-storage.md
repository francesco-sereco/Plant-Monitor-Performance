# ADR-002 — File storage

**Decisione:** Storage privato per PDF; locale in sviluppo, **Cloudflare R2** in produzione.

**Motivazione:** MVP interno; PDF serviti solo via API autorizzata (PRD sez. 5.3). R2 è S3-compatible, privato di default, allineato allo stack (operating-method).

**Implementazione:**
- `STORAGE_BACKEND=local|r2` (auto: r2 se variabili R2 complete)
- Locale: `STORAGE_PATH` (default `./storage/documents`)
- R2: bucket `pmp-documents`, prefisso oggetti `documents/`, credenziali S3 solo backend
- Setup: `npm run setup:r2` con `CLOUDFLARE_API_TOKEN`

**Conseguenze:** Max size via `MAX_PDF_SIZE_MB`; download sempre tramite `GET /api/documents/:id/download`.
