# Questioni legali e fiscali aperte

## Scopo

Questo documento elenca le decisioni da sottoporre all'associazione e ai
professionisti competenti. Non propone interpretazioni legali, fiscali o
contabili.

Per ogni risposta dovranno essere conservati:

- quesito;
- soggetto che ha fornito la validazione;
- data;
- documento o riferimento;
- periodo di validità;
- configurazioni applicative interessate;
- data della successiva revisione.

## Inquadramento delle attività

Validare:

- criteri per attività istituzionali;
- attività rivolte a soci e non soci;
- liberalità e donazioni;
- rimborsi;
- attività diverse;
- eventuali attività commerciali;
- cessioni gratuite;
- cessioni con contributo;
- vendita di biciclette recuperate;
- prestazioni di riparazione.

Il software dovrà registrare la classificazione approvata senza dedurla
autonomamente dal tipo di utente o dall'importo.

### Raccolta operativa LEG-001.1 — Riparazioni

Informazione fornita dall'associazione:

- attività svolta verso soci e non soci;
- importo variabile determinato caso per caso;
- importo comunicato dopo la diagnosi e prima dell'autorizzazione ai lavori;
- conferma esplicita dell'importo nella stessa autorizzazione tracciata;
- rilascio della ricevuta al momento del pagamento/consegna;
- stesso tipo di ricevuta attualmente usato per soci e non soci.
- modalità di pagamento attualmente accettate: contanti e PayPal.
- numerazione delle ricevute con progressivo annuale e ripartenza da 1.
- unica serie `REC-AAAA-NNNN` condivisa dalle quattro classificazioni;
- progressivi annullati non riutilizzabili;
- ricevuta errata annullata senza cancellazione;
- eventuale ricevuta sostitutiva con nuovo progressivo e collegamento
  all'originale;
- motivo, data e operatore dell'annullamento conservati nell'audit.
- emissione consentita ad amministratore, tesoriere e responsabile della
  ciclofficina;
- emissione consentita all'operatore soltanto contestualmente alla consegna;
- annullamento riservato all'amministratore.
- dati del pagante minimizzati: nome/cognome o organizzazione e tipologia;
- numero tessera obbligatorio soltanto per `QUOTA_ASSOCIATIVA`;
- codice fiscale facoltativo;
- indirizzo ed email esclusi dalla ricevuta.
- copia consegnabile su carta o tramite download sul dispositivo in sede;
- consegna o rifiuto della copia registrati;
- nessun invio automatico via email.
- firma o attestazione dell'emittente prevista;
- firma del pagante facoltativa e non bloccante, salvo futura prescrizione
  validata.
- dicitura IVA/articolo 86 lasciata da confermare;
- dicitura e gestione dell'imposta di bollo lasciate da confermare;
- emissione definitiva bloccata finché entrambe non sono validate.
- articolo 86 del D.Lgs. 117/2017 indicato dall'associazione come possibile
  regime agevolato di riferimento;
- applicazione effettiva, requisiti, soglia di ricavi e comunicazione
  dell'opzione da mantenere verificati;
- associazione dichiara che l'opzione prevista dall'articolo 86 è stata
  formalmente esercitata;
- decorrenza ed evidenza documentale devono ancora essere registrate prima
  dell'attivazione della configurazione software.
- la decorrenza non viene richiesta nei flussi operativi quotidiani e resta
  un metadato amministrativo da verificare prima della produzione.

Questa registrazione descrive la prassi effettiva ma non stabilisce ancora la
classificazione legale o fiscale, il tipo di ricevuta, il trattamento IVA o le
diciture applicabili. Tali elementi restano da validare in `LEG-001` e
`TAX-001`.

### Raccolta operativa LEG-001.2 — Biciclette recuperate

Informazione fornita dall'associazione:

- consegna rivolta a soci e non soci;
- importo variabile;
- importo comunicato prima della consegna e confermato esplicitamente dal
  ricevente;
- stesso modello grafico di ricevuta utilizzato per le riparazioni;
- descrizione dell'operazione distinta da quella della riparazione.

La classificazione dell'operazione e la dicitura fiscale non vengono dedotte
automaticamente e restano da validare in `LEG-001` e `TAX-001`.

### Raccolta operativa LEG-001.3 — Ricambi

Informazione fornita dall'associazione:

