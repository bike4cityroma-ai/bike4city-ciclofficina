import { useRef, useState, type FormEvent } from "react";
import type { DemoRepair } from "./demoRepairs";
import { manageRepairSafetyReview } from "./repairService";

type SafetyAction = "report" | "resolve";
type RiskType =
  | "damaged_battery"
  | "leak"
  | "unstable_component"
  | "other_hazard";

export function RepairSafetyDialog({
  repair,
  onClose,
}: {
  repair: DemoRepair;
  onClose: () => void;
}) {
  const resolving = repair.status === "In verifica sicurezza";
  const [action] = useState<SafetyAction>(resolving ? "resolve" : "report");
  const [riskType, setRiskType] = useState<RiskType>("damaged_battery");
  const [description, setDescription] = useState("");
  const [protectiveMeasures, setProtectiveMeasures] = useState("");
  const [protectedLocation, setProtectedLocation] = useState("");
  const [outcome, setOutcome] =
    useState<"" | "risk_mitigated" | "authorized_provider">(
      resolving ? "risk_mitigated" : "",
    );
  const [documentationReference, setDocumentationReference] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const key = useRef(crypto.randomUUID());

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      await manageRepairSafetyReview({
        repairId: repair.id,
        action,
        riskType,
        description,
        protectiveMeasures,
        protectedLocation,
        outcome,
        documentationReference,
        idempotencyKey: key.current,
      });
      key.current = crypto.randomUUID();
      setMessage(resolving
        ? "Verifica chiusa e stato precedente ripristinato."
        : "Rischio segnalato: lavorazione bloccata.");
    } catch {
      setMessage(
        "Operazione non registrata: verifica autorizzazioni e dati richiesti.",
      );
    } finally {
      setPending(false);
    }
  }

  return <div className="modal-backdrop">
    <section className="registration-dialog" role="dialog" aria-modal="true"
      aria-label={resolving
        ? "Chiudi verifica sicurezza"
        : "Segnala rischio sicurezza"}>
      <div className="detail-heading"><div>
        <p className="eyebrow">ACC-017-v1</p>
        <h2>{resolving ? "Chiudi verifica sicurezza" : "Segnala rischio"}</h2>
        <p>{repair.code} · {repair.bikeLabel}</p>
      </div><button className="close-button" type="button" onClick={onClose}
        aria-label="Chiudi modulo sicurezza">×</button></div>
      <form className="registration-form" onSubmit={submit}>
        <label>Tipo di rischio
          <select value={riskType} onChange={(event) =>
            setRiskType(event.target.value as RiskType)}>
            <option value="damaged_battery">Batteria danneggiata</option>
            <option value="leak">Perdita</option>
            <option value="unstable_component">Componente instabile</option>
            <option value="other_hazard">Altro rischio</option>
          </select>
        </label>
        <label>Ubicazione protetta
          <input value={protectedLocation} required maxLength={160}
            onChange={(event) => setProtectedLocation(event.target.value)} />
        </label>
        <label className="wide-field">Descrizione tecnica
          <textarea value={description} required maxLength={1000}
            onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label className="wide-field">Misure protettive adottate
          <textarea value={protectiveMeasures} required maxLength={1000}
            onChange={(event) => setProtectiveMeasures(event.target.value)} />
        </label>
        {resolving && <>
          <label>Esito
            <select value={outcome} onChange={(event) => setOutcome(
              event.target.value as typeof outcome,
            )}>
              <option value="risk_mitigated">Rischio mitigato</option>
              <option value="authorized_provider">
                Affidato a soggetto autorizzato
              </option>
            </select>
          </label>
          <label>Riferimento documentale
            <input value={documentationReference}
              required={outcome === "authorized_provider"} maxLength={300}
              onChange={(event) =>
                setDocumentationReference(event.target.value)} />
          </label>
        </>}
        <p className="workflow-note wide-field">
          Nessuna classificazione automatica come rifiuto e nessuno
          smaltimento automatico. Le fotografie tecniche sono facoltative.
        </p>
        {message && <p className="wide-field" role="status">{message}</p>}
        <div className="dialog-actions wide-field">
          <button className="secondary-button" type="button"
            onClick={onClose}>Annulla</button>
          <button className="primary-button" disabled={pending}>
            {pending
              ? "Registrazione…"
              : resolving ? "Chiudi verifica" : "Blocca e segnala"}
          </button>
        </div>
      </form>
    </section>
  </div>;
}
