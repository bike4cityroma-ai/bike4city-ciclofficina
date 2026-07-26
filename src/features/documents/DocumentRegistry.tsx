import { useEffect, useState, type FormEvent } from "react";
import {
  createOperationalDocument,
  getDocumentUrl,
  observeDocuments,
  type OperationalDocument,
  type OperationalDocumentType,
} from "./documentService";

const demoDocuments: OperationalDocument[] = [{
  id: "document-demo-acceptance",
  code: "ACC-2026-0001",
  title: "Scheda di accettazione",
  type: "acceptance",
  status: "draft",
  sourceCode: "RIP-2026-0009",
  modelVersion: "demo-v1",
  storagePath:
    "documents/acceptance/repair-demo-0009/document-demo-acceptance.pdf",
  createdLabel: "25 lug 2026, 12:00",
}];

const sources: Record<OperationalDocumentType, Array<{
  id: string; label: string;
}>> = {
  acceptance: [
    { id: "repair-demo-0009", label: "RIP-2026-0009 · Trekking blu" },
    { id: "repair-demo-ready-0008", label: "RIP-2026-0008 · City bike verde" },
  ],
  workshop_test: [
    { id: "test-demo-positive-0007", label: "COL-2026-0007 · Esito positivo" },
  ],
  delivery_report: [
    { id: "delivery-demo-0004", label: "CON-2026-0004 · Ente Sociale Demo" },
  ],
};

const typeLabels: Record<OperationalDocumentType, string> = {
  acceptance: "Scheda di accettazione",
  workshop_test: "Scheda di collaudo",
  delivery_report: "Verbale di consegna",
};

export function DocumentRegistry() {
  const [documents, setDocuments] = useState<OperationalDocument[]>(
    import.meta.env.MODE === "test" ? demoDocuments : [],
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (import.meta.env.MODE === "test") return;
    return observeDocuments(setDocuments, () =>
      setMessage("Impossibile caricare i documenti."));
  }, []);
  const openPdf = async (document: OperationalDocument) => {
    try {
      const url = await getDocumentUrl(document.id);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setMessage("PDF non disponibile o accesso non autorizzato.");
    }
  };
  return <section aria-labelledby="documents-title">
    <div className="section-heading"><div>
      <p className="eyebrow">PDF privati e versionati</p>
      <h2 id="documents-title">Documenti</h2>
    </div><button className="secondary-button" type="button"
      onClick={() => setDialogOpen(true)}>Genera bozza PDF</button></div>
    <div className="notice-banner" role="note">
      <strong>Solo bozze dimostrative</strong>
      <span>Testi e firme non sono approvati. Questi file non costituiscono
        documenti consolidati o legalmente validi.</span>
    </div>
    {message && <p role="status">{message}</p>}
    <div className="registry-table-wrap"><table className="registry-table">
      <thead><tr><th>Codice</th><th>Documento</th><th>Collegamento</th>
        <th>Stato</th><th>Creato</th><th /></tr></thead>
      <tbody>{documents.map((document) => <tr key={document.id}>
        <td>{document.code}</td><td>{document.title}</td>
        <td>{document.sourceCode}</td><td>Bozza non approvata</td>
        <td>{document.createdLabel}</td>
        <td><button className="text-button" type="button"
          onClick={() => void openPdf(document)}>Apri PDF</button></td>
      </tr>)}</tbody>
    </table></div>
    {dialogOpen && <DocumentDialog onClose={() => setDialogOpen(false)}
      onCreated={(code) => {
        setDialogOpen(false);
        setMessage(`Bozza ${code} generata e archiviata.`);
      }} />}
  </section>;
}

function DocumentDialog({ onClose, onCreated }: {
  onClose: () => void; onCreated: (code: string) => void;
}) {
  const [type, setType] = useState<OperationalDocumentType>("acceptance");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true); setError("");
    try {
      const result = await createOperationalDocument(
        type, String(data.get("entityId")),
      );
      onCreated(result.code);
    } catch {
      setError("Generazione non riuscita. Verificare collegamento e permessi.");
    } finally { setPending(false); }
  };
  return <div className="modal-backdrop"><div className="registration-dialog"
    role="dialog" aria-modal="true" aria-label="Genera bozza PDF">
    <h2>Genera bozza PDF</h2>
    <p>Il PDF conterrà un avviso permanente di testo non approvato.</p>
    <form onSubmit={submit}>
      <label>Tipo documento<select value={type}
        onChange={(event) => setType(
          event.target.value as OperationalDocumentType,
        )}>
        {Object.entries(typeLabels).map(([value, label]) =>
          <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label>Registro collegato<select name="entityId" key={type}>
        {sources[type].map((source) =>
          <option value={source.id} key={source.id}>{source.label}</option>)}
      </select></label>
      {type === "acceptance" && <p>
        Testo privacy e condizioni del servizio: da approvare.
      </p>}
      {type === "workshop_test" && <p>
        Qualifica del collaudatore e prova su strada: da approvare.
      </p>}
      {type === "delivery_report" && <p>
        Dichiarazioni di consegna e firme richieste: da approvare.
      </p>}
      {error && <p role="alert">{error}</p>}
      <div className="dialog-actions">
        <button className="secondary-button" type="button"
          onClick={onClose}>Annulla</button>
        <button className="primary-button" disabled={pending}>
          {pending ? "Generazione…" : "Genera e archivia"}
        </button>
      </div>
    </form>
  </div></div>;
}
