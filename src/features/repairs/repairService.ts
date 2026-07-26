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
import { ref, uploadBytes } from "firebase/storage";
import { auth, db, functions, storage } from "../../firebase/client";
import type { DemoRepair } from "./demoRepairs";

export interface NewRepairInput {
  idempotencyKey: string;
  customerType: "Socio" | "Non socio" | "Organizzazione";
  customerLabel: string;
  organizationName: string | null;
  bikeLabel: string;
  frameNumber: string | null;
  declaredIssue: string;
  visibleCondition: string;
  deliveredAccessories: string[];
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

export async function manageRepairSafetyReview(input: {
  repairId: string;
  action: "report" | "resolve";
  riskType:
    | "damaged_battery"
    | "leak"
    | "unstable_component"
    | "other_hazard";
  description: string;
  protectiveMeasures: string;
  protectedLocation: string;
  outcome: "" | "risk_mitigated" | "authorized_provider";
  documentationReference: string;
  idempotencyKey: string;
}) {
  const callable = httpsCallable<typeof input, {
    repairId: string;
    action: string;
    previousStatus: string;
    newStatus: string;
  }>(functions, "manageRepairSafetyReview");
  return (await callable(input)).data;
}

export async function authorizeRepairWork(input: {
  repairId: string;
  authorizedWork: string[];
  method: "Modulo firmato" | "Firma su dispositivo";
  evidenceNote: string;
  evidenceStoragePath: string;
  nextStatus: "In lavorazione" | "In attesa ricambi";
  reason: string;
  idempotencyKey: string;
}) {
  const callable = httpsCallable<typeof input, {
    repairId: string;
    previousStatus: string;
    newStatus: string;
  }>(functions, "authorizeRepairWork");
  return (await callable(input)).data;
}

export async function uploadRepairAuthorizationEvidence(input: {
  repairId: string;
  method: "Modulo firmato" | "Firma su dispositivo";
  file: File;
  originalPaperRetained: boolean;
  physicalLocationCode: string;
  custodianLabel: string;
  depositedOn: string;
}) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Accesso richiesto.");
  const evidenceId = crypto.randomUUID();
  const storagePath =
    `authorizationEvidence/${input.repairId}/${uid}/${evidenceId}`;
  await uploadBytes(ref(storage, storagePath), input.file, {
    contentType: input.file.type,
    customMetadata: {
      repairId: input.repairId,
      uploaderUid: uid,
      method: input.method,
      originalPaperRetained: String(input.originalPaperRetained),
      physicalLocationCode: input.physicalLocationCode,
      custodianLabel: input.custodianLabel,
      depositedOn: input.depositedOn,
    },
  });
  return storagePath;
}

export async function uploadAuthorizationReviewEvidence(input: {
  evidenceId: string;
  outcome: "return_paper" | "destroy_paper";
  file: File;
}) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Accesso richiesto.");
  const proofId = crypto.randomUUID();
  const storagePath =
    `authorizationReviewEvidence/${input.evidenceId}/${uid}/${proofId}`;
  await uploadBytes(ref(storage, storagePath), input.file, {
    contentType: input.file.type,
    customMetadata: {
      evidenceId: input.evidenceId,
      uploaderUid: uid,
      outcome: input.outcome,
    },
  });
  return storagePath;
}

export async function reviewAuthorizationEvidence(input: {
  evidenceId: string;
  action: "propose" | "confirm";
  outcome: "extend" | "return_paper" | "destroy_paper" | "no_paper";
  reason: string;
  details: string;
  newReviewDate: string | null;
  actionDate: string | null;
  subjectLabel: string | null;
  proofStoragePath: string | null;
  idempotencyKey: string;
}) {
  const callable = httpsCallable<typeof input, {
    evidenceId: string;
    action: string;
    outcome: string;
  }>(functions, "reviewAuthorizationEvidence");
  return (await callable(input)).data;
}

export async function accessAuthorizationReviewEvidence(input: {
  evidenceId: string;
  action: "view" | "export";
}) {
  const callable = httpsCallable<typeof input, {
    evidenceId: string;
    contentType: string;
    fileName: string;
    dataBase64: string;
    checksumSha256: string;
    sourceChecksumSha256: string;
  }>(functions, "accessAuthorizationReviewEvidence");
  return (await callable(input)).data;
}

export async function replaceAuthorizationReviewEvidence(input: {
  evidenceId: string;
  storagePath: string;
  reason: string;
  incidentId?: string;
  idempotencyKey: string;
}) {
  const callable = httpsCallable<typeof input, {
    evidenceId: string;
    version: number;
  }>(functions, "replaceAuthorizationReviewEvidence");
  return (await callable(input)).data;
}

export async function manageAuthorizationEvidenceIncident(input: {
  evidenceId: string;
  incidentId?: string;
  action: "report" | "open" | "resolve";
  incidentType:
    | "missing_file"
    | "checksum_mismatch"
    | "metadata_mismatch"
    | "unreadable_file";
  resolution?: "recovered" | "replaced" | "unrecoverable";
  reason: string;
  idempotencyKey: string;
}) {
  const callable = httpsCallable<typeof input, {
    evidenceId: string;
    incidentId: string;
    status: string;
  }>(functions, "manageAuthorizationEvidenceIncident");
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
