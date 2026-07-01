# 01 — Initial Audit (Codebase Mapper)

**Agente:** codebase-mapper  
**Data:** 2026-07-01  
**Stato:** COMPLETATO

## Stack
npm workspaces, Next.js 15 App Router, Express 5 API, Prisma→Supabase PostgreSQL, R2, Groq, JWT auth, Vercel.

## Problemi principali (24)
- **CRITICAL:** API aperta con `AUTH_ENABLED=false` (fix parziale: `assertProductionConfig` su Vercel)
- **HIGH:** JWT fallback, CORS permissivo, security headers assenti, localStorage JWT
- **MEDIUM:** Prisma vs regola stack, Docker legacy, no CI/E2E, RLS permissive

## Handoff
Discovery strutturale completata. Live verification delegata ad agenti specializzati. MVP non dichiarabile senza evidenze live.
