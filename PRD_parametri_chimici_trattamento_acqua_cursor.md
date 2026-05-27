# PRD — Archivio e analisi parametri chimici impianti trattamento acqua

**Versione:** 1.0  
**Data:** 2026-05-27  
**Destinazione:** Cursor / Claude Code / Codex / Google Antigravity o strumenti equivalenti  
**Stato:** PRD operativo per MVP + base per RFC tecnici  
**Tipo prodotto:** Applicativo web interno aziendale  
**Dominio:** Assistenza tecnica, laboratorio, trattamento acqua, analisi chimiche, performance impianti

---

## Indice

1. Executive summary  
2. Fonti usate  
3. Informazioni fornite dall’utente  
4. Elementi metodologici derivati dalla knowledge  
5. Ipotesi operative  
6. Decisioni aperte  
7. Contesto prodotto  
8. Problema da risolvere  
9. Obiettivi  
10. Non-obiettivi  
11. Utenti, ruoli e responsabilità  
12. Personas  
13. Job to be done  
14. Casi d’uso principali  
15. User journey  
16. Scope implementativo  
17. MVP e roadmap  
18. Da dove deve partire Cursor / primo MVP operativo  
19. Requisiti funzionali  
20. Requisiti non funzionali  
21. Flussi principali  
22. Flussi alternativi  
23. Error states ed empty states  
24. Regole di business  
25. Modello dati concettuale  
26. Schema dati proposto  
27. API / endpoint proposti  
28. Componenti UI  
29. Analytics e analisi performance  
30. Import PDF da rapportini e autocontrolli  
31. Ruoli e permessi  
32. Audit trail  
33. Notifiche  
34. Automazioni  
35. Integrazioni  
36. Sicurezza  
37. Privacy e compliance  
38. Accessibilità  
39. Architettura concettuale  
40. Struttura progetto consigliata  
41. RFC / capability spec da creare  
42. Backlog e task atomici  
43. Criteri di accettazione  
44. Test plan  
45. Rollout, rollback e migrazione dati  
46. Observability, logging e monitoring  
47. Runbook operativo  
48. Rischi, trade-off e mitigazioni  
49. Guardrail per agenti di coding  
50. Protocollo di avanzamento per Cursor  
51. Contenuto consigliato per `AGENTS.md`  
52. Contenuto consigliato per `.cursor/rules`  
53. Prompt implementativi  
54. Definition of Done  
55. Appendice — esempi dati demo  
56. Appendice — glossario

---

# 1. Executive summary

L’applicativo deve permettere all’azienda di **storicizzare, consultare e analizzare i parametri chimici degli impianti di trattamento acqua** installati presso i clienti.

Oggi i dati esistono, ma sono sparsi in:

- rapportini tecnici di intervento;
- autocontrolli prodotti dal laboratorio;
- file PDF;
- eventuali elaborazioni Excel fatte solo quando richieste.

Il prodotto deve trasformare questi dati in una base storica ordinata, filtrabile e analizzabile, utile a:

- assistenza tecnica, per monitorare le performance degli impianti;
- commerciale, per dimostrare l’affidabilità degli impianti;
- responsabili interni, per individuare criticità, miglioramenti e trend nel tempo.

La prima versione deve permettere di:

- gestire clienti, settori e impianti;
- registrare parametri chimici;
- collegare ogni dato a cliente, impianto, data, fonte e punto di campionamento;
- visualizzare storico mensile per cliente e impianto;
- filtrare per cliente, settore, impianto, parametro e periodo;
- evidenziare in rosso i valori fuori limite;
- mostrare grafici di andamento nel tempo;
- allegare i PDF originali;
- preparare la struttura per l’import automatico dai PDF.

Il primo MVP può partire con inserimento manuale, ma l’obiettivo successivo è evitare la doppia copiatura dei dati tramite import automatico da PDF dei rapportini TAKE OFF e degli autocontrolli laboratorio.

---

# 2. Fonti usate

## 2.1 Brief e risposte utente

Questo PRD usa come fonte primaria il brief fornito dall’utente e le risposte di discovery raccolte nella conversazione.

## 2.2 Knowledge metodologica

Sono state usate come fonti metodologiche principali:

1. **“Costruire applicativi in vibe coding con metodo professionale”**  
   Usato per impostare:
   - sviluppo plan-first;
   - uso di PRD, RFC, ADR, test plan, agent rules e runbook;
   - lavoro per artefatti verificabili;
   - istruzioni persistenti nel repository;
   - guardrail per Cursor e agenti equivalenti;
   - separazione tra cosa costruire, come costruirlo e come verificarlo.

2. **“Rischi e lacune delle piattaforme Web e SaaS create con vibe coding”**  
   Usato per includere:
   - secure SDLC;
   - threat modeling leggero;
   - controllo permessi;
   - test di sicurezza;
   - audit log;
   - gestione upload file;
   - privacy e data governance;
   - backup/restore;
   - logging;
   - governance dipendenze;
   - incident response;
   - evidenze verificabili.

## 2.3 Nota su normative e limiti di legge

Il sistema dovrà gestire limiti chimici “di legge” o contrattuali, ma **il PRD non codifica valori normativi specifici**.

Motivo: i limiti possono dipendere da settore, cliente, impianto, autorizzazioni, normativa applicabile, data di validità e contesto tecnico. I limiti devono quindi essere **configurabili da utenti autorizzati** e non scritti direttamente nel codice.

---

# 3. Informazioni fornite dall’utente

## 3.1 Prodotto richiesto

L’utente vuole creare un PRD per un applicativo che storicizza i parametri chimici degli impianti di trattamento acqua rilevati da:

- tecnici di assistenza;
- laboratorio interno o esterno che produce autocontrolli.

## 3.2 Scopo

Organizzare una tabella con i dati chimici e renderli visualizzabili:

- per cliente;
- per settore;
- per impianto;
- per periodo;
- per parametro.

Lo scopo finale è analizzare in modo puntuale come stanno performando gli impianti di trattamento acqua.

## 3.3 Utenti

Useranno l’applicativo:

- personale assistenza tecnica;
- commerciale.

L’assistenza tecnica monitora gli impianti.  
Il commerciale usa i dati per dimostrare affidabilità e performance degli impianti.

## 3.4 Fonti dati

I parametri chimici vengono raccolti in due modalità:

1. **Rapportini tecnici di intervento**  
   Compilati nella sezione di raccolta dati. Da gennaio 2026 vengono creati tramite software TAKE OFF e poi stampati/esportati in PDF.

2. **Autocontrolli laboratorio**  
   Report generati dal laboratorio dopo analisi dei campioni prelevati presso i clienti. Sono caricati digitalmente su piattaforma e stampati/esportati in PDF.

## 3.5 Stato attuale

Oggi non esiste un’analisi sistematica.  
L’azienda usa Excel solo quando viene richiesta un’analisi specifica.

## 3.6 Settori

Gli esempi indicati sono corretti:

- alimentare;
- farmaceutico;
- industriale;
- horeca;
- lavanderie;
- ospedaliero;
- civile;
- altro.

## 3.7 Clienti e impianti

Un cliente può avere più impianti.

La tipologia di impianto non sempre si evince dai rapportini o autocontrolli, quindi deve essere caricata e gestita in anagrafica impianto.

## 3.8 Parametri chimici

I parametri si evincono dai rapportini.  
Il sistema deve permettere di gestire tutti i parametri possibili, anche se non tutti servono in ogni caso.

Esempi forniti:

- COD;
- pH;
- cloruri;
- altri parametri variabili secondo cliente, trattamento e impianto.

## 3.9 Limiti

I valori di scarico finale sono riferiti a un limite di legge o riferimento applicabile.  
Il sistema deve mostrare se la performance è conforme o fuori limite.

## 3.10 Fuori limite

Per il momento il sistema deve solo evidenziare in rosso i valori fuori limite.

## 3.11 Import dati

L’utente vuole arrivare all’import automatico da PDF, perché altrimenti i dati verrebbero copiati due volte.

Per la prima demo è accettabile l’inserimento manuale, purché il sistema sia predisposto all’import PDF.

## 3.12 Permessi

- Solo assistenza tecnica può inserire/modificare dati.
- Non serve approvazione.
- Il commerciale può vedere tutti i clienti.
- Lo storico modifiche non è indispensabile, ma se semplice è utile.

## 3.13 Analisi richieste

Analisi principali:

- cliente → impianto → storico mensile parametri;
- settore → confronto performance per periodo e impianti simili;
- andamento dei parametri nel tempo;
- evidenziazione criticità;
- esempio di calcolo: COD tra ingresso impianto e post MBR cala del 70%, dopo una pulizia cala del 90%.

## 3.14 Primo MVP

Schermate minime confermate:

- dashboard generale;
- elenco clienti;
- scheda cliente;
- scheda impianto;
- tabella rilevazioni;
- inserimento nuova rilevazione;
- grafico andamento parametri.

Funzione primaria della demo:

- filtrare per cliente e periodo;
- vedere i parametri in tabella;
- generare un grafico storico.

Fuori dal primo rilascio:

- notifiche email;
- confronto avanzato tra settori;
- integrazione con gestionale.

---

# 4. Elementi metodologici derivati dalla knowledge

Questo PRD deve essere usato come documento operativo per un agente di coding. Non deve essere un testo descrittivo generico.

## 4.1 Principi obbligatori

Il progetto deve seguire questi principi:

1. **Plan-first**  
   Cursor deve produrre un piano prima di scrivere codice.

2. **Task piccoli**  
   Niente prompt tipo “costruisci tutta l’app”.  
   Il lavoro deve essere diviso in milestone e task atomici.

3. **Contesto persistente**  
   Le regole importanti devono stare in file versionati:
   - `AGENTS.md`;
   - `.cursor/rules`;
   - `docs/PRD.md`;
   - `docs/RFC-*`;
   - `docs/TEST_PLAN.md`;
   - `docs/SECURITY_REVIEW.md`;
   - `docs/RUNBOOK.md`.

4. **Artefatti verificabili**  
   Ogni ciclo deve lasciare:
   - piano;
   - diff;
   - test;
   - screenshot;
   - log;
   - checklist;
   - evidenze.

5. **Sicurezza non opzionale**  
   Permessi, upload file, validazioni, audit log e backup devono essere progettati fin dall’inizio.

6. **Human review su import PDF**  
   I dati estratti automaticamente non devono diventare ufficiali senza revisione umana.

7. **Nessun limite hardcoded**  
   I limiti chimici devono essere configurabili e tracciabili.

---

# 5. Ipotesi operative

Le seguenti ipotesi sono usate per rendere il PRD operativo. Devono essere confermate o corrette prima dello sviluppo completo.

## 5.1 Applicativo web interno

Il prodotto sarà inizialmente una web app interna usata da personale aziendale, non un SaaS venduto a clienti esterni.

## 5.2 Database relazionale

I dati sono fortemente relazionali: clienti, impianti, parametri, limiti, documenti, rilevazioni.  
Si assume l’uso di un database relazionale, preferibilmente PostgreSQL.

