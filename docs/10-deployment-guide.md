# Guida al deploy

## Stato

Questa è una procedura preparatoria. Non autorizza alcun deploy. I comandi
effettivi verranno definiti dopo la configurazione Firebase e mostrati prima
dell'esecuzione.

## Ambienti

| Ambiente | Dati | Finalità |
|---|---|---|
| Sviluppo | esclusivamente fittizi | sviluppo locale con emulatori |
| Staging | fittizi o formalmente autorizzati | collaudo integrato |
| Produzione | operativi | uso reale approvato |

Ogni ambiente deve avere progetto, alias, variabili e autorizzazioni separati.

## Prerequisiti

- architettura approvata;
- progetto Firebase corretto;
- accesso dell'operatore verificato;
- Node.js e strumenti bloccati a versioni supportate;
- dipendenze installate da lockfile;
- variabili disponibili senza segreti nel frontend;
- regole, indici e configurazioni revisionati;
- backup recente e ripristinabile;
- piano di rollback;
- conferma esplicita dell'associazione.

## Controlli preliminari

1. Verificare branch, commit e working tree.
2. Verificare che non siano presenti `.env`, chiavi o account di servizio.
3. Confermare progetto e alias Firebase di destinazione.
4. Verificare variabili e segreti backend.
5. Eseguire lint, typecheck, test e build.
6. Eseguire test delle Security Rules negli emulatori.
7. Revisionare gli indici.
8. Verificare App Check.
9. Verificare ruoli privilegiati.
10. Produrre o confermare il backup.
11. Mostrare piano e comandi.
12. Ottenere conferma esplicita.

## Ordine di pubblicazione proposto

L'ordine effettivo dipenderà dalla compatibilità delle modifiche:

1. modifiche compatibili a indici e backend;
2. Security Rules coordinate;
3. Cloud Functions;
4. frontend e Hosting;
5. verifica post-deploy.

Per modifiche incompatibili serve una migrazione documentata con fasi di
compatibilità temporanea.

## Migrazioni

Ogni migrazione deve indicare:

- motivazione;
- record interessati;
- trasformazione;
- prerequisiti;
- script o funzione usata;
- modalità di prova con dati fittizi;
- backup;
- strategia di ripresa e rollback;
- controlli finali;
- responsabile e data.

Le migrazioni non devono eliminare dati reali. Correzioni e dismissioni devono
preferire campi versionati, archiviazione o cancellazione logica.

## Verifica post-deploy

- versione pubblicata corretta;
- login e logout;
- autorizzazioni di almeno un ruolo privilegiato e uno limitato;
- lettura e scrittura di un record dimostrativo autorizzato;
- operazione vietata effettivamente negata;
- Functions senza errori anomali;
- Storage privato;
- App Check operativo;
- log privi di dati sensibili;
- metriche e costi iniziali nella norma.

Non usare dati personali reali come test di fumo se non strettamente previsto e
approvato.

## Rollback

Il piano deve distinguere:

- frontend: ripristino di una versione precedente;
- Functions: ripubblicazione della versione compatibile;
- Rules: ripristino soltanto se non riduce la sicurezza;
- dati: ripristino controllato, mai automatico senza analisi;
- migrazioni: procedura specifica documentata.

Una regressione di sicurezza richiede limitazione immediata dell'accesso; non
si deve ripristinare una regola permissiva solo per mantenere una funzione.

## Incidenti

In caso di incidente:

1. limitare l'accesso senza distruggere evidenze;
2. registrare orari, versioni e sintomi;
3. informare i responsabili designati;
4. valutare dati e utenti interessati;
5. applicare la correzione verificata;
6. documentare recupero e azioni preventive;
7. demandare gli obblighi legali ai soggetti competenti.

## Registro del deploy

Conservare:

- ambiente;
- data e responsabile;
- commit o versione;
- componenti pubblicati;
- esito dei controlli;
- backup di riferimento;
- conferma ricevuta;
- anomalie e azioni successive.

## Decisioni aperte

- progetti Firebase e relativi proprietari;
- regione e servizi abilitati;
- strategia di versionamento;
- chi può approvare e chi può eseguire un deploy;
- finestra di manutenzione;
- strumenti di monitoraggio;
- tempi di rollback e risposta agli incidenti.
