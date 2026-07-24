export type BikeStatus =
  | "Da valutare"
  | "Da riparare"
  | "In lavorazione"
  | "In attesa ricambi"
  | "Pronta"
  | "Consegnata";

export interface DemoBike {
  id: string;
  code: string;
  brand: string;
  model: string;
  color: string;
  type: string;
  frameSize: string;
  frameNumber: string | null;
  condition: string;
  status: BikeStatus;
  location: string;
  receivedLabel: string;
  intendedDestination: string;
  accessories: string[];
  notes: string;
}

export const bikeStatuses: BikeStatus[] = [
  "Da valutare",
  "Da riparare",
  "In lavorazione",
  "In attesa ricambi",
  "Pronta",
  "Consegnata",
];

export const demoBikes: DemoBike[] = [
  {
    id: "bike-demo-0014",
    code: "BICI-2026-0014",
    brand: "Atala",
    model: "City Tour",
    color: "Verde",
    type: "City bike",
    frameSize: "M",
    frameNumber: "DEMO-A14",
    condition: "Buona base, freni da verificare",
    status: "Da valutare",
    location: "Zona accettazione",
    receivedLabel: "23 luglio 2026",
    intendedDestination: "Da definire",
    accessories: ["Portapacchi", "Campanello"],
    notes: "Bicicletta e dati interamente fittizi per il prototipo.",
  },
  {
    id: "bike-demo-0013",
    code: "BICI-2026-0013",
    brand: "Bianchi",
    model: "Spillo Demo",
    color: "Blu",
    type: "City bike",
    frameSize: "L",
    frameNumber: "DEMO-B13",
    condition: "Trasmissione usurata",
    status: "In lavorazione",
    location: "Cavalletto 2",
    receivedLabel: "18 luglio 2026",
    intendedDestination: "Cessione",
    accessories: ["Luci", "Cavalletto"],
    notes: "In corso sostituzione della catena e regolazione del cambio.",
  },
  {
    id: "bike-demo-0012",
    code: "BICI-2026-0012",
    brand: "Decathlon",
    model: "Riverside Demo",
    color: "Grigio",
    type: "Ibrida",
    frameSize: "M",
    frameNumber: null,
    condition: "Telaio integro, ruota posteriore danneggiata",
    status: "In attesa ricambi",
    location: "Scaffale B",
    receivedLabel: "12 luglio 2026",
    intendedDestination: "Donazione",
    accessories: ["Parafanghi"],
    notes: "In attesa di una ruota posteriore compatibile.",
  },
  {
    id: "bike-demo-0011",
    code: "BICI-2026-0011",
    brand: "Olmo",
    model: "Passeggio",
    color: "Rosso",
    type: "City bike",
    frameSize: "S",
    frameNumber: "DEMO-O11",
    condition: "Revisionata",
    status: "Pronta",
    location: "Area biciclette pronte",
    receivedLabel: "4 luglio 2026",
    intendedDestination: "Cessione",
    accessories: ["Cestino", "Campanello", "Cavalletto"],
    notes: "Collaudo dimostrativo completato con esito positivo.",
  },
  {
    id: "bike-demo-0010",
    code: "BICI-2026-0010",
    brand: "Graziella",
    model: "Pieghevole",
    color: "Bianco",
    type: "Pieghevole",
    frameSize: "Unica",
    frameNumber: "DEMO-G10",
    condition: "Da revisionare completamente",
    status: "Da riparare",
    location: "Scaffale A",
    receivedLabel: "29 giugno 2026",
    intendedDestination: "Da definire",
    accessories: [],
    notes: "Verificare snodo telaio prima di autorizzare la lavorazione.",
  },
  {
    id: "bike-demo-0009",
    code: "BICI-2026-0009",
    brand: "Legnano",
    model: "Roma Demo",
    color: "Nero",
    type: "City bike",
    frameSize: "L",
    frameNumber: "DEMO-L09",
    condition: "Consegnata dopo revisione",
    status: "Consegnata",
    location: "Fuori sede",
    receivedLabel: "20 giugno 2026",
    intendedDestination: "Donazione",
    accessories: ["Portapacchi"],
    notes: "Verbale e soggetti sono dimostrativi.",
  },
];
