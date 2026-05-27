# Test Plan MVP 1

## Unit test

- [x] Calcolo conformità (compliant, out_of_limit, limit_not_configured, incomplete)
- [x] Calcolo riduzione percentuale (70%, 90%, valore zero, dati mancanti)
- [x] Priorità limiti (impianto > globale, customer > sector)

## Integration test (manuale / demo checklist)

1. Login come assistenza (quando auth attiva)
2. Crea cliente
3. Crea impianto
4. Configura limite COD
5. Inserisce rilevazione
6. Vede fuori limite in rosso + badge
7. Vede grafico storico
8. Export CSV
9. Upload PDF
10. Login commerciale → sola lettura

## E2E scenario demo COD

Cliente Acme Alimentare, impianto MBR scarico industriale:
- Ingresso COD 1000 → Post MBR 300 = riduzione 70%
- Ingresso COD 1000 → Post pulizia 100 = riduzione 90%
