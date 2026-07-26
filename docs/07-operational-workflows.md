# Flussi operativi

## Obiettivo

Descrivere i passaggi, le responsabilità e i controlli dei principali flussi
della ciclofficina. Stati e transizioni dovranno essere applicati anche nel
backend, non soltanto nell'interfaccia.

## Regole comuni

- ogni operazione registra autore e data;
- gli identificativi leggibili sono generati dal backend;
- una transizione non ordinaria richiede una motivazione;
- i record consolidati non vengono cancellati;
- fotografie e documenti sono accessibili soltanto ai ruoli autorizzati;
- le classificazioni amministrative provengono da configurazioni validate;
- le notifiche non sostituiscono l'approvazione umana.

## Donazione di una bicicletta

Attori: responsabile o operatore; donatore; eventuale amministratore.

Flusso ordinario:

1. Identificare il tipo di provenienza e raccogliere soltanto i dati necessari.
2. Registrare la bicicletta e generare il codice `BICI-AAAA-NNNN`.
3. Annotare caratteristiche, numero telaio, accessori e condizioni visibili.
4. Acquisire la liberatoria secondo il modello approvato.
5. Aggiungere eventuali fotografie tecniche.
6. Impostare lo stato iniziale `ricevuta` o `da valutare`.
7. Assegnare ubicazione e operatore responsabile.
8. Registrare l'evento in audit.

Eccezioni:

- donatore anonimo: non creare dati identificativi fittizi;
- liberatoria mancante: impedire destinazioni che la richiedono;
- possibile provenienza dubbia: sospendere il flusso e richiedere verifica
  organizzativa, senza prendere decisioni legali automatiche;
- numero telaio assente o illeggibile: registrare esplicitamente la condizione.

## Valutazione e recupero

Stati principali:

```text
ricevuta -> da valutare
da valutare -> da riparare | pronta | smontata per ricambi | non recuperabile
da riparare -> in lavorazione | in attesa ricambi
in lavorazione -> in attesa ricambi | pronta
pronta -> destinata a donazione | destinata a cessione | destinata a vendita
destinata ... -> consegnata -> archiviata
```

Nel prototipo corrente sono abilitate dal backend le transizioni:

```text
da valutare -> da riparare | pronta
da riparare -> in lavorazione | in attesa ricambi
in lavorazione -> in attesa ricambi | pronta
in attesa ricambi -> in lavorazione
```

Ogni passaggio richiede una motivazione tecnica. `Consegnata` resta riservato
al futuro flusso controllato del modulo Consegne. Il passaggio a `pronta` non
impone ancora un collaudo positivo perché l'obbligatorietà del collaudo è una
decisione organizzativa aperta; questa precondizione dovrà essere configurata
prima dell'uso operativo.

Ogni valutazione deve conservare:

- esito;
- motivazione tecnica;
- operatore;
- data;
- destinazione prevista;
- eventuali ricambi recuperabili.

“Non recuperabile” non equivale a cancellazione: il record resta archiviabile e
tracciato.

## Smontaggio per ricambi

1. Verificare che la bicicletta possa essere destinata allo smontaggio.
2. Registrare la decisione e la motivazione.
3. Creare i ricambi recuperati con origine collegata alla bicicletta.
4. Registrare i movimenti iniziali di magazzino.
5. Aggiornare lo stato della bicicletta in modo atomico o coordinato.
6. Registrare eventuali componenti non recuperati senza cancellare lo storico.

## Accettazione di una riparazione

Attori: responsabile o operatore; utente; eventuale tesoriere.

1. Stabilire se l'utente è socio o non socio.
2. Raccogliere i contatti minimi necessari.
3. Registrare o collegare la bicicletta.
4. Annotare problema dichiarato, stato visibile e accessori consegnati.
5. Registrare interventi richiesti e autorizzazioni disponibili.
6. Generare `RIP-AAAA-NNNN`.
7. Produrre la scheda di accettazione.
8. Impostare lo stato `accettata`.
9. Registrare l'evento in audit.

Nel prototipo locale è implementato il primo tratto di questo flusso:
`createRepair` raccoglie riferimenti esclusivamente fittizi, problema e
interventi richiesti, genera il progressivo e imposta `Accettata`. Collegamento
all'anagrafica, scheda documentale e autorizzazioni versionate restano fasi
successive e non devono essere simulate con dati personali reali.

La classificazione fiscale non viene dedotta automaticamente dalla qualità di
socio o non socio.

## Diagnosi e autorizzazione

```text
accettata -> diagnosticata
diagnosticata -> in attesa autorizzazione | in attesa ricambi | in lavorazione
in attesa autorizzazione -> in attesa ricambi | in lavorazione | annullata
```

La diagnosi conserva:

