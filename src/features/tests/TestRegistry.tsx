import { useEffect, useMemo, useState } from "react";
import {
  demoTests,
  testResults,
  type DemoWorkshopTest,
  type TestResult,
} from "./demoTests";
import { TestRegistrationForm } from "./TestRegistrationForm";
import { observeWorkshopTests } from "./testService";

type ResultFilter = TestResult | "Tutti gli esiti";

export function TestRegistry() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ResultFilter>("Tutti gli esiti");
  const [selectedTest, setSelectedTest] =
    useState<DemoWorkshopTest | null>(null);
  const [tests, setTests] = useState(demoTests);
  const [loadError, setLoadError] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);

  useEffect(() => {
    if (import.meta.env.MODE === "test") return;
    return observeWorkshopTests((items) => {
      setTests(items); setLoadError(false);
    }, () => setLoadError(true));
  }, []);

  const filteredTests = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("it");

    return tests.filter((test) => {
      const matchesResult =
        result === "Tutti gli esiti" || test.result === result;
      const searchableText = [
        test.code,
        test.bikeCode,
        test.bikeLabel,
        test.repairCode ?? "",
        test.operatorLabel,
      ]
        .join(" ")
        .toLocaleLowerCase("it");

      return matchesResult && searchableText.includes(normalizedQuery);
    });
  }, [query, result, tests]);

  const resultLabel = `${filteredTests.length} ${
    filteredTests.length === 1 ? "collaudo trovato" : "collaudi trovati"
  }`;

  return (
    <section className="test-registry" aria-labelledby="tests-title">
      <div className="section-heading registry-heading">
        <div>
          <p className="eyebrow">Controlli tecnici</p>
          <h2 id="tests-title">Collaudi</h2>
          <p className="section-description">
            Consulta esiti e checklist dei collaudi dimostrativi consolidati.
          </p>
        </div>
        <button className="primary-action" type="button"
          onClick={() => setShowRegistration(true)}>
          Nuovo collaudo
        </button>
      </div>
      {loadError && <p className="notice-banner" role="alert">
        Registro collaudi non disponibile: verifica gli emulatori.
      </p>}

      <div className="registry-toolbar test-toolbar" role="search">
        <div className="field-group search-field">
          <label htmlFor="test-search">Cerca collaudo</label>
          <input
            id="test-search"
            type="search"
            placeholder="Codice, bicicletta, riparazione o operatore"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="field-group">
          <label htmlFor="test-result">Esito</label>
          <select
            id="test-result"
            value={result}
            onChange={(event) =>
              setResult(event.target.value as ResultFilter)
            }
          >
            <option>Tutti gli esiti</option>
            {testResults.map((testResult) => (
              <option key={testResult}>{testResult}</option>
            ))}
          </select>
        </div>
        <div className="result-count" role="status" aria-label={resultLabel}>
          <strong>{filteredTests.length}</strong>
          <span>
            {filteredTests.length === 1
              ? "collaudo trovato"
              : "collaudi trovati"}
          </span>
        </div>
      </div>

      <div className="registry-layout">
        <div className="registry-table-wrap">
          <table className="registry-table test-table">
            <caption className="sr-only">
              Collaudi dimostrativi presenti nel registro
            </caption>
            <thead>
              <tr>
                <th scope="col">Collaudo</th>
                <th scope="col">Collegamento</th>
                <th scope="col">Esito</th>
                <th scope="col">Operatore</th>
                <th scope="col">
                  <span className="sr-only">Azioni</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTests.map((test) => (
                <tr key={test.id}>
                  <td>
                    <span className="bike-code">{test.code}</span>
                    <strong>{test.bikeLabel}</strong>
                    <small>{test.performedLabel}</small>
                  </td>
                  <td>
                    <strong>{test.bikeCode}</strong>
                    <small>{test.repairCode ?? "Nessuna riparazione"}</small>
                  </td>
                  <td>
                    <TestResultBadge result={test.result} />
                  </td>
                  <td>{test.operatorLabel}</td>
                  <td>
                    <button
                      className="row-action"
                      type="button"
                      onClick={() => setSelectedTest(test)}
                      aria-label={`Apri collaudo ${test.code}`}
                    >
                      Apri
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredTests.length === 0 && (
            <div className="empty-state">
              <strong>Nessun collaudo trovato</strong>
              <span>Modifica la ricerca o seleziona un altro esito.</span>
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setQuery("");
                  setResult("Tutti gli esiti");
                }}
              >
                Azzera filtri
              </button>
            </div>
          )}
        </div>

        {selectedTest && (
          <TestDetail test={selectedTest} onClose={() => setSelectedTest(null)} />
        )}
      </div>
      {showRegistration && (
        <TestRegistrationForm onClose={() => setShowRegistration(false)} />
      )}
    </section>
  );
}

function TestResultBadge({ result }: { result: TestResult }) {
  return (
    <span
      className="test-result"
      data-result={result.toLocaleLowerCase("it")}
    >
      {result}
    </span>
  );
}

interface TestDetailProps {
  test: DemoWorkshopTest;
  onClose: () => void;
}

function TestDetail({ test, onClose }: TestDetailProps) {
  return (
    <aside
      className="test-detail"
      aria-labelledby="test-detail-title"
      data-testid="test-detail"
    >
      <div className="detail-heading">
        <div>
          <span className="bike-code">{test.code}</span>
          <h3 id="test-detail-title">{test.bikeLabel}</h3>
        </div>
        <button
          className="close-button"
          type="button"
          onClick={onClose}
          aria-label="Chiudi scheda collaudo"
        >
          ×
        </button>
      </div>

      <TestResultBadge result={test.result} />

      <dl className="bike-facts">
        <div>
          <dt>Bicicletta</dt>
          <dd>{test.bikeCode}</dd>
        </div>
        <div>
          <dt>Riparazione</dt>
          <dd>{test.repairCode ?? "Non collegata"}</dd>
        </div>
        <div>
          <dt>Data</dt>
          <dd>{test.performedLabel}</dd>
        </div>
        <div>
          <dt>Operatore</dt>
          <dd>{test.operatorLabel}</dd>
        </div>
      </dl>

      <div className="detail-section">
        <h4>Checklist tecnica</h4>
        <ul className="check-list">
          {test.checks.map((check) => (
            <li key={check.id}>
              <span
                className="check-indicator"
                data-check={check.result.toLocaleLowerCase("it")}
                aria-hidden="true"
              >
                {check.result === "Conforme"
                  ? "✓"
                  : check.result === "Non conforme"
                    ? "!"
                    : "–"}
              </span>
              <div>
                <strong>{check.label}</strong>
                <span>{check.result}</span>
                {check.note && <small>{check.note}</small>}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="detail-section">
        <h4>Prova su strada</h4>
        <p>
          {test.roadTest}
          {test.roadTestNote ? ` — ${test.roadTestNote}` : ""}
        </p>
      </div>

      <div className="detail-section">
        <h4>Note</h4>
        <p>{test.notes}</p>
      </div>
    </aside>
  );
}
