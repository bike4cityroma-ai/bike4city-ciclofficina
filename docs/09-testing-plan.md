# Piano di test

## Obiettivo

Verificare progressivamente comportamento, autorizzazioni, integrità dei dati,
accessibilità e procedure operative usando esclusivamente dati fittizi.

## Strategia

La piramide proposta comprende:

1. test unitari per logica e validazione;
2. test di componenti per form e interazioni;
3. test di integrazione con Firebase Emulator Suite;
4. test delle Firestore e Storage Security Rules;
5. pochi test end-to-end sui flussi critici;
6. checklist manuale per usabilità, documenti e deploy.

## Dati di test

- nomi, email, telefoni e biciclette interamente fittizi;
- nessuna copia o derivazione da dati reali;
- identificativi chiaramente dimostrativi;
- dataset riproducibile e azzerabile;
- ruoli di prova separati;
- file innocui e di dimensione ridotta.

## Test unitari

Copertura minima:

- validazione dei modelli;
- transizioni di stato;
- formattazione degli identificativi;
- calcoli economici puramente configurati;
- risoluzione dei permessi;
- anonimizzazione e normalizzazione;
- serializzazione di date e importi;
- gestione degli errori.

## Test dei componenti

- campi obbligatori e messaggi italiani;
- validazione accessibile;
- navigazione da tastiera;
- conferme per operazioni sensibili;
- filtri e stati vuoti;
- caricamento ed errori;
- visibilità delle azioni per ruolo;
- layout essenziale per smartphone e tablet.

La visibilità di un pulsante non costituisce un test di autorizzazione.

## Test delle Security Rules

Per ogni ruolo e collezione:

- accesso anonimo negato;
- lettura prevista consentita;
- lettura non prevista negata;
- creazione valida consentita;
- campi protetti non modificabili;
- transizioni illegali negate;
- cancellazione definitiva negata;
- account disattivato negato;
- ambito di assegnazione rispettato.

Scenari prioritari:

- volontario senza accesso ai dati personali;
- operatore senza permessi contabili;
- tesoriere senza modifica delle lavorazioni;
- client senza accesso a `counters` e `auditLogs`;
- ricevute consolidate non modificabili;
- query incompatibili con l'ambito negate.

## Test Storage

- download autorizzato e negato;
- caricamento legato a un'entità accessibile;
- tipo MIME non ammesso rifiutato;
- file troppo grande rifiutato;
- percorso arbitrario rifiutato;
- sovrascrittura di documento consolidato negata;
- account sospeso negato.

## Test delle Cloud Functions

- autenticazione mancante;
- ruolo insufficiente;
- input non valido;
- App Check, dove richiesto;
- successo ordinario;
- concorrenza;
- ripetizione della stessa richiesta;
- fallimento parziale e rollback;
- audit prodotto;
- errore privo di dati sensibili.

## Progressivi

Il test di concorrenza deve inviare più richieste simultanee e verificare:

- nessun codice duplicato;
- sequenza coerente secondo le regole definite;
- nessun record privo di codice;
- retry idempotente;
- comportamento documentato in caso di transazione fallita.

## Ricevute

- configurazione valida alla data;
- configurazione scaduta rifiutata;
- snapshot della configurazione conservato;
- emissione atomica;
- PDF collegato;
- modifica diretta negata;
- annullamento con motivazione;
- originale conservato;
- nuova emissione distinta;
- permessi del tesoriere verificati.

## Esportazioni

- soli campi autorizzati;
- filtri temporali;
- separazione dati personali e tecnici;
- escaping CSV;
- fogli Excel validi;
- PDF leggibile;
- JSON ripristinabile;
- audit dell'esportazione;
- dataset grandi paginati o elaborati in backend.

## Test end-to-end critici

1. donazione, valutazione e destinazione;
2. accettazione, lavorazione, collaudo e consegna;
3. carico e utilizzo di un ricambio;
4. emissione e annullamento di una ricevuta;
5. assegnazione e revoca di un ruolo;
6. accesso negato a un volontario;
7. archiviazione senza cancellazione.

## Test di backup e ripristino

- produzione di un backup di dati fittizi;
- verifica del manifesto e dell'integrità;
- ripristino in ambiente isolato;
- riconciliazione dei conteggi;
- verifica di relazioni, file e progressivi;
- registrazione di durata, errori e responsabile.

## Accessibilità

Obiettivo iniziale: conformità sostanziale a WCAG 2.2 livello AA, da verificare
con strumenti automatici e controlli manuali.

- uso completo da tastiera;
- focus visibile;
- etichette associate ai campi;
- contrasto;
- zoom e reflow;
- errori identificabili;
- annunci per aggiornamenti importanti;
- tabelle e documenti leggibili.

## Criteri di uscita

Prima di integrare un modulo:

- test relativi superati;
- nessun difetto critico noto;
- requisiti tracciati;
- documentazione aggiornata;
- dati di prova soltanto fittizi.

Prima del deploy:

- build e suite completa superate;
- regole e indici verificati;
- revisione di sicurezza completata;
- backup e ripristino provati;
- checklist manuale firmata dal responsabile;
- conferma esplicita alla pubblicazione.

## Evidenze

Conservare:

- versione del codice;
- ambiente ed emulatori usati;
- comandi eseguiti;
- risultato sintetico;
- difetti aperti;
- eventuali eccezioni approvate.
