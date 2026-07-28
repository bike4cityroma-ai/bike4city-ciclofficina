# Architettura

## Decisione proposta

Per il primo ciclo di sviluppo si propone:

- frontend SPA con React, TypeScript e Vite;
- Firebase Authentication;
- Cloud Firestore;
- Firebase Storage;
- Cloud Functions in TypeScript;
- Firebase Hosting e App Check;
- Firebase Emulator Suite;
- Vitest, Testing Library e test delle Security Rules.

La proposta deve essere approvata prima di inizializzare le dipendenze.

## Confronto delle opzioni frontend

### React con Vite

Vantaggi:

- architettura semplice per un gestionale autenticato;
- TypeScript e Firebase ben supportati;
- build rapida e distribuzione statica;
- ampia disponibilità di librerie e competenze;
- controllo esplicito sulle dipendenze.

Limiti:

- routing e convenzioni applicative vanno scelti;
- richiede disciplina nella struttura dei moduli;
- non offre funzionalità server integrate.

### Next.js

Vantaggi:

- routing e struttura applicativa integrati;
- rendering server e API disponibili;
- convenzioni utili per applicazioni più ampie.

Limiti:

- maggiore complessità operativa;
- rendering server poco utile per gran parte di un gestionale autenticato;
- sovrapposizione possibile tra API Next.js e Cloud Functions;
- costi di manutenzione superiori per il gruppo previsto.

### Vue con Vite

Vantaggi:

- componenti leggibili e curva di apprendimento favorevole;
- ottimo supporto TypeScript;
- build statica semplice.

Limiti:

- scelta dipendente dalle competenze disponibili;
- minore continuità con la preferenza React già espressa;
- comporterebbe rivalutare librerie e convenzioni.

### Raccomandazione

React con Vite è la scelta raccomandata perché il prodotto è principalmente
un'applicazione interna autenticata e non richiede rendering server. La
decisione va riesaminata solo se emergono requisiti server non coperti bene
dalle Cloud Functions.

## Componenti

```text
Browser
  |
  +-- React SPA
  |     +-- autenticazione e sessione
  |     +-- moduli operativi
  |     +-- controlli UX dei permessi
  |
  +-- Firebase Authentication
  +-- Firestore Security Rules --> Firestore
  +-- Storage Security Rules ---> Storage
  +-- App Check
  |
  +-- Callable/HTTPS Functions
        +-- ruoli privilegiati
        +-- progressivi atomici
        +-- emissione/annullamento documenti
        +-- esportazioni sensibili
        +-- audit di operazioni backend
```

I controlli nell'interfaccia migliorano l'esperienza ma non costituiscono una
barriera di sicurezza.

## Organizzazione proposta del frontend

```text
src/
├── app/             bootstrap, routing e provider
├── components/      componenti condivisi
├── features/        moduli per dominio
├── firebase/        inizializzazione client e adapter
├── hooks/           hook condivisi
├── layouts/         strutture delle schermate
├── lib/             utilità senza dipendenze dal dominio
├── pages/           pagine collegate alle rotte
├── styles/          stile globale e token
└── types/           tipi condivisi essenziali
```

Ogni modulo in `features/` dovrebbe contenere tipi, validazione, accesso dati,
componenti e test specifici, evitando un unico livello globale eccessivo.

## Confini di fiducia

### Frontend

Può:

- mostrare e validare moduli;
- richiedere operazioni autorizzate;
- nascondere azioni non disponibili;
- usare soltanto la configurazione pubblica Firebase.

Non può essere considerato affidabile per:

- assegnare ruoli;
- generare progressivi definitivi;
- consolidare ricevute;
- autorizzare esportazioni complete;
- cambiare configurazioni fiscali validate.

### Security Rules

Devono:

- negare per impostazione predefinita;
- controllare autenticazione, ruolo, stato e proprietà dei campi;
- impedire modifiche ai campi amministrativi;
- limitare accesso a fotografie e documenti;
- impedire cancellazioni non ammesse.

### Cloud Functions

Devono gestire le operazioni che richiedono privilegi, transazioni o una
sequenza atomica. Le Functions devono rieseguire i controlli di autorizzazione
senza fidarsi dei dati inviati dal client.

Il backend viene separato progressivamente per dominio, mantenendo
`functions/src/index.ts` come punto di inizializzazione e composizione delle
funzioni pubbliche. Il primo dominio estratto è:

```text
functions/src/
├── index.ts
└── modules/
    ├── bikes.ts               registrazione, progressivi e transizioni di stato
    ├── deliveries.ts          consegne, comunicazioni e mancato ritiro
    ├── members-and-users.ts   soci, dati separati, ruoli, revoche e audit
    ├── parts.ts               inventario, movimenti e utilizzo nelle riparazioni
    ├── receipts.ts            validazione, progressivi, PDF e annullamento
    ├── repairs.ts             diagnosi, autorizzazioni, lavorazione e sicurezza
    └── workshop-tests.ts      checklist, prova dinamica ed esito del collaudo
```

Il refactoring è intenzionalmente incrementale: ogni modulo viene spostato
senza cambiare il contratto delle callable e viene verificato con build,
Firebase Emulator Suite e test di integrazione prima di estrarre il dominio
successivo.

## Ambienti

Sono raccomandati almeno:

- `development`: emulatori locali e dati fittizi;
- `staging`: collaudo controllato, senza dati reali salvo approvazione;
- `production`: dati operativi e accessi strettamente controllati.

Ogni ambiente deve avere progetto Firebase, variabili e configurazioni
separati. Non si devono copiare dati reali negli ambienti non produttivi.

## Configurazione

- i valori pubblici del client provengono da variabili `VITE_*`;
- segreti e credenziali backend non devono usare prefisso `VITE_`;
- i segreti backend devono essere gestiti tramite strumenti Firebase/Google
  dedicati;
- `.env.local` e file equivalenti non devono essere committati;
- `.env.example` deve contenere soltanto nomi e descrizioni.

## Dipendenze da valutare

Dipendenze previste, da approvare al momento dell'inizializzazione:

- router per React;
- libreria di validazione degli input;
- strumenti accessibili per form e componenti;
- generazione PDF lato backend;
- esportazione tabellare.

Ogni dipendenza deve risolvere un requisito concreto ed essere verificata per
manutenzione, licenza, dimensione e compatibilità.

## Osservabilità

- errori utente comprensibili e senza dettagli sensibili;
- log tecnici strutturati lato backend;
- audit applicativo distinto dai log diagnostici;
- identificativi di correlazione per operazioni complesse;
- nessun dato personale superfluo nei log.

## Prestazioni e costi

- paginare gli elenchi;
- evitare listener in tempo reale non necessari;
- progettare query coerenti con gli indici;
- duplicare solo i campi utili alla lettura, in modo controllato;
- misurare letture, Storage e invocazioni Functions;
- applicare limiti alle dimensioni e ai tipi dei file caricati.

## Decisioni aperte

- approvazione definitiva di React e Vite;
- libreria per componenti accessibili;
- strategia di stato client;
- regione Firebase e requisiti di localizzazione dei dati;
- provider e metodo di autenticazione;
- ambienti effettivamente disponibili;
- strumenti di monitoraggio ammessi.
