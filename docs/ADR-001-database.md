# ADR-001 — Database

**Decisione:** PostgreSQL 16 con Prisma ORM.

**Motivazione:** Dati fortemente relazionali (PRD sez. 5.2). Prisma offre migrazioni type-safe e seed.

**Conseguenze:** PostgreSQL gestito su Supabase (cloud); Prisma si connette via ruolo dedicato `pmp_app`; `DATABASE_URL` in `.env`. Docker Compose non è più il database di default (solo legacy opzionale).
