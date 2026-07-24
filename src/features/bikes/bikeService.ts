import {
  collection,
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
