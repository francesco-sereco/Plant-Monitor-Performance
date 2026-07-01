# Final Compliance Gate — Prompt 2

**Data:** 2026-07-01  
**Agente:** final-compliance-gate  
**Ispettore:** Non ottimista — evidenza obbligatoria

---

## ESITO FINALE

# MVP tecnico parzialmente allineato

Non è consentito dichiarare **"MVP tecnico allineato"** per i blocker documentati sotto.

---

## Motivazione gate

| Requisito Prompt Master | Esito | Blocca "allineato"? |
|-------------------------|-------|---------------------|
| Supabase live | ✅ COMPLETATO | No |
| RLS live + policy | ⚠️ PARZIALE (`USING true`) | Sì (parziale) |
| R2 live | ✅ COMPLETATO | No |
| Groq reale | ✅ COMPLETATO | No |
| Browser live autenticato | ❌ BLOCCATO | **Sì** |
| Mock/static remediation | ⚠️ PARZIALE | Sì (parziale) |
| Sicurezza dimostrata | ❌ IDOR download aperto | **Sì** |
| Build | ✅ COMPLETATO | No |
| Test | ✅ COMPLETATO | No |
| Commit/push fix | ❌ NON DIMOSTRATO | **Sì** |
| Deploy production con fix | ❌ NON DIMOSTRATO | **Sì** |

**5 blocker** su 11 criteri critici → esito **parzialmente allineato**, non blocco oggettivo totale (il sistema funziona in prod con audit precedente, fix pronti ma non deployati).

---

## Requisiti per stato

### COMPLETATI (10)

1. Struttura codebase e inventario endpoint
2. Supabase connectivity live (`verify:supabase`)
3. R2 connectivity live (`verify:r2`, health)
4. Groq integrazione reale (`ai:ping`)
5. Build produzione Next.js
6. Test unitari 25/25
7. verify-live production URL
8. Env/secrets Vercel (18 variabili)
9. Limiti da DB con priorità scope
10. Prisma documentato necessario (ADR-001)

### PARZIALI (10)

1. RLS — abilitata ma policy permissiva `pmp_app_all`
2. Sicurezza — P0 fix applicati, IDOR/rate limit/headers aperti
3. Mock/static — 6/8 remediation; dev fallback residui
4. Frontend UX — no mock dati; empty state, download JWT
5. Backend — validazione query params assente
6. R2 E2E — no upload/download PDF testato
7. AI security — OK ping; no guardrail PDF futuro
8. Supply chain — CVE dev; upload solo MIME
9. Privacy — MVP interno; GDPR formale assente
10. Alignment DB/UI — limiti form UX

### BLOCCATI (1)

1. **Browser live autenticato** — nessuna password test fornita

### NON DIMOSTRATI (2)

1. **Commit** fix sicurezza + report audit
2. **Deploy** production con fix sessione corrente

### NON APPLICABILI (2)

1. CI GitHub Actions (assente)
2. E2E Playwright (non in scope)

---

## Criticità residue ordinate

| # | Criticità | Severità | Stato |
|---|-----------|----------|-------|
| 1 | IDOR download PDF | CRITICA | APERTA |
| 2 | Fix sicurezza non committati/deployati | ALTA | APERTA |
| 3 | Browser auth test bloccato | ALTA | BLOCCATA |
| 4 | RLS permissive | MEDIA | DOCUMENTATA |
| 5 | Frontend download senza Bearer | ALTA | APERTA |
| 6 | Rate limit login | MEDIA | APERTA |
| 7 | Prisma vs stack method | BASSA | ACCETTATA (ADR-001) |

---

## Conformità metodo agentico

| Controllo | Esito |
|-----------|-------|
| Subagenti reali invocati | ✅ 12 agenti |
| Report separati | ✅ `docs/agentic-audit/` |
| No simulazione narrativa | ✅ |
| No dichiarazione falsa MVP | ✅ Gate blocca |
| Evidenza comandi/log | ✅ test, build, verify scripts |

---

## Azioni obbligatorie prima di "allineato"

1. Commit + push fix P0 → redeploy Vercel
2. Credenziali test → browser-live-tester completo
3. Fix IDOR download + frontend fetch autenticato
4. (Consigliato) Test integrazione download 401/403
5. (Opzionale) RLS granulare o threat model firmato

---

## Handoff orchestratore

| Campo | Valore |
|-------|--------|
| **Esito** | MVP tecnico parzialmente allineato |
| **Completati** | 10 |
| **Parziali** | 10 |
| **Bloccati** | 1 |
| **Non dimostrati** | 2 |
| **Commit** | `44de967` (remote); fix unstaged |
| **Deploy** | https://pmp-web-five.vercel.app (pre-fix) |
| **URL** | https://pmp-web-five.vercel.app |
| **Cosa manca** | commit, deploy fix, browser auth, IDOR, RLS granulare |
