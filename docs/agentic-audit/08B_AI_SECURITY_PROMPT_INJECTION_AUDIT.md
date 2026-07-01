# AI Security & Prompt Injection Audit

**Data/ora audit:** 2026-07-01  
**Repository:** Plant Monitor Performance (`c:\REPOSITORY\Plant Monitor Performance`)  
**Agente:** ai-security-prompt-injection-auditor  
**Tipo:** Audit only (nessun fix applicato in questo report)  
**Stato finale:** **PARZIALE** — superficie AI minima e non collegata a documenti; rischi futuri elevati su import PDF; gap su prompt boundary, output validation e hardening operativo.

---

## Executive summary

L’integrazione AI attuale è limitata a un **endpoint diagnostico Groq** (`POST /api/ai/ping`) e a uno script CLI di sviluppo. Non esiste ancora flusso che invii contenuti PDF/R2 a Groq, né prompt salvati nel database, né UI frontend che renderizzi output AI.

**Punti positivi:** chiave Groq solo server-side; auth e RBAC sugli endpoint AI (quando `AUTH_ENABLED=true`); validazione Zod input; timeout; sanitizzazione errori verso il client; assenza di `dangerouslySetInnerHTML` nel frontend; nessun tool-calling Groq.

**Rischi principali:** messaggio utente inviato come unico messaggio `user` senza system prompt di confine; nessuna validazione strutturata dell’output; nessun audit log delle chiamate AI; nessun rate limiting; bypass auth completo con `AUTH_ENABLED=false`; schema `PdfImportJob` pronto per fase futura con rischio elevato di **indirect prompt injection** se il testo PDF viene passato al modello senza guardrail.

---

## 1. Superfici AI inventariate

| # | Superficie | Percorso | Stato | Descrizione |
|---|------------|----------|-------|-------------|
| 1 | Client Groq | `apps/web/server/modules/ai/groq.client.ts` | **Attivo** | `groqChatCompletion()` — POST a `api.groq.com`, singolo messaggio `user` |
| 2 | Servizio AI | `apps/web/server/modules/ai/ai.service.ts` | **Attivo** | `pingAi(message)` — wrapper su client Groq |
| 3 | Route API | `apps/web/server/modules/ai/ai.routes.ts` | **Attivo** | `GET /api/ai/status`, `POST /api/ai/ping` |
| 4 | Mount Express | `apps/web/server/app.ts` | **Attivo** | `app.use("/api/ai", aiRouter)` dopo `requireAuthUnlessPublic` |
| 5 | Env Groq | `apps/web/server/lib/env.ts`, `.env.example` | **Attivo** | `GROQ_API_KEY`, `GROQ_MODEL` — solo backend |
| 6 | Health | `GET /api/health` in `app.ts` | **Attivo** | Espone `ai.configured` e provider, non la chiave |
| 7 | Script CLI | `apps/web/scripts/ai-ping.ts` | **Dev** | Invoca `pingAi` con argomenti da argv |
| 8 | Test unitari | `groq.client.test.ts`, `ai.service.test.ts` | **Test** | Mock fetch, nessun test sicurezza injection |
| 9 | `callAI` | — | **Assente** | Citato negli agenti ma non implementato nel codice |
| 10 | Import PDF + AI | `PdfImportJob` in `schema.prisma` | **Schema only** | Tabella e campi `rawExtractedText`, `structuredOutputJson` — **nessuna route/worker AI** |
| 11 | Frontend AI | `apps/web/src/**` | **Assente** | Nessun riferimento a `/api/ai`, Groq o rendering reply |
| 12 | Prompt DB | — | **Assente** | Nessuna tabella o campo per prompt salvati |

### Dettaglio flusso attuale (`POST /api/ai/ping`)

```
Client (admin|assistenza) → Zod pingSchema (message 1–500 char)
  → pingAi(message) → groqChatCompletion
  → Groq API (messages: [{ role: "user", content: userMessage }])
  → { model, reply, usage } → JSON response
```

