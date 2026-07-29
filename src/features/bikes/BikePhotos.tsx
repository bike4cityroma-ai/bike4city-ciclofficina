import {
  type FormEvent,
  useEffect,
  useState,
} from "react";
import {
  bikePhotoTypes,
  loadBikePhotoBlob,
  observeBikePhotos,
  type BikePhoto,
  type BikePhotoType,
  uploadBikePhoto,
} from "./bikePhotoService";

const uploadRoles = new Set(["admin", "workshop_manager", "operator"]);

export function BikePhotos({
  bikeId,
  userRoles,
}: {
  bikeId: string;
  userRoles: string[];
}) {
  const [photos, setPhotos] = useState<BikePhoto[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const canUpload = userRoles.some((role) => uploadRoles.has(role));

  useEffect(() => {
    if (import.meta.env.MODE === "test") return;
    return observeBikePhotos(
      bikeId,
      (nextPhotos) => {
        setPhotos(nextPhotos);
        setLoadError(false);
      },
      () => setLoadError(true),
    );
  }, [bikeId]);

  useEffect(() => {
    let active = true;
    const createdUrls: string[] = [];
    void Promise.all(photos.map(async (photo) => {
      try {
        const blob = await loadBikePhotoBlob(photo.storagePath);
        const url = URL.createObjectURL(blob);
        createdUrls.push(url);
        return [photo.id, url] as const;
      } catch {
        return null;
      }
    })).then((entries) => {
      if (!active) return;
      setImageUrls(Object.fromEntries(
        entries.filter((entry): entry is readonly [string, string] =>
          entry !== null
        ),
      ));
    });
    return () => {
      active = false;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photos]);

  return (
    <div className="detail-section bike-photos">
      <div className="bike-photo-heading">
        <h4>Fotografie</h4>
        {canUpload && (
          <button
            className="secondary-button"
            type="button"
            onClick={() => setShowForm(true)}
          >
            Aggiungi fotografia
          </button>
        )}
      </div>
      <p className="photo-privacy-note">
        Immagini tecniche private, visibili soltanto ai ruoli autorizzati.
      </p>
      {loadError && (
        <p role="alert">Fotografie temporaneamente non disponibili.</p>
      )}
      {!loadError && photos.length === 0 && (
        <p>Nessuna fotografia registrata.</p>
      )}
      {photos.length > 0 && (
        <ul className="bike-photo-grid">
          {photos.map((photo) => (
            <li key={photo.id}>
              {imageUrls[photo.id] ? (
                <a
                  href={imageUrls[photo.id]}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Apri fotografia: ${photo.photoType}`}
                >
                  <img
                    src={imageUrls[photo.id]}
                    alt={photo.description || photo.photoType}
                  />
                </a>
              ) : (
                <div className="photo-placeholder" role="status">
                  Caricamento…
                </div>
              )}
              <strong>{photo.photoType}</strong>
              {photo.description && <span>{photo.description}</span>}
              <small>{photo.createdLabel}</small>
            </li>
          ))}
        </ul>
      )}
      {showForm && (
        <BikePhotoDialog
          bikeId={bikeId}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

function BikePhotoDialog({
  bikeId,
  onClose,
}: {
  bikeId: string;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const file = data.get("photo");
    if (!(file instanceof File) || file.size === 0) {
      setError("Seleziona una fotografia.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await uploadBikePhoto({
        bikeId,
        file,
        photoType: String(data.get("photoType")) as BikePhotoType,
        description: String(data.get("description")),
      });
      onClose();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Caricamento non riuscito.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div
        className="registration-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Aggiungi fotografia bicicletta"
      >
        <h2>Aggiungi fotografia</h2>
        <form onSubmit={submit}>
          <label>
            Immagine
            <input
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              required
            />
          </label>
          <label>
            Tipologia
            <select name="photoType" defaultValue="Ingresso">
              {bikePhotoTypes.map((photoType) => (
                <option key={photoType}>{photoType}</option>
              ))}
            </select>
          </label>
          <label>
            Descrizione facoltativa
            <textarea name="description" maxLength={300} />
          </label>
          <p className="photo-privacy-note">
            Non fotografare persone, documenti o altri dati personali.
          </p>
          {error && <p role="alert">{error}</p>}
          <div className="dialog-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={onClose}
              disabled={saving}
            >
              Annulla
            </button>
            <button className="primary-button" disabled={saving}>
              {saving ? "Caricamento…" : "Carica fotografia"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
