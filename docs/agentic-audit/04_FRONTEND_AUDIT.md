# Frontend UX Audit Report

**Agente:** `frontend-ux-auditor`  
**Data/ora audit:** 2026-07-01  
**Repository:** Plant Monitor Performance  
**Scope:** `apps/web/src/app/`, `apps/web/src/components/`, `apps/web/src/hooks/`, `apps/web/src/lib/` (client)  
**Modalità:** Audit only — nessuna modifica al codice  
**Stato finale:** **PARZIALE** (audit statico codice; nessun browser live test in questa fase)

---

## 1. Executive summary

Il frontend Next.js App Router è strutturato in modo coerente: **tutte le schermate principali caricano dati via API REST** (`/api/*`) e non presentano metriche hardcoded, array demo o `localStorage` usato come database.

**Nessun dato finto nei flussi di visualizzazione** è stato trovato nel codice sorgente analizzato. Dashboard, tabelle, grafici e form dipendono da endpoint backend reali.

Permangono però **gap UX significativi**: empty state assenti su quasi tutte le liste, etichetta dashboard fuorviante per i documenti, defaults hardcoded su nomi seed in analytics, assenza di `useAuthReady` su molte pagine, download/export senza token JWT, navigazione sidebar non responsive, form limiti con input UUID manuale.

---

## 2. Scope analizzato

| Area | Path | File |
|------|------|------|
| Pagine app | `apps/web/src/app/` | 13 file (layout + 12 route) |
| Componenti | `apps/web/src/components/` | 6 file |
| Hook | `apps/web/src/hooks/` | `useAuthReady.ts` |
| Client lib | `apps/web/src/lib/` | `api.ts`, `env.ts`, `roles.ts`, `supabase.ts` |
| Stili globali | `apps/web/src/app/globals.css` | utility Tailwind + componenti |

**Non incluso in questo audit:** backend API (`apps/web/server/`), seed Prisma, test E2E, verifica browser live.

---

## 3. Schermate analizzate

| # | Route | File | Tipo | Fonte dati |
|---|-------|------|------|------------|
| 1 | `/` | `app/page.tsx` | Dashboard KPI | `GET /api/analytics/dashboard` |
| 2 | `/login` | `app/login/page.tsx` | Auth | `GET /api/auth/status`, `POST /api/auth/login` |
| 3 | `/customers` | `app/customers/page.tsx` | Lista + form creazione | `GET /api/customers`, `GET /api/sectors`, `POST /api/customers` |
| 4 | `/customers/[id]` | `app/customers/[id]/page.tsx` | Dettaglio | `GET /api/customers/:id` |
| 5 | `/plants` | `app/plants/page.tsx` | Lista + form creazione | `GET /api/plants`, `GET /api/customers`, `GET /api/plant-types`, `POST /api/plants` |
| 6 | `/plants/[id]` | `app/plants/[id]/page.tsx` | Dettaglio + ultime rilevazioni | `GET /api/plants/:id` |
| 7 | `/measurements` | `app/measurements/page.tsx` | Lista filtrata + export CSV | `GET /api/measurement-sessions`, lookup API |
| 8 | `/measurements/new` | `app/measurements/new/page.tsx` | Form inserimento | `POST /api/measurement-sessions` + lookup API |
| 9 | `/parameters` | `app/parameters/page.tsx` | Dizionario parametri | `GET/POST /api/chemical-parameters` |
| 10 | `/limits` | `app/limits/page.tsx` | Configurazione limiti | `GET/POST /api/limits` |
| 11 | `/analytics` | `app/analytics/page.tsx` | Grafico + riduzione % | `GET /api/analytics/time-series`, `GET /api/analytics/performance-reduction` |
| 12 | `/documents` | `app/documents/page.tsx` | Lista PDF + upload | `GET /api/documents`, `POST /api/documents/upload` |

**Layout e shell condivisi:**

| Componente | Ruolo |
|------------|-------|
| `layout.tsx` | Root layout, `AppShell` |
| `AppShell.tsx` | Sidebar, header, nav, banner demo auth |
| `AuthProvider.tsx` | Bootstrap auth, token, ruoli |
| `AuthGuard.tsx` | Redirect a login se auth attiva |
| `AuthLayout.tsx` | Layout login responsive |
| `ComplianceBadge.tsx` | Badge esito conformità (colore + testo) |
| `ui.tsx` | `LoadingState`, `ErrorState`, `PageHeader` |

---

## 4. Dati finti / mock / statici — risultato

