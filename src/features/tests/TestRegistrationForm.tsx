import { type FormEvent, useEffect, useRef, useState } from "react";
import type { CheckResult } from "./demoTests";
import {
  createWorkshopTest,
  observeReadyRepairs,
  type ReadyRepair,
} from "./testService";

const definitions = [
  ["wheels", "Serraggio ruote"],
  ["tires", "Pneumatici e pressione"],
  ["brakes", "Freni"],
  ["steering", "Sterzo"],
  ["drivetrain", "Trasmissione"],
  ["gears", "Cambio"],
  ["pedals", "Pedali"],
  ["saddle", "Sella"],
  ["lights", "Luci"],
  ["bell", "Campanello"],
  ["road", "Prova su strada"],
] as const;

export function TestRegistrationForm({ onClose }: { onClose: () => void }) {
  const [repairs, setRepairs] = useState<ReadyRepair[]>([]);
  const [repairId, setRepairId] = useState("");
  const [checks, setChecks] = useState<Record<string, {
    result: CheckResult; note: string;
  }>>(() => Object.fromEntries(definitions.map(([id]) => [
    id, { result: "Conforme", note: "" },
  ])));
  const [notes, setNotes] = useState("Collaudo dimostrativo.");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const key = useRef(crypto.randomUUID());

  useEffect(() => {
    if (import.meta.env.MODE === "test") {
      const demo = { id: "repair-ready-demo", code: "RIP-2026-0099",
        bikeLabel: "Bicicletta pronta demo" };
      setRepairs([demo]); setRepairId(demo.id); return;
    }
    return observeReadyRepairs((items) => {
      setRepairs(items);
      setRepairId((current) =>
        items.some((item) => item.id === current)
          ? current : items[0]?.id ?? "");
    }, () => setMessage("Riparazioni pronte non disponibili."));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true); setMessage("");
    try {
      await createWorkshopTest({
        repairId,
        checks: Object.fromEntries(Object.entries(checks).map(([id, check]) =>
          [id, { result: check.result, note: check.note.trim() || null }])),
        notes,
        idempotencyKey: key.current,
      });
      onClose();
    } catch {
      setMessage("Collaudo non registrato. Verifica checklist e stato.");
    } finally { setPending(false); }
  }

  return <div className="modal-backdrop" role="presentation">
    <section className="registration-dialog test-dialog" role="dialog"
      aria-modal="true" aria-labelledby="new-test-title">
      <div className="detail-heading"><div><p className="eyebrow">
        Controllo finale</p><h3 id="new-test-title">Nuovo collaudo</h3></div>
        <button className="close-button" type="button" onClick={onClose}
          aria-label="Chiudi nuovo collaudo">×</button></div>
      {repairs.length > 0 ? <form className="test-form" onSubmit={submit}>
        <label>Riparazione pronta<select value={repairId}
          onChange={(event) => setRepairId(event.target.value)}>
          {repairs.map((item) => <option value={item.id} key={item.id}>
            {item.code} · {item.bikeLabel}</option>)}</select></label>
        <div className="test-check-grid">
          {definitions.map(([id, label]) => {
            const check = checks[id];
            return <fieldset key={id}><legend>{label}</legend>
              <select aria-label={`Esito ${label}`} value={check.result}
                onChange={(event) => setChecks((current) => ({
                  ...current, [id]: { ...current[id],
                    result: event.target.value as CheckResult },
                }))}>
                <option>Conforme</option><option>Non conforme</option>
                <option>Non applicabile</option>
              </select>
              {check.result !== "Conforme" && <input
                aria-label={`Nota ${label}`} required minLength={5}
                value={check.note} placeholder="Nota obbligatoria"
                onChange={(event) => setChecks((current) => ({
                  ...current, [id]: { ...current[id],
                    note: event.target.value },
                }))} />}
            </fieldset>;
          })}
        </div>
        <label>Note finali<textarea value={notes} required
          onChange={(event) => setNotes(event.target.value)} /></label>
        {message && <p role="status">{message}</p>}
        <div className="dialog-actions"><button className="text-button"
          type="button" onClick={onClose}>Annulla</button>
          <button className="primary-action" type="submit" disabled={pending}>
            {pending ? "Registrazione…" : "Consolida collaudo"}</button></div>
      </form> : <><p>Nessuna riparazione pronta per il collaudo.</p>
        {message && <p role="status">{message}</p>}</>}
    </section>
  </div>;
}
