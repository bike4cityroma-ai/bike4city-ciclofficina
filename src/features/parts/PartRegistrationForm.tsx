import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
import { partCategories, partOrigins } from "./demoParts";
import { createPart } from "./partService";

export function PartRegistrationForm({ onClose }: { onClose: () => void }) {
  const [values, setValues] = useState({
    category: "Freni",
    description: "",
    brand: "",
    compatibility: "",
    origin: "Recuperato",
    condition: "Buono",
    location: "",
    quantity: "1",
    recommendedPrice: "",
    sourceBikeCode: "",
    reason: "Carico iniziale del ricambio dimostrativo.",
    notes: "Ricambio e dati interamente fittizi.",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const key = useRef(crypto.randomUUID());

  function field(name: keyof typeof values) {
    return {
      value: values[name],
      onChange: (
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => setValues((current) => ({
        ...current, [name]: event.target.value,
      })),
    };
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await createPart({
        ...values,
        idempotencyKey: key.current,
        origin: values.origin as (typeof partOrigins)[number],
        brand: values.brand.trim() || null,
        sourceBikeCode: values.sourceBikeCode.trim() || null,
        quantity: Number(values.quantity),
        recommendedPrice: values.recommendedPrice.trim()
          ? Number(values.recommendedPrice.replace(",", "."))
          : null,
      });
      onClose();
    } catch {
      setError("Registrazione non riuscita. Verifica dati e autorizzazioni.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="registration-dialog" role="dialog" aria-modal="true"
        aria-labelledby="part-registration-title">
        <div className="detail-heading">
          <div><p className="eyebrow">Nuovo carico</p>
            <h3 id="part-registration-title">Registra ricambio</h3></div>
          <button className="close-button" type="button" onClick={onClose}
            aria-label="Chiudi registrazione ricambio">×</button>
        </div>
        <p className="section-description">
          Il carico iniziale genera automaticamente codice e movimento.
        </p>
        <form className="registration-form" onSubmit={submit}>
          <label>Categoria<select value={values.category}
            onChange={(event) => setValues((current) => ({
              ...current, category: event.target.value,
            }))}>{partCategories.map((item) =>
              <option key={item}>{item}</option>)}</select></label>
          <label>Descrizione<input {...field("description")} required /></label>
          <label>Marca<input {...field("brand")} /></label>
          <label>Provenienza<select value={values.origin}
            onChange={(event) => setValues((current) => ({
              ...current, origin: event.target.value,
            }))}>{partOrigins.map((item) =>
              <option key={item}>{item}</option>)}</select></label>
          <label className="wide-field">Compatibilità
            <textarea {...field("compatibility")} required /></label>
          <label>Condizione<input {...field("condition")} required /></label>
          <label>Ubicazione<input {...field("location")} required /></label>
          <label>Quantità iniziale<input {...field("quantity")} type="number"
            min={1} max={100000} required /></label>
          <label>Prezzo consigliato (€)
            <input {...field("recommendedPrice")} type="number"
              min={0} max={1000000} step="0.01"
              placeholder="Facoltativo" />
          </label>
          <label>Bicicletta di origine
            <input {...field("sourceBikeCode")} placeholder="BICI-AAAA-NNNN" />
          </label>
          <label className="wide-field">Motivazione del carico
            <textarea {...field("reason")} required minLength={10} /></label>
          <label className="wide-field">Note
            <textarea {...field("notes")} required /></label>
          {error && <p className="wide-field" role="alert">{error}</p>}
          <div className="dialog-actions wide-field">
            <button className="text-button" type="button"
              onClick={onClose}>Annulla</button>
            <button className="primary-action" type="submit" disabled={pending}>
              {pending ? "Registrazione…" : "Registra e carica"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
