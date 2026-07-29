import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

const permittedRoles = new Set(["admin", "workshop_manager", "operator"]);

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

function requirePartInput(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new HttpsError("invalid-argument", "Dati ricambio mancanti.");
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
  const origin = text("origin", 40);
  if (!["Recuperato", "Acquistato", "Portato dall'utente"].includes(origin)) {
    throw new HttpsError("invalid-argument", "Provenienza non valida.");
  }
  const quantity = Number(data.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100_000) {
    throw new HttpsError("invalid-argument", "Quantità iniziale non valida.");
  }
  const recommendedPrice = data.recommendedPrice;
  let recommendedPriceCents: number | null = null;
  if (recommendedPrice !== null && recommendedPrice !== undefined &&
      recommendedPrice !== "") {
    const amount = Number(recommendedPrice);
    const cents = Math.round(amount * 100);
    if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000 ||
        Math.abs(amount * 100 - cents) > Number.EPSILON * 100) {
      throw new HttpsError(
        "invalid-argument",
        "Prezzo consigliato non valido.",
      );
    }
    recommendedPriceCents = cents;
  }
  return {
    idempotencyKey: text("idempotencyKey", 80),
    category: text("category"),
    description: text("description"),
    brand: nullableText("brand"),
    compatibility: text("compatibility", 500),
    origin,
    condition: text("condition"),
    location: text("location"),
    quantity,
    recommendedPriceCents,
    sourceBikeCode: nullableText("sourceBikeCode"),
    reason: text("reason", 500),
    notes: text("notes", 1000),
  };
}

