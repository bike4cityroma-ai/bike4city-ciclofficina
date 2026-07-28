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
| Test frontend | 24 su 24 superati |
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
- contrasto e zoom al 200%;
- lettura con tecnologia assistiva;
- messaggi di errore e recupero osservati dall'interfaccia;
- prove operative per ogni ruolo con tentativi non autorizzati;
- concorrenza osservata da due sessioni browser;
- stampa e firme sui PDF generati.

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

Questo verbale non sostituisce il collaudo organizzativo, privacy, legale o
fiscale e non autorizza staging o produzione.
