import {
  collection,
  onSnapshot,
  orderBy,
  doc,
  query,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../firebase/client";
import type { DemoRepair } from "./demoRepairs";

export interface NewRepairInput {
  idempotencyKey: string;
  customerType: "Socio" | "Non socio";
  customerLabel: string;
  bikeLabel: string;
  frameNumber: string | null;
  declaredIssue: string;
  requestedWork: string[];
  expectedDeliveryDate: string | null;
  notes: string;
}

export interface RepairStatusEvent {
  id: string;
  from: string;
  to: string;
  reason: string;
  changedLabel: string;
}

export interface AvailablePart {
  id: string;
  code: string;
  description: string;
  quantity: number;
}

export function observeRepairs(
  onData: (repairs: DemoRepair[]) => void,
  onError: () => void,
) {
  const repairsQuery = query(
    collection(db, "repairs"),
    orderBy("acceptedAt", "desc"),
  );
  return onSnapshot(
    repairsQuery,
    (snapshot) => onData(snapshot.docs.map(mapRepair)),
    onError,
  );
}

export async function createRepair(input: NewRepairInput) {
  const callable = httpsCallable<
    NewRepairInput,
    { id: string; code: string }
  >(functions, "createRepair");
  return (await callable(input)).data;
}

export async function updateRepairWorkflow(input: {
  repairId: string;
  newStatus: string;
  reason: string;
  diagnosis: string;
  proposedWork: string[];
  completedWork: string[];
  minutesSpent: number;
  noPartsUsed: boolean;
  idempotencyKey: string;
}) {
  const callable = httpsCallable<typeof input, {
    repairId: string;
    previousStatus: string;
    newStatus: string;
  }>(functions, "updateRepairWorkflow");
  return (await callable(input)).data;
}

export function observeRepairStatusHistory(
  repairId: string,
  onData: (events: RepairStatusEvent[]) => void,
  onError: () => void,
) {
  const historyQuery = query(
    collection(doc(db, "repairs", repairId), "statusHistory"),
    orderBy("changedAt", "desc"),
  );
  return onSnapshot(historyQuery, (snapshot) => onData(snapshot.docs.map(
    (event) => {
      const data = event.data();
      return {
        id: event.id,
        from: String(data.from),
        to: String(data.to),
        reason: String(data.reason),
        changedLabel: dateLabel(data.changedAt as Timestamp | undefined),
      };
    },
  )), onError);
}

export function observeAvailableParts(
  onData: (parts: AvailablePart[]) => void,
  onError: () => void,
) {
  const partsQuery = query(
    collection(db, "parts"),
    orderBy("description", "asc"),
  );
  return onSnapshot(partsQuery, (snapshot) => onData(snapshot.docs
    .map((part) => ({
      id: part.id,
      code: String(part.data().code),
      description: String(part.data().description),
      quantity: Number(part.data().quantityOnHand ?? 0),
    }))
    .filter((part) => part.quantity > 0)), onError);
}

export async function useRepairPart(input: {
  repairId: string;
  partId: string;
  quantity: number;
  reason: string;
  idempotencyKey: string;
}) {
  const callable = httpsCallable<typeof input, {
    repairId: string;
    repairCode: string;
    partId: string;
    partCode: string;
    partDescription: string;
    movementId: string;
    quantity: number;
    quantityOnHand: number;
  }>(functions, "useRepairPart");
  return (await callable(input)).data;
}

function dateLabel(value: Timestamp | null | undefined) {
  return value
    ? new Intl.DateTimeFormat("it-IT", { dateStyle: "long" }).format(
        value.toDate(),
      )
    : "Non definita";
}

function mapRepair(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): DemoRepair {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    code: String(data.code),
    acceptedLabel: dateLabel(data.acceptedAt as Timestamp | undefined),
    customerType: data.customerType,
    customerLabel: String(data.customerLabel),
    bikeLabel: String(data.bikeLabel),
    frameNumber:
      typeof data.frameNumber === "string" ? data.frameNumber : null,
    declaredIssue: String(data.declaredIssue),
    diagnosis:
      typeof data.diagnosis === "string" ? data.diagnosis : "Non compilata",
    proposedWork: Array.isArray(data.proposedWork) ? data.proposedWork : [],
    requestedWork: Array.isArray(data.requestedWork) ? data.requestedWork : [],
    completedWork: Array.isArray(data.completedWork) ? data.completedWork : [],
    parts: Array.isArray(data.parts) ? data.parts : [],
    assignedTo: Array.isArray(data.assignedTo) ? data.assignedTo : [],
    minutesSpent: Number(data.minutesSpent ?? 0),
    expectedDeliveryLabel: dateLabel(
      data.expectedDeliveryAt as Timestamp | null | undefined,
    ),
    status: data.status,
    activityClassification: String(
      data.activityClassification ?? "Da classificare",
    ),
  };
}
