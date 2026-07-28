# Verbale di collaudo generale

## Stato

- Data: 28 luglio 2026
- Ambiente: Firebase Emulator Suite
- Progetto: `demo-bike4city-ciclofficina`
- Dati: esclusivamente fittizi
- Produzione: non autorizzata

## Verifiche automatiche eseguite

| Controllo | Esito |
|---|---|
| Typecheck TypeScript | superato |
| Build frontend Vite | superata |
| Build Cloud Functions | superata |
| Test frontend | 25 su 25 superati |
| Test Firestore e Storage Rules | 27 su 27 superati |
| Suite Functions completa | 32 su 33 superati nella corsa completa |
| Test ricevute ripetuto isolatamente | superato |

Il solo errore della corsa Functions completa è stato un timeout del test
ricevute a 30 secondi durante l'esecuzione congiunta dei flussi PDF, report e
backup. I log dell'emulatore mostravano le callable completate correttamente.
Il timeout del test è stato portato a 60 secondi, in coerenza con gli altri
flussi Storage/PDF, e il caso isolato è risultato positivo.

## Bundle frontend

La build usa code splitting per moduli applicativi, React e Firebase. Il chunk
più grande è Firestore:

- `vendor-firebase-firestore`: circa 466 kB, 139 kB gzip;
- `vendor-react`: circa 190 kB, 60 kB gzip;
- `vendor-firebase`: circa 114 kB, 35 kB gzip;
- moduli funzionali caricati separatamente: circa 1,5-37 kB.

Vite non segnala superamenti della soglia dimensionale. Il chunk Firestore
resta il riferimento principale per le future misurazioni.

## Warning non bloccanti

- Firebase CLI confronta `firebase-functions` stabile `7.2.2` con una release
  candidate pubblicata come `latest`; non è stato eseguito un aggiornamento
  prerelease.
- Al termine degli emulatori può comparire `MetadataLookupWarning` perché il
  progetto demo non contatta i servizi cloud reali.
- Il messaggio `SIGKILL` di Firestore compare durante lo spegnimento gestito
  dal CLI e non durante l'esecuzione dei test.

## Verifiche manuali ancora aperte

- navigazione completa di tutti i moduli da tablet e smartphone;
- percorso operativo completo con uso esclusivo da tastiera;
- zoom reale al 200% su browser fisico; il reflow equivalente è stato
  verificato automaticamente;
- lettura con tecnologia assistiva;
- messaggi di errore e recupero dei registri amministrativi e dei moduli
  secondari;
- prove operative complete di ogni modulo per ciascun ruolo;
- prova fisica di stampa e firma sui PDF generati.

## Verifica responsive e focus del 28 luglio 2026

La dashboard è stata verificata a larghezza desktop, tablet (768 px) e
smartphone (390 px). Il registro Biciclette è stato controllato anche a 390 px.
Sono stati corretti due overflow orizzontali: la navigazione mobile ora scorre
nel proprio contenitore e le tabelle larghe restano confinate nel rispettivo
contenitore. I controlli principali hanno altezza di circa 44 px o superiore.

Il passaggio da tastiera tra i moduli mostra un contorno di focus solido,
visibile e distinto. Durante il controllo non sono comparsi errori o warning
nella console del browser.

## Verifica semantica e dialoghi del 28 luglio 2026

Tutti i nove moduli disponibili sono stati caricati e ispezionati
nell'ambiente locale con dati fittizi. Non sono stati rilevati controlli senza
nome accessibile, immagini senza testo alternativo, identificatori duplicati,
dialoghi senza nome o valori positivi di `tabindex`. La validazione nativa del
modulo Biciclette porta il focus al primo campo obbligatorio non compilato e
fornisce il messaggio italiano del browser.

Il collaudo ha rilevato che, all'apertura di un dialogo, il focus rimaneva sul
comando esterno. È stata introdotta una gestione comune che:

- porta il focus al primo controllo del dialogo;
- mantiene la navigazione Tab e Maiusc+Tab all'interno del dialogo;
- restituisce il focus al comando di apertura dopo la chiusura.

