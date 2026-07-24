# Requisiti funzionali

## Convenzioni

Ogni requisito ha un identificativo stabile. Le priorità sono:

- **M**: necessario per il primo rilascio operativo;
- **S**: importante, realizzabile dopo il nucleo iniziale;
- **C**: evoluzione possibile.

## Accesso e utenti

| ID | Priorità | Requisito |
|---|---:|---|
| AUT-01 | M | Il sistema deve autenticare gli utenti autorizzati. |
| AUT-02 | M | Un amministratore deve poter attivare, sospendere e riattivare un account. |
| AUT-03 | M | I permessi devono derivare da ruoli e ambiti espliciti. |
| AUT-04 | M | I controlli devono essere applicati nel backend e nelle Security Rules. |
| AUT-05 | M | Le assegnazioni e revoche dei ruoli devono essere registrate in audit. |
| AUT-06 | S | Le operazioni sensibili devono poter richiedere autenticazione recente. |

## Soci

| ID | Priorità | Requisito |
|---|---:|---|
| SOC-01 | M | Gli utenti autorizzati devono poter creare e aggiornare una scheda socio minimizzata. |
| SOC-02 | M | Il sistema deve gestire numero tessera, stato e periodo di validità. |
| SOC-03 | M | I volontari non devono accedere ai dati personali non necessari. |
| SOC-04 | M | La disattivazione deve essere logica e tracciata. |
| SOC-05 | S | Gli utenti autorizzati devono poter esportare i dati previsti dal proprio ruolo. |

## Biciclette e donazioni

| ID | Priorità | Requisito |
|---|---:|---|
| BIC-01 | M | Il sistema deve assegnare un identificativo leggibile e univoco alla bicicletta. |
| BIC-02 | M | Deve registrare caratteristiche tecniche, provenienza, stato e ubicazione. |
| BIC-03 | M | Deve mantenere lo storico degli stati rilevanti. |
| BIC-04 | M | Deve collegare donazione, liberatoria, fotografie e operatore. |
| BIC-05 | M | Non deve rendere pubbliche fotografie o documenti. |
| BIC-06 | S | Deve supportare smontaggio per ricambi e destinazione finale. |

## Riparazioni

| ID | Priorità | Requisito |
|---|---:|---|
| RIP-01 | M | Il sistema deve registrare accettazione, problema dichiarato e bicicletta. |
| RIP-02 | M | Deve distinguere interventi richiesti, autorizzati ed eseguiti. |
| RIP-03 | M | Deve gestire stato, operatori, volontari e tempi di lavorazione. |
| RIP-04 | M | Deve collegare ricambi, collaudo, consegna e documento emesso. |
| RIP-05 | M | Deve distinguere socio e non socio senza decidere il trattamento fiscale. |
| RIP-06 | S | Deve notificare nell'interfaccia scadenze e lavorazioni in attesa. |

## Ricambi

| ID | Priorità | Requisito |
|---|---:|---|
| RIC-01 | M | Il sistema deve gestire ricambi recuperati e nuovi. |
| RIC-02 | M | Ogni variazione di quantità deve produrre un movimento tracciabile. |
| RIC-03 | M | Un utilizzo deve poter essere collegato a bicicletta e riparazione. |
| RIC-04 | M | Le quantità non devono essere corrette cancellando lo storico. |
| RIC-05 | S | Il sistema deve segnalare incoerenze e disponibilità insufficienti. |

## Collaudi e consegne

| ID | Priorità | Requisito |
|---|---:|---|
| COL-01 | M | Il sistema deve offrire una checklist di collaudo configurata. |
| COL-02 | M | Deve registrare esito, note, data e operatore. |
| COL-03 | M | Una consegna deve riferirsi a una bicicletta o riparazione identificata. |
| COL-04 | M | Il verbale deve registrare soggetto, stato, contributo e documenti collegati. |
| COL-05 | S | Le eccezioni al flusso ordinario devono richiedere motivazione. |

## Ricevute e documenti

| ID | Priorità | Requisito |
|---|---:|---|
| DOC-01 | M | I documenti numerati devono usare progressivi annuali atomici. |
| DOC-02 | M | Una ricevuta emessa non deve essere cancellata o sovrascritta. |
| DOC-03 | M | L'annullamento deve conservare originale, motivo, autore e data. |
| DOC-04 | M | La classificazione deve provenire da configurazioni versionate e validate. |
| DOC-05 | M | Il sistema non deve scegliere autonomamente IVA, esclusioni o esenzioni. |
| DOC-06 | S | Deve generare PDF con intestazione, numero, data e spazio firme. |
| DOC-07 | S | Il logo e i riferimenti associativi devono essere configurabili. |

## Ricerca, report ed esportazioni

| ID | Priorità | Requisito |
|---|---:|---|
| REP-01 | M | Gli elenchi devono offrire ricerca, filtri e indicatori di stato. |
| REP-02 | M | Le esportazioni devono rispettare ruolo e ambito dell'utente. |
| REP-03 | S | Il sistema deve esportare CSV, Excel, PDF e JSON secondo il caso d'uso. |
| REP-04 | S | Deve produrre statistiche annuali operative ed economiche autorizzate. |
| REP-05 | S | Le metriche ambientali devono essere chiaramente indicate come stime. |

## Audit, archiviazione e backup

| ID | Priorità | Requisito |
|---|---:|---|
| AUD-01 | M | Le operazioni rilevanti devono produrre eventi audit append-only. |
| AUD-02 | M | I record operativi devono supportare archiviazione e cancellazione logica. |
| AUD-03 | M | Gli eventi devono indicare autore, data, azione e risorsa interessata. |
| AUD-04 | S | Il sistema deve supportare esportazioni di backup autorizzate. |
| AUD-05 | S | La procedura di ripristino deve essere documentata e verificata. |

## Requisiti trasversali

| ID | Priorità | Requisito |
|---|---:|---|
| UX-01 | M | Interfaccia e messaggi destinati agli utenti devono essere in italiano. |
| UX-02 | M | L'interfaccia deve essere responsive e utilizzabile da tablet. |
| UX-03 | M | Errori e conferme devono essere comprensibili. |
| UX-04 | M | Le operazioni irreversibili o sensibili devono richiedere conferma. |
| UX-05 | M | L'interfaccia deve seguire criteri di accessibilità verificabili. |

## Criteri di accettazione del prototipo

- accesso con identità fittizie per almeno tre ruoli;
- dashboard con dati dimostrativi;
- creazione e aggiornamento di biciclette fittizie;
- creazione e avanzamento di riparazioni fittizie;
- negazione verificata di almeno un'operazione per ruolo;
- nessun dato personale reale;
- test automatici essenziali e checklist manuale documentata.

## Fuori ambito finché non approvato

- consulenza fiscale o legale automatizzata;
- fatturazione elettronica;
- pagamenti online;
- firma elettronica qualificata;
- integrazione automatica con RUNTS o software contabili;
- riconoscimento automatico di persone o documenti;
- cancellazione definitiva di dati reali dall'interfaccia ordinaria.

## Questioni da validare

- dati obbligatori e tempi di conservazione;
- contenuto e valore dei modelli documentali;
- flusso di autorizzazione delle riparazioni;
- responsabilità di collaudo e consegna;
- regole di emissione e annullamento delle ricevute;
- metriche ambientali e metodo di stima.
