# AGENTS.md

## Contesto prodotto

Web app interna per storicizzare, consultare e analizzare parametri chimici degli impianti di trattamento acqua.

Utenti principali: assistenza tecnica, commerciale, admin.

## Regola principale

Lavora sempre plan-first. Il PRD in `docs/PRD.md` è la fonte di verità.

## Priorità

1. Correttezza del dato
2. Sicurezza e permessi
3. Tracciabilità della fonte
4. Usabilità per utenti non tecnici
5. Estendibilità verso import PDF

## Divieti

- Non hardcodare limiti di legge
- Non rendere pubblici i PDF
- Non saltare controlli permessi lato backend (quando auth attiva)
- Non generare dati ufficiali da PDF senza revisione umana
- Non usare solo colore per segnalare fuori limite

## Obblighi

- Ogni endpoint mutativo deve controllare ruolo (quando auth attiva)
- Ogni upload deve validare file e dimensione
- Ogni valore fuori limite deve avere colore e testo
- Ogni task deve avere test o motivazione se non testabile

## Definition of Done

Un task è completato solo se implementato, testato, senza regressioni note, con evidenza prodotta.
