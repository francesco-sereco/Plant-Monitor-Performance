---
name: push-com
description: Verifica modifiche git non committate, controlla e allinea il database Prisma (migrazioni/generate) tra backend e frontend, valida coerenza (test/lint/build), poi crea commit e fa push. Use when the user asks "/push&com", "commit e push", "allinea DB", "prisma migrate", or wants a pre-push safety checklist.
disable-model-invocation: true
---

# /push&com

## Obiettivo (testo richiesto)

verifica le modifiche non ancora committate, verifica il DB, allinea il DB con il front end e il back end, applica le migrazioni se necessario, verifica che sia tutto coerente e al termine committa e pusha

## Quick start

Quando l’utente chiede `/push&com`, esegui questa procedura dal root del monorepo.

### 0) Guardrail (non negoziabili)

- Non committare file locali di DB come `*.db` (es. `apps/api/prisma/prisma/dev.db`) o altri artefatti runtime. Se compaiono in `git status`, **aggiungili a `.gitignore`** e/o rimuovili dal working tree prima di committare.
- Se ci sono segreti o file `.env` in modifica, fermati e non committare.
- Non usare `--force` su `git push` a meno che l’utente lo richieda esplicitamente.

### 1) Verifica modifiche non ancora committate (git)

- Esegui:
  - `git status`
  - `git diff`
- Se ci sono modifiche non volute (db locali, build output, log), sistemale prima di proseguire.

### 2) Verifica DB e allineamento schema (Prisma)

Nel repo il backend è in `apps/api` e Prisma in `apps/api/prisma`.

- Assicurati che l’ambiente DB sia disponibile (in locale tipicamente `npm run db:up`).
- Esegui in sequenza:
  - `npm run db:generate -w @pmp/api`
  - `npm run db:migrate -w @pmp/api`
- Se `db:migrate` genera nuovi file di migrazione o modifica `schema.prisma`, questi vanno inclusi nel commit.

### 3) Verifica coerenza backend + frontend

- Backend:
  - `npm run test -w @pmp/api`
  - (se necessario) `npm run build -w @pmp/api`
- Frontend:
  - `npm run build -w @pmp/web`
  - (se presente) `npm run lint -w @pmp/web`

Se una verifica fallisce, **fixa prima** e riesegui lo step.

### 4) Commit

- Stage SOLO file pertinenti (schema/migrations + codice correlato).
- Genera un messaggio commit corto e descrittivo basato sul diff (perché, non solo cosa).
- Esegui `git commit`.

### 5) Push

- Esegui `git push` (con tracking se necessario: `git push -u origin HEAD`).

## Opzione: script PowerShell (Windows)

Se vuoi eseguire i check in modo ripetibile, usa lo script:

- `powershell -ExecutionPolicy Bypass -File .cursor/skills/push-com/scripts/push-com.ps1 -Message "..." -AutoCommit -AutoPush`

Lo script:
- rifiuta `*.db` in git
- esegue generate+migrate Prisma
- esegue test/build
- committa e pusha se richiesto

