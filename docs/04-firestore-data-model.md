# Modello dati Firestore

## Obiettivo

Definire un modello iniziale semplice, verificabile e adatto ai principali
flussi della ciclofficina. Il modello verrà trasformato in tipi TypeScript,
validatori, indici e regole soltanto dopo l'approvazione.

## Convenzioni comuni

I record operativi dovrebbero includere, quando applicabile:

```ts
interface RecordMetadata {
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
  archivedAt: Timestamp | null;
  archivedBy: string | null;
  version: number;
}
```

Regole generali:

- usare Timestamp e non stringhe per date operative;
- conservare gli ID correlati come stringhe;
- evitare riferimenti circolari indispensabili;
- usare cancellazione logica con `archivedAt`;
- registrare in audit le modifiche rilevanti;
- duplicare nomi o descrizioni soltanto quando serve una fotografia storica;
- non memorizzare valori `undefined`.

## Identificativi leggibili

Esempi:

- `BICI-2026-0001`;
- `RIP-2026-0001`;
- `RIC-2026-0001`;
- `CON-2026-0001`;
- `DOC-2026-0001`.

L'ID leggibile è un campo distinto dall'ID del documento Firestore. Deve essere
generato da backend tramite transazione su `counters`, applicando un vincolo
logico di unicità e un controllo idempotente.

## Collezioni

### `users`

Finalità: profilo tecnico e autorizzazioni dell'account.

Campi principali:

- `uid: string` obbligatorio;
- `displayName: string` obbligatorio e minimizzato;
- `roles: UserRole[]` obbligatorio;
- `active: boolean` obbligatorio;
- `scopeIds: string[]`;
- metadati comuni.

Implementazione locale iniziale: la creazione passa esclusivamente dalla
callable `createRepair`, che forza lo stato `Accettata`, assegna il progressivo
annuale in transazione e produce audit e chiave d'idempotenza. I campi
`customerLabel` e `bikeLabel` sono fotografie descrittive fittizie del
prototipo; prima dell'uso reale dovranno essere sostituiti dal modello
minimizzato e separato dei dati personali.

Dati personali: nome visualizzato e possibile collegamento a un socio.

Accesso: amministratore in gestione; l'utente può leggere soltanto il proprio
profilo tecnico consentito. Ruoli e stato non sono modificabili dal client.

Indici: `active + roles` soltanto se necessario alle schermate amministrative.

### `members`

Finalità: anagrafica minimizzata dei soci.

Campi principali:

- `membershipNumber: string` obbligatorio;
- `firstName: string` obbligatorio;
- `lastName: string` obbligatorio;
- `email: string | null`;
- `phone: string | null`;
- `joinedAt: Timestamp` obbligatorio;
- `expiresAt: Timestamp | null`;
- `status: "active" | "expired" | "suspended" | "archived"` obbligatorio;
- `privacyConsent: { status, recordedAt, source }`;
- `notes: string | null`;
- metadati comuni.

Dati personali: tutti i dati identificativi e di contatto.

Accesso: soltanto ruoli autorizzati; il volontario non accede alla collezione.

Indici: `membershipNumber`; `status + expiresAt`.

Archiviazione: cancellazione logica; eventuale anonimizzazione secondo una
politica di conservazione ancora da approvare.

### `bikes`

Finalità: identità tecnica e ciclo di vita della bicicletta.

Campi principali:

- `code: string` obbligatorio;
- `brand`, `model`, `color`, `type`, `frameSize: string | null`;
- `frameNumber: string | null`;
- `condition: string` obbligatorio;
- `status: BikeStatus` obbligatorio;
- `locationId: string | null`;
- `intendedDestination: string | null`;
- `photoDocumentIds: string[]`;
- `notes: string | null`;
- metadati comuni.

Dati personali: nessuno per impostazione predefinita. Il numero telaio può
diventare identificativo indiretto e va limitato ai ruoli necessari.

Indici: `code`; `status + updatedAt`; `locationId + status`.

Lo storico delle transizioni è conservato nella sottocollezione append-only
`bikes/{bikeId}/statusHistory`. Ogni evento contiene:

