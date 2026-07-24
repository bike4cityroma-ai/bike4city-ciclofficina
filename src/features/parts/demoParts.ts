export type PartOrigin = "Recuperato" | "Acquistato" | "Portato dall'utente";

export interface DemoPartMovement {
  id: string;
  type: "Carico" | "Utilizzo" | "Rettifica" | "Reso";
  quantity: number;
  occurredLabel: string;
  reason: string;
  relatedCode: string | null;
  operatorLabel: string;
}

export interface DemoPart {
  id: string;
  code: string;
  category: string;
  description: string;
  brand: string | null;
  compatibility: string;
  origin: PartOrigin;
  condition: string;
  location: string;
  quantityOnHand: number;
  sourceBikeCode: string | null;
  movements: DemoPartMovement[];
  notes: string;
}

export const partCategories = [
  "Freni",
  "Ruote",
  "Trasmissione",
  "Accessori",
  "Pneumatici",
] as const;

export const partOrigins: PartOrigin[] = [
  "Recuperato",
  "Acquistato",
  "Portato dall'utente",
];

export const demoParts: DemoPart[] = [
  {
    id: "part-demo-0042",
    code: "RIC-2026-0042",
    category: "Freni",
    description: "Coppia pattini freno V-brake",
    brand: "Demo Parts",
    compatibility: "Cerchi in alluminio, attacco V-brake",
    origin: "Recuperato",
    condition: "Buono",
    location: "Cassettiera F-2",
    quantityOnHand: 4,
    sourceBikeCode: "BICI-2026-0008",
    movements: [
      {
        id: "move-demo-101",
        type: "Carico",
        quantity: 6,
        occurredLabel: "12 luglio 2026",
        reason: "Recupero da bicicletta dimostrativa",
        relatedCode: "BICI-2026-0008",
        operatorLabel: "Marco Demo",
      },
      {
        id: "move-demo-102",
        type: "Utilizzo",
        quantity: -2,
        occurredLabel: "23 luglio 2026",
        reason: "Montaggio su riparazione",
        relatedCode: "RIP-2026-0008",
        operatorLabel: "Giulia Demo",
      },
    ],
    notes: "Componenti fittizi controllati visivamente.",
  },
  {
    id: "part-demo-0041",
    code: "RIC-2026-0041",
    category: "Pneumatici",
    description: "Camera d'aria 26 × 1.75",
    brand: "Demo Tube",
    compatibility: "Ruote 26 pollici, valvola Schrader",
    origin: "Acquistato",
    condition: "Nuovo",
    location: "Scaffale P-1",
    quantityOnHand: 0,
    sourceBikeCode: null,
    movements: [
      {
        id: "move-demo-103",
        type: "Carico",
        quantity: 3,
        occurredLabel: "10 luglio 2026",
        reason: "Acquisto dimostrativo",
        relatedCode: null,
        operatorLabel: "Giulia Demo",
      },
      {
        id: "move-demo-104",
        type: "Utilizzo",
        quantity: -3,
        occurredLabel: "22 luglio 2026",
        reason: "Utilizzo su interventi dimostrativi",
        relatedCode: "RIP-2026-0007",
        operatorLabel: "Paola Demo",
      },
    ],
    notes: "Quantità esaurita; il prototipo non effettua ordini.",
  },
  {
    id: "part-demo-0040",
    code: "RIC-2026-0040",
    category: "Trasmissione",
    description: "Catena 7/8 velocità",
    brand: "Demo Chain",
    compatibility: "Trasmissioni 7 o 8 velocità",
    origin: "Acquistato",
    condition: "Nuovo",
    location: "Cassettiera T-1",
    quantityOnHand: 2,
    sourceBikeCode: null,
    movements: [
      {
        id: "move-demo-105",
        type: "Carico",
        quantity: 3,
        occurredLabel: "8 luglio 2026",
        reason: "Acquisto dimostrativo",
        relatedCode: null,
        operatorLabel: "Marco Demo",
      },
      {
        id: "move-demo-106",
        type: "Utilizzo",
        quantity: -1,
        occurredLabel: "19 luglio 2026",
        reason: "Sostituzione durante una lavorazione",
        relatedCode: "RIP-2026-0004",
        operatorLabel: "Marco Demo",
      },
    ],
    notes: "Conservare nella confezione.",
  },
  {
    id: "part-demo-0039",
    code: "RIC-2026-0039",
    category: "Ruote",
    description: "Ruota posteriore 28 pollici",
    brand: null,
    compatibility: "City bike, pacco pignoni a filetto",
    origin: "Recuperato",
    condition: "Da revisionare",
    location: "Rastrelliera R-3",
    quantityOnHand: 1,
    sourceBikeCode: "BICI-2026-0007",
    movements: [
      {
        id: "move-demo-107",
        type: "Carico",
        quantity: 1,
        occurredLabel: "5 luglio 2026",
        reason: "Recupero da bicicletta smontata",
        relatedCode: "BICI-2026-0007",
        operatorLabel: "Giulia Demo",
      },
    ],
    notes: "Verificare centratura prima dell'uso.",
  },
  {
    id: "part-demo-0038",
    code: "RIC-2026-0038",
    category: "Accessori",
    description: "Campanello cromato",
    brand: null,
    compatibility: "Manubri diametro standard",
    origin: "Recuperato",
    condition: "Buono",
    location: "Cassettiera A-4",
    quantityOnHand: 5,
    sourceBikeCode: "BICI-2026-0006",
    movements: [
      {
        id: "move-demo-108",
        type: "Carico",
        quantity: 5,
        occurredLabel: "2 luglio 2026",
        reason: "Raggruppamento accessori recuperati",
        relatedCode: "BICI-2026-0006",
        operatorLabel: "Volontario Demo",
      },
    ],
    notes: "Tutti i campanelli sono stati provati.",
  },
  {
    id: "part-demo-0037",
    code: "RIC-2026-0037",
    category: "Freni",
    description: "Cavo freno anteriore",
    brand: "Demo Cable",
    compatibility: "Freni meccanici standard",
    origin: "Portato dall'utente",
    condition: "Nuovo",
    location: "Vassoio lavori assegnati",
    quantityOnHand: 1,
    sourceBikeCode: null,
    movements: [
      {
        id: "move-demo-109",
        type: "Carico",
        quantity: 1,
        occurredLabel: "24 luglio 2026",
        reason: "Ricambio consegnato per uno specifico intervento",
        relatedCode: "RIP-2026-0009",
        operatorLabel: "Giulia Demo",
      },
    ],
    notes: "Non disponibile per altre lavorazioni.",
  },
];
