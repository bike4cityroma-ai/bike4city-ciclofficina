# PROMPT MASTER PER CODEX
## Gestionale della Ciclofficina APS Bike4City ETS

Sei incaricato di aiutarmi a progettare e sviluppare un software gestionale per la ciclofficina popolare **InControPedale**, gestita dall’associazione **APS Bike4City ETS** di Roma.

Devi lavorare come assistente tecnico, architetto software e sviluppatore, procedendo per fasi verificabili. Non devi costruire tutto in una sola volta e non devi modificare o cancellare file senza prima spiegare cosa intendi fare.

---

# 1. OBIETTIVO DEL PROGETTO

Realizzare una web app responsive per gestire le attività della ciclofficina, utilizzabile da computer, tablet e smartphone.

Il software dovrà permettere di gestire:

- soci;
- volontari;
- operatori della ciclofficina;
- biciclette donate;
- biciclette affidate per riparazioni;
- biciclette recuperate e rimesse in circolazione;
- ricambi recuperati;
- ricambi nuovi acquistati dagli utenti;
- interventi di manutenzione e riparazione;
- collaudi;
- consegne;
- ricevute;
- documenti;
- fotografie;
- registri interni;
- esportazioni CSV, Excel e PDF;
- statistiche annuali;
- classificazione delle attività verso soci e non soci;
- eventuali attività diverse o fiscalmente rilevanti.

Il software dovrà essere predisposto per l’uso da parte di una APS iscritta al RUNTS.

Non deve formulare autonomamente interpretazioni fiscali o legali. Ogni trattamento fiscale dovrà essere configurabile e validato dall’associazione e dal consulente fiscale.

---

# 2. CONTESTO ASSOCIATIVO

APS Bike4City ETS svolge attività di:

- promozione della mobilità ciclistica;
- cicloturismo;
- recupero e riuso delle biciclette;
- formazione sulla ciclomeccanica;
- educazione alla sicurezza stradale;
- manutenzione e riparazione di biciclette;
- recupero di ricambi;
- attività sociali rivolte ai soci e alla cittadinanza.

La ciclofficina ha finalità principalmente sociali e associative.

Il gestionale deve distinguere chiaramente:

1. attività istituzionali;
2. attività rivolte ai soci;
3. attività rivolte ai non soci;
4. liberalità;
5. donazioni;
6. rimborsi;
7. attività diverse;
8. eventuali attività commerciali;
9. cessioni gratuite;
10. cessioni a fronte di un contributo;
11. vendita di biciclette recuperate;
12. prestazioni di riparazione.

Queste classificazioni devono essere configurabili.

---

# 3. TECNOLOGIE PREFERITE

Utilizzare preferibilmente:

- TypeScript;
- React oppure una soluzione frontend moderna semplice da mantenere;
- Firebase Authentication;
- Cloud Firestore;
- Firebase Storage;
- Firebase Hosting;
- Cloud Functions;
- Firebase App Check;
- Git;
- GitHub;
- test automatici;
- interfaccia in italiano.

Prima di scegliere framework o librerie, proponi almeno due opzioni e motivane vantaggi, limiti e costi di manutenzione.

Evita dipendenze inutili.

---

# 4. REPOSITORY GITHUB

Aiutami a creare un repository GitHub privato chiamato:

`bike4city-ciclofficina`

Prima di eseguire comandi Git o GitHub:

1. verifica se Git è installato;
2. verifica se GitHub CLI è installato;
3. verifica se esiste già una cartella Git;
4. verifica se esiste già un repository remoto;
5. non sovrascrivere repository esistenti;
6. non pubblicare segreti;
7. non inserire file `.env` nel repository.

Se GitHub CLI non è disponibile, spiegami come installarla oppure forniscimi i comandi alternativi.

Il repository deve contenere almeno:

```text
bike4city-ciclofficina/
├── AGENTS.md
├── README.md
├── LICENSE
├── .gitignore
├── .env.example
├── docs/
├── src/
├── functions/
├── public/
├── tests/
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
└── package.json
```

La licenza deve essere proposta prima di essere scelta.

Il repository deve restare privato finché non deciderò diversamente.

---

# 5. FILE AGENTS.MD

Crea un file `AGENTS.md` che stabilisca queste regole:

