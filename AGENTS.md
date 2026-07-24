# Regole per gli agenti

## Prima di intervenire

- Leggere `README.md`, il documento master e la documentazione pertinente.
- Descrivere il piano prima delle modifiche importanti.
- Segnalare rischi, assunzioni e decisioni ancora aperte.
- Non eliminare funzioni o file esistenti senza autorizzazione.
- Evitare modifiche massive non necessarie.

## Codice e configurazione

- Mantenere il codice semplice, leggibile e tipizzato.
- Scrivere l'interfaccia e i messaggi destinati agli utenti in italiano.
- Usare variabili d'ambiente e non inserire segreti nel codice.
- Non salvare credenziali Firebase amministrative nel frontend.
- Non committare `.env`, chiavi private o account di servizio.
- Applicare regole Firestore e Storage restrittive.
- Applicare le autorizzazioni lato backend, non soltanto nell'interfaccia.

## Dati, privacy e dominio

- Usare esclusivamente dati fittizi nei test e negli ambienti di sviluppo.
- Rispettare il principio di minimizzazione dei dati personali.
- Separare, quando utile, dati personali e dati tecnici.
- Non cancellare dati reali; usare cancellazione logica e audit.
- Prevedere backup, esportazioni e procedure di ripristino.
- Non prendere decisioni fiscali o legali per conto dell'associazione.
- Rendere configurabili e storicizzate le classificazioni fiscali.

## Modifiche e qualità

- Documentare ogni migrazione di dati o configurazione.
- Eseguire test e controlli proporzionati dopo ogni modifica.
- Per ogni modulo indicare obiettivo, file coinvolti e verifiche.
- Creare commit piccoli, descrittivi e coerenti.
- Prima di un deploy controllare build, test, regole, variabili e sicurezza.
- Non eseguire deploy o operazioni distruttive senza conferma esplicita.

