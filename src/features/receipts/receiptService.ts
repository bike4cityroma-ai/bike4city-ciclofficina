import {
  collection, onSnapshot, orderBy, query, type Timestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../firebase/client";

export interface ReceiptItem {
  id: string;
  code: string;
  classificationLabel: string;
  subjectLabel: string;
  amount: number;
  paymentMethod: string;
  status: string;
  createdLabel: string;
}

export function observeReceipts(
  onData: (items: ReceiptItem[]) => void,
  onError: () => void,
) {
  return onSnapshot(
    query(collection(db, "receipts"), orderBy("createdAt", "desc")),
    (snapshot) => onData(snapshot.docs.map((item) => {
      const data = item.data();
      const createdAt = data.createdAt as Timestamp | undefined;
      return {
        id: item.id,
        code: String(data.code),
        classificationLabel: String(data.classificationLabel),
        subjectLabel: String(data.subjectSnapshot?.label),
        amount: Number(data.amount),
        paymentMethod: String(data.paymentMethod),
        status: String(data.status),
        createdLabel: createdAt
          ? new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" })
            .format(createdAt.toDate()) : "Data non disponibile",
      };
    })),
    onError,
  );
}

export async function createReceiptDraft(input: {
  classification: string;
  subjectType: string;
  subjectLabel: string;
  subjectTaxCode: string;
  membershipCode: string;
  amount: number;
  paymentMethod: string;
  paymentReference: string;
  repairId: string;
  bikeId: string;
  deliveryId: string;
  memberId: string;
  note: string;
  idempotencyKey: string;
}) {
  const callable = httpsCallable<typeof input, {
    id: string; code: string; status: string; storagePath: string;
  }>(functions, "createReceiptDraft");
  return (await callable(input)).data;
}

export async function voidReceiptDraft(input: {
  receiptId: string;
  reason: string;
  replacementReceiptId: string;
  idempotencyKey: string;
}) {
  const callable = httpsCallable<typeof input, {
    receiptId: string; status: string;
  }>(functions, "voidReceiptDraft");
  return (await callable(input)).data;
}