- controlli effettuati;
- interventi proposti;
- ricambi previsti;
- stima non vincolante, se prevista dal regolamento;
- autore e data.

L'autorizzazione deve indicare metodo, data, ambito e soggetto. Se cambia
l'intervento autorizzato, deve restare traccia della versione precedente.

Nel prototipo la diagnosi è separata dall'accettazione: il passaggio
`Accettata -> Diagnosticata` richiede diagnosi tecnica, almeno un intervento
proposto e motivazione. I passaggi successivi sono applicati dal backend e
registrati nello storico della riparazione e nell'audit.

Decisione organizzativa `ACC-003-v1`, validata il 26 luglio 2026: la richiesta
registrata all'accettazione non autorizza la lavorazione. Dopo la diagnosi la
riparazione passa a `In attesa autorizzazione`; soltanto la callable
`authorizeRepairWork` può registrare gli interventi autorizzati e avviare la
lavorazione o l'attesa ricambi. Interventi non presenti nella diagnosi sono
rifiutati e richiedono una nuova proposta e una nuova conferma.

Decisione `ACC-004-v1`, validata il 26 luglio 2026: soltanto modulo firmato,
firma su dispositivo o email esplicita sono modalità valide operativamente.
Telefono e conferme generiche non sbloccano la lavorazione. Il sistema registra
il riferimento all'evidenza ma non ne determina il valore legale.

Decisione `ACC-005-v1`, validata il 26 luglio 2026: autorizza esclusivamente la
persona registrata all'accettazione come proprietario o soggetto avente
disponibilità oppure il referente indicato da un'organizzazione. Il soggetto è
fissato all'accettazione e non può essere sostituito durante l'autorizzazione.

Decisione `ACC-006-v1`, validata il 26 luglio 2026: sono ammesse soltanto
evidenza di modulo firmato o firma grafica su dispositivo; l'email è esclusa.
Il file privato deve essere archiviato e verificato prima che
`authorizeRepairWork` possa produrre `valid_operational`.

Decisione `ACC-007-v1`, validata il 26 luglio 2026: dopo il consolidamento
l'operatore non consulta l'evidenza. Amministratore e responsabile accedono
soltanto tramite backend con audit. Gli originali cartacei richiedono
ubicazione, custode e data; fuori dall'ambiente demo il flusso è bloccato senza
una retention approvata.

Decisione `ACC-008-v1`, validata il 26 luglio 2026: le evidenze sono conservate
per 24 mesi dal consolidamento e poi sottoposte a revisione manuale. La
scadenza non determina cancellazione automatica. Modulo firmato acquisito e
firma grafica costituiscono evidenze operative; il software non attribuisce
loro automaticamente equivalenza con una firma elettronica qualificata.

Decisione `ACC-009-v1`, validata il 26 luglio 2026: da 30 giorni prima della
scadenza il responsabile può proporre l'esito della revisione; soltanto
l'amministratore può confermarlo. Gli esiti sono proroga, restituzione,
distruzione riservata o assenza di originale cartaceo. Ogni passaggio è
auditato e non elimina il file digitale.

Decisione `ACC-010-v1`, validata il 26 luglio 2026: restituzione e distruzione
richiedono rispettivamente ricevuta firmata o verbale, con data e soggetto
strutturati. Il file PDF/JPEG/PNG è privato, non sovrascrivibile, verificato dal
backend e conservato per 24 mesi prima di una nuova revisione manuale.

Decisione `ACC-011-v1`, validata il 26 luglio 2026: amministratore e
responsabile accedono alle prove soltanto tramite backend con audit.
L'esportazione genera una copia PDF identificata; una correzione crea una nuova
versione confermata dall'amministratore e conserva quella sostituita.

Decisione `ACC-012-v1`, validata il 26 luglio 2026: file mancante, checksum
errato, metadati incoerenti o file illeggibile bloccano accesso e conferma.
L'anomalia viene segnalata e auditata; soltanto l'amministratore apre e chiude
l'incidente con esito recuperato, sostituito o non recuperabile.

Decisione `ACC-013-v1`, validata il 26 luglio 2026: dopo la firma si registra
la consegna cartacea, il download in sede oppure il rifiuto della copia. Il
soggetto deve coincidere con quello fissato all'accettazione. Ristampe e
download sono auditati e marcati come copia; nessun invio email è previsto.

Decisione `ACC-014-v1`, validata il 26 luglio 2026: una correzione produce una
nuova versione collegata, mentre la precedente resta `superseded`. Operatore
propone e responsabile o amministratore confermano. Se cambia il soggetto
autorizzante, il backend blocca la pratica fino a nuova autorizzazione.

Decisione `ACC-015-v1`, validata il 26 luglio 2026: il consolidamento è
riservato a responsabile e amministratore e richiede policy ACC-001/ACC-002
attive, firma, copia registrata e assenza di anomalie o correzioni. Il backend
calcola SHA-256 e rende il record immutabile. Le policy demo producono soltanto
`consolidated_demo`.

