# Preparazione dello staging

## Stato

- Preparazione locale: completata per il primo deploy staging
- Progetto Firebase staging: `bike4city-ciclofficina`
- Deploy applicativo staging: completato il 29 luglio 2026
- Componenti pubblicati: Firestore Rules, Storage Rules, Cloud Functions e
  Firebase Hosting
- Dati ammessi: esclusivamente fittizi

Questo documento non autorizza la pubblicazione. Prima di ogni comando Firebase
che modifica risorse cloud serve una conferma esplicita separata.

## Decisioni richieste all'associazione

- proprietari e amministratori del progetto Firebase;
- project ID e nome riconoscibile dello staging;
- regione, attualmente prevista `europe-west1`;
- account autorizzati al deploy;
- account fittizi per ogni ruolo;
- obbligatorietà MFA per amministratore e tesoriere;
- responsabili di backup, rollback e gestione incidenti;
- durata e budget del periodo di staging.

## Configurazione locale

1. Creare il progetto Firebase di staging senza dati reali.
2. Registrare una Web App Firebase.
3. Copiare `.env.staging.example` in `.env.staging.local`.
4. Inserire soltanto la configurazione pubblica della Web App.
5. Registrare il dominio staging in Authentication e App Check.
6. Non salvare account di servizio, chiavi private o segreti nel frontend.

Il file `.env.staging.local` è escluso da Git. La configurazione deve avere:

- project ID diverso da `demo-*`;
- emulatori disattivati;
- dominio Authentication e bucket coerenti con il progetto;
- chiave sito App Check presente.

Il comando locale:

```powershell
npm.cmd run staging:check
```

fallisce in modo intenzionale finché la configurazione staging non è completa.
La build dedicata sarà:

```powershell
npm.cmd run build:staging
```

Questi comandi non eseguono deploy.

## Componenti da configurare nel progetto

- Authentication con provider approvati;
- Firestore e relativi indici;
- Storage privato;
- Cloud Functions in `europe-west1`;
- Hosting con fallback SPA verso `index.html`;
- App Check per la Web App;
- MFA per i ruoli privilegiati;
- budget, alert costi, log e monitoraggio;
- backup e procedura di ripristino isolata.

## Bloccanti tecnici prima del deploy

- verificare proprietà, regione e servizi del progetto
  `bike4city-ciclofficina`;
- compilare `.env.staging.local`;
- verificare i token App Check nello staging prima dell'enforcement;
- sostituire `enforceAppCheck: false` nelle callable con una configurazione
  approvata per lo staging e ripetere i test;
- predisporre account fittizi per tutti i ruoli, incluso amministratore;
- completare la prova offline di Utenti con l'account amministratore;
- rieseguire in una sola sessione build, test frontend, Rules e Functions;
- eseguire backup e ripristino con dati fittizi;
- definire rollback e verifica post-deploy;
- ottenere conferma esplicita dell'associazione.

## Controlli immediatamente precedenti alla pubblicazione

- working tree pulito e commit identificato;
- branch e progetto di destinazione mostrati esplicitamente;
- assenza di `.env`, chiavi private e account di servizio nei file tracciati;
- `npm.cmd ci` completato dal lockfile;
- `npm.cmd run staging:check` superato;
- `npm.cmd run build:staging` superato;
- suite Rules e Functions superate;
- regole e indici riesaminati;
- App Check e MFA configurati;
- backup di riferimento disponibile;
- piano di rollback scritto;
- conferma esplicita al deploy registrata.

## Verifiche dopo il futuro deploy

- versione e commit corretti;
- login e logout;
- ruolo amministratore e ruolo limitato;
- scrittura autorizzata di un record fittizio;
- operazione non autorizzata effettivamente negata;
- Storage non pubblico;
- App Check accettato e richieste prive di token respinte;
- Functions senza errori anomali;
- log privi di dati sensibili;
- rollback simulato senza dati reali.

La produzione rimane separata e bloccata fino alle revisioni legale, fiscale,
privacy e organizzativa.

## Associazione locale del 29 luglio 2026

