# Relazione sullo sviluppo del prototipo

## Scopo del documento

Questa relazione descrive lo stato verificato del gestionale Bike4City
Ciclofficina al 25 luglio 2026. Il software è un prototipo locale: usa
esclusivamente Firebase Emulator Suite e dati fittizi e non è autorizzato alla
gestione di dati personali reali o all'uso in produzione.

## Obiettivo raggiunto

È stato realizzato un percorso operativo integrato che consente di:

1. autenticare un responsabile dimostrativo;
2. registrare e consultare biciclette;
3. avanzare lo stato tecnico delle biciclette con storico;
4. accettare una riparazione e assegnare `RIP-AAAA-NNNN`;
5. registrare diagnosi, interventi proposti, assegnazione e lavorazione;
6. registrare interventi eseguiti e tempo impiegato;
7. registrare, caricare e rettificare ricambi;
8. scaricare atomicamente un ricambio su una riparazione;
9. compilare e consolidare un collaudo;
10. riportare in lavorazione una riparazione con collaudo negativo;
11. registrare la consegna dopo un collaudo positivo.

## Architettura realizzata

- frontend React, TypeScript e Vite;
- Firebase Authentication Emulator;
- Cloud Firestore Emulator;
- Cloud Functions Emulator in TypeScript;
- Storage Emulator predisposto;
- Security Rules Firestore e Storage;
- Vitest, Testing Library e Firebase Rules Unit Testing;
- seed locale con account, ruoli e dati esclusivamente fittizi.

Le operazioni che modificano progressivi, stati, giacenze o documenti
consolidati passano da callable Functions. Il frontend non può aggiornare
direttamente contatori, movimenti di magazzino, collaudi, consegne o audit.

## Moduli realizzati

### Soci, utenti e ruoli

Il registro soci separa i dati associativi (`members`) dai dati identificativi
e di contatto (`memberPrivateProfiles`). Il progressivo `SOC-AAAA-NNNN` è
assegnato in transazione; sospensione e archiviazione sono stati applicativi,
mai cancellazioni fisiche. Ogni modifica richiede una motivazione e produce
audit.

Gli amministratori possono aggiornare ruoli, revocare o riattivare un account
tramite backend. L'operazione sincronizza Authentication, custom claims e
Firestore. Le Rules vietano modifiche dirette a soci, profili privati e
autorizzazioni.

Il modello resta limitato a dati fittizi. Prima di dati reali l'associazione
deve approvare finalità, campi necessari, tempi di conservazione, processo di
revisione degli accessi e ammissibilità dei ruoli multipli.

### Documenti operativi

La prima infrastruttura documentale genera PDF A4 lato backend per
accettazione, collaudo e consegna. Il backend assegna progressivi annuali
separati, crea metadati in `documents`, salva il file in Storage privato e
registra audit e idempotenza.

Poiché testi, intestazione e firme non sono ancora validati, ogni PDF riporta
in modo permanente `BOZZA DIMOSTRATIVA — TESTI NON APPROVATI`, ha stato
`draft`, versione `demo-v1` e validità `not_approved`. Le linee di firma sono
solo spazi grafici e non rappresentano firme elettroniche. Il client può
leggere i file autorizzati ma non crearli, sovrascriverli o cancellarli.

La liberatoria di donazione sarà collegata soltanto dopo l'introduzione del
record strutturato `bikeDonations`; non vengono creati documenti orfani o
basati su dati personali improvvisati.

La decisione `ACC-003-v1`, validata dall'associazione il 26 luglio 2026,
stabilisce che la richiesta iniziale non autorizza i lavori. Diagnosi e
interventi proposti portano la pratica in attesa; una Function separata
registra autorizzazione, modalità ed evidenza prima di consentire lavorazione
o attesa ricambi. Il controllo è applicato nel backend e coperto da test
negativi.

