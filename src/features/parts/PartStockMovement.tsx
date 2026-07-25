import { type FormEvent, useRef, useState } from "react";
import type { DemoPart } from "./demoParts";
import { recordPartMovement } from "./partService";

type Operation = "in" | "return" | "adjustment";

export function PartStockMovement({ part }: { part: DemoPart }) {
  const [operation, setOperation] = useState<Operation>("in");
  const [quantity, setQuantity] = useState("1");
  const [relatedCode, setRelatedCode] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const key = useRef(crypto.randomUUID());

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const result = await recordPartMovement({
        partId: part.id,
        operation,
        quantity: Number(quantity),
        relatedCode: relatedCode.trim() || null,
        reason,
        idempotencyKey: key.current,
      });
      key.current = crypto.randomUUID();
      setQuantity("1");
      setRelatedCode("");
      setReason("");
      setMessage(
        `Movimento registrato: giacenza ${result.previousQuantity} → ` +
        `${result.quantityOnHand}.`,
      );
    } catch {
      setMessage(
        "Movimento non riuscito. Verifica quantità, giacenza e autorizzazioni.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="detail-section repair-workflow">
      <h4>Nuovo movimento</h4>
      <form onSubmit={submit}>
        <label>Operazione
          <select value={operation} onChange={(event) => {
            const next = event.target.value as Operation;
            setOperation(next);
            if (next !== "adjustment" && Number(quantity) < 1) setQuantity("1");
          }}>
            <option value="in">Carico aggiuntivo</option>
            <option value="return">Reso in magazzino</option>
            <option value="adjustment">Rettifica inventariale</option>
          </select>
        </label>
        <label>
          {operation === "adjustment"
            ? "Variazione quantità (positiva o negativa)"
            : "Quantità"}
          <input type="number" value={quantity} required
            min={operation === "adjustment" ? -100000 : 1}
            max={100000}
            onChange={(event) => setQuantity(event.target.value)} />
        </label>
        <label>Codice collegato, facoltativo
          <input value={relatedCode} maxLength={160}
            placeholder="BICI-… o RIP-…"
            onChange={(event) => setRelatedCode(event.target.value)} />
        </label>
        <label>Motivazione
          <textarea value={reason} required minLength={10} maxLength={500}
            onChange={(event) => setReason(event.target.value)} />
        </label>
        {operation === "adjustment" && (
          <p className="workflow-note">
            Usa un valore negativo per correggere una giacenza in eccesso.
            La quantità risultante non può essere inferiore a zero.
          </p>
        )}
        {message && <p role="status">{message}</p>}
        <button className="primary-action" type="submit" disabled={
          pending || Number(quantity) === 0 || reason.trim().length < 10
        }>
          {pending ? "Registrazione…" : "Registra movimento"}
        </button>
      </form>
    </div>
  );
}
