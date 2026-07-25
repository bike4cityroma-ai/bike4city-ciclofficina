import { useEffect, useMemo, useState } from "react";
import {
  demoParts,
  partCategories,
  partOrigins,
  type DemoPart,
  type PartOrigin,
} from "./demoParts";
import { PartRegistrationForm } from "./PartRegistrationForm";
import { observePartMovements, observeParts } from "./partService";
import { PartStockMovement } from "./PartStockMovement";

type CategoryFilter = (typeof partCategories)[number] | "Tutte le categorie";
type OriginFilter = PartOrigin | "Tutte le provenienze";

export function PartRegistry() {
  const [query, setQuery] = useState("");
  const [category, setCategory] =
    useState<CategoryFilter>("Tutte le categorie");
  const [origin, setOrigin] =
    useState<OriginFilter>("Tutte le provenienze");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [selectedPart, setSelectedPart] = useState<DemoPart | null>(null);
  const [parts, setParts] = useState(demoParts);
  const [loadError, setLoadError] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);

  useEffect(() => {
    if (import.meta.env.MODE === "test") return;
    return observeParts((nextParts) => {
      setParts(nextParts);
      setLoadError(false);
    }, () => setLoadError(true));
  }, []);

  useEffect(() => {
    if (!selectedPart) return;
    const updated = parts.find((part) => part.id === selectedPart.id);
    if (updated && updated !== selectedPart) setSelectedPart(updated);
  }, [parts, selectedPart]);

  const filteredParts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("it");

    return parts.filter((part) => {
      const matchesCategory =
        category === "Tutte le categorie" || part.category === category;
      const matchesOrigin =
        origin === "Tutte le provenienze" || part.origin === origin;
      const matchesAvailability = !onlyAvailable || part.quantityOnHand > 0;
      const searchableText = [
        part.code,
        part.category,
        part.description,
        part.brand ?? "",
        part.compatibility,
        part.location,
      ]
        .join(" ")
        .toLocaleLowerCase("it");

      return (
        matchesCategory &&
        matchesOrigin &&
        matchesAvailability &&
        searchableText.includes(normalizedQuery)
      );
    });
  }, [category, onlyAvailable, origin, parts, query]);

  const resultLabel = `${filteredParts.length} ${
    filteredParts.length === 1 ? "ricambio trovato" : "ricambi trovati"
  }`;

  return (
    <section className="part-registry" aria-labelledby="parts-title">
      <div className="section-heading registry-heading">
        <div>
          <p className="eyebrow">Inventario operativo</p>
          <h2 id="parts-title">Ricambi</h2>
          <p className="section-description">
            Consulta quantità, provenienza e movimenti dei ricambi
            dimostrativi.
          </p>
        </div>
        <button className="primary-action" type="button"
          onClick={() => setShowRegistration(true)}>
          Registra ricambio
        </button>
      </div>

      {loadError && <p className="notice-banner" role="alert">
        Inventario non disponibile: verifica che gli emulatori siano avviati.
      </p>}

      <div className="registry-toolbar parts-toolbar" role="search">
        <div className="field-group search-field">
          <label htmlFor="part-search">Cerca ricambio</label>
          <input
            id="part-search"
            type="search"
            placeholder="Codice, descrizione o compatibilità"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="field-group">
          <label htmlFor="part-category">Categoria</label>
          <select
            id="part-category"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as CategoryFilter)
            }
          >
            <option>Tutte le categorie</option>
            {partCategories.map((partCategory) => (
              <option key={partCategory}>{partCategory}</option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="part-origin">Provenienza</label>
          <select
            id="part-origin"
            value={origin}
            onChange={(event) =>
              setOrigin(event.target.value as OriginFilter)
            }
          >
            <option>Tutte le provenienze</option>
            {partOrigins.map((partOrigin) => (
              <option key={partOrigin}>{partOrigin}</option>
            ))}
          </select>
        </div>
        <label className="availability-filter">
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(event) => setOnlyAvailable(event.target.checked)}
          />
          Solo disponibili
        </label>
        <div className="result-count" role="status" aria-label={resultLabel}>
          <strong>{filteredParts.length}</strong>
          <span>
            {filteredParts.length === 1
              ? "ricambio trovato"
              : "ricambi trovati"}
          </span>
        </div>
      </div>

      <div className="registry-layout">
        <div className="registry-table-wrap">
          <table className="registry-table parts-table">
            <caption className="sr-only">
              Ricambi dimostrativi presenti nell'inventario
            </caption>
            <thead>
              <tr>
                <th scope="col">Ricambio</th>
                <th scope="col">Provenienza</th>
                <th scope="col">Disponibilità</th>
                <th scope="col">Ubicazione</th>
                <th scope="col">
                  <span className="sr-only">Azioni</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredParts.map((part) => (
                <tr key={part.id}>
                  <td>
                    <span className="bike-code">{part.code}</span>
                    <strong>{part.description}</strong>
                    <small>
                      {part.category} · {part.condition}
                    </small>
                  </td>
                  <td>
                    <span className="origin-badge">{part.origin}</span>
                  </td>
                  <td>
                    <span
                      className={
                        part.quantityOnHand === 0
                          ? "quantity-badge empty"
                          : "quantity-badge"
                      }
                    >
                      {part.quantityOnHand}
                    </span>
                  </td>
                  <td>{part.location}</td>
                  <td>
                    <button
                      className="row-action"
                      type="button"
                      onClick={() => setSelectedPart(part)}
                      aria-label={`Apri ricambio ${part.code}`}
                    >
                      Apri
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredParts.length === 0 && (
            <div className="empty-state">
              <strong>Nessun ricambio trovato</strong>
              <span>Modifica la ricerca o seleziona filtri diversi.</span>
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory("Tutte le categorie");
                  setOrigin("Tutte le provenienze");
                  setOnlyAvailable(false);
                }}
              >
                Azzera filtri
              </button>
            </div>
          )}
        </div>

        {selectedPart && (
          <PartDetail part={selectedPart} onClose={() => setSelectedPart(null)} />
        )}
      </div>
      {showRegistration && (
        <PartRegistrationForm onClose={() => setShowRegistration(false)} />
      )}
    </section>
  );
}

