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

Documenti di sintesi:

- [`docs/13-development-report.md`](docs/13-development-report.md): relazione
  sul lavoro svolto, architettura, verifiche e limiti;
- [`docs/14-user-manual.md`](docs/14-user-manual.md): manuale operativo del
  prototipo.

Bozze da completare e validare:

- [`docs/15-acceptance-privacy-notice-draft.md`](docs/15-acceptance-privacy-notice-draft.md);
- [`docs/16-acceptance-service-conditions-draft.md`](docs/16-acceptance-service-conditions-draft.md).

Profilo istituzionale:

- [`docs/17-association-profile.md`](docs/17-association-profile.md):
  profilo istituzionale versionato.

Scheda per le validazioni amministrative:

- [`docs/18-leg-tax-validation-form.md`](docs/18-leg-tax-validation-form.md):
  raccolta strutturata delle informazioni per `LEG-001` e `TAX-001`.

Modello economico in attesa di validazione:

- [`docs/19-receipt-template-draft.md`](docs/19-receipt-template-draft.md):
  bozza configurabile della ricevuta, non attiva fino a `TAX-001`.

## Principi di sicurezza e privacy

- non committare file `.env`, chiavi private o account di servizio;
- non inserire credenziali Firebase amministrative nel frontend;
- usare soltanto dati fittizi durante sviluppo e test;
- minimizzare i dati personali e limitarne l'accesso;
- separare, quando utile, dati personali e dati tecnici;
- applicare cancellazione logica e audit invece di eliminare dati reali;
- verificare build, test, regole, variabili e backup prima di ogni deploy.

## Preparazione staging

Lo staging deve usare un progetto Firebase separato e soltanto dati fittizi.
La checklist è in `docs/21-staging-readiness.md`.

Per verificare la configurazione senza eseguire deploy:

```powershell
Copy-Item .env.staging.example .env.staging.local
npm.cmd run staging:check
npm.cmd run build:staging
```

Il file `.env.staging.local` è escluso da Git. Il controllo fallisce
intenzionalmente se il progetto è demo, gli emulatori sono attivi o manca la
configurazione App Check.

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

Il modulo Collaudi seleziona riparazioni `Pronta` e consolida una checklist
tecnica tramite `createWorkshopTest`. Un esito positivo porta la riparazione a
`Collaudata`; la presenza di almeno una non conformità produce esito negativo
e ritorno a `In lavorazione`. Collaudo, transizione, storico e audit sono
registrati atomicamente.

Il modulo Consegne seleziona soltanto riparazioni `Collaudata` con collaudo
positivo. `createDelivery` genera `CON-AAAA-NNNN` e il riferimento verbale
`VER-AAAA-NNNN`, consolida condizioni, accessori e ricevente fittizio, quindi
porta la riparazione a `Consegnata` con storico, audit e idempotenza.

Il modulo Soci mantiene tessera, scadenza, stato e consenso in `members` e
separa nomi e contatti in `memberPrivateProfiles`. Creazione, aggiornamento,
sospensione e archiviazione logica passano da `saveMember`, con progressivo
`SOC-AAAA-NNNN`, idempotenza e audit. I dati dimostrativi usano esclusivamente
nomi e recapiti fittizi.

La gestione Utenti e ruoli è disponibile agli amministratori. La callable
`manageUserAccess` sincronizza stato e ruoli tra Authentication, custom claims
e `users`, disabilita gli account revocati e registra ogni variazione
nell'audit. Le scritture dirette del client sono vietate.

Il modulo Documenti genera lato backend PDF A4 per scheda di accettazione,
scheda di collaudo e verbale di consegna. In questa fase ogni file è marcato
`BOZZA DIMOSTRATIVA — TESTI NON APPROVATI`, usa semplici spazi grafici per le
firme ed è salvato in Storage privato senza possibilità di sovrascrittura dal
client. Metadati, versione del modello, collegamento e audit sono conservati in
Firestore. La liberatoria di donazione resta predisposta a livello di modello
ma non viene generata finché manca il flusso strutturato `bikeDonations`.

Il backend documentale usa `FIREBASE_STORAGE_BUCKET`; un esempio non sensibile
è disponibile in `functions/.env.example`.

La scheda di accettazione `acceptance-demo-v1` separa problema dichiarato,
condizioni visibili, accessori consegnati e interventi richiesti. La policy
provvisoria impone una conferma separata per qualsiasi lavoro aggiuntivo:
l'accettazione non produce autorizzazioni implicite. Testi privacy, condizioni
del servizio e firme restano bozze da approvare.

La decisione associativa `ACC-003-v1`, validata il 26 luglio 2026, impone inoltre
la sequenza richiesta, diagnosi, autorizzazione tracciata e lavorazione.
`authorizeRepairWork` registra modalità, soggetto, evidenza e interventi
autorizzati; il backend rifiuta il salto diretto alla lavorazione e gli
interventi non presenti nella diagnosi.

`ACC-004-v1`, validata il 26 luglio 2026, riconosce come valide
operativamente soltanto modulo firmato, firma su dispositivo ed email
esplicita. Il backend rifiuta telefono e modalità generiche, richiede un
riferimento all'evidenza e registra `valid_operational`. Valore legale,
acquisizione della firma e conservazione delle evidenze restano aperti in
`ACC-006`.

`ACC-005-v1`, validata il 26 luglio 2026, fissa il soggetto autorizzante
all'accettazione: persona registrata come proprietario o soggetto avente
disponibilità oppure referente indicato da un'organizzazione. Il soggetto non
è più un campo libero nell'autorizzazione. Deleghe e consegnatari diversi non
sono previsti dalla policy approvata.