- `from`, `to: BikeStatus`;
- `reason: string`;
- `changedAt: Timestamp`;
- `changedBy: string`.

Il client può leggere lo storico secondo il ruolo, ma non può scriverlo. Stato
della bicicletta, evento storico e audit sono aggiornati insieme dal backend.

Le fotografie tecniche sono descritte nella sottocollezione append-only
`bikes/{bikeId}/photos`. Ogni record contiene:

- `storagePath`, `contentType`, `size`;
- `photoType`: ingresso, dettaglio tecnico, lavorazione o risultato finale;
- `description: string | null`;
- `status: "active"`;
- `createdAt`, `createdBy`.

Il file corrispondente resta privato in Storage. Il backend verifica la
coerenza tra file e metadati prima di collegare `photoId` a
`photoDocumentIds`; il client non può modificare direttamente i record.

### `bikeDonations`

Finalità: registrare ingresso, provenienza e liberatoria.

Campi principali:

- `code: string` obbligatorio;
- `bikeId: string` obbligatorio;
- `receivedAt: Timestamp` obbligatorio;
- `sourceType: string` obbligatorio;
- `donorMemberId: string | null`;
- `donorSnapshot: object | null`;
- `anonymousDonor: boolean`;
- `releaseDocumentId: string | null`;
- `receivedBy: string` obbligatorio;
- `notes: string | null`;
- metadati comuni.

Dati personali: eventuale fotografia minima dei dati del donatore nel
documento; evitare duplicazioni non necessarie.

Indici: `bikeId`; `receivedAt`; `anonymousDonor + receivedAt` se richiesto.

### `repairs`

Finalità: gestire il flusso completo della riparazione.

Campi principali:

- `code: string` obbligatorio;
- `acceptedAt: Timestamp` obbligatorio;
- `customerType: "member" | "non_member"` obbligatorio;
- `memberId: string | null`;
- `customerSnapshot: object` minimizzato;
- `bikeId: string | null`;
- `bikeSnapshot: object` obbligatorio;
- `declaredIssue: string` obbligatorio;
- `diagnosis: string | null`;
- `requestedWork`, `authorizedWork`, `completedWork: string[]`;
- `partUsages: { partId, partCode, description, quantity, movementId,
  usedAt, usedBy }[]` come correlazione tecnica denormalizzata;
- `status: RepairStatus` obbligatorio;
- `assignedUserIds: string[]`;
- `expectedDeliveryAt`, `deliveredAt: Timestamp | null`;
- `testId`, `deliveryId`, `receiptId: string | null`;
- `amount: number | null`;
- `activityClassificationId: string | null`;
- metadati comuni.

Dati personali: contatti e fotografia storica minima del cliente.

Indici: `status + acceptedAt`; `assignedUserIds array-contains + status`;
`memberId + acceptedAt`; `bikeId + acceptedAt`.

### `repairTasks`

Finalità: suddividere una riparazione in attività assegnabili.

Campi principali:

- `repairId: string` obbligatorio;
- `title: string` obbligatorio;
- `description: string | null`;
- `status: "todo" | "doing" | "blocked" | "done"` obbligatorio;
- `assignedUserIds: string[]`;
- `minutesSpent: number`;
- `completedAt: Timestamp | null`;
- metadati comuni.

Indici: `repairId + status`; `assignedUserIds array-contains + status`.

### `parts`

Finalità: catalogo e disponibilità dei ricambi.

Campi principali:

- `code: string` obbligatorio;
- `category`, `description: string` obbligatori;
- `brand`, `model`, `compatibility: string | null`;
- `originType: "recovered" | "purchased" | "user_supplied"` obbligatorio;
- `condition: string` obbligatorio;
- `locationId: string | null`;
- `quantityOnHand: number` obbligatorio e non negativo;
- `recommendedPriceCents: number | null` facoltativo, espresso in centesimi;
- `sourceBikeId: string | null`;
- metadati comuni.

Indici: `category + description`; `locationId + quantityOnHand`.

`quantityOnHand` è una proiezione aggiornata atomicamente; la fonte storica è
`partMovements`.

