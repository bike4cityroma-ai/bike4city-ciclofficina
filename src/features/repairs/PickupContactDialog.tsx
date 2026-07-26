import { useRef, useState, type FormEvent } from "react";
import { recordPickupContact } from "../deliveries/deliveryService";
import type { DemoRepair } from "./demoRepairs";

type PickupAction =
  | "ready_notice"
  | "reminder"
  | "final_notice"
  | "open_overdue_review";
type PickupChannel = "phone" | "sms" | "email" | "written" | "internal";

export function PickupContactDialog({
  repair,
  onClose,
}: {
  repair: DemoRepair;
  onClose: () => void;
}) {
  const [action, setAction] = useState<PickupAction>("ready_notice");
  const [channel, setChannel] = useState<PickupChannel>("phone");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const key = useRef(crypto.randomUUID());

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      await recordPickupContact({
        repairId: repair.id,
        action,
        channel: action === "open_overdue_review" ? "internal" : channel,
        note,
        idempotencyKey: key.current,
      });
      key.current = crypto.randomUUID();
      setMessage("Evento di ritiro registrato e auditato.");
    } catch {
      setMessage(
        "Operazione non registrata: verifica ruolo, sequenza e termini previsti.",
      );
    } finally {
      setPending(false);
    }
  }

  return <div className="modal-backdrop">
    <section className="registration-dialog" role="dialog" aria-modal="true"
      aria-label="Gestisci mancato ritiro">
      <div className="detail-heading"><div>
        <p className="eyebrow">ACC-016-v1</p>
        <h2>Gestisci mancato ritiro</h2>
        <p>{repair.code} · {repair.bikeLabel}</p>
      </div><button className="close-button" type="button" onClick={onClose}
        aria-label="Chiudi gestione mancato ritiro">×</button></div>
      <form className="registration-form" onSubmit={submit}>
        <label>Evento
          <select value={action} onChange={(event) => {
            const nextAction = event.target.value as PickupAction;
            setAction(nextAction);
            if (nextAction !== "open_overdue_review" &&
                channel === "internal") setChannel("phone");
          }}>
            <option value="ready_notice">Disponibilità comunicata</option>
            <option value="reminder">Promemoria dopo 15 giorni</option>
            <option value="final_notice">Preavviso finale dopo 30 giorni</option>
            <option value="open_overdue_review">
              Apri revisione dopo 45 giorni
            </option>
          </select>
        </label>
        {action !== "open_overdue_review" && <label>Canale
          <select value={channel} onChange={(event) =>
            setChannel(event.target.value as PickupChannel)}>
            <option value="phone">Telefono</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
            <option value="written">Comunicazione scritta</option>
          </select>
        </label>}
        <label className="wide-field">Nota e riferimento del contatto
          <textarea value={note} required maxLength={1000}
            onChange={(event) => setNote(event.target.value)} />
        </label>
        <p className="workflow-note wide-field">
          I contatti non autorizzano lavorazioni. Il backend applica la
          sequenza 15/30/45 giorni; la revisione è riservata
          all’amministratore e non trasferisce la proprietà.
        </p>
        {message && <p className="wide-field" role="status">{message}</p>}
        <div className="dialog-actions wide-field">
          <button className="secondary-button" type="button"
            onClick={onClose}>Annulla</button>
          <button className="primary-button" disabled={pending}>
            {pending ? "Registrazione…" : "Registra evento"}
          </button>
        </div>
      </form>
    </section>
  </div>;
}