`ACC-006-v1` elimina l'email dalle evidenze ammesse. L'autorizzazione richiede
un modulo firmato PDF/JPEG/PNG oppure una firma grafica PNG acquisita sul
dispositivo. Storage limita tipo e dimensione a 10 MB; il backend verifica
file e metadati, calcola SHA-256 e sblocca la lavorazione soltanto dopo
l'archiviazione. Non vengono raccolte dinamiche biometriche della firma.

`ACC-007-v1` separa i metadati riservati dalla riparazione tecnica. Dopo il
consolidamento l'operatore non legge l'evidenza; amministratore e responsabile
accedono tramite backend con audit. Gli originali cartacei richiedono
ubicazione codificata, custode e data. Gli ambienti non demo restano bloccati
senza una retention attiva.

`ACC-008-v1` fissa una conservazione di 24 mesi dal consolidamento
dell'autorizzazione. Alla scadenza l'evidenza richiede una revisione manuale:
non sono previste cancellazioni, restituzioni o distruzioni automatiche. La
firma grafica e il modulo acquisito restano evidenze operative e il software
mantiene `legalValidity: not_determined`, senza equipararli a una firma
elettronica qualificata.

`ACC-009-v1` apre la revisione 30 giorni prima della scadenza. Il responsabile
può proporre proroga, restituzione, distruzione riservata o assenza
dell'originale; soltanto l'amministratore conferma l'esito. Proposta e conferma
sono auditate e idempotenti. Il file digitale non viene cancellato o
anonimizzato in attesa della policy generale `PRI-001`.

`ACC-010-v1` richiede una ricevuta firmata per la restituzione o un verbale per
la distruzione riservata. Il documento deve precedere la conferma, resta
privato e non sovrascrivibile, conserva checksum SHA-256 e segue una nuova
retention di 24 mesi. Destinatario e incaricato sono strutturati; chi propone
la distruzione non può confermarla come amministratore.

`ACC-011-v1` limita visualizzazione ed esportazione delle prove ad
amministratore e responsabile tramite backend auditato. L'esportazione produce
una copia PDF marcata con evidenza, data e utente. La sostituzione è riservata
all'amministratore, richiede motivazione e conserva la versione precedente
nello storico; Storage continua a vietare lettura diretta e sovrascrittura.

`ACC-012-v1` blocca l'accesso quando file, metadati o checksum non risultano
coerenti e registra `documentAnomaly`. Responsabile e amministratore possono
segnalare; apertura e chiusura dell'incidente sono amministrative. Recupero,
sostituzione o mancato recupero restano auditati senza cancellare lo storico e
senza qualificazioni automatiche come violazione privacy.

`ACC-013-v1` registra consegna o rifiuto della copia della scheda di
accettazione. Sono ammesse copia cartacea e download sul dispositivo
dell'interessato in sede; ristampe e download passano dal backend, producono
audit e una copia PDF marcata. Storage non consente più lettura diretta dei PDF
operativi. Il consolidamento resta bloccato fino ad ACC-001 e ACC-002.

`ACC-014-v1` versiona le correzioni della scheda di accettazione: l'operatore
propone, responsabile o amministratore confermano, la versione precedente
diventa `superseded` senza essere cancellata. La nuova bozza richiede nuova
firma e nuova consegna della copia. La correzione del soggetto imposta un
blocco di riautorizzazione prima di ulteriori lavorazioni.

`ACC-015-v1` consolida la scheda soltanto lato backend e solo per responsabile
o amministratore. Sono obbligatori policy privacy e condizioni attive,
evidenza di firma privata, soggetto coerente, copia registrata e assenza di
anomalie o correzioni pendenti. Il PDF conserva checksum e diventa immutabile;
con configurazioni fittizie assume `consolidated_demo`. Il seed ordinario
mantiene ACC-001 e ACC-002 in bozza e quindi blocca il consolidamento.

`ACC-016-v1` disciplina le biciclette non ritirate: prima comunicazione,
promemoria dopo 15 giorni, preavviso finale al trentesimo giorno e revisione
amministrativa dopo 45 giorni complessivi. Contatti e passaggi sono auditati;
non avvengono trasferimenti di proprietà, disposizioni del bene o addebiti
automatici. La consegna chiude lo stato di attesa del ritiro.

`ACC-017-v1` introduce il blocco `In verifica sicurezza` per batterie
danneggiate, perdite, componenti instabili e altri rischi. La segnalazione
conserva stato precedente, misure protettive e ubicazione; soltanto
responsabile o amministratore possono chiuderla. Il software non classifica
automaticamente rifiuti e non dispone smaltimenti.

`ACC-018-v1` rende la prova dinamica facoltativa e tracciata. È ammessa solo in
area controllata, dopo controlli preliminari conformi, con operatore
autorizzato, casco e alta visibilità. Strada pubblica e geolocalizzazione
restano bloccate; un'anomalia produce collaudo negativo e ritorno in
lavorazione.

`ACC-019-v1` mantiene minimale la gestione dei problemi durante la prova:
interruzione, annotazione tecnica, collaudo negativo e ritorno in lavorazione.
Non introduce un archivio incidenti e non raccoglie dati sanitari o
valutazioni di responsabilità.

`ACC-020-v1` mantiene separati flusso tecnico e trattamento economico. Ricambi
e quantità non diventano automaticamente vendite; i contributi alla consegna
restano `Da classificare`. Ricevute e classificazioni fiscali attendono le
validazioni `LEG-001` e `TAX-001`.

Il modulo Ricevute usa un'unica serie annuale `REC-AAAA-NNNN` e le quattro
classificazioni operative approvate. Finché diciture IVA/articolo 86 e bollo
non sono validate, `createReceiptDraft` genera esclusivamente PDF privati
`draft_demo`, marcati come non emettibili. L'annullamento non cancella il
record ed è riservato all'amministratore.

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