Il comportamento è stato confermato nel browser sul dialogo di registrazione
della bicicletta e coperto da un test automatico. Il foglio di stile contiene
inoltre una regola `prefers-reduced-motion: reduce`; la verifica della
preferenza attiva con tecnologia assistiva resta parte del collaudo manuale.
Non sono comparsi errori o warning applicativi nella console.

## Verifica ruoli e concorrenza del 28 luglio 2026

Sono stati predisposti negli emulatori account fittizi separati per
amministratore, responsabile, operatore, volontario, tesoriere e sola lettura,
oltre a un account operatore disabilitato. L'accesso ha mostrato correttamente
nome e ruolo di ciascun profilo. Il modulo `Utenti e ruoli` è risultato
disponibile soltanto all'amministratore e ha elencato coerentemente account,
ruoli e stato attivo o disabilitato. L'account disabilitato non ha potuto
accedere.

Un utente con ruolo `read_only` ha potuto consultare il registro Biciclette,
ma il tentativo di registrazione è stato respinto dal backend e non ha creato
record. I moduli generali restano visibili ai ruoli non amministrativi in
attesa dell'approvazione degli ambiti limitati indicati nella matrice dei
permessi; il software non anticipa questa decisione organizzativa.

Due schede browser autenticate come responsabile hanno inviato
contemporaneamente due registrazioni con soli dati fittizi. Entrambe sono
state consolidate e hanno ricevuto progressivi distinti
`BICI-2026-0015` e `BICI-2026-0016`; i due registri si sono aggiornati fino a
mostrare quattro biciclette senza conflitti o duplicazioni.

## Verifica revoca della sessione del 28 luglio 2026

Il collaudo ha rilevato che il profilo applicativo veniva letto soltanto al
momento dell'accesso: la disabilitazione successiva dell'account non provocava
quindi l'uscita immediata. Il monitoraggio della sessione è stato corretto per
osservare in tempo reale `users/{uid}` e chiudere l'autenticazione quando il
profilo manca, non è leggibile oppure non ha `active: true`. Anche il login
iniziale ora rifiuta un profilo applicativo mancante o inattivo.

La prova è stata eseguita con l'account fittizio del responsabile già
autenticato. Dopo la disabilitazione in Authentication, la revoca delle custom
claims e l'impostazione di `active: false` in Firestore, l'interfaccia è tornata
alla schermata di accesso in circa 0,4 secondi. Un nuovo tentativo con le stesse
credenziali è stato respinto. Non sono stati utilizzati account o dati reali.

## Verifica contrasto e PDF del 28 luglio 2026

La misurazione dei colori dell'interfaccia ha individuato due testi secondari
sotto il rapporto WCAG di 4,5:1: il ruolo utente a 4,17:1 e date/note operative
a 4,05:1. I colori sono stati scuriti senza modificare gerarchia o layout. Le
misurazioni successive risultano rispettivamente 5,51:1 e 5,65:1.

Sono state generate nell'ambiente locale, scaricate dallo Storage Emulator e
renderizzate in PNG le tre bozze operative:

- scheda di accettazione `ACC-2026-0001`;
- scheda di collaudo `SCO-2026-0002`;
- verbale di consegna `VER-2026-0003`.

Tutti i file sono PDF 1.7 A4 di una pagina, senza campi modulo interattivi,
mantengono la marcatura permanente `BOZZA DIMOSTRATIVA - TESTI NON APPROVATI`
e presentano due spazi grafici distinti per le firme. Il rendering non mostra
testi sovrapposti, tagliati o fuori pagina; il margine testuale minimo rilevato
è circa 33 punti. La prova su carta e la firma manuale restano da eseguire.

I PDF non contengono una struttura di tag per tecnologie assistive
(`Tagged: no`). Sono quindi adatti al controllo visivo e alla stampa
dimostrativa, ma non possono ancora essere considerati accessibili a un
lettore di schermo. Questo limite deve essere risolto o compensato con un
formato alternativo accessibile prima della produzione.

Questo verbale non sostituisce il collaudo organizzativo, privacy, legale o
fiscale e non autorizza staging o produzione.

## Verifica del bypass da tastiera del 28 luglio 2026