- leggere sempre README e documentazione prima di modificare il codice;
- descrivere il piano prima delle modifiche importanti;
- non eliminare funzioni esistenti senza autorizzazione;
- non inserire segreti nel codice;
- usare variabili d’ambiente;
- non salvare credenziali Firebase amministrative nel frontend;
- applicare regole Firestore restrittive;
- usare dati fittizi nei test;
- scrivere l’interfaccia in italiano;
- documentare ogni migrazione;
- eseguire test e controlli dopo ogni modifica;
- mantenere il codice semplice e leggibile;
- evitare modifiche massive non necessarie;
- creare commit piccoli e descrittivi;
- segnalare sempre i rischi;
- non prendere decisioni fiscali o legali al posto dell’associazione;
- rendere configurabili le classificazioni fiscali;
- non cancellare dati reali;
- prevedere backup ed esportazioni;
- rispettare il principio di minimizzazione dei dati personali.

---

# 6. RUOLI UTENTE

Prevedere almeno questi ruoli:

## Amministratore

Può:

- gestire utenti e ruoli;
- configurare il sistema;
- visualizzare tutti i registri;
- creare, modificare e annullare documenti;
- gestire ricevute;
- esportare dati;
- consultare log;
- configurare classificazioni fiscali;
- gestire backup.

## Responsabile ciclofficina

Può:

- gestire biciclette;
- gestire riparazioni;
- gestire ricambi;
- gestire collaudi;
- gestire consegne;
- visualizzare report operativi.

## Operatore

Può:

- inserire e aggiornare lavorazioni;
- registrare ricambi;
- compilare collaudi;
- aggiungere fotografie;
- completare schede tecniche.

## Volontario

Può:

- visualizzare lavorazioni assegnate;
- inserire note tecniche;
- registrare attività svolte;
- non può visualizzare dati personali non necessari.

## Tesoriere

Può:

- visualizzare movimenti economici;
- gestire ricevute;
- esportare dati contabili;
- visualizzare riepiloghi;
- non può modificare lavorazioni tecniche salvo autorizzazione.

## Sola lettura

Può soltanto consultare le sezioni autorizzate.

Le autorizzazioni devono essere applicate lato backend e nelle regole Firestore, non soltanto nascondendo pulsanti nel frontend.

---

# 7. MODULI DEL SOFTWARE

## 7.1 Anagrafica soci

Campi suggeriti:

- ID interno;
- numero tessera;
- nome;
- cognome;
- email;
- telefono;
- data iscrizione;
- scadenza tessera;
- stato;
- note;
- consenso privacy;
- data creazione;
- data modifica.

I dati devono essere minimizzati.

## 7.2 Registro biciclette donate

Campi minimi:

- ID interno;
- numero progressivo;
- data ingresso;
- provenienza;
- donatore;
- eventuale anonimizzazione;
- marca;
- modello;
- colore;
- tipologia;
- misura telaio;
- numero telaio;
- fotografia;
- condizioni iniziali;
- accessori presenti;
- destinazione prevista;
- liberatoria;
- stato lavorazione;
- ubicazione;
- note;
- operatore;
- data ultima modifica.

Possibili stati:

- ricevuta;
- da valutare;
- da riparare;
- in lavorazione;
- in attesa ricambi;
- pronta;
- destinata a donazione;
- destinata a cessione;
- destinata a vendita;
- smontata per ricambi;
- non recuperabile;
- consegnata;
- archiviata.

## 7.3 Registro riparazioni

Campi minimi:

- numero intervento;
- data accettazione;
- socio o non socio;
- proprietario;
- contatti;
- bicicletta;
- numero telaio;
- problema dichiarato;
- diagnosi;
- interventi richiesti;
- interventi autorizzati;
- interventi eseguiti;
- ricambi usati;
- ricambi portati dall’utente;
- ricambi recuperati;
- operatore;
- volontari coinvolti;
- tempo impiegato;
- data prevista consegna;
- data riconsegna;
- collaudo;
- importo;
- classificazione attività;
- documento emesso;
- note.

Possibili stati:

- accettata;
- diagnosticata;
- in attesa autorizzazione;
- in attesa ricambi;
- in lavorazione;
- pronta;
- collaudata;
- consegnata;
- annullata.

## 7.4 Registro ricambi recuperati

Campi minimi:

- codice ricambio;
- categoria;
- descrizione;
- marca;
- modello;
- compatibilità;
- provenienza;
- stato;
- ubicazione;
- quantità;
- data ingresso;
- bicicletta di provenienza;
- utilizzo;
- bicicletta di destinazione;
- riparazione collegata;
- note.

## 7.5 Scheda di accettazione

Deve poter essere generata, stampata e firmata.

Contenuti:

- dati dell’utente;
- dati della bicicletta;
- problema dichiarato;
- stato visibile della bicicletta;
- accessori consegnati;
- interventi richiesti;
- autorizzazione al trattamento dati;
- condizioni del servizio;
- firma.