Nel prototipo lo scarico per una riparazione passa da `useRepairPart` ed è
consentito soltanto quando la riparazione è `In lavorazione`. La transazione
impedisce quantità negative e aggiorna insieme ricambio, riparazione, movimento,
idempotenza e audit.

La registrazione tramite `createPart` richiede quantità iniziale positiva e
genera nello stesso commit il primo movimento `in`. Il codice progressivo è
assegnato dal contatore annuale `parts-AAAA`; né il client né l'operatore
possono scegliere direttamente codice o giacenza.

Il prezzo consigliato è un'indicazione operativa facoltativa: non determina
automaticamente contributi, ricevute o classificazioni amministrative. Viene
salvato in centesimi interi per evitare errori di arrotondamento.

I movimenti successivi passano da `recordPartMovement`: `in` e `return`
incrementano la giacenza, mentre `adjustment` applica una variazione positiva o
negativa motivata. Tutte le operazioni aggiornano la proiezione
`quantityOnHand` nella stessa transazione che crea movimento, audit e
idempotenza.

### `partMovements`

Finalità: registro append-only dei movimenti di magazzino.

Campi principali:

- `partId: string` obbligatorio;
- `type: "in" | "use" | "adjustment" | "return"` obbligatorio;
- `quantity: number` obbligatorio e diverso da zero;
- `repairId`, `bikeId: string | null`;
- `reason: string` obbligatorio;
- `occurredAt: Timestamp` obbligatorio;
- `performedBy: string` obbligatorio.

Accesso: creazione tramite operazione controllata; nessuna modifica o
cancellazione ordinaria.

Indici: `partId + occurredAt`; `repairId + occurredAt`.

### `tests`

Finalità: schede di collaudo.

Campi principali:

- `code: string` obbligatorio;
- `bikeId: string` obbligatorio;
- `repairId: string | null`;
- `checks: map<string, TestCheck>` obbligatorio;
- `roadTest: TestCheck`;
- `result: "passed" | "failed" | "conditional"` obbligatorio;
- `notes: string | null`;
- `performedAt: Timestamp` obbligatorio;
- `performedBy: string` obbligatorio;
- metadati comuni.

Indici: `bikeId + performedAt`; `repairId + performedAt`.

Nel prototipo `createWorkshopTest` richiede tutti i controlli della checklist e
una nota per ogni esito non conforme o non applicabile. Il documento è
consolidato e non modificabile dal client; nella stessa transazione vengono
aggiornati riparazione, storico, progressivo, idempotenza e audit.

### `deliveries`

Finalità: registrare consegna e verbale.

Campi principali:

- `code: string` obbligatorio;
- `bikeId: string` obbligatorio;
- `repairId: string | null`;
- `recipientMemberId: string | null`;
- `recipientSnapshot: object` minimizzato;
- `deliveredAt: Timestamp` obbligatorio;
- `conditionSnapshot: string` obbligatorio;
- `contributionAmount: number | null`;
- `documentId`, `receiptId: string | null`;
- `deliveredBy: string` obbligatorio;
- metadati comuni.

Indici: `bikeId + deliveredAt`; `repairId`; `deliveredAt`.

Nel prototipo `createDelivery` verifica nella stessa transazione che la
riparazione sia `Collaudata` e che il documento `tests/{testId}` abbia esito
`Positivo`. La consegna conserva fotografie descrittive fittizie del ricevente,
condizioni e accessori; aggiorna riparazione, storico, progressivo, idempotenza
e audit senza consentire scritture dirette dal client.

### `receipts`

Finalità: ricevute consolidate e annullabili senza cancellazione.

Campi principali:

- `code: string` obbligatorio;
- `year`, `sequence: number` obbligatori;
- `issuedAt: Timestamp` obbligatorio;
- `subjectSnapshot: object` minimizzato;
- `reason: string` obbligatorio;
- `amount: number` obbligatorio;
- `paymentMethod: string` obbligatorio;
- `classificationSnapshot: object` obbligatorio;
- `repairId`, `bikeId: string | null`;
- `status: "issued" | "void"` obbligatorio;
- `voidedAt`, `voidedBy`, `voidReason` annullabili;
- `documentId: string | null`;
- metadati comuni.

