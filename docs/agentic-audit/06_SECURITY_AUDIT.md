# Security Audit — Plant Monitor Performance

**Data/ora audit:** 2026-07-01  
**Agente:** security-privacy-auditor  
**Metodo:** revisione difensiva statica del codice (nessun exploit, nessun brute force)  
**Scope:** auth, ruoli, RLS, IDOR, XSS, CSRF, CORS, security headers, upload/download, export, log, error disclosure  
**Evidenza:** analisi file in `apps/web/server/`, `apps/web/src/`, migrazioni Prisma/Supabase, `.env.example`

---

## 1. Executive summary

L'architettura di sicurezza è **coerente con un MVP interno single-tenant**: JWT custom lato Express, storage PDF privato su R2, validazione Zod, soft delete documenti, bcrypt sulle password. Tuttavia **non è pronta per produzione con dati reali** senza interventi: `AUTH_ENABLED` default `false`, segreto JWT di fallback hardcoded, assenza di autorizzazione a livello oggetto sui download PDF, nessun rate limiting, CORS permissivo, assenza di security headers, e gap rispetto ai requisiti PRD (RNF-004, §36).

**Stato complessivo:** PARZIALE — fondamenta presenti, controlli difensivi incompleti.

---

## 2. Architettura di sicurezza osservata

| Layer | Implementazione | Note |
|-------|-----------------|------|
| Frontend | Next.js App Router, `AuthGuard`, token in `localStorage` | UI nasconde write per `commerciale` |
| API | Express su Vercel (`api/index.ts` → `server/app.ts`) | Same-origin in prod via rewrite |
| Auth | JWT custom (`AUTH_ENABLED`, `JWT_SECRET`) | Non Supabase Auth |
| DB | PostgreSQL Supabase via Prisma (`pmp_app`) | RLS abilitato |
| File | Cloudflare R2 (o local dev) | Download solo via API |
| AI | Groq server-side (`GROQ_API_KEY`) | Endpoint `/api/ai/*` protetti |

---

## 3. Autenticazione e sessioni

### 3.1 Punti positivi

- Login con Zod (`email`, `password`), bcrypt compare, messaggi generici su credenziali errate (`auth.routes.ts`).
- Token JWT con scadenza 8h; payload: `id`, `email`, `name`, `role`.
- Middleware `requireAuthUnlessPublic` applicato globalmente su `/api/*` (eccetto health, auth, cron).
- `optionalAuth` + `requireAuth` separati correttamente.
- Open redirect mitigato: `redirectTo.startsWith("/")` in `login/page.tsx`.

### 3.2 Rischi

| ID | Severità | Descrizione | File / evidenza |
|----|----------|-------------|-----------------|
| SEC-001 | **CRITICO** | `AUTH_ENABLED` default `false` in `.env.example`; con auth disabilitata **tutte** le API dati sono pubbliche (clienti, rilevazioni, PDF). | `.env.example:33`, `middleware/auth.ts:5-7` |
| SEC-002 | **CRITICO** | Fallback JWT `dev-secret-change-me` se `JWT_SECRET` assente — token forgiabili in deploy mal configurato. | `middleware/auth.ts:9-10`, `config.ts:19` |
| SEC-003 | **ALTO** | Nessun rate limiting su `/api/auth/login` — brute force possibile (PRD §36.4, RNF-004). | `auth.routes.ts` |
| SEC-004 | **ALTO** | JWT in `localStorage` — esposto a furto via XSS; nessun HttpOnly cookie / refresh token / revoca. | `src/lib/api.ts:13-15` |
| SEC-005 | **MEDIO** | Nessun audit di login falliti (PRD §32.2). | `auth.routes.ts` |
| SEC-006 | **BASSO** | Nessuna MFA (PRD la raccomanda per admin in fase successiva). | — |

---

## 4. Autorizzazione e ruoli

### 4.1 Modello ruoli

Ruoli: `admin`, `assistenza`, `commerciale` (`UserRole` enum).

