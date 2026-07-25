import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

initializeApp();

const permittedRoles = new Set(["admin", "workshop_manager", "operator"]);
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
const repairStatusTransitions = new Map<string, Set<string>>([
  ["Accettata", new Set(["Diagnosticata"])],
  ["Diagnosticata", new Set([
    "In attesa autorizzazione",
    "In attesa ricambi",
    "In lavorazione",
  ])],
  ["In attesa autorizzazione", new Set([
    "In attesa ricambi",
    "In lavorazione",
    "Annullata",
  ])],
  ["In attesa ricambi", new Set(["In lavorazione"])],
  ["In lavorazione", new Set(["In attesa ricambi", "Pronta"])],
  ["Pronta", new Set(["In lavorazione"])],
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

interface RepairInput {
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

function requireRepairInput(value: unknown): RepairInput {
  if (!value || typeof value !== "object") {
    throw new HttpsError("invalid-argument", "Dati riparazione mancanti.");
  }
  const data = value as Record<string, unknown>;
  const text = (name: string, max = 160) => {
    const field = data[name];
    if (typeof field !== "string" || !field.trim() || field.length > max) {
      throw new HttpsError("invalid-argument", `Il campo ${name} non è valido.`);
    }
    return field.trim();
  };
  const nullableText = (name: string, max = 160) => {
    const field = data[name];
    if (field === null || field === undefined || field === "") return null;
    if (typeof field !== "string" || field.length > max) {
      throw new HttpsError("invalid-argument", `Il campo ${name} non è valido.`);
    }
    return field.trim();
  };
  const customerType = text("customerType", 20);
  if (customerType !== "Socio" && customerType !== "Non socio") {
    throw new HttpsError("invalid-argument", "Tipologia utente non valida.");
  }
  const requestedWork = data.requestedWork;
  if (!Array.isArray(requestedWork) || requestedWork.length === 0 ||
      requestedWork.length > 20 ||
      requestedWork.some((item) => typeof item !== "string" || !item.trim() ||
        item.length > 160)) {
    throw new HttpsError("invalid-argument", "Interventi richiesti non validi.");
  }
  const expectedDeliveryDate = nullableText("expectedDeliveryDate", 10);
  if (expectedDeliveryDate &&
      !/^\d{4}-\d{2}-\d{2}$/.test(expectedDeliveryDate)) {
    throw new HttpsError("invalid-argument", "Data prevista non valida.");
  }
  return {
    idempotencyKey: text("idempotencyKey", 80),
    customerType,
    customerLabel: text("customerLabel"),
    bikeLabel: text("bikeLabel"),
    frameNumber: nullableText("frameNumber"),
    declaredIssue: text("declaredIssue", 1000),
    requestedWork: requestedWork.map((item) => item.trim()),
    expectedDeliveryDate,
    notes: text("notes", 1000),
  };
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
    if (field === null || field === undefined || field === "") return null;
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
  if (
    !Array.isArray(accessories) ||
    accessories.length > 20 ||
    accessories.some((item) => typeof item !== "string" || item.length > 80)
  ) {
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

function requireAuthorizedUser(auth: {
  uid: string;
  token: Record<string, unknown>;
} | undefined) {
  if (!auth) {
    throw new HttpsError("unauthenticated", "Accesso richiesto.");
  }

  const roles = Array.isArray(auth.token.roles) ? auth.token.roles : [];
  if (
    auth.token.active !== true ||
    !roles.some((role) => typeof role === "string" && permittedRoles.has(role))
  ) {
    throw new HttpsError(
      "permission-denied",
      "Ruolo non autorizzato alla registrazione.",
    );
  }
  return auth.uid;
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

function hasPermittedProfile(data: Record<string, unknown> | undefined) {
  const roles = Array.isArray(data?.roles) ? data.roles : [];
  return (
    data?.active === true &&
    roles.some(
      (role) => typeof role === "string" && permittedRoles.has(role),
    )
  );
}

function requireRepairWorkflowInput(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new HttpsError("invalid-argument", "Dati avanzamento mancanti.");
  }
  const data = value as Record<string, unknown>;
  const text = (name: string, max: number) => {
    const field = data[name];
    if (typeof field !== "string" || !field.trim() || field.length > max) {
      throw new HttpsError("invalid-argument", `Il campo ${name} non è valido.`);
    }
    return field.trim();
  };
  const diagnosis = typeof data.diagnosis === "string"
    ? data.diagnosis.trim()
    : "";
  const proposedWork = Array.isArray(data.proposedWork)
    ? data.proposedWork
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  const completedWork = Array.isArray(data.completedWork)
    ? data.completedWork
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  const minutesSpent = Number(data.minutesSpent ?? 0);
  if (diagnosis.length > 2000 || proposedWork.length > 20 ||
      proposedWork.some((item) => item.length > 160) ||
      completedWork.length > 30 ||
      completedWork.some((item) => item.length > 160) ||
      !Number.isInteger(minutesSpent) || minutesSpent < 0 ||
      minutesSpent > 100_000) {
    throw new HttpsError("invalid-argument", "Diagnosi o interventi non validi.");
  }
  return {
    repairId: text("repairId", 160),
    newStatus: text("newStatus", 40),
    reason: text("reason", 1000),
    diagnosis,
    proposedWork,
    completedWork,
    minutesSpent,
    noPartsUsed: data.noPartsUsed === true,
    idempotencyKey: text("idempotencyKey", 80),
  };
}

function requirePartUsageInput(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new HttpsError("invalid-argument", "Dati ricambio mancanti.");
  }
  const data = value as Record<string, unknown>;
  const text = (name: string, max: number) => {
    const field = data[name];
    if (typeof field !== "string" || !field.trim() || field.length > max) {
      throw new HttpsError("invalid-argument", `Il campo ${name} non è valido.`);
    }
    return field.trim();
  };
  const quantity = Number(data.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
    throw new HttpsError("invalid-argument", "Quantità non valida.");
  }
  const reason = text("reason", 500);
  if (reason.length < 10) {
    throw new HttpsError(
      "invalid-argument",
      "La motivazione deve contenere almeno 10 caratteri.",
    );
  }
  return {
    repairId: text("repairId", 160),
    partId: text("partId", 160),
    quantity,
    reason,
    idempotencyKey: text("idempotencyKey", 80),
  };
}

export const createBike = onCall(
  { region: "europe-west1", enforceAppCheck: false },
  async (request) => {
    const uid = requireAuthorizedUser(request.auth);
    const input = requireBikeInput(request.data);
    const db = getFirestore();
    const year = Number(
      new Intl.DateTimeFormat("en", {
        timeZone: "Europe/Rome",
        year: "numeric",
      }).format(new Date()),
    );
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
          status: { from: previousStatus, to: input.newStatus },
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

export const createRepair = onCall(
  { region: "europe-west1", enforceAppCheck: false },
  async (request) => {
    const uid = requireAuthorizedUser(request.auth);
    const input = requireRepairInput(request.data);
    const db = getFirestore();
    const userRef = db.doc(`users/${uid}`);
    const year = Number(new Intl.DateTimeFormat("en", {
      timeZone: "Europe/Rome", year: "numeric",
    }).format(new Date()));
    const requestRef = db.doc(
      `idempotencyKeys/repair-create_${uid}_${input.idempotencyKey}`,
    );
    const counterRef = db.doc(`counters/repairs-${year}`);
    const repairRef = db.collection("repairs").doc();
    const auditRef = db.collection("auditLogs").doc();

    return db.runTransaction(async (transaction) => {
      const [user, existingRequest, counter] = await Promise.all([
        transaction.get(userRef),
        transaction.get(requestRef),
        transaction.get(counterRef),
      ]);
      if (!hasPermittedProfile(user.data())) {
        throw new HttpsError(
          "permission-denied",
          "Ruolo non autorizzato alla registrazione della riparazione.",
        );
      }
      if (existingRequest.exists) {
        return {
          id: String(existingRequest.data()?.id),
          code: String(existingRequest.data()?.code),
        };
      }
      const nextValue = Number(counter.data()?.lastValue ?? 0) + 1;
      const code = `RIP-${year}-${String(nextValue).padStart(4, "0")}`;
      const now = Timestamp.now();
      const expectedDeliveryAt = input.expectedDeliveryDate
        ? Timestamp.fromDate(new Date(`${input.expectedDeliveryDate}T12:00:00Z`))
        : null;
      const result = { id: repairRef.id, code };
      transaction.set(counterRef, { lastValue: nextValue, updatedAt: now });
      transaction.create(repairRef, {
        code,
        acceptedAt: now,
        customerType: input.customerType,
        customerLabel: input.customerLabel,
        bikeLabel: input.bikeLabel,
        frameNumber: input.frameNumber,
        declaredIssue: input.declaredIssue,
        diagnosis: null,
        requestedWork: input.requestedWork,
        authorizedWork: [],
        completedWork: [],
        parts: [],
        assignedTo: [],
        minutesSpent: 0,
        expectedDeliveryAt,
        status: "Accettata",
        activityClassification: "Da classificare",
        notes: input.notes,
        createdAt: now,
        createdBy: uid,
        updatedAt: now,
        updatedBy: uid,
        archivedAt: null,
        version: 1,
      });
      transaction.create(requestRef, {
        ...result, createdAt: now, createdBy: uid,
      });
      transaction.create(auditRef, {
        action: "repair.create",
        entityType: "repair",
        entityId: repairRef.id,
        entityCode: code,
        actorUid: uid,
        createdAt: now,
      });
      return result;
    });
  },
);

export const updateRepairWorkflow = onCall(
  { region: "europe-west1", enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Accesso richiesto.");
    }
    const uid = request.auth.uid;
    const input = requireRepairWorkflowInput(request.data);
    const db = getFirestore();
    const userRef = db.doc(`users/${uid}`);
    const repairRef = db.doc(`repairs/${input.repairId}`);
    const requestRef = db.doc(
      `idempotencyKeys/repair-workflow_${uid}_${input.idempotencyKey}`,
    );
    const historyRef = repairRef.collection("statusHistory").doc();
    const auditRef = db.collection("auditLogs").doc();

    return db.runTransaction(async (transaction) => {
      const [user, repair, existingRequest] = await Promise.all([
        transaction.get(userRef),
        transaction.get(repairRef),
        transaction.get(requestRef),
      ]);
      if (!hasPermittedProfile(user.data())) {
        throw new HttpsError(
          "permission-denied",
          "Ruolo non autorizzato all’avanzamento della riparazione.",
        );
      }
      if (!repair.exists) {
        throw new HttpsError("not-found", "Riparazione non trovata.");
      }
      if (existingRequest.exists) return existingRequest.data();

      const repairData = repair.data();
      const previousStatus = String(repairData?.status);
      if (!repairStatusTransitions.get(previousStatus)?.has(input.newStatus)) {
        throw new HttpsError(
          "failed-precondition",
          `Transizione da “${previousStatus}” a “${input.newStatus}” non consentita.`,
        );
      }
      if (previousStatus === "Accettata" &&
          (input.diagnosis.length < 10 || input.proposedWork.length === 0)) {
        throw new HttpsError(
          "invalid-argument",
          "Diagnosi e almeno un intervento proposto sono obbligatori.",
        );
      }
      if (input.reason.length < 10) {
        throw new HttpsError(
          "invalid-argument",
          "La motivazione deve contenere almeno 10 caratteri.",
        );
      }
      if (previousStatus === "In lavorazione" &&
          input.newStatus === "Pronta") {
        const existingParts = Array.isArray(repairData?.parts)
          ? repairData.parts
          : [];
        if (input.completedWork.length === 0 || input.minutesSpent < 1) {
          throw new HttpsError(
            "failed-precondition",
            "Interventi eseguiti e tempo impiegato sono obbligatori.",
          );
        }
        if (existingParts.length === 0 && !input.noPartsUsed) {
          throw new HttpsError(
            "failed-precondition",
            "Confermare che non sono stati utilizzati ricambi.",
          );
        }
      }
      const now = Timestamp.now();
      const result = {
        repairId: repairRef.id,
        previousStatus,
        newStatus: input.newStatus,
      };
      const diagnosisFields = previousStatus === "Accettata" ? {
        diagnosis: input.diagnosis,
        proposedWork: input.proposedWork,
        diagnosedAt: now,
        diagnosedBy: uid,
      } : {};
      const startsWork = input.newStatus === "In lavorazione";
      const profile = user.data();
      const assignmentFields = startsWork ? {
        assignedUserIds: Array.from(new Set([
          ...(Array.isArray(repairData?.assignedUserIds)
            ? repairData.assignedUserIds
            : []),
          uid,
        ])),
        assignedTo: Array.from(new Set([
          ...(Array.isArray(repairData?.assignedTo)
            ? repairData.assignedTo
            : []),
          String(profile?.displayName ?? "Operatore autorizzato"),
        ])),
      } : {};
      const completionFields =
        previousStatus === "In lavorazione" && input.newStatus === "Pronta"
          ? {
              completedWork: input.completedWork,
              minutesSpent: input.minutesSpent,
              noPartsUsed: input.noPartsUsed,
              workCompletedAt: now,
              workCompletedBy: uid,
            }
          : {};
      transaction.update(repairRef, {
        ...diagnosisFields,
        ...assignmentFields,
        ...completionFields,
        status: input.newStatus,
        updatedAt: now,
        updatedBy: uid,
        version: Number(repairData?.version ?? 0) + 1,
      });
      transaction.create(historyRef, {
        from: previousStatus,
        to: input.newStatus,
        reason: input.reason,
        changedAt: now,
        changedBy: uid,
      });
      transaction.create(auditRef, {
        action: previousStatus === "Accettata"
          ? "repair.diagnose"
          : "repair.status.update",
        entityType: "repair",
        entityId: repairRef.id,
        entityCode: String(repairData?.code),
        actorUid: uid,
        changes: { status: { from: previousStatus, to: input.newStatus } },
        reason: input.reason,
        createdAt: now,
      });
      transaction.create(requestRef, {
        ...result, createdAt: now, createdBy: uid,
      });
      return result;
    });
  },
);

export const useRepairPart = onCall(
  { region: "europe-west1", enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Accesso richiesto.");
    }
    const uid = request.auth.uid;
    const input = requirePartUsageInput(request.data);
    const db = getFirestore();
    const userRef = db.doc(`users/${uid}`);
    const repairRef = db.doc(`repairs/${input.repairId}`);
    const partRef = db.doc(`parts/${input.partId}`);
    const requestRef = db.doc(
      `idempotencyKeys/part-use_${uid}_${input.idempotencyKey}`,
    );
    const movementRef = db.collection("partMovements").doc();
    const auditRef = db.collection("auditLogs").doc();

    return db.runTransaction(async (transaction) => {
      const [user, repair, part, existingRequest] = await Promise.all([
        transaction.get(userRef),
        transaction.get(repairRef),
        transaction.get(partRef),
        transaction.get(requestRef),
      ]);
      if (!hasPermittedProfile(user.data())) {
        throw new HttpsError(
          "permission-denied",
          "Ruolo non autorizzato all’utilizzo dei ricambi.",
        );
      }
      if (!repair.exists || !part.exists) {
        throw new HttpsError(
          "not-found",
          "Riparazione o ricambio non trovato.",
        );
      }
      if (existingRequest.exists) return existingRequest.data();
      const repairData = repair.data();
      const partData = part.data();
      if (repairData?.status !== "In lavorazione") {
        throw new HttpsError(
          "failed-precondition",
          "I ricambi possono essere utilizzati soltanto durante la lavorazione.",
        );
      }
      const available = Number(partData?.quantityOnHand ?? 0);
      if (available < input.quantity) {
        throw new HttpsError(
          "failed-precondition",
          "Quantità disponibile insufficiente.",
        );
      }
      const now = Timestamp.now();
      const label = `${String(partData?.code)} · ${String(
        partData?.description,
      )} × ${input.quantity}`;
      const existingParts = Array.isArray(repairData?.parts)
        ? repairData.parts
        : [];
      const result = {
        repairId: repairRef.id,
        partId: partRef.id,
        partCode: String(partData?.code),
        partDescription: String(partData?.description),
        movementId: movementRef.id,
        quantity: input.quantity,
        quantityOnHand: available - input.quantity,
      };
      transaction.update(partRef, {
        quantityOnHand: result.quantityOnHand,
        updatedAt: now,
        updatedBy: uid,
        version: Number(partData?.version ?? 0) + 1,
      });
      transaction.update(repairRef, {
        parts: [...existingParts, label],
        updatedAt: now,
        updatedBy: uid,
        version: Number(repairData?.version ?? 0) + 1,
      });
      transaction.create(movementRef, {
        partId: partRef.id,
        partCode: String(partData?.code),
        type: "use",
        quantity: -input.quantity,
        repairId: repairRef.id,
        bikeId: repairData?.bikeId ?? null,
        reason: input.reason,
        occurredAt: now,
        performedBy: uid,
      });
      transaction.create(auditRef, {
        action: "part.use",
        entityType: "part",
        entityId: partRef.id,
        entityCode: String(partData?.code),
        actorUid: uid,
        repairId: repairRef.id,
        changes: {
          quantityOnHand: {
            from: available,
            to: result.quantityOnHand,
          },
        },
        reason: input.reason,
        createdAt: now,
      });
      transaction.create(requestRef, {
        ...result, createdAt: now, createdBy: uid,
      });
      return result;
    });
  },
);