- nessuna cessione separata di ricambi;
- ricambi registrabili esclusivamente come componenti tecnici collegati a una
  riparazione;
- nessuna ricevuta autonoma o classificazione come vendita di ricambi.

### Raccolta operativa LEG-001.4 — Donazioni e liberalità

Informazione fornita dall'associazione:

- donazioni in denaro ricevute da soci e non soci;
- importo libero;
- modalità ammesse: contanti e PayPal;
- stesso modello grafico delle altre ricevute;
- descrizione specifica `Erogazione liberale`;
- classificazione e dicitura fiscale dedicate ancora da validare in
  `TAX-001`.

### Raccolta operativa LEG-001.5 — Quote associative

Informazione fornita dall'associazione:

- quota associativa annuale riservata ai soci;
- importo fisso di 10 euro;
- pagamento tramite contanti o PayPal;
- ricevuta con importo e descrizione `Quota associativa anno [AAAA]`;
- operazione separata da riparazioni, consegne ed erogazioni liberali;
- classificazione e dicitura fiscale da validare in `TAX-001`.

### Raccolta operativa LEG-001.6 — Rimborsi spese

Informazione fornita dall'associazione:

- nessun rimborso spese effettuato allo stato attuale;
- flusso escluso dalla prima versione del gestionale;
- eventuale introduzione futura subordinata a una procedura approvata e
  separata.

### Chiusura della raccolta operativa LEG-001

L'associazione dichiara che non esistono ulteriori attività economiche o
tipologie di ricevuta oltre a:

- riparazioni;
- consegna di biciclette recuperate;
- erogazioni liberali;
- quote associative.

Sono escluse la cessione separata di ricambi e, allo stato attuale, i rimborsi
spese. La raccolta della prassi è completa; classificazioni giuridiche e
trattamenti fiscali restano soggetti alla validazione professionale.

Classificazioni operative approvate dall'associazione:

- `RIPARAZIONE`;
- `BICI_RECUPERATA`;
- `EROGAZIONE_LIBERALE`;
- `QUOTA_ASSOCIATIVA`.

I codici sono stabili; descrizioni, validità e configurazioni fiscali saranno
versionate.

## Ricevute e documenti economici

Chiarire:

- quando emettere una ricevuta;
- numerazioni necessarie e loro separazione;
- contenuti obbligatori;
- soggetti autorizzati all'emissione;
- modalità di correzione e annullamento;
- eventuali riferimenti normativi;
- trattamento di imponibile, aliquota e IVA;
- casi di esclusione, esenzione o fuori campo;
- metodi di pagamento da registrare;
- conservazione e disponibilità dei documenti.

## Configurazioni temporali

Definire:

- chi approva una classificazione;
- data di inizio e fine validità;
- possibilità o divieto di applicazione retroattiva;
- comportamento quando manca una configurazione valida;
- gestione delle modifiche normative;
- evidenze da allegare alla configurazione;
- processo di revisione periodica.

## Soci, non soci e volontari

Validare:

- dati minimi necessari per identificare un socio;
- prova dello stato associativo alla data dell'operazione;
- trattamento di attività verso non soci;
- registrazione delle ore di volontariato;
- eventuali documenti o autorizzazioni per volontari;
- separazione tra ruolo associativo e account applicativo.

## Donazione, recupero e consegna delle biciclette

Chiarire:

- contenuto della dichiarazione del donatore;
- gestione della provenienza e del numero telaio;
- autorizzazione a recupero, riuso, smontaggio o smaltimento;
- gestione di donazioni anonime;
- condizioni per cessione gratuita o con contributo;
- documenti e dichiarazioni per la consegna;
- gestione dei beni non ritirati;
- eventuali obblighi relativi a beni non recuperabili.

## Riparazioni e collaudi

Validare:

- condizioni del servizio;
- modalità di autorizzazione degli interventi;
- gestione di preventivi e lavori aggiuntivi;
- responsabilità e qualifica di chi effettua il collaudo;
- contenuto della scheda di collaudo;
- utilizzo della prova su strada;
- dichiarazioni alla consegna;
- gestione di garanzie, contestazioni o limitazioni.

## Privacy e protezione dei dati

Sottoporre a valutazione:

