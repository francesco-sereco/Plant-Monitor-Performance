# Privacy & Data Protection Audit — Plant Monitor Performance

**Data/ora audit:** 2026-07-01  
**Agente:** security-privacy-auditor  
**Metodo:** revisione difensiva statica (modello dati, flussi, retention, export, AI, log)  
**Riferimenti:** PRD §37 (Privacy e compliance), AGENTS.md, security rules workspace  
**Evidenza:** schema Prisma/migrazioni, route API, `audit.service.ts`, `.env.example`, seed

---

## 1. Executive summary

L'applicazione tratta **dati aziendali cliente** (anagrafiche, impianti, parametri chimici, PDF tecnici) e **dati utenti interni** (email, nome, ruolo). È un tool **interno single-tenant** senza funzionalità self-service per l'interessato (diritti GDPR). La separazione dati/file (Supabase + R2) è corretta; mancano policy di retention implementate, minimizzazione nei log audit, controlli export, e valutazione trasferimento dati verso Groq (provider US).

**Stato privacy:** PARZIALE — adeguato per MVP interno controllato; **non conforme** a un trattamento GDPR strutturato senza documentazione e controlli aggiuntivi.

---

## 2. Inventario dati trattati

### 2.1 Categorie di dati (mapping PRD §37.1)

| Categoria | Campi / entità | Tipo | Sensibilità |
|-----------|----------------|------|-------------|
| Dati cliente aziendali | `customers.businessName`, `code`, `address`, `city`, `province`, `country` | B2B | Media |
| Referenti cliente | `contactName`, `contactEmail`, `contactPhone` | Personali (se persone fisiche) | **Alta** se PF |
| Dati impianto | `plants.*`, `serialNumber`, `location`, `notes` | Tecnici/B2B | Media |
| Dati tecnici / chimici | `measurements`, `limits`, compliance | Tecnici | Media — possono rivelare processo industriale cliente |
| Documenti PDF | `documents` + blob R2 | Contrattuali/tecnici | **Alta** |
| Dati utenti interni | `users.email`, `name`, `role`, `passwordHash` | HR/IT | Alta |
| Log operativi | `audit_logs` | Tracciamento | Media-Alta (può contenere snapshot PII) |
| Dati AI (opzionale) | Messaggio utente in `/api/ai/ping` | Input volontario | Variabile |

### 2.2 Dati NON trattati (osservato)

- Nessun cookie di tracciamento / analytics third-party nel frontend.
- Nessun `getSupabaseBrowser()` usato nei flussi UI — client Supabase definito ma **inutilizzato** (`src/lib/supabase.ts`).
- Nessun dato pagamento o sanitario.

---

## 3. Base giuridica e finalità

| Aspetto | Stato |
|---------|-------|
| Finalità documentata | PRD: gestione operativa assistenza tecnica/commerciale |
| Base giuridica GDPR esplicita | **Non documentata** nel repo (manca informativa/registro trattamenti) |
| Legittimo interesse / contratto | Da formalizzare lato azienda — fuori scope codice |
| Consenso | Non richiesto per utenti interni; per referenti cliente non gestito |

**Raccomandazione:** documentare registro trattamenti (Art. 30 GDPR) per: clienti, referenti, PDF, log audit, eventuale Groq.

---

## 4. Minimizzazione e necessità

### 4.1 Punti positivi

- Campi referente opzionali (`contactEmail`, `contactPhone`, `contactName`).
- Soft delete su clienti, impianti, documenti, misure (`deletedAt`).
- PDF non in DB — solo metadati + path R2.
- Password solo hash bcrypt — mai in chiaro.
- AI endpoint limitato a messaggio max 500 caratteri; nessun invio automatico di dati cliente a Groq nel flusso `ping`.

### 4.2 Gap minimizzazione

