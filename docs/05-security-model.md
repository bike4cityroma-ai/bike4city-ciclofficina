# Modello di sicurezza

## Obiettivo

Proteggere dati personali, registri tecnici, documenti ed elementi economici
applicando controlli coerenti in autenticazione, backend, Firestore, Storage e
interfaccia.

Questo documento definisce requisiti tecnici iniziali e non sostituisce la
valutazione privacy, legale o organizzativa dell'associazione.

## Principi

- accesso negato per impostazione predefinita;
- minimo privilegio;
- separazione dei compiti;
- controlli lato server;
- minimizzazione dei dati;
- tracciabilità delle operazioni;
- cancellazione logica;
- protezione in profondità;
- ambienti separati;
- nessun segreto nel frontend o nel repository.

## Risorse da proteggere

- dati identificativi e di contatto;
- consensi e documenti firmati;
- fotografie;
- numeri di telaio e dati tecnici collegabili a persone;
- ricevute e informazioni economiche;
- classificazioni amministrative;
- ruoli e stato degli account;
- audit, backup ed esportazioni;
- configurazioni e credenziali backend.

## Attori e minacce principali

| Minaccia | Contromisura iniziale |
|---|---|
| Utente autenticato con privilegi eccessivi | Ruoli, ambiti, revisione periodica e test negativi |
| Manipolazione delle richieste client | Security Rules e verifica nelle Functions |
| Duplicazione dei progressivi | Transazioni backend e idempotenza |
| Modifica o cancellazione di ricevute | Consolidamento, annullamento tracciato e divieto di delete |
| Esposizione di fotografie/documenti | Storage privato, percorsi controllati e regole per entità |
| Furto di credenziali | Provider sicuro, MFA per ruoli privilegiati e revoca rapida |
| Segreti nel repository | Variabili dedicate, secret manager e controlli pre-commit |
| Copia di dati reali in sviluppo | Ambienti separati e soli dati fittizi |
| Esportazione non autorizzata | Funzione backend, permesso specifico e audit |
| Perdita o corruzione dei dati | Backup, versionamento e prove di ripristino |

## Autenticazione

- consentire soltanto provider approvati;
- disabilitare o sospendere gli account non più autorizzati;
- verificare `email_verified` se l'email è usata come identità;
- valutare MFA obbligatoria per amministratori e tesoriere;
- richiedere autenticazione recente per ruoli, esportazioni e ripristini;
- non usare account condivisi;
- non memorizzare password nell'applicazione.

## Autorizzazione

Il modello usa ruoli e, dove necessario, ambiti:

- ruolo: categoria generale delle operazioni;
- ambito: risorse specifiche assegnate;
- stato account: accesso consentito soltanto se attivo;
- proprietà del record: campi che il client può o non può modificare.

La matrice di riferimento è in
[`06-user-roles.md`](06-user-roles.md).

Le custom claims possono contenere informazioni generali e di dimensione
limitata. Firestore conserva lo stato applicativo, mentre le operazioni
privilegiate verificano sempre lo stato corrente lato backend.

## Firestore Security Rules

Le regole dovranno:

- iniziare con un diniego globale;
- richiedere autenticazione per ogni dato non pubblico;
- impedire al client di modificare `roles`, `active` e campi di audit;
- verificare campi consentiti, tipi e transizioni di stato;
- vietare `delete` su record operativi consolidati;
- impedire modifiche dirette a ricevute, contatori e audit;
- limitare lettura e scrittura dei soci ai ruoli necessari;
- limitare i volontari alle lavorazioni assegnate;
- mantenere separati permessi tecnici e contabili;
- trattare le query come parte del modello di autorizzazione.

Le regole non possono filtrare documenti non autorizzati dopo la query: ogni
query del client deve rispettare i vincoli che rendono autorizzato l'intero
risultato.

## Storage Security Rules

I file devono essere organizzati in percorsi prevedibili, per esempio:

```text
bikes/{bikeId}/photos/{documentId}
repairs/{repairId}/attachments/{documentId}
documents/{documentType}/{entityId}/{documentId}
```

Le regole dovranno:

- richiedere autenticazione e permesso sull'entità collegata;
- impedire percorsi scelti arbitrariamente;
- limitare tipo MIME e dimensione;
- rifiutare file eseguibili e tipi non ammessi;
- vietare la sovrascrittura di documenti consolidati;
- evitare URL o bucket pubblici;
- coordinare eliminazione logica e conservazione.

## Cloud Functions

