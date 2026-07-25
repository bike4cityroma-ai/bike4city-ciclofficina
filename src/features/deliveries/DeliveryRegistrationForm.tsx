import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  createDelivery, observeDeliverableRepairs,
  type DeliverableRepair,
} from "./deliveryService";

export function DeliveryRegistrationForm({ onClose }: { onClose: () => void }) {
  const [repairs, setRepairs] = useState<DeliverableRepair[]>([]);
  const [repairId, setRepairId] = useState("");
  const [recipientType, setRecipientType] = useState("Socio");
  const [recipientLabel, setRecipientLabel] = useState("");
  const [condition, setCondition] = useState("");
  const [accessories, setAccessories] = useState("");
  const [contribution, setContribution] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [notes, setNotes] = useState("Consegna con dati interamente fittizi.");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const key = useRef(crypto.randomUUID());

  useEffect(() => {
    if (import.meta.env.MODE === "test") {
      const demo = { id: "repair-tested-demo", code: "RIP-2026-0099",
        bikeLabel: "Bicicletta collaudata demo" };
      setRepairs([demo]); setRepairId(demo.id); return;
    }
    return observeDeliverableRepairs((items) => {
      setRepairs(items);
      setRepairId((current) => items.some((item) => item.id === current)
        ? current : items[0]?.id ?? "");
    }, () => setMessage("Riparazioni collaudate non disponibili."));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setPending(true); setMessage("");
    try {
      await createDelivery({
        repairId, recipientType, recipientLabel,
        conditionSnapshot: condition,
        accessories: accessories.split(",").map((item) => item.trim())
          .filter(Boolean),
        contributionAmount: contribution === "" ? null : Number(contribution),
        declarationsAccepted: accepted,
        notes, idempotencyKey: key.current,
      });
      onClose();
    } catch {
      setMessage("Consegna non registrata. Verifica dati e collaudo.");
    } finally { setPending(false); }
  }

  return <div className="modal-backdrop" role="presentation">
    <section className="registration-dialog" role="dialog" aria-modal="true"
      aria-labelledby="new-delivery-title">
      <div className="detail-heading"><div><p className="eyebrow">
        Riconsegna</p><h3 id="new-delivery-title">Nuova consegna</h3></div>
        <button className="close-button" type="button" onClick={onClose}
          aria-label="Chiudi nuova consegna">×</button></div>
      {repairs.length > 0 ? <form className="registration-form"
        onSubmit={submit}>
        <label className="wide-field">Riparazione collaudata
          <select value={repairId}
            onChange={(event) => setRepairId(event.target.value)}>
            {repairs.map((item) => <option value={item.id} key={item.id}>
              {item.code} · {item.bikeLabel}</option>)}</select></label>
        <label>Tipo ricevente<select value={recipientType}
          onChange={(event) => setRecipientType(event.target.value)}>
          <option>Socio</option><option>Non socio</option>
          <option>Ente dimostrativo</option></select></label>
        <label>Ricevente fittizio<input value={recipientLabel} required
          onChange={(event) => setRecipientLabel(event.target.value)} /></label>
        <label className="wide-field">Condizioni alla consegna
          <textarea value={condition} required
            onChange={(event) => setCondition(event.target.value)} /></label>
        <label className="wide-field">Accessori, separati da virgola
          <input value={accessories}
            onChange={(event) => setAccessories(event.target.value)} /></label>
        <label>Contributo eventuale (€)<input type="number" min={0} step="0.01"
          value={contribution}
          onChange={(event) => setContribution(event.target.value)} /></label>
        <label className="wide-field">Note<textarea value={notes} required
          onChange={(event) => setNotes(event.target.value)} /></label>
        <label className="wide-field availability-filter">
          <input type="checkbox" checked={accepted} required
            onChange={(event) => setAccepted(event.target.checked)} />
          Confermo condizioni, accessori e dichiarazioni di consegna
        </label>
        {message && <p className="wide-field" role="status">{message}</p>}
        <div className="dialog-actions wide-field">
          <button className="text-button" type="button"
            onClick={onClose}>Annulla</button>
          <button className="primary-action" type="submit"
            disabled={pending || !accepted}>
            {pending ? "Registrazione…" : "Registra consegna"}</button>
        </div>
      </form> : <><p>Nessuna riparazione collaudata da consegnare.</p>
        {message && <p role="status">{message}</p>}</>}
    </section>
  </div>;
}
