import {
  type ChangeEvent,
  type FormEvent,
  useRef,
  useState,
} from "react";
import { createBike } from "./bikeService";

interface Props {
  onClose: () => void;
}

const initialValues = {
  brand: "",
  model: "",
  color: "",
  type: "City bike",
  frameSize: "M",
  frameNumber: "",
  condition: "",
  location: "Zona accettazione",
  intendedDestination: "Da definire",
  accessories: "",
  notes: "Registrazione dimostrativa con dati fittizi.",
};

export function BikeRegistrationForm({ onClose }: Props) {
  const [values, setValues] = useState(initialValues);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const idempotencyKey = useRef(crypto.randomUUID());

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await createBike({
        ...values,
        idempotencyKey: idempotencyKey.current,
        frameNumber: values.frameNumber.trim() || null,
        status: "Da valutare",
        accessories: values.accessories
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      });
      onClose();
    } catch {
      setError("Registrazione non riuscita. Verifica emulatori e autorizzazioni.");
    } finally {
      setPending(false);
    }
  }

  function field(name: keyof typeof initialValues) {
    return {
      value: values[name],
      onChange: (
      event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => setValues((current) => ({ ...current, [name]: event.target.value })),
    };
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="registration-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="registration-title"
      >
        <div className="detail-heading">
          <div>
            <p className="eyebrow">Nuovo ingresso</p>
            <h3 id="registration-title">Registra bicicletta</h3>
          </div>
          <button
            className="close-button"
            type="button"
            onClick={onClose}
            aria-label="Chiudi registrazione"
          >
            ×
          </button>
        </div>
        <p className="section-description">
          Usa soltanto dati fittizi. Il codice viene assegnato automaticamente.
        </p>
        <form className="registration-form" onSubmit={handleSubmit}>
          <label>Marca<input {...field("brand")} required maxLength={120} /></label>
          <label>Modello<input {...field("model")} required maxLength={120} /></label>
          <label>Colore<input {...field("color")} required maxLength={120} /></label>
          <label>Tipologia<input {...field("type")} required maxLength={120} /></label>
          <label>Misura telaio<input {...field("frameSize")} required maxLength={40} /></label>
          <label>Numero telaio<input {...field("frameNumber")} maxLength={120} /></label>
          <label className="wide-field">Condizioni<textarea {...field("condition")} required maxLength={500} /></label>
          <label>Ubicazione<input {...field("location")} required maxLength={120} /></label>
          <label>Destinazione prevista<input {...field("intendedDestination")} required maxLength={120} /></label>
          <label className="wide-field">Accessori, separati da virgola<input {...field("accessories")} maxLength={500} /></label>
          <label className="wide-field">Note<textarea {...field("notes")} required maxLength={1000} /></label>
          {error && <p className="wide-field" role="alert">{error}</p>}
          <div className="dialog-actions wide-field">
            <button className="text-button" type="button" onClick={onClose}>Annulla</button>
            <button className="primary-action" type="submit" disabled={pending}>
              {pending ? "Registrazione…" : "Registra bicicletta"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