| Controllo | Implementazione |
|-----------|-----------------|
| Write bloccato per `commerciale` | `requireWriteAccess` su POST/PATCH/DELETE |
| AI ping | `requireRoles("admin", "assistenza")` |
| Read generico | Nessun filtro per ruolo — tutti gli utenti autenticati vedono tutto |

### 4.2 Gap rispetto al PRD (§31)

| Funzione PRD | Backend attuale | Gap |
|--------------|-----------------|-----|
| Gestione parametri/limiti solo admin | `requireWriteAccess` — anche `assistenza` può modificare | **ALTO** — SEC-007 |
| Gestione utenti solo admin | Non implementato (nessun endpoint utenti) | OK per MVP |
| Export dati commerciale | Export CSV accessibile a tutti i ruoli autenticati | **MEDIO** — SEC-008 |
| Audit log solo admin | Nessun endpoint audit esposto | OK (dati solo in DB) |

| ID | Severità | Descrizione |
|----|----------|-------------|
| SEC-007 | **ALTO** | `assistenza` può creare/modificare limiti, parametri chimici, settori, unità — PRD riserva parte di queste funzioni all'admin. |
| SEC-008 | **MEDIO** | `/api/measurement-sessions/export` non restringe per ruolo; `commerciale` può esportare tutti i dati. |
| SEC-009 | **MEDIO** | Nessuna distinzione admin per operazioni distruttive (delete limiti hard delete, delete customer). |

### 4.3 Coerenza frontend/backend

- `canWrite` in `AuthProvider` allineato a `requireWriteAccess` per `commerciale`.
- UI nasconde upload PDF se `!canWrite` — corretto ma non sufficiente da sola (PRD §31).

---

## 5. RLS e isolamento dati (Supabase/PostgreSQL)

### 5.1 Stato RLS

Migrazione `20260630160000_enable_rls`:

- RLS **abilitato** su tutte le tabelle applicative.
- Policy unica `pmp_app_all`: `USING (true) WITH CHECK (true)` per ruolo `pmp_app`.
- Nessuna policy per `anon` / `authenticated` PostgREST.

### 5.2 Valutazione

| Aspetto | Esito |
|---------|-------|
| Protezione PostgREST anon | **OK** — nessuna policy anon; accesso diretto via anon key bloccato se RLS attivo |
| Defense in depth API | **DEBOLE** — se l'API Express viene bypassata o usa credenziali `pmp_app`, RLS non limita nulla |
| Multi-tenant | **N/A** — app single-tenant interna; nessun `workspace_id` nel modello |
| Cross-tenant | **N/A** per design attuale |

| ID | Severità | Descrizione |
|----|----------|-------------|
| SEC-010 | **MEDIO** | RLS non implementa least-privilege a livello riga; tutta la sicurezza dati dipende dall'API Express. |

---

## 6. IDOR e accesso per risorsa

### 6.1 Pattern osservato

Gli endpoint `GET /:id` verificano esistenza record ma **non** verificano appartenenza a un tenant/utente (corretto per single-tenant, insufficiente se si aggiunge multi-tenancy).

### 6.2 Download documenti — rischio principale

```96:117:apps/web/server/modules/documents/documents.routes.ts
documentsRouter.get(
  "/:id/download",
  asyncHandler(async (req, res) => {
    const document = await prisma.document.findFirst({
      where: { id: paramId(req.params.id), deletedAt: null },
    });
    // ... stream file senza check ruolo/cliente
```

| ID | Severità | Descrizione |
|----|----------|-------------|
| SEC-011 | **CRITICO** | Con `AUTH_ENABLED=false`, chiunque con UUID documento scarica PDF (`GET /api/documents/:id/download`). |
| SEC-012 | **ALTO** | Con auth attiva, qualsiasi utente autenticato può scaricare **qualsiasi** documento per ID — nessun controllo oggetto. |
| SEC-013 | **ALTO** | Frontend usa `<a href=".../download">` senza header `Authorization` — con auth attiva il download via link diretto **fallisce** (401), ma workaround (fetch manuale, curl con token rubato) resta possibile. | `documents/page.tsx:118` |

