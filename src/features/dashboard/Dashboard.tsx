import { lazy, Suspense, useEffect, useState } from "react";
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
const ReceiptRegistry = lazy(() => import("../receipts/ReceiptRegistry").then(
  (module) => ({ default: module.ReceiptRegistry }),
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
  | "receipts"
  | "users";

type NavigationItem = {
  id: AppSection;
  label: string;
  roles?: string[];
};

const baseNavigationItems: NavigationItem[] = [
  { id: "dashboard", label: "Dashboard" },
  {
    id: "members",
    label: "Soci",
    roles: ["admin", "workshop_manager", "treasurer"],
  },
  {
    id: "bikes",
    label: "Biciclette",
    roles: [
      "admin",
      "workshop_manager",
      "operator",
      "volunteer",
      "treasurer",
      "read_only",
    ],
  },
  {
    id: "repairs",
    label: "Riparazioni",
    roles: [
      "admin",
      "workshop_manager",
      "operator",
      "treasurer",
      "read_only",
    ],
  },
  {
    id: "parts",
    label: "Ricambi",
    roles: [
      "admin",
      "workshop_manager",
      "operator",
      "volunteer",
      "treasurer",
      "read_only",
    ],
  },
  {
    id: "tests",
    label: "Collaudi",
    roles: [
      "admin",
      "workshop_manager",
      "operator",
      "volunteer",
      "treasurer",
      "read_only",
    ],
  },
  {
    id: "deliveries",
    label: "Consegne",
    roles: [
      "admin",
      "workshop_manager",
      "operator",
      "treasurer",
      "read_only",
    ],
  },
  {
    id: "receipts",
    label: "Ricevute",
    roles: [
      "admin",
      "workshop_manager",
      "operator",
      "treasurer",
      "read_only",
    ],
  },
  {
    id: "documents",
    label: "Documenti",
    roles: ["admin", "workshop_manager", "operator", "treasurer"],
  },
];

export function navigationItemsForRoles(roles: string[]) {
  const items = baseNavigationItems.filter((item) =>
    item.roles === undefined || item.roles.some((role) => roles.includes(role))
  );
  return roles.includes("admin")
    ? [...items, { id: "users" as const, label: "Utenti e ruoli" }]
    : items;
}

export function Dashboard({ user, onLogout }: DashboardProps) {
  const [section, setSection] = useState<AppSection>("dashboard");
  const navigationItems = navigationItemsForRoles(user.roles);

  useEffect(() => {
    if (!navigationItems.some((item) => item.id === section)) {
      setSection("dashboard");
    }
  }, [navigationItems, section]);

  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Salta al contenuto principale
      </a>
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
                  onClick={() => setSection(item.id)}
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

      <main className="dashboard" id="main-content" tabIndex={-1}>
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
            {section === "bikes" && <BikeRegistry userRoles={user.roles} />}
            {section === "repairs" && <RepairRegistry />}
            {section === "parts" && <PartRegistry />}
            {section === "tests" && <TestRegistry />}
            {section === "deliveries" && <DeliveryRegistry />}
            {section === "receipts" && <ReceiptRegistry />}
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
