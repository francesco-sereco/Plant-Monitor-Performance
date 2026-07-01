# Migration Report — Prompt 2

**Data:** 2026-07-01  
**Agente:** migration-alignment-auditor + supabase-db-auditor  
**ORM:** Prisma 6.x su PostgreSQL Supabase  
**ADR:** `docs/ADR-001-database.md`

---

## Executive summary

Migrazioni Prisma presenti e applicate su Supabase. RLS abilitata via `20260630160000_enable_rls`. Ruolo DB `pmp_app` con policy permissiva. **Prisma documentato come necessario** (ADR-001) — non rimosso per stack method.

**Stato:** COMPLETATO (schema) / PARZIALE (RLS least-privilege)

---

## Inventario migrazioni

| Migration | Contenuto | Stato |
|-----------|-----------|-------|
| `20260630120000_init` | Schema completo MVP | Applicata |
| `20260630160000_enable_rls` | RLS + policy `pmp_app_all` su 14 tabelle | Applicata |
| `20260701120000_system_checks` | Tabella `system_checks` + RLS | Applicata |

---

## Prisma vs stack method

| Domanda | Risposta |
|---------|----------|
| Prisma necessario? | **Sì** — ADR-001: relazioni type-safe, seed, migrazioni |
| Alternativa Supabase client? | Possibile futuro; refactor non in scope Prompt 2 |
| Violazione agentic method? | **No** — documentato, usato attivamente, non dead code |
| Rimozione consigliata? | **No** — costo refactor >> beneficio MVP |

---

## RLS live

**Evidenza:** `verify:supabase` PASS; migrazione SQL in repo.

```sql
CREATE POLICY "pmp_app_all" ON "customers" FOR ALL TO pmp_app USING (true) WITH CHECK (true);
-- ... stessa policy su tutte le tabelle applicative
```

| Controllo | Esito |
|-----------|-------|
| RLS abilitato | ✅ |
| Policy per `anon` | ❌ Assenti (corretto) |
| Policy least-privilege | ❌ `USING (true)` |
| Protezione se Express bypassato | ❌ Debole |

**Criticità:** MEDIA — accettabile single-tenant; blocker per multi-tenant.

---

## Connessione produzione

| Aspetto | Config |
|---------|--------|
| Pooler | Transaction pooler Supabase su Vercel (commit `e8fd367`) |
| `DATABASE_URL` | Server-only, presente su Vercel |
| `pmp_app` role | Usato da Prisma |

---

## Seed

| Script | Uso | Rischio prod |
|--------|-----|--------------|
| `prisma/seed.ts` | Dev locale | Alto se eseguito su prod |
| `scripts/seed-supabase-rest.mjs` | `npm run db:seed` | Alto su prod |

**Raccomandazione:** non eseguire seed su production; ambiente staging dedicato.

---

## Gap migrazioni

| Gap | Priorità | Azione |
|-----|----------|--------|
| RLS granulare per ruolo | P2 | Future migration se multi-tenant |
| Policy download documents | P1 | Logica in Express, non RLS |
| Indici performance export CSV | P3 | Post-MVP |

---

## Handoff

- **Migrazioni:** COMPLETATE e verificate (`verify:supabase`)
- **Prisma:** NECESSARIO (ADR-001)
- **RLS:** PARZIALE — abilitata ma permissiva
- **Azione:** documentare threat model; no nuova migration in Prompt 2