## 5.3 PDF conservati in storage privato

I PDF non devono stare in cartelle pubbliche.  
Devono essere salvati in uno storage privato accessibile solo tramite backend autorizzato.

## 5.4 Import PDF progressivo

Il primo MVP consente inserimento manuale e allegato PDF.  
L’import automatico è previsto in fase successiva, ma lo schema dati deve già supportarlo.

## 5.5 Nessuna AI interpretativa nel primo MVP

L’eventuale uso di AI per leggere PDF o normalizzare parametri è possibile in futuro, ma non deve essere necessario per il primo MVP.

## 5.6 Multi-cliente, non multi-tenant SaaS

Il sistema contiene più clienti aziendali, ma non è ancora un SaaS dove ogni cliente esterno accede ai propri dati.  
Questa distinzione riduce complessità iniziale, ma non elimina il bisogno di permessi corretti.

---

# 6. Decisioni aperte

Prima dello sviluppo completo vanno prese queste decisioni:

| ID | Decisione | Opzioni | Impatto |
|---|---|---|---|
| D-001 | Stack tecnico | Next.js, Laravel, Django, Rails, altro | Architettura e task |
| D-002 | Database | PostgreSQL consigliato | Modello dati |
| D-003 | Login | Email/password, Microsoft/Google aziendale, SSO | Sicurezza e UX |
| D-004 | Storage PDF | Locale privato, S3 compatibile, cloud aziendale | Sicurezza file |
| D-005 | Dimensione massima PDF | Es. 10MB, 25MB, 50MB | Upload e costi |
| D-006 | Lista parametri iniziale | Da creare con assistenza/laboratorio | Dizionario dati |
| D-007 | Lista limiti iniziale | Da caricare manualmente | Calcolo conformità |
| D-008 | Chi modifica i limiti | Admin, responsabile assistenza, laboratorio | Controllo dati critici |
| D-009 | Retention PDF | Permanente, X anni, policy aziendale | Privacy/storage |
| D-010 | Storico pregresso | Import massivo o manuale progressivo | Migrazione |
| D-011 | Export commerciale | CSV/XLSX base o report PDF | Scope |
| D-012 | TAKE OFF | Solo PDF o esiste export/API | Import automatico |
| D-013 | Laboratorio | Formato PDF uniforme o variabile | Parser PDF |
| D-014 | Audit log | Minimo o completo con before/after | Tracciabilità |
| D-015 | Hosting | Server interno, cloud, VPS, PaaS | Operatività |

---

# 7. Contesto prodotto

L’azienda gestisce impianti di trattamento acqua presso clienti di settori diversi.  
Durante interventi tecnici e analisi di laboratorio vengono raccolti parametri chimici utili per valutare la performance degli impianti.

Questi dati sono importanti perché permettono di capire:

- se l’impianto rispetta i limiti di scarico;
- se un trattamento sta funzionando;
- se un intervento ha migliorato la resa;
- se un cliente ha criticità ricorrenti;
- se una tipologia di impianto performa meglio o peggio in un certo settore;
- se il commerciale può mostrare dati oggettivi al cliente.

Il problema attuale non è l’assenza dei dati, ma la loro frammentazione.

---

# 8. Problema da risolvere

## 8.1 Problema principale

I dati chimici sono disponibili ma non strutturati in modo da essere analizzati sistematicamente.

## 8.2 Conseguenze attuali

- Analisi manuali in Excel.
- Difficoltà nel confronto storico.
- Difficoltà nel confronto tra impianti simili.
- Difficoltà nel dimostrare performance al cliente.
- Rischio di perdere informazioni utili contenute nei PDF.
- Doppia copiatura dei dati se si crea un database senza import automatico.
- Nessuna vista unica cliente → impianti → parametri → andamento.

## 8.3 Risultato desiderato

Un sistema unico dove i dati chimici sono:

- raccolti;
- storicizzati;
- filtrabili;
- collegati ai documenti originali;
- confrontabili;
- visualizzabili con grafici;
- utilizzabili da assistenza tecnica e commerciale.

---

# 9. Obiettivi

## 9.1 Obiettivi business

- Aumentare il valore percepito del servizio di assistenza.
- Dimostrare con dati oggettivi l’affidabilità degli impianti.
- Ridurre il tempo speso in analisi manuali.
- Migliorare la capacità di individuare criticità.
- Creare una base dati storica riutilizzabile.

## 9.2 Obiettivi utente

Per assistenza tecnica:

- trovare rapidamente i dati di un impianto;
- capire se un parametro è fuori limite;
- vedere l’andamento nel tempo;
- confrontare valori prima/dopo trattamento o pulizia.

Per commerciale:

- consultare dati affidabili;
- mostrare trend chiari;
- evitare elaborazioni manuali prima di incontri cliente.

## 9.3 Obiettivi operativi

- Centralizzare clienti, impianti e parametri.
- Collegare ogni dato al PDF originale.
- Ridurre progressivamente il doppio inserimento.
- Rendere esportabili i dati.
- Preparare il sistema all’import automatico.

## 9.4 KPI / metriche di successo

- Tempo medio per trovare storico impianto.
- Numero rilevazioni inserite/importate al mese.
- Percentuale PDF collegati a rilevazioni.
- Percentuale valori con limite configurato.
- Numero criticità fuori limite individuate.
- Riduzione ore spese in Excel.
- Numero analisi commerciali prodotte senza lavoro manuale extra.

## 9.5 Metriche guardrail

Da non peggiorare:

- correttezza del dato;
- tracciabilità della fonte;
- sicurezza accessi;
- controllo sui limiti;
- leggibilità per utenti non tecnici.

---

# 10. Non-obiettivi

Nel primo rilascio non rientrano:

- notifiche email automatiche;
- integrazione con gestionale aziendale;
- confronto avanzato tra settori;
- report PDF commerciale completo;
- app mobile;
- accesso diretto dei clienti finali;
- workflow approvativo;
- firma digitale documenti;
- interpretazione AI libera delle performance;
- suggerimenti automatici di manutenzione;
- sistema predittivo.

---

# 11. Utenti, ruoli e responsabilità

## 11.1 Assistenza tecnica

Ruolo principale operativo.

Può:

- vedere tutti i clienti;
- creare e modificare clienti;
- creare e modificare impianti;
- inserire rilevazioni;
- modificare rilevazioni;
- caricare PDF;
- consultare grafici;
- esportare dati;
- vedere valori fuori limite.

Responsabilità:

- correttezza del dato inserito;
- collegamento al cliente/impianto corretto;
- verifica dei dati importati da PDF.

## 11.2 Commerciale

Ruolo consultivo.

Può:

- vedere tutti i clienti;
- vedere tutti gli impianti;
- vedere tabelle;
- vedere grafici;
- filtrare;
- esportare, se autorizzato.

Non può:

- inserire dati;
- modificare dati;
- eliminare dati;
- configurare limiti;
- importare PDF;
- modificare parametri.

Responsabilità:

- usare i dati come supporto commerciale;
- non alterare dati tecnici.

## 11.3 Admin

Ruolo gestionale/tecnico.

Può:

- gestire utenti;
- gestire ruoli;
- configurare parametri;
- configurare unità di misura;
- configurare limiti;
- correggere dati se necessario;
- consultare audit log;
- gestire impostazioni import.

Responsabilità:

- mantenere anagrafiche e configurazioni coerenti;
- supervisionare qualità e sicurezza del dato.

## 11.4 Responsabile assistenza / laboratorio

Ruolo opzionale futuro.

Potrebbe:

- validare lista parametri;
- validare limiti;
- controllare import PDF;
- definire punti di campionamento standard.

---

# 12. Personas

## 12.1 Tecnico assistenza

Lavora sugli impianti e conosce i dati tecnici.  
Ha bisogno di inserire o verificare dati in modo rapido.

Frase tipica:

> “Voglio aprire l’impianto del cliente e vedere subito se i parametri sono migliorati o peggiorati.”

## 12.2 Responsabile assistenza

Guarda la situazione su più impianti.  
Vuole individuare criticità e trend.

Frase tipica:

> “Voglio sapere quali impianti hanno valori fuori limite ricorrenti negli ultimi mesi.”

## 12.3 Commerciale

Usa i dati per rafforzare la relazione con il cliente.  
Non vuole perdersi in dettagli tecnici inutili.

Frase tipica:

> “Voglio mostrare al cliente un grafico semplice che dimostri che l’impianto lavora bene.”

## 12.4 Admin dati

Tiene ordinato il sistema.  
Configura parametri, limiti e utenti.

Frase tipica:

> “Voglio evitare parametri duplicati o limiti sbagliati.”

---

# 13. Job to be done

## JTBD-01 — Monitorare performance impianto

Quando un tecnico vuole capire se un impianto funziona bene, deve poter aprire l’impianto, scegliere un periodo e vedere i parametri nel tempo con evidenza dei valori fuori limite.

## JTBD-02 — Dimostrare affidabilità al cliente

Quando il commerciale deve parlare con un cliente, deve poter mostrare dati chiari sull’andamento dei parametri e sul rispetto dei limiti.

## JTBD-03 — Valutare effetto intervento

Quando è stata fatta una pulizia o manutenzione, il responsabile deve poter confrontare valori prima e dopo.

Esempio:

- COD ingresso;
- COD post MBR;
- COD post pulizia;
- COD scarico finale.

## JTBD-04 — Ridurre uso Excel

Quando serve un’analisi, l’utente deve farla direttamente nel sistema senza ricostruire tabelle manuali.

## JTBD-05 — Collegare dato e fonte

Quando un valore viene consultato, l’utente deve poter risalire al PDF originale.

---

# 14. Casi d’uso principali

## UC-01 — Creare cliente

Attore: assistenza tecnica o admin.  
Output: cliente disponibile in anagrafica.

## UC-02 — Creare impianto

Attore: assistenza tecnica o admin.  
Output: impianto collegato a cliente e tipologia.

## UC-03 — Inserire rilevazione manuale

Attore: assistenza tecnica.  
Output: dati chimici salvati, confrontati con limiti e mostrati in tabella/grafico.

## UC-04 — Consultare storico impianto

Attore: assistenza tecnica o commerciale.  
Output: tabella e grafico filtrati per periodo e parametro.

## UC-05 — Evidenziare valori fuori limite

Attore: sistema.  
Output: valore mostrato in rosso e con stato “Fuori limite”.

## UC-06 — Caricare PDF

Attore: assistenza tecnica.  
Output: PDF collegato a cliente, impianto e rilevazione.

## UC-07 — Importare PDF

Attore: assistenza tecnica.  
Output: dati estratti in bozza, revisionati e confermati.

## UC-08 — Analizzare riduzione percentuale

Attore: assistenza tecnica o responsabile.  
Output: percentuale di riduzione tra due punti di campionamento.

## UC-09 — Esportare dati

Attore: assistenza tecnica, commerciale se autorizzato.  
Output: file CSV/XLSX.

---

# 15. User journey

## 15.1 Journey assistenza tecnica — inserimento dati