interface PartDetailProps {
  part: DemoPart;
  onClose: () => void;
}

function PartDetail({ part, onClose }: PartDetailProps) {
  const [movements, setMovements] = useState(part.movements);

  useEffect(() => {
    if (import.meta.env.MODE === "test") {
      setMovements(part.movements);
      return;
    }
    return observePartMovements(
      part.id,
      setMovements,
      () => setMovements([]),
    );
  }, [part.id, part.movements]);

  return (
    <aside
      className="part-detail"
      aria-labelledby="part-detail-title"
      data-testid="part-detail"
    >
      <div className="detail-heading">
        <div>
          <span className="bike-code">{part.code}</span>
          <h3 id="part-detail-title">{part.description}</h3>
        </div>
        <button
          className="close-button"
          type="button"
          onClick={onClose}
          aria-label="Chiudi scheda ricambio"
        >
          ×
        </button>
      </div>

      <div className="detail-badges">
        <span className="origin-badge">{part.origin}</span>
        <span
          className={
            part.quantityOnHand === 0
              ? "quantity-badge empty"
              : "quantity-badge"
          }
        >
          Disponibili: {part.quantityOnHand}
        </span>
      </div>

      <dl className="bike-facts">
        <div>
          <dt>Categoria</dt>
          <dd>{part.category}</dd>
        </div>
        <div>
          <dt>Marca</dt>
          <dd>{part.brand ?? "Non indicata"}</dd>
        </div>
        <div>
          <dt>Condizione</dt>
          <dd>{part.condition}</dd>
        </div>
        <div>
          <dt>Ubicazione</dt>
          <dd>{part.location}</dd>
        </div>
        <div>
          <dt>Bicicletta di origine</dt>
          <dd>{part.sourceBikeCode ?? "Non applicabile"}</dd>
        </div>
      </dl>

      <div className="detail-section">
        <h4>Compatibilità</h4>
        <p>{part.compatibility}</p>
      </div>

      <div className="detail-section">
        <h4>Movimenti di magazzino</h4>
        <ol className="movement-list">
          {movements.map((movement) => (
            <li key={movement.id}>
              <div>
                <strong>{movement.type}</strong>
                <span>{movement.occurredLabel}</span>
              </div>
              <span
                className={
                  movement.quantity > 0
                    ? "movement-quantity positive"
                    : "movement-quantity negative"
                }
              >
                {movement.quantity > 0 ? "+" : ""}
                {movement.quantity}
              </span>
              <p>{movement.reason}</p>
              <small>
                {movement.relatedCode ?? "Nessun collegamento"} ·{" "}
                {movement.operatorLabel}
              </small>
            </li>
          ))}
        </ol>
        {movements.length === 0 && <p>Nessun movimento registrato.</p>}
      </div>

      <div className="detail-section">
        <h4>Note</h4>
        <p>{part.notes}</p>
      </div>
      <PartStockMovement part={part} />
    </aside>
  );
}
