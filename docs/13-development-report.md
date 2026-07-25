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

- anagrafica soci con modello privacy approvato;
- gestione completa di utenti, ruoli e revoche;
- autorizzazioni e classificazioni amministrative validate;
- ricevute, annullamenti e progressivi contabili;
- generazione PDF, firme e conservazione dei verbali;
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