1. Accede al sistema.
2. Cerca cliente.
3. Apre impianto.
4. Crea nuova rilevazione.
5. Inserisce data e fonte.
6. Allega PDF.
7. Inserisce parametri.
8. Salva.
9. Vede subito valori conformi/fuori limite.
10. Controlla grafico aggiornato.

## 15.2 Journey assistenza tecnica — controllo impianto

1. Accede.
2. Filtra per cliente.
3. Seleziona impianto.
4. Sceglie periodo.
5. Seleziona parametro.
6. Vede storico mensile.
7. Identifica peggioramenti o miglioramenti.
8. Apre PDF se serve verifica fonte.

## 15.3 Journey commerciale

1. Accede.
2. Cerca cliente.
3. Apre scheda cliente.
4. Seleziona impianto.
5. Visualizza grafico.
6. Mostra andamento parametri.
7. Verifica che i dati siano leggibili e non modificabili.

## 15.4 Journey import PDF futuro

1. Carica PDF.
2. Sceglie tipo documento.
3. Avvia import.
4. Sistema propone dati.
5. Utente controlla.
6. Utente corregge eventuali errori.
7. Conferma.
8. I dati diventano rilevazioni ufficiali.

---

# 16. Scope implementativo

## 16.1 In scope MVP 1

- Login.
- Ruoli base.
- Clienti.
- Settori.
- Impianti.
- Tipologie impianto.
- Parametri chimici.
- Unità di misura.
- Punti di campionamento.
- Limiti configurabili.
- Rilevazioni manuali.
- Tabella con filtri.
- Grafico andamento.
- Evidenza fuori limite.
- Upload PDF come allegato.
- Export CSV/XLSX base.
- Audit log minimo.
- Seed dati demo.
- Test minimi.

## 16.2 In scope MVP 1.5

- Import automatico da PDF.
- Parser rapportini TAKE OFF.
- Parser autocontrolli laboratorio.
- Stato import.
- Schermata revisione dati.
- Conferma manuale.
- Mappatura parametri riconosciuti/non riconosciuti.
- Gestione errori.

## 16.3 In scope MVP 2

- Confronti base tra impianti simili.
- Analisi per settore.
- Dashboard criticità.
- Report cliente base.
- Analisi pre/post intervento più strutturata.

## 16.4 Out of scope primo rilascio

- Notifiche email.
- Integrazione gestionale.
- Report PDF avanzati.
- AI generativa interpretativa.
- Accesso clienti esterni.
- App mobile.

---

# 17. MVP e roadmap

## 17.1 MVP 1 — Manuale ma utile

Obiettivo:

> Rendere possibile storicizzare e visualizzare dati chimici senza Excel.

Funzioni:

- anagrafiche;
- rilevazioni manuali;
- tabella;
- grafici;
- limiti;
- fuori soglia;
- PDF allegati;
- permessi.

## 17.2 MVP 1.5 — Import PDF

Obiettivo:

> Ridurre la doppia copiatura dei dati.

Funzioni:

- import PDF;
- estrazione dati;
- revisione;
- conferma;
- log errori.

## 17.3 MVP 2 — Analisi performance evoluta

Obiettivo:

> Capire meglio performance e criticità.

Funzioni:

- trend miglioramento/peggioramento;
- confronto impianti simili;
- performance per settore;
- pre/post intervento;
- dashboard criticità.

## 17.4 MVP 3 — Report e integrazioni

Obiettivo:

> Rendere il sistema più integrato nei processi aziendali.

Funzioni:

- integrazione gestionale;
- eventuale integrazione diretta TAKE OFF;
- report PDF commerciale;
- notifiche;
- import storico.

---

# 18. Da dove deve partire Cursor / primo MVP operativo

## 18.1 Punto esatto di partenza

Cursor deve partire dal modulo:

> **Clienti + Impianti + Rilevazioni manuali + Grafico storico + Limiti**

Non deve partire dal parser PDF.

Motivo: il parser PDF ha senso solo dopo aver definito bene dove salvare i dati estratti.

## 18.2 Primo risultato atteso

Entro il primo ciclo di sviluppo deve essere possibile:

1. creare un cliente;
2. creare un impianto per quel cliente;
3. configurare un parametro, per esempio COD;
4. configurare un limite;
5. inserire manualmente una rilevazione;
6. vedere il dato in tabella;
7. vedere il grafico nel tempo;
8. vedere in rosso il valore fuori limite;
9. accedere come commerciale e verificare che non possa modificare il dato.

## 18.3 Layout iniziale

Layout desktop semplice.

```text
Sidebar sinistra:
- Dashboard
- Clienti
- Impianti
- Rilevazioni
- Parametri
- Limiti
- Documenti
- Impostazioni

Area centrale:
- Titolo pagina
- Filtri
- Tabella / Form / Grafico
```

## 18.4 Schermate minime prima demo

1. Login.
2. Dashboard.
3. Elenco clienti.
4. Scheda cliente.
5. Scheda impianto.
6. Nuova rilevazione.
7. Tabella rilevazioni.
8. Grafico storico.
9. Parametri.
10. Limiti.

## 18.5 Dati minimi demo

Creare seed con:

- 3 clienti;
- 3 settori;
- 5 impianti;
- 8 parametri;
- 4 punti di campionamento;
- 30 misure;
- almeno 5 valori fuori limite;
- almeno 1 caso COD con riduzione:
  - ingresso impianto;
  - post MBR;
  - post pulizia;
  - scarico finale.

## 18.6 Azioni essenziali subito funzionanti

- creare cliente;
- creare impianto;
- creare parametro;
- creare limite;
- inserire rilevazione;
- filtrare tabella;
- visualizzare grafico;
- vedere fuori limite;
- allegare PDF;
- esportare tabella.

## 18.7 Cosa non fare nel primo ciclo

Non implementare:

- parser PDF;
- OCR;
- integrazione TAKE OFF;
- report commerciale PDF;
- notifiche;
- confronto avanzato settore;
- dashboard executive complessa.

## 18.8 Ordine task consigliato

1. Setup progetto.
2. Schema database.
3. Seed dati.
4. Autenticazione base.
5. Ruoli.
6. API clienti.
7. UI clienti.
8. API impianti.
9. UI impianti.
10. API parametri/unità/punti.
11. UI parametri.
12. API limiti.
13. UI limiti.
14. API rilevazioni.
15. UI nuova rilevazione.
16. Tabella rilevazioni.
17. Calcolo conformità.
18. Grafico storico.
19. Upload PDF base.
20. Export CSV/XLSX.
21. Audit log minimo.
22. Test.
23. Demo checklist.

## 18.9 Criterio completamento primo MVP operativo

Il primo MVP è completato solo se:

- i requisiti del punto 18.2 sono funzionanti;
- ci sono test minimi su permessi e calcoli;
- nessun PDF è pubblico;
- il commerciale non può modificare dati;
- il fuori limite è visibile con colore e testo;
- il grafico mostra correttamente i dati;
- il sistema ha seed demo;
- Cursor produce evidenza: screenshot/log/checklist.

## 18.10 Prompt operativo iniziale per Cursor

```text
Leggi prima:
- docs/PRD.md
- AGENTS.md
- .cursor/rules/*
- docs/RFC-001-mvp-core.md se presente

Lavora plan-first.
Non scrivere codice prima di aver prodotto un piano.

Obiettivo primo ciclo:
costruire il nucleo MVP dell’app per storicizzare parametri chimici degli impianti trattamento acqua.

Implementa solo:
- login base;
- ruoli assistenza tecnica, commerciale, admin;
- clienti;
- settori;
- impianti;
- tipologie impianto;
- parametri chimici;
- unità di misura;
- punti di campionamento;
- limiti configurabili;
- rilevazioni manuali;
- tabella filtrabile;
- grafico storico parametro;
- evidenza fuori limite;
- upload PDF base;
- export CSV/XLSX base;
- audit log minimo.

Non implementare ancora:
- import automatico PDF;
- OCR;
- integrazione gestionale;
- notifiche email;
- report PDF commerciale;
- confronto avanzato tra settori.

Prima del codice produci:
1. piano tecnico;
2. struttura file;
3. schema database;
4. endpoint;
5. componenti UI;
6. task atomici;
7. test previsti;
8. rischi e assunzioni.

Fermati per approvazione prima di:
- modificare schema dati critico;
- cambiare permessi;
- implementare upload file;
- implementare import PDF;
- cancellare dati;
- introdurre dipendenze importanti.

Definition of Done:
un task è completato solo se è implementato, testato, verificato e documentato con evidenza.
```

---

# 19. Requisiti funzionali

## RF-001 — Login e sessione utente

Il sistema deve richiedere autenticazione.

Criteri di accettazione:

- utente non autenticato non accede;
- utente autenticato vede solo funzioni compatibili con il ruolo;
- logout funzionante;
- sessione gestita in modo sicuro.

## RF-002 — Gestione ruoli

Il sistema deve gestire almeno:

- assistenza tecnica;
- commerciale;
- admin.

Criteri:

- permessi applicati lato backend;
- UI nasconde azioni non consentite;
- backend blocca comunque azioni non consentite.

## RF-003 — Gestione settori

Il sistema deve permettere di gestire settori cliente.

Campi:

- nome;
- descrizione;
- stato attivo/non attivo.

Criteri:

- cliente associabile a un settore;
- filtro per settore disponibile.

## RF-004 — Gestione clienti

Campi minimi:

- codice cliente;
- ragione sociale;
- settore;
- indirizzo;
- città;
- provincia;
- paese;
- referente;
- email referente;
- telefono referente;
- note;
- stato.

Criteri:

- un cliente può avere più impianti;
- ricerca per ragione sociale e codice;
- filtro per settore;
- cliente archiviato non appare di default.

## RF-005 — Gestione tipologie impianto

Campi:

- nome;
- descrizione;
- stato.

Esempi:

- addolcitore;
- osmosi inversa;
- filtrazione;
- MBR;
- trattamento scarico;
- impianto misto;
- altro.

## RF-006 — Gestione impianti

Campi:

- cliente;
- nome impianto;
- tipologia;
- descrizione;
- matricola;
- data installazione;
- località;
- stato;
- note tecniche.

Criteri:

- ogni impianto appartiene a un cliente;
- ogni impianto ha tipologia;
- scheda impianto mostra rilevazioni e grafici.

## RF-007 — Gestione parametri chimici

Campi:

- codice;
- nome;
- unità predefinita;
- descrizione;
- numerico sì/no;
- attivo sì/no.

Esempi iniziali:

- COD;
- pH;
- cloruri;
- conducibilità;
- durezza;
- ferro;
- manganese;
- nitrati;
- nitriti;
- TDS;
- torbidità;
- silice;
- alcalinità;
- cloro.

Criteri:

- admin può aggiungere parametri;
- parametro disattivato non appare nei nuovi inserimenti;
- i vecchi dati restano consultabili.

## RF-008 — Gestione unità di misura

Campi:

- simbolo;
- nome;
- descrizione.

Esempi:

- mg/L;
- µS/cm;
- °F;
- pH;
- NTU;
- %.

## RF-009 — Gestione punti di campionamento

