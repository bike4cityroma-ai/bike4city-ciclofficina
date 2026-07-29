import { useEffect, useMemo, useState } from "react";
import {
  bikeStatuses,
  demoBikes,
  type BikeStatus,
  type DemoBike,
} from "./demoBikes";
import { BikeRegistrationForm } from "./BikeRegistrationForm";
import { BikePhotos } from "./BikePhotos";
import { BikeStatusWorkflow } from "./BikeStatusWorkflow";
import { observeBikes } from "./bikeService";

type StatusFilter = BikeStatus | "Tutti gli stati";

export function BikeRegistry({ userRoles = [] }: { userRoles?: string[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("Tutti gli stati");
  const [selectedBike, setSelectedBike] = useState<DemoBike | null>(null);
  const [bikes, setBikes] = useState(demoBikes);
  const [loadError, setLoadError] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);

  useEffect(() => {
    if (import.meta.env.MODE === "test") return;
    return observeBikes(
      (nextBikes, fromCache) => {
        if (nextBikes.length > 0 || !fromCache) {
          setBikes(nextBikes);
        }
        setLoadError(fromCache);
      },
      () => setLoadError(true),
    );
  }, []);

  useEffect(() => {
    if (!selectedBike) return;
    const updatedSelection = bikes.find((bike) => bike.id === selectedBike.id);
    if (updatedSelection && updatedSelection !== selectedBike) {
      setSelectedBike(updatedSelection);
    }
  }, [bikes, selectedBike]);

  const filteredBikes = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("it");

    return bikes.filter((bike) => {
      const matchesStatus =
        status === "Tutti gli stati" || bike.status === status;
      const searchableText = [
        bike.code,
        bike.brand,
        bike.model,
        bike.color,
        bike.type,
        bike.frameNumber ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("it");

      return matchesStatus && searchableText.includes(normalizedQuery);
    });
  }, [bikes, query, status]);

  return (
    <section className="bike-registry" aria-labelledby="bikes-title">
      <div className="section-heading bike-heading">
        <div>
          <p className="eyebrow">Registro operativo</p>
          <h2 id="bikes-title">Biciclette</h2>
          <p className="section-description">
            Consulta ubicazione, stato e informazioni tecniche delle biciclette
            registrate nell’ambiente locale.
          </p>
        </div>
        <button
          className="primary-action"
          type="button"
          onClick={() => setShowRegistration(true)}
        >
          Registra bicicletta
        </button>
      </div>

      {loadError && (
        <p className="notice-banner" role="alert">
          Connessione al registro non disponibile. I dati visibili possono
          provenire dalla cache: verifica gli emulatori prima di modificarli.
        </p>
      )}

      <div className="registry-toolbar" role="search">
        <div className="field-group search-field">
          <label htmlFor="bike-search">Cerca nel registro</label>
          <input
            id="bike-search"
            type="search"
            placeholder="Codice, marca, modello o telaio"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="field-group">
          <label htmlFor="bike-status">Stato</label>
          <select
            id="bike-status"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as StatusFilter)
            }
          >
            <option>Tutti gli stati</option>
            {bikeStatuses.map((bikeStatus) => (
              <option key={bikeStatus}>{bikeStatus}</option>
            ))}
          </select>
        </div>
        <div
          className="result-count"
          role="status"
          aria-label={`${filteredBikes.length} ${
            filteredBikes.length === 1
              ? "bicicletta trovata"
              : "biciclette trovate"
          }`}
        >
          <strong>{filteredBikes.length}</strong>
          <span>
            {filteredBikes.length === 1
              ? "bicicletta trovata"
              : "biciclette trovate"}
          </span>
        </div>
      </div>

      <div className="registry-layout">
        <div className="bike-table-wrap">
          <table className="bike-table">
            <caption className="sr-only">
              Biciclette dimostrative presenti nel registro
            </caption>
            <thead>
              <tr>
                <th scope="col">Bicicletta</th>
                <th scope="col">Tipologia</th>
                <th scope="col">Stato</th>
                <th scope="col">Ubicazione</th>
                <th scope="col">
                  <span className="sr-only">Azioni</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredBikes.map((bike) => (
                <tr key={bike.id}>
                  <td>
                    <span className="bike-code">{bike.code}</span>
                    <strong>
                      {bike.brand} {bike.model}
                    </strong>
                    <small>
                      {bike.color} · Telaio {bike.frameSize}
                    </small>
                  </td>
                  <td>{bike.type}</td>
                  <td>
                    <span
                      className="bike-status"
                      data-status={bike.status.toLocaleLowerCase("it")}
                    >
                      {bike.status}
                    </span>
                  </td>
                  <td>{bike.location}</td>
                  <td>
                    <button
                      className="row-action"
                      type="button"
                      onClick={() => setSelectedBike(bike)}
                      aria-label={`Apri scheda ${bike.code}`}
                    >
                      Apri
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredBikes.length === 0 && (
            <div className="empty-state">
              <strong>Nessuna bicicletta trovata</strong>
              <span>Modifica la ricerca o seleziona un altro stato.</span>
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setQuery("");
                  setStatus("Tutti gli stati");
                }}
              >
                Azzera filtri
              </button>
            </div>
          )}
        </div>

        {selectedBike && (
          <BikeDetail
            bike={selectedBike}
            userRoles={userRoles}
            onClose={() => setSelectedBike(null)}
          />
        )}
      </div>
      {showRegistration && (
        <BikeRegistrationForm onClose={() => setShowRegistration(false)} />
      )}
    </section>
  );
}

