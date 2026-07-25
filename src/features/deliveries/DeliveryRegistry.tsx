import { useEffect, useMemo, useState } from "react";
import {
  deliveryTypes,
  demoDeliveries,
  type DeliveryType,
  type DemoDelivery,
} from "./demoDeliveries";
import { DeliveryRegistrationForm } from "./DeliveryRegistrationForm";
import { observeDeliveries } from "./deliveryService";

type DeliveryTypeFilter = DeliveryType | "Tutte le consegne";
type ContributionFilter = "Tutti i contributi" | "Con contributo" | "Senza contributo";

export function DeliveryRegistry() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<DeliveryTypeFilter>("Tutte le consegne");
  const [contribution, setContribution] =
    useState<ContributionFilter>("Tutti i contributi");
  const [selectedDelivery, setSelectedDelivery] =
    useState<DemoDelivery | null>(null);
  const [deliveries, setDeliveries] = useState(demoDeliveries);
  const [loadError, setLoadError] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);

  useEffect(() => {
    if (import.meta.env.MODE === "test") return;
    return observeDeliveries((items) => {
      setDeliveries(items); setLoadError(false);
    }, () => setLoadError(true));
  }, []);

  const filteredDeliveries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("it");

    return deliveries.filter((delivery) => {
      const matchesType = type === "Tutte le consegne" || delivery.type === type;
      const matchesContribution =
        contribution === "Tutti i contributi" ||
        (contribution === "Con contributo"
          ? delivery.contributionAmount !== null
          : delivery.contributionAmount === null);
      const searchableText = [
        delivery.code,
        delivery.recipientLabel,
        delivery.bikeCode,
        delivery.bikeLabel,
        delivery.repairCode ?? "",
        delivery.documentCode,
      ]
        .join(" ")
        .toLocaleLowerCase("it");

      return (
        matchesType &&
        matchesContribution &&
        searchableText.includes(normalizedQuery)
      );
    });
  }, [contribution, deliveries, query, type]);

  const resultLabel = `${filteredDeliveries.length} ${
    filteredDeliveries.length === 1 ? "consegna trovata" : "consegne trovate"
  }`;

  return (
    <section className="delivery-registry" aria-labelledby="deliveries-title">
      <div className="section-heading registry-heading">
        <div>
          <p className="eyebrow">Verbali e riconsegne</p>
          <h2 id="deliveries-title">Consegne</h2>
          <p className="section-description">
            Consulta collegamenti, condizioni e documenti delle consegne
            dimostrative.
          </p>
        </div>
        <button className="primary-action" type="button"
          onClick={() => setShowRegistration(true)}>
          Nuova consegna
        </button>
      </div>
      {loadError && <p className="notice-banner" role="alert">
        Registro consegne non disponibile: verifica gli emulatori.
      </p>}

      <div className="registry-toolbar delivery-toolbar" role="search">
        <div className="field-group search-field">
          <label htmlFor="delivery-search">Cerca consegna</label>
          <input
            id="delivery-search"
            type="search"
            placeholder="Codice, ricevente, bicicletta o documento"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="field-group">
          <label htmlFor="delivery-type">Tipo</label>
          <select
            id="delivery-type"
            value={type}
            onChange={(event) =>
              setType(event.target.value as DeliveryTypeFilter)
            }
          >
            <option>Tutte le consegne</option>
            {deliveryTypes.map((deliveryType) => (
              <option key={deliveryType}>{deliveryType}</option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="delivery-contribution">Contributo</label>
          <select
            id="delivery-contribution"
            value={contribution}
            onChange={(event) =>
              setContribution(event.target.value as ContributionFilter)
            }
          >
            <option>Tutti i contributi</option>
            <option>Con contributo</option>
            <option>Senza contributo</option>
          </select>
        </div>
        <div className="result-count" role="status" aria-label={resultLabel}>
          <strong>{filteredDeliveries.length}</strong>
          <span>
            {filteredDeliveries.length === 1
              ? "consegna trovata"
              : "consegne trovate"}
          </span>
        </div>
      </div>

      <div className="registry-layout">
        <div className="registry-table-wrap">
          <table className="registry-table delivery-table">
            <caption className="sr-only">
              Consegne dimostrative presenti nel registro
            </caption>
            <thead>
              <tr>
                <th scope="col">Consegna</th>
                <th scope="col">Ricevente</th>
                <th scope="col">Tipo</th>
                <th scope="col">Contributo</th>
                <th scope="col">
                  <span className="sr-only">Azioni</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredDeliveries.map((delivery) => (
                <tr key={delivery.id}>
                  <td>
                    <span className="bike-code">{delivery.code}</span>
                    <strong>{delivery.bikeLabel}</strong>
                    <small>{delivery.deliveredLabel}</small>
                  </td>
                  <td>
                    <strong>{delivery.recipientLabel}</strong>
                    <small>{delivery.recipientType}</small>
                  </td>
                  <td>
                    <span className="delivery-type">{delivery.type}</span>
                  </td>
                  <td>
                    {delivery.contributionAmount === null
                      ? "Nessuno"
                      : formatEuro(delivery.contributionAmount)}
                  </td>
                  <td>
                    <button
                      className="row-action"
                      type="button"
                      onClick={() => setSelectedDelivery(delivery)}
                      aria-label={`Apri consegna ${delivery.code}`}
                    >
                      Apri
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredDeliveries.length === 0 && (
            <div className="empty-state">
              <strong>Nessuna consegna trovata</strong>
              <span>Modifica la ricerca o seleziona filtri diversi.</span>
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setQuery("");
                  setType("Tutte le consegne");
                  setContribution("Tutti i contributi");
                }}
              >
                Azzera filtri
              </button>
            </div>
          )}
        </div>

        {selectedDelivery && (
          <DeliveryDetail
            delivery={selectedDelivery}
            onClose={() => setSelectedDelivery(null)}
          />
        )}
      </div>
      {showRegistration && (
        <DeliveryRegistrationForm onClose={() => setShowRegistration(false)} />
      )}
    </section>
  );
}

interface DeliveryDetailProps {
  delivery: DemoDelivery;
  onClose: () => void;
}

function DeliveryDetail({ delivery, onClose }: DeliveryDetailProps) {
  return (
    <aside
      className="delivery-detail"
      aria-labelledby="delivery-detail-title"
      data-testid="delivery-detail"
    >
      <div className="detail-heading">
        <div>
          <span className="bike-code">{delivery.code}</span>
          <h3 id="delivery-detail-title">{delivery.bikeLabel}</h3>
        </div>
        <button
          className="close-button"
          type="button"
          onClick={onClose}
          aria-label="Chiudi scheda consegna"
        >
          ×
        </button>
      </div>

      <div className="detail-badges">
        <span className="delivery-type">{delivery.type}</span>
        <span className="customer-badge">{delivery.recipientType}</span>
      </div>

      <dl className="bike-facts">
        <div>
          <dt>Ricevente dimostrativo</dt>
          <dd>{delivery.recipientLabel}</dd>
        </div>
        <div>
          <dt>Data consegna</dt>
          <dd>{delivery.deliveredLabel}</dd>
        </div>
        <div>
          <dt>Bicicletta</dt>
          <dd>{delivery.bikeCode}</dd>
        </div>
        <div>
          <dt>Riparazione</dt>
          <dd>{delivery.repairCode ?? "Non collegata"}</dd>
        </div>
        <div>
          <dt>Collaudo</dt>
          <dd>{delivery.testCode}</dd>
        </div>
        <div>
          <dt>Verbale</dt>
          <dd>{delivery.documentCode}</dd>
        </div>
        <div>
          <dt>Ricevuta</dt>
          <dd>{delivery.receiptCode ?? "Non presente"}</dd>
        </div>
        <div>
          <dt>Contributo</dt>
          <dd>
            {delivery.contributionAmount === null
              ? "Nessuno"
              : formatEuro(delivery.contributionAmount)}
          </dd>
        </div>
        <div>
          <dt>Classificazione</dt>
          <dd>{delivery.classificationLabel}</dd>
        </div>
        <div>
          <dt>Operatore</dt>
          <dd>{delivery.deliveredBy}</dd>
        </div>
      </dl>

      <div className="detail-section">
        <h4>Condizioni alla consegna</h4>
        <p>{delivery.conditionSnapshot}</p>
      </div>

      <div className="detail-section">
        <h4>Accessori</h4>
        <p>
          {delivery.accessories.length > 0
            ? delivery.accessories.join(", ")
            : "Nessun accessorio registrato"}
        </p>
      </div>

      <div className="detail-section">
        <h4>Dichiarazioni dimostrative</h4>
        <ul className="detail-list">
          {delivery.declarations.map((declaration) => (
            <li key={declaration}>{declaration}</li>
          ))}
        </ul>
      </div>

      <div className="detail-section">
        <h4>Note</h4>
        <p>{delivery.notes}</p>
      </div>
    </aside>
  );
}

function formatEuro(amount: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}
