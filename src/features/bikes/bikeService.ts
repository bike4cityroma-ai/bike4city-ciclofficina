import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../firebase/client";
import type { DemoBike } from "./demoBikes";

export interface NewBikeInput {
  idempotencyKey: string;
  brand: string;
  model: string;
  color: string;
  type: string;
  frameSize: string;
  frameNumber: string | null;
  condition: string;
  status: "Da valutare";
  location: string;
  intendedDestination: string;
  accessories: string[];
  notes: string;
}

export interface BikeStatusEvent {
  id: string;
  from: string;
  to: string;
  reason: string;
  changedLabel: string;
}

export function observeBikes(
  onData: (bikes: DemoBike[]) => void,
  onError: () => void,
) {
  const bikesQuery = query(collection(db, "bikes"), orderBy("updatedAt", "desc"));
  return onSnapshot(
    bikesQuery,
    (snapshot) => onData(snapshot.docs.map(mapBike)),
    onError,
  );
}

export async function createBike(input: NewBikeInput) {
  const callable = httpsCallable<
    NewBikeInput,
    { id: string; code: string }
  >(functions, "createBike");
  return (await callable(input)).data;
}

export async function updateBikeStatus(
  bikeId: string,
  newStatus: string,
  reason: string,
  idempotencyKey: string,
) {
  const callable = httpsCallable<
    {
      bikeId: string;
      newStatus: string;
      reason: string;
      idempotencyKey: string;
    },
    { bikeId: string; previousStatus: string; newStatus: string }
  >(functions, "updateBikeStatus");
  return (await callable({ bikeId, newStatus, reason, idempotencyKey })).data;
}

export function observeBikeStatusHistory(
  bikeId: string,
  onData: (events: BikeStatusEvent[]) => void,
  onError: () => void,
) {
  const historyQuery = query(
    collection(doc(db, "bikes", bikeId), "statusHistory"),
    orderBy("changedAt", "desc"),
  );
  return onSnapshot(
    historyQuery,
    (snapshot) =>
      onData(
        snapshot.docs.map((event) => {
          const data = event.data();
          const changedAt = data.changedAt as Timestamp | undefined;
          return {
            id: event.id,
            from: String(data.from),
            to: String(data.to),
            reason: String(data.reason),
            changedLabel: changedAt
              ? new Intl.DateTimeFormat("it-IT", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(changedAt.toDate())
              : "Data non disponibile",
          };
        }),
      ),
    onError,
  );
}

function mapBike(snapshot: QueryDocumentSnapshot<DocumentData>): DemoBike {
  const data = snapshot.data();
  const receivedAt = data.receivedAt as Timestamp | undefined;
  return {
    id: snapshot.id,
    code: String(data.code),
    brand: String(data.brand),
    model: String(data.model),
    color: String(data.color),
    type: String(data.type),
    frameSize: String(data.frameSize),
    frameNumber:
      typeof data.frameNumber === "string" ? data.frameNumber : null,
    condition: String(data.condition),
    status: data.status,
    location: String(data.location),
    receivedLabel: receivedAt
      ? new Intl.DateTimeFormat("it-IT", { dateStyle: "long" }).format(
          receivedAt.toDate(),
        )
      : "Data non disponibile",
    intendedDestination: String(data.intendedDestination),
    accessories: Array.isArray(data.accessories) ? data.accessories : [],
    notes: String(data.notes),
  };
}
