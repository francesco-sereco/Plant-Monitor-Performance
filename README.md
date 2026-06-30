# Plant Monitor Performance

Applicativo web interno per storicizzare, consultare e analizzare parametri chimici degli impianti di trattamento acqua.

## Stack

- **Frontend:** Next.js 15 + Tailwind CSS + Recharts + Supabase client
- **Backend:** Express + Prisma + PostgreSQL (Supabase)
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

# (opzionale) Verifica connessione
npm run verify:supabase

# 5. Avvia API + Web
npm run dev
```

- **Web:** http://localhost:3000
- **API:** http://localhost:4000/api/health

### Database

Il progetto usa **un solo database**: Supabase PostgreSQL (`kctqmywrtxekvwiynfla`, regione `eu-west-1`).

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

> Un solo file `.env` nella root del monorepo: viene letto da API, Next.js e Prisma.

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
