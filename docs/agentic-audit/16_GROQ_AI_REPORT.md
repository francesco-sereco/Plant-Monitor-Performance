# Groq AI Integration Audit Report

**Data/ora audit:** 2026-07-01  
**Agente:** groq-ai-auditor  
**Repository:** Plant Monitor Performance  
**Scope:** `apps/web/server/modules/ai/`, `groq.client.ts`, `ai.service.ts`, `ai.routes.ts`, `scripts/ai-ping.ts`  
**Stato:** AUDIT COMPLETATO

---

## Executive summary

L'integrazione Groq è **minimale e server-side only**: un client HTTP (`groqChatCompletion`), un servizio di ping (`pingAi`) e due endpoint API (`/api/ai/status`, `/api/ai/ping`). Non esiste una funzione `callAI` né UI frontend che consumi l'AI. La chiave `GROQ_API_KEY` resta solo lato backend; non ci sono risposte AI finte nei flussi reali.

**Test Groq reale eseguito con successo** tramite `npm run ai:ping` (messaggio non sensibile: `"Rispondi solo OK"` → risposta `"OK"`, modello `openai/gpt-oss-20b`, 113 token).

Per il perimetro attuale (diagnostica/ping): **CONFORME**. Per un futuro uso AI su PDF o dati impianto: **PARZIALE** — mancano system prompt hardened, controllo umano, validazione output strutturato e policy anti-exfiltration.

---

## 1. Inventario componenti AI

| File | Ruolo |
|------|-------|
| `apps/web/server/modules/ai/groq.client.ts` | Client HTTP verso `https://api.groq.com/openai/v1/chat/completions` |
| `apps/web/server/modules/ai/ai.service.ts` | `pingAi()`, `isGroqConfigured()` — legge env e delega al client |
| `apps/web/server/modules/ai/ai.routes.ts` | Router Express: `GET /status`, `POST /ping` |
| `apps/web/scripts/ai-ping.ts` | Script CLI per smoke test Groq reale |
| `apps/web/server/lib/env.ts` | `getGroqEnv()`, `assertGroqConfig()` |
| `apps/web/server/app.ts` | Mount `/api/ai`, flag `ai.configured` in `/api/health` |
| `apps/web/server/modules/ai/*.test.ts` | Test unitari con `fetch` mockato (non produzione) |

**Funzione `callAI`:** **NON TROVATA** nel codebase. L'astrazione effettiva è `groqChatCompletion` (client) + `pingAi` (servizio).

---

## 2. GROQ_API_KEY — presenza e scope

| Controllo | Esito | Evidenza |
|-----------|-------|----------|
| Variabile definita in `.env.example` | OK | `GROQ_API_KEY=`, commento "solo backend (MAI NEXT_PUBLIC_)" |
| Lettura solo server-side | OK | `getGroqEnv()` in `server/lib/env.ts` usa `process.env.GROQ_API_KEY` |
| Nessun `NEXT_PUBLIC_GROQ_*` | OK | Grep su `apps/web`: nessuna esposizione client della chiave Groq |
| Chiave presente in ambiente locale audit | OK | `.env` locale: `GROQ_API_KEY` impostata (lunghezza 56, valore non loggato) |
| Warning se assente | OK | `assertGroqConfig()` logga warning all'avvio server |

```85:90:apps/web/server/lib/env.ts
/** Groq — solo backend. MAI usare NEXT_PUBLIC_ per la API key. */
export function getGroqEnv() {
  return {
    apiKey: process.env.GROQ_API_KEY ?? "",
    model: process.env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL,
  };
}
```

---

## 3. Architettura chiamata Groq

### 3.1 `groq.client.ts`

- **URL:** `https://api.groq.com/openai/v1/chat/completions`
- **Auth:** `Authorization: Bearer <apiKey>` — solo server
- **Payload:** singolo messaggio `role: user`, nessun system prompt
- **Parametri:** `temperature: 0.2`, `max_tokens: 256`
- **Timeout:** 15s (`DEFAULT_GROQ_TIMEOUT_MS`) via `AbortController`
- **Retry:** assente (singolo tentativo)
- **Validazione output:** rifiuta risposta vuota → `GroqApiError("Risposta AI vuota o non valida", 502)`
- **Errori HTTP:** `GroqApiError` con messaggio API o status; timeout → 504

### 3.2 `ai.service.ts`

