# 02 — Supabase Database Audit

**Agente:** supabase-db-auditor  
**Data:** 2026-07-01  
**Live access:** SÌ (MCP)  
**Progetto:** kctqmywrtxekvwiynfla — ACTIVE_HEALTHY  
**Stato:** PARZIALE

## Evidenza live
- 16 tabelle, tutte `rls_enabled=true`
- Policy `pmp_app_all` (USING true) per ruolo `pmp_app`
- `anon`/`authenticated` senza grant su tabelle
- Schema allineato a Prisma/PRD

## Gap
- `rls_auto_enable()` SECURITY DEFINER esposto ad anon/authenticated (WARN advisor)
- Doppio track migrazioni Prisma vs Supabase dashboard
- `source_document_id` senza FK
- Backend usa solo Prisma; client Supabase JS non usato

## Handoff
Schema OK. Sicurezza RLS non tenant-aware. Revoke EXECUTE su `rls_auto_enable` consigliato.
