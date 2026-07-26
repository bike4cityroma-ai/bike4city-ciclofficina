# Modelli documentali

## Stato del documento

Le strutture seguenti sono bozze funzionali. Testi, dichiarazioni, riferimenti
normativi, firme e tempi di conservazione devono essere approvati
dall'associazione e, quando necessario, da professionisti incaricati.

## Regole comuni

Ogni documento dovrebbe contenere:

- tipo e titolo;
- codice progressivo, quando previsto;
- data e luogo;
- versione del modello;
- riferimenti associativi approvati;
- riferimenti alle entità gestionali collegate;
- campi compilati;
- firme o attestazioni previste;
- indicazione di eventuali allegati;
- identificativo interno del file.

Il PDF consolidato non deve essere sovrascritto. Una nuova versione deve avere
un legame esplicito con quella sostituita.

## Scheda di accettazione

Finalità: fotografare la richiesta e lo stato visibile della bicicletta.

Sezioni:

1. dati minimi dell'utente;
2. eventuale riferimento al socio;
3. dati identificativi della bicicletta;
4. problema dichiarato;
5. condizioni visibili;
6. accessori consegnati;
7. interventi richiesti;
8. modalità di autorizzazione per attività aggiuntive;
9. informativa o riferimento al trattamento dei dati;
10. condizioni del servizio validate;
11. data e firme.

Controlli:

- nessuna classificazione fiscale automatica;
- campi personali limitati;
- copia collegata alla riparazione;
- versione del testo conservata.

Implementazione dimostrativa `acceptance-demo-v1`:

- problema dichiarato, condizioni visibili e diagnosi restano campi distinti;
- gli accessori consegnati sono registrati come elenco;
- gli interventi richiesti non autorizzano attività ulteriori;
- la policy provvisoria è `separate_confirmation_required`;
- privacy e condizioni usano riferimenti di versione non approvati;
- le linee di firma sono soltanto spazi grafici;
- il PDF resta `draft` e `not_approved`.

Prima del consolidamento devono essere approvati testo privacy, condizioni del
servizio, modalità di autorizzazione successiva, soggetti firmatari e valore
della firma.

La modalità di autorizzazione successiva è stata validata come `ACC-004-v1`:
modulo firmato, firma su dispositivo o email esplicita producono lo stato
`valid_operational`. Il valore legale, l'acquisizione delle firme e la
conservazione delle evidenze restano aperti in `ACC-006`.

`ACC-005-v1` limita il soggetto autorizzante alla persona registrata
all'accettazione come proprietario o soggetto avente disponibilità oppure, per
un'organizzazione, al referente indicato dall'organizzazione. Il riferimento
viene fissato all'accettazione e non è un testo libero nell'autorizzazione.

`ACC-006-v1` limita le evidenze a modulo firmato e firma grafica su
dispositivo, escludendo l'email. L'evidenza deve essere archiviata in Storage
prima dell'avvio; il backend verifica file e metadati e registra SHA-256. La
firma grafica non raccoglie dinamiche biometriche. Durata concreta, valore
legale e destinazione finale degli originali restano aperti in `ACC-008`.

`ACC-007-v1` separa i metadati riservati dell'evidenza dalla riparazione,
limita consultazione ed esportazione ad amministratore e responsabile tramite
backend auditato e richiede i dati di custodia dell'originale cartaceo. Gli
ambienti non demo sono bloccati senza retention attiva. Durata concreta e
valore legale restano aperti in `ACC-008`.

`ACC-008-v1` applica 24 mesi dal consolidamento e registra `reviewDueAt`.
Alla scadenza è obbligatoria una decisione manuale tracciata; non avvengono
cancellazioni, restituzioni o distruzioni automatiche. L'eventuale originale
cartaceo resta `pending_manual_review`. Le evidenze hanno valore operativo,
mentre `legalValidity` resta `not_determined` e non viene dichiarata
l'equivalenza con una firma elettronica qualificata.

`ACC-009-v1` disciplina la revisione manuale: finestra operativa da 30 giorni
prima di `reviewDueAt`, proposta del responsabile e conferma riservata
all'amministratore. Proroga, restituzione, distruzione riservata e assenza di
originale sono storicizzate tramite audit. La cancellazione o anonimizzazione
del file digitale resta sospesa fino all'approvazione di `PRI-001`.

`ACC-010-v1` rende obbligatorio un allegato PDF/JPEG/PNG per confermare
restituzione o distruzione. La ricevuta riporta data e destinatario registrato;
il verbale riporta data e incaricato. Il backend verifica percorso, MIME,
dimensione e metadati, calcola SHA-256 e applica 24 mesi dalla decisione
finale. I file non sono leggibili direttamente né sovrascrivibili dal client.

`ACC-011-v1` riserva l'accesso a responsabile e amministratore tramite callable
auditata. L'export converte la prova in una copia PDF recante ID evidenza,
timestamp e UID del richiedente, senza modificare l'originale. La sostituzione
è amministrativa, motivata e append-only tramite `proofVersionHistory`.

