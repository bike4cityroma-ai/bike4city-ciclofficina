# Preparazione dello staging

## Stato

- Preparazione locale: avviata
- Progetto Firebase staging: `bike4city-ciclofficina`
- Deploy: non autorizzato
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