Campi:

- nome;
- descrizione;
- ordine;
- attivo.

Esempi:

- ingresso impianto;
- post MBR;
- post pulizia;
- scarico finale;
- altro.

Criteri:

- i punti servono per calcoli di riduzione;
- i punti devono essere ordinabili.

## RF-010 — Gestione limiti

Il sistema deve permettere limiti configurabili.

Campi:

- parametro;
- unità;
- ambito;
- valore minimo;
- valore massimo;
- riferimento testuale;
- valido dal;
- valido al;
- attivo;
- note.

Ambiti:

- globale;
- settore;
- tipologia impianto;
- cliente;
- impianto.

Criteri:

- nessun limite hardcoded;
- limiti modificabili solo da admin o ruolo autorizzato;
- priorità di applicazione documentata;
- limite usato salvato nella rilevazione o ricostruibile in modo affidabile.

## RF-011 — Priorità limiti

Se più limiti sono applicabili, usare questa priorità:

1. limite specifico impianto;
2. limite specifico cliente;
3. limite specifico tipologia impianto;
4. limite specifico settore;
5. limite globale parametro;
6. nessun limite configurato.

## RF-012 — Creazione sessione rilevazione

Una sessione è un evento di misura.

Campi:

- cliente;
- impianto;
- data rilevazione;
- fonte;
- tecnico;
- laboratorio;
- note;
- PDF allegato opzionale.

Fonti:

- manuale;
- rapportino tecnico;
- autocontrollo laboratorio;
- import PDF;
- altro.

## RF-013 — Inserimento misure

Per ogni sessione, l’utente può inserire più righe.

Campi riga:

- parametro;
- punto campionamento;
- valore;
- unità;
- limite minimo;
- limite massimo;
- esito;
- note.

Criteri:

- più parametri nella stessa sessione;
- calcolo esito automatico;
- salvataggio limiti applicati;
- evidenza fuori limite.

## RF-014 — Tabella rilevazioni

La tabella deve mostrare:

- data;
- cliente;
- settore;
- impianto;
- tipologia impianto;
- fonte;
- punto campionamento;
- parametro;
- valore;
- unità;
- limite minimo;
- limite massimo;
- esito;
- note;
- PDF.

Filtri:

- cliente;
- settore;
- impianto;
- tipologia impianto;
- periodo;
- parametro;
- punto campionamento;
- fonte;
- esito.

## RF-015 — Grafico storico parametro

Il sistema deve mostrare grafico temporale.

Input:

- cliente;
- impianto;
- parametro;
- punto campionamento;
- periodo.

Output:

- linea valori;
- linea limite minimo, se presente;
- linea limite massimo, se presente;
- punti fuori limite evidenziati;
- tabella sottostante.

## RF-016 — Calcolo performance tra punti

Il sistema deve calcolare riduzione percentuale tra due punti.

Formula:

```text
riduzione_percentuale = ((valore_iniziale - valore_finale) / valore_iniziale) * 100
```

Esempio:

```text
COD ingresso impianto = 1000
COD post MBR = 300
Riduzione = 70%
```

Criteri:

- stesso parametro;
- stessa sessione o periodo confrontabile;
- valori numerici;
- valore iniziale maggiore di zero;
- se mancano dati, mostrare “non calcolabile”.

## RF-017 — Upload PDF

Il sistema deve permettere upload PDF.

Criteri:

- solo PDF;
- dimensione massima configurabile;
- file salvato in storage privato;
- file collegato a cliente/impianto/sessione;
- download solo da utenti autorizzati;
- log caricamento.

## RF-018 — Import PDF MVP 1.5

Il sistema deve permettere import automatico.

Criteri:

- scelta tipo documento;
- estrazione testo/tabelle;
- mappatura parametri;
- preview dati;
- correzione manuale;
- conferma;
- salvataggio ufficiale solo dopo conferma;
- gestione errori.

## RF-019 — Export dati

Il sistema deve permettere export CSV/XLSX.

Criteri:

- export rispetta filtri applicati;
- export include dati visibili;
- commerciale può esportare solo se autorizzato;
- export tracciato in audit log se opportuno.

## RF-020 — Audit log minimo

Il sistema deve registrare:

- creazione/modifica/eliminazione cliente;
- creazione/modifica/eliminazione impianto;
- creazione/modifica/eliminazione rilevazione;
- upload PDF;
- import PDF;
- modifica limiti;
- modifica parametri.

---

# 20. Requisiti non funzionali

## RNF-001 — Performance

- Dashboard caricata entro 2 secondi con dataset medio.
- Tabella rilevazioni filtrabile entro 3 secondi con almeno 50.000 righe.
- Grafici calcolati lato backend se dataset grande.
- Paginazione obbligatoria per tabelle grandi.

## RNF-002 — Affidabilità

- Nessuna perdita dati in caso di errore import PDF.
- Operazioni critiche transazionali.
- Backup automatico.
- Restore testato periodicamente.

## RNF-003 — Manutenibilità

- Moduli separati per dominio:
  - clienti;
  - impianti;
  - parametri;
  - limiti;
  - rilevazioni;
  - documenti;
  - analytics;
  - import PDF;
  - audit.

## RNF-004 — Sicurezza

- Autenticazione obbligatoria.
- Autorizzazione lato server.
- Validazione input.
- Protezione upload file.
- Storage PDF privato.
- Logging senza segreti.
- Rate limiting su login e upload.
- Backup cifrati se possibile.

## RNF-005 — Auditabilità

- Operazioni principali tracciate.
- Possibilità di sapere chi ha creato/modificato un dato.
- Collegamento dato → fonte PDF.

## RNF-006 — Usabilità

- Interfaccia desktop chiara.
- Tabelle filtrabili.
- Form guidati.
- Errori comprensibili.
- Colore + testo per fuori limite.

## RNF-007 — Accessibilità

- Contrasti adeguati.
- Navigazione da tastiera per form principali.
- Non affidarsi solo al colore.
- Label chiare nei form.

## RNF-008 — Estendibilità

Il sistema deve poter aggiungere in futuro:

- nuovi parametri;
- nuovi tipi documento;
- nuovi parser;
- nuove analisi;
- report PDF;
- integrazioni gestionali.

---

# 21. Flussi principali

## 21.1 Flusso creazione cliente

1. Utente assistenza/admin apre “Clienti”.
2. Clicca “Nuovo cliente”.
3. Inserisce dati.
4. Seleziona settore.
5. Salva.
6. Sistema crea cliente.
7. Sistema registra audit log.

## 21.2 Flusso creazione impianto

1. Utente apre scheda cliente.
2. Clicca “Nuovo impianto”.
3. Inserisce nome, tipologia e dati tecnici.
4. Salva.
5. Sistema collega impianto al cliente.

## 21.3 Flusso rilevazione manuale

1. Utente apre “Nuova rilevazione”.
2. Seleziona cliente.
3. Seleziona impianto.
4. Inserisce data.
5. Seleziona fonte.
6. Allega PDF opzionale.
7. Aggiunge righe parametro.
8. Sistema applica limiti.
9. Sistema calcola esito.
10. Utente salva.
11. Sistema aggiorna tabella e grafico.

## 21.4 Flusso consultazione storico

1. Utente apre scheda impianto.
2. Sceglie periodo.
3. Sceglie parametro.
4. Visualizza tabella.
5. Visualizza grafico.
6. Apre PDF se necessario.

## 21.5 Flusso calcolo riduzione

1. Utente seleziona una sessione o periodo.
2. Seleziona parametro, per esempio COD.
3. Seleziona punto iniziale, per esempio ingresso impianto.
4. Seleziona punto finale, per esempio post MBR.
5. Sistema calcola riduzione.
6. Sistema mostra percentuale e valori di base.

## 21.6 Flusso upload PDF

1. Utente seleziona cliente/impianto/sessione.
2. Carica PDF.
3. Sistema valida tipo e dimensione.
4. Sistema salva in storage privato.
5. Sistema collega file.
6. Sistema registra audit log.

## 21.7 Flusso import PDF futuro

1. Utente carica PDF.
2. Seleziona tipo documento.
3. Sistema crea job import.
4. Worker estrae dati.
5. Sistema mostra preview.
6. Utente corregge.
7. Utente conferma.
8. Sistema crea rilevazioni ufficiali.

---

# 22. Flussi alternativi

## 22.1 Cliente non esiste

Durante nuova rilevazione, se il cliente non esiste, l’utente può:

- annullare;
- creare cliente;
- tornare alla rilevazione.

## 22.2 Impianto non esiste

Se il cliente esiste ma l’impianto no:

- creare impianto;
- associare tipologia;
- proseguire.

## 22.3 Parametro non esiste

Se il parametro non è presente:

- solo admin può crearlo;
- assistenza può segnalarlo o usare “Altro” se previsto;
- in import PDF il parametro va in stato “non riconosciuto”.

## 22.4 Limite non configurato

Il sistema salva il valore ma mostra:

```text
Limite non configurato
```

Non deve inventare limiti.

## 22.5 Valore non numerico

Se il parametro è non numerico:

- non calcolare conformità numerica;
- non calcolare riduzione percentuale;
- mostrare valore testuale.

## 22.6 PDF non valido

Se file non è PDF:

- bloccare upload;
- mostrare messaggio chiaro.

## 22.7 Import PDF fallito

Se import fallisce:

- mantenere PDF caricato;
- mostrare errore;
- permettere inserimento manuale;
- permettere retry.

---

# 23. Error states ed empty states

## 23.1 Nessun cliente

Messaggio:

```text
Non ci sono ancora clienti. Crea il primo cliente per iniziare.
```

## 23.2 Cliente senza impianti

```text
Questo cliente non ha ancora impianti associati.
```

## 23.3 Impianto senza rilevazioni

```text
Non ci sono ancora rilevazioni per questo impianto.
```

## 23.4 Nessun dato con filtri

```text
Nessuna rilevazione trovata per i filtri selezionati.
```

## 23.5 Limite mancante

```text
Il valore è stato salvato, ma non è stato configurato un limite di riferimento.
```

## 23.6 Valore fuori limite

```text
Fuori limite
```

Visivamente:

- testo rosso;
- badge rosso;
- icona opzionale.

## 23.7 PDF non leggibile

```text
Il PDF è stato caricato, ma non è stato possibile estrarre dati automaticamente.
Puoi inserire i dati manualmente.
```

## 23.8 Permesso negato

```text
Non hai i permessi per eseguire questa azione.
```

## 23.9 Errore salvataggio

```text
Non è stato possibile salvare. Controlla i dati e riprova.
```

---

# 24. Regole di business

## RB-001 — Cliente e impianto

Ogni impianto deve appartenere a un cliente.

## RB-002 — Tipologia impianto obbligatoria

Ogni impianto deve avere una tipologia perché i parametri possono variare secondo il trattamento.

## RB-003 — Parametri configurabili

Il sistema non deve avere una lista chiusa di parametri.  
Admin deve poter aggiungere parametri.

## RB-004 — Limiti configurabili

I limiti devono essere gestiti da configurazione, non da codice.