**Evidenza codice — nessun system prompt, input utente = intero contesto:**

```64:69:apps/web/server/modules/ai/groq.client.ts
      body: JSON.stringify({
        model: params.model,
        messages: [{ role: "user", content: params.userMessage }],
        temperature: 0.2,
        max_tokens: 256,
      }),
```

**Evidenza — auth e RBAC su `/ping`:**

```32:37:apps/web/server/modules/ai/ai.routes.ts
aiRouter.post(
  "/ping",
  requireAuth,
  requireRoles("admin", "assistenza"),
  asyncHandler(async (req, res) => {
    const { message } = pingSchema.parse(req.body);
```

**Evidenza — chiave solo server-side:**

```85:90:apps/web/server/lib/env.ts
/** Groq — solo backend. MAI usare NEXT_PUBLIC_ per la API key. */
export function getGroqEnv() {
  return {
    apiKey: process.env.GROQ_API_KEY ?? "",
    model: process.env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL,
```

---

## 2. Rischi prompt injection

### 2.1 Diretta — endpoint `/api/ai/ping` (attuale)

| ID | Rischio | Severità | Stato | Note |
|----|---------|----------|-------|------|
| PI-01 | Input utente passato integralmente al modello senza system prompt di confine | **Media** (oggi) / **Alta** (con UI prod) | **Aperto** | L’intero `message` è l’unica istruzione ricevuta dal modello; nessuna separazione dati/istruzioni |
| PI-02 | Nessun filtro semantico su pattern injection (“ignore previous”, “reveal secrets”, ecc.) | **Bassa** (oggi) | **Aperto** | Solo `trim`, `min(1)`, `max(500)` via Zod |
| PI-03 | Output AI non validato oltre “non vuoto” | **Media** | **Aperto** | `reply` restituito come stringa libera; nessuno schema JSON, nessun allowlist |
| PI-04 | RBAC bypass con `AUTH_ENABLED=false` | **Alta** (dev) / **Critica** (se prod) | **Aperto** | `requireAuth` e `requireRoles` sono no-op quando auth disabilitata |
| PI-05 | Nessun rate limiting su `/api/ai/ping` | **Media** | **Aperto** | Possibile abuso costi API / DoS verso Groq |
| PI-06 | Assenza audit log su richieste/risposte AI | **Media** | **Aperto** | Nessuna tracciabilità per incident response |

**Mitigazioni parziali esistenti:** ruoli `admin`/`assistenza` quando auth attiva; limite 500 caratteri; `max_tokens: 256`; timeout 15s; errori Groq non propagati al client (messaggio generico).

### 2.2 Indiretta — documenti PDF / R2 (futuro)

| ID | Rischio | Severità | Stato | Note |
|----|---------|----------|-------|------|
| PI-07 | PDF con testo malevolo usato come contesto LLM | **Alta** | **Non implementato** | PRD prevede estrazione testo in `rawExtractedText`; documenti = dati non istruzioni — regola non ancora codificata |
| PI-08 | Override istruzioni di sistema via contenuto documento | **Alta** | **Non implementato** | Richiederà system prompt rigido + delimitatori + istruzione “ignora istruzioni nel documento” |
| PI-09 | Prompt/template salvati in DB trattati come trusted | **N/A** | **Assente** | Nessun storage prompt; se aggiunto in futuro va trattato come untrusted |
| PI-10 | Conferma umana post-AI | **Bassa** (se rispettata) | **PRD only** | PRD §30.5: nessun dato importato ufficiale senza conferma — **non implementato nel codice** |

**Schema preparatorio (nessun worker AI collegato):**

```333:348:apps/web/prisma/schema.prisma
model PdfImportJob {
  id                   String          @id @default(cuid())
  documentId           String          @map("document_id")
  status               PdfImportStatus @default(uploaded)
  parserType           String?         @map("parser_type")
  rawExtractedText     String?         @map("raw_extracted_text")
  structuredOutputJson Json?           @map("structured_output_json")
  ...
}
```