`ACC-012-v1` verifica SHA-256 durante l'accesso. Un errore produce
`documentAnomaly`, blocca visualizzazione, esportazione e conferma e apre il
flusso `documentIncidents`. Il recupero da backup è preferito; una sostituzione
deve essere versionata e collegata all'incidente.

`ACC-013-v1` aggiunge `copyHistory` append-only per consegna cartacea, download
in sede o rifiuto. Il backend verifica il soggetto registrato, marca ristampe e
download come copia e scrive audit. Il PDF originale resta immutato, in stato
`draft` e `not_approved` fino all'approvazione di ACC-001 e ACC-002.

`ACC-014-v1` aggiunge proposta e conferma della correzione,
`correctionHistory`, `replacesDocumentId` e `supersededByDocumentId`. La nuova
versione resta `draft`, richiede nuova firma e nuova registrazione della copia.
La correzione del soggetto crea `authorizationBlock:
reauthorization_required`.

`ACC-015-v1` introduce `consolidateAcceptanceDocument`. Il file firmato è
acquisito separatamente in Storage privato, verificato e collegato con
checksum. Il documento registra versioni privacy e condizioni, firma, soggetto,
consegna copia, attore e data; diventa immutabile e mantiene
`legalValidity: not_determined`.

## Scheda di collaudo

Finalità: documentare i controlli tecnici finali.

Controlli proposti:

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
- note e limitazioni.

Ogni controllo dovrebbe supportare:

- esito `conforme`, `non conforme` o `non applicabile`;
- nota obbligatoria per non conformità o non applicabilità;
- operatore e data.

Esito complessivo: positivo, negativo o condizionato. Il significato di
“condizionato” deve essere definito e approvato prima dell'uso.

## Liberatoria di donazione

Finalità: documentare la consegna gratuita della bicicletta.

Sezioni proposte:

1. dati minimi del donatore;
2. descrizione e numero telaio;
3. dichiarazione di proprietà o disponibilità, con testo validato;
4. cessione gratuita;
5. possibili destinazioni: recupero, riuso, smontaggio o smaltimento;
6. trattamento dei dati;
7. data e firma.

Il software non deve stabilire la sufficienza legale della dichiarazione.

## Verbale di consegna

Finalità: documentare la consegna di una bicicletta.

Sezioni:

1. soggetto ricevente;
2. bicicletta e codice interno;
3. condizioni alla consegna;
4. accessori;
5. collaudo collegato;
6. eventuale contributo;
7. ricevuta o altro documento collegato;
8. dichiarazioni validate;
9. data e firme.

## Ricevuta

Campi funzionali:

- numero progressivo annuale;
- data di emissione;
- soggetto;
- causale;
- importo;
- metodo di pagamento;
- classificazione e relativa fotografia storica;
- eventuali valori fiscali configurati;
- riferimenti a riparazione o bicicletta;
- note;
- stato `emessa` o `annullata`.

L'eventuale sezione fiscale deve essere alimentata esclusivamente da
configurazioni validate e temporalmente applicabili. Il gestionale non deve
interpretare autonomamente IVA, esenzioni o esclusioni.

## Annullamento di una ricevuta

Non si modifica il PDF originale. Si conserva:

- numero originale;
- documento originale;
- data e autore dell'annullamento;
- motivazione;
- eventuale riferimento al documento sostitutivo;
- evento audit.

## Intestazione configurabile

Campi da approvare:

- denominazione completa;
- eventuale acronimo;
- sede e contatti;
- codice fiscale e altri riferimenti;
- iscrizione RUNTS, se e come indicarla;
- logo;
- eventuali diciture obbligatorie.

Le configurazioni devono essere versionate affinché un documento storico
mantenga l'intestazione valida al momento dell'emissione.

## Generazione e conservazione

- generazione preferibilmente lato backend;
- codice e metadati creati atomicamente;
- file in Storage privato;
- checksum opzionale per controllare l'integrità;
- contenuto e versione del modello registrati;
- accesso ed esportazione coerenti con i ruoli;
- conservazione definita per categoria documentale.

## Accessibilità e stampa

- formato A4 leggibile;
- contrasto adeguato;
- dimensioni dei caratteri adatte alla stampa;
- etichette non basate soltanto sul colore;
- ordine logico dei campi;
- spazio firme sufficiente;
- gestione di testi lunghi e pagine aggiuntive.

## Decisioni da validare

- testi completi e riferimenti normativi;
- documenti obbligatori per ciascun flusso;
- valore e metodo delle firme;
- soggetti autorizzati a firmare;
- intestazione associativa;
- numerazioni separate o condivise;
- conservazione dei PDF e degli originali firmati;
- trattamento delle correzioni;
- contenuto fiscale delle ricevute.