- titolare del trattamento e responsabilità interne;
- finalità e basi giuridiche;
- informativa e gestione dei consensi;
- dati obbligatori e facoltativi;
- accessi per ruolo;
- fotografie e documenti firmati;
- tempi di conservazione;
- anonimizzazione e cancellazione;
- esercizio dei diritti degli interessati;
- esportazioni e backup;
- fornitori e trasferimenti di dati;
- gestione degli incidenti;
- necessità di ulteriori valutazioni o registri.

## Firme e documenti digitali

Chiarire:

- quali documenti richiedono firma;
- tipo di firma sufficiente;
- validità della firma acquisita su carta o dispositivo;
- conservazione dell'originale;
- gestione delle versioni;
- accesso e produzione di copie;
- valore del PDF generato dal sistema.

## Conservazione e audit

Validare:

- durata di ricevute e documenti;
- durata delle anagrafiche;
- durata di fotografie e dati tecnici;
- durata degli audit;
- eventi che non possono essere cancellati;
- rapporto tra anonimizzazione e obblighi di conservazione;
- responsabilità per backup e ripristino.

## Statistiche e impatto ambientale

Definire:

- metriche autorizzate;
- formule per stime ambientali;
- fonti e aggiornamento dei coefficienti;
- diciture che distinguono stime e dati misurati;
- livello di aggregazione necessario per evitare identificazione.

## Licenza e proprietà del software

Decidere:

- titolarità del codice e della documentazione;
- contributi di volontari o fornitori;
- licenza definitiva;
- eventuale pubblicazione open source;
- licenze compatibili delle dipendenze;
- uso di logo, fotografie e materiali dell'associazione.

## Registro delle decisioni

| ID | Questione | Responsabile validazione | Stato | Validità |
|---|---|---|---|---|
| LEG-001 | Classificazione delle attività | Da definire | Aperta | — |
| TAX-001 | Regole delle ricevute | Da definire | Aperta | — |
| PRI-001 | Dati e tempi di conservazione | Da definire | Aperta | — |
| DOC-001 | Testi e firme dei documenti | Da definire | Aperta | — |
| ACC-001 | Testo privacy della scheda di accettazione | Da definire | Aperta | — |
| ACC-002 | Condizioni del servizio e beni non ritirati | Da definire | Aperta | — |
| ACC-003 | Modalità di autorizzazione dei lavori aggiuntivi | APS Bike4City ETS | Validata | Dal 26/07/2026 |
| ACC-004 | Modalità valide operativamente per autorizzare i lavori | APS Bike4City ETS | Validata | Dal 26/07/2026 |
| ACC-005 | Soggetti autorizzanti ammessi | APS Bike4City ETS | Validata | Dal 26/07/2026 |
| ACC-006 | Acquisizione tecnica delle evidenze, senza email | APS Bike4City ETS | Validata | Dal 26/07/2026 |
| ACC-007 | Accessi, custodia originali e blocco senza retention | APS Bike4City ETS | Validata | Dal 26/07/2026 |
| ACC-008 | Durata concreta e valore legale delle evidenze | APS Bike4City ETS | Validata | Dal 26/07/2026 |
| ACC-009 | Procedura manuale di revisione delle evidenze | APS Bike4City ETS | Validata | Dal 26/07/2026 |
| ACC-010 | Prova di restituzione o distruzione dell'originale | APS Bike4City ETS | Validata | Dal 26/07/2026 |
| ACC-011 | Accesso e versionamento delle prove di revisione | APS Bike4City ETS | Validata | Dal 26/07/2026 |
| ACC-012 | Gestione delle anomalie documentali | APS Bike4City ETS | Validata | Dal 26/07/2026 |
| ACC-013 | Consegna della copia della scheda di accettazione | APS Bike4City ETS | Validata | Dal 26/07/2026 |
| ACC-014 | Correzione e versionamento della scheda di accettazione | APS Bike4City ETS | Validata | Dal 26/07/2026 |
| ACC-015 | Consolidamento definitivo della scheda di accettazione | APS Bike4City ETS | Validata | Dal 26/07/2026 |
| ACC-016 | Procedura per biciclette non ritirate | APS Bike4City ETS | Validata | Dal 26/07/2026 |
| ACC-017 | Componenti pericolosi o non recuperabili | APS Bike4City ETS | Validata | Dal 26/07/2026 |
| ACC-018 | Prova dinamica e prova su strada | APS Bike4City ETS | Validata | Dal 26/07/2026 |
| ACC-019 | Gestione minimale dei problemi durante la prova | APS Bike4City ETS | Validata | Dal 26/07/2026 |
| ACC-020 | Costi, contributi e ricambi senza classificazione automatica | APS Bike4City ETS | Validata | Dal 26/07/2026 |
| LIC-001 | Licenza definitiva | APS Bike4City ETS | Aperta | — |