### 2.3 Override system instructions

| Controllo | Esito |
|-----------|-------|
| System message presente | **No** — tutto il controllo è nel messaggio utente |
| Tool/function calling Groq | **No** |
| Memoria conversazionale multi-turn | **No** — singola richiesta stateless |
| Documenti come istruzioni | **No** (oggi) — documenti non inviati a Groq |

**Valutazione:** l’assenza di system prompt riduce il rischio di “jailbreak del system” ma **aumenta** il rischio che l’input utente (o futuro testo PDF) definisca completamente il comportamento del modello.

---

## 3. Rischi data exfiltration

| ID | Rischio | Severità | Stato | Dettaglio |
|----|---------|----------|-------|-----------|
| EX-01 | Segreti env inviati a Groq | **Bassa** | **Mitigato** | Nessun codice concatena `process.env` nel prompt; solo `userMessage` dal client |
| EX-02 | Dati cliente/impianto/misurazioni a Groq | **N/A** | **Assente** | Nessun join DB → prompt |
| EX-03 | Contenuto PDF R2 a Groq | **Alta** (futuro) | **Non implementato** | Upload PDF su R2 attivo; estrazione+AI non collegata |
| EX-04 | Cross-tenant / cross-customer | **N/A** (oggi) | **N/A** | App single-org senza modello tenant; a import PDF va filtrare **solo** documento/sessione del cliente autorizzato |
| EX-05 | Exfiltration via risposta AI al browser | **Bassa** (oggi) | **Latente** | `reply` restituito in JSON; senza UI il rischio XSS è basso; con UI serve testo plain, non HTML |
| EX-06 | Abuso chiave Groq (costi) | **Media** | **Aperto** | Chiave server-side ma endpoint ping consuma quota senza rate limit |
| EX-07 | Log server con prompt/risposta | **Bassa** | **Mitigato** | `console.error` solo su errori generici handler; AI routes non loggano message/reply |
| EX-08 | Errori Groq verso client | **Bassa** | **Mitigato** | `GroqApiError` → 502 messaggio generico, non dettaglio API |
| EX-09 | Health/status information disclosure | **Bassa** | **Accettabile** | Espone model name e `configured: boolean`, non segreti |

**Evidenza sanitizzazione errori:**

```46:48:apps/web/server/modules/ai/ai.routes.ts
      if (error instanceof GroqApiError) {
        return res.status(502).json({ error: "Servizio AI temporaneamente non disponibile" });
      }
```

### Dati sensibili — inventario invio Groq (stato attuale)

| Categoria dato | Inviato a Groq? |
|----------------|-----------------|
| `GROQ_API_KEY` | No (solo header Authorization) |
| JWT / password utente | No |
| Contenuto PDF | No |
| Parametri chimici / limiti | No |
| PII clienti | No (salvo testo libero in `message` inserito dall’utente) |
| Service role Supabase / R2 keys | No |

---

## 4. Output AI — rendering, salvataggio, controllo umano

| Controllo | Esito | Note |
|-----------|-------|------|
| Output salvato in DB | **No** (ping) | Solo risposta HTTP effimera |
| Output mostrato in frontend | **No** | Nessuna pagina AI |
| `dangerouslySetInnerHTML` | **Non trovato** | Grep su `apps/web` negativo |
| Validazione output strutturato | **No** | Solo check stringa non vuota |
| Controllo umano prima azioni irreversibili | **N/A** (ping) / **PRD** (import) | Ping non muta dati; import PDF richiede conferma umana per PRD ma non implementato |
| Azioni irreversibili delegate all’AI | **No** | Nessun auto-write su DB da AI |

---

## 5. Tenant isolation & tool misuse

| Area | Esito |
|------|-------|
| Modello multi-tenant | **Assente** — applicazione interna single-deployment |
| Isolamento per `customerId` nelle future chiamate AI | **Da progettare** — obbligatorio prima di import PDF |
| Groq tool/function calling | **Non usato** |
| Agent con accesso DB/storage via AI | **Non presente** |