## RB-005 — Esito automatico

Il sistema calcola esito in base a valore e limiti applicabili.

## RB-006 — Fuori limite

Il valore fuori limite deve essere visibile in rosso e indicato con testo.

## RB-007 — Fonte obbligatoria

Ogni sessione deve avere fonte dato.

## RB-008 — Documento collegabile

Ogni sessione può avere uno o più PDF allegati.

## RB-009 — Import non ufficiale senza conferma

I dati importati da PDF sono bozza fino alla conferma umana.

## RB-010 — Commerciale solo lettura

Il commerciale può consultare tutti i clienti ma non modificare dati.

## RB-011 — Riduzione percentuale

La riduzione percentuale si calcola solo se:

- stesso parametro;
- valori numerici;
- valore iniziale > 0;
- punti campionamento confrontabili.

## RB-012 — Storico modifiche

Se implementato, ogni modifica rilevante deve salvare utente, data e differenza prima/dopo.

---

# 25. Modello dati concettuale

Entità principali:

```text
Utente
Ruolo
Cliente
Settore
Impianto
Tipologia impianto
Parametro chimico
Unità misura
Punto campionamento
Limite
Sessione rilevazione
Misura
Documento PDF
Job import PDF
Audit log
```

Relazioni:

```text
Cliente 1 -> N Impianti
Cliente N -> 1 Settore
Impianto N -> 1 Tipologia impianto
Sessione rilevazione N -> 1 Cliente
Sessione rilevazione N -> 1 Impianto
Sessione rilevazione 1 -> N Misure
Misura N -> 1 Parametro chimico
Misura N -> 1 Punto campionamento
Misura N -> 1 Unità misura
Documento PDF N -> 1 Cliente
Documento PDF N -> 0/1 Impianto
Documento PDF N -> 0/1 Sessione rilevazione
Import job N -> 1 Documento PDF
```

---

# 26. Schema dati proposto

> Nota per Cursor: adattare tipi e sintassi allo stack scelto. Lo schema sotto è concettuale ma già traducibile in migrazioni.

## 26.1 `users`

```text
id
name
email
password_hash / external_auth_id
role
status
last_login_at
created_at
updated_at
```

## 26.2 `sectors`

```text
id
name
description
active
created_at
updated_at
```

## 26.3 `customers`

```text
id
code
business_name
sector_id
address
city
province
country
contact_name
contact_email
contact_phone
status
notes
created_at
updated_at
deleted_at
```

## 26.4 `plant_types`

```text
id
name
description
active
created_at
updated_at
```

## 26.5 `plants`

```text
id
customer_id
plant_type_id
name
description
serial_number
installation_date
location
status
notes
created_at
updated_at
deleted_at
```

## 26.6 `units`

```text
id
symbol
name
description
created_at
updated_at
```

## 26.7 `chemical_parameters`

```text
id
code
name
default_unit_id
description
is_numeric
active
created_at
updated_at
```

## 26.8 `sampling_points`

```text
id
name
description
sort_order
active
created_at
updated_at
```

## 26.9 `limits`

```text
id
chemical_parameter_id
unit_id
scope_type
scope_id
min_value
max_value
legal_reference_text
valid_from
valid_to
active
notes
created_by
created_at
updated_at
```

Valori `scope_type`:

```text
global
sector
plant_type
customer
plant
```

## 26.10 `measurement_sessions`

```text
id
customer_id
plant_id
measurement_date
source_type
source_document_id
technician_name
laboratory_name
status
notes
created_by
created_at
updated_at
deleted_at
```

Valori `source_type`:

```text
manual
technical_report
lab_autocontrol
pdf_import
other
```

Valori `status`:

```text
draft
confirmed
corrected
deleted
```

## 26.11 `measurements`

```text
id
measurement_session_id
chemical_parameter_id
sampling_point_id
value_numeric
value_text
unit_id
applied_limit_id
limit_min_snapshot
limit_max_snapshot
compliance_status
notes
created_at
updated_at
deleted_at
```

Valori `compliance_status`:

```text
compliant
out_of_limit
limit_not_configured
incomplete
not_applicable
```

## 26.12 `documents`

```text
id
customer_id
plant_id
measurement_session_id
document_type
original_filename
stored_filename
storage_path
mime_type
file_size
upload_status
uploaded_by
uploaded_at
deleted_at
```

Valori `document_type`:

```text
takeoff_report
lab_autocontrol
other_pdf
```

## 26.13 `pdf_import_jobs`

```text
id
document_id
status
parser_type
raw_extracted_text
structured_output_json
error_message
created_by
created_at
updated_at
```

Valori `status`:

```text
uploaded
processing
needs_review
confirmed
failed
discarded
```

## 26.14 `audit_logs`

```text
id
actor_user_id
action
entity_type
entity_id
before_json
after_json
ip_address
user_agent
created_at
```

---

# 27. API / endpoint proposti

## 27.1 Auth

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

## 27.2 Settori

```text
GET    /api/sectors
POST   /api/sectors
PATCH  /api/sectors/:id
DELETE /api/sectors/:id
```

## 27.3 Clienti

```text
GET    /api/customers
POST   /api/customers
GET    /api/customers/:id
PATCH  /api/customers/:id
DELETE /api/customers/:id
```

## 27.4 Tipologie impianto

```text
GET    /api/plant-types
POST   /api/plant-types
PATCH  /api/plant-types/:id
DELETE /api/plant-types/:id
```

## 27.5 Impianti

```text
GET    /api/plants
POST   /api/plants
GET    /api/plants/:id
PATCH  /api/plants/:id
DELETE /api/plants/:id
```

Query utili:

```text
GET /api/plants?customerId=...
GET /api/plants?plantTypeId=...
```

## 27.6 Parametri

```text
GET    /api/chemical-parameters
POST   /api/chemical-parameters
PATCH  /api/chemical-parameters/:id
DELETE /api/chemical-parameters/:id
```

## 27.7 Unità

```text
GET    /api/units
POST   /api/units
PATCH  /api/units/:id
```

## 27.8 Punti campionamento

```text
GET    /api/sampling-points
POST   /api/sampling-points
PATCH  /api/sampling-points/:id
```

## 27.9 Limiti

```text
GET    /api/limits
POST   /api/limits
PATCH  /api/limits/:id
DELETE /api/limits/:id
GET    /api/limits/resolve?parameterId=&plantId=&customerId=
```

## 27.10 Sessioni rilevazione

```text
GET    /api/measurement-sessions
POST   /api/measurement-sessions
GET    /api/measurement-sessions/:id
PATCH  /api/measurement-sessions/:id
DELETE /api/measurement-sessions/:id
```

## 27.11 Misure

```text
POST   /api/measurement-sessions/:id/measurements
PATCH  /api/measurements/:id
DELETE /api/measurements/:id
```

## 27.12 Analytics

```text
GET /api/analytics/time-series
GET /api/analytics/compliance-summary
GET /api/analytics/performance-reduction
GET /api/analytics/out-of-limit
GET /api/analytics/plant-overview
```

## 27.13 Documenti

```text
POST /api/documents/upload
GET  /api/documents/:id/download
GET  /api/documents?customerId=&plantId=
DELETE /api/documents/:id
```

## 27.14 Import PDF

```text
POST /api/pdf-import-jobs
GET  /api/pdf-import-jobs/:id
POST /api/pdf-import-jobs/:id/retry
POST /api/pdf-import-jobs/:id/confirm
POST /api/pdf-import-jobs/:id/discard
```

---

# 28. Componenti UI

## 28.1 Layout base

Componenti:

- sidebar;
- header;
- breadcrumb;
- area filtri;
- tabella;
- pannello dettaglio;
- grafico;
- form;
- modale conferma;
- toast messaggi.

## 28.2 Dashboard

Widget:

- clienti attivi;
- impianti attivi;
- rilevazioni del mese;
- valori fuori limite;
- ultimi PDF caricati;
- impianti con criticità;
- scorciatoie operative.

## 28.3 Elenco clienti

Tabella:

- codice;
- ragione sociale;
- settore;
- numero impianti;
- ultima rilevazione;
- stato;
- azioni.

Filtri:

- nome;
- settore;
- stato.

## 28.4 Scheda cliente

Sezioni:

- dati anagrafici;
- impianti;
- rilevazioni recenti;
- grafici principali;
- documenti;
- note.

## 28.5 Scheda impianto

Sezioni:

- dati impianto;
- tipologia;
- storico rilevazioni;
- grafico parametro;
- valori fuori limite;
- performance tra punti;
- documenti collegati.

## 28.6 Form nuova rilevazione

Campi:

- cliente;
- impianto;
- data;
- fonte;
- tecnico/laboratorio;
- PDF;
- righe parametri.

La tabella righe deve permettere:

- aggiungi riga;
- duplica riga;
- elimina riga;
- seleziona parametro;
- seleziona punto;
- valore;
- unità;
- note.

## 28.7 Tabella rilevazioni

Colonne:

- data;
- cliente;
- settore;
- impianto;
- punto;
- parametro;
- valore;
- limite;
- esito;
- fonte;
- documento;
- azioni.

## 28.8 Grafico storico

Controlli:

- cliente;
- impianto;
- parametro;
- punto;
- periodo.

Visualizzazione:

- linea valori;
- linea limite;
- punti fuori limite;
- tooltip con data, valore, limite, fonte.

## 28.9 Schermata parametri

Funzioni:

- crea parametro;
- modifica parametro;
- disattiva parametro;
- associa unità;
- indica se numerico.

## 28.10 Schermata limiti

Funzioni:

- crea limite;
- modifica limite;
- seleziona ambito;
- imposta validità;
- imposta riferimento testuale;
- vedere priorità applicazione.

## 28.11 Schermata import PDF futura

Step:

1. Upload.
2. Tipo documento.
3. Elaborazione.
4. Preview dati.
5. Correzione.
6. Conferma.
7. Esito.

---

# 29. Analytics e analisi performance

## 29.1 Storico parametro

Mostra andamento temporale per parametro.

## 29.2 Conformità nel periodo

Mostra:

- numero misure totali;
- numero conformi;
- numero fuori limite;
- numero senza limite configurato.

## 29.3 Valori fuori limite

Elenco criticità:

- cliente;
- impianto;
- parametro;
- valore;
- limite;
- data;
- fonte.

## 29.4 Riduzione tra punti

Esempio COD:

```text
Ingresso impianto: 1000 mg/L
Post MBR: 300 mg/L
Riduzione: 70%
Post pulizia: 100 mg/L
Riduzione rispetto a ingresso: 90%
```

## 29.5 Analisi pre/post intervento

Futura.

Serve a confrontare:

- prima pulizia;
- dopo pulizia;
- prima manutenzione;
- dopo manutenzione.

## 29.6 Confronto impianti simili

Futuro.

Criteri:

- stesso settore;
- stessa tipologia;
- stesso parametro;
- stesso periodo.

## 29.7 Analisi aggiuntive consigliate