Il progetto indicato dall'associazione è `bike4city-ciclofficina`, con nome
visualizzato **Bike4city-Ciclofficina**. È stato registrato nell'alias Firebase
locale `staging`. L'alias `default` resta
`demo-bike4city-ciclofficina`, così i comandi locali non selezionano
accidentalmente il progetto cloud.

I parametri pubblici della Web App e la chiave sito App Check sono stati
salvati esclusivamente nel file locale `.env.staging.local`, escluso da Git.
Nessun deploy è stato eseguito.

## Verifica in console del 29 luglio 2026

La console Firebase è stata verificata in sola lettura:

- nome progetto: **Bike4city-Ciclofficina**;
- project ID: `bike4city-ciclofficina`;
- numero progetto: `167027102568`;
- tipo di ambiente: `Non specificato`;
- Web App registrata: **Bike4city Ciclofficina Staging**;
- App ID: `1:167027102568:web:0bdc9942e4eec677e1fcdd`;
- collegamento a Firebase Hosting: non attivato;
- stream Google Analytics: non creato.

La Web App è stata registrata dopo conferma esplicita dell'associazione.
Sono stati recuperati soltanto i parametri pubblici della configurazione web;
non sono state create o scaricate chiavi private o credenziali amministrative.

## App Check del 29 luglio 2026

- API reCAPTCHA Enterprise abilitata;
- chiave web **Bike4city Ciclofficina Staging** creata;
- verifica dominio mantenuta attiva;
- domini autorizzati: `bike4city-ciclofficina.web.app` e
  `bike4city-ciclofficina.firebaseapp.com`;
- Web App registrata in App Check con reCAPTCHA Enterprise;
- TTL token: un'ora;
- fatturazione non attivata;
- enforcement delle API non attivato durante la fase di monitoraggio.

Prima di imporre App Check sulle API dovranno essere verificati i token nello
staging e predisposto il debug provider per sviluppo locale e CI.

## Debug provider per sviluppo e CI

Il client abilita il debug provider soltanto quando tutte queste condizioni
sono vere:

- Vite è in modalità sviluppo;
- gli emulatori sono disattivati;
- `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN` è presente nella sessione.

Il token non può essere conservato in `.env.staging.local`. Il controllo
ordinario e la build staging lo rifiutano anche se ereditato dalla sessione.
Per una prova locale controllata:

```powershell
$env:VITE_FIREBASE_APPCHECK_DEBUG_TOKEN="<TOKEN_REGISTRATO>"
npm.cmd run dev:staging
Remove-Item Env:VITE_FIREBASE_APPCHECK_DEBUG_TOKEN
```

In CI deve essere usato un token separato, registrato con un'etichetta
riconoscibile e fornito dal secret store. Un token compromesso deve essere
revocato immediatamente dalla console Firebase.

Il 29 luglio 2026 è stato registrato il token
**Staging locale Livio 2026-07-29**. Il valore non è stato scritto su disco né
nel repository. Il percorso di configurazione e i blocchi contro emulatori e
build sono coperti da test automatici. Lo scambio effettivo del token dovrà
essere ricontrollato durante la prima sessione di collaudo integrato dello
staging, prima dell'enforcement.

## Firestore, Authentication e Functions del 29 luglio 2026

- Authentication email/password abilitata; gli altri provider restano
  disabilitati;
- Firestore Standard creato in `europe-west1` in modalità di produzione;
- regole Firestore pubblicate dopo 27 test Security Rules superati;
- amministratore fittizio configurato con profilo attivo e custom claims;
- primo accesso integrato dell'amministratore completato;
- 29 Cloud Functions v2 Node.js 22 pubblicate in `europe-west1`;
- piano Blaze attivato dall'associazione per Cloud Build e Functions;
- immagini di build in Artifact Registry eliminate automaticamente dopo
  sette giorni;
- App Check resta in monitoraggio con `enforceAppCheck: false`;
- bucket Storage predefinito
  `bike4city-ciclofficina.firebasestorage.app` creato in `europe-west1`,
  in modalità di produzione e inizialmente vuoto;
- prevenzione dell'accesso pubblico imposta esplicitamente su `enforced`;
- regole Storage applicative compilate e pubblicate dopo 27 test Security
  Rules complessivi Firestore + Storage superati;