Lo stato può diventare “validata” soltanto quando esiste un riferimento
documentato. Le risposte devono poi essere tradotte in configurazioni o
requisiti senza ampliare autonomamente la decisione ricevuta.

Per `ACC-001` e `ACC-002` sono state predisposte rispettivamente le bozze
`docs/15-acceptance-privacy-notice-draft.md` e
`docs/16-acceptance-service-conditions-draft.md`. Restano aperte perché
contengono dati associativi, durate e procedure da completare e non
costituiscono ancora un riferimento approvato.

### Decisione ACC-003

Validazione fornita dall'associazione il 26 luglio 2026 durante lo sviluppo:

> La scheda di accettazione registra la richiesta. Dopo la diagnosi tecnica è
> necessaria un'autorizzazione separata e tracciata prima della lavorazione.

Applicazione tecnica `ACC-003-v1`:

- `Accettata` passa a `In attesa autorizzazione` soltanto con diagnosi e
  interventi proposti;
- il backend impedisce l'avvio diretto della lavorazione;
- l'autorizzazione registra interventi, modalità, soggetto, evidenza, data,
  autore applicativo e audit;
- possono essere autorizzati soltanto interventi già proposti;
- nuovi interventi richiedono una nuova conferma;
- l'eventuale valore probatorio delle diverse modalità resta oggetto di
  `ACC-006`.

### Decisione ACC-004

Validazione fornita dall'associazione il 26 luglio 2026:

> Sono valide operativamente: modulo firmato, firma su dispositivo oppure
> email esplicita.

Nota storica: `ACC-006-v1`, approvata successivamente nella stessa data,
esclude l'email. La configurazione applicativa corrente ammette quindi soltanto
modulo firmato e firma su dispositivo.

Applicazione tecnica `ACC-004-v1`:

- soltanto queste tre modalità possono sbloccare la lavorazione;
- telefono, conferma generica di persona, silenzio o mancata risposta non sono
  modalità valide;
- deve essere registrato un riferimento all'evidenza;
- l'autorizzazione assume stato `valid_operational`;
- audit e record conservano modalità, soggetto indicato, riferimento, data e
  operatore che ha registrato l'evento;
- in sviluppo sono ammessi soltanto riferimenti ed evidenze fittizi;
- il software non attribuisce valore legale o probatorio all'evidenza.

Resta aperta come `ACC-006` la definizione del valore giuridico delle modalità
accettate e delle procedure di acquisizione e conservazione.

### Decisione ACC-005

Validazione fornita dall'associazione il 26 luglio 2026:

> Può autorizzare la persona registrata all'accettazione come proprietario o
> soggetto avente disponibilità della bicicletta. Per associazioni, enti o
> aziende autorizza il referente indicato dall'organizzazione.

Applicazione tecnica `ACC-005-v1`:

- per soci e non soci l'accettazione fissa il soggetto registrato;
- per un'organizzazione sono obbligatori nome dell'organizzazione e referente;
- il soggetto autorizzante non è modificabile nella fase di autorizzazione;
- delegati, consegnatari non registrati e categorie generiche non sono ammessi;
- pratiche precedenti prive della fotografia del soggetto restano bloccate e
  devono essere verificate, senza migrazione automatica;
- il backend copia il soggetto fissato nell'autorizzazione e nell'audit.

Il valore legale delle evidenze, l'acquisizione effettiva della firma e la
conservazione degli originali restano disciplinati rispettivamente da
`ACC-006` e dalla questione aperta `ACC-007`.

### Decisione ACC-006

Validazione fornita dall'associazione il 26 luglio 2026:

> È approvata l'acquisizione tecnica proposta, ma senza email.

Applicazione tecnica `ACC-006-v1`:

- le sole evidenze ammesse sono modulo firmato e firma grafica su dispositivo;
- l'email, precedentemente contemplata in `ACC-004-v1`, è esclusa e rifiutata;
- il modulo accetta PDF, JPEG o PNG fino a 10 MB;
- la firma su dispositivo produce esclusivamente un PNG, senza pressione,
  velocità, ritmo o altri dati biometrici dinamici;