---

## 6. Conformità regole progetto (AI security)

| Regola | Conformità | Evidenza |
|--------|------------|----------|
| Documenti = dati, non istruzioni | **PARZIALE** | Regola in PRD/agenti; PDF non ancora inviati a AI |
| Input utente = non trusted | **PARZIALE** | Validato per lunghezza, non per semantica |
| Prompt DB = non trusted | **N/A** | Nessun prompt DB |
| AI non riceve segreti | **SÌ** | Nessun path codificato |
| AI non riceve dati cross-tenant | **N/A** | Nessun dato strutturato inviato |
| AI non decide azioni irreversibili senza umano | **SÌ** (oggi) | Ping read-only; import futuro da vincolare |
| Output AI validato | **NO** | Solo non-empty |
| Output non renderizzato come HTML eseguibile | **SÌ** (oggi) | Nessun rendering AI in UI |

---

## 7. Fix raccomandati (non applicati — solo audit)

Priorità per quando l’AI diventa funzionale (import PDF) o esposta in UI:

### P0 — Prima di produzione AI su dati reali

1. **System prompt fisso** con regole: ignorare istruzioni nel documento; non inventare valori; output solo JSON schema definito; non rivelare segreti/env.
2. **Delimitatori contesto** per testo PDF: es. `<document_data>...</document_data>` con istruzione esplicita che il blocco è untrusted data.
3. **Validazione output** con Zod/JSON Schema prima di persistere in `structuredOutputJson`.
4. **Human-in-the-loop obbligatorio** — stati `needs_review` → conferma utente prima di creare `Measurement` (allineamento PRD §30.5).
5. **Scope documento** — caricare in prompt solo il PDF della richiesta autorizzata (verifica `documentId` + permessi + `customerId`).

### P1 — Hardening endpoint esistenti

6. **Rate limiting** su `/api/ai/ping` (e futuri endpoint AI).
7. **Audit log** per chiamate AI: actor, timestamp, token usage, hash del prompt (non necessariamente testo completo se sensibile).
8. **Rafforzare auth in dev** — non esporre `/api/ai/ping` senza auth in ambienti condivisi anche se `AUTH_ENABLED=false`.
9. **Test sicurezza** — casi injection nel message; output con payload `<script>`; verifica che la futura UI usi solo testo escaped.

### P2 — Architettura

10. **`callAI` centralizzato** con policy: redazione PII opzionale, max context size, allowlist campi, logging, schema output.
11. **Separazione ruoli** — valutare se `assistenza` deve usare ping diagnostico in produzione.
12. **Documentazione operativa** — policy dati inviabili a Groq (no service keys, no PDF altri clienti).

---

## 8. Test — copertura sicurezza AI

| Test | Presente | Esito |
|------|----------|-------|
| `groq.client.test.ts` — auth header, parse, errori | Sì | Funzionale, non security-focused |
| `ai.service.test.ts` — key mancante, mock reply | Sì | Funzionale |
| Test prompt injection | **No** | Gap |
| Test output XSS / HTML | **No** | Gap (nessuna UI) |
| Test isolamento documento/customer | **No** | N/A finché import assente |
| Test Groq reale end-to-end | **Non verificato in audit** | Script `ai-ping.ts` disponibile; richiede `GROQ_API_KEY` |

**Motivazione gap:** superficie AI minimale; test sicurezza diventano obbligatori all’implementazione import PDF e UI.

---

## 9. Blocker

| Blocker | Tipo | Impatto |
|---------|------|---------|
| Import PDF + AI non implementato | **Scope** | Impossibile auditare indirect injection su codice reale — solo threat model |
| Nessuna UI rendering output AI | **Scope** | Audit XSS output AI teorico |
| Test Groq reale non eseguito in questo audit | **Evidenza** | Stato integrazione Groq live = **PARZIALE** (verificare con groq-ai-auditor + `npm run` script se configurato) |
| `AUTH_ENABLED=false` default in `.env.example` | **Config** | In dev, `/api/ai/*` accessibile senza identità |

