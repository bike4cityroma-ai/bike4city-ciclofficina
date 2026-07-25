# Bike4City Ciclofficina

Gestionale web della ciclofficina popolare **InControPedale**, gestita da
**APS Bike4City ETS** di Roma.

## Stato del progetto

Il progetto dispone di un prototipo eseguibile con moduli dimostrativi,
autenticazione locale, registro biciclette persistito su Firestore Emulator e
prima Cloud Function per la registrazione con progressivo atomico.

Il software non è pronto per la produzione e deve essere sviluppato e testato
esclusivamente con dati fittizi. Non devono essere inseriti dati personali
reali finché non saranno stati approvati e verificati il modello di sicurezza,
le regole di accesso e le procedure di conservazione.

## Obiettivi

- gestire soci, utenti, ruoli e autorizzazioni;
- tracciare biciclette donate, riparazioni, ricambi, collaudi e consegne;
- produrre ricevute e documenti con progressivi sicuri;
- registrare modifiche e operazioni rilevanti tramite audit;
- consentire esportazioni, backup, ripristino e statistiche;
- mantenere configurabili e storicizzate le classificazioni amministrative e
  fiscali.

Il software non formula interpretazioni fiscali o legali. Le configurazioni
pertinenti devono essere validate dall'associazione e dai professionisti
incaricati.

## Architettura proposta

La proposta iniziale, ancora soggetta ad approvazione, prevede:

- React, TypeScript e Vite;
- Firebase Authentication;
- Cloud Firestore e Firebase Storage;
- Cloud Functions in TypeScript;
- Firebase Hosting e App Check;
- Firebase Emulator Suite per lo sviluppo locale;
- Vitest, Testing Library e test delle Firebase Security Rules.

Le autorizzazioni devono essere applicate nel backend e nelle regole Firebase,
non soltanto nell'interfaccia.

## Struttura

```text
.
├── docs/          Documentazione di analisi, sicurezza e gestione
├── functions/     Funzioni backend Firebase
├── public/        Risorse statiche pubbliche
├── src/           Applicazione frontend
└── tests/         Test automatici e dati fittizi
```

Il documento master dei requisiti è
[`PROMPT_MASTER_CODEX_CICLOFFICINA_BIKE4CITY.md`](PROMPT_MASTER_CODEX_CICLOFFICINA_BIKE4CITY.md).
Le regole operative per chi interviene sul progetto sono in
[`AGENTS.md`](AGENTS.md).

## Principi di sicurezza e privacy

- non committare file `.env`, chiavi private o account di servizio;
- non inserire credenziali Firebase amministrative nel frontend;
- usare soltanto dati fittizi durante sviluppo e test;
- minimizzare i dati personali e limitarne l'accesso;
- separare, quando utile, dati personali e dati tecnici;
- applicare cancellazione logica e audit invece di eliminare dati reali;
- verificare build, test, regole, variabili e backup prima di ogni deploy.

## Avvio dello sviluppo

Requisito: Node.js 22.12 o successivo.

```powershell
npm.cmd install
npm.cmd --prefix functions install
npm.cmd run dev
```

Il prototipo usa soltanto Firebase Emulator Suite e dati fittizi. Non deve
essere usato con dati personali reali.

Controlli disponibili:

```powershell
npm.cmd run typecheck
npm.cmd run functions:build
npm.cmd test
npm.cmd run build
```

## Firebase Emulator Suite

La configurazione locale usa esclusivamente il project ID dimostrativo
`demo-bike4city-ciclofficina` e non richiede credenziali cloud.

Su Windows il launcher usa Java 21, quando disponibile, per garantire la
compatibilità con il runtime delle Storage Security Rules senza modificare il
Java predefinito del sistema.

```powershell
npm.cmd run emulators
```

Interfaccia Emulator Suite: `http://127.0.0.1:4000`.

Con gli emulatori avviati, in un secondo terminale caricare account, ruolo e
biciclette dimostrative:

```powershell
npm.cmd run emulators:seed
```

Credenziali esclusivamente locali:

- email: `responsabile@example.test`
- password: `Demo-Ciclofficina-2026!`

L'applicazione usa Auth Emulator, legge il registro da Firestore Emulator e
registra le nuove biciclette tramite la callable `createBike`. La Function
verifica ruolo e stato attivo, valida l'input e assegna il codice
`BICI-AAAA-NNNN` con una transazione, audit e chiave d'idempotenza.

La scheda bicicletta consente inoltre le transizioni operative autorizzate
tramite la callable `updateBikeStatus`. Ogni passaggio richiede una motivazione,
incrementa la versione del record e produce storico append-only e audit.
Lo stato `Consegnata` non è selezionabile manualmente: sarà applicato dal
flusso controllato del modulo Consegne.

Il registro Riparazioni legge i record da Firestore e consente una prima
accettazione controllata tramite la callable `createRepair`. La Function
verifica account e ruolo, assegna il progressivo `RIP-AAAA-NNNN` in transazione
e registra idempotenza e audit. In questa fase devono essere usati soltanto
riferimenti dimostrativi: diagnosi e avanzamento saranno aggiunti nei passaggi
successivi del modulo.

La scheda riparazione permette ora di registrare separatamente la diagnosi
tecnica e gli interventi proposti, quindi di avanzare soltanto lungo le
transizioni operative ammesse tramite `updateRepairWorkflow`. Ogni passaggio
richiede una motivazione e produce storico append-only e audit.

Durante lo stato `In lavorazione` è possibile collegare un ricambio disponibile
tramite `useRepairPart`. L'operazione aggiorna atomicamente la giacenza, crea
un movimento di utilizzo append-only, collega il ricambio alla riparazione e
registra l'audit; il client non può modificare direttamente scorte o movimenti.

Il registro Ricambi è persistito su Firestore e consente la registrazione con
carico iniziale tramite `createPart`. La Function assegna il progressivo
`RIC-AAAA-NNNN` e crea atomicamente ricambio, movimento di carico, audit e
chiave d'idempotenza.

La scheda ricambio consente inoltre carichi successivi, resi in magazzino e
rettifiche inventariali tramite `recordPartMovement`. Le rettifiche accettano
variazioni firmate ma non possono produrre una giacenza negativa; ogni
operazione conserva movimento, motivazione e audit.

Per avviare gli emulatori, eseguire automaticamente test delle regole e test
Functions (autorizzazione, concorrenza e idempotenza), quindi arrestare tutto:

```powershell
npm.cmd run emulators:exec
```

In sviluppo `VITE_USE_FIREBASE_EMULATORS` deve rimanere `true`. Non usare dati
personali reali negli emulatori. App Check non è imposto nell'ambiente locale:
andrà configurato e abilitato prima di un eventuale rilascio.

## Licenza

Il progetto è attualmente privato e soggetto alla licenza provvisoria contenuta
in [`LICENSE`](LICENSE). Tutti i diritti sono riservati ad APS Bike4City ETS.

La scelta di un'eventuale licenza open source resta una decisione aperta e
richiede l'approvazione esplicita dell'associazione.
