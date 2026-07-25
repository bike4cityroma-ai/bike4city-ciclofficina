import { type FormEvent, useEffect, useRef, useState } from "react";
import type { DemoRepair } from "./demoRepairs";
import {
  observeAvailableParts,
  useRepairPart,
  type AvailablePart,
} from "./repairService";

export function RepairPartsUsage({ repair }: { repair: DemoRepair }) {
  const testParts: AvailablePart[] = import.meta.env.MODE === "test" ? [{
    id: "part-demo-test",
    code: "RIC-DEMO-001",
    description: "Cavo cambio dimostrativo",
    quantity: 3,
  }] : [];
  const [parts, setParts] = useState<AvailablePart[]>(testParts);
  const [partId, setPartId] = useState(testParts[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const key = useRef(crypto.randomUUID());

  useEffect(() => {
    if (import.meta.env.MODE === "test") return;
    return observeAvailableParts((nextParts) => {
    setParts(nextParts);
    setPartId((current) =>
      nextParts.some((part) => part.id === current)
        ? current
        : nextParts[0]?.id ?? "");
    }, () => setMessage("Magazzino ricambi non disponibile."));
  }, []);

  if (repair.status !== "In lavorazione") return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const result = await useRepairPart({
        repairId: repair.id,
        partId,
        quantity: Number(quantity),
        reason,
        idempotencyKey: key.current,
      });
      key.current = crypto.randomUUID();
      setQuantity("1");
      setReason("");
      setMessage(
        `${result.partCode} · ${result.partDescription}: usati ` +
        `${result.quantity}, disponibili ${result.quantityOnHand}.`,
      );
    } catch {
      setMessage("Utilizzo non riuscito. Verifica stato e disponibilità.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="detail-section repair-workflow">
      <h4>Inserisci ricambio usato</h4>
      {parts.length > 0 ? (
        <form onSubmit={submit}>
          <label>Ricambio disponibile
            <select value={partId}
              onChange={(event) => setPartId(event.target.value)}>
              {parts.map((part) => (
                <option value={part.id} key={part.id}>
                  {part.code} · {part.description} · disponibili {part.quantity}
                </option>
              ))}
            </select>
          </label>
          <label>Quantità
            <input type="number" min={1}
              max={parts.find((part) => part.id === partId)?.quantity ?? 1}
              value={quantity} required
              onChange={(event) => setQuantity(event.target.value)} />
          </label>
          <label>Motivazione utilizzo
            <textarea value={reason} required minLength={10} maxLength={500}
              onChange={(event) => setReason(event.target.value)} />
          </label>
          {message && <p role="status">{message}</p>}
          <button className="primary-action" type="submit"
            disabled={
              pending ||
              !partId ||
              reason.trim().length < 10 ||
              Number(quantity) < 1
            }>
            {pending ? "Registrazione…" : "Usa ricambio"}
          </button>
        </form>
      ) : <p>Nessun ricambio disponibile in magazzino.</p>}
    </div>
  );
}
