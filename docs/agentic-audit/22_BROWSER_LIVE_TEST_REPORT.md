# Browser Live Test Report

**Data:** 2026-07-01  
**Agente:** browser-live-tester  
**URL:** https://pmp-web-five.vercel.app

## Esito: PARZIALE

Automazione browser (Playwright/Cypress) non disponibile. Verifica live eseguita via HTTP/MCP Vercel.

| Test | Esito | Evidenza |
|------|-------|----------|
| Homepage | PASS | GET / 200 (MCP web_fetch) |
| API health | PASS | authEnabled=true, R2, Groq configured |
| Login API | PASS | POST /api/auth/login 200 (credenziali seed documentate) |
| Lettura clienti | PASS | GET /api/customers 200, 3 record |
| Lettura impianti | PASS | GET /api/plants 200, 5 record |
| Groq live | PASS | POST /api/ai/ping 200 |
| Console/network | NON DIMOSTRATO | Nessun tool browser |
| Upload R2 UI | NON ESEGUITO | 0 documenti in DB |
| Scrittura da UI | NON ESEGUITO | Solo API |

## Handoff

Login verificato via API. Browser UX completo: **BLOCCATO** (no browser automation). Flussi API live: **COMPLETATO**.
