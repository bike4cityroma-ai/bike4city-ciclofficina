import {
  collection, onSnapshot, orderBy, query, where,
  type DocumentData, type QueryDocumentSnapshot, type Timestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../firebase/client";
import type { DemoDelivery } from "./demoDeliveries";

export interface DeliverableRepair {
  id: string;
  code: string;
  bikeLabel: string;
}

export function observeDeliveries(
  onData: (items: DemoDelivery[]) => void,
  onError: () => void,
) {
  return onSnapshot(
    query(collection(db, "deliveries"), orderBy("deliveredAt", "desc")),
    (snapshot) => onData(snapshot.docs.map(mapDelivery)), onError,
  );
}

export function observeDeliverableRepairs(
  onData: (items: DeliverableRepair[]) => void,
  onError: () => void,
) {
  return onSnapshot(
    query(collection(db, "repairs"), where("status", "==", "Collaudata")),
    (snapshot) => onData(snapshot.docs.map((item) => ({
      id: item.id, code: String(item.data().code),
      bikeLabel: String(item.data().bikeLabel),
    }))), onError,
  );
}

export async function createDelivery(input: {
  repairId: string;
  recipientType: string;
  recipientLabel: string;
  conditionSnapshot: string;
  accessories: string[];
  contributionAmount: number | null;
  declarationsAccepted: boolean;
  notes: string;
  idempotencyKey: string;
}) {
  const callable = httpsCallable<typeof input, {
    id: string; code: string; documentCode: string;
  }>(functions, "createDelivery");
  return (await callable(input)).data;
}

export async function recordPickupContact(input: {
  repairId: string;
  action:
    | "ready_notice"
    | "reminder"
    | "final_notice"
    | "open_overdue_review";
  channel: "phone" | "sms" | "email" | "written" | "internal";
  note: string;
  idempotencyKey: string;
}) {
  const callable = httpsCallable<typeof input, {
    repairId: string;
    action: string;
    pickupStatus: string;
    recordedAt: string;
  }>(functions, "recordPickupContact");
  return (await callable(input)).data;
}

function mapDelivery(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): DemoDelivery {
  const data = snapshot.data();
  const deliveredAt = data.deliveredAt as Timestamp | undefined;
  return {
    id: snapshot.id,
    code: String(data.code),
    deliveredLabel: deliveredAt
      ? new Intl.DateTimeFormat("it-IT", {
          dateStyle: "medium", timeStyle: "short",
        }).format(deliveredAt.toDate()) : "Data non disponibile",
    type: data.type,
    recipientLabel: String(data.recipientLabel),
    recipientType: data.recipientType,
    bikeCode: String(data.bikeCode ?? "Bicicletta esterna"),
    bikeLabel: String(data.bikeLabel),
    repairCode: String(data.repairCode),
    testCode: String(data.testCode),
    conditionSnapshot: String(data.conditionSnapshot),
    accessories: Array.isArray(data.accessories) ? data.accessories : [],
    contributionAmount: typeof data.contributionAmount === "number"
      ? data.contributionAmount : null,
    receiptCode: typeof data.receiptCode === "string"
      ? data.receiptCode : null,
    documentCode: String(data.documentCode),
    deliveredBy: String(data.deliveredByLabel),
    classificationLabel: String(data.classificationLabel),
    declarations: Array.isArray(data.declarations) ? data.declarations : [],
    notes: String(data.notes),
  };
}
