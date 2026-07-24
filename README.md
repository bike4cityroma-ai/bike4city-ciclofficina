# Bike4City Ciclofficina

Gestionale web della ciclofficina popolare **InControPedale**, gestita da
**APS Bike4City ETS** di Roma.

## Stato del progetto

Il progetto è nella fase di analisi e inizializzazione. La struttura di base
del repository è presente, ma non esiste ancora un'applicazione eseguibile.

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
npm.cmd run dev
```

Il prototipo iniziale contiene un login esclusivamente dimostrativo e una
dashboard con dati fittizi. Non è collegato a Firebase e non deve essere usato
con dati personali reali.

Controlli disponibili:

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

## Licenza

Il progetto è attualmente privato e soggetto alla licenza provvisoria contenuta
in [`LICENSE`](LICENSE). Tutti i diritti sono riservati ad APS Bike4City ETS.

La scelta di un'eventuale licenza open source resta una decisione aperta e
richiede l'approvazione esplicita dell'associazione.
