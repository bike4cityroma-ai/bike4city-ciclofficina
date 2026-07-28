# Manuale utente del prototipo

## Prima di iniziare

Il prototipo funziona soltanto in locale con Firebase Emulator Suite. Usare
esclusivamente dati inventati. Non inserire nomi, contatti, numeri di telaio o
altre informazioni reali.

## Avvio

Nel primo terminale:

```powershell
npm.cmd run emulators
```

Nel secondo terminale:

```powershell
npm.cmd run emulators:seed
npm.cmd run dev
```

Aprire `http://127.0.0.1:5173`.

Credenziali locali:

- email: `responsabile@example.test`
- password: `Demo-Ciclofficina-2026!`

Se il registro non è disponibile o una Function non risponde, rieseguire
`npm.cmd run emulators:seed`, aggiornare la pagina e accedere nuovamente.

## Navigazione

Il menu laterale contiene:

1. Dashboard;
2. Biciclette;
3. Riparazioni;
4. Ricambi;
5. Collaudi;
6. Consegne.

I dati si aggiornano in tempo reale. Le schede si aprono con **Apri** e si
chiudono con il pulsante **×**.

## Biciclette

### Registrare una bicicletta

1. Aprire **Biciclette**.
2. Premere **Registra bicicletta**.
3. Compilare i dati tecnici fittizi.
4. Premere **Registra bicicletta**.

Il sistema assegna il codice `BICI-AAAA-NNNN` e lo stato iniziale
`Da valutare`.

### Aggiornare lo stato

1. Aprire la scheda.
2. Selezionare uno degli stati consentiti.
3. Inserire una motivazione tecnica di almeno 10 caratteri.
4. Premere **Aggiorna stato**.

Lo storico compare nella stessa scheda. `Consegnata` non è selezionabile
manualmente.

## Riparazioni

### Nuova accettazione

1. Aprire **Riparazioni**.
2. Premere **Nuova riparazione**.
3. Indicare soltanto un riferimento utente fittizio.
4. Descrivere bicicletta, problema e interventi richiesti.
5. Premere **Registra riparazione**.

Il codice assegnato è `RIP-AAAA-NNNN`; lo stato iniziale è `Accettata`.

### Diagnosi

1. Aprire una riparazione `Accettata`.
2. Inserire diagnosi tecnica e interventi proposti.
3. Scrivere la motivazione.
4. Premere **Registra diagnosi**.

La diagnosi è separata dal problema dichiarato dal ricevente.

### Avviare e completare la lavorazione

Per entrare in `In lavorazione`, selezionare lo stato e inserire la
motivazione. L'operatore corrente viene assegnato automaticamente.

Per passare a `Pronta` sono obbligatori:

- interventi eseguiti;
- tempo totale in minuti;
- almeno un ricambio collegato oppure conferma che non ne sono stati usati.

Se la riparazione è `In attesa ricambi`, prima riportarla in
`In lavorazione`; comparirà nuovamente il modulo per usare i ricambi.

## Ricambi

### Registrazione e carico iniziale

1. Aprire **Ricambi**.
2. Premere **Registra ricambio**.
3. Se utile, indicare il **Prezzo consigliato**: è un riferimento interno
   facoltativo e non genera automaticamente ricevute o movimenti economici.
4. Inserire categoria, descrizione, provenienza, compatibilità, condizione e
   ubicazione.
5. Indicare quantità e motivazione.
6. Premere **Registra e carica**.

Il sistema genera `RIC-AAAA-NNNN` e il movimento iniziale.

### Movimenti successivi

Aprire il ricambio e usare **Nuovo movimento**:

- **Carico aggiuntivo** aumenta la giacenza;
- **Reso in magazzino** aumenta la giacenza;
- **Rettifica inventariale** applica una variazione positiva o negativa.

Ogni movimento richiede una motivazione. Una rettifica non può portare la
giacenza sotto zero.

### Usare un ricambio in una riparazione

1. Portare la riparazione in `In lavorazione`.
2. Aprire **Inserisci ricambio usato**.
3. Selezionare il ricambio e la quantità.
4. Inserire la motivazione.
5. Premere **Usa ricambio**.

La giacenza e la riparazione vengono aggiornate insieme.

## Collaudi

1. Portare la riparazione a `Pronta`.
2. Aprire **Collaudi**.
3. Premere **Nuovo collaudo**.
4. Selezionare la riparazione.
5. Compilare ogni voce della checklist.
6. Aggiungere una nota per `Non conforme` o `Non applicabile`.
7. Inserire le note finali.
8. Premere **Consolida collaudo**.

Esito:

- nessuna non conformità: `Positivo`, riparazione `Collaudata`;
- almeno una non conformità: `Negativo`, riparazione `In lavorazione`.

Un collaudo negativo resta nello storico. La riparazione può essere lavorata
nuovamente e sottoposta a un nuovo collaudo.

### Autorizzare una lavorazione diagnosticata

1. Aprire una riparazione `In attesa autorizzazione`.
2. Verificare gli interventi proposti.
3. Selezionare **Modulo firmato** oppure **Firma su dispositivo**.
4. Caricare il PDF/JPEG/PNG firmato oppure acquisire la firma grafica.
5. Registrare il riferimento fittizio dell'evidenza.
6. Scegliere `In lavorazione` o `In attesa ricambi`.
7. Inserire la motivazione e premere **Registra autorizzazione**.

Email e telefono non sono modalità ammesse. In sviluppo non usare firme,
moduli o identità reali.

## Consegne

1. Verificare che la riparazione sia `Collaudata`.
2. Aprire **Consegne**.
3. Premere **Nuova consegna**.
4. Selezionare la riparazione.
5. Inserire ricevente fittizio, condizioni e accessori.
6. Indicare l'eventuale contributo senza attribuire classificazioni fiscali.
7. Confermare le dichiarazioni.
8. Premere **Registra consegna**.

Il sistema genera `CON-AAAA-NNNN`, il riferimento `VER-AAAA-NNNN` e porta la
riparazione a `Consegnata`.

Il riferimento `VER-…` non è un PDF firmato. L'eventuale contributo non produce
automaticamente una ricevuta.

## Documenti operativi

1. Aprire **Documenti**.
2. Premere **Genera bozza PDF**.
3. Scegliere scheda di accettazione, scheda di collaudo o verbale di consegna.
4. Selezionare il record dimostrativo collegato.
5. Premere **Genera e archivia**.
6. Usare **Apri PDF** per consultare o stampare il file autorizzato.

Tutti i PDF di questa fase sono bozze dimostrative con testi non approvati.
Gli spazi per le firme non costituiscono firme elettroniche. I file non devono
essere utilizzati con dati reali né come documenti definitivi.

## Messaggi e problemi comuni

### Registro non disponibile

Verificare gli emulatori, rieseguire il seed, aggiornare la pagina e accedere
nuovamente.

### Pulsante disabilitato

Controllare i campi obbligatori, la motivazione minima e le conferme richieste.

### Ricambio non utilizzabile

La riparazione deve essere `In lavorazione`, non `In attesa ricambi`.

### Riparazione assente dal collaudo

La riparazione deve essere `Pronta`.

### Riparazione assente dalla consegna

Deve essere `Collaudata` e collegata a un collaudo positivo.

### Collaudo negativo

La riparazione torna automaticamente in `In lavorazione`.

## Chiusura della sessione

Usare **Esci** nell'applicazione. Gli emulatori possono essere arrestati dal
terminale con `Ctrl+C`. I dati locali sono dimostrativi e possono essere
ripristinati rieseguendo il seed.