Sono obbligatorie o fortemente raccomandate per:

- assegnazione e revoca dei ruoli;
- generazione di progressivi;
- emissione e annullamento di ricevute;
- applicazione delle configurazioni versionate;
- esportazioni con dati personali o economici;
- anonimizzazione e procedure di conservazione;
- backup e ripristino;
- operazioni che aggiornano più record in modo atomico.

Ogni Function deve:

1. verificare autenticazione e App Check dove applicabile;
2. caricare lo stato corrente dell'utente;
3. verificare ruolo e ambito;
4. validare rigorosamente l'input;
5. eseguire l'operazione in modo atomico o idempotente;
6. scrivere l'audit;
7. restituire errori comprensibili senza dettagli sensibili.

## App Check

App Check riduce le richieste provenienti da client non autorizzati, ma non
sostituisce autenticazione o autorizzazione. Deve essere verificato prima
dell'ambiente produttivo e attivato progressivamente dopo aver controllato
metriche ed effetti sui client legittimi.

Per le prove locali contro lo staging è ammesso soltanto un debug token
registrato e revocabile. Il token deve essere fornito come variabile temporanea
della sessione o tramite il secret store CI, non deve essere salvato nei file
`.env` e non deve comparire nelle build. Gli emulatori non usano App Check e
`localhost` non deve essere aggiunto ai domini reCAPTCHA autorizzati.

## Dati personali e privacy

- raccogliere soltanto campi con finalità approvata;
- limitare note libere e ricordare di non inserirvi dati superflui;
- separare dati tecnici e dati identificativi quando utile;
- evitare dati personali nei nomi dei file e nei percorsi Storage;
- limitare snapshot personali nei record storici;
- documentare finalità, accessi e conservazione;
- predisporre procedure autorizzate di esportazione e anonimizzazione;
- non usare dati reali in sviluppo o test.

## Audit

L'audit deve registrare almeno:

- autore e istante;
- azione e risultato;
- tipo e ID della risorsa;
- motivo per annullamenti o eccezioni;
- identificativo di correlazione, se disponibile.

Non deve:

- contenere password, token o segreti;
- duplicare documenti personali completi;
- essere modificabile dagli utenti ordinari;
- essere confuso con i log diagnostici.

## Segreti e configurazione

- la configurazione pubblica Firebase del client non è una credenziale
  amministrativa, ma deve essere limitata tramite Rules e App Check;
- account di servizio e chiavi private non entrano nel frontend;
- i segreti backend devono usare servizi dedicati;
- `.env`, `.env.local` e file di account di servizio sono esclusi da Git;
- `.env.example` contiene soltanto segnaposto;
- prima di ogni commit va controllato l'elenco dei file.

## Backup e ripristino

- accesso limitato e registrato;
- backup cifrati e conservati in destinazioni approvate;
- politica di retention documentata;
- ripristino provato in ambiente isolato;
- nessuna copia di produzione usata come dataset di sviluppo;
- procedure di incidente e responsabilità definite.

## Test di sicurezza minimi

Per ogni collezione e percorso Storage:

- accesso anonimo negato;
- lettura consentita al ruolo previsto;
- lettura negata agli altri ruoli;
- creazione con campi validi consentita;
- campi amministrativi non modificabili;
- transizioni di stato illegali negate;
- cancellazione definitiva negata;
- account sospeso negato;
- volontario limitato agli elementi assegnati;
- separazione tra operatore e tesoriere verificata.

Inoltre:

- test di concorrenza sui progressivi;
- test di idempotenza delle Functions;
- test di dimensione e tipo dei file;
- test di annullamento delle ricevute;
- scansione dei file versionati per segreti;
- revisione manuale prima del deploy.

## Checklist prima del deploy

- build e test completati;
- regole testate negli emulatori;
- indici verificati;
- variabili e segreti corretti per l'ambiente;
- App Check verificato;
- account privilegiati revisionati;
- Storage non pubblico;
- backup e ripristino verificati;
- logging privo di dati superflui;
- dati demo rimossi o chiaramente separati;
- conferma esplicita alla pubblicazione.

## Decisioni aperte

- provider di autenticazione;
- obbligatorietà della MFA;
- regione Firebase;
- responsabili dell'assegnazione dei ruoli;
- tempi di conservazione per ogni categoria;
- processo di risposta agli incidenti;
- destinazione, frequenza e retention dei backup;
- limiti di dimensione e tipi ammessi per i file;
- strumenti di monitoraggio e gestione dei segreti.
