import { type FormEvent, useEffect, useRef, useState } from "react";
import { FirebaseError } from "firebase/app";
import {
  bikeStatusTransitions,
  type DemoBike,
} from "./demoBikes";
import {
  observeBikeStatusHistory,
  updateBikeStatus,
  type BikeStatusEvent,
} from "./bikeService";

interface Props {
  bike: DemoBike;
}

export function BikeStatusWorkflow({ bike }: Props) {
  const nextStatuses = bikeStatusTransitions[bike.status] ?? [];
  const [newStatus, setNewStatus] = useState<string>(nextStatuses[0] ?? "");
  const [reason, setReason] = useState("");
  const [events, setEvents] = useState<BikeStatusEvent[]>([]);
  const [historyError, setHistoryError] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [pending, setPending] = useState(false);
  const idempotencyKey = useRef(crypto.randomUUID());

  useEffect(() => {
    setNewStatus(nextStatuses[0] ?? "");
  }, [bike.status]);

  useEffect(
    () => {
      if (import.meta.env.MODE === "test") return;
      return observeBikeStatusHistory(
        bike.id,
        (nextEvents) => {
          setEvents(nextEvents);
          setHistoryError(false);
        },
        () => setHistoryError(true),
      );
    },
    [bike.id],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newStatus) return;
    setPending(true);
    setSubmitError("");
    try {
      await updateBikeStatus(
        bike.id,
        newStatus,
        reason,
        idempotencyKey.current,
      );
      setReason("");
      idempotencyKey.current = crypto.randomUUID();
    } catch (error) {
      if (error instanceof FirebaseError) {
        const messages: Record<string, string> = {
          "functions/unavailable":
            "Servizio locale non disponibile. Avvia Firebase Emulator Suite.",
          "functions/unauthenticated":
            "Sessione scaduta. Esci e accedi nuovamente.",
          "functions/permission-denied":
            "Il profilo non è autorizzato a modificare lo stato.",
          "functions/failed-precondition":
            "La transizione selezionata non è consentita dallo stato attuale.",
        };
        setSubmitError(
          messages[error.code] ||
            "Aggiornamento non riuscito. Riprova o controlla gli emulatori.",
        );
      } else {
        setSubmitError("Aggiornamento non riuscito. Riprova.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="detail-section status-workflow">
      <h4>Avanzamento stato</h4>
      {nextStatuses.length > 0 ? (
        <form onSubmit={handleSubmit}>
          <label htmlFor={`next-status-${bike.id}`}>Nuovo stato</label>
          <select
            id={`next-status-${bike.id}`}
            value={newStatus}
            onChange={(event) => setNewStatus(event.target.value)}
          >
            {nextStatuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
          <label htmlFor={`status-reason-${bike.id}`}>
            Motivazione tecnica
          </label>
          <textarea
            id={`status-reason-${bike.id}`}
            value={reason}
            minLength={10}
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Descrivi la valutazione o il lavoro completato"
            required
          />
          {submitError && <p role="alert">{submitError}</p>}
          <button className="primary-action" type="submit" disabled={pending}>
            {pending ? "Aggiornamento…" : "Aggiorna stato"}
          </button>
        </form>
      ) : (
        <p>
          {bike.status === "Pronta"
            ? "La consegna viene registrata dal modulo Consegne."
            : "Non sono previsti avanzamenti manuali da questo stato."}
        </p>
      )}

      <h4>Storico stato</h4>
      {historyError && (
        <p role="alert">Storico non disponibile in questo momento.</p>
      )}
      {!historyError && events.length === 0 && (
        <p>Nessun cambio di stato registrato.</p>
      )}
      {events.length > 0 && (
        <ol className="status-history">
          {events.map((event) => (
            <li key={event.id}>
              <strong>
                {event.from} → {event.to}
              </strong>
              <span>{event.reason}</span>
              <small>{event.changedLabel}</small>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
