# RFC-001 — MVP Core

## Scope

- Clienti, settori, impianti, tipologie
- Parametri chimici, unità, punti campionamento
- Limiti configurabili con priorità
- Rilevazioni manuali con calcolo conformità
- Tabella filtrabile, grafici, export CSV
- Upload PDF base, audit log minimo

## Escluso

- Import automatico PDF
- Notifiche email
- Integrazione gestionale

## Priorità limiti (RF-011)

1. impianto
2. cliente
3. tipologia impianto
4. settore
5. globale
6. nessun limite

## Auth

Disabilitata in dev (`AUTH_ENABLED=false`). Schema users predisposto per ciclo auth.