- Top impianti con più criticità.
- Parametri più spesso fuori limite.
- Trend miglioramento/peggioramento.
- Rilevazioni mancanti o discontinue.
- Clienti senza dati recenti.
- Impianti con performance stabile.

---

# 30. Import PDF da rapportini e autocontrolli

## 30.1 Obiettivo

Evitare doppia copiatura.

## 30.2 Fonti

- Rapportini TAKE OFF in PDF.
- Autocontrolli laboratorio in PDF.

## 30.3 Strategia tecnica

Fase 1:

- upload PDF;
- collegamento a sessione.

Fase 1.5:

- estrazione testo/tabelle;
- parsing per template;
- preview;
- conferma.

Fase 2:

- mappatura più robusta;
- gestione varianti documento;
- import massivo storico.

## 30.4 Stati import

```text
uploaded
processing
needs_review
confirmed
failed
discarded
```

## 30.5 Regola critica

Nessun dato importato diventa ufficiale senza conferma utente.

## 30.6 Dati da estrarre

Quando disponibili:

- cliente;
- impianto;
- data;
- fonte documento;
- parametri;
- valori;
- unità;
- limiti;
- punti campionamento;
- note.

## 30.7 Gestione parametri non riconosciuti

Se il parser trova un parametro non mappato:

- mostrare in preview;
- richiedere mappatura manuale;
- consentire creazione parametro solo ad admin;
- non scartare automaticamente il dato.

## 30.8 Gestione errori

Casi:

- PDF scansionato senza testo;
- formato non riconosciuto;
- tabella non leggibile;
- unità mancante;
- cliente non riconosciuto;
- impianto non riconosciuto;
- parametro ambiguo.

Comportamento:

- non perdere il PDF;
- registrare errore;
- permettere inserimento manuale;
- permettere retry.

---

# 31. Ruoli e permessi

| Funzione | Assistenza tecnica | Commerciale | Admin |
|---|---:|---:|---:|
| Login | Sì | Sì | Sì |
| Vedere clienti | Sì | Sì | Sì |
| Creare clienti | Sì | No | Sì |
| Modificare clienti | Sì | No | Sì |
| Vedere impianti | Sì | Sì | Sì |
| Creare impianti | Sì | No | Sì |
| Modificare impianti | Sì | No | Sì |
| Vedere rilevazioni | Sì | Sì | Sì |
| Creare rilevazioni | Sì | No | Sì |
| Modificare rilevazioni | Sì | No | Sì |
| Eliminare rilevazioni | Sì, se consentito | No | Sì |
| Vedere grafici | Sì | Sì | Sì |
| Esportare dati | Sì | Da decidere | Sì |
| Caricare PDF | Sì | No | Sì |
| Scaricare PDF | Sì | Sì | Sì |
| Importare PDF | Sì | No | Sì |
| Confermare import PDF | Sì | No | Sì |
| Gestire parametri | No | No | Sì |
| Gestire limiti | No/da decidere | No | Sì |
| Gestire utenti | No | No | Sì |
| Vedere audit log | No | No | Sì |

Regola tecnica:

> I permessi devono essere applicati lato backend. La UI può nascondere i pulsanti, ma non è sufficiente.

---

# 32. Audit trail

## 32.1 Obiettivo

Sapere chi ha fatto cosa e quando.

## 32.2 Eventi da tracciare

- login falliti ripetuti;
- creazione cliente;
- modifica cliente;
- creazione impianto;
- modifica impianto;
- creazione rilevazione;
- modifica rilevazione;
- eliminazione rilevazione;
- upload PDF;
- download PDF opzionale;
- import PDF;
- conferma import;
- modifica limiti;
- modifica parametri;
- export dati opzionale.

## 32.3 Campi audit

```text
utente
azione
entità
id entità
data/ora
prima
dopo
ip
user agent
```

## 32.4 Livello MVP

Nel primo MVP è sufficiente audit minimo per:

- creazione/modifica rilevazioni;
- upload PDF;
- modifica limiti;
- modifica parametri.

---

# 33. Notifiche

## 33.1 Primo rilascio

Fuori scope.

## 33.2 Futuro

Possibili notifiche:

- valore fuori limite;
- import PDF fallito;
- impianto senza rilevazioni recenti;
- parametro critico ricorrente.

---

# 34. Automazioni

## 34.1 Primo MVP

Automazioni incluse:

- calcolo conformità;
- evidenza fuori limite;
- calcolo riduzione percentuale;
- aggiornamento grafici;
- applicazione limite corretto secondo priorità.

## 34.2 MVP 1.5

Automazioni incluse:

- import PDF;
- proposta mapping parametri;
- stato import.

## 34.3 Futuro

- notifiche;
- report automatici;
- suggerimenti manutenzione;
- controlli su dati mancanti.

---

# 35. Integrazioni

## 35.1 Primo rilascio

Nessuna integrazione esterna obbligatoria.

## 35.2 TAKE OFF

Da valutare:

- solo PDF;
- export strutturato;
- API;
- accesso database;
- formato standard.

## 35.3 Laboratorio

Da valutare:

- PDF uniforme;
- export Excel/CSV;
- API;
- formati diversi per cliente/analisi.

## 35.4 Gestionale aziendale

Fuori scope primo rilascio.

Futuro:

- import clienti;
- import impianti;
- sincronizzazione anagrafiche.

---

# 36. Sicurezza

## 36.1 Principi

- Least privilege.
- Deny by default.
- Validazione server-side.
- Storage file non pubblico.
- Nessun dato sensibile nei log.
- Backup e restore.
- Test permessi.

## 36.2 Rischi principali

| Rischio | Impatto | Mitigazione |
|---|---|---|
| Commerciale modifica dati | Dato non affidabile | Permessi backend |
| PDF pubblico | Data breach | Storage privato |
| Upload file malevolo | Compromissione | Validazione e limiti |
| Limite sbagliato | Analisi errata | Audit e ruoli |
| Import PDF errato | Dati falsati | Revisione umana |
| Accesso non autenticato | Esposizione dati | Login obbligatorio |
| ID manipolato in URL | Accesso improprio | Authorization check |
| Log con dati eccessivi | Privacy risk | Redaction log |

## 36.3 Upload file

Requisiti:

- accettare solo PDF;
- verificare MIME type;
- limitare dimensione;
- rinominare file;
- non eseguire file;
- non salvare in public folder;
- download tramite endpoint autorizzato.

## 36.4 Sessioni e autenticazione

- Password hash sicuro se email/password.
- Rate limit login.
- Logout.
- Scadenza sessione.
- MFA consigliata per admin in fase successiva.

## 36.5 Test sicurezza minimi

- commerciale non può creare rilevazione via API;
- commerciale non può modificare rilevazione via API;
- utente non loggato non scarica PDF;
- file non PDF rifiutato;
- input numerico validato;
- limite non può essere modificato da utente non autorizzato.

---

# 37. Privacy e compliance

## 37.1 Dati trattati

- dati clienti aziendali;
- eventuali referenti;
- impianti;
- dati tecnici;
- parametri chimici;
- PDF rapportini/autocontrolli;
- dati utenti interni;
- log operativi.

## 37.2 Principi

- minimizzare dati personali;
- usare dati solo per finalità operative;
- limitare accessi;
- conservare dati secondo policy aziendale;
- proteggere PDF;
- tracciare modifiche rilevanti.

## 37.3 Retention

Da decidere:

- per quanto conservare PDF;
- per quanto conservare audit log;
- per quanto conservare dati impianto inattivo;
- se eliminare o archiviare clienti non attivi.

## 37.4 Data breach

Serve runbook minimo:

- come identificare incidente;
- chi avvisare internamente;
- quali log consultare;
- come bloccare accessi;
- come valutare esposizione dati;
- come documentare evento.

## 37.5 Cookie e analytics

Se web app interna:

- evitare tracker non necessari;
- usare solo cookie tecnici;
- documentare eventuali analytics.

## 37.6 AI

Nel primo MVP non è prevista AI lato prodotto.

Se in futuro si usa AI per leggere PDF:

- non inviare dati non necessari;
- valutare provider;
- verificare retention;
- mantenere human review;
- validare output strutturato;
- loggare decisioni;
- evitare che output AI modifichi dati senza conferma.

---

# 38. Accessibilità

## 38.1 Requisiti

- contrasto sufficiente;
- label chiare;
- pulsanti con testo;
- errore vicino al campo;
- navigazione da tastiera;
- non usare solo rosso/verde;
- badge testuali.

## 38.2 Fuori limite

Non basta il colore rosso.  
Mostrare anche:

```text
Fuori limite
```

## 38.3 Tabelle

- header chiari;
- ordinamento;
- filtri visibili;
- paginazione;
- stati vuoti comprensibili.

---

# 39. Architettura concettuale

## 39.1 Componenti

```text
Frontend web
Backend API
Database relazionale
Storage PDF privato
Modulo analytics
Modulo import PDF
Audit log
Sistema autenticazione
```

## 39.2 Diagramma

```text
[Utente]
   |
   v
[Frontend Web]
   |
   v
[Backend API]
   |---------- [Database PostgreSQL]
   |---------- [Storage PDF privato]
   |---------- [Modulo Analytics]
   |---------- [Modulo Import PDF / Worker]
   |---------- [Audit Log]
```

## 39.3 Moduli backend

- Auth.
- Users.
- Customers.
- Plants.
- Chemical parameters.
- Limits.
- Measurements.
- Documents.
- PDF import.
- Analytics.
- Audit.

## 39.4 Decisioni architetturali da registrare in ADR

- ADR-001: scelta database.
- ADR-002: scelta storage PDF.
- ADR-003: strategia autenticazione.
- ADR-004: strategia import PDF.
- ADR-005: gestione limiti e snapshot.

---

# 40. Struttura progetto consigliata

Adattare allo stack scelto.

```text
/
  AGENTS.md
  README.md

  /docs
    PRD.md
    RFC-001-mvp-core.md
    RFC-002-upload-pdf.md
    RFC-003-pdf-import.md
    RFC-004-analytics-performance.md
    ADR-001-database.md
    ADR-002-file-storage.md
    TEST_PLAN.md
    SECURITY_REVIEW.md
    RUNBOOK.md

  /.cursor
    /rules
      product-rules.mdc
      security-rules.mdc
      testing-rules.mdc
      cursor-protocol.mdc

  /apps
    /web
      /src
        /app
        /components
        /features
          /dashboard
          /customers
          /plants
          /measurements
          /parameters
          /limits
          /documents
          /analytics
          /pdf-import
        /lib
        /styles

    /api
      /src
        /modules
          /auth
          /users
          /customers
          /plants
          /parameters
          /limits
          /measurements
          /documents
          /analytics
          /pdf-import
          /audit
        /db
        /config
        /security
        /tests
```

---

# 41. RFC / capability spec da creare

## RFC-001 — MVP Core

Include:

- clienti;
- impianti;
- parametri;
- limiti;
- rilevazioni manuali;
- tabella;
- grafici;
- ruoli.

## RFC-002 — Upload PDF

Include:

- upload;
- validazione;
- storage;
- download autorizzato;
- collegamento documento.

## RFC-003 — Import PDF