- `pingAi(message)` → verifica chiave → `groqChatCompletion`
- `fetchFn` iniettabile solo per test (`options?.fetchFn`)
- Nessun fallback fake in produzione: se manca la chiave → `GroqNotConfiguredError`

### 3.3 `ai.routes.ts`

| Endpoint | Auth | Ruoli | Input | Output |
|----------|------|-------|-------|--------|
| `GET /api/ai/status` | `requireAuth` | tutti autenticati | — | `{ configured, model, provider }` |
| `POST /api/ai/ping` | `requireAuth` | `admin`, `assistenza` | Zod: `message` 1–500 char | `{ model, reply, usage }` |

Errori mappati:
- `GroqNotConfiguredError` → 503
- `GroqApiError` → 502 con messaggio generico (non espone dettaglio Groq al client)

### 3.4 `scripts/ai-ping.ts`

- Carica env server (`../server/lib/env.js`)
- Messaggio default non sensibile: `"Rispondi in una frase: cos'è il pH?"`
- Stampa JSON risultato o exit code 1

Script npm: `"ai:ping": "dotenv -e ../../.env -- tsx scripts/ai-ping.ts"`

---

## 4. Sicurezza

### 4.1 Punti conformi

| Area | Valutazione |
|------|-------------|
| Chiave solo backend | CONFORME |
| Endpoint protetti da auth | CONFORME (`/api/ai` sotto `requireAuthUnlessPublic`; AI non in path pubblici) |
| RBAC su ping | CONFORME (`admin`, `assistenza` only) |
| Nessuna risposta fake in runtime | CONFORME |
| Input validato (Zod) | CONFORME |
| Errore API non leakato al client | CONFORME (502 generico) |
| Nessun log esplicito di API key | CONFORME |
| AI non bypassa autorizzazioni | CONFORME (auth prima della chiamata Groq) |
| Dati cross-tenant automatici | NON INVIATI — solo `userMessage` fornito dall'utente |

`/api/health` espone solo `ai.configured: boolean` e `provider: "groq"` — accettabile (nessun segreto).

### 4.2 Gap e rischi

| Rischio | Severità | Dettaglio |
|---------|----------|-----------|
| Nessun system prompt / hardening | MEDIA | Input utente passato direttamente a Groq come unico messaggio; vulnerabile a prompt injection se in futuro si concatenano documenti o contesto |
| Utente può incollare dati sensibili nel ping | MEDIA | Nessun filtro PII; messaggio fino a 500 char inviato a Groq |
| Nessun retry con backoff | BASSA | Fallimento transitorio = errore immediato |
| Nessuna sanitizzazione output AI | BASSA (oggi) | Nessun frontend che renderizza `reply`; rischio XSS futuro se output AI mostrato come HTML |
| `AUTH_ENABLED=false` bypassa auth | NOTA | Comportamento documentato per dev; in prod deve essere `true` |
| Nessun controllo umano | N/A oggi | Coerente con PRD MVP (no AI prodotto); obbligatorio per futuro parsing PDF |
| Nessun salvataggio audit trail chiamate AI | BASSA | Nessun log strutturato di prompt/risposta (privacy positiva, tracciabilità negativa) |

---

## 5. Prompt, input, output

### Prompt

- **System prompt:** assente
- **User prompt:** solo il campo `message` della richiesta (o argv dello script)
- **Documenti come istruzioni:** non implementato (nessun invio PDF/testo R2 a Groq)

### Input

- API: Zod `z.string().trim().min(1).max(500)`
- Script: argv o default fisso sul pH

### Output

- Struttura tipizzata: `{ model, reply, usage: { promptTokens, completionTokens, totalTokens } }`
- Non persistito in DB
- Non mostrato in frontend (nessun riferimento a `/api/ai` in `apps/web/src`)

---

## 6. Error handling, timeout, retry, log

| Meccanismo | Stato |
|------------|-------|
| Timeout 15s | Implementato (`AbortController`) |
| Retry | Non implementato |
| Errori tipizzati | `GroqNotConfiguredError`, `GroqApiError` |
| Log prompt/risposta | Non presente |
| Log API key | Non presente (corretto) |

---

## 7. Risposte AI finte / mock

| Contesto | Mock? |
|----------|-------|
| `groq.client.ts` / `ai.service.ts` / `ai.routes.ts` | No — sempre chiamata reale o errore |
| `*.test.ts` | Sì — `fetchFn` mockato (isolato ai test Vitest) |
| Fallback statici se Groq down | No |

