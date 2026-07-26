import { lazy, Suspense, useState } from "react";
import type { DemoUser } from "../../app/App";
import { demoActivities, demoMetrics } from "./demoData";

const BikeRegistry = lazy(() => import("../bikes/BikeRegistry").then(
  (module) => ({ default: module.BikeRegistry }),
));
const DeliveryRegistry = lazy(() => import("../deliveries/DeliveryRegistry").then(
  (module) => ({ default: module.DeliveryRegistry }),
));
const PartRegistry = lazy(() => import("../parts/PartRegistry").then(
  (module) => ({ default: module.PartRegistry }),
));
const RepairRegistry = lazy(() => import("../repairs/RepairRegistry").then(
  (module) => ({ default: module.RepairRegistry }),
));
const TestRegistry = lazy(() => import("../tests/TestRegistry").then(
  (module) => ({ default: module.TestRegistry }),
));
const MemberRegistry = lazy(() => import("../members/MemberRegistry").then(
  (module) => ({ default: module.MemberRegistry }),
));
const UserAccessRegistry = lazy(() => import("../users/UserAccessRegistry").then(
  (module) => ({ default: module.UserAccessRegistry }),
));
const DocumentRegistry = lazy(() => import("../documents/DocumentRegistry").then(
  (module) => ({ default: module.DocumentRegistry }),
));

interface DashboardProps {
  user: DemoUser;
  onLogout: () => void;
}

type AppSection =
  | "dashboard"
  | "bikes"
  | "repairs"
  | "parts"
  | "tests"
  | "deliveries"
  | "members"
  | "documents"
  | "users";

const baseNavigationItems: Array<{
  id: AppSection | "disabled";
  label: string;
}> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "members", label: "Soci" },
  { id: "bikes", label: "Biciclette" },
  { id: "repairs", label: "Riparazioni" },
  { id: "parts", label: "Ricambi" },
  { id: "tests", label: "Collaudi" },
  { id: "deliveries", label: "Consegne" },
  { id: "documents", label: "Documenti" },
];

export function Dashboard({ user, onLogout }: DashboardProps) {
  const [section, setSection] = useState<AppSection>("dashboard");
  const navigationItems = user.roles.includes("admin")
    ? [...baseNavigationItems, { id: "users" as const, label: "Utenti e ruoli" }]
    : baseNavigationItems;

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navigazione principale">
        <div className="sidebar-brand">
          <span className="sidebar-logo" aria-hidden="true">
            B4C
          </span>
          <span>
            <strong>InControPedale</strong>
            <small>Ciclofficina</small>
          </span>
        </div>

        <nav>
          <ul>
            {navigationItems.map((item, index) => (
              <li key={item.label}>
                <button
                  className={
                    item.id === section ? "nav-item active" : "nav-item"
                  }
                  type="button"
                  aria-current={item.id === section ? "page" : undefined}
                  disabled={item.id === "disabled"}
                  title={
                    item.id === "disabled"
                      ? "Modulo non ancora disponibile"
                      : ""
                  }
                  onClick={() => {
                    if (item.id !== "disabled") {
                      setSection(item.id);
                    }
                  }}
                >
                  <span aria-hidden="true">{index + 1}</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <span className="demo-pill">Prototipo</span>
          <small>Solo dati fittizi</small>
        </div>
      </aside>

      <main className="dashboard">
        <header className="topbar">
          <div>
            <p className="eyebrow">Venerdì 24 luglio 2026</p>
            <h1>Buon lavoro, {user.name.split(" ")[0]}</h1>
          </div>
          <div className="user-menu">
            <span className="avatar" aria-hidden="true">
              GD
            </span>
            <span>
              <strong>{user.name}</strong>
              <small>{user.role}</small>
            </span>
            <button className="text-button" type="button" onClick={onLogout}>
              Esci
            </button>
          </div>
        </header>

        <section className="notice-banner" aria-label="Avviso ambiente demo">
          <strong>Ambiente dimostrativo</strong>
          <span>
            I numeri e le attività mostrate sono fittizi. Non inserire dati
            personali reali.
          </span>
        </section>

        {section === "dashboard" && <DashboardOverview />}
        {section !== "dashboard" && (
          <Suspense fallback={
            <p className="module-loading" role="status">
              Caricamento del modulo…
            </p>
          }>
            {section === "members" && <MemberRegistry />}
            {section === "users" && <UserAccessRegistry />}
            {section === "bikes" && <BikeRegistry />}
            {section === "repairs" && <RepairRegistry />}
            {section === "parts" && <PartRegistry />}
            {section === "tests" && <TestRegistry />}
            {section === "deliveries" && <DeliveryRegistry />}
            {section === "documents" && <DocumentRegistry />}
          </Suspense>
        )}
      </main>
    </div>
  );
}

function DashboardOverview() {
  return (
    <>
      <section aria-labelledby="overview-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Situazione della ciclofficina</p>
              <h2 id="overview-title">Panoramica</h2>
            </div>
            <button className="secondary-button" type="button" disabled>
              Nuova registrazione
            </button>
          </div>

          <div className="metrics-grid">
            {demoMetrics.map((metric) => (
              <article className={`metric-card ${metric.tone}`} key={metric.label}>
                <p>{metric.label}</p>
                <strong>{metric.value}</strong>
                <span>{metric.detail}</span>
              </article>
            ))}
          </div>
        </section>

        <div className="dashboard-grid">
          <section className="panel" aria-labelledby="activity-title">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Aggiornamenti recenti</p>
                <h2 id="activity-title">Attività in corso</h2>
              </div>
              <button className="text-button" type="button" disabled>
                Vedi tutte
              </button>
            </div>

            <ul className="activity-list">
              {demoActivities.map((activity) => (
                <li key={activity.code}>
                  <div>
                    <span className="activity-code">{activity.code}</span>
                    <strong>{activity.title}</strong>
                    <small>{activity.updatedLabel}</small>
                  </div>
                  <span className="status-badge">{activity.status}</span>
                </li>
              ))}
            </ul>
          </section>

          <aside className="panel priorities" aria-labelledby="priority-title">
            <p className="eyebrow">Da controllare</p>
            <h2 id="priority-title">Priorità di oggi</h2>
            <ul>
              <li>
                <strong>2 collaudi da completare</strong>
                <span>Prima delle consegne previste</span>
              </li>
              <li>
                <strong>3 lavorazioni da assegnare</strong>
                <span>In attesa di un operatore</span>
              </li>
              <li>
                <strong>1 ricambio sotto scorta</strong>
                <span>Copertone urbano 28"</span>
              </li>
            </ul>
          </aside>
        </div>
    </>
  );
}
