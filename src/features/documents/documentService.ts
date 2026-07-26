import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { ref, uploadBytes } from "firebase/storage";
import { auth, db, functions, storage } from "../../firebase/client";

export type OperationalDocumentType =
  | "acceptance"
  | "workshop_test"
  | "delivery_report";

export interface OperationalDocument {
  id: string;
  code: string;
  title: string;
  type: OperationalDocumentType;
  status: "draft";
  sourceCode: string;
  modelVersion: string;
  storagePath: string;
  createdLabel: string;
}

export function observeDocuments(
  onData: (documents: OperationalDocument[]) => void,
  onError: () => void,
) {
  return onSnapshot(
    query(collection(db, "documents"), orderBy("createdAt", "desc")),
    (snapshot) => onData(snapshot.docs.map((item) => {
      const data = item.data();
      const createdAt = data.createdAt as Timestamp | undefined;
      return {
        id: item.id,
        code: String(data.code),
        title: String(data.title),
        type: data.type as OperationalDocumentType,
        status: "draft",
        sourceCode: String(data.sourceCode),
        modelVersion: String(data.modelVersion),
        storagePath: String(data.storagePath),
        createdLabel: createdAt
          ? new Intl.DateTimeFormat("it-IT", {
              dateStyle: "medium", timeStyle: "short",
            }).format(createdAt.toDate())
          : "Data non disponibile",
      };
    })),
    onError,
  );
}

export async function createOperationalDocument(
  type: OperationalDocumentType,
  entityId: string,
) {
  const callable = httpsCallable<
    { type: OperationalDocumentType; entityId: string; idempotencyKey: string },
    { id: string; code: string; storagePath: string }
  >(functions, "createOperationalDocument");
  return (await callable({
    type, entityId, idempotencyKey: crypto.randomUUID(),
  })).data;
}

export async function getDocumentUrl(documentId: string) {
  const callable = httpsCallable<
    { documentId: string; action: "view" },
    { dataBase64: string; contentType: string }
  >(functions, "accessOperationalDocument");
  const result = (await callable({ documentId, action: "view" })).data;
  const bytes = Uint8Array.from(atob(result.dataBase64), (char) =>
    char.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], {
    type: result.contentType,
  }));
}

export async function recordAcceptanceCopy(input: {
  documentId: string;
  outcome: "delivered" | "refused";
  method: "paper" | "device_download" | "refused";
  recipientLabel: string;
  reason: string;
}) {
  const callable = httpsCallable<typeof input & { idempotencyKey: string }, {
    documentId: string; eventId: string; outcome: string;
  }>(functions, "recordAcceptanceCopy");
  return (await callable({
    ...input,
    idempotencyKey: crypto.randomUUID(),
  })).data;
}

export async function correctAcceptanceDocument(input: {
  documentId: string;
  action: "propose" | "confirm";
  correctedFields: string[];
  correctionSummary: string;
  subjectChanged: boolean;
  correctedSubjectLabel: string | null;
  reason: string;
  idempotencyKey: string;
}) {
  const callable = httpsCallable<typeof input, {
    oldDocumentId: string;
    newDocumentId: string | null;
    action: string;
  }>(functions, "correctAcceptanceDocument");
  return (await callable(input)).data;
}

export async function uploadAcceptanceSignatureEvidence(input: {
  documentId: string;
  method: "Modulo firmato" | "Firma su dispositivo";
  file: File;
}) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Accesso richiesto.");
  const evidenceId = crypto.randomUUID();
  const storagePath =
    `acceptanceSignatureEvidence/${input.documentId}/${uid}/${evidenceId}`;
  await uploadBytes(ref(storage, storagePath), input.file, {
    contentType: input.file.type,
    customMetadata: {
      documentId: input.documentId,
      uploaderUid: uid,
      method: input.method,
    },
  });
  return storagePath;
}

export async function consolidateAcceptanceDocument(input: {
  documentId: string;
  signatureMethod: "Modulo firmato" | "Firma su dispositivo";
  signatureStoragePath: string;
  reason: string;
  idempotencyKey: string;
}) {
  const callable = httpsCallable<typeof input, {
    documentId: string;
    status: string;
  }>(functions, "consolidateAcceptanceDocument");
  return (await callable(input)).data;
}