- il file deve esistere in Storage privato prima dell'autorizzazione;
- il backend verifica percorso, utente, riparazione, metodo, MIME e dimensione;
- viene calcolato e conservato il checksum SHA-256;
- file e metadati non sono sovrascrivibili o cancellabili dal client;
- un riferimento testuale senza file non produce `valid_operational`;
- il software dichiara `legalValidity: not_determined`.

Valore legale, gestione degli originali cartacei, tempi di conservazione e
accessi alle evidenze sono disciplinati da `ACC-007`; durata concreta e valore
legale restano aperti in `ACC-008`.

### Decisione ACC-007

Validazione fornita dall'associazione il 26 luglio 2026.

Applicazione tecnica `ACC-007-v1`:

- l'operatore può acquisire il file ma non leggerlo dopo il consolidamento;
- metadati e file sono consultabili soltanto da amministratore e responsabile;
- il file non è leggibile direttamente da Storage;
- consultazione ed esportazione passano da una Function che scrive l'audit;
- percorso, checksum, custodia e note sono separati dal record tecnico;
- per un originale cartaceo conservato sono obbligatori codice ubicazione,
  responsabile della custodia e data di deposito;
- il software non dispone distruzione, restituzione o cancellazione;
- in ambiente non demo l'autorizzazione è bloccata se manca una configurazione
  attiva con durata di conservazione;
- nessuna cancellazione automatica è stata introdotta.

La durata concreta, il valore legale, la gestione finale degli originali e la
procedura di scadenza restano aperti in `ACC-008`.

### Decisione ACC-008

Validazione fornita dall'associazione il 26 luglio 2026.

Applicazione tecnica `ACC-008-v1`:

- conservazione per 24 mesi dal consolidamento dell'autorizzazione;
- registrazione della scadenza in `reviewDueAt`;
- stato iniziale `active_until_review`;
- alla scadenza revisione manuale, senza cancellazione automatica;
- proroga, restituzione o distruzione richiederanno una decisione
  amministrativa auditata;
- l'originale cartaceo resta `pending_manual_review` fino a tale decisione;
- modulo firmato acquisito e firma grafica sono evidenze operative;
- il software conserva `legalValidity: not_determined` e non dichiara
  equivalenza con una firma elettronica qualificata.

La durata dovrà essere riesaminata prima della produzione nell'ambito della
revisione privacy e legale generale. ACC-008 non autorizza da sola l'uso di
dati personali reali.

### Decisione ACC-009

Validazione fornita dall'associazione il 26 luglio 2026.

Applicazione tecnica `ACC-009-v1`:

- la revisione può iniziare da 30 giorni prima di `reviewDueAt`;
- alla scadenza lo stato effettivo è `review_overdue`, senza cancellazioni;
- responsabile e amministratore possono formulare la proposta;
- soltanto l'amministratore può confermare l'esito;
- gli esiti ammessi sono proroga, restituzione, distruzione riservata e
  assenza di originale cartaceo;
- proroga richiede nuova scadenza; ogni esito richiede motivazione;
- proposta, conferma e decisione sono auditate e idempotenti;
- lo storico precedente non viene cancellato;
- il file digitale non viene eliminato o anonimizzato finché `PRI-001` non
  definirà la relativa procedura.

### Decisione ACC-010

Validazione fornita dall'associazione il 26 luglio 2026.

Applicazione tecnica `ACC-010-v1`:

- restituzione: data, destinatario registrato e ricevuta firmata obbligatori;
- distruzione riservata: data, incaricato e verbale obbligatori;
- chi propone la distruzione non può confermarla come amministratore;
- ricevuta e verbale ammettono PDF, JPEG o PNG fino a 10 MB;
- il file deve esistere in Storage privato prima della proposta;
- percorso, metadati, MIME e dimensione sono verificati dal backend;
- viene conservato il checksum SHA-256;
- file e metadati non sono sovrascrivibili o cancellabili dal client;
- la prova dell'esito è conservata per 24 mesi dalla decisione finale e poi
  sottoposta a revisione manuale;
- senza allegato valido l'esito non può essere confermato;
- non sono previste comunicazioni email automatiche.

### Decisione ACC-011

Validazione fornita dall'associazione il 26 luglio 2026.

