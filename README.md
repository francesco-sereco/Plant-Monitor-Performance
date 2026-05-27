# Plant Monitor Performance

Applicativo web interno per storicizzare, consultare e analizzare parametri chimici degli impianti di trattamento acqua.

## Stack

- **Frontend:** Next.js 15 + Tailwind CSS + Recharts
- **Backend:** Express + Prisma + PostgreSQL
- **Monorepo:** npm workspaces

## Avvio locale

### Prerequisiti

- Node.js 20+
- Docker Desktop (per PostgreSQL)

### Setup

```bash
# 1. Copia variabili ambiente
cp .env.example .env

# 2. Avvia PostgreSQL
npm run db:up

# 3. Installa dipendenze
npm install

# 4. Migrazioni e seed demo
npm run db:migrate
npm run db:seed

# 5. Avvia API + Web
npm run dev
```

- **Web:** http://localhost:3000
- **API:** http://localhost:4000/api/health

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