### 4.1 Verdetto generale: **NESSUN DATO FITTIZIO NEI FLUSSI REALI**

| Controllo | Esito | Evidenza |
|-----------|-------|----------|
| Metriche dashboard hardcoded | ✅ Assente | `page.tsx` chiama `/api/analytics/dashboard`; valori da `data.*` |
| Numeri statici in tabelle | ✅ Assente | Tutte le liste mappano array da API |
| Mock/fake/demo data in componenti | ✅ Assente | Nessun import mock; nessun array seed nel frontend |
| `localStorage` come DB | ✅ Assente | `localStorage` usato solo per `pmp_token` (auth) |
| `sessionStorage` come DB | ✅ Assente | Nessun utilizzo |
| Fallback con dati inventati su errore API | ✅ Assente | Errori mostrati via `ErrorState`; nessun dato sostitutivo |
| Supabase client diretto nel UI | ✅ Non usato | `lib/supabase.ts` esiste ma **nessun import** in `src/` |

### 4.2 Elementi da classificare (non sono metriche finte, ma attenzione)

| Elemento | File | Classificazione | Nota |
|--------|------|-----------------|------|
| Banner "Modalità demo" | `AppShell.tsx`, `login/page.tsx` | **Dev UX intenzionale** | Visibile quando `AUTH_ENABLED=false`; non inventa dati |
| Default analytics COD + punti campionamento | `analytics/page.tsx` L55-60 | **Default UX su nomi seed** | Cerca parametro `code === "COD"` e punti `"Ingresso impianto"` / `"Post MBR"` — dipende da seed DB, non da numeri finti |
| `canWrite: true` default context | `AuthProvider.tsx` L24 | **Default contesto React** | Sovrascritto dal provider reale; in auth disabilitata tutti possono scrivere (coerente con dev) |
| Label dashboard "Documenti PDF" | `page.tsx` L39 | **Etichetta fuorviante** | Backend conta **tutti** i documenti (`prisma.document.count`), non solo "recenti" — dato reale, label errata |

### 4.3 localStorage — uso legittimo

| Chiave | File | Scopo |
|--------|------|-------|
| `pmp_token` | `lib/api.ts`, `AuthProvider.tsx`, `documents/page.tsx` | JWT sessione; **non** persistenza dati business |

**Conforme** alle regole anti-mock: token auth ≠ database.

---

## 5. Problemi UX

### 5.1 Critici / alti

| ID | Problema | Schermata | Dettaglio |
|----|----------|-----------|-----------|
| UX-01 | Download PDF senza token | `/documents` | Link `<a href="${API_URL}/api/documents/${id}/download">` non invia `Authorization`. Con auth attiva il download può fallire silenziosamente o restituire 401 |
| UX-02 | Export CSV senza token | `/measurements` | `window.open(.../export?)` non passa JWT; stesso rischio con `AUTH_ENABLED=true` |
| UX-03 | `useAuthReady` mancante | 10/12 pagine dati | Solo `/` e `/customers` attendono auth bootstrap. Altre pagine chiamano API subito al mount → possibili 401/redirect flash con auth attiva |
| UX-04 | Empty state assenti | Liste principali | Clienti, impianti, rilevazioni, documenti, parametri, limiti: tabella vuota senza messaggio guida ("Nessun cliente — crea il primo") |
| UX-05 | Form limiti: ID ambito manuale | `/limits` | Campo testo `scopeId` con placeholder UUID; utente non tecnico non può configurare limiti per cliente/impianto senza conoscere gli ID |

### 5.2 Medi

| ID | Problema | Schermata | Dettaglio |
|----|----------|-----------|-----------|
| UX-06 | Nav doppio highlight | Sidebar | Su `/measurements/new` sia "Rilevazioni" che "Nuova rilevazione" risultano attive (`pathname.startsWith`) |
| UX-07 | Sidebar non responsive | `AppShell` | Aside fisso `w-64`; nessun menu mobile/hamburger; su viewport stretti la nav occupa spazio prezioso |
| UX-08 | Loading incompleto | `/analytics`, `/measurements/new` | Grafico e form non mostrano loading durante fetch iniziale |
| UX-09 | Nessun feedback successo | Tutti i form POST | Solo errori inline; nessun toast/conferma dopo salvataggio riuscito |
| UX-10 | Form cliente incompleto vs dettaglio | `/customers` | Form crea: code, businessName, sectorId, city, contactName. Dettaglio mostra anche province, email, telefono — campi non editabili da UI |
| UX-11 | Nessuna modifica/eliminazione | CRUD generale | Solo CREATE + READ; nessun edit/delete in UI (anche se backend ha `DELETE` documenti) |
| UX-12 | Upload documenti duplica logica API | `/documents` | `fetch` manuale + `localStorage.getItem` invece di helper `api()` — inconsistenza e rischio drift |