Applicazione tecnica `ACC-011-v1`:

- file consultabili soltanto da amministratore e responsabile;
- visualizzazione ed esportazione passano dal backend e producono audit;
- Storage non espone lettura diretta o collegamenti pubblici;
- l'esportazione genera un PDF con ID evidenza, data e UID richiedente;
- l'originale archiviato non viene modificato;
- l'operatore non accede al file consolidato;
- sostituzione riservata all'amministratore e motivazione obbligatoria;
- il nuovo file deve superare gli stessi controlli di ACC-010;
- la versione precedente confluisce nello storico append-only;
- nuova prova e versione sostituita restano soggette alla retention approvata;
- non sono previsti invii email automatici.

### Decisione ACC-012

Validazione fornita dall'associazione il 26 luglio 2026.

Applicazione tecnica `ACC-012-v1`:

- file mancante, checksum errato, metadati incoerenti o illeggibilità
  producono `documentAnomaly`;
- accesso, esportazione e conferma sono bloccati;
- responsabile e amministratore possono segnalare;
- soltanto l'amministratore apre e chiude l'incidente;
- tipo, date, attori, motivazioni e verifiche sono auditati;
- prima della sostituzione deve essere valutato il recupero da backup;
- la sostituzione durante un incidente deve indicarne l'identificativo;
- versioni e checksum precedenti restano nello storico;
- esiti ammessi: recuperato, sostituito o non recuperabile;
- non avvengono cancellazioni o comunicazioni email automatiche;
- il software non qualifica l'evento come violazione di dati personali.

### Decisione ACC-013

Validazione fornita dall'associazione il 26 luglio 2026.

Applicazione tecnica `ACC-013-v1`:

- copia disponibile dopo la firma al soggetto registrato;
- modalità ammesse: carta o download sul dispositivo in sede;
- il rifiuto viene registrato e non blocca l'accettazione;
- data, modalità, soggetto e operatore confluiscono in `copyHistory`;
- ristampe e download sono auditati e marcati come copia;
- nessun accesso diretto ai PDF da Storage e nessun invio email;
- non vengono acquisite automaticamente copie di documenti d'identità;
- il PDF originario resta immutato;
- correzioni future dovranno creare una versione collegata;
- il consolidamento definitivo resta bloccato finché ACC-001 e ACC-002 sono
  aperte.

### Decisione ACC-014

Validazione fornita dall'associazione il 26 luglio 2026.

Applicazione tecnica `ACC-014-v1`:

- prima della firma una bozza può essere sostituita;
- dopo la firma il PDF non è modificabile o sovrascrivibile;
- l'operatore propone e responsabile o amministratore confermano;
- motivazione, riepilogo e campi corretti sono obbligatori;
- la versione precedente diventa `superseded` e resta nello storico;
- la nuova versione conserva il collegamento alla precedente;
- nuova firma e nuova consegna/rifiuto della copia sono richiesti;
- la correzione non modifica automaticamente i registri tecnici;
- se cambia il soggetto autorizzante viene creato un blocco di
  riautorizzazione;
- un'autorizzazione precedente assume stato sostituito e la pratica torna in
  attesa di autorizzazione quando necessario;
- nessuna cancellazione o email automatica.

### Decisione ACC-015

Validazione fornita dall'associazione il 26 luglio 2026.

Applicazione tecnica `ACC-015-v1`:

- consolidamento riservato a responsabile e amministratore;
- verifica backend di policy privacy e condizioni attive;
- soggetto, firma o evidenza ammessa e copia registrata obbligatori;
- anomalie e correzioni pendenti bloccano l'operazione;
- evidenza di firma privata, non leggibile o sovrascrivibile dal client;
- checksum SHA-256 del PDF e dell'evidenza di firma;
- registrazione di data, attore, modello e versioni delle policy;
- record e file consolidati immutabili;
- correzioni successive seguono ACC-014;
- `legalValidity` resta `not_determined`;
- nessuna classificazione fiscale automatica;
- configurazioni demo producono soltanto `consolidated_demo` e non sono
  accettate fuori da un progetto demo;
- il seed mantiene ACC-001 e ACC-002 in stato `draft`, bloccando normalmente
  il consolidamento.

### Decisione ACC-016

Validazione fornita dall'associazione il 26 luglio 2026.

