import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

const permittedRoles = new Set([
  "admin",
  "workshop_manager",
  "operator",
]);

const statuses = new Set([
  "Da valutare",
  "Da riparare",
  "In lavorazione",
  "In attesa ricambi",
  "Pronta",
  "Consegnata",
]);

const statusTransitions = new Map<string, Set<string>>([
  ["Da valutare", new Set(["Da riparare", "Pronta"])],
  ["Da riparare", new Set(["In lavorazione", "In attesa ricambi"])],
  ["In lavorazione", new Set(["In attesa ricambi", "Pronta"])],
  ["In attesa ricambi", new Set(["In lavorazione"])],
]);

interface BikeInput {
  idempotencyKey: string;
  brand: string;
  model: string;
  color: string;
  type: string;
  frameSize: string;
  frameNumber: string | null;
  condition: string;
  status: string;
  location: string;
  intendedDestination: string;
  accessories: string[];
  notes: string;
}

function requireBikeInput(value: unknown): BikeInput {
  if (!value || typeof value !== "object") {
    throw new HttpsError("invalid-argument", "Dati bicicletta mancanti.");
  }
  const data = value as Record<string, unknown>;
  const text = (name: string, max = 120) => {
    const field = data[name];
    if (typeof field !== "string" || !field.trim() || field.length > max) {
      throw new HttpsError(
        "invalid-argument",
        `Il campo ${name} non è valido.`,
      );
    }
    return field.trim();
  };
  const nullableText = (name: string, max = 120) => {
    const field = data[name];
    if (field === null || field === undefined || field === "") {
      return null;
    }
    if (typeof field !== "string" || field.length > max) {
      throw new HttpsError(
        "invalid-argument",
        `Il campo ${name} non è valido.`,
      );
    }
    return field.trim();
  };

  const status = text("status", 40);
  if (status !== "Da valutare") {
    throw new HttpsError(
      "invalid-argument",
      "Una nuova bicicletta deve iniziare nello stato “Da valutare”.",
    );
  }
  const accessories = data.accessories;
  if (!Array.isArray(accessories) || accessories.length > 20 ||
      accessories.some((item) =>
        typeof item !== "string" || item.length > 80)) {
    throw new HttpsError("invalid-argument", "Accessori non validi.");
  }
  return {
    idempotencyKey: text("idempotencyKey", 80),
    brand: text("brand"),
    model: text("model"),
    color: text("color"),
    type: text("type"),
    frameSize: text("frameSize", 40),
    frameNumber: nullableText("frameNumber"),
    condition: text("condition", 500),
    status,
    location: text("location"),
    intendedDestination: text("intendedDestination"),
    accessories: accessories.map((item) => item.trim()).filter(Boolean),
    notes: text("notes", 1000),
  };
}

function requireStatusUpdateInput(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new HttpsError("invalid-argument", "Dati aggiornamento mancanti.");
  }
  const data = value as Record<string, unknown>;
  const requiredText = (name: string, max: number) => {
    const field = data[name];
    if (typeof field !== "string" || !field.trim() || field.length > max) {
      throw new HttpsError(
        "invalid-argument",
        `Il campo ${name} non è valido.`,
      );
    }
    return field.trim();
  };
  const newStatus = requiredText("newStatus", 40);
  if (!statuses.has(newStatus)) {
    throw new HttpsError("invalid-argument", "Stato bicicletta non valido.");
  }
  const reason = requiredText("reason", 500);
  if (reason.length < 10) {
    throw new HttpsError(
      "invalid-argument",
      "La motivazione deve contenere almeno 10 caratteri.",
    );
  }
  return {
    bikeId: requiredText("bikeId", 160),
    newStatus,
    reason,
    idempotencyKey: requiredText("idempotencyKey", 80),
  };
}

function requireAuthorizedUser(auth: {
  uid: string;
  token: Record<string, unknown>;
} | undefined) {
  if (!auth) {
    throw new HttpsError("unauthenticated", "Accesso richiesto.");
  }
  const roles = Array.isArray(auth.token.roles) ? auth.token.roles : [];
  if (auth.token.active !== true ||
      !roles.some((role) =>
        typeof role === "string" && permittedRoles.has(role))) {
    throw new HttpsError(
      "permission-denied",
      "Ruolo non autorizzato alla registrazione.",
    );
  }
  return auth.uid;
}

function hasPermittedProfile(data: Record<string, unknown> | undefined) {
  const roles = Array.isArray(data?.roles) ? data.roles : [];
  return data?.active === true && roles.some((role) =>
    typeof role === "string" && permittedRoles.has(role));
}