## 7.6 Scheda di collaudo

Controlli suggeriti:

- serraggio ruote;
- pressione pneumatici;
- stato copertoni;
- freni;
- sterzo;
- trasmissione;
- cambio;
- pedali;
- sella;
- luci;
- campanello;
- prova su strada;
- note;
- esito;
- firma operatore;
- data.

## 7.7 Liberatoria donazione bicicletta

Deve contenere:

- dati donatore;
- descrizione bicicletta;
- numero telaio;
- dichiarazione di proprietà;
- cessione gratuita;
- autorizzazione al recupero, riuso, smontaggio o smaltimento;
- trattamento dati;
- data e firma.

## 7.8 Verbale di consegna

Deve contenere:

- soggetto ricevente;
- bicicletta consegnata;
- stato;
- eventuale contributo;
- documento collegato;
- dichiarazioni;
- data;
- firme.

## 7.9 Ricevute

Prevedere:

- numerazione progressiva annuale;
- data;
- soggetto;
- causale;
- importo;
- metodo di pagamento;
- classificazione;
- note;
- annullamento senza cancellazione;
- collegamento a intervento o bicicletta;
- esportazione PDF;
- storico modifiche.

Non decidere automaticamente se applicare IVA o altri trattamenti.

Crea una struttura configurabile con:

- tipo operazione;
- imponibile;
- aliquota;
- IVA;
- esclusione;
- esenzione;
- fuori campo;
- riferimento normativo;
- descrizione;
- validità temporale della configurazione.

---

# 8. MODELLO DATI FIRESTORE

Proponi un modello dati iniziale con collezioni simili a:

```text
users
members
bikes
bikeDonations
repairs
repairTasks
parts
partMovements
tests
deliveries
receipts
documents
settings
auditLogs
counters
```

Per ogni collezione specifica:

- finalità;
- campi;
- tipi;
- campi obbligatori;
- indici;
- relazioni;
- politiche di accesso;
- dati personali;
- dati da anonimizzare;
- strategia di archiviazione;
- strategia di cancellazione logica.

Evita strutture eccessivamente complesse.

Prevedi identificativi leggibili, ad esempio:

- `BICI-2026-0001`;
- `RIP-2026-0001`;
- `RIC-2026-0001`;
- `CON-2026-0001`;
- `DOC-2026-0001`.

La generazione dei progressivi deve essere sicura contro duplicazioni e concorrenza.

---

# 9. SICUREZZA E PRIVACY

Il progetto deve prevedere:

- autenticazione;
- autorizzazione basata sui ruoli;
- regole Firestore;
- regole Storage;
- Firebase App Check;
- log delle operazioni;
- cancellazione logica;
- tracciamento delle modifiche;
- backup;
- esportazione;
- minimizzazione dati;
- consenso privacy;
- gestione della conservazione;
- separazione tra dati tecnici e personali;
- protezione dei documenti;
- limitazione degli accessi;
- nessun segreto nel frontend;
- nessuna chiave privata nel repository.

Prima di ogni deploy, esegui un controllo di sicurezza.

---

# 10. INTERFACCIA

L’interfaccia deve essere:

- in italiano;
- semplice;
- leggibile;
- utilizzabile da volontari non tecnici;
- responsive;
- accessibile;
- adatta anche a tablet;
- con pulsanti chiari;
- con conferme per operazioni irreversibili;
- con filtri e ricerca;
- con indicatori di stato;
- con messaggi di errore comprensibili.

Schermate principali:

1. login;
2. dashboard;
3. soci;
4. biciclette;
5. donazioni;
6. riparazioni;
7. ricambi;
8. collaudi;
9. consegne;
10. ricevute;
11. documenti;
12. statistiche;
13. configurazione;
14. utenti e permessi;
15. log attività.

---

# 11. REPORT E STATISTICHE

Prevedere report su:

- biciclette ricevute;
- biciclette recuperate;
- biciclette consegnate;
- biciclette smontate;
- riparazioni eseguite;
- ore di volontariato;
- ricambi recuperati;
- ricambi riutilizzati;
- attività verso soci;
- attività verso non soci;
- introiti;
- contributi;
- donazioni;
- distribuzione per periodo;
- impatto ambientale stimato.

Le metriche ambientali devono essere indicate come stime e non come dati certi.

---

# 12. ESPORTAZIONI

Prevedere esportazioni:

- CSV;
- Excel;
- PDF;
- JSON per backup.