- collaudo Storage cloud completato con un file esclusivamente fittizio:
  caricamento anonimo negato (`403`) e caricamento amministratore consentito
  (`200`);
- il file fittizio di collaudo è stato eliminato amministrativamente al
  termine della prova e il bucket è tornato vuoto.

Il client cloud usa il long polling Firestore forzato per tollerare proxy che
interrompono WebChannel. Il registro utenti esegue inoltre una lettura server
esplicita: il primo snapshot locale non viene più scambiato per un errore di
connessione, mentre un fallimento reale continua a mostrare l'avviso.

Il collaudo di `manageUserAccess` ha usato un secondo account esclusivamente
fittizio. Sono stati verificati attivazione, ruolo `volunteer`, sincronizzazione
di Authentication, custom claims e Firestore, audit e revoca. Lo stato finale
dell'account è disabilitato, senza ruoli, e il tentativo di accesso restituisce
`USER_DISABLED`. Nessuna password, token o UID è riportato nella
documentazione.

## Primo deploy Firebase Hosting del 29 luglio 2026

- commit applicativo pubblicato: `9f69fac`;
- destinazione: progetto staging `bike4city-ciclofficina`;
- URL: `https://bike4city-ciclofficina.web.app`;
- pubblicato esclusivamente il contenuto di `dist` tramite Firebase Hosting;
- controllo staging, TypeScript e build Vite completati;
- 32 test frontend superati;
- build TypeScript delle Cloud Functions completata senza nuovo deploy;
- pacchetto verificato senza riferimenti a emulatori, localhost, progetto demo
  o debug token App Check;
- pagina di accesso e fallback SPA verificati online;
- login e logout dell'amministratore fittizio verificati senza creare o
  modificare record;
- nessun errore rilevato nella console del browser durante il collaudo.

App Check resta in monitoraggio e non è ancora imposto sulle API. Lo staging
rimane quindi limitato a dati e account esclusivamente fittizi; questo deploy
non costituisce autorizzazione alla produzione o all'inserimento di dati
personali reali.

## Collaudo online dei ruoli del 29 luglio 2026

Un unico account fittizio è stato attivato in sequenza come responsabile
ciclofficina, operatore, volontario, tesoriere e sola lettura. Per ogni ruolo
sono stati verificati:

- lettura del proprio profilo;
- accesso consentito o negato, secondo matrice, a soci, biciclette, ricevute,
  documenti e audit.

Tutti i 30 controlli di lettura hanno restituito lo stato HTTP previsto. Al
termine di ogni passaggio il ruolo è stato revocato; lo stato finale
dell'account è disabilitato, senza ruoli, e il login è nuovamente rifiutato.

Il collaudo manuale dell'interfaccia ha rilevato che un volontario vedeva anche
moduli non autorizzati. Le Security Rules negavano correttamente i dati, ma il
menu esponeva sezioni e azioni inutilizzabili. La navigazione è stata quindi
allineata alla matrice Firestore:

- volontario: dashboard, biciclette, ricambi e collaudi;
- utenti e ruoli: soltanto amministratore;
- soci, ricevute e documenti: visibili esclusivamente ai ruoli che dispongono
  della relativa lettura.

La correzione è coperta da quattro test specifici; typecheck, 36 test frontend
e build staging sono stati completati. Il pacchetto è stato pubblicato su
Hosting dopo conferma esplicita. Il collaudo online senza cache ha mostrato al
volontario esclusivamente dashboard, biciclette, ricambi e collaudi; al
termine l'account fittizio è stato nuovamente revocato.

Il primo caricamento dopo il deploy ha inoltre evidenziato che la configurazione
predefinita di Hosting conservava `index.html` in cache fino a un'ora. Un
browser già aperto poteva quindi mostrare temporaneamente la versione
precedente. `firebase.json` richiede ora la rivalidazione tramite
`Cache-Control: no-cache, max-age=0, must-revalidate`. La configurazione è
stata pubblicata con un deploy del solo Hosting e verificata sulla pagina
principale, sul bundle JavaScript e sul fallback SPA: tutte le risposte hanno
restituito stato `200` e gli header previsti.

## Deploy fotografie biciclette del 29 luglio 2026