### 6.3 Altri endpoint sensibili

| Endpoint | IDOR | Note |
|----------|------|------|
| `GET /api/customers/:id` | Basso (single-tenant) | Tutti i ruoli autenticati |
| `GET /api/measurement-sessions/export` | Medio | Export massivo senza filtro obbligatorio |
| `PATCH /api/measurement-sessions/:id` | Medio | Non valida coerenza `customerId` ↔ `plantId` |
| `POST /api/measurement-sessions` | Medio | Accetta `customerId` e `plantId` indipendenti — possibile inconsistenza dati |

| ID | Severità | Descrizione |
|----|----------|-------------|
| SEC-014 | **MEDIO** | Creazione sessione misura non verifica che `plantId` appartenga a `customerId`. |

---

## 7. XSS, CSRF, injection

### 7.1 XSS

| Controllo | Esito |
|-----------|-------|
| `dangerouslySetInnerHTML` | **Assente** nel codebase |
| Rendering React | Testo utente (nomi cliente, note, errori) escapato da default |
| PDF filename in `Content-Disposition` | `encodeURIComponent` usato — OK |

| ID | Severità | Descrizione |
|----|----------|-------------|
| SEC-015 | **MEDIO** | Token JWT in `localStorage` amplifica impatto di eventuale XSS futuro. |

### 7.2 CSRF

- Auth via Bearer header (non cookie session) → rischio CSRF **basso** per API JSON.
- Upload multipart usa Bearer — OK.
- Download via GET `<a href>` — se si passasse a cookie auth, CSRF su download diventerebbe rilevante.

### 7.3 SQL injection

- Prisma ORM con query parametrizzate — **nessun raw SQL** osservato nelle route.
- Ricerca `contains` su stringhe utente — gestito da Prisma.

### 7.4 Command / path traversal

- Storage R2: chiavi generate con UUID — nessun input utente nel path oggetto.
- Local storage: `storedFilename` da UUID — path traversal **mitigato**.

### 7.5 SSRF

- Groq client chiama solo `api.groq.com` — nessun URL user-controlled osservato.

---

## 8. CORS e security headers

### 8.1 CORS

```39:39:apps/web/server/app.ts
app.use(cors({ origin: true, credentials: true }));
```

| ID | Severità | Descrizione |
|----|----------|-------------|
| SEC-016 | **ALTO** | `origin: true` riflette qualsiasi `Origin` con `credentials: true` — eccessivamente permissivo se si introducono cookie o credenziali cross-site. |

**Raccomandazione:** whitelist origini note (`VERCEL_URL`, dominio prod, `localhost` in dev).

### 8.2 Security headers

| Header | Express API | Next.js |
|--------|-------------|---------|
| Content-Security-Policy | Assente | Assente |
| X-Frame-Options / frame-ancestors | Assente | Assente |
| X-Content-Type-Options | Assente | Assente |
| Strict-Transport-Security | Assente (dipende da Vercel) | Assente |
| Referrer-Policy | Assente | Assente |

| ID | Severità | Descrizione |
|----|----------|-------------|
| SEC-017 | **MEDIO** | Nessun security header configurato (né `helmet` su Express né `headers` in `next.config.ts`). |

---

## 9. Upload e download file (R2 / local)

### 9.1 Upload PDF

| Controllo | Stato |
|-----------|-------|
| Solo PDF (MIME) | `fileFilter` multer |
| Limite dimensione | `MAX_PDF_SIZE_MB` (default 25) |
| Nome file randomizzato | UUID + estensione originale |
| Write protetto | `requireWriteAccess` |
| Magic bytes / antivirus | **Assente** |
| Validazione `customerId` esiste | **Assente** |