Include:

- parser TAKE OFF;
- parser autocontrolli;
- preview;
- conferma;
- gestione errori.

## RFC-004 — Analytics performance

Include:

- time series;
- conformità;
- riduzione percentuale;
- fuori limite;
- trend.

## RFC-005 — Security baseline

Include:

- permessi;
- audit;
- validazione input;
- test authorization;
- hardening upload;
- backup.

---

# 42. Backlog e task atomici

## Epic 1 — Setup

- T-001 creare repository.
- T-002 creare struttura docs.
- T-003 creare AGENTS.md.
- T-004 creare rules Cursor.
- T-005 configurare app web.
- T-006 configurare API.
- T-007 configurare database.
- T-008 configurare ambiente dev.

## Epic 2 — Database

- T-009 creare tabella users.
- T-010 creare tabella sectors.
- T-011 creare tabella customers.
- T-012 creare tabella plant_types.
- T-013 creare tabella plants.
- T-014 creare tabella units.
- T-015 creare tabella chemical_parameters.
- T-016 creare tabella sampling_points.
- T-017 creare tabella limits.
- T-018 creare tabella measurement_sessions.
- T-019 creare tabella measurements.
- T-020 creare tabella documents.
- T-021 creare tabella audit_logs.
- T-022 creare seed dati demo.

## Epic 3 — Auth e permessi

- T-023 login.
- T-024 logout.
- T-025 current user.
- T-026 middleware autorizzazione.
- T-027 ruoli.
- T-028 test permessi.

## Epic 4 — Clienti e impianti

- T-029 API settori.
- T-030 UI settori.
- T-031 API clienti.
- T-032 UI clienti.
- T-033 scheda cliente.
- T-034 API tipologie impianto.
- T-035 API impianti.
- T-036 UI impianti.
- T-037 scheda impianto.

## Epic 5 — Parametri e limiti

- T-038 API unità.
- T-039 UI unità.
- T-040 API parametri.
- T-041 UI parametri.
- T-042 API punti campionamento.
- T-043 UI punti campionamento.
- T-044 API limiti.
- T-045 UI limiti.
- T-046 funzione risoluzione limite.
- T-047 test priorità limiti.

## Epic 6 — Rilevazioni

- T-048 API sessioni.
- T-049 API misure.
- T-050 form nuova rilevazione.
- T-051 righe parametri dinamiche.
- T-052 calcolo conformità.
- T-053 salvataggio misure.
- T-054 modifica rilevazione.
- T-055 eliminazione logica.
- T-056 test calcolo conformità.

## Epic 7 — Tabelle e grafici

- T-057 tabella rilevazioni.
- T-058 filtri.
- T-059 paginazione.
- T-060 grafico storico.
- T-061 linea limite.
- T-062 evidenza fuori limite.
- T-063 export CSV/XLSX.

## Epic 8 — PDF

- T-064 upload PDF.
- T-065 validazione PDF.
- T-066 salvataggio privato.
- T-067 download autorizzato.
- T-068 collegamento PDF.
- T-069 test upload.
- T-070 test download permessi.

## Epic 9 — Analytics

- T-071 endpoint time series.
- T-072 endpoint out of limit.
- T-073 endpoint performance reduction.
- T-074 UI analytics base.
- T-075 test riduzione percentuale.

## Epic 10 — Audit e qualità

- T-076 audit log base.
- T-077 audit su limiti.
- T-078 audit su rilevazioni.
- T-079 test audit.
- T-080 test E2E demo.
- T-081 checklist sicurezza.
- T-082 documentare runbook.

## Epic 11 — Import PDF futuro

- T-083 creare tabella pdf_import_jobs.
- T-084 creare stato import.
- T-085 estrazione testo PDF.
- T-086 parser TAKE OFF.
- T-087 parser autocontrollo.
- T-088 preview dati.
- T-089 conferma import.
- T-090 gestione errori.

---

# 43. Criteri di accettazione

## 43.1 MVP core

Il MVP è accettato se:

- esiste login;
- esistono tre ruoli;
- admin può configurare parametri e limiti;
- assistenza può creare cliente e impianto;
- assistenza può inserire rilevazioni;
- commerciale può consultare ma non modificare;
- tabella filtra per cliente/impianto/periodo/parametro;
- grafico mostra storico;
- fuori limite è rosso e testuale;
- PDF può essere allegato;
- export base funziona;
- test principali passano.

## 43.2 Import PDF

Accettato se:

- PDF viene caricato;
- job import viene creato;
- dati estratti sono mostrati in preview;
- utente può correggere;
- utente può confermare;
- dati diventano rilevazioni solo dopo conferma;
- errori sono gestiti senza perdere PDF.

## 43.3 Analytics performance

Accettata se:

- riduzione percentuale calcolata correttamente;
- casi non calcolabili gestiti;
- grafici mostrano limiti;
- fuori limite elencati.

---

# 44. Test plan

## 44.1 Unit test

- risoluzione limite;
- calcolo conformità;
- calcolo riduzione;
- validazione valore numerico;
- validazione upload;
- permessi funzione.

## 44.2 Integration test

- creazione cliente + impianto;
- creazione rilevazione con misure;
- applicazione limite;
- allegato PDF;
- download PDF;
- export dati;
- audit log.

## 44.3 E2E test

Scenario demo:

1. Login come assistenza.
2. Crea cliente.
3. Crea impianto.
4. Crea parametro COD.
5. Crea limite COD.
6. Inserisce rilevazione.
7. Vede fuori limite.
8. Vede grafico.
9. Login come commerciale.
10. Verifica sola lettura.

## 44.4 Test sicurezza

- utente non loggato bloccato;
- commerciale non crea rilevazione;
- commerciale non modifica limite;
- download PDF non autorizzato bloccato;
- upload file non PDF bloccato;
- manipolazione ID in URL bloccata.

## 44.5 Test import PDF futuro

- PDF valido TAKE OFF;
- PDF valido laboratorio;
- PDF non leggibile;
- parametro non riconosciuto;
- unità mancante;
- cliente non riconosciuto;
- conferma;
- scarto.

## 44.6 Test accessibilità

- form con label;
- navigazione tastiera;
- contrasto;
- fuori limite non solo colore.

---

# 45. Rollout, rollback e migrazione dati

## 45.1 Rollout MVP

Fasi:

1. ambiente sviluppo;
2. seed demo;
3. test interni;
4. demo assistenza;
5. demo commerciale;
6. correzioni;
7. caricamento primi clienti reali;
8. uso controllato.

## 45.2 Rollback

Per ogni rilascio:

- backup database prima del deploy;
- backup file storage;
- changelog;
- script rollback, se migrazione reversibile;
- piano manuale se migrazione non reversibile.

## 45.3 Migrazione storico

Approccio consigliato:

1. partire da nuovi dati;
2. importare manualmente alcuni casi storici importanti;
3. validare modello;
4. procedere con import massivo PDF solo dopo MVP 1.5.

---

# 46. Observability, logging e monitoring

## 46.1 Log applicativi

Loggare:

- errori API;
- fallimenti login;
- upload PDF falliti;
- import PDF falliti;
- errori salvataggio;
- job import.

Non loggare:

- password;
- token;
- contenuto completo PDF;
- dati personali non necessari.

## 46.2 Metriche operative

- numero rilevazioni create;
- numero PDF caricati;
- numero import riusciti/falliti;
- tempi import;
- errori API;
- utenti attivi;
- valori fuori limite.

## 46.3 Alert futuri

- molti errori upload;
- import PDF falliti;
- spazio storage quasi pieno;
- backup fallito;
- errori API elevati.

---

# 47. Runbook operativo

## 47.1 PDF non si carica

Controllare:

- dimensione;
- formato;
- permessi storage;
- log backend;
- spazio disponibile.

Azione:

- se file valido, riprovare;
- se persiste, caricare manualmente dati senza PDF e aprire issue.

## 47.2 Dato fuori limite contestato

Controllare:

- valore inserito;
- unità;
- parametro;
- punto campionamento;
- limite applicato;
- PDF originale.

Azione:

- correggere se errore di inserimento;
- aggiornare limite solo se autorizzato;
- mantenere audit log.

## 47.3 Grafico non mostra dati

Controllare:

- periodo;
- parametro;
- punto campionamento;
- valore numerico;
- filtri cliente/impianto.

## 47.4 Import PDF fallisce

Controllare:

- tipo documento;
- testo estraibile;
- template;
- parametri non riconosciuti;
- log import.

Azione:

- inserimento manuale;
- migliorare parser;
- aggiungere mapping.

## 47.5 Utente non vede funzione

Controllare:

- ruolo;
- permessi;
- sessione;
- UI;
- backend policy.

---

# 48. Rischi, trade-off e mitigazioni

## 48.1 Import PDF troppo presto

Rischio: dati sporchi.  
Mitigazione: prima modello dati e inserimento manuale.

## 48.2 Parametri duplicati

Rischio: COD e C.O.D. salvati come parametri diversi.  
Mitigazione: dizionario parametri e mapping.

## 48.3 Limiti sbagliati

Rischio: falsa conformità.  
Mitigazione: limiti configurabili, ruoli, audit, snapshot.

## 48.4 Commerciale interpreta male

Rischio: uso commerciale scorretto.  
Mitigazione: vista semplice e note tecniche.

## 48.5 PDF non standard

Rischio: parser fragile.  
Mitigazione: import con revisione umana e template separati.

## 48.6 Upload insicuro

Rischio: file malevoli o esposti.  
Mitigazione: storage privato, validazione, endpoint autorizzato.

## 48.7 Mancanza test

Rischio: regressioni su permessi o calcoli.  
Mitigazione: test obbligatori e CI.

## 48.8 Dati senza limite

Rischio: impossibile valutare conformità.  
Mitigazione: stato “limite non configurato” e report parametri senza limite.

---

# 49. Guardrail per agenti di coding

## 49.1 Regole generali

- Non scrivere codice senza piano.
- Non implementare tutto in una volta.
- Non hardcodare limiti.
- Non rendere pubblici i PDF.
- Non saltare test permessi.
- Non introdurre dipendenze senza motivazione.
- Non usare dati import PDF senza revisione.
- Non usare solo colore per fuori limite.

## 49.2 Regole sicurezza

- Ogni endpoint deve verificare autenticazione.
- Ogni endpoint mutativo deve verificare ruolo.
- Ogni download PDF deve verificare permessi.
- Ogni input deve essere validato lato server.
- Ogni file upload deve essere validato.
- Non loggare segreti o file completi.

## 49.3 Regole dati

- Ogni impianto appartiene a cliente.
- Ogni misura appartiene a sessione.
- Ogni misura ha parametro e punto.
- Ogni limite ha ambito chiaro.
- Ogni dato importato ha fonte.

## 49.4 Regole UI

- Tabelle con filtri.
- Form chiari.
- Errori leggibili.
- Badge testuali.
- Grafici semplici.
- Nessuna dashboard complessa prima del core.

---

# 50. Protocollo di avanzamento per Cursor

Cursor deve seguire questo protocollo in ogni ciclo.