**Conclusione:** nei flussi reali **non ci sono risposte AI finte**.

---

## 8. Allineamento PRD

Il PRD (`docs/PRD.md`) stabilisce:
- **§5.5 / §37.6:** nel primo MVP **non è prevista AI lato prodotto**
- Futuro PDF/AI: output non deve modificare dati senza conferma umana

L'integrazione attuale è **infrastruttura diagnostica** (ping/status), non feature utente MVP. Coerente come preparazione stack, ma non va dichiarata "AI prodotto completata".

---

## 9. Test eseguiti

### 9.1 Test unitari (mock)

```
npx vitest run server/modules/ai --reporter=verbose
```

**Risultato:** 5/5 test passati (2 file: `groq.client.test.ts`, `ai.service.test.ts`)

### 9.2 Test Groq reale (non sensibile)

```
cd apps/web
npm run ai:ping -- "Rispondi solo OK"
```

**Risultato:** SUCCESSO (exit 0)

```json
{
  "model": "openai/gpt-oss-20b",
  "reply": "OK",
  "usage": {
    "promptTokens": 76,
    "completionTokens": 37,
    "totalTokens": 113
  }
}
```

**Chiamata Groq reale:** **SÌ** — evidenza comando + risposta con token usage da API Groq.

### 9.3 Test endpoint HTTP `/api/ai/ping`

**Non eseguito** in questo audit (richiede JWT/sessione autenticata). Copertura indiretta via stesso stack `pingAi` già verificato con script CLI.

---

## 10. Handoff orchestrator

| # | Voce | Esito |
|---|------|-------|
| 1 | **Funzione AI trovata** | `groqChatCompletion` (client), `pingAi` (servizio). `callAI` assente. Endpoint `GET /api/ai/status`, `POST /api/ai/ping`. Script `ai-ping.ts`. |
| 2 | **Chiamata Groq reale sì/no** | **SÌ** — `npm run ai:ping` → risposta reale da `openai/gpt-oss-20b`, 113 token totali. |
| 3 | **Sicurezza** | **CONFORME** per perimetro attuale: chiave solo server, auth + RBAC su ping, Zod input, no fake responses, errori non leakati. Gap futuri: prompt injection, PII volontaria, nessun controllo umano (non richiesto oggi). |
| 4 | **Output** | JSON `{ model, reply, usage }`; non salvato; non in frontend. |
| 5 | **Rischi** | (1) Input utente non hardened per injection; (2) possibile invio dati sensibili volontari nel ping; (3) nessun retry; (4) futuro rendering output senza sanitizzazione; (5) `AUTH_ENABLED=false` in dev apre endpoint. |
| 6 | **Blocker** | **Nessun blocker** per integrazione diagnostica attuale. Blocker futuri per AI PDF: system prompt, validazione schema output, review umana, policy dati tenant, audit log. |
| 7 | **Stato finale** | **CONFORME (infrastruttura Groq minima)** / **PARZIALE (AI prodotto MVP)** — Groq funzionante e sicuro nel perimetro ping; feature AI business non implementate come da PRD. |

---

## 11. Raccomandazioni (non bloccanti)

1. **Prima di AI su PDF:** introdurre `callAI` o layer servizio con system prompt fisso, schema output Zod, e flag `requiresHumanReview`.
2. **Rate limiting** su `POST /api/ai/ping` per evitare abuso quota Groq.
3. **Retry** con backoff solo su 429/5xx transitori (max 1–2 tentativi).
4. **Documentare** in README/dev che `ai:ping` invia testo a Groq — non usare dati cliente reali.
5. **Verificare** `GROQ_API_KEY` su Vercel production (non verificato in questo audit).

---

## 12. Variabili ambiente

| Variabile | Scope | Obbligatoria | Note |
|-----------|-------|--------------|------|
| `GROQ_API_KEY` | Server only | Per usare AI | Mai `NEXT_PUBLIC_` |
| `GROQ_MODEL` | Server only | No | Default `openai/gpt-oss-20b` |

---

## 13. Cosa controllare (utente)

- [ ] `GROQ_API_KEY` impostata su Vercel (Production/Preview se serve AI)
- [ ] `AUTH_ENABLED=true` in produzione
- [ ] `npm run ai:ping` in CI solo con secret masked (opzionale smoke)
- [ ] Prima di feature AI PDF: aprire task dedicato con controllo umano e validazione output

---

*Report generato da groq-ai-auditor — solo audit, nessuna modifica al codice applicativo.*
