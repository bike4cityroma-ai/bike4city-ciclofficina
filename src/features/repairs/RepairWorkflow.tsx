import {
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import type { DemoRepair, RepairStatus } from "./demoRepairs";
import {
  authorizeRepairWork,
  observeRepairStatusHistory,
  updateRepairWorkflow,
  uploadRepairAuthorizationEvidence,
  type RepairStatusEvent,
} from "./repairService";

const transitions: Partial<Record<RepairStatus, RepairStatus[]>> = {
  Accettata: ["In attesa autorizzazione"],
  Diagnosticata: ["In attesa autorizzazione"],
  "In attesa autorizzazione": ["Annullata"],
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
      {repair.status === "In attesa autorizzazione" && (
        <RepairAuthorizationForm repair={repair} />
      )}
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
              <>
                <p className="workflow-note">
                  L’operatore che esegue il passaggio verrà assegnato
                  automaticamente alla lavorazione.
                </p>
                {repair.status === "In attesa ricambi" && (
                  <p className="workflow-note">
                    Dopo l’aggiornamento sarà nuovamente possibile registrare
                    i ricambi utilizzati.
                  </p>
                )}
              </>
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
          <button className="primary-action" type="submit" disabled={
            pending || reason.trim().length < 10
          }>
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

function RepairAuthorizationForm({ repair }: { repair: DemoRepair }) {
  const [authorizedWork, setAuthorizedWork] = useState(
    repair.proposedWork.join(", "),
  );
  const [method, setMethod] = useState<
    "Modulo firmato" | "Firma su dispositivo"
  >("Modulo firmato");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [communicatedAmount, setCommunicatedAmount] = useState(0);
  const [amountAccepted, setAmountAccepted] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [originalPaperRetained, setOriginalPaperRetained] = useState(false);
  const [physicalLocationCode, setPhysicalLocationCode] = useState("");
  const [custodianLabel, setCustodianLabel] = useState("");
  const [depositedOn, setDepositedOn] = useState("");
  const [nextStatus, setNextStatus] = useState<
    "In lavorazione" | "In attesa ricambi"
  >("In lavorazione");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const key = useRef(crypto.randomUUID());
  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true); setMessage("");
    try {
      if (!evidenceFile) {
        setMessage("Acquisire o selezionare l’evidenza prima di continuare.");
        return;
      }
      const evidenceStoragePath = await uploadRepairAuthorizationEvidence({
        repairId: repair.id,
        method,
        file: evidenceFile,
        originalPaperRetained,
        physicalLocationCode,
        custodianLabel,
        depositedOn,
      });
      await authorizeRepairWork({
        repairId: repair.id,
        authorizedWork: authorizedWork.split(",")
          .map((item) => item.trim()).filter(Boolean),
        method,
        evidenceNote,
        evidenceStoragePath,
        communicatedAmount,
        amountAccepted,
        nextStatus,
        reason,
        idempotencyKey: key.current,
      });
      key.current = crypto.randomUUID();
      setMessage("Autorizzazione registrata nell’audit.");
    } catch {
      setMessage(
        "Autorizzazione non registrata. Usare soltanto interventi proposti.",
      );
    } finally { setPending(false); }
  }
  return <form className="authorization-form" onSubmit={submit}>
    <p className="workflow-note">
      Policy approvata ACC-003: la richiesta iniziale non autorizza i lavori.
    </p>
    <p className="workflow-note">
      ACC-004-v1: sono valide operativamente soltanto le tre modalità elencate.
      Il software non attribuisce valore legale all’evidenza.
    </p>
    <label>Interventi autorizzati, separati da virgola
      <input value={authorizedWork} required maxLength={1000}
        onChange={(event) => setAuthorizedWork(event.target.value)} />
    </label>
    <label>Modalità dell’autorizzazione
      <select value={method} onChange={(event) => {
        setMethod(event.target.value as typeof method);
        setEvidenceFile(null);
        setOriginalPaperRetained(false);
        setPhysicalLocationCode("");
        setCustodianLabel("");
        setDepositedOn("");
      }}>
        <option>Modulo firmato</option>
        <option>Firma su dispositivo</option>
      </select>
    </label>
    {method === "Modulo firmato" ? <>
      <label>File firmato
        <input type="file" required accept="application/pdf,image/jpeg,image/png"
          onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)}
        />
      </label>
      <label className="checkbox-field">
        <input type="checkbox" checked={originalPaperRetained}
          onChange={(event) => setOriginalPaperRetained(event.target.checked)} />
        Originale cartaceo conservato
      </label>
      {originalPaperRetained && <>
        <label>Codice ubicazione dell’originale
          <input value={physicalLocationCode} required maxLength={80}
            onChange={(event) => setPhysicalLocationCode(event.target.value)} />
        </label>
        <label>Responsabile della custodia fittizio
          <input value={custodianLabel} required maxLength={160}
            onChange={(event) => setCustodianLabel(event.target.value)} />
        </label>
        <label>Data di deposito
          <input value={depositedOn} type="date" required
            onChange={(event) => setDepositedOn(event.target.value)} />
        </label>
      </>}
    </> : <SignaturePad onChange={setEvidenceFile} />}
    <p className="workflow-note">
      Il soggetto autorizzante è quello fissato all’accettazione secondo
      ACC-005-v1 e non può essere sostituito in questa fase.
    </p>
    <label>Riferimento dell’evidenza
      <textarea value={evidenceNote} required minLength={5} maxLength={500}
        onChange={(event) => setEvidenceNote(event.target.value)} />
    </label>
    <label>Importo comunicato dopo la diagnosi
      <input type="number" min={0} max={1000000} step="0.01"
        value={communicatedAmount} required
        onChange={(event) => setCommunicatedAmount(Number(event.target.value))}
      />
    </label>
    <label className="checkbox-field">
      <input type="checkbox" checked={amountAccepted} required
        onChange={(event) => setAmountAccepted(event.target.checked)} />
      Il soggetto autorizzante conferma esplicitamente l’importo comunicato
    </label>
    <small>
      In questa fase inserire solo riferimenti fittizi. L’acquisizione o
      l’allegato dell’evidenza sarà implementato nel flusso Storage.
    </small>
    <label>Stato dopo l’autorizzazione
      <select value={nextStatus} onChange={(event) => setNextStatus(
        event.target.value as typeof nextStatus,
      )}>
        <option>In lavorazione</option><option>In attesa ricambi</option>
      </select>
    </label>
    <label>Motivazione della registrazione
      <textarea value={reason} required minLength={10} maxLength={500}
        onChange={(event) => setReason(event.target.value)} />
    </label>
    {message && <p role="status">{message}</p>}
    <button className="primary-action" disabled={
      pending || reason.trim().length < 10 || !evidenceFile || !amountAccepted
    }>{pending ? "Registrazione…" : "Registra autorizzazione"}</button>
  </form>;
}

