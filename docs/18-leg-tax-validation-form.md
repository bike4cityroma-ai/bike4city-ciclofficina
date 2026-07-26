# Scheda di validazione LEG-001 e TAX-001

## Istruzioni

Compilare esclusivamente ciò che descrive l'attività reale
dell'associazione. Le colonne legali e fiscali devono essere confermate dai
referenti competenti: il software non deduce autonomamente il trattamento.

Data di compilazione: `[DA COMPILARE]`

Referente associativo: `[DA COMPILARE]`

Consulente o referente fiscale: `[DA COMPILARE]`

Data di efficacia delle configurazioni: `[DA COMPILARE]`

## A. Attività effettivamente svolte

Per ogni attività indicare:

- `sì` oppure `no`;
- destinatari: `soci`, `non soci`, `entrambi` oppure `non applicabile`;
- modalità economica: `gratuita`, `contributo libero`, `importo stabilito`
  oppure `non applicabile`;
- documento oggi rilasciato, se presente.

| Attività | Svolta | Destinatari | Modalità economica | Documento attuale | Note |
|---|---|---|---|---|---|
| Riparazioni | `sì` | `soci e non soci` | `importo variabile determinato dopo la diagnosi, comunicato e accettato esplicitamente nell'autorizzazione ai lavori` | `stesso tipo di ricevuta per soci e non soci, emessa al momento del pagamento/consegna` | Descrizione operativa fornita dall'associazione; classificazione LEG/TAX ancora da validare. |
| Consegna biciclette recuperate | `sì` | `soci e non soci` | `importo variabile comunicato prima della consegna e confermato esplicitamente dal ricevente` | `stesso modello delle riparazioni con descrizione specifica diversa` | Classificazione e dicitura fiscale da validare in LEG/TAX. |
| Cessione separata di ricambi | `no` | `non applicabile` | `non applicabile` | `nessuno` | I ricambi possono essere registrati soltanto come componenti tecnici collegati a una riparazione. |
| Donazioni e liberalità ricevute | `sì` | `soci e non soci` | `importo libero tramite contanti o PayPal` | `stesso modello grafico con descrizione Erogazione liberale` | Classificazione e dicitura fiscale dedicate da validare in TAX-001. |
| Quote associative | `sì` | `soci` | `importo annuale fisso di 10 euro, pagabile in contanti o PayPal` | `stesso modello grafico con dicitura Quota associativa anno [AAAA]` | Classificazione e testo fiscale da validare in TAX-001. |
| Rimborsi spese | `no, ad oggi` | `non applicabile` | `non applicabile` | `nessuno` | Flusso escluso dalla prima versione; richiede futura procedura approvata. |
| Altre attività | `no` | `non applicabile` | `non applicabile` | `nessuno` | Nessun'altra attività economica dichiarata. |

## B. Validazione LEG-001

Per ogni riga attiva della sezione A, il referente incaricato deve indicare:

| Campo | Risposta |
|---|---|
| Denominazione della classificazione | `[DA VALIDARE]` |
| Descrizione operativa | `[DA VALIDARE]` |
| Attività verso soci ammessa | `[DA VALIDARE]` |
| Attività verso non soci ammessa | `[DA VALIDARE]` |
| Gratuità, contributo o importo stabilito ammessi | `[DA VALIDARE]` |
| Documento organizzativo di riferimento | `[DA VALIDARE]` |
| Approvata da | `[DA VALIDARE]` |
| Valida dal | `[DA VALIDARE]` |
| Valida fino al | `[DA VALIDARE]` |
| Applicazione retroattiva | `no, salvo nuova approvazione espressa` |
| Evidenza allegata o riferimento | `[DA VALIDARE]` |

In assenza di una configurazione LEG-001 valida, il software deve mantenere la
pratica nello stato `Da classificare`.

### Classificazioni operative approvate