| ID | Severità | Descrizione |
|----|----------|-------------|
| SEC-018 | **MEDIO** | Validazione solo MIME type — file rinominato `.pdf` con contenuto non-PDF accettato. |
| SEC-019 | **MEDIO** | Nessun rate limiting su upload (PRD RNF-004). |
| SEC-020 | **BASSO** | `originalFilename` conservato e restituito al client — possibile filename injection in client legacy (mitigato da `encodeURIComponent` su download). |

### 9.2 Storage R2

- Bucket privato, accesso via SDK server-side — **architettura corretta**.
- Nessun URL pubblico o signed URL esposto al client.
- Credenziali R2 solo server-side — OK.

### 9.3 Download

- Stream autorizzato solo lato API — OK per design.
- Manca logging download (PRD §32.2 opzionale ma raccomandato per audit).

---

## 10. Endpoint pubblici e information disclosure

### 10.1 Health check

`GET /api/health` espone:

- `authEnabled`
- provider dati/files/ai e stato configurazione
- nome bucket R2

| ID | Severità | Descrizione |
|----|----------|-------------|
| SEC-021 | **MEDIO** | Information disclosure su configurazione infrastruttura — utile per reconnaissance. |

### 10.2 Cron

```4:18:apps/web/server/middleware/cron-auth.ts
export function requireCronSecret(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (process.env.VERCEL) {
      return res.status(503).json({ error: "CRON_SECRET non configurato" });
    }
    return next(); // dev: cron aperto
  }
```

| ID | Severità | Descrizione |
|----|----------|-------------|
| SEC-022 | **ALTO** | In dev locale senza `CRON_SECRET`, `/api/cron/db-check` è pubblico (path in `isPublicApiPath`). |
| SEC-023 | **BASSO** | Su Vercel senza secret → 503 (OK). |

### 10.3 Error handler

```12:20:apps/web/server/middleware/error-handler.ts
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // Zod → 400 con details
  // P2002 → 409
  console.error(err);
  return res.status(500).json({ error: "Errore interno del server" });
}
```

- Stack trace **non** inviato al client — OK.
- `console.error(err)` su Vercel può loggare dettagli interni — accettabile se log non pubblici.
- Zod `details` in 400 — informativo ma non critico.

---

## 11. AI (Groq) — superficie sicurezza

| Controllo | Stato |
|-----------|-------|
| API key server-only | OK (`GROQ_API_KEY`, no `NEXT_PUBLIC_`) |
| Auth su `/api/ai/*` | `requireAuth` + ruoli su ping |
| Input limitato | `message` max 500 char |
| Timeout | 15s |
| Dati cliente in prompt | Possibile se utente li inserisce — vedi audit privacy |

Dettaglio prompt injection: audit dedicato `08B_AI_SECURITY_PROMPT_INJECTION_AUDIT.md`.

---

## 12. Test sicurezza esistenti

| Test | File | Copertura |
|------|------|-----------|
| Write access per ruolo | `middleware/auth.test.ts` | Solo logica ruolo commerciale |
| Groq client | `groq.client.test.ts` | Non sicurezza |
| Limit resolve | `resolve-limit.test.ts` | Business logic |

**Gap:** nessun test integrazione per auth obbligatoria, download PDF, IDOR, upload non-PDF.

---

## 13. Conformità PRD §36.5 (test minimi)

| Test PRD | Stato attuale |
|----------|---------------|
| Commerciale non crea rilevazione via API | **PARZIALE** — test unitario, non test HTTP |
| Commerciale non modifica rilevazione | **PARZIALE** — idem |
| Utente non loggato non scarica PDF | **FAIL** se `AUTH_ENABLED=false`; **FAIL** IDOR se auth on |
| File non PDF rifiutato | **NON TESTATO** |
| Input numerico validato | Zod presente, non testato |
| Limite non modificabile da non autorizzato | **FAIL** — assistenza può modificare |

---

## 14. Matrice rischi

