import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../firebase/client";
import type {
  CheckResult,
  DemoWorkshopTest,
  TestResult,
} from "./demoTests";

export interface ReadyRepair {
  id: string;
  code: string;
  bikeLabel: string;
}

export function observeWorkshopTests(
  onData: (tests: DemoWorkshopTest[], fromCache: boolean) => void,
  onError: () => void,
) {
  return onSnapshot(
    query(collection(db, "tests"), orderBy("performedAt", "desc")),
    (snapshot) =>
      onData(snapshot.docs.map(mapTest), snapshot.metadata.fromCache),
    onError,
  );
}

export function observeReadyRepairs(
  onData: (repairs: ReadyRepair[]) => void,
  onError: () => void,
) {
  return onSnapshot(
    query(collection(db, "repairs"), where("status", "==", "Pronta")),
    (snapshot) => onData(snapshot.docs.map((item) => ({
      id: item.id,
      code: String(item.data().code),
      bikeLabel: String(item.data().bikeLabel),
    }))),
    onError,
  );
}

export async function createWorkshopTest(input: {
  repairId: string;
  checks: Record<string, { result: CheckResult; note: string | null }>;
  roadTestDetails: {
    performed: boolean;
    routeType: "controlled_area";
    publicRoad: false;
    durationMinutes: number;
    conditions: string;
    operatorAuthorized: boolean;
    authorizedWorkConfirmed: boolean;
    helmetUsed: boolean;
    highVisibilityUsed: boolean;
  };
  notes: string;
  idempotencyKey: string;
}) {
  const callable = httpsCallable<typeof input, {
    id: string;
    code: string;
    result: TestResult;
  }>(functions, "createWorkshopTest");
  return (await callable(input)).data;
}

function mapTest(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): DemoWorkshopTest {
  const data = snapshot.data();
  const performedAt = data.performedAt as Timestamp | undefined;
  const checks = data.checks as Record<string, {
    result: CheckResult;
    note: string | null;
  }>;
  const labels: Record<string, string> = {
    wheels: "Serraggio ruote",
    tires: "Pneumatici e pressione",
    brakes: "Freni",
    steering: "Sterzo",
    drivetrain: "Trasmissione",
    gears: "Cambio",
    pedals: "Pedali",
    saddle: "Sella",
    lights: "Luci",
    bell: "Campanello",
    road: "Prova su strada",
  };
  return {
    id: snapshot.id,
    code: String(data.code),
    bikeCode: String(data.bikeCode ?? "Bicicletta esterna"),
    bikeLabel: String(data.bikeLabel),
    repairCode: String(data.repairCode),
    performedLabel: performedAt
      ? new Intl.DateTimeFormat("it-IT", {
          dateStyle: "medium", timeStyle: "short",
        }).format(performedAt.toDate())
      : "Data non disponibile",
    operatorLabel: String(data.operatorLabel),
    result: data.result,
    roadTest: checks.road.result,
    roadTestNote: checks.road.note,
    checks: Object.entries(checks).map(([id, check]) => ({
      id,
      label: labels[id] ?? id,
      result: check.result,
      note: check.note,
    })),
    notes: String(data.notes),
  };
}