## 50.1 Prima di iniziare

Leggere:

- `docs/PRD.md`;
- `AGENTS.md`;
- `.cursor/rules/*`;
- RFC relativo al task.

## 50.2 Piano obbligatorio

Prima del codice produrre:

```text
Obiettivo ciclo:
Scope incluso:
Scope escluso:
File da creare:
File da modificare:
Schema dati coinvolto:
Endpoint coinvolti:
Componenti UI coinvolti:
Test previsti:
Rischi:
Assunzioni:
Domande bloccanti:
```

## 50.3 Stati task

Ogni task deve avere stato:

```text
Non iniziato
In corso
Bloccato
In review
Completato
```

## 50.4 Report per task

Per ogni task:

```text
Task:
Stato:
File modificati:
Decisioni prese:
Test eseguiti:
Evidenze prodotte:
Problemi aperti:
Prossimo passo:
```

## 50.5 Quando fermarsi per approvazione

Cursor deve fermarsi prima di:

- modifiche ai permessi;
- modifiche schema database già usato;
- eliminazione dati;
- upload file;
- import PDF;
- integrazioni esterne;
- gestione limiti;
- cambio stack;
- introduzione librerie critiche;
- sicurezza/autenticazione.

## 50.6 Fine ciclo

Ogni ciclo deve chiudere con:

- riepilogo;
- file modificati;
- test eseguiti;
- screenshot/log/checklist;
- problemi aperti;
- prossimo task consigliato.

## 50.7 Significato di “Completato”

Un task è completato solo se:

- requisito implementato;
- criteri di accettazione soddisfatti;
- test rilevanti passati;
- nessuna regressione nota;
- evidenza prodotta.

---

# 51. Contenuto consigliato per `AGENTS.md`

```md
# AGENTS.md

## Contesto prodotto

Stiamo costruendo una web app interna per storicizzare, consultare e analizzare parametri chimici degli impianti di trattamento acqua.

Gli utenti principali sono:
- assistenza tecnica;
- commerciale;
- admin.

Il sistema deve gestire:
- clienti;
- settori;
- impianti;
- tipologie impianto;
- parametri chimici;
- limiti;
- rilevazioni;
- PDF;
- grafici;
- import PDF futuro.

## Regola principale

Lavora sempre plan-first.
Non scrivere codice prima di aver prodotto un piano e ricevuto approvazione.

## Priorità

1. Correttezza del dato.
2. Sicurezza e permessi.
3. Tracciabilità della fonte.
4. Usabilità per utenti non tecnici.
5. Estendibilità verso import PDF.

## Divieti

- Non hardcodare limiti di legge.
- Non rendere pubblici i PDF.
- Non saltare controlli permessi lato backend.
- Non generare dati ufficiali da PDF senza revisione umana.
- Non introdurre dipendenze non necessarie.
- Non usare solo colore per segnalare fuori limite.
- Non loggare password, token o contenuto completo dei PDF.

## Obblighi

- Ogni endpoint deve controllare autenticazione.
- Ogni endpoint mutativo deve controllare ruolo.
- Ogni upload deve validare file e dimensione.
- Ogni valore fuori limite deve avere colore e testo.
- Ogni task deve avere test o motivazione se non testabile.
- Ogni ciclo deve produrre evidenza verificabile.

## Definition of Done

Un task è completato solo se:
- implementato;
- testato;
- documentato se necessario;
- senza regressioni note;
- con evidenza prodotta.
```

---

# 52. Contenuto consigliato per `.cursor/rules`

## 52.1 `.cursor/rules/product-rules.mdc`

```md
# Product Rules

- Il prodotto serve a storicizzare parametri chimici di impianti trattamento acqua.
- Il primo MVP parte da inserimento manuale, non da import PDF.
- Ogni dato deve essere collegato a cliente, impianto, data, parametro, punto e fonte.
- I limiti sono configurabili, mai hardcoded.
- Il commerciale è in sola lettura.
- L’assistenza tecnica inserisce e modifica rilevazioni.
- L’admin gestisce parametri, limiti e utenti.
```

## 52.2 `.cursor/rules/security-rules.mdc`

```md
# Security Rules

- Controlla sempre autenticazione e autorizzazione lato backend.
- Non fidarti della UI per i permessi.
- Non salvare PDF in cartelle pubbliche.
- Valida file upload per tipo, dimensione e contenuto.
- Non loggare segreti, token, password o contenuto completo PDF.
- Aggiungi test per permessi critici.
- Usa deny by default.
```

## 52.3 `.cursor/rules/testing-rules.mdc`

```md
# Testing Rules

Ogni feature deve includere test minimi.

Test obbligatori:
- permessi ruolo commerciale;
- calcolo fuori limite;
- limite non configurato;
- upload file non valido;
- accesso PDF non autorizzato;
- calcolo riduzione percentuale.

Un task non è completato senza test o motivazione esplicita.
```

## 52.4 `.cursor/rules/cursor-protocol.mdc`

```md
# Cursor Protocol

Lavora per milestone e task atomici.

Prima di modificare codice:
1. leggi PRD e rules;
2. produci piano;
3. elenca file da creare/modificare;
4. elenca test;
5. attendi approvazione.

A fine ciclo:
- riepiloga file;
- riepiloga test;
- indica evidenze;
- indica rischi residui;
- indica prossimo passo.
```

---

# 53. Prompt implementativi

## 53.1 Prompt iniziale MVP Core

```text
Leggi docs/PRD.md, AGENTS.md e .cursor/rules/*.

Devi implementare RFC-001 MVP Core.

Prima di scrivere codice, produci un piano con:
- architettura proposta;
- schema dati;
- endpoint;
- componenti UI;
- task atomici;
- test;
- rischi;
- assunzioni.

Scope incluso:
- login base;
- ruoli assistenza tecnica, commerciale, admin;
- clienti;
- settori;
- impianti;
- tipologie impianto;
- parametri;
- unità;
- punti campionamento;
- limiti;
- rilevazioni manuali;
- tabella filtrabile;
- grafico storico;
- evidenza fuori limite.

Scope escluso:
- import PDF;
- notifiche;
- integrazione gestionale;
- report PDF avanzato.

Rispetta:
- no limiti hardcoded;
- permessi backend;
- storage PDF non pubblico;
- test su permessi e calcolo limiti.
```

## 53.2 Prompt upload PDF

```text
Implementa upload PDF base secondo PRD.

Prima produci piano.

Requisiti:
- solo PDF;
- dimensione massima configurabile;
- storage non pubblico;
- download tramite endpoint autorizzato;
- collegamento a cliente, impianto e sessione;
- audit log upload;
- test upload valido;
- test file non valido;
- test download non autorizzato.

Non implementare import automatico in questo ciclo.
```

## 53.3 Prompt import PDF MVP 1.5

```text
Implementa il primo ciclo di import PDF.

Prima produci RFC tecnico e piano.

Requisiti:
- creare pdf_import_jobs;
- stati: uploaded, processing, needs_review, confirmed, failed, discarded;
- estrarre testo dal PDF;
- salvare raw text;
- proporre structured_output_json;
- mostrare preview;
- permettere correzione;
- confermare creazione rilevazioni solo dopo revisione umana;
- gestire errori.

Non usare dati importati come ufficiali senza conferma.
```

## 53.4 Prompt analytics performance

```text
Implementa analytics base.

Requisiti:
- endpoint time-series;
- endpoint valori fuori limite;
- endpoint riduzione percentuale;
- grafico storico parametro;
- linea limite;
- tabella valori sottostante;
- casi non calcolabili gestiti.

Aggiungi test:
- riduzione 70%;
- valore iniziale zero;
- parametro non numerico;
- dati mancanti.
```

---

# 54. Definition of Done

Una feature è completata quando:

- rispetta il PRD;
- ha criteri di accettazione soddisfatti;
- ha test rilevanti;
- non rompe permessi;
- non espone PDF;
- non introduce limiti hardcoded;
- aggiorna documentazione se necessario;
- lascia evidenza verificabile.

Un ciclo Cursor è completato quando include:

- piano;
- implementazione;
- test;
- elenco file modificati;
- rischi residui;
- screenshot/log/checklist;
- prossimo passo.

---

# 55. Appendice — esempi dati demo

## 55.1 Settori

```text
Alimentare
Farmaceutico
Industriale
Horeca
Lavanderie
Ospedaliero
Civile
Altro
```

## 55.2 Tipologie impianto

```text
Addolcitore
Osmosi inversa
Filtrazione
MBR
Trattamento scarico
Impianto misto
Altro
```

## 55.3 Parametri

```text
COD
pH
Cloruri
Conducibilità
Durezza
Ferro
Manganese
Nitrati
Nitriti
TDS
Torbidità
Silice
Alcalinità
Cloro
```

## 55.4 Punti campionamento

```text
Ingresso impianto
Post MBR
Post pulizia
Scarico finale
Altro
```

## 55.5 Caso demo COD

Cliente:

```text
Acme Alimentare S.r.l.
```

Impianto:

```text
MBR scarico industriale
```

Rilevazioni:

| Data | Punto | Parametro | Valore | Unità |
|---|---|---:|---:|---|
| 2026-05-01 | Ingresso impianto | COD | 1000 | mg/L |
| 2026-05-01 | Post MBR | COD | 300 | mg/L |
| 2026-05-01 | Post pulizia | COD | 100 | mg/L |
| 2026-05-01 | Scarico finale | COD | 90 | mg/L |

Risultati:

```text
Riduzione ingresso -> post MBR = 70%
Riduzione ingresso -> post pulizia = 90%
```

---

# 56. Appendice — glossario

## Cliente

Azienda o soggetto presso cui sono installati uno o più impianti.

## Impianto

Sistema di trattamento acqua collegato a un cliente.

## Settore

Categoria del cliente, per esempio alimentare o farmaceutico.

## Parametro chimico

Valore misurabile, per esempio COD, pH o cloruri.

## Punto di campionamento

Punto dell’impianto dove viene misurato un parametro.

## Rilevazione

Evento in cui vengono raccolti uno o più parametri.

## Misura

Singolo valore di un parametro in una rilevazione.

## Limite

Valore minimo o massimo di riferimento per valutare conformità.

## Fuori limite

Dato che non rispetta il limite configurato.

## Rapportino tecnico

Documento prodotto dall’assistenza tecnica, nel contesto attuale generato tramite TAKE OFF da gennaio 2026.

## Autocontrollo

Report prodotto dal laboratorio dopo analisi del campione.

## Import PDF

Processo di estrazione automatica dati da un PDF.

## Human review

Controllo umano obbligatorio prima di rendere ufficiali dati estratti automaticamente.

---

# Fine PRD

Questo documento è pronto per essere salvato come:

```text
docs/PRD.md
```

e usato come base per:

```text
AGENTS.md
.cursor/rules/*
docs/RFC-001-mvp-core.md
docs/RFC-002-upload-pdf.md
docs/RFC-003-pdf-import.md
docs/TEST_PLAN.md
docs/SECURITY_REVIEW.md
docs/RUNBOOK.md
```
