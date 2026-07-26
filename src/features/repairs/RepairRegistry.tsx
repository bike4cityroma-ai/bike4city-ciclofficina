import { useEffect, useMemo, useState } from "react";
import {
  demoRepairs,
  repairStatuses,
  type DemoRepair,
  type RepairStatus,
} from "./demoRepairs";
import { RepairAcceptanceForm } from "./RepairAcceptanceForm";
import { observeRepairs } from "./repairService";
import { RepairWorkflow } from "./RepairWorkflow";
import { RepairPartsUsage } from "./RepairPartsUsage";
import { PickupContactDialog } from "./PickupContactDialog";
import { RepairSafetyDialog } from "./RepairSafetyDialog";

type RepairStatusFilter = RepairStatus | "Tutti gli stati";
type CustomerFilter = DemoRepair["customerType"] | "Tutti gli utenti";

export function RepairRegistry() {
  const [query, setQuery] = useState("");
  const [status, setStatus] =
    useState<RepairStatusFilter>("Tutti gli stati");
  const [customerType, setCustomerType] =
    useState<CustomerFilter>("Tutti gli utenti");
  const [selectedRepair, setSelectedRepair] = useState<DemoRepair | null>(null);
  const [repairs, setRepairs] = useState(demoRepairs);
  const [loadError, setLoadError] = useState(false);
  const [showAcceptance, setShowAcceptance] = useState(false);
  const [pickupRepair, setPickupRepair] = useState<DemoRepair | null>(null);
  const [safetyRepair, setSafetyRepair] = useState<DemoRepair | null>(null);

  useEffect(() => {
    if (import.meta.env.MODE === "test") return;
    return observeRepairs(
      (nextRepairs) => {
        setRepairs(nextRepairs);
        setLoadError(false);
      },
      () => setLoadError(true),
    );
  }, []);

  useEffect(() => {
    if (!selectedRepair) return;
    const updated = repairs.find((repair) => repair.id === selectedRepair.id);
    if (updated && updated !== selectedRepair) setSelectedRepair(updated);
  }, [repairs, selectedRepair]);

  const filteredRepairs = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("it");

    return repairs.filter((repair) => {
      const matchesStatus =
        status === "Tutti gli stati" || repair.status === status;
      const matchesCustomer =
        customerType === "Tutti gli utenti" ||
        repair.customerType === customerType;
      const searchableText = [
        repair.code,
        repair.customerLabel,
        repair.bikeLabel,
        repair.frameNumber ?? "",
        repair.declaredIssue,
      ]
        .join(" ")
        .toLocaleLowerCase("it");

      return (
        matchesStatus &&
        matchesCustomer &&
        searchableText.includes(normalizedQuery)
      );
    });
  }, [customerType, query, repairs, status]);

  const resultLabel = `${filteredRepairs.length} ${
    filteredRepairs.length === 1 ? "intervento trovato" : "interventi trovati"
  }`;

  return (
    <section className="repair-registry" aria-labelledby="repairs-title">
      <div className="section-heading registry-heading">
        <div>
          <p className="eyebrow">Registro operativo</p>
          <h2 id="repairs-title">Riparazioni</h2>
          <p className="section-description">
            Segui accettazione, diagnosi e avanzamento degli interventi
            dimostrativi.
          </p>
        </div>
        <button className="primary-action" type="button"
          onClick={() => setShowAcceptance(true)}>
          Nuova riparazione
        </button>
      </div>

      {loadError && (
        <p className="notice-banner" role="alert">
          Registro non disponibile: verifica che gli emulatori siano avviati.
        </p>
      )}

      <div className="registry-toolbar repair-toolbar" role="search">
        <div className="field-group search-field">
          <label htmlFor="repair-search">Cerca intervento</label>
          <input
            id="repair-search"
            type="search"
            placeholder="Codice, utente, bicicletta o problema"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="field-group">
          <label htmlFor="repair-status">Stato</label>
          <select
            id="repair-status"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as RepairStatusFilter)
            }
          >
            <option>Tutti gli stati</option>
            {repairStatuses.map((repairStatus) => (
              <option key={repairStatus}>{repairStatus}</option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="customer-type">Utente</label>
          <select
            id="customer-type"
            value={customerType}
            onChange={(event) =>
              setCustomerType(event.target.value as CustomerFilter)
            }
          >
            <option>Tutti gli utenti</option>
            <option>Socio</option>
            <option>Non socio</option>
            <option>Organizzazione</option>
          </select>
        </div>
        <div className="result-count" role="status" aria-label={resultLabel}>
          <strong>{filteredRepairs.length}</strong>
          <span>
            {filteredRepairs.length === 1
              ? "intervento trovato"
              : "interventi trovati"}
          </span>
        </div>
      </div>

      <div className="registry-layout">
        <div className="registry-table-wrap">
          <table className="registry-table repair-table">
            <caption className="sr-only">
              Interventi dimostrativi presenti nel registro
            </caption>
            <thead>
              <tr>
                <th scope="col">Intervento</th>
                <th scope="col">Utente</th>
                <th scope="col">Stato</th>
                <th scope="col">Consegna prevista</th>
                <th scope="col">
                  <span className="sr-only">Azioni</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRepairs.map((repair) => (
                <tr key={repair.id}>
                  <td>
                    <span className="bike-code">{repair.code}</span>
                    <strong>{repair.bikeLabel}</strong>
                    <small>{repair.declaredIssue}</small>
                  </td>
                  <td>
                    <strong>{repair.customerLabel}</strong>
                    <small>{repair.customerType}</small>
                  </td>
                  <td>
                    <span
                      className="repair-status"
                      data-status={repair.status.toLocaleLowerCase("it")}
                    >
                      {repair.status}
                    </span>
                  </td>
                  <td>{repair.expectedDeliveryLabel}</td>
                  <td>
                    <button
                      className="row-action"
                      type="button"
                      onClick={() => setSelectedRepair(repair)}
                      aria-label={`Apri intervento ${repair.code}`}
                    >
                      Apri
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRepairs.length === 0 && (
            <div className="empty-state">
              <strong>Nessun intervento trovato</strong>
              <span>Modifica la ricerca o seleziona filtri diversi.</span>
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setQuery("");
                  setStatus("Tutti gli stati");
                  setCustomerType("Tutti gli utenti");
                }}
              >
                Azzera filtri
              </button>
            </div>
          )}
        </div>

        {selectedRepair && (
          <RepairDetail
            repair={selectedRepair}
            onClose={() => setSelectedRepair(null)}
            onPickup={() => setPickupRepair(selectedRepair)}
            onSafety={() => setSafetyRepair(selectedRepair)}
          />
        )}
      </div>
      {showAcceptance && (
        <RepairAcceptanceForm onClose={() => setShowAcceptance(false)} />
      )}
      {pickupRepair && <PickupContactDialog repair={pickupRepair}
        onClose={() => setPickupRepair(null)} />}
      {safetyRepair && <RepairSafetyDialog repair={safetyRepair}
        onClose={() => setSafetyRepair(null)} />}
    </section>
  );
}

