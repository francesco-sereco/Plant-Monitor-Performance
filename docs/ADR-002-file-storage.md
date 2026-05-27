# ADR-002 — File storage

**Decisione:** Storage locale privato in `storage/documents/`.

**Motivazione:** MVP interno; PDF serviti solo via API autorizzata (PRD sez. 5.3).

**Conseguenze:** Path configurabile via `STORAGE_PATH`; max size via `MAX_PDF_SIZE_MB`.