| Codice stabile | Descrizione | Stato fiscale |
|---|---|---|
| `RIPARAZIONE` | Riparazione bicicletta | Da validare in TAX-001 |
| `BICI_RECUPERATA` | Consegna bicicletta recuperata | Da validare in TAX-001 |
| `EROGAZIONE_LIBERALE` | Erogazione liberale | Da validare in TAX-001 |
| `QUOTA_ASSOCIATIVA` | Quota associativa anno `[AAAA]` | Da validare in TAX-001 |

I codici non cambiano quando viene aggiornata una descrizione. Ogni
configurazione fiscale sarà versionata e collegata al codice operativo.

## C. Validazione TAX-001

Questa sezione deve essere compilata o confermata dal consulente fiscale per
ciascuna classificazione LEG-001.

| Campo | Risposta |
|---|---|
| Ricevuta richiesta | `[DA VALIDARE]` |
| Tipo di documento | `[DA VALIDARE]` |
| Serie o numerazione | `unica serie REC-AAAA-NNNN per tutte le classificazioni; ripartenza da 1 ogni anno; progressivi annullati non riutilizzabili` |
| Contenuti obbligatori | `[DA VALIDARE]` |
| Dati del pagante | `nome/cognome o organizzazione e tipologia obbligatori; numero tessera obbligatorio solo per quota associativa; codice fiscale facoltativo; indirizzo ed email non raccolti` |
| Consegna della copia | `carta oppure download sul dispositivo in sede; consegna o rifiuto auditati; nessun invio automatico email` |
| Firme | `firma o attestazione dell'emittente prevista; firma del pagante facoltativa e non bloccante, salvo futura prescrizione validata` |
| Trattamento IVA | `[DA CONFERMARE PRIMA DELL'ATTIVAZIONE]` |
| Applicazione del regime forfetario art. 86 D.Lgs. 117/2017 | `opzione formalmente esercitata secondo dichiarazione dell'associazione; decorrenza non ricordata e da verificare prima della produzione, senza campo nell'uso operativo quotidiano` |
| Eventuale dicitura normativa | `[DA CONFERMARE PRIMA DELL'ATTIVAZIONE]` |
| Imposta di bollo e soglia | `[DA CONFERMARE PRIMA DELL'ATTIVAZIONE]` |
| Metodi di pagamento da registrare | `contanti; PayPal — validi anche per erogazioni liberali; prassi operativa da confermare in TAX-001` |
| Soggetti autorizzati all'emissione | `amministratore; tesoriere; responsabile della ciclofficina; operatore contestualmente alla consegna` |
| Regola di annullamento | `solo amministratore; annullamento tracciato senza cancellazione; eventuale sostitutiva con nuovo progressivo e collegamento all'originale` |
| Conservazione | `[DA VALIDARE]` |
| Approvata da | `[DA VALIDARE]` |
| Valida dal | `[DA VALIDARE]` |
| Valida fino al | `[DA VALIDARE]` |
| Evidenza allegata o riferimento | `[DA VALIDARE]` |

In assenza di una configurazione TAX-001 valida, il software non deve emettere
ricevute definitive né applicare automaticamente IVA, esenzioni, esclusioni o
altre qualificazioni.

## D. Regole tecniche già approvate

- classificazioni configurabili e versionate;
- intervallo temporale obbligatorio;
- nessuna applicazione retroattiva automatica;
- nessuna deduzione dal ruolo, dalla qualifica di socio o dall'importo;
- stato `Da classificare` quando manca una configurazione valida;
- annullamento dei documenti senza cancellazione;
- audit delle approvazioni e delle modifiche;
- soli dati fittizi fino alla chiusura delle validazioni.

## E. Conferme

Referente associativo: ______________________________

Data: ____________________

Firma o riferimento alla delibera: ______________________________

Consulente o referente fiscale: ______________________________

Data: ____________________

Firma o riferimento alla validazione: ______________________________