interface RepairDetailProps {
  repair: DemoRepair;
  onClose: () => void;
  onPickup: () => void;
  onSafety: () => void;
}

function RepairDetail({
  repair,
  onClose,
  onPickup,
  onSafety,
}: RepairDetailProps) {
  return (
    <aside
      className="repair-detail"
      aria-labelledby="repair-detail-title"
      data-testid="repair-detail"
    >
      <div className="detail-heading">
        <div>
          <span className="bike-code">{repair.code}</span>
          <h3 id="repair-detail-title">{repair.bikeLabel}</h3>
        </div>
        <button
          className="close-button"
          type="button"
          onClick={onClose}
          aria-label="Chiudi scheda riparazione"
        >
          ×
        </button>
      </div>

      <div className="detail-badges">
        <span
          className="repair-status"
          data-status={repair.status.toLocaleLowerCase("it")}
        >
          {repair.status}
        </span>
        <span className="customer-badge">{repair.customerType}</span>
      </div>

      <dl className="bike-facts">
        <div>
          <dt>Utente dimostrativo</dt>
          <dd>{repair.customerLabel}</dd>
        </div>
        <div>
          <dt>Data accettazione</dt>
          <dd>{repair.acceptedLabel}</dd>
        </div>
        <div>
          <dt>Numero telaio</dt>
          <dd>{repair.frameNumber ?? "Non disponibile"}</dd>
        </div>
        <div>
          <dt>Consegna prevista</dt>
          <dd>{repair.expectedDeliveryLabel}</dd>
        </div>
        <div>
          <dt>Tempo registrato</dt>
          <dd>{repair.minutesSpent} minuti</dd>
        </div>
        <div>
          <dt>Classificazione amministrativa</dt>
          <dd>{repair.activityClassification}</dd>
        </div>
      </dl>

      <DetailList title="Problema dichiarato" items={[repair.declaredIssue]} />
      <DetailList title="Diagnosi" items={[repair.diagnosis]} />
      <DetailList
        title="Interventi proposti"
        items={repair.proposedWork}
        emptyLabel="Nessun intervento ancora proposto"
      />
      <DetailList title="Interventi richiesti" items={repair.requestedWork} />
      <DetailList
        title="Interventi eseguiti"
        items={repair.completedWork}
        emptyLabel="Nessun intervento ancora completato"
      />
      <DetailList
        title="Ricambi"
        items={repair.parts}
        emptyLabel="Nessun ricambio collegato. Potrà essere aggiunto durante la lavorazione."
      />
      <DetailList title="Persone assegnate" items={repair.assignedTo} />
      <RepairPartsUsage repair={repair} />
      {repair.activityClassification === "Da classificare" && (
        <p className="workflow-note">
          La classificazione amministrativa sarà gestita separatamente da un
          ruolo autorizzato e non determina lo stato tecnico.
        </p>
      )}
      {repair.status === "Pronta" &&
        (repair.completedWork.length === 0 ||
          repair.assignedTo.length === 0 ||
          repair.minutesSpent < 1) && (
          <p className="notice-banner" role="alert">
            Scheda incompleta: riporta la riparazione in lavorazione e registra
            interventi eseguiti, operatore e tempo prima di renderla pronta.
          </p>
        )}
      <RepairWorkflow repair={repair} />
      <div className="detail-section">
        <h4>Procedure speciali</h4>
        <div className="dialog-actions">
          {repair.status === "Collaudata" && <button
            className="secondary-button" type="button" onClick={onPickup}>
            Gestisci mancato ritiro
          </button>}
          {repair.status !== "Annullata" && <button
            className="secondary-button" type="button" onClick={onSafety}>
            {repair.status === "In verifica sicurezza"
              ? "Chiudi verifica sicurezza"
              : "Segnala rischio sicurezza"}
          </button>}
        </div>
      </div>
    </aside>
  );
}

interface DetailListProps {
  title: string;
  items: string[];
  emptyLabel?: string;
}

function DetailList({
  title,
  items,
  emptyLabel = "Nessun dato registrato",
}: DetailListProps) {
  return (
    <div className="detail-section">
      <h4>{title}</h4>
      {items.length > 0 ? (
        <ul className="detail-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>{emptyLabel}</p>
      )}
    </div>
  );
}
