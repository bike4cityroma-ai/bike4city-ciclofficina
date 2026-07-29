import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  createReceiptDraft, observeReceipts, type ReceiptItem,
} from "./receiptService";

const demoReceipts: ReceiptItem[] = [{
  id: "receipt-demo-1",
  code: "REC-2026-0001",
  classificationLabel: "Riparazione bicicletta",
  subjectLabel: "Utente Demo Ricevuta",
  amount: 25,
  paymentMethod: "cash",
  status: "draft_demo",
  createdLabel: "27 luglio 2026",
}];

export function ReceiptRegistry() {
  const [items, setItems] = useState(demoReceipts);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    if (import.meta.env.MODE === "test") return;
    return observeReceipts((next, fromCache) => {
      if (next.length > 0 || !fromCache) setItems(next);
      setLoadError(fromCache);
    }, () => setLoadError(true));
  }, []);
  return <section aria-labelledby="receipts-title">
    <div className="section-heading registry-heading"><div>
      <p className="eyebrow">TAX-001 incompleta</p>
      <h2 id="receipts-title">Ricevute</h2>
      <p className="section-description">
        Solo bozze dimostrative: IVA/articolo 86 e bollo sono da confermare.
      </p>
    </div><button className="primary-action" type="button"
      onClick={() => setDialogOpen(true)}>Nuova bozza ricevuta</button></div>
    {loadError && <p className="notice-banner" role="alert">
      Connessione alle ricevute non disponibile. I dati visibili possono
      provenire dalla cache: verifica gli emulatori prima di modificarli.
    </p>}
    <div className="registry-table-wrap"><table className="registry-table">
      <caption className="sr-only">Bozze ricevute dimostrative</caption>
      <thead><tr><th>Ricevuta</th><th>Soggetto</th><th>Classificazione</th>
        <th>Importo</th><th>Stato</th></tr></thead>
      <tbody>{items.map((item) => <tr key={item.id}>
        <td><span className="bike-code">{item.code}</span>
          <small>{item.createdLabel}</small></td>
        <td>{item.subjectLabel}</td>
        <td>{item.classificationLabel}</td>
        <td>{new Intl.NumberFormat("it-IT", {
          style: "currency", currency: "EUR",
        }).format(item.amount)}</td>
        <td>{item.status === "void" ? "Annullata" : "Bozza demo"}</td>
      </tr>)}</tbody>
    </table></div>
    {dialogOpen && <ReceiptDialog onClose={() => setDialogOpen(false)} />}
  </section>;
}

function ReceiptDialog({ onClose }: { onClose: () => void }) {
  const [classification, setClassification] = useState("RIPARAZIONE");
  const [subjectLabel, setSubjectLabel] = useState("");
  const [subjectTaxCode, setSubjectTaxCode] = useState("");
  const [membershipCode, setMembershipCode] = useState("");
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [repairId, setRepairId] = useState("");
  const [deliveryId, setDeliveryId] = useState("");
  const [memberId, setMemberId] = useState("");
  const [note, setNote] = useState("Bozza esclusivamente dimostrativa.");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const key = useRef(crypto.randomUUID());
  async function submit(event: FormEvent) {
    event.preventDefault(); setPending(true); setMessage("");
    try {
      await createReceiptDraft({
        classification,
        subjectType: "Persona o organizzazione",
        subjectLabel,
        subjectTaxCode,
        membershipCode,
        amount,
        paymentMethod,
        paymentReference,
        repairId,
        bikeId: "",
        deliveryId,
        memberId,
        note,
        idempotencyKey: key.current,
      });
      onClose();
    } catch {
      setMessage("Bozza non creata: verifica ruolo e collegamenti richiesti.");
    } finally { setPending(false); }
  }
  const membership = classification === "QUOTA_ASSOCIATIVA";
  return <div className="modal-backdrop"><section className="registration-dialog"
    role="dialog" aria-modal="true" aria-label="Nuova bozza ricevuta">
    <div className="detail-heading"><div><p className="eyebrow">
      REC-DRAFT-v1</p><h2>Nuova bozza ricevuta</h2></div>
      <button className="close-button" type="button" onClick={onClose}
        aria-label="Chiudi bozza ricevuta">×</button></div>
    <form className="registration-form" onSubmit={submit}>
      <label>Classificazione<select value={classification}
        onChange={(event) => {
          const value = event.target.value; setClassification(value);
          if (value === "QUOTA_ASSOCIATIVA") setAmount(10);
        }}>
        <option value="RIPARAZIONE">Riparazione bicicletta</option>
        <option value="BICI_RECUPERATA">Consegna bicicletta recuperata</option>
        <option value="EROGAZIONE_LIBERALE">Erogazione liberale</option>
        <option value="QUOTA_ASSOCIATIVA">Quota associativa</option>
      </select></label>
      <label>Nominativo o organizzazione<input value={subjectLabel} required
        onChange={(event) => setSubjectLabel(event.target.value)} /></label>
      <label>Codice fiscale facoltativo<input value={subjectTaxCode}
        onChange={(event) => setSubjectTaxCode(event.target.value)} /></label>
      <label>Importo<input type="number" min={0} step="0.01" value={amount}
        readOnly={membership}
        onChange={(event) => setAmount(Number(event.target.value))} /></label>
      <label>Pagamento<select value={paymentMethod}
        onChange={(event) => setPaymentMethod(event.target.value)}>
        <option value="cash">Contanti</option><option value="paypal">PayPal</option>
      </select></label>
      {paymentMethod === "paypal" && <label>Riferimento PayPal facoltativo
        <input value={paymentReference}
          onChange={(event) => setPaymentReference(event.target.value)} /></label>}
      {classification === "RIPARAZIONE" && <label>ID riparazione
        <input value={repairId} required
          onChange={(event) => setRepairId(event.target.value)} /></label>}
      {classification === "BICI_RECUPERATA" && <label>ID consegna
        <input value={deliveryId} required
          onChange={(event) => setDeliveryId(event.target.value)} /></label>}
      {membership && <><label>ID socio<input value={memberId} required
        onChange={(event) => setMemberId(event.target.value)} /></label>
        <label>Numero tessera<input value={membershipCode} required
          onChange={(event) => setMembershipCode(event.target.value)} /></label></>}
      <label className="wide-field">Note<textarea value={note} required
        onChange={(event) => setNote(event.target.value)} /></label>
      <p className="workflow-note wide-field">
        Il PDF riporterà “TAX-001 incompleta — non emettibile”.
      </p>
      {message && <p className="wide-field" role="status">{message}</p>}
      <div className="dialog-actions wide-field">
        <button className="secondary-button" type="button"
          onClick={onClose}>Annulla</button>
        <button className="primary-button" disabled={pending}>
          {pending ? "Creazione…" : "Crea bozza"}
        </button>
      </div>
    </form>
  </section></div>;
}