Le esportazioni devono rispettare i permessi.

I documenti PDF devono avere:

- intestazione Bike4City;
- numero progressivo;
- data;
- riferimenti associativi;
- campi compilati;
- spazio firme;
- eventuale logo configurabile.

---

# 13. METODO DI LAVORO OBBLIGATORIO

Procedi sempre con questo metodo:

## Fase 1 – Analisi

Prima di scrivere codice:

1. analizza questo documento;
2. riepiloga gli obiettivi;
3. individua ambiguità;
4. individua rischi;
5. proponi l’architettura;
6. proponi il modello dati;
7. proponi un piano a fasi.

Non iniziare lo sviluppo completo prima dell’approvazione del piano.

## Fase 2 – Repository

Dopo l’approvazione:

1. inizializza Git;
2. crea la struttura;
3. crea `.gitignore`;
4. crea `.env.example`;
5. crea `README.md`;
6. crea `AGENTS.md`;
7. crea la documentazione;
8. crea il repository GitHub privato;
9. collega il remote;
10. esegui il primo commit.

Prima di creare il repository GitHub, mostra:

- nome;
- descrizione;
- visibilità;
- licenza;
- file che verranno pubblicati.

## Fase 3 – Prototipo

Realizza un prototipo con:

- login;
- dashboard;
- anagrafica biciclette;
- registro riparazioni;
- dati fittizi;
- nessun dato personale reale.

## Fase 4 – Firebase

Configura:

- Authentication;
- Firestore;
- Storage;
- Hosting;
- Functions;
- emulatori locali;
- regole di sicurezza;
- indici;
- variabili d’ambiente.

## Fase 5 – Moduli

Procedi un modulo alla volta.

Per ogni modulo:

1. descrivi cosa realizzerai;
2. indica i file coinvolti;
3. implementa;
4. esegui test;
5. riepiloga;
6. crea un commit separato.

## Fase 6 – Collaudo

Prepara:

- test funzionali;
- test permessi;
- test regole Firestore;
- test generazione progressivi;
- test ricevute;
- test esportazioni;
- checklist manuale;
- dati demo.

## Fase 7 – Deploy

Prima del deploy:

1. verifica sicurezza;
2. verifica variabili;
3. verifica build;
4. verifica regole;
5. verifica backup;
6. verifica ambiente;
7. mostra i comandi;
8. chiedi conferma prima di pubblicare.

---

# 14. REGOLE PER I COMANDI

Quando proponi comandi:

- spiegali;
- fornisci un comando alla volta nelle fasi delicate;
- non usare comandi distruttivi senza avviso;
- non usare `git push --force`;
- non cancellare branch;
- non eliminare dati Firebase;
- non pubblicare segreti;
- non modificare l’ambiente di produzione senza conferma.

Se trovi un errore, fermati, spiegalo e proponi la correzione.

---

# 15. COMMIT

Utilizza commit piccoli e chiari.

Esempi:

```text
docs: add project requirements
chore: initialize Firebase project
feat: add bike donation registry
feat: add repair workflow
feat: add receipt numbering
test: add Firestore security rule tests
fix: prevent duplicate annual counters
```

Non creare un unico commit gigantesco.

---

# 16. DOCUMENTAZIONE

Crea nella cartella `docs`:

```text
docs/
├── 01-project-overview.md
├── 02-functional-requirements.md
├── 03-architecture.md
├── 04-firestore-data-model.md
├── 05-security-model.md
├── 06-user-roles.md
├── 07-operational-workflows.md
├── 08-document-models.md
├── 09-testing-plan.md
├── 10-deployment-guide.md
├── 11-backup-and-recovery.md
└── 12-open-legal-tax-questions.md
```

Nel documento sulle questioni fiscali e legali, limitati a elencare ciò che deve essere validato da un professionista.

---

# 17. PRIMA RISPOSTA RICHIESTA

Dopo aver letto questo prompt, non iniziare immediatamente a scrivere l’app.

La tua prima risposta deve contenere:

1. riepilogo del progetto;
2. proposta di architettura;
3. confronto tra almeno due opzioni frontend;
4. proposta iniziale del modello Firestore;
5. ruoli e permessi;
6. struttura del repository;
7. piano di sviluppo per fasi;
8. rischi principali;
9. domande ancora aperte;
10. elenco dei comandi necessari per inizializzare Git e GitHub, senza eseguirli ancora.

Successivamente accompagnami passo passo nella creazione della cartella locale e del repository GitHub privato.

Non procedere con deploy, pubblicazione o operazioni distruttive senza una mia conferma esplicita.
