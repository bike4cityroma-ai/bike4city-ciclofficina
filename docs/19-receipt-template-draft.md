# Modello di ricevuta — bozza TAX-001

## Stato del modello

- Codice modello: `REC-DRAFT-v1`
- Stato: bozza organizzativa, non attiva
- Ente: **APS Bike4City ETS**
- Codice fiscale: **97938060585**
- Sede: **via Casal Bruciato 11, 00159 Roma (RM)**
- RUNTS: **71300**
- Contatto: **info@bike4city.it**

Questo modello non deve produrre ricevute definitive finché il consulente non
ha validato `LEG-001`, `TAX-001`, diciture, trattamento IVA, eventuale bollo e
conservazione.

---

## APS Bike4City ETS

### RICEVUTA

**Numero:** `REC-[ANNO]-[PROGRESSIVO]`

**Data di emissione:** `[DATA E ORA]`

**Stato:** `[EMESSA | ANNULLATA]`

### Soggetto

**Nominativo o organizzazione:** `[NOME MINIMIZZATO]`

**Tipologia registrata:** `[SOCIO | NON SOCIO | ORGANIZZAZIONE]`

**Numero tessera, se pertinente:** `[FACOLTATIVO]`

**Codice fiscale del soggetto:** `[FACOLTATIVO; NON RICHIESTO
AUTOMATICAMENTE]`

### Operazione collegata

**Descrizione:** `[DESCRIZIONE CONFIGURATA E VALIDATA]`

Valori organizzativi previsti, da associare a classificazioni validate:

- `RIPARAZIONE` — Riparazione bicicletta;
- `BICI_RECUPERATA` — Consegna bicicletta recuperata;
- `EROGAZIONE_LIBERALE` — Erogazione liberale;
- `QUOTA_ASSOCIATIVA` — Quota associativa anno `[AAAA]`.

**Riparazione:** `[RIP-AAAA-NNNN | NON APPLICABILE]`

**Bicicletta:** `[BICI-AAAA-NNNN | BICICLETTA ESTERNA]`

**Consegna:** `[CON-AAAA-NNNN | NON APPLICABILE]`

**Data del pagamento/consegna:** `[DATA E ORA]`

### Importo

**Importo ricevuto:** `€ [0,00]`

**Modalità di pagamento:** `[CONTANTI | PAYPAL]`

**Riferimento del pagamento PayPal:** `[FACOLTATIVO; NON MEMORIZZARE
CREDENZIALI O DATI DI ACCESSO]`

### Classificazione

**Classificazione LEG-001:** `[DA CLASSIFICARE]`

**Configurazione TAX-001:** `[NON ATTIVA]`

**Regime fiscale:** `[ART. 86 D.LGS. 117/2017 — OPZIONE DICHIARATA
DALL'ASSOCIAZIONE; DECORRENZA DA VERIFICARE COME METADATO AMMINISTRATIVO
PRIMA DELLA PRODUZIONE]`

**Trattamento IVA:** `[DICITURA CONFIGURATA DAL CONSULENTE]`

**Dicitura normativa:** `[DICITURA CONFIGURATA DAL CONSULENTE]`

**Imposta di bollo:** `[NON DETERMINATA | ESENTE SE VALIDATO | APPLICATA SE
VALIDATO]`

Le diciture IVA/articolo 86 e bollo restano espressamente non confermate. Non
sono sostituite da testi generici e bloccano l'emissione definitiva.

In assenza di configurazioni valide, questi campi devono bloccare l'emissione
definitiva e non possono essere completati liberamente dall'operatore.

### Emissione

**Emessa da:** `[NOME OPERATORE AUTORIZZATO]`

**Ruolo:** `[AMMINISTRATORE | TESORIERE | RESPONSABILE | OPERATORE ALLA
CONSEGNA]`

**Firma o attestazione dell'emittente:** ______________________________

**Firma del pagante, facoltativa salvo diversa configurazione validata:**
________________

---

## Sezione di annullamento

Questa sezione compare soltanto per una ricevuta annullata.

**Annullata il:** `[DATA E ORA]`

**Annullata da:** `[AMMINISTRATORE]`

**Motivazione:** `[OBBLIGATORIA]`

**Ricevuta sostitutiva:** `[REC-AAAA-NNNN | NESSUNA]`

La ricevuta annullata resta archiviata, non viene cancellata e non riutilizza
il proprio progressivo.

## Regole applicative proposte

- un unico progressivo annuale `REC-AAAA-NNNN` per tutte le classificazioni;
- progressivi annullati non riutilizzabili;
- emissione contestuale al pagamento/consegna;
- stesso modello grafico per soci e non soci;
- differenze di trattamento gestite tramite classificazioni configurate, non
  tramite testo libero;
- metodi ammessi inizialmente: contanti e PayPal;
- collegamento obbligatorio almeno a una riparazione o consegna;
- nessuna emissione per cessione separata di ricambi;
- importo coerente con quello esplicitamente accettato dopo la diagnosi;
- emissione da amministratore, tesoriere, responsabile o operatore alla
  consegna;
- annullamento riservato all'amministratore;
- sostitutiva con nuovo progressivo e collegamento all'originale;
- PDF immutabile, checksum, audit e Storage privato;
- nessun invio automatico via email;
- copia cartacea oppure download sul dispositivo del pagante in sede;
- consegna o rifiuto della copia registrati nell'audit;
- nessun indirizzo o email del pagante nella ricevuta;
- codice fiscale del pagante facoltativo e separato dai dati tecnici;
- nessuna memorizzazione di credenziali PayPal.

## Campi da validare con il consulente

- denominazione giuridicamente corretta del documento;
- registrazione della decorrenza e dell'evidenza dell'opzione per il regime
  forfetario dell'articolo 86 del decreto legislativo 117/2017, dichiarata
  come formalmente esercitata dall'associazione;
- verifica periodica dei requisiti e della soglia di ricavi;
- classificazioni per riparazioni verso soci e non soci;
- natura dell'importo ricevuto;
- obbligo o meno di ricevuta, fattura o altro documento;
- trattamento IVA e diciture;
- applicabilità dell'esenzione dall'imposta di bollo;
- eventuali dati obbligatori del pagante;
- eventuale obbligo di firma del pagante;
- numerazioni o serie separate;
- conservazione;
- eventuali adempimenti relativi ai pagamenti elettronici.

## Riferimenti istituzionali da sottoporre al consulente

- Codice del Terzo settore, articolo 79:
  https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto:2017-07-03;117~art79!vig=
- Codice del Terzo settore, articolo 82:
  https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:2017;117~art82!vig=
- Codice del Terzo settore, articolo 86:
  https://www.normattiva.it/atto/caricaDettaglioAtto?atto.articolo.numero=86&atto.codiceRedazionale=17G00128&atto.dataPubblicazioneGazzetta=2017-08-02

I riferimenti non sostituiscono la validazione professionale e non vengono
interpretati automaticamente dal software.
