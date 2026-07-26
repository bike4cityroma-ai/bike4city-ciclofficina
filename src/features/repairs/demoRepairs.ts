export type RepairStatus =
  | "Accettata"
  | "Diagnosticata"
  | "In attesa autorizzazione"
  | "In attesa ricambi"
  | "In lavorazione"
  | "In verifica sicurezza"
  | "Pronta"
  | "Collaudata"
  | "Annullata";

export interface DemoRepair {
  id: string;
  code: string;
  acceptedLabel: string;
  customerType: "Socio" | "Non socio" | "Organizzazione";
  customerLabel: string;
  bikeLabel: string;
  frameNumber: string | null;
  declaredIssue: string;
  diagnosis: string;
  proposedWork: string[];
  requestedWork: string[];
  completedWork: string[];
  parts: string[];
  assignedTo: string[];
  minutesSpent: number;
  expectedDeliveryLabel: string;
  status: RepairStatus;
  activityClassification: string;
}

export const repairStatuses: RepairStatus[] = [
  "Accettata",
  "Diagnosticata",
  "In attesa autorizzazione",
  "In attesa ricambi",
  "In lavorazione",
  "Pronta",
  "Collaudata",
  "Annullata",
];

export const demoRepairs: DemoRepair[] = [
  {
    id: "repair-demo-0010",
    code: "RIP-2026-0010",
    acceptedLabel: "25 luglio 2026",
    customerType: "Socio",
    customerLabel: "Socio Demo 310",
    bikeLabel: "City bike blu · telaio M",
    frameNumber: "DEMO-R10",
    declaredIssue: "La ruota posteriore produce un rumore.",
    diagnosis: "Raggiatura non uniforme rilevata al controllo.",
    proposedWork: ["Centratura ruota posteriore"],
    requestedWork: ["Controllo ruota posteriore"],
    completedWork: [],
    parts: [],
    assignedTo: [],
    minutesSpent: 0,
    expectedDeliveryLabel: "30 luglio 2026",
    status: "In attesa autorizzazione",
    activityClassification: "Da classificare",
  },
  {
    id: "repair-demo-0009",
    code: "RIP-2026-0009",
    acceptedLabel: "24 luglio 2026",
    customerType: "Socio",
    customerLabel: "Socio Demo 104",
    bikeLabel: "Trekking blu · telaio M",
    frameNumber: "DEMO-R09",
    declaredIssue: "Il cambio salta sotto sforzo.",
    diagnosis: "Non compilata",
    proposedWork: [],
    requestedWork: ["Controllo trasmissione", "Regolazione cambio"],
    completedWork: [],
    parts: ["Cavo cambio"],
    assignedTo: ["Marco Demo"],
    minutesSpent: 35,
    expectedDeliveryLabel: "29 luglio 2026",
    status: "Accettata",
    activityClassification: "Da classificare",
  },
  {
    id: "repair-demo-0008",
    code: "RIP-2026-0008",
    acceptedLabel: "23 luglio 2026",
    customerType: "Non socio",
    customerLabel: "Utente Demo 208",
    bikeLabel: "City bike verde · telaio M",
    frameNumber: "DEMO-R08",
    declaredIssue: "Freno posteriore poco efficace.",
    diagnosis: "Pattini usurati e cavo da registrare.",
    proposedWork: ["Sostituzione pattini", "Registrazione cavo"],
    requestedWork: ["Revisione freno posteriore"],
    completedWork: ["Pulizia pista frenante"],
    parts: ["Coppia pattini freno recuperati"],
    assignedTo: ["Giulia Demo", "Volontario Demo"],
    minutesSpent: 50,
    expectedDeliveryLabel: "25 luglio 2026",
    status: "In lavorazione",
    activityClassification: "Da classificare",
  },
  {
    id: "repair-demo-0007",
    code: "RIP-2026-0007",
    acceptedLabel: "21 luglio 2026",
    customerType: "Socio",
    customerLabel: "Socio Demo 087",
    bikeLabel: "Mountain bike nera · telaio L",
    frameNumber: "DEMO-R07",
    declaredIssue: "Ruota anteriore perde pressione.",
    diagnosis: "Camera d'aria forata; copertone ancora utilizzabile.",
    proposedWork: ["Sostituzione camera d'aria"],
    requestedWork: ["Riparazione foratura", "Controllo generale"],
    completedWork: ["Smontaggio ruota", "Controllo copertone"],
    parts: [],
    assignedTo: ["Paola Demo"],
    minutesSpent: 25,
    expectedDeliveryLabel: "26 luglio 2026",
    status: "In attesa ricambi",
    activityClassification: "Da classificare",
  },
  {
    id: "repair-demo-0006",
    code: "RIP-2026-0006",
    acceptedLabel: "18 luglio 2026",
    customerType: "Socio",
    customerLabel: "Socio Demo 121",
    bikeLabel: "Pieghevole rossa · misura unica",
    frameNumber: null,
    declaredIssue: "Rumore durante la pedalata.",
    diagnosis: "Movimento centrale da registrare.",
    proposedWork: ["Registrazione movimento centrale"],
    requestedWork: ["Controllo movimento centrale"],
    completedWork: ["Registrazione movimento centrale", "Prova statica"],
    parts: [],
    assignedTo: ["Giulia Demo"],
    minutesSpent: 70,
    expectedDeliveryLabel: "24 luglio 2026",
    status: "Pronta",
    activityClassification: "Da classificare",
  },
  {
    id: "repair-demo-0005",
    code: "RIP-2026-0005",
    acceptedLabel: "15 luglio 2026",
    customerType: "Non socio",
    customerLabel: "Utente Demo 190",
    bikeLabel: "Bici da corsa grigia · telaio 54",
    frameNumber: "DEMO-R05",
    declaredIssue: "Richiesto controllo prima di un viaggio.",
    diagnosis: "Nessuna criticità strutturale rilevata.",
    proposedWork: ["Controllo serraggi e regolazioni"],
    requestedWork: ["Controllo sicurezza", "Regolazione pressione"],
    completedWork: ["Controllo serraggi", "Regolazione freni", "Prova su strada"],
    parts: [],
    assignedTo: ["Marco Demo"],
    minutesSpent: 80,
    expectedDeliveryLabel: "22 luglio 2026",
    status: "Collaudata",
    activityClassification: "Da classificare",
  },
];