interface BikeDetailProps {
  bike: DemoBike;
  userRoles: string[];
  onClose: () => void;
}

function BikeDetail({ bike, userRoles, onClose }: BikeDetailProps) {
  return (
    <aside
      className="bike-detail"
      aria-labelledby="bike-detail-title"
      data-testid="bike-detail"
    >
      <div className="detail-heading">
        <div>
          <span className="bike-code">{bike.code}</span>
          <h3 id="bike-detail-title">
            {bike.brand} {bike.model}
          </h3>
        </div>
        <button
          className="close-button"
          type="button"
          onClick={onClose}
          aria-label="Chiudi scheda bicicletta"
        >
          ×
        </button>
      </div>

      <span
        className="bike-status"
        data-status={bike.status.toLocaleLowerCase("it")}
      >
        {bike.status}
      </span>

      <dl className="bike-facts">
        <div>
          <dt>Tipologia</dt>
          <dd>{bike.type}</dd>
        </div>
        <div>
          <dt>Colore</dt>
          <dd>{bike.color}</dd>
        </div>
        <div>
          <dt>Misura telaio</dt>
          <dd>{bike.frameSize}</dd>
        </div>
        <div>
          <dt>Numero telaio</dt>
          <dd>{bike.frameNumber ?? "Non disponibile"}</dd>
        </div>
        <div>
          <dt>Data ingresso</dt>
          <dd>{bike.receivedLabel}</dd>
        </div>
        <div>
          <dt>Ubicazione</dt>
          <dd>{bike.location}</dd>
        </div>
        <div>
          <dt>Destinazione prevista</dt>
          <dd>{bike.intendedDestination}</dd>
        </div>
      </dl>

      <div className="detail-section">
        <h4>Condizioni</h4>
        <p>{bike.condition}</p>
      </div>

      <div className="detail-section">
        <h4>Accessori</h4>
        <p>
          {bike.accessories.length > 0
            ? bike.accessories.join(", ")
            : "Nessun accessorio registrato"}
        </p>
      </div>

      <div className="detail-section">
        <h4>Note dimostrative</h4>
        <p>{bike.notes}</p>
      </div>

      {userRoles.some((role) =>
        ["admin", "workshop_manager", "operator", "volunteer"].includes(role)
      ) && <BikePhotos bikeId={bike.id} userRoles={userRoles} />}

      <BikeStatusWorkflow bike={bike} />
    </aside>
  );
}
