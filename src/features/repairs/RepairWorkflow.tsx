import { type FormEvent, useEffect, useRef, useState } from "react";
import type { DemoRepair, RepairStatus } from "./demoRepairs";
import {
  observeRepairStatusHistory,
  updateRepairWorkflow,
  type RepairStatusEvent,
} from "./repairService";

const transitions: Partial<Record<RepairStatus, RepairStatus[]>> = {
  Accettata: ["Diagnosticata"],
  Diagnosticata: [
    "In attesa autorizzazione",
    "In attesa ricambi",
    "In lavorazione",
  ],
  "In attesa autorizzazione": [
    "In attesa ricambi",
    "In lavorazione",
    "Annullata",
  ],
  "In attesa ricambi": ["In lavorazione"],
  "In lavorazione": ["In attesa ricambi", "Pronta"],
  Pronta: ["In lavorazione"],
};

export function RepairWorkflow({ repair }: { repair: DemoRepair }) {
  const nextStatuses = transitions[repair.status] ?? [];
  const [newStatus, setNewStatus] = useState(nextStatuses[0] ?? "");
  const [diagnosis, setDiagnosis] = useState("");
  const [proposedWork, setProposedWork] = useState("");
  const [reason, setReason] = useState("");
  const [completedWork, setCompletedWork] = useState("");
  const [minutesSpent, setMinutesSpent] = useState("");
  const [noPartsUsed, setNoPartsUsed] = useState(false);
  const [events, setEvents] = useState<RepairStatusEvent[]>([]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const key = useRef(crypto.randomUUID());

  useEffect(() => setNewStatus(nextStatuses[0] ?? ""), [repair.status]);
  useEffect(() => observeRepairStatusHistory(
    repair.id, setEvents, () => setMessage("Storico non disponibile."),
  ), [repair.id]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      await updateRepairWorkflow({
        repairId: repair.id,
        newStatus,
        reason,
        diagnosis,
        proposedWork: proposedWork.split(",").map((item) => item.trim())
          .filter(Boolean),
        completedWork: completedWork.split(",").map((item) => item.trim())
          .filter(Boolean),
        minutesSpent: Number(minutesSpent || 0),
        noPartsUsed,
        idempotencyKey: key.current,
      });
      key.current = crypto.randomUUID();
      setReason("");
      setDiagnosis("");
      setProposedWork("");
      setCompletedWork("");
      setMinutesSpent("");
      setNoPartsUsed(false);
      setMessage("Aggiornamento registrato.");
    } catch {
      setMessage("Aggiornamento non riuscito. Verifica dati e autorizzazioni.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="detail-section repair-workflow">
      <h4>Avanzamento riparazione</h4>
      {nextStatuses.length > 0 ? (
        <form onSubmit={submit}>
          {repair.status === "Accettata" && <>
            <label>Diagnosi tecnica
              <textarea value={diagnosis} required minLength={10}
                maxLength={2000}
                onChange={(event) => setDiagnosis(event.target.value)} />
            </label>
            <label>Interventi proposti, separati da virgola
              <input value={proposedWork} required maxLength={1000}
                onChange={(event) => setProposedWork(event.target.value)} />
            </label>
          </>}
          <label>Nuovo stato
            <select value={newStatus}
              onChange={(event) =>
                setNewStatus(event.target.value as RepairStatus)}>
              {nextStatuses.map((status) =>
                <option key={status}>{status}</option>)}
            </select>
          </label>
          {newStatus === "In lavorazione" &&
            repair.status !== "In lavorazione" && (
              <p className="workflow-note">
                L’operatore che esegue il passaggio verrà assegnato
                automaticamente alla lavorazione.
              </p>
            )}
          {repair.status === "In lavorazione" && newStatus === "Pronta" && <>
            <label>Interventi eseguiti, separati da virgola
              <input value={completedWork} required maxLength={1500}
                onChange={(event) => setCompletedWork(event.target.value)} />
            </label>
            <label>Tempo totale impiegato, in minuti
              <input value={minutesSpent} type="number" required min={1}
                max={100000}
                onChange={(event) => setMinutesSpent(event.target.value)} />
            </label>
            {repair.parts.length === 0 && (
              <label className="checkbox-field">
                <input type="checkbox" checked={noPartsUsed}
                  onChange={(event) => setNoPartsUsed(event.target.checked)} />
                Confermo che non sono stati utilizzati ricambi
              </label>
            )}
          </>}
          <label>Motivazione tecnica
            <textarea value={reason} required minLength={10} maxLength={1000}
              onChange={(event) => setReason(event.target.value)} />
          </label>
          {message && <p role="status">{message}</p>}
          <button className="primary-action" type="submit" disabled={pending}>
            {pending ? "Aggiornamento…" :
              repair.status === "Accettata" ? "Registra diagnosi" :
                "Aggiorna stato"}
          </button>
        </form>
      ) : <p>Nessun avanzamento manuale disponibile da questo stato.</p>}
      <h4>Storico avanzamenti</h4>
      {events.length > 0 ? <ul className="detail-list">
        {events.map((item) => <li key={item.id}>
          <strong>{item.from} → {item.to}</strong><br />
          {item.reason} · {item.changedLabel}
        </li>)}
      </ul> : <p>Nessun avanzamento registrato.</p>}
    </div>
  );
}
