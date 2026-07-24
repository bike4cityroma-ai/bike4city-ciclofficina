export type DeliveryType = "Donazione" | "Cessione" | "Riconsegna riparazione";

export interface DemoDelivery {
  id: string;
  code: string;
  deliveredLabel: string;
  type: DeliveryType;
  recipientLabel: string;
  recipientType: "Socio" | "Non socio" | "Ente dimostrativo";
  bikeCode: string;
  bikeLabel: string;
  repairCode: string | null;
  testCode: string;
  conditionSnapshot: string;
  accessories: string[];
  contributionAmount: number | null;
  receiptCode: string | null;
  documentCode: string;
  deliveredBy: string;
  classificationLabel: string;
  declarations: string[];
  notes: string;
}

export const deliveryTypes: DeliveryType[] = [
  "Donazione",
  "Cessione",
  "Riconsegna riparazione",
];

export const demoDeliveries: DemoDelivery[] = [
  {
    id: "delivery-demo-0006",
    code: "CON-2026-0006",
    deliveredLabel: "24 luglio 2026, 18:00",
    type: "Cessione",
    recipientLabel: "Socio Demo 132",
    recipientType: "Socio",
    bikeCode: "BICI-2026-0011",
    bikeLabel: "Olmo Passeggio · rossa",
    repairCode: null,
    testCode: "COL-2026-0011",
    conditionSnapshot: "Revisionata e collaudata",
    accessories: ["Cestino", "Campanello", "Cavalletto"],
    contributionAmount: 80,
    receiptCode: "DOC-2026-0018",
    documentCode: "VER-2026-0006",
    deliveredBy: "Giulia Demo",
    classificationLabel: "Da classificare",
    declarations: [
      "Condizioni della bicicletta illustrate al ricevente.",
      "Verbale dimostrativo privo di valore operativo.",
    ],
    notes: "Soggetto, contributo e documenti sono interamente fittizi.",
  },
  {
    id: "delivery-demo-0005",
    code: "CON-2026-0005",
    deliveredLabel: "22 luglio 2026, 12:20",
    type: "Riconsegna riparazione",
    recipientLabel: "Utente Demo 190",
    recipientType: "Non socio",
    bikeCode: "BICI-DEMO-R05",
    bikeLabel: "Bici da corsa grigia · telaio 54",
    repairCode: "RIP-2026-0005",
    testCode: "COL-2026-0010",
    conditionSnapshot: "Controllata e collaudata",
    accessories: [],
    contributionAmount: 35,
    receiptCode: "DOC-2026-0017",
    documentCode: "VER-2026-0005",
    deliveredBy: "Marco Demo",
    classificationLabel: "Da classificare",
    declarations: ["Interventi eseguiti riepilogati al ricevente."],
    notes: "Nessun dato personale reale.",
  },
  {
    id: "delivery-demo-0004",
    code: "CON-2026-0004",
    deliveredLabel: "19 luglio 2026, 10:30",
    type: "Donazione",
    recipientLabel: "Ente Sociale Demo",
    recipientType: "Ente dimostrativo",
    bikeCode: "BICI-2026-0009",
    bikeLabel: "Legnano Roma Demo · nera",
    repairCode: null,
    testCode: "COL-2026-0007",
    conditionSnapshot: "Revisionata, normali segni d'uso",
    accessories: ["Portapacchi"],
    contributionAmount: null,
    receiptCode: null,
    documentCode: "VER-2026-0004",
    deliveredBy: "Giulia Demo",
    classificationLabel: "Cessione gratuita da validare",
    declarations: ["Consegna gratuita registrata a scopo dimostrativo."],
    notes: "Ente inesistente utilizzato esclusivamente nel prototipo.",
  },
  {
    id: "delivery-demo-0003",
    code: "CON-2026-0003",
    deliveredLabel: "15 luglio 2026, 17:10",
    type: "Riconsegna riparazione",
    recipientLabel: "Socio Demo 075",
    recipientType: "Socio",
    bikeCode: "BICI-DEMO-R02",
    bikeLabel: "City bike blu · telaio L",
    repairCode: "RIP-2026-0002",
    testCode: "COL-2026-0006",
    conditionSnapshot: "Riparazione completata e collaudata",
    accessories: ["Luci", "Lucchetto dimostrativo"],
    contributionAmount: null,
    receiptCode: null,
    documentCode: "VER-2026-0003",
    deliveredBy: "Paola Demo",
    classificationLabel: "Da classificare",
    declarations: ["Bicicletta riconsegnata con gli accessori registrati."],
    notes: "Verbale dimostrativo.",
  },
];
