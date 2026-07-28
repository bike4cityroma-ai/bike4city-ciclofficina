# Backup e ripristino

## Obiettivo

Definire una strategia verificabile per recuperare dati e documenti dopo
errore, corruzione o incidente. Frequenza, conservazione e responsabilità
devono essere approvate prima dell'uso in produzione.

## Ambito

Il backup deve considerare separatamente:

- documenti Firestore;
- file Firebase Storage;
- configurazioni versionate;
- indici e Security Rules conservati nel repository;
- codice e lockfile;
- configurazione delle Functions;
- metadati necessari a verificare coerenza e versione.

I segreti non devono essere esportati insieme ai normali dati applicativi.

## Obiettivi da definire

- **RPO**: quantità massima di dati che si accetta di perdere;
- **RTO**: tempo massimo desiderato per ripristinare il servizio;
- retention: durata e numero delle copie;
- responsabilità: chi avvia, verifica e autorizza il ripristino.

Questi valori sono decisioni organizzative aperte.

## Strategia proposta

- esportazioni automatiche periodiche di Firestore;
- copia o versionamento controllato degli oggetti Storage;
- destinazione separata dal progetto operativo;
- cifratura e accesso limitato;
- manifesti con data, ambiente, versione e conteggi;
- monitoraggio degli esiti;
- prove periodiche di ripristino;
- copie coerenti con la politica di conservazione.

## Classificazione delle copie

| Copia | Finalità | Vincolo |
|---|---|---|
| Operativa | recupero rapido | accesso strettamente limitato |
| Periodica | errori scoperti in ritardo | retention approvata |
| Pre-migrazione | protezione prima di cambi dati | legata alla migrazione |
| Esportazione utente | portabilità autorizzata | minimizzata e tracciata |

Un'esportazione CSV non è un backup completo: può perdere relazioni, tipi,
metadati e file.

## Manifesto

Ogni backup dovrebbe avere:

- identificativo;
- ambiente e progetto sorgente;
- data di inizio e fine;
- versione applicativa;
- collezioni comprese;
- conteggi per collezione;
- riferimenti ai file Storage;
- esito;
- eventuali errori;
- checksum quando applicabile;
- politica di scadenza.

## Sicurezza

- accesso tramite ruoli tecnici dedicati;
- nessun download locale non necessario;
- audit di creazione, consultazione e ripristino;
- cifratura in transito e a riposo;
- separazione tra chi richiede e chi approva il ripristino, se possibile;
- divieto di usare backup reali come dati di sviluppo;
- cancellazione delle copie scadute tramite procedura approvata.

## Procedura di ripristino

1. Identificare incidente e obiettivo del ripristino.
2. Limitare scritture concorrenti, se necessario.
3. Ottenere autorizzazione esplicita.
4. Selezionare una copia e verificarne integrità e completezza.
5. Provare il ripristino in ambiente isolato.
6. Verificare conteggi, relazioni, documenti e progressivi.
7. Pianificare l'eventuale passaggio in produzione.
8. Eseguire il ripristino controllato.
9. Verificare applicazione, permessi e audit.
10. Documentare esito, perdita effettiva e azioni correttive.

Il ripristino in produzione è un'operazione distruttiva o sovrascrivente e
richiede sempre conferma esplicita.

## Prova automatizzata in ambiente isolato

La funzione tecnica `restoreJsonBackupToEmulator` non è esportata come Cloud
Function e applica tre blocchi: richiede `FIRESTORE_EMULATOR_HOST`, accetta
soltanto un progetto destinazione con prefisso `demo-` e rifiuta una
destinazione che contenga già uno dei documenti da ripristinare. Prima della
scrittura verifica schema, checksum, percorsi e duplicati; dopo la scrittura
ricontrolla conteggi e presenza di ogni documento.

Questa prova non autorizza né implementa un ripristino in staging o produzione.

## Verifiche dopo il ripristino

- utenti e ruoli coerenti;
- record archiviati ancora archiviati;
- ricevute e audit integri;
- progressivi non arretrati o duplicabili;
- riferimenti tra entità validi;
- file Storage presenti e protetti;
- configurazioni temporali corrette;
- indici e Rules compatibili;
- nessun accesso pubblico introdotto.

## Frequenza delle prove

La frequenza deve dipendere da RPO, RTO e volume dei dati. Come principio, una
copia non può essere considerata affidabile finché non è stata ripristinata e
verificata in un ambiente isolato.

## Errori e copie parziali

- una copia fallita non sostituisce l'ultima copia valida;
- gli errori devono generare una segnalazione;
- le copie parziali vanno marcate come non ripristinabili;
- il sistema deve evitare cancellazioni automatiche dell'ultima copia valida;
- ogni eccezione alla retention deve essere documentata.

## Decisioni aperte

- RPO e RTO;
- frequenza dei backup;
- destinazione e regione;
- retention;
- responsabili e autorizzazioni;
- budget;
- versionamento Storage;
- procedura di cancellazione delle copie;
- frequenza delle prove di ripristino;
- gestione delle copie durante richieste di anonimizzazione.