| ID | Titolo | Severità | Likelihood | Priorità fix |
|----|--------|----------|------------|--------------|
| SEC-001 | Auth disabilitata by default | Critico | Alta (dev/demo) | P0 |
| SEC-002 | JWT secret di fallback | Critico | Media (misconfig prod) | P0 |
| SEC-011 | Download PDF senza auth | Critico | Alta se AUTH off | P0 |
| SEC-012 | IDOR download documenti | Alto | Media | P1 |
| SEC-013 | Download link senza Bearer | Alto | Alta con auth on | P1 |
| SEC-003 | No rate limit login | Alto | Media | P1 |
| SEC-007 | Assistenza gestisce limiti/parametri | Alto | Media | P1 |
| SEC-016 | CORS permissivo | Alto | Bassa (Bearer auth) | P2 |
| SEC-022 | Cron aperto in dev | Alto | Bassa (solo locale) | P2 |
| SEC-010 | RLS non granular | Medio | Bassa | P2 |
| SEC-017 | No security headers | Medio | Media | P2 |
| SEC-018 | Upload solo MIME | Medio | Media | P2 |
| SEC-021 | Health info disclosure | Medio | Bassa | P3 |

---

## 15. Raccomandazioni prioritarie (audit only — non implementate)

1. **Produzione:** `AUTH_ENABLED=true`, `JWT_SECRET` forte (≥32 byte random), `CRON_SECRET` obbligatorio.
2. **Download PDF:** endpoint con auth + check ruolo; download via `fetch` con Bearer o signed URL a breve scadenza; audit log download.
3. **IDOR:** per MVP single-tenant, almeno verificare utente autenticato + ruolo `commerciale` read-only su documenti.
4. **Ruoli:** `requireRoles("admin")` su limiti, parametri, settori, unità, plant-types.
5. **Rate limiting:** `express-rate-limit` su login e upload.
6. **CORS:** whitelist origini.
7. **Headers:** `helmet` su Express + headers Next.js.
8. **Upload:** verifica magic bytes `%PDF`; opzionale scan async.
9. **Test:** suite HTTP per scenari PRD §36.5.

---

## 16. Handoff all'orchestratore

### 1. Rischi critici

- **SEC-001** — API completamente aperta con auth disabilitata (default).
- **SEC-002** — JWT forgiabile con secret di default.
- **SEC-011** — Download PDF pubblico senza autenticazione.

### 2. Rischi alti

- **SEC-003** — Nessun rate limiting login.
- **SEC-004** — JWT in localStorage (furto via XSS).
- **SEC-007** — Permessi admin non applicati su limiti/parametri.
- **SEC-012** — IDOR su download documenti.
- **SEC-013** — Link download incompatibile con Bearer auth.
- **SEC-016** — CORS `origin: true`.
- **SEC-022** — Endpoint cron aperto in dev senza secret.

### 3. Rischi medi

- SEC-008, SEC-010, SEC-014, SEC-015, SEC-017, SEC-018, SEC-019, SEC-021.

### 4. Rischi bassi

- SEC-006, SEC-009, SEC-020, SEC-023.

### 5. Fix

Nessun fix applicato in questo audit (solo revisione difensiva).

### 6. Blocker

| Blocker | Motivo |
|---------|--------|
| Verifica produzione live | Audit statico — non verificato deploy Vercel con env reali |
| Test auth su download | Richiede `AUTH_ENABLED=true` + credenziali test |
| Policy R2 bucket live | Non verificata ACL bucket Cloudflare |

### 7. Stato finale

**AUDIT COMPLETATO — PARZIALE rispetto a produzione sicura.**

Fondamenta architetturali corrette (storage privato, validazione Zod, bcrypt, RLS abilitato, segreti AI/R2 server-side). Gap critici su auth default, autorizzazione download, granularità ruoli e hardening HTTP. Produzione con dati cliente reali **non raccomandata** finché SEC-001, SEC-002, SEC-011/012 non sono risolti e verificati.

---

*Report generato da security-privacy-auditor — revisione difensiva, nessun test offensivo eseguito.*
