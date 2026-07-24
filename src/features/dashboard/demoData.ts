export interface DashboardMetric {
  label: string;
  value: number;
  detail: string;
  tone: "blue" | "green" | "orange" | "violet";
}

export interface WorkshopActivity {
  code: string;
  title: string;
  status: "In lavorazione" | "In attesa ricambi" | "Da valutare";
  updatedLabel: string;
}

export const demoMetrics: DashboardMetric[] = [
  {
    label: "Biciclette presenti",
    value: 18,
    detail: "5 pronte per la consegna",
    tone: "blue",
  },
  {
    label: "Riparazioni aperte",
    value: 9,
    detail: "3 assegnate oggi",
    tone: "orange",
  },
  {
    label: "Ricambi recuperati",
    value: 42,
    detail: "Dati dimostrativi",
    tone: "green",
  },
  {
    label: "Ore volontariato",
    value: 76,
    detail: "Stima del mese corrente",
    tone: "violet",
  },
];

export const demoActivities: WorkshopActivity[] = [
  {
    code: "RIP-2026-0007",
    title: "Regolazione cambio e controllo freni",
    status: "In lavorazione",
    updatedLabel: "Aggiornata oggi",
  },
  {
    code: "BICI-2026-0014",
    title: "City bike verde, telaio M",
    status: "Da valutare",
    updatedLabel: "Ricevuta ieri",
  },
  {
    code: "RIP-2026-0006",
    title: "Sostituzione copertone posteriore",
    status: "In attesa ricambi",
    updatedLabel: "Aggiornata 2 giorni fa",
  },
];