Accesso: emissione e annullamento tramite backend; nessuna cancellazione.

Indici: `year + sequence`; `status + issuedAt`; `repairId`.

Nella fase corrente è ammesso anche `status: "draft_demo"`. La callable
`createReceiptDraft` assegna il progressivo atomico e genera un PDF privato
marcato `TAX-001 INCOMPLETA - NON EMETTIBILE`. Non esiste una transizione verso
`issued` finché IVA/articolo 86 e bollo non sono configurati e validati.
`voidReceiptDraft` è riservata all'amministratore e conserva progressivo,
motivazione, audit ed eventuale collegamento alla sostitutiva.

### `documents`

Finalità: metadati dei file in Storage.

Campi principali:

- `code: string | null`;
- `type: string` obbligatorio;
- `storagePath: string` obbligatorio;
- `contentType: string` obbligatorio;
- `size: number` obbligatorio;
- `checksum: string | null`;
- `relatedEntityType`, `relatedEntityId: string` obbligatori;
- `visibility: "restricted"` obbligatorio;
- metadati comuni.

Il client non deve poter scegliere liberamente percorsi o visibilità.

### `settings`

Finalità: configurazioni tecniche e classificazioni versionate.

Campi principali:

- `type: string` obbligatorio;
- `key: string` obbligatorio;
- `version: number` obbligatorio;
- `value: map` obbligatorio;
- `validFrom: Timestamp` obbligatorio;
- `validTo: Timestamp | null`;
- `status: "draft" | "active" | "retired"` obbligatorio;
- `approvedBy`, `approvalReference: string | null`;
- metadati comuni.

Indici: `type + key + status`; `type + validFrom`.

### `auditLogs`

Finalità: storico append-only delle operazioni rilevanti.

Campi principali:

- `occurredAt: Timestamp` obbligatorio;
- `actorId: string` obbligatorio;
- `action: string` obbligatorio;
- `entityType`, `entityId: string` obbligatori;
- `result: "success" | "denied" | "failed"` obbligatorio;
- `changes: map | null` privo di dati superflui;
- `correlationId: string | null`.

Accesso: scrittura soltanto da backend o flussi rigorosamente controllati;
nessuna modifica o cancellazione ordinaria.

Indici: `entityType + entityId + occurredAt`; `actorId + occurredAt`;
`action + occurredAt`.

### `counters`

Finalità: progressivi annuali.

ID suggerito: `{entityType}-{year}`, per esempio `bike-2026`.

Campi:

- `entityType: string` obbligatorio;
- `year: number` obbligatorio;
- `lastValue: number` obbligatorio;
- `updatedAt: Timestamp` obbligatorio.

Accesso: esclusivamente backend. L'incremento deve avvenire nella stessa
operazione logica che crea il record numerato o mediante richiesta idempotente.

## Relazioni principali

```text
members ----< repairs >---- bikes
                    |
                    +----< repairTasks
                    +----< partMovements >---- parts
                    +----- tests
                    +----- deliveries
                    +----- receipts

bikes ------ bikeDonations
documents -- collegamento polimorfo controllato
settings --- snapshot nelle ricevute
auditLogs -- riferimenti alle entità modificate
```

## Archiviazione e anonimizzazione

- l'archiviazione nasconde il record dai flussi ordinari senza eliminarlo;
- ricevute, movimenti e audit non sono cancellabili dagli utenti ordinari;
- l'anonimizzazione deve essere una procedura backend autorizzata;
- fotografie e documenti devono seguire la politica di conservazione della
  rispettiva entità;
- i tempi effettivi di conservazione devono essere approvati prima dell'uso.

## Questioni aperte

- campi personali realmente necessari;
- unicità e formato del numero tessera;
- trattamento del numero telaio;
- durata delle fotografie storiche di soggetti e biciclette;
- struttura definitiva delle classificazioni;
- gestione di sedi e ubicazioni multiple;
- politica di conservazione per ricevute, audit e documenti;
- necessità di snapshot completi o parziali nei documenti consolidati.