function SignaturePad({ onChange }: { onChange: (file: File | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const point = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * (canvas.width / bounds.width),
      y: (event.clientY - bounds.top) * (canvas.height / bounds.height),
    };
  };
  const start = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const context = event.currentTarget.getContext("2d");
    const current = point(event);
    context?.beginPath();
    context?.moveTo(current.x, current.y);
  };
  const move = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const context = event.currentTarget.getContext("2d");
    const current = point(event);
    if (context) {
      context.lineWidth = 2.5;
      context.lineCap = "round";
      context.strokeStyle = "#18332b";
      context.lineTo(current.x, current.y);
      context.stroke();
    }
  };
  const finish = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    event.currentTarget.toBlob((blob) => {
      onChange(blob
        ? new File([blob], "firma-grafica.png", { type: "image/png" })
        : null);
    }, "image/png");
  };
  const clear = () => {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  };
  return <fieldset className="signature-field">
    <legend>Firma grafica su dispositivo</legend>
    <p>
      Viene salvata soltanto l’immagine, senza pressione, velocità o altri
      dati biometrici dinamici.
    </p>
    <canvas ref={canvasRef} width={700} height={220}
      aria-label="Area firma grafica"
      onPointerDown={start} onPointerMove={move}
      onPointerUp={finish} onPointerCancel={finish} />
    <button className="text-button" type="button" onClick={clear}>
      Cancella firma
    </button>
  </fieldset>;
}