Il commit `84e67a8` è stato pubblicato nello staging in questo ordine:

1. Cloud Functions, con creazione di `registerBikePhoto` in `europe-west1`;
2. Firestore Rules per `bikes/{bikeId}/photos`;
3. Storage Rules con metadati obbligatori e divieto di sovrascrittura;
4. Firebase Hosting.

Il bucket consente `GET` e `HEAD` via CORS esclusivamente dai domini
`bike4city-ciclofficina.web.app` e
`bike4city-ciclofficina.firebaseapp.com`. Le richieste continuano a richiedere
autenticazione e ruolo tramite Storage Rules; non sono stati introdotti URL
pubblici.

Il collaudo online ha usato una bicicletta, una PNG 1×1 e descrizioni
esclusivamente fittizie. Sono stati verificati:

- caricamento tramite SDK Firebase con metadati obbligatori;
- verifica e collegamento tramite `registerBikePhoto`;
- comparsa di metadati e anteprima nella galleria;
- lettura consentita al volontario;
- assenza del comando di caricamento per il volontario;
- revoca finale dell'account temporaneo.

Al termine sono stati eliminati amministrativamente e in modo puntuale il file,
la bicicletta, i metadati fotografici, due chiavi idempotenti, due audit di
collaudo e il contatore esclusivamente fittizio. Lo staging è tornato senza
biciclette o fotografie di prova.

## Aggiornamento Firebase Functions del 29 luglio 2026

`firebase-functions` è stato aggiornato dalla versione `7.2.2` alla `7.3.2`
con il commit `e704cb6`. Il ciclo di regressione ha compreso:

- build TypeScript delle Cloud Functions;
- 40 test frontend;
- build staging;
- suite completa tramite Firebase Emulator Suite.

Tutte le verifiche sono state superate. Le 30 Cloud Functions Node.js 22 di
seconda generazione sono state quindi aggiornate in `europe-west1`; durante il
deploy il precedente warning sulla versione obsoleta non è ricomparso.

`firebase-admin` resta fissato alla versione `13.10.0`: l'aggiornamento
maggiore alla versione 14 non è necessario per questo intervento e, nel
controllo effettuato, introduceva nuove segnalazioni alte nelle dipendenze
transitive. L'audit corrente non riporta vulnerabilità alte o critiche.

## Enforcement App Check del 29 luglio 2026

L'enforcement di base è stato attivato tramite l'API ufficiale App Check, un
servizio alla volta:

- Cloud Firestore: `ENFORCED`;
- Cloud Storage for Firebase: `ENFORCED`;
- Firebase Authentication: `OFF`, in attesa di un ciclo dedicato con prova
  completa di logout e nuovo login;
- replay protection: `OFF`.

Dopo la propagazione, il client locale di staging con debug provider
registrato è stato ricaricato: sessione attiva, lettura Firestore disponibile
e nessun errore o warning App Check nella console. Il debug token resta
esclusivamente nella sessione locale e non è stato scritto nei file o nel
repository.

Le 30 callable Node.js sono configurate con `enforceAppCheck` attivo nel cloud
e disattivo esclusivamente quando `FUNCTIONS_EMULATOR=true`. Build Functions,
40 test frontend, build staging e regressione completa con Firebase Emulator
Suite sono state superate. La configurazione è stata pubblicata con il commit
`43fead1` e il successivo deploy esplicitamente autorizzato delle 30 Functions.

Il primo tentativo di deploy si è fermato durante la discovery locale al limite
predefinito di 10 secondi, senza aggiornare le Functions. Il secondo tentativo
ha usato temporaneamente `FUNCTIONS_DISCOVERY_TIMEOUT=30`, come previsto dalla
documentazione Firebase, ed è terminato correttamente per tutte le Functions.
La variabile non è stata salvata nel progetto.

Uno smoke test dal client di staging ha invocato `createBike` con App Check
valido. La callable ha risposto e ha creato una bicicletta esclusivamente
fittizia; al termine sono stati rimossi amministrativamente e in modo puntuale
la bicicletta, il relativo audit, la chiave d'idempotenza e il contatore
generati dalla prova. La verifica finale ha rilevato zero biciclette, sessione
attiva e nessun errore o warning nella console del browser.