Applicazione tecnica `ACC-016-v1`:

- ritiro richiesto entro 30 giorni dalla prima comunicazione documentata;
- promemoria registrabile dopo 15 giorni;
- preavviso finale al trentesimo giorno con ulteriori 15 giorni;
- dopo 45 giorni stato `custody_overdue` e revisione manuale;
- contatti ammessi tramite telefono, SMS, email o comunicazione scritta;
- i contatti non costituiscono autorizzazione alla lavorazione;
- responsabile e amministratore registrano i contatti;
- soltanto l'amministratore apre la revisione oltre termine;
- nessun trasferimento di proprietà o disposizione automatica del bene;
- ogni destinazione successiva richiede decisione separata e verifica legale;
- nessun costo di custodia retroattivo;
- componenti pericolosi soggetti a una procedura di sicurezza separata;
- cronologia e audit append-only, senza cancellazione dal client.

### Decisione ACC-017

Validazione fornita dall'associazione il 26 luglio 2026.

Applicazione tecnica `ACC-017-v1`:

- l'operatore segnala immediatamente batterie danneggiate, perdite,
  componenti instabili o altri rischi;
- la riparazione assume lo stato `In verifica sicurezza` e la lavorazione è
  bloccata;
- vengono registrati rischio, misure protettive e ubicazione;
- le fotografie tecniche sono facoltative e devono essere minimizzate;
- durante il blocco non sono autorizzati lavorazione, riutilizzo, consegna o
  smaltimento;
- responsabile e amministratore possono chiudere la verifica;
- alla chiusura viene ripristinato lo stato operativo precedente;
- il trasferimento a un soggetto autorizzato richiede un riferimento
  documentale;
- nessuna classificazione automatica come rifiuto e nessuno smaltimento
  automatico;
- le misure di emergenza prevalgono in presenza di pericolo immediato;
- cronologia e audit sono append-only.

### Decisione ACC-018

Validazione fornita dall'associazione il 26 luglio 2026.

Applicazione tecnica `ACC-018-v1`:

- prova facoltativa e ammessa soltanto quando tecnicamente necessaria;
- deve essere compresa nei lavori autorizzati;
- ruote, pneumatici, freni e sterzo devono essere conformi;
- percorso limitato a un'area controllata predefinita;
- strada pubblica bloccata fino a verifica organizzativa, assicurativa e
  professionale;
- operatore espressamente autorizzato e identificato;
- casco e dispositivo ad alta visibilità obbligatori;
- passeggeri e carichi estranei al collaudo non ammessi;
- registrazione di durata, condizioni, operatore, esito e anomalie;
- nessuna registrazione GPS o geolocalizzazione continua;
- in caso di anomalia la prova viene interrotta e il collaudo è negativo;
- la prova dinamica non sostituisce la checklist statica.

### Decisione ACC-019

Validazione fornita dall'associazione il 26 luglio 2026.

Applicazione tecnica `ACC-019-v1`:

- in caso di problema la prova dinamica viene interrotta;
- l'anomalia tecnica viene annotata nel collaudo;
- il collaudo assume esito negativo e la bicicletta torna in lavorazione;
- se permane un rischio tecnico si applica `ACC-017-v1`;
- infortuni e danni sono gestiti fuori dal gestionale secondo le procedure
  organizzative dell'associazione;
- il software non raccoglie dati sanitari, dichiarazioni di testimoni o
  valutazioni di responsabilità;
- non viene introdotto un modulo, uno stato o un archivio incidenti dedicato.

### Decisione ACC-020

Validazione fornita dall'associazione il 26 luglio 2026.

Applicazione tecnica `ACC-020-v1`:

- l'accettazione non determina prezzi, contributi o trattamento fiscale;
- eventuali importi stimati devono precedere l'autorizzazione;
- variazioni di importo o intervento richiedono nuova autorizzazione;
- i ricambi mantengono un collegamento tecnico e quantitativo alla riparazione;
- l'uso del ricambio non viene qualificato automaticamente come vendita;
- un contributo alla consegna resta `Da classificare`;
- ricevute, IVA, esenzioni e pagamenti attendono `LEG-001` e `TAX-001`;
- nessuna classificazione fiscale libera o dedotta dal ruolo;
- le future classificazioni saranno configurabili, versionate e temporalmente
  valide;
- nessuna applicazione retroattiva automatica.
