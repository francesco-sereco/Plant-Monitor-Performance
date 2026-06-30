# Plant Monitor Performance

Applicativo web interno per storicizzare, consultare e analizzare parametri chimici degli impianti di trattamento acqua.

## Stack

- **Frontend:** Next.js 15 + Tailwind CSS + Recharts
- **Dati:** Supabase PostgreSQL + Prisma (solo metadati e relazioni — **no Supabase Storage**)
- **Documenti/file:** Cloudflare R2 (bucket privato `pmp-documents`, download via API)
- **Backend:** Express
- **Monorepo:** npm workspaces

## Avvio locale (Supabase)

### Prerequisiti

- Node.js 20+
- Progetto Supabase creato ([supabase.com](https://supabase.com))

### Setup

```bash
# 1. Copia variabili ambiente
cp .env.example .env

# 2. Compila .env con i valori dal dashboard Supabase (vedi sotto)

# 3. Installa dipendenze
npm install

# 4. Applica schema e seed demo sul DB Supabase
npm run db:deploy
npm run db:seed

# (opzionale) Verifica stack dati + documenti
npm run verify:stack

# 5. Avvia API + Web
npm run dev
```

- **Web:** http://localhost:3000
- **API:** http://localhost:4000/api/health

### Database (Supabase — solo dati)

Il progetto usa **Supabase solo per PostgreSQL**: clienti, impianti, rilevazioni, limiti, metadati documenti. I file PDF **non** vanno su Supabase Storage.

- **Schema:** migrazione Prisma + `npm run db:deploy`
- **Prisma:** ruolo dedicato `pmp_app` (pooler session mode, porta 5432)
- **Seed demo:** `npm run db:seed`
- **Accesso dati app:** solo tramite API Express (Prisma), non PostgREST diretto

### Variabili in `.env`

| Variabile | Dove trovarla |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role |
| `DATABASE_URL` | Configurata per ruolo `pmp_app` (vedi `.env` locale) |
| `SUPABASE_DB_PASSWORD` | Password ruolo `pmp_app` |
| `R2_*` | Cloudflare R2 — vedi sezione Storage PDF sotto |

> Un solo file `.env` nella root del monorepo: viene letto da API, Next.js e Prisma.

### Storage PDF (Cloudflare R2)

Bucket **`pmp-documents`** (regione EEUR), privato — i PDF si scaricano solo via `GET /api/documents/:id/download`.

| Variabile | Descrizione |
|---|---|
| `STORAGE_BACKEND` | `local` (dev) o `r2` (produzione) |
| `R2_ACCOUNT_ID` | Account ID Cloudflare |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Token S3 R2 (solo backend) |
| `R2_BUCKET_NAME` | `pmp-documents` |
| `R2_OBJECT_PREFIX` | Prefisso oggetti, default `documents` |

Setup automatico (crea token S3 e scrive `.env`):

```bash
# Token da https://dash.cloudflare.com/profile/api-tokens (permesso R2 Edit)
set CLOUDFLARE_API_TOKEN=il_tuo_token
npm run setup:r2
```

In dev senza credenziali R2 imposta `STORAGE_BACKEND=local` (fallback disco).

Verifica rapida: `npm run verify:stack` (Supabase + R2).

### PostgreSQL locale (solo fallback, non usato con Supabase)

Docker non è necessario se usi il database Supabase cloud. Il file `docker-compose.yml` resta solo come opzione offline.

## Utenti demo (seed)

| Email | Ruolo | Password |
|---|---|---|
| admin@pmp.local | admin | password123 |
| assistenza@pmp.local | assistenza | password123 |
| commerciale@pmp.local | commerciale | password123 |

Auth disabilitata di default (`AUTH_ENABLED=false`). Imposta `AUTH_ENABLED=true` in `.env` per attivare login e permessi.

## Test

```bash
npm run test
```

## Documentazione

- [PRD](docs/PRD.md)
- [RFC-001 MVP Core](docs/RFC-001-mvp-core.md)
- [AGENTS.md](AGENTS.md)
