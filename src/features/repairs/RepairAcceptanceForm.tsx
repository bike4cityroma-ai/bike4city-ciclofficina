import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
import { createRepair } from "./repairService";

interface Props {
  onClose: () => void;
}

const initialValues = {
  customerType: "Socio" as "Socio" | "Non socio",
  customerLabel: "",
  bikeLabel: "",
  frameNumber: "",
  declaredIssue: "",
  requestedWork: "",
  expectedDeliveryDate: "",
  notes: "Accettazione dimostrativa con dati interamente fittizi.",
};

export function RepairAcceptanceForm({ onClose }: Props) {
  const [values, setValues] = useState(initialValues);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const idempotencyKey = useRef(crypto.randomUUID());

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await createRepair({
        ...values,
        idempotencyKey: idempotencyKey.current,
        frameNumber: values.frameNumber.trim() || null,
        expectedDeliveryDate: values.expectedDeliveryDate || null,
        requestedWork: values.requestedWork
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      });
      onClose();
    } catch {
      setError(
        "Registrazione non riuscita. Verifica emulatori e autorizzazioni.",
      );
    } finally {
      setPending(false);
    }
  }

  function field(name: keyof typeof initialValues) {
    return {
      value: values[name],
      onChange: (
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => setValues((current) => ({
        ...current,
        [name]: event.target.value,
      })),
    };
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="registration-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="repair-acceptance-title"
      >
        <div className="detail-heading">
          <div>
            <p className="eyebrow">Nuova accettazione</p>
            <h3 id="repair-acceptance-title">Registra riparazione</h3>
          </div>
          <button className="close-button" type="button" onClick={onClose}
            aria-label="Chiudi registrazione riparazione">×</button>
        </div>
        <p className="notice-banner">
          Inserisci esclusivamente nominativi e riferimenti fittizi.
        </p>
        <form className="registration-form" onSubmit={handleSubmit}>
          <label>Tipologia utente
            <select value={values.customerType} onChange={(event) =>
              setValues((current) => ({
                ...current,
                customerType: event.target.value as "Socio" | "Non socio",
              }))}>
              <option>Socio</option><option>Non socio</option>
            </select>
          </label>
          <label>Riferimento utente fittizio
            <input {...field("customerLabel")} required maxLength={160} />
          </label>
          <label>Descrizione bicicletta
            <input {...field("bikeLabel")} required maxLength={160} />
          </label>
          <label>Numero telaio
            <input {...field("frameNumber")} maxLength={160} />
          </label>
          <label className="wide-field">Problema dichiarato
            <textarea {...field("declaredIssue")} required maxLength={1000} />
          </label>
          <label className="wide-field">Interventi richiesti, separati da virgola
            <input {...field("requestedWork")} required maxLength={1000} />
          </label>
          <label>Consegna prevista
            <input {...field("expectedDeliveryDate")} type="date" />
          </label>
          <label className="wide-field">Note
            <textarea {...field("notes")} required maxLength={1000} />
          </label>
          {error && <p className="wide-field" role="alert">{error}</p>}
          <div className="dialog-actions wide-field">
            <button className="text-button" type="button"
              onClick={onClose}>Annulla</button>
            <button className="primary-action" type="submit" disabled={pending}>
              {pending ? "Registrazione…" : "Registra riparazione"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
