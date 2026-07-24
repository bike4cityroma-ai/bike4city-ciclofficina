# Panoramica del progetto

## Scopo

Bike4City Ciclofficina è il progetto di un gestionale web responsive per
**InControPedale**, ciclofficina popolare gestita da **APS Bike4City ETS** di
Roma.

Il sistema dovrà sostenere il lavoro quotidiano di responsabili, operatori,
volontari e tesoriere, mantenendo separati gli ambiti tecnici, personali e
amministrativi. Non dovrà formulare valutazioni fiscali o legali: le relative
classificazioni saranno configurabili, storicizzate e validate
dall'associazione e dai professionisti incaricati.

## Stato

Il progetto è in fase di analisi e inizializzazione:

- non esiste ancora un'applicazione eseguibile;
- non è configurato un ambiente Firebase;
- non sono ammessi dati personali reali;
- architettura, modello dati e sicurezza devono essere approvati;
- il repository deve restare privato.

## Obiettivi

1. Gestire utenti, soci, ruoli e autorizzazioni.
2. Tracciare l'intero ciclo di vita delle biciclette.
3. Gestire accettazione, diagnosi, lavorazione, collaudo e consegna.
4. Registrare ricambi recuperati, acquistati e impiegati.
5. Produrre ricevute e documenti con progressivi sicuri.
6. Conservare audit e storico delle operazioni rilevanti.
7. Fornire esportazioni, backup, ripristino e statistiche.
8. Rendere configurabili le classificazioni amministrative e fiscali.
9. Offrire un'interfaccia italiana, accessibile e adatta anche a tablet.

## Utenti interessati

- amministratori del sistema;
- responsabili della ciclofficina;
- operatori;
- volontari;
- tesoriere;
- utenti autorizzati alla sola lettura.

I ruoli e i relativi limiti sono descritti in
[`06-user-roles.md`](06-user-roles.md).

## Perimetro iniziale

Il primo prototipo comprenderà:

- autenticazione;
- dashboard essenziale;
- registro biciclette;
- registro riparazioni;
- navigazione basata sui permessi;
- dati dimostrativi interamente fittizi.

Il prototipo non comprenderà ancora:

- dati reali;
- ricevute con validità operativa;
- interpretazioni fiscali automatizzate;
- firme elettroniche;
- integrazioni contabili esterne;
- pubblicazione in produzione.

## Principi guida

- minimizzazione dei dati personali;
- negazione dell'accesso per impostazione predefinita;
- autorizzazioni applicate anche nel backend;
- cancellazione logica e audit;
- progressivi generati in modo atomico;
- configurazioni amministrative versionate;
- dipendenze limitate e codice TypeScript leggibile;
- sviluppo incrementale con test proporzionati;
- nessun deploy senza conferma esplicita.

## Risultati attesi per fase

| Fase | Risultato |
|---|---|
| Analisi | Requisiti, architettura, dati, sicurezza e flussi approvati |
| Repository | Struttura completa, repository privato e primo commit |
| Prototipo | Login, dashboard, biciclette e riparazioni con dati fittizi |
| Firebase | Emulatori, servizi, regole, indici e variabili configurati |
| Moduli | Funzioni operative realizzate e verificate una alla volta |
| Collaudo | Test automatici, checklist manuale e dati demo |
| Deploy | Pubblicazione approvata dopo controllo di sicurezza |

## Criteri generali di successo

- ogni ruolo accede soltanto alle risorse necessarie;
- nessun progressivo può essere duplicato per concorrenza;
- ricevute e audit non sono eliminabili dai normali utenti;
- fotografie e documenti non sono pubblici;
- esportazioni e backup rispettano i permessi;
- l'applicazione è utilizzabile da computer, tablet e smartphone;
- messaggi e interfaccia sono in italiano;
- procedure operative e di ripristino sono documentate e provate.

## Vincoli e dipendenze

- approvazione dell'associazione sulle responsabilità interne;
- validazione professionale delle configurazioni fiscali e legali;
- disponibilità di ambienti Firebase distinti;
- definizione dei tempi di conservazione;
- approvazione della licenza definitiva;
- disponibilità di logo e dati associativi validati per i documenti.

## Decisioni aperte

- confermare React, TypeScript e Vite;
- stabilire se siano ammessi ruoli multipli;
- definire i dati minimi da conservare per soci e utenti;
- stabilire firme e valore operativo dei documenti;
- scegliere la strategia di backup;
- definire gli ambienti Firebase e i rispettivi responsabili;
- approvare la licenza definitiva.