| ID | Severità | Descrizione | Evidenza |
|----|----------|-------------|----------|
| PRIV-001 | **ALTO** | Audit log salva `beforeJson` / `afterJson` **completi** dell'entità — può includere PII referenti, note, filename PDF. | `audit.service.ts`, chiamate in `measurements.routes.ts`, `limits.routes.ts`, `documents.routes.ts` |
| PRIV-002 | **MEDIO** | Export CSV include `businessName`, settore, impianto senza filtro obbligatorio — export massivo possibile. | `measurements.routes.ts` `/export` |
| PRIV-003 | **MEDIO** | `originalFilename` PDF conservato — può contenere nomi cliente/impianto nel filename. | `documents.routes.ts` |
| PRIV-004 | **MEDIO** | Health endpoint espone metadati infrastruttura (non PII diretta, ma reconnaissance). | `app.ts` `/api/health` |
| PRIV-005 | **BASSO** | Seed dev contiene email fittizie e password nota `password123`. | `prisma/seed.ts` |

---

## 5. Accesso, limitazione e segregazione

### 5.1 Modello accesso

- App **single-tenant**: tutti gli utenti autenticati accedono a tutti i clienti.
- Ruolo `commerciale`: sola lettura (write bloccato) — allineato a PRD per mutazioni.
- **Nessun** scope per cliente/territorio (es. commerciale vede solo propri clienti) — da PRD non richiesto in MVP.

### 5.2 Gap accesso

| ID | Severità | Descrizione |
|----|----------|-------------|
| PRIV-006 | **ALTO** | Con `AUTH_ENABLED=false`, tutti i dati cliente esposti pubblicamente. |
| PRIV-007 | **MEDIO** | `commerciale` può leggere ed esportare tutti i dati — PRD lascia export "da decidere"; attualmente consentito. |
| PRIV-008 | **MEDIO** | Download PDF senza autorizzazione per documento — qualsiasi utente autenticato (o anonimo se auth off). |

