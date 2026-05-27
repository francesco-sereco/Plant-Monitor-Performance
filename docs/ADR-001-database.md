# ADR-001 — Database

**Decisione:** PostgreSQL 16 con Prisma ORM.

**Motivazione:** Dati fortemente relazionali (PRD sez. 5.2). Prisma offre migrazioni type-safe e seed.

**Conseguenze:** Docker Compose per dev locale; `DATABASE_URL` in `.env`.