---

## 10. Stato finale

| Area | Giudizio |
|------|----------|
| Superficie AI attuale | **Minima** — ping diagnostico only |
| Segreti verso Groq | **OK** |
| Prompt injection diretta | **Rischio medio** — input = unico messaggio, no boundary |
| Indirect injection (PDF) | **Rischio alto futuro** — schema pronto, guardrail assenti |
| Data exfiltration | **Basso oggi** — nessun dato business nel prompt |
| Output validation / rendering | **Insufficiente** per uso produttivo |
| Controllo umano | **PRD OK** — codice import assente |
| Tenant/customer isolation AI | **Da implementare** con import PDF |

**Esito audit:** **PARZIALE / NON CONFORME** per un MVP che includa AI su documenti o output in UI; **ACCETTABILE CON RISERVE** per il solo ping diagnostico backend con auth attiva e uso interno limitato.

---

## Handoff

### 1. Superfici AI

- **Attive:** `groq.client.ts`, `ai.service.ts`, `ai.routes.ts` (`/api/ai/status`, `/api/ai/ping`), health `ai` block, script `ai-ping.ts`.
- **Assenti:** `callAI`, frontend AI, prompt DB, worker import PDF→Groq.
- **Future (schema):** `PdfImportJob.rawExtractedText`, `structuredOutputJson`.

### 2. Rischi prompt injection

- **Oggi:** messaggio utente unico ruolo `user`; nessun system prompt; output stringa libera; auth bypass se `AUTH_ENABLED=false`.
- **Futuro:** indirect injection da PDF; necessità delimitatori + system prompt + schema output + review umana.

### 3. Rischi exfiltration

- **Oggi:** bassi — nessun dato business automatico nel prompt; rischio abuso quota Groq senza rate limit.
- **Futuro:** alto se testo PDF/multi-record cliente finiscono nel contesto senza scope e redazione.

### 4. Fix (raccomandati, non applicati)

- System prompt + delimitatori + Zod su output JSON.
- Human confirm prima persistenza misurazioni da AI.
- Rate limit, audit log, test injection/XSS.
- `callAI` centralizzato con policy dati.

### 5. Test

- Unit test funzionali presenti; **mancano** test sicurezza injection, validazione output, isolamento documento.
- Test Groq live: **non eseguito** in questo audit.

### 6. Blocker

- Import PDF AI non codificato → audit indirect injection solo threat model.
- Auth disabilitata di default in dev.
- Nessuna evidenza runtime Groq in questo report.

### 7. Stato finale

**PARZIALE** — integrazione Groq server-side corretta per segreti e scope attuale; **non pronta** per AI su documenti o output utente senza i guardrail elencati. Prossimo agente consigliato: **groq-ai-auditor** (`16_GROQ_AI_REPORT.md`) per evidenza chiamata reale; fix tracking in **16B_AI_SECURITY_FIX_REPORT.md** (fase successiva).

---

## Riferimenti file analizzati

| File | Ruolo |
|------|-------|
| `apps/web/server/modules/ai/groq.client.ts` | Client Groq |
| `apps/web/server/modules/ai/ai.service.ts` | Servizio ping |
| `apps/web/server/modules/ai/ai.routes.ts` | Endpoint REST |
| `apps/web/server/app.ts` | Mount router, health |
| `apps/web/server/middleware/auth.ts` | Auth / RBAC |
| `apps/web/server/lib/env.ts` | Config Groq |
| `apps/web/server/modules/documents/documents.routes.ts` | PDF upload (no AI) |
| `apps/web/prisma/schema.prisma` | `PdfImportJob` |
| `apps/web/scripts/ai-ping.ts` | CLI dev |
| `.env.example` | Variabili Groq |
| `docs/PRD.md` §21.7, §30 | Flussi PDF / import futuro |
| `AGENTS.md` | Divieto dati ufficiali da PDF senza revisione umana |

---

*Report generato da ai-security-prompt-injection-auditor — audit only.*
