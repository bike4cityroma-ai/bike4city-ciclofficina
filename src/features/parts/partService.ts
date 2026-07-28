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
import type { DemoPart, DemoPartMovement, PartOrigin } from "./demoParts";

export interface NewPartInput {
  idempotencyKey: string;
  category: string;
  description: string;
  brand: string | null;
  compatibility: string;
  origin: PartOrigin;
  condition: string;
  location: string;
  quantity: number;
  recommendedPrice: number | null;
  sourceBikeCode: string | null;
  reason: string;
  notes: string;
}

export function observeParts(
  onData: (parts: DemoPart[]) => void,
  onError: () => void,
) {
  const partsQuery = query(collection(db, "parts"), orderBy("code", "desc"));
  return onSnapshot(
    partsQuery,
    (snapshot) => onData(snapshot.docs.map(mapPart)),
    onError,
  );
}

export function observePartMovements(
  partId: string,
  onData: (movements: DemoPartMovement[]) => void,
  onError: () => void,
) {
  const movementsQuery = query(
    collection(db, "partMovements"),
    where("partId", "==", partId),
  );
  return onSnapshot(movementsQuery, (snapshot) => onData(snapshot.docs
    .map((item) => {
      const data = item.data();
      const typeLabels: Record<string, DemoPartMovement["type"]> = {
        in: "Carico",
        use: "Utilizzo",
        adjustment: "Rettifica",
        return: "Reso",
      };
      const occurredAt = data.occurredAt as Timestamp | undefined;
      return {
        id: item.id,
        type: typeLabels[String(data.type)] ?? "Rettifica",
        quantity: Number(data.quantity),
        occurredLabel: occurredAt
          ? new Intl.DateTimeFormat("it-IT", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(occurredAt.toDate())
          : "Data non disponibile",
        reason: String(data.reason),
        relatedCode: typeof data.relatedCode === "string"
          ? data.relatedCode
          : typeof data.repairId === "string" ? data.repairId : null,
        operatorLabel: `Operatore ${String(data.performedBy).slice(0, 8)}`,
      };
    })
    .sort((a, b) => b.occurredLabel.localeCompare(a.occurredLabel))),
  onError);
}

export async function createPart(input: NewPartInput) {
  const callable = httpsCallable<
    NewPartInput,
    { id: string; code: string; movementId: string }
  >(functions, "createPart");
  return (await callable(input)).data;
}

export async function recordPartMovement(input: {
  partId: string;
  operation: "in" | "return" | "adjustment";
  quantity: number;
  relatedCode: string | null;
  reason: string;
  idempotencyKey: string;
}) {
  const callable = httpsCallable<typeof input, {
    partId: string;
    movementId: string;
    previousQuantity: number;
    quantityOnHand: number;
  }>(functions, "recordPartMovement");
  return (await callable(input)).data;
}

function mapPart(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): DemoPart {
  const data = snapshot.data();
  const originLabels: Record<string, PartOrigin> = {
    recovered: "Recuperato",
    purchased: "Acquistato",
    user_supplied: "Portato dall'utente",
  };
  return {
    id: snapshot.id,
    code: String(data.code),
    category: String(data.category),
    description: String(data.description),
    brand: typeof data.brand === "string" ? data.brand : null,
    compatibility: String(data.compatibility ?? "Da verificare"),
    origin: ["Recuperato", "Acquistato", "Portato dall'utente"].includes(
      String(data.origin),
    )
      ? String(data.origin) as PartOrigin
      : originLabels[String(data.originType)] ?? "Recuperato",
    condition: String(data.condition),
    location: String(data.location ?? data.locationId ?? "Da assegnare"),
    quantityOnHand: Number(data.quantityOnHand ?? 0),
    recommendedPrice: Number.isInteger(data.recommendedPriceCents)
      ? Number(data.recommendedPriceCents) / 100
      : null,
    sourceBikeCode: typeof data.sourceBikeCode === "string"
      ? data.sourceBikeCode
      : null,
    movements: [],
    notes: String(data.notes ?? "Nessuna nota."),
  };
}
