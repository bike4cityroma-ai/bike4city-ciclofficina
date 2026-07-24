export type TestResult = "Positivo" | "Negativo" | "Condizionato";
export type CheckResult = "Conforme" | "Non conforme" | "Non applicabile";

export interface DemoTestCheck {
  id: string;
  label: string;
  result: CheckResult;
  note: string | null;
}

export interface DemoWorkshopTest {
  id: string;
  code: string;
  bikeCode: string;
  bikeLabel: string;
  repairCode: string | null;
  performedLabel: string;
  operatorLabel: string;
  result: TestResult;
  roadTest: CheckResult;
  roadTestNote: string | null;
  checks: DemoTestCheck[];
  notes: string;
}

export const testResults: TestResult[] = [
  "Positivo",
  "Negativo",
  "Condizionato",
];

export const demoTests: DemoWorkshopTest[] = [
  {
    id: "test-demo-0011",
    code: "COL-2026-0011",
    bikeCode: "BICI-2026-0011",
    bikeLabel: "Olmo Passeggio · rossa",
    repairCode: null,
    performedLabel: "24 luglio 2026, 16:10",
    operatorLabel: "Giulia Demo",
    result: "Positivo",
    roadTest: "Conforme",
    roadTestNote: null,
    checks: createChecks(),
    notes: "Collaudo dimostrativo completato senza anomalie.",
  },
  {
    id: "test-demo-0010",
    code: "COL-2026-0010",
    bikeCode: "BICI-DEMO-R05",
    bikeLabel: "Bici da corsa grigia · telaio 54",
    repairCode: "RIP-2026-0005",
    performedLabel: "22 luglio 2026, 11:45",
    operatorLabel: "Marco Demo",
    result: "Positivo",
    roadTest: "Conforme",
    roadTestNote: null,
    checks: createChecks({
      lights: ["Non applicabile", "Bicicletta non dotata di luci."],
      bell: ["Non applicabile", "Accessorio non presente in accettazione."],
    }),
    notes: "Controllo sicurezza completato.",
  },
  {
    id: "test-demo-0009",
    code: "COL-2026-0009",
    bikeCode: "BICI-DEMO-R04",
    bikeLabel: "City bike azzurra · telaio S",
    repairCode: "RIP-2026-0004",
    performedLabel: "20 luglio 2026, 17:20",
    operatorLabel: "Paola Demo",
    result: "Negativo",
    roadTest: "Non applicabile",
    roadTestNote: "Prova non eseguita a causa dell'esito freni.",
    checks: createChecks({
      brakes: ["Non conforme", "Il freno anteriore non mantiene la regolazione."],
      road: ["Non applicabile", "Prova sospesa."],
    }),
    notes: "Intervento rinviato in lavorazione.",
  },
  {
    id: "test-demo-0008",
    code: "COL-2026-0008",
    bikeCode: "BICI-DEMO-R03",
    bikeLabel: "Trekking verde · telaio L",
    repairCode: "RIP-2026-0003",
    performedLabel: "18 luglio 2026, 15:00",
    operatorLabel: "Giulia Demo",
    result: "Condizionato",
    roadTest: "Conforme",
    roadTestNote: null,
    checks: createChecks({
      lights: ["Non conforme", "Luce posteriore non funzionante."],
    }),
    notes:
      "Esito condizionato usato solo come esempio; significato da approvare.",
  },
];

type CheckOverride = Partial<
  Record<
    "wheels" | "tires" | "brakes" | "steering" | "drivetrain" | "gears" | "pedals" | "saddle" | "lights" | "bell" | "road",
    [CheckResult, string | null]
  >
>;

function createChecks(overrides: CheckOverride = {}): DemoTestCheck[] {
  const definitions: Array<{
    id: keyof CheckOverride;
    label: string;
  }> = [
    { id: "wheels", label: "Serraggio ruote" },
    { id: "tires", label: "Pneumatici e pressione" },
    { id: "brakes", label: "Freni" },
    { id: "steering", label: "Sterzo" },
    { id: "drivetrain", label: "Trasmissione" },
    { id: "gears", label: "Cambio" },
    { id: "pedals", label: "Pedali" },
    { id: "saddle", label: "Sella" },
    { id: "lights", label: "Luci" },
    { id: "bell", label: "Campanello" },
    { id: "road", label: "Prova su strada" },
  ];

  return definitions.map(({ id, label }) => {
    const override = overrides[id];

    return {
      id,
      label,
      result: override?.[0] ?? "Conforme",
      note: override?.[1] ?? null,
    };
  });
}