La successiva decisione `ACC-004-v1` limita le modalità valide operativamente
a modulo firmato, firma su dispositivo ed email esplicita. Telefono e
conferme generiche sono rifiutati dal backend; il record conserva il
riferimento all'evidenza e dichiara esplicitamente che il valore legale non è
determinato dal software.

`ACC-005-v1` fissa inoltre il soggetto autorizzante all'accettazione. Per
persone fisiche coincide con il proprietario o soggetto avente disponibilità
registrato; per associazioni, enti o aziende coincide con il referente
indicato insieme al nome dell'organizzazione. Il backend non accetta un
soggetto libero nella fase successiva e blocca le pratiche storiche prive
della fotografia richiesta.

`ACC-006-v1` introduce l'evidenza obbligatoria in Storage ed esclude l'email.
Il client può creare una sola volta moduli PDF/JPEG/PNG o firme grafiche PNG
nel percorso vincolato a riparazione e utente. Il backend verifica esistenza,
percorso, MIME, dimensione e metadati, calcola SHA-256 e conserva il
collegamento nell'autorizzazione. Sovrascrittura e cancellazione client sono
vietate; la firma su dispositivo non raccoglie dinamiche biometriche.

`ACC-007-v1` sposta percorso, checksum, note e custodia in
`authorizationEvidence`, leggibile soltanto da amministratore e responsabile.
Storage non consente lettura diretta: visualizzazione ed esportazione passano
da `accessAuthorizationEvidence` e generano audit. In un progetto non demo
`authorizeRepairWork` rifiuta il consolidamento se manca una retention attiva.

`ACC-008-v1` configura 24 mesi dal consolidamento, registra la scadenza e
richiede revisione manuale senza eliminazioni automatiche. Il valore legale
resta `not_determined`: le evidenze sono trattate come operative e non come
firme elettroniche qualificate.

`ACC-009-v1` aggiunge `reviewAuthorizationEvidence`: responsabile e
amministratore propongono l'esito nei 30 giorni precedenti la scadenza, mentre
la conferma è riservata all'amministratore. Il flusso è idempotente, auditato e
non cancella il file digitale.

`ACC-010-v1` aggiunge la prova documentale privata per restituzione e
distruzione: Storage impedisce lettura diretta e sovrascrittura, mentre il
backend verifica l'allegato, calcola SHA-256 e applica una nuova scadenza di 24
mesi. Il test integrato verifica anche la separazione tra proponente e
amministratore confermante.

`ACC-011-v1` introduce accesso auditato, export PDF marcato e sostituzione
amministrativa versionata delle prove. `proofVersionHistory` conserva le
versioni precedenti e le scritture dirette del client restano vietate.

`ACC-012-v1` aggiunge verifica del checksum in lettura e il registro
`documentIncidents`, con separazione tra segnalazione operativa e gestione
amministrativa. Le anomalie bloccano il flusso senza eliminare i file.

`ACC-013-v1` sostituisce il download Storage dei PDF con accesso backend
auditato e introduce `recordAcceptanceCopy` con storico append-only. Le copie
sono marcate, mentre le bozze restano non consolidabili.

`ACC-014-v1` introduce `correctAcceptanceDocument`, storico append-only e
collegamenti tra versioni. La correzione del soggetto invalida operativamente
l'autorizzazione precedente e blocca l'avanzamento fino alla nuova conferma.

`ACC-015-v1` completa il percorso tecnico dell'accettazione con consolidamento
backend, firma privata, checksum e immutabilità. I test coprono il blocco
ordinario e il percorso `consolidated_demo` con policy fittizie attive.

### Autenticazione e ruoli

L'accesso demo usa Firebase Auth Emulator. La Function verifica sia il token
sia il profilo `users/{uid}`, lo stato attivo e i ruoli autorizzati. Il
responsabile può operare sui moduli tecnici; le consegne sono riservate ad
amministratore e responsabile ciclofficina.

### Biciclette

