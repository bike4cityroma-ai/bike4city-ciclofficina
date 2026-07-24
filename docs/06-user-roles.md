# Ruoli utente e autorizzazioni

## Obiettivo

Definire un modello iniziale di accesso basato sui ruoli per limitare ogni
utente alle sole informazioni e operazioni necessarie. Questo documento è una
proposta tecnica: l'associazione deve approvare l'assegnazione concreta delle
responsabilità prima dell'uso con dati reali.

## Principi

- Negare l'accesso per impostazione predefinita.
- Applicare il principio del minimo privilegio.
- Verificare i permessi nel backend e nelle Firebase Security Rules.
- Non considerare sufficiente nascondere funzioni nell'interfaccia.
- Separare i dati personali dai dati tecnici quando utile.
- Consentire a una persona di avere più ruoli soltanto se esplicitamente
  autorizzata.
- Registrare in audit assegnazioni, modifiche e revoche dei ruoli.
- Revocare rapidamente l'accesso agli utenti non più autorizzati.
- Richiedere una nuova autenticazione per le operazioni particolarmente
  sensibili, quando tecnicamente opportuno.

## Ruoli

### Amministratore

Responsabile della configurazione tecnica e degli accessi.

Può:

- gestire utenti, ruoli e stato degli account;
- configurare il sistema;
- consultare tutti i registri autorizzati;
- creare, modificare e annullare documenti secondo le regole applicabili;
- gestire ricevute, esportazioni, log e backup;
- configurare classificazioni amministrative e fiscali già validate.

Non può:

- cancellare definitivamente dati reali tramite le normali funzioni operative;
- modificare retroattivamente audit e documenti già consolidati;
- decidere autonomamente classificazioni fiscali o legali.

### Responsabile ciclofficina

Coordina le attività tecniche e operative.

Può:

- gestire biciclette, donazioni e riparazioni;
- gestire ricambi e relativi movimenti;
- assegnare lavorazioni;
- gestire collaudi e consegne;
- consultare report operativi.

Non può, salvo ulteriore autorizzazione:

- amministrare utenti e ruoli;
- cambiare configurazioni fiscali;
- accedere a esportazioni contabili complete;
- modificare ricevute consolidate.

### Operatore

Esegue e documenta le lavorazioni.

Può:

- creare e aggiornare schede tecniche;
- registrare diagnosi, interventi e ricambi;
- compilare collaudi;
- aggiungere fotografie tecniche;
- aggiornare lo stato delle lavorazioni assegnate.

Non può:

- amministrare utenti o configurazioni;
- emettere o annullare ricevute senza un permesso aggiuntivo;
- esportare anagrafiche complete;
- cancellare definitivamente registrazioni.

### Volontario

Collabora alle attività assegnate con accesso minimizzato.

Può:

- visualizzare le lavorazioni assegnate;
- consultare i soli dati tecnici necessari;
- inserire note tecniche e attività svolte;
- registrare il tempo di volontariato.

Non può:

- consultare contatti, consensi o altri dati personali non necessari;
- vedere ricevute o riepiloghi economici;
- modificare assegnazioni, configurazioni o ruoli;
- completare autonomamente consegne o collaudi, salvo delega esplicita.

### Tesoriere

Gestisce gli aspetti economici autorizzati dall'associazione.

Può:

- consultare movimenti economici;
- creare, emettere e annullare ricevute secondo il flusso approvato;
- eseguire esportazioni contabili;
- consultare riepiloghi economici;
- visualizzare i riferimenti tecnici indispensabili ai documenti collegati.

Non può, salvo ulteriore autorizzazione:

- modificare lavorazioni tecniche;
- gestire utenti e ruoli;
- cambiare classificazioni fiscali senza una configurazione validata;
- cancellare ricevute o audit.

### Sola lettura

Consente la consultazione delle sole sezioni assegnate.

Può:

- leggere dati e report espressamente autorizzati.

Non può:

- creare, modificare, annullare o esportare dati, salvo permessi specifici;
- visualizzare automaticamente tutte le sezioni;
- accedere a dati personali non necessari.

## Matrice iniziale dei permessi

Legenda: **G** gestione, **L** lettura, **A** accesso limitato o assegnato,
**—** nessun accesso predefinito.

| Area | Amministratore | Responsabile | Operatore | Volontario | Tesoriere | Sola lettura |
|---|---:|---:|---:|---:|---:|---:|
| Utenti e ruoli | G | — | — | — | — | — |
| Configurazione generale | G | L | — | — | L | L |
| Soci e dati personali | G | G | A | — | A | A |
| Biciclette e donazioni | G | G | G | A | L | A |
| Riparazioni | G | G | G | A | L | A |
| Ricambi e movimenti | G | G | G | A | L | A |
| Collaudi | G | G | G | A | L | A |
| Consegne | G | G | G | L | L | A |
| Ricevute | G | L | — | — | G | A |
| Esportazioni operative | G | G | A | — | L | A |
| Esportazioni contabili | G | — | — | — | G | A |
| Audit | G | L | A | — | L | A |
| Backup e ripristino | G | — | — | — | L | — |

La matrice rappresenta valori predefiniti, non autorizzazioni definitive. Le
colonne **A** richiedono una limitazione esplicita per ambito, record o campi.

## Modello tecnico proposto

Ogni account in `users/{uid}` dovrebbe contenere soltanto i metadati necessari,
ad esempio:

```ts
type UserRole =
  | "admin"
  | "workshop_manager"
  | "operator"
  | "volunteer"
  | "treasurer"
  | "read_only";

interface UserAccess {
  roles: UserRole[];
  active: boolean;
  scopeIds: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

I ruoli non devono essere modificabili dal titolare dell'account. Le operazioni
privilegiate devono passare da una Cloud Function o da un altro backend
autorizzato. Le custom claims possono accelerare i controlli generali, ma
Firestore deve conservare lo stato applicativo e l'audit delle assegnazioni.

## Operazioni da registrare in audit

- creazione, sospensione e riattivazione di un account;
- assegnazione o revoca di un ruolo;
- accesso o esportazione di insiemi rilevanti di dati personali;
- emissione e annullamento di ricevute;
- modifica delle configurazioni amministrative;
- avvio e risultato di backup o ripristino;
- tentativi rifiutati relativi a operazioni sensibili, quando disponibili.

L'audit deve essere append-only per gli utenti ordinari e non deve contenere
più dati personali del necessario.

## Decisioni aperte

- Stabilire se i ruoli multipli siano ammessi e chi possa approvarli.
- Definire quali dati personali servano realmente a operatori e responsabili.
- Stabilire chi possa emettere, correggere e annullare ricevute.
- Definire l'ambito della modalità di sola lettura.
- Stabilire durata e modalità di conservazione dei log.
- Valutare l'obbligo di autenticazione a più fattori per i ruoli privilegiati.
- Definire il processo periodico di revisione e revoca degli accessi.

## Verifiche previste

- test unitari della risoluzione dei permessi;
- test delle Firestore Security Rules per ogni ruolo;
- test delle Storage Security Rules per fotografie e documenti;
- test di accesso negato ai dati personali per i volontari;
- test di separazione tra permessi tecnici e contabili;
- test di revoca immediata degli account disattivati;
- verifica manuale dell'audit per assegnazione e revoca dei ruoli.