## Lavorazione e ricambi

1. Assegnare attività a operatori o volontari.
2. Limitare il volontario ai dati tecnici necessari.
3. Registrare attività, tempo e note tecniche.
4. Prelevare ricambi tramite un movimento append-only.
5. Impedire quantità negative o rettifiche prive di motivazione.
6. Registrare gli interventi effettivamente completati.
7. Passare a `pronta` soltanto quando non restano attività bloccanti.

Ogni utilizzo di ricambio richiede quantità e motivazione. Il backend verifica
la giacenza, impedisce lo scarico fuori dalla lavorazione e conserva il
movimento anche dopo il completamento della riparazione.

La prima registrazione di un ricambio produce sempre un movimento di carico
collegato. Provenienza, condizione, ubicazione e compatibilità sono obbligatorie;
la bicicletta di origine è facoltativa e va compilata soltanto per un recupero
effettivamente tracciabile.

Carichi successivi, resi e rettifiche richiedono sempre una motivazione. Le
rettifiche negative sono ammesse soltanto entro la giacenza disponibile; non è
prevista modifica o cancellazione ordinaria di un movimento consolidato.

Nel prototipo l'ingresso in `In lavorazione` assegna automaticamente l'utente
che esegue il passaggio. Il passaggio a `Pronta` richiede almeno un intervento
eseguito, il tempo impiegato e, se non risultano movimenti di ricambi, una
conferma esplicita che non ne siano stati utilizzati. Una scheda pronta ma
incompleta può essere riportata in lavorazione con motivazione.

## Collaudo

1. Verificare che la lavorazione sia completa.
2. Compilare ogni controllo obbligatorio.
3. Registrare prova su strada, se applicabile e autorizzata.
4. Registrare esito, note, operatore e data.
5. In caso negativo, riportare la riparazione in lavorazione.
6. In caso positivo, impostare `collaudata`.

Nel prototipo il risultato è derivato dalla checklist: almeno una voce `Non
conforme` produce esito `Negativo` e riporta la riparazione in lavorazione;
altrimenti l'esito è `Positivo` e la riparazione passa a `Collaudata`. L'esito
`Condizionato` resta visibile nei dati dimostrativi storici ma non è generabile
finché il suo significato organizzativo non sarà approvato.

Un collaudo non può essere modificato silenziosamente dopo il consolidamento:
eventuali correzioni devono produrre una nuova versione o un evento tracciato.

## Consegna

Precondizioni:

- identità della bicicletta verificata;
- collaudo positivo quando richiesto;
- soggetto ricevente identificato nella misura necessaria;
- eventuale documento economico gestito dal ruolo autorizzato.

Flusso:

1. Registrare condizioni e accessori alla consegna.
2. Collegare collaudo, riparazione ed eventuale ricevuta.
3. Produrre il verbale.
4. Raccogliere le firme previste.
5. Generare `CON-AAAA-NNNN`.
6. Impostare bicicletta o riparazione come `consegnata`.
7. Registrare l'evento in audit.

Nel prototipo la consegna di una riparazione è consentita soltanto dopo un
collaudo positivo consolidato. Il riferimento `VER-AAAA-NNNN` identifica i
metadati del futuro verbale, ma non rappresenta ancora un PDF firmato. Importi
eventuali restano non classificati e non generano automaticamente ricevute.

## Ricevuta

1. L'utente autorizzato seleziona una classificazione già validata.
2. Il backend acquisisce una fotografia della configurazione valida.
3. Il backend genera numero e ricevuta in modo atomico e idempotente.
4. Il PDF viene salvato in un percorso protetto.
5. La ricevuta passa a `issued`.
6. Eventuali correzioni seguono il flusso di annullamento e nuova emissione.

Annullamento:

1. verificare il permesso;
2. acquisire una motivazione obbligatoria;
3. mantenere numero, contenuto originale e PDF;
4. registrare autore e data;
5. impostare `void`;
6. scrivere l'audit.

## Archiviazione

L'archiviazione:

- non elimina il record;
- lo esclude dagli elenchi operativi ordinari;
- conserva relazioni e audit;
- richiede permesso e, quando opportuno, motivazione;
- non sostituisce una procedura approvata di anonimizzazione.

## Decisioni aperte

- chi può approvare eccezioni ai flussi;
- quali passaggi richiedono firma e in quale forma;
- quando il collaudo è obbligatorio;
- chi può svolgere la prova su strada;
- modalità accettate per autorizzare lavori aggiuntivi;
- tempi di giacenza e gestione dei beni non ritirati;
- regole organizzative per smaltimento e provenienza dubbia.