### 5.3 Bassi / accessibilità

| ID | Problema | Dettaglio |
|----|----------|-----------|
| UX-13 | Label senza `htmlFor` | Solo login ha `htmlFor`; altri form usano `.label` senza associazione esplicita input |
| UX-14 | Tabelle senza caption/aria | `.data-table` senza `caption` o `aria-label` per screen reader |
| UX-15 | Compliance solo colore+riga | `ComplianceBadge` + `complianceRowClass` rispettano regola prodotto (testo + colore) ✅ |
| UX-16 | Dettaglio cliente impianti vuoti | Lista `<ul>` vuota senza messaggio "Nessun impianto" |

---

## 6. Problemi dati (coerenza UI ↔ backend)

| ID | Problema | Impatto |
|----|----------|---------|
| DATA-01 | Dashboard `recentDocuments` vs label | Backend: count totale documenti. UI: card "Documenti PDF" senza qualificatore "totali" — interpretazione errata per l'utente |
| DATA-02 | Analytics default per nome | Se seed cambia nomi punti/parametri, default riduzione % non si pre-seleziona — non è dato finto ma coupling fragile seed↔UI |
| DATA-03 | Filtro `outOfLimit` solo client-side | `/measurements?outOfLimit=1` filtra in JS dopo fetch completo; con paginazione futura il conteggio dashboard e lista potrebbero divergere |
| DATA-04 | Stato impianto raw | Colonna "Stato" mostra valore DB grezzo (`active` ecc.) senza label italiane |
| DATA-05 | Parametro attivo "Sì/No" | OK ma senza filtro per nascondere inattivi in dropdown rilevazioni |

---

## 7. Conformità regole prodotto (frontend)

| Regola PRD / AGENTS | Stato | Note |
|---------------------|-------|------|
| Limiti mai hardcoded nel frontend | ✅ | Limiti da API; analytics mostra `limitMin/Max` da backend |
| Fuori limite: colore + badge testuale | ✅ | `ComplianceBadge` + `complianceRowClass` |
| Nessuna dashboard finta | ✅ | KPI da Prisma via API |
| Form coerenti con DB | ⚠️ Parziale | Cliente: campi mancanti; limiti: scopeId non user-friendly |
| Empty state reali | ❌ | Quasi tutti assenti |
| Azioni critiche con conferma | N/A | Nessuna delete in UI |
| Auth disabilitabile in dev | ✅ | Banner e login page gestiscono `AUTH_ENABLED=false` |
| Ruolo commerciale read-only scrittura | ✅ | `canWrite` blocca form su measurements/new, limits, parameters, documents |

---

## 8. Raccomandazioni (priorità)

### P0 — Prima del go-live con auth attiva

1. **Download documenti:** usare fetch autenticato + blob URL, oppure signed URL temporaneo da API.
2. **Export CSV:** passare token (fetch + download blob) o cookie session-based.
3. **Estendere `useAuthReady`** a tutte le pagine che chiamano API protette.

### P1 — UX operativa

4. Aggiungere **empty state** con CTA su ogni lista (clienti, impianti, rilevazioni, documenti, parametri, limiti).
5. Sostituire input `scopeId` in `/limits` con **select dinamiche** (clienti, impianti, settori, tipologie) in base a `scopeType`.
6. Allineare label dashboard: "Documenti totali" oppure cambiare backend per contare solo ultimi 30 giorni.
7. Toast o banner successo dopo create/upload.

### P2 — Miglioramenti

8. Fix nav active: escludere match prefix quando esiste route più specifica (`/measurements/new`).
9. Menu mobile collapsible per sidebar.
10. Loading state su analytics chart e form new measurement.
11. Completare form cliente (email, telefono, provincia) o rimuovere dal dettaglio se non in scope MVP.
12. Rimuovere o documentare `lib/supabase.ts` non usato nel frontend.
13. Localizzare stati impianto (`active` → "Attivo").

---

## 9. Test richiesti