La struttura principale non offriva un comando rapido per evitare la
navigazione ripetitiva e raggiungere direttamente il contenuto della pagina.

È stato aggiunto come primo elemento interattivo un collegamento «Salta al
contenuto principale», visibile quando riceve il focus. L'attivazione
trasferisce il focus al contenuto principale, reso focalizzabile anche senza
mouse. Gli indicatori di focus sono stati inoltre estesi ai collegamenti e alle
aree di testo.

L'ordine semantico degli elementi è stato verificato nel browser e un test
automatico conferma che l'attivazione del collegamento trasferisca il focus al
contenuto principale.

Resta aperta la verifica dell'intero percorso operativo con uso esclusivo della
tastiera, in particolare per i moduli complessi e per la firma grafica.

## Verifica del reflow equivalente al 200% del 28 luglio 2026

I nove moduli sono stati verificati a una larghezza CSS di 640 px, equivalente
allo spazio disponibile con zoom al 200% partendo da una finestra desktop di
1280 px. La prima prova ha rilevato uno scorrimento orizzontale della pagina nei
registri con tabelle.

La causa era la posizione statica conservata dalle etichette `.sr-only` delle
tabelle: i testi rimanevano correttamente nascosti e disponibili alle
tecnologie assistive, ma contribuivano alla larghezza del documento. La tecnica
CSS è stata completata con coordinate esplicite, margine negativo e
`clip-path`, senza rimuovere didascalie o nomi accessibili.

Dopo la correzione Dashboard, Soci, Biciclette, Riparazioni, Ricambi, Collaudi,
Consegne, Ricevute e Documenti mantengono tutti la larghezza del documento
entro quella della finestra. Le tabelle conservano lo scorrimento nel proprio
contenitore e la pagina scorre soltanto in verticale quando necessario.

Resta da eseguire una prova manuale con il comando di zoom reale del browser
fisico al 200%, perché l'ambiente di automazione consente di impostare la
larghezza equivalente ma non di modificare in modo affidabile lo zoom
dell'interfaccia del browser.

## Verifica di errori e recupero del 28 luglio 2026

Sono stati verificati con dati fittizi tre scenari: credenziali errate,
salvataggio di una bicicletta durante l'indisponibilità degli emulatori e
consultazione del registro Biciclette con Firestore non disponibile.

L'errore di accesso viene annunciato con `role="alert"`, riattiva il pulsante e
consente un nuovo tentativo senza ricaricare la pagina. Il testo è stato reso
applicabile sia alle credenziali errate sia all'indisponibilità dell'ambiente
demo. Il tentativo successivo con credenziali corrette ha aperto regolarmente
la dashboard.

Il salvataggio non riuscito mantiene i dati fittizi nel modulo, mostra un
avviso accessibile e riattiva il comando di registrazione. Nessun errore
tecnico o dato sensibile viene esposto all'utente.

Il registro Biciclette ora distingue una risposta proveniente dalla cache da
una risposta confermata da Firestore. Durante l'interruzione conserva gli
eventuali dati già disponibili e avvisa che possono essere dati in cache,
invece di presentare una cache vuota come un registro realmente vuoto. Dopo il
ripristino e il nuovo accesso, l'avviso scompare e il registro torna a mostrare
i dati confermati dal servizio.

La verifica deve essere estesa ai registri amministrativi, alle liste usate
nei moduli secondari e ai rispettivi flussi di scrittura.

## Estensione degli avvisi di cache del 28 luglio 2026

La distinzione fra dati confermati e dati provenienti dalla cache è stata
estesa ai registri Riparazioni, Ricambi, Collaudi e Consegne. Una risposta
confermata da Firestore aggiorna normalmente il registro e rimuove l'avviso;
una risposta dalla cache mantiene gli eventuali dati disponibili e mostra un
avviso con `role="alert"`.

I quattro registri sono stati prima caricati con Firestore disponibile e senza
avvisi. Dopo l'interruzione controllata dell'emulatore, ciascun registro ha
conservato i dati fittizi disponibili e ha dichiarato chiaramente che potevano
provenire dalla cache, invitando a verificare il servizio prima di apportare
modifiche. Nessun registro ha presentato la cache come dato aggiornato.