Il registro è persistito su Firestore. La creazione usa `createBike`, assegna
`BICI-AAAA-NNNN` e genera audit e idempotenza. `updateBikeStatus` applica
transizioni controllate e crea uno storico append-only.

### Riparazioni

`createRepair` genera `RIP-AAAA-NNNN`. Diagnosi e accettazione sono separate:
il problema dichiarato non viene confuso con la diagnosi tecnica. Il flusso
controlla le transizioni, assegna l'operatore all'ingresso in lavorazione e
richiede interventi e tempo prima dello stato `Pronta`.

### Ricambi e magazzino

`createPart` genera `RIC-AAAA-NNNN` e il primo movimento di carico.
`recordPartMovement` gestisce carichi, resi e rettifiche motivate.
`useRepairPart` collega atomicamente ricambio, riparazione e movimento,
impedendo giacenze negative. La correlazione conserva ID tecnici, codici
leggibili, quantità e ID del movimento.

### Collaudi

`createWorkshopTest` genera `COL-AAAA-NNNN`. La checklist richiede una nota per
ogni controllo non conforme o non applicabile. Almeno una non conformità
produce esito negativo e riporta la riparazione in lavorazione; in assenza di
non conformità la riparazione passa a `Collaudata`.

L'esito `Condizionato` è visibile soltanto nei dati dimostrativi storici e non
è generabile finché il significato organizzativo non sarà approvato.

### Consegne

`createDelivery` accetta soltanto una riparazione `Collaudata` collegata a un
collaudo positivo. Genera `CON-AAAA-NNNN` e il riferimento
`VER-AAAA-NNNN`, registra condizioni, accessori e ricevente fittizio e porta
la riparazione a `Consegnata`.

`VER-AAAA-NNNN` è un riferimento applicativo: non è ancora un PDF firmato.
Un contributo eventuale resta `Da classificare` e non genera ricevute.

## Integrità, sicurezza e audit

- progressivi annuali assegnati in transazione;
- chiavi d'idempotenza per evitare duplicazioni;
- stati applicati dal backend;
- giacenze aggiornate insieme ai movimenti;
- movimenti e storici append-only;
- nessuna cancellazione ordinaria dei documenti consolidati;
- ruoli verificati nel backend e nelle regole;
- dati di test identificabili e ripuliti dal seed;
- nessun segreto o account amministrativo nel frontend.

## Verifica integrata

Comandi eseguiti con esito positivo:

```powershell
npm.cmd run emulators:seed
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:rules
npm.cmd --prefix functions run test:emulator
npm.cmd run build
```

Risultati:

- 18 test interfaccia superati;
- 15 test Security Rules superati;
- 19 test Functions superati;
- typecheck superato;
- build superata.

Rimane un avviso non bloccante: il bundle JavaScript principale supera 500 kB
minificati. Prima della produzione sarà opportuno introdurre code splitting.

## Limiti e attività residue

Il prototipo non è pronto per la produzione. Restano almeno:

- approvazione del modello privacy dell'anagrafica soci;
- approvazione organizzativa di ruoli multipli e revisione periodica accessi;
- autorizzazioni e classificazioni amministrative validate;
- ricevute, annullamenti e progressivi contabili;
- approvazione dei testi PDF, valore delle firme e tempi di conservazione;
- fotografie e documenti Storage con flussi completi;
- collegamento strutturato delle biciclette esterne;
- esportazioni, backup e ripristino provati;
- App Check, MFA e configurazione degli ambienti reali;
- accessibilità e collaudo manuale completi;
- ottimizzazione del bundle;
- revisione legale, fiscale, privacy e organizzativa;
- deploy, che richiede una conferma esplicita separata.

## Conclusione

Il percorso tecnico principale della ciclofficina è funzionante in ambiente
locale e coperto da test automatici. La base è adatta a ulteriori collaudi,
alla definizione dei processi amministrativi e alla preparazione controllata
di un ambiente di staging, ma non all'inserimento di dati reali.