export const createBike = onCall(
  { region: "europe-west1", enforceAppCheck: false },
  async (request) => {
    const uid = requireAuthorizedUser(request.auth);
    const input = requireBikeInput(request.data);
    const db = getFirestore();
    const year = Number(new Intl.DateTimeFormat("en", {
      timeZone: "Europe/Rome",
      year: "numeric",
    }).format(new Date()));
    const requestRef = db.doc(
      `idempotencyKeys/${uid}_${input.idempotencyKey}`,
    );
    const counterRef = db.doc(`counters/bikes-${year}`);
    const bikeRef = db.collection("bikes").doc();
    const auditRef = db.collection("auditLogs").doc();

    return db.runTransaction(async (transaction) => {
      const [existingRequest, counter] = await Promise.all([
        transaction.get(requestRef),
        transaction.get(counterRef),
      ]);
      if (existingRequest.exists) {
        const existing = existingRequest.data();
        return {
          id: String(existing?.id),
          code: String(existing?.code),
        };
      }

      const nextValue = Number(counter.data()?.lastValue ?? 0) + 1;
      const code = `BICI-${year}-${String(nextValue).padStart(4, "0")}`;
      const now = Timestamp.now();
      const result = { id: bikeRef.id, code };
      const { idempotencyKey: _idempotencyKey, ...bikeData } = input;
      transaction.set(counterRef, {
        lastValue: nextValue,
        updatedAt: now,
      });
      transaction.create(bikeRef, {
        ...bikeData,
        code,
        receivedAt: now,
        createdAt: now,
        createdBy: uid,
        updatedAt: now,
        updatedBy: uid,
        archivedAt: null,
        version: 1,
      });
      transaction.create(requestRef, {
        ...result,
        createdAt: now,
        createdBy: uid,
      });
      transaction.create(auditRef, {
        action: "bike.create",
        entityType: "bike",
        entityId: bikeRef.id,
        entityCode: code,
        actorUid: uid,
        createdAt: now,
      });
      return result;
    });
  },
);

export const updateBikeStatus = onCall(
  { region: "europe-west1", enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Accesso richiesto.");
    }
    const uid = request.auth.uid;
    const input = requireStatusUpdateInput(request.data);
    const db = getFirestore();
    const userRef = db.doc(`users/${uid}`);
    const bikeRef = db.doc(`bikes/${input.bikeId}`);
    const requestRef = db.doc(
      `idempotencyKeys/bike-status_${uid}_${input.idempotencyKey}`,
    );
    const historyRef = bikeRef.collection("statusHistory").doc();
    const auditRef = db.collection("auditLogs").doc();

    return db.runTransaction(async (transaction) => {
      const [user, bike, existingRequest] = await Promise.all([
        transaction.get(userRef),
        transaction.get(bikeRef),
        transaction.get(requestRef),
      ]);
      if (!hasPermittedProfile(user.data())) {
        throw new HttpsError(
          "permission-denied",
          "Ruolo non autorizzato all’aggiornamento dello stato.",
        );
      }
      if (!bike.exists) {
        throw new HttpsError("not-found", "Bicicletta non trovata.");
      }
      if (existingRequest.exists) {
        const existing = existingRequest.data();
        return {
          bikeId: String(existing?.bikeId),
          previousStatus: String(existing?.previousStatus),
          newStatus: String(existing?.newStatus),
        };
      }

      const bikeData = bike.data();
      const previousStatus = String(bikeData?.status);
      if (!statusTransitions.get(previousStatus)?.has(input.newStatus)) {
        throw new HttpsError(
          "failed-precondition",
          `Transizione da “${previousStatus}” a “${input.newStatus}” non consentita.`,
        );
      }
      const now = Timestamp.now();
      const result = {
        bikeId: bikeRef.id,
        previousStatus,
        newStatus: input.newStatus,
      };
      transaction.update(bikeRef, {
        status: input.newStatus,
        updatedAt: now,
        updatedBy: uid,
        version: Number(bikeData?.version ?? 0) + 1,
      });
      transaction.create(historyRef, {
        from: previousStatus,
        to: input.newStatus,
        reason: input.reason,
        changedAt: now,
        changedBy: uid,
      });
      transaction.create(auditRef, {
        action: "bike.status.update",
        entityType: "bike",
        entityId: bikeRef.id,
        entityCode: String(bikeData?.code),
        actorUid: uid,
        changes: {
          status: {
            from: previousStatus,
            to: input.newStatus,
          },
        },
        reason: input.reason,
        createdAt: now,
      });
      transaction.create(requestRef, {
        ...result,
        createdAt: now,
        createdBy: uid,
      });
      return result;
    });
  },
);
