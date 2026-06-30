# ADR-002 — File storage

**Decisione:** Separazione netta stack dati vs file.

| Layer | Servizio | Contenuto |
|-------|----------|-----------|
| Dati | **Supabase PostgreSQL** (Prisma) | Clienti, impianti, rilevazioni, limiti, metadati documenti |
| File | **Cloudflare R2** | PDF e allegati (bucket privato `pmp-documents`) |

**Motivazione:** MVP interno; PDF serviti solo via API autorizzata (PRD sez. 5.3). Supabase Storage non usato.

**Implementazione:**
- `STORAGE_BACKEND=r2` in produzione; `local` solo fallback dev
- R2: credenziali S3 solo backend (`R2_*` in `.env`, mai nel frontend)
- Supabase: `DATABASE_URL` + chiavi API per dati/auth futura, non per blob
- Setup R2: `npm run setup:r2` | Verifica: `npm run verify:stack`

**Conseguenze:** Max size via `MAX_PDF_SIZE_MB`; download sempre tramite `GET /api/documents/:id/download`.