function requirePartMovementInput(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new HttpsError("invalid-argument", "Dati movimento mancanti.");
  }
  const data = value as Record<string, unknown>;
  const text = (name: string, max: number) => {
    const field = data[name];
    if (typeof field !== "string" || !field.trim() || field.length > max) {
      throw new HttpsError("invalid-argument", `Il campo ${name} non è valido.`);
    }
    return field.trim();
  };
  const operation = text("operation", 20);
  if (!["in", "return", "adjustment"].includes(operation)) {
    throw new HttpsError("invalid-argument", "Tipo movimento non valido.");
  }
  const quantity = Number(data.quantity);
  if (!Number.isInteger(quantity) || quantity === 0 ||
      Math.abs(quantity) > 100_000 ||
      (operation !== "adjustment" && quantity < 1)) {
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
    partId: text("partId", 160),
    operation,
    quantity,
    reason,
    relatedCode: typeof data.relatedCode === "string" &&
      data.relatedCode.trim()
      ? data.relatedCode.trim().slice(0, 160)
      : null,
    idempotencyKey: text("idempotencyKey", 80),
  };
}

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
      if (existingRequest.exists) {
        const existing = existingRequest.data();
        return {
          repairId: String(existing?.repairId),
          repairCode: String(existing?.repairCode),
          partId: String(existing?.partId),
          partCode: String(existing?.partCode),
          partDescription: String(existing?.partDescription),
          movementId: String(existing?.movementId),
          quantity: Number(existing?.quantity),
          quantityOnHand: Number(existing?.quantityOnHand),
        };
      }
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
      const existingPartUsages = Array.isArray(repairData?.partUsages)
        ? repairData.partUsages
        : [];
      const repairCode = String(repairData?.code);
      const result = {
        repairId: repairRef.id,
        repairCode,
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
        partUsages: [...existingPartUsages, {
          partId: partRef.id,
          partCode: String(partData?.code),
          description: String(partData?.description),
          quantity: input.quantity,
          movementId: movementRef.id,
          usedAt: now,
          usedBy: uid,
        }],
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
        relatedCode: repairCode,
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
        repairCode,
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
export const createPart = onCall(
  { region: "europe-west1", enforceAppCheck: false },
  async (request) => {
    const uid = requireAuthorizedUser(request.auth);
    const input = requirePartInput(request.data);
    const db = getFirestore();
    const userRef = db.doc(`users/${uid}`);
    const year = Number(new Intl.DateTimeFormat("en", {
      timeZone: "Europe/Rome", year: "numeric",
    }).format(new Date()));
    const requestRef = db.doc(
      `idempotencyKeys/part-create_${uid}_${input.idempotencyKey}`,
    );
    const counterRef = db.doc(`counters/parts-${year}`);
    const partRef = db.collection("parts").doc();
    const movementRef = db.collection("partMovements").doc();
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
          "Ruolo non autorizzato alla registrazione dei ricambi.",
        );
      }
      if (existingRequest.exists) {
        const existing = existingRequest.data();
        return {
          id: String(existing?.id),
          code: String(existing?.code),
          movementId: String(existing?.movementId),
        };
      }
      const nextValue = Number(counter.data()?.lastValue ?? 0) + 1;
      const code = `RIC-${year}-${String(nextValue).padStart(4, "0")}`;
      const now = Timestamp.now();
      const originTypes: Record<string, string> = {
        Recuperato: "recovered",
        Acquistato: "purchased",
        "Portato dall'utente": "user_supplied",
      };
      const result = {
        id: partRef.id,
        code,
        movementId: movementRef.id,
      };
      transaction.set(counterRef, { lastValue: nextValue, updatedAt: now });
      transaction.create(partRef, {
        code,
        category: input.category,
        description: input.description,
        brand: input.brand,
        compatibility: input.compatibility,
        origin: input.origin,
        originType: originTypes[input.origin],
        condition: input.condition,
        location: input.location,
        quantityOnHand: input.quantity,
        recommendedPriceCents: input.recommendedPriceCents,
        sourceBikeCode: input.sourceBikeCode,
        notes: input.notes,
        createdAt: now,
        createdBy: uid,
        updatedAt: now,
        updatedBy: uid,
        archivedAt: null,
        version: 1,
      });
      transaction.create(movementRef, {
        partId: partRef.id,
        partCode: code,
        type: "in",
        quantity: input.quantity,
        repairId: null,
        bikeId: null,
        relatedCode: input.sourceBikeCode,
        reason: input.reason,
        occurredAt: now,
        performedBy: uid,
      });
      transaction.create(auditRef, {
        action: "part.create",
        entityType: "part",
        entityId: partRef.id,
        entityCode: code,
        actorUid: uid,
        changes: { quantityOnHand: { from: 0, to: input.quantity } },
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

export const recordPartMovement = onCall(
  { region: "europe-west1", enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Accesso richiesto.");
    }
    const uid = request.auth.uid;
    const input = requirePartMovementInput(request.data);
    const db = getFirestore();
    const userRef = db.doc(`users/${uid}`);
    const partRef = db.doc(`parts/${input.partId}`);
    const requestRef = db.doc(
      `idempotencyKeys/part-movement_${uid}_${input.idempotencyKey}`,
    );
    const movementRef = db.collection("partMovements").doc();
    const auditRef = db.collection("auditLogs").doc();

    return db.runTransaction(async (transaction) => {
      const [user, part, existingRequest] = await Promise.all([
        transaction.get(userRef),
        transaction.get(partRef),
        transaction.get(requestRef),
      ]);
      if (!hasPermittedProfile(user.data())) {
        throw new HttpsError(
          "permission-denied",
          "Ruolo non autorizzato ai movimenti di magazzino.",
        );
      }
      if (!part.exists) {
        throw new HttpsError("not-found", "Ricambio non trovato.");
      }
      if (existingRequest.exists) {
        const existing = existingRequest.data();
        return {
          partId: String(existing?.partId),
          movementId: String(existing?.movementId),
          previousQuantity: Number(existing?.previousQuantity),
          quantityOnHand: Number(existing?.quantityOnHand),
        };
      }
      const partData = part.data();
      const previousQuantity = Number(partData?.quantityOnHand ?? 0);
      const quantityOnHand = previousQuantity + input.quantity;
      if (quantityOnHand < 0) {
        throw new HttpsError(
          "failed-precondition",
          "La rettifica porterebbe la giacenza sotto zero.",
        );
      }
      const now = Timestamp.now();
      const result = {
        partId: partRef.id,
        movementId: movementRef.id,
        previousQuantity,
        quantityOnHand,
      };
      transaction.update(partRef, {
        quantityOnHand,
        updatedAt: now,
        updatedBy: uid,
        version: Number(partData?.version ?? 0) + 1,
      });
      transaction.create(movementRef, {
        partId: partRef.id,
        partCode: String(partData?.code),
        type: input.operation,
        quantity: input.quantity,
        repairId: null,
        bikeId: null,
        relatedCode: input.relatedCode,
        reason: input.reason,
        occurredAt: now,
        performedBy: uid,
      });
      transaction.create(auditRef, {
        action: `part.movement.${input.operation}`,
        entityType: "part",
        entityId: partRef.id,
        entityCode: String(partData?.code),
        actorUid: uid,
        changes: {
          quantityOnHand: { from: previousQuantity, to: quantityOnHand },
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