| # | Test | Tipo | Priorità |
|---|------|------|----------|
| T-01 | Dashboard con DB vuoto → tutti KPI a 0, nessun crash | Manuale / E2E | Alta |
| T-02 | Dashboard con seed → KPI corrispondono a query DB | Integrazione | Alta |
| T-03 | Lista clienti vuota → empty state visibile | Manuale | Alta |
| T-04 | `AUTH_ENABLED=true`: login → navigazione tutte le pagine senza 401 flash | Manuale | Alta |
| T-05 | Download PDF con auth attiva | Manuale | Alta |
| T-06 | Export CSV con auth attiva | Manuale | Alta |
| T-07 | Inserimento rilevazione fuori limite → badge rosso + testo "Fuori limite" | Manuale | Alta |
| T-08 | Ruolo commerciale: form disabilitati, liste leggibili | Manuale | Media |
| T-09 | Analytics senza dati → messaggio "Nessun dato disponibile" | Manuale | Media |
| T-10 | Responsive 375px: login OK, dashboard navigabile | Manuale | Media |
| T-11 | `/measurements?outOfLimit=1` coerente con conteggio dashboard | Manuale | Media |
| T-12 | Creazione limite scope cliente con select (post-fix) | Manuale | Bassa |

**Evidenza mancante in questa fase:** nessun browser live test eseguito; esiti test = **DA ESEGUIRE** (delegare a `browser-live-tester` / `qa-test-runner`).

---

## 10. Blocker

| Blocker | Descrizione | Owner suggerito |
|---------|-------------|-----------------|
| B-01 | Download/export senza auth header con `AUTH_ENABLED=true` | backend-api-auditor + frontend fix |
| B-02 | Verifica live non eseguita | browser-live-tester |
| B-03 | Empty state assenti — UX incompleta per DB vuoto in produzione | frontend (fase esecuzione orchestrator) |

**Nessun blocker su dati finti/mock:** il frontend non introduce metriche inventate.

---

## 11. Handoff all'Orchestratore

### 11.1 Schermate analizzate

12 route + layout + 6 componenti condivisi + `api.ts` / `useAuthReady` (vedi sezione 3).

### 11.2 Dati finti trovati

**Nessuno** nei flussi di visualizzazione.  
Note marginali: banner demo auth (intenzionale), default analytics legati a nomi seed (non numeri inventati), label dashboard documenti fuorviante.

### 11.3 Problemi UX (top 5)

1. Download/export senza JWT  
2. Empty state assenti  
3. `useAuthReady` non uniforme  
4. Form limiti con UUID manuale  
5. Sidebar non mobile-friendly

### 11.4 Problemi dati (top 3)

1. Label "Documenti PDF" vs count totale backend  
2. Filtro outOfLimit solo client-side  
3. Form cliente non allineato ai campi in dettaglio

### 11.5 Modifiche consigliate

Vedi sezione 8 (P0 → P2). Nessuna modifica applicata in questa fase audit.

### 11.6 Test richiesti

Vedi sezione 9 (12 test). Esecuzione delegata a QA/browser live.

### 11.7 Stato finale

| Aspetto | Stato |
|---------|-------|
| Assenza mock/metriche finte nel frontend | **CONFORME** |
| Dashboard dati reali | **CONFORME** (con riserva label documenti) |
| localStorage come DB | **CONFORME** (solo token) |
| Empty/loading/error UX | **NON CONFORME** (gap diffusi) |
| Auth-aware API calls | **PARZIALE** |
| Form UX limiti/clienti | **PARZIALE** |
| Audit con evidenza runtime | **BLOCCATO** (serve browser live) |

**Esito audit frontend:** **PARZIALE — codice pulito da mock, UX da completare prima di dichiarare MVP allineato.**

---

## 12. Appendice — mappa chiamate API per pagina

```
/                    → GET /api/analytics/dashboard
/login               → GET /api/auth/status, POST /api/auth/login
/customers           → GET /api/customers, GET /api/sectors, POST /api/customers
/customers/[id]      → GET /api/customers/:id
/plants              → GET /api/plants, GET /api/customers, GET /api/plant-types, POST /api/plants
/plants/[id]         → GET /api/plants/:id
/measurements        → GET /api/measurement-sessions, lookups, GET .../export (window.open)
/measurements/new    → POST /api/measurement-sessions, lookups
/parameters          → GET/POST /api/chemical-parameters, GET /api/units
/limits              → GET/POST /api/limits, lookups
/analytics           → GET /api/analytics/time-series, GET /api/analytics/performance-reduction
/documents           → GET /api/documents, POST /api/documents/upload, GET .../download (link diretto)
```

---

*Report generato da `frontend-ux-auditor` — audit statico senza modifiche al repository applicativo.*
