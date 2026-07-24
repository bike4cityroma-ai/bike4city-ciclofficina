import type { DemoUser } from "../../app/App";
import { demoActivities, demoMetrics } from "./demoData";

interface DashboardProps {
  user: DemoUser;
  onLogout: () => void;
}

const navigationItems = [
  "Dashboard",
  "Biciclette",
  "Riparazioni",
  "Ricambi",
  "Collaudi",
  "Consegne",
];

export function Dashboard({ user, onLogout }: DashboardProps) {
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
              <li key={item}>
                <button
                  className={index === 0 ? "nav-item active" : "nav-item"}
                  type="button"
                  aria-current={index === 0 ? "page" : undefined}
                  disabled={index !== 0}
                  title={index !== 0 ? "Modulo non ancora disponibile" : ""}
                >
                  <span aria-hidden="true">{index + 1}</span>
                  {item}
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
      </main>
    </div>
  );
}