### 5.3 Supabase anon key

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` esposta al browser per design Supabase.
- RLS senza policy anon → query dirette PostgREST **dovrebbero** fallire.
- Client browser **non usato** — superficie attuale bassa; rischio se qualcuno lo attiva senza review RLS.

---

## 6. Conservazione e cancellazione (retention)

### 6.1 Stato implementazione

| Dato | Retention nel codice | PRD §37.3 |
|------|----------------------|-----------|
| PDF | Indefinita fino a soft delete | Da decidere |
| Audit log | Indefinita, nessun purge | Da decidere |
| Clienti archiviati | Soft delete, dati restano | Da decidere |
| Misure eliminate | Soft delete | — |
| Limiti eliminati | **Hard delete** | — |
| Utenti | Persistono | — |

| ID | Severità | Descrizione |
|----|----------|-------------|
| PRIV-009 | **MEDIO** | Nessuna policy retention automatizzata (job purge PDF/log/clienti inattivi). |
| PRIV-010 | **MEDIO** | Soft delete documento non rimuove blob R2 — file orfano possibile. |
| PRIV-011 | **BASSO** | Nessun endpoint "diritto all'oblio" / export dati interessato. |

**Nota:** per app B2B interna, diritti interessato spesso gestiti offline — ma referenti PF nei campi `contact*` possono richiedere procedure.

---

## 7. Trasferimenti e subprocessori

| Subprocessore | Dato trattato | Regione | Controllo |
|---------------|---------------|---------|-----------|
| **Supabase** | DB PostgreSQL (tutti i dati strutturati) | EU (`eu-west-1` in `env.ts`) | Contratto DPA Supabase |
| **Cloudflare R2** | PDF binari | Configurabile (verificare account) | DPA Cloudflare |
| **Vercel** | Hosting, log runtime | US/EU (piano dipendente) | DPA Vercel |
| **Groq** | Solo messaggio utente in `/api/ai/ping` (volontario) | **US** | API key server; nessun DPA verificato nel repo |

| ID | Severità | Descrizione |
|----|----------|-------------|
| PRIV-012 | **ALTO** | Uso Groq implica potenziale trasferimento extra-UE di contenuto utente — valutare SCC/impatto se si inviano dati cliente nei prompt. |
| PRIV-013 | **MEDIO** | `SUPABASE_PROJECT_REF` hardcoded in `server/lib/env.ts` — non è segreto ma fissa il progetto; verificare regione e DPA. |

---

## 8. AI e trattamento dati (Groq)

### 8.1 Flusso attuale

- Endpoint: `POST /api/ai/ping` — solo `admin` e `assistenza`.
- Input: stringa utente max 500 caratteri.
- Nessun system prompt che incorpora dati DB.
- Risposta restituita al client; non persistita nel DB.

### 8.2 Rischi privacy AI

| ID | Severità | Descrizione |
|----|----------|-------------|
| PRIV-014 | **ALTO** | Utente può incollare dati cliente/PDF nel ping — invio a Groq senza redazione o consenso documentato. |
| PRIV-015 | **MEDIO** | Nessuna informativa all'utente che il testo viene inviato a provider US. |
| PRIV-016 | **BASSO** | PRD §37.6 dice "AI non prevista in MVP" — feature Groq è aggiunta; allineare documentazione privacy. |

**Mitigazioni raccomandate:** blocco pattern PII, warning UI, opt-in admin, logging senza contenuto prompt, data processing agreement Groq.

---

## 9. Log, audit e monitoraggio

### 9.1 Audit trail

Eventi tracciati (parziale vs PRD §32):

| Evento PRD | Implementato |
|------------|--------------|
| Upload PDF | Sì |
| Delete documento | Sì (con `beforeJson` completo) |
| CRUD rilevazioni | Sì (session con snapshot) |
| CRUD limiti | Sì |
| Login falliti | **No** |
| Download PDF | **No** |
| Export CSV | **No** |

Campi `ipAddress` e `userAgent` definiti in `writeAuditLog` ma **mai popolati** nelle chiamate osservate.

| ID | Severità | Descrizione |
|----|----------|-------------|
| PRIV-017 | **ALTO** | Snapshot JSON completi in audit — proliferazione copie PII oltre necessità (violazione minimizzazione). |
| PRIV-018 | **MEDIO** | `console.error` su errori server — rischio log applicativi con dettagli; regola workspace vieta password/token/PDF completi — **non verificato** enforcement automatico. |
| PRIV-019 | **BASSO** | IP/UA non registrati — riduce tracciabilità incidenti ma anche superficie PII nei log. |

### 9.2 Logging Vercel / Supabase

- Log piattaforma fuori controllo codice — policy retention Vercel da configurare.
- Nessun PII masking nei log applicativi custom.

---

## 10. Export e portabilità

| Canale | Dati esportati | Controllo accesso |
|--------|----------------|-------------------|
| `GET /api/measurement-sessions/export` | CSV: data, cliente, settore, impianto, parametro, valori, esito, limiti | Solo auth globale |
| Download PDF | File completo | Auth debole / assente |
| API JSON generica | Tutti i campi entità | Auth globale |

| ID | Severità | Descrizione |
|----|----------|-------------|
| PRIV-020 | **MEDIO** | Export CSV senza audit log, senza limite rate, senza restrizione ruolo. |
| PRIV-021 | **BASSO** | Nessun formato export strutturato per portabilità GDPR (Art. 20) — non richiesto per MVP B2B interno. |

---

## 11. Sicurezza dei dati (misure tecniche privacy)

| Misura | Stato |
|--------|-------|
| Cifratura transito (HTTPS) | Vercel default — assumere OK in prod |
| Cifratura at rest DB | Supabase managed — assumere OK |
| Cifratura at rest R2 | Cloudflare default — assumere OK |
| Hash password | bcrypt — OK |
| Backup cifrati | PRD RNF-004 — **non verificato** nel codice |
| Accesso PDF privato | Architettura OK; enforcement auth **debole** |
| Pseudonimizzazione | Non implementata |
| Token JWT | Contiene email e nome — minimizzazione payload possibile |

---

## 12. Cookie e tracking

| Elemento | Stato |
|----------|-------|
| Cookie sessione | Nessuno — JWT in localStorage (non cookie) |
| Analytics (GA, etc.) | Assenti |
| Cookie tecnici | Nessuno osservato |

**Nota privacy:** localStorage non è cookie — informativa cookie semplificata possibile, ma JWT in storage va menzionato in policy sicurezza interna.

---

## 13. Data breach readiness (PRD §37.4)

| Requisito PRD | Stato |
|---------------|-------|
| Runbook incidente | **Assente** nel repo |
| Identificazione incidente | Parziale — audit log + log Vercel |
| Blocco accessi | Possibile via `AUTH_ENABLED`, rotazione JWT, revoca utenti (manuale DB) |
| Valutazione esposizione | Difficile senza log download/export |

| ID | Severità | Descrizione |
|----|----------|-------------|
| PRIV-022 | **MEDIO** | Nessun runbook data breach documentato nel progetto. |

---

## 14. Conformità PRD §37 — checklist

| Requisito | Stato |
|-----------|-------|
| Minimizzare dati personali | Parziale — referenti opzionali; audit troppo verboso |
| Finalità operative | OK (design) |
| Limitare accessi | Parziale — ruoli base; auth off rompe tutto |
| Policy retention | **Non implementata** |
| Proteggere PDF | Architettura OK; enforcement debole |
| Tracciare modifiche | Parziale — manca download/export/login fail |
| Evitare tracker | OK |
| AI con cautela | Parziale — Groq presente senza guardrail privacy |

---

## 15. Raccomandazioni prioritarie

### P0 — Prima di dati reali in produzione

1. `AUTH_ENABLED=true` obbligatorio in produzione.
2. Autorizzazione download PDF + audit log accessi documenti.
3. Ridurre snapshot audit a campi non sensibili (diff selettivo).

### P1 — Breve termine

4. Policy retention documentata e job purge (PDF orfani, audit > N mesi).
5. Warning UI su `/api/ai/ping` — no dati cliente; valutare disabilitazione Groq in prod finché non serve.
6. Restringere export CSV a ruoli autorizzati + audit export.
7. Registro trattamenti / DPIA leggera per referenti PF e PDF.

### P2 — Medio termine

8. Procedura diritti interessato (accesso/rettifica/cancellazione referenti).
9. Runbook data breach in `docs/`.
10. Rimuovere blob R2 su soft delete documento (o retention bucket lifecycle).
11. Valutare HttpOnly cookie al posto di localStorage per JWT.

---

## 16. Handoff all'orchestratore

### 1. Rischi critici (privacy)

- **PRIV-006** — Esposizione pubblica dati cliente con auth disabilitata (collegato SEC-001).

### 2. Rischi alti

- **PRIV-001** — Audit log con snapshot PII completi.
- **PRIV-008** — Accesso PDF non controllato per documento.
- **PRIV-012** — Trasferimento potenziale dati a Groq (US).
- **PRIV-014** — Utente può inviare dati cliente a Groq volontariamente.

### 3. Rischi medi

- PRIV-002, PRIV-003, PRIV-007, PRIV-009, PRIV-010, PRIV-013, PRIV-015, PRIV-017, PRIV-018, PRIV-020, PRIV-022.

### 4. Rischi bassi

- PRIV-005, PRIV-011, PRIV-016, PRIV-019, PRIV-021.

### 5. Fix

Nessun fix applicato (audit only).

### 6. Blocker

| Blocker | Motivo |
|---------|--------|
| Verifica DPA subprocessori | Non verificati contratti Supabase/Cloudflare/Vercel/Groq |
| Regione R2 effettiva | Non verificata da codice |
| Dati reali in produzione | Non ispezionati — audit su schema e flussi |

### 7. Stato finale

**PRIVACY AUDIT COMPLETATO — PARZIALE.**

Il trattamento è proporzionato a un MVP interno B2B con accesso controllato manualmente, ma **mancano** retention, minimizzazione log, enforcement accesso documenti, documentazione GDPR e valutazione Groq. Prima di referenti persone fisiche e PDF contrattuali in produzione: risolvere PRIV-006, PRIV-008, PRIV-001 e formalizzare registro trattamenti.

---

*Report generato da security-privacy-auditor — revisione difensiva, nessun accesso a dati produzione.*
