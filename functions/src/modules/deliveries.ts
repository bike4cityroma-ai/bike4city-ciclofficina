import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

function hasDeliveryProfile(data: Record<string, unknown> | undefined) {
  const roles = Array.isArray(data?.roles) ? data.roles : [];
  return data?.active === true && roles.some(
    (role) => role === "admin" || role === "workshop_manager",
  );
}

function requireDeliveryInput(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new HttpsError("invalid-argument", "Dati consegna mancanti.");
  }
  const data = value as Record<string, unknown>;
  const text = (name: string, max: number) => {
    const field = data[name];
    if (typeof field !== "string" || !field.trim() || field.length > max) {
      throw new HttpsError("invalid-argument", `Il campo ${name} non è valido.`);
    }
    return field.trim();
  };
  const recipientType = text("recipientType", 30);
  if (!["Socio", "Non socio", "Ente dimostrativo"].includes(recipientType)) {
    throw new HttpsError("invalid-argument", "Tipo ricevente non valido.");
  }
  const contributionAmount = data.contributionAmount === null ||
    data.contributionAmount === "" ? null : Number(data.contributionAmount);
  if (contributionAmount !== null &&
      (!Number.isFinite(contributionAmount) || contributionAmount < 0 ||
        contributionAmount > 1_000_000)) {
    throw new HttpsError("invalid-argument", "Contributo non valido.");
  }
  const accessories = Array.isArray(data.accessories)
    ? data.accessories.filter((item): item is string =>
        typeof item === "string" && Boolean(item.trim()))
      .map((item) => item.trim())
    : [];
  if (accessories.length > 30 ||
      accessories.some((item) => item.length > 120)) {
    throw new HttpsError("invalid-argument", "Accessori non validi.");
  }
  if (data.declarationsAccepted !== true) {
    throw new HttpsError(
      "failed-precondition",
      "Le dichiarazioni di consegna devono essere confermate.",
    );
  }
  return {
    repairId: text("repairId", 160),
    recipientType,
    recipientLabel: text("recipientLabel", 160),
    conditionSnapshot: text("conditionSnapshot", 1000),
    accessories,
    contributionAmount,
    notes: text("notes", 1000),
    idempotencyKey: text("idempotencyKey", 80),
  };
}

const pickupContactActions = [
  "ready_notice",
  "reminder",
  "final_notice",
  "open_overdue_review",
] as const;
const pickupContactChannels = [
  "phone",
  "sms",
  "email",
  "written",
  "internal",
] as const;

function requirePickupContactInput(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new HttpsError("invalid-argument", "Dati del contatto mancanti.");
  }
  const data = value as Record<string, unknown>;
  const text = (name: string, max: number) => {
    const field = data[name];
    if (typeof field !== "string" || !field.trim() || field.length > max) {
      throw new HttpsError("invalid-argument", `Il campo ${name} non è valido.`);
    }
    return field.trim();
  };
  const action = text("action", 40);
  const channel = text("channel", 20);
  if (!pickupContactActions.includes(
    action as typeof pickupContactActions[number],
  )) {
    throw new HttpsError("invalid-argument", "Azione di ritiro non valida.");
  }
  if (!pickupContactChannels.includes(
    channel as typeof pickupContactChannels[number],
  )) {
    throw new HttpsError("invalid-argument", "Canale di contatto non valido.");
  }
  if (action === "open_overdue_review" && channel !== "internal") {
    throw new HttpsError(
      "invalid-argument",
      "La revisione oltre termine richiede il canale interno.",
    );
  }
  if (action !== "open_overdue_review" && channel === "internal") {
    throw new HttpsError(
      "invalid-argument",
      "Un contatto esterno non può usare il canale interno.",
    );
  }
  return {
    repairId: text("repairId", 160),
    action: action as typeof pickupContactActions[number],
    channel: channel as typeof pickupContactChannels[number],
    note: text("note", 1000),
    idempotencyKey: text("idempotencyKey", 80),
  };
}

export const recordPickupContact = onCall(
  { region: "europe-west1", enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Accesso richiesto.");
    }
    const uid = request.auth.uid;
    const input = requirePickupContactInput(request.data);
    const db = getFirestore();
    const userRef = db.doc(`users/${uid}`);
    const repairRef = db.doc(`repairs/${input.repairId}`);
    const requestRef = db.doc(
      `idempotencyKeys/pickup-contact_${uid}_${input.idempotencyKey}`,
    );
    const historyRef = repairRef.collection("pickupHistory").doc();
    const auditRef = db.collection("auditLogs").doc();

    return db.runTransaction(async (transaction) => {
      const [user, repair, existingRequest] = await Promise.all([
        transaction.get(userRef),
        transaction.get(repairRef),
        transaction.get(requestRef),
      ]);
      if (!hasDeliveryProfile(user.data())) {
        throw new HttpsError(
          "permission-denied",
          "Ruolo non autorizzato alla gestione del ritiro.",
        );
      }
      const roles = Array.isArray(user.data()?.roles)
        ? user.data()?.roles as string[]
        : [];
      if (input.action === "open_overdue_review" &&
          !roles.includes("admin")) {
        throw new HttpsError(
          "permission-denied",
          "Solo un amministratore può aprire la revisione oltre termine.",
        );
      }
      if (!repair.exists) {
        throw new HttpsError("not-found", "Riparazione non trovata.");
      }
      if (existingRequest.exists) {
        return existingRequest.data()?.result;
      }
      const repairData = repair.data();
      if (repairData?.status !== "Collaudata") {
        throw new HttpsError(
          "failed-precondition",
          "La gestione del ritiro richiede una riparazione collaudata.",
        );
      }

      const now = Timestamp.now();
      const dayMs = 24 * 60 * 60 * 1000;
      const pickup = repairData?.pickupNotice as
        Record<string, unknown> | undefined;
      const firstNotifiedAt = pickup?.firstNotifiedAt instanceof Timestamp
        ? pickup.firstNotifiedAt
        : null;
      const update: Record<string, unknown> = {
        updatedAt: now,
        updatedBy: uid,
        version: Number(repairData?.version ?? 0) + 1,
      };

      if (input.action === "ready_notice") {
        if (firstNotifiedAt) {
          throw new HttpsError(
            "already-exists",
            "La prima comunicazione di disponibilità è già registrata.",
          );
        }
        update.pickupStatus = "awaiting_pickup";
        update.pickupNotice = {
          firstNotifiedAt: now,
          firstChannel: input.channel,
          reminderDueAt: Timestamp.fromMillis(now.toMillis() + 15 * dayMs),
          ordinaryDeadlineAt: Timestamp.fromMillis(
            now.toMillis() + 30 * dayMs,
          ),
          finalDeadlineAt: Timestamp.fromMillis(now.toMillis() + 45 * dayMs),
        };
      } else {
        if (!firstNotifiedAt) {
          throw new HttpsError(
            "failed-precondition",
            "Registrare prima la comunicazione di disponibilità.",
          );
        }
        const elapsedMs = now.toMillis() - firstNotifiedAt.toMillis();
        if (input.action === "reminder") {
          if (elapsedMs < 15 * dayMs) {
            throw new HttpsError(
              "failed-precondition",
              "Il promemoria è ammesso dopo 15 giorni.",
            );
          }
          update["pickupNotice.remindedAt"] = now;
          update["pickupNotice.reminderChannel"] = input.channel;
        }
        if (input.action === "final_notice") {
          if (elapsedMs < 30 * dayMs) {
            throw new HttpsError(
              "failed-precondition",
              "Il preavviso finale è ammesso dopo 30 giorni.",
            );
          }
          update.pickupStatus = "final_notice";
          update["pickupNotice.finalNotifiedAt"] = now;
          update["pickupNotice.finalChannel"] = input.channel;
        }
        if (input.action === "open_overdue_review") {
          if (!(pickup?.finalNotifiedAt instanceof Timestamp) ||
              elapsedMs < 45 * dayMs) {
            throw new HttpsError(
              "failed-precondition",
              "La revisione richiede il preavviso finale e 45 giorni totali.",
            );
          }
          update.pickupStatus = "custody_overdue";
          update.uncollectedReview = {
            status: "open",
            openedAt: now,
            openedBy: uid,
            ownershipTransferred: false,
            automaticDisposition: false,
            custodyChargesApplied: false,
          };
        }
      }

      const result = {
        repairId: repairRef.id,
        action: input.action,
        pickupStatus: String(
          update.pickupStatus ?? repairData?.pickupStatus ?? "awaiting_pickup",
        ),
        recordedAt: now.toDate().toISOString(),
      };
      transaction.update(repairRef, update);
      transaction.create(historyRef, {
        action: input.action,
        channel: input.channel,
        note: input.note,
        recordedAt: now,
        recordedBy: uid,
        policyVersion: "ACC-016-v1",
        workAuthorization: false,
      });
      transaction.create(auditRef, {
        action: `pickup.${input.action}`,
        entityType: "repair",
        entityId: repairRef.id,
        entityCode: String(repairData?.code),
        actorUid: uid,
        policyVersion: "ACC-016-v1",
        createdAt: now,
      });
      transaction.create(requestRef, {
        result,
        createdAt: now,
        createdBy: uid,
      });
      return result;
    });
  },
);
export const createDelivery = onCall(
  { region: "europe-west1", enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Accesso richiesto.");
    }
    const uid = request.auth.uid;
    const input = requireDeliveryInput(request.data);
    const db = getFirestore();
    const userRef = db.doc(`users/${uid}`);
    const repairRef = db.doc(`repairs/${input.repairId}`);
    const year = Number(new Intl.DateTimeFormat("en", {
      timeZone: "Europe/Rome", year: "numeric",
    }).format(new Date()));
    const counterRef = db.doc(`counters/deliveries-${year}`);
    const requestRef = db.doc(
      `idempotencyKeys/delivery-create_${uid}_${input.idempotencyKey}`,
    );
    const deliveryRef = db.collection("deliveries").doc();
    const historyRef = repairRef.collection("statusHistory").doc();
    const auditRef = db.collection("auditLogs").doc();

    return db.runTransaction(async (transaction) => {
      const [user, repair, counter, existingRequest] = await Promise.all([
        transaction.get(userRef),
        transaction.get(repairRef),
        transaction.get(counterRef),
        transaction.get(requestRef),
      ]);
      if (!hasDeliveryProfile(user.data())) {
        throw new HttpsError(
          "permission-denied",
          "Ruolo non autorizzato alla consegna.",
        );
      }
      if (!repair.exists) {
        throw new HttpsError("not-found", "Riparazione non trovata.");
      }
      if (existingRequest.exists) {
        const existing = existingRequest.data();
        return {
          id: String(existing?.id),
          code: String(existing?.code),
          documentCode: String(existing?.documentCode),
        };
      }
      const repairData = repair.data();
      if (repairData?.status !== "Collaudata" ||
          typeof repairData?.testId !== "string") {
        throw new HttpsError(
          "failed-precondition",
          "La riparazione richiede un collaudo positivo.",
        );
      }
      const testRef = db.doc(`tests/${repairData.testId}`);
      const test = await transaction.get(testRef);
      if (!test.exists || test.data()?.result !== "Positivo") {
        throw new HttpsError(
          "failed-precondition",
          "Collaudo positivo non disponibile.",
        );
      }
      const nextValue = Number(counter.data()?.lastValue ?? 0) + 1;
      const sequence = String(nextValue).padStart(4, "0");
      const code = `CON-${year}-${sequence}`;
      const documentCode = `VER-${year}-${sequence}`;
      const now = Timestamp.now();
      const response = { id: deliveryRef.id, code, documentCode };
      const profile = user.data();
      transaction.set(counterRef, { lastValue: nextValue, updatedAt: now });
      transaction.create(deliveryRef, {
        code,
        type: "Riconsegna riparazione",
        repairId: repairRef.id,
        repairCode: String(repairData?.code),
        testId: testRef.id,
        testCode: String(test.data()?.code),
        bikeId: repairData?.bikeId ?? null,
        bikeCode: repairData?.bikeCode ?? null,
        bikeLabel: String(repairData?.bikeLabel),
        recipientType: input.recipientType,
        recipientLabel: input.recipientLabel,
        conditionSnapshot: input.conditionSnapshot,
        accessories: input.accessories,
        contributionAmount: input.contributionAmount,
        receiptCode: null,
        documentCode,
        deliveredAt: now,
        deliveredBy: uid,
        deliveredByLabel: String(
          profile?.displayName ?? "Responsabile autorizzato",
        ),
        classificationLabel: "Da classificare",
        declarations: [
          "Condizioni e interventi illustrati al ricevente.",
          "Consegna dimostrativa confermata.",
        ],
        notes: input.notes,
        createdAt: now,
        createdBy: uid,
        updatedAt: now,
        updatedBy: uid,
        version: 1,
      });
      transaction.update(repairRef, {
        status: "Consegnata",
        pickupStatus: "delivered",
        deliveryId: deliveryRef.id,
        deliveredAt: now,
        updatedAt: now,
        updatedBy: uid,
        version: Number(repairData?.version ?? 0) + 1,
      });
      transaction.create(historyRef, {
        from: "Collaudata",
        to: "Consegnata",
        reason: `Consegna ${code} registrata.`,
        changedAt: now,
        changedBy: uid,
      });
      transaction.create(auditRef, {
        action: "delivery.create",
        entityType: "delivery",
        entityId: deliveryRef.id,
        entityCode: code,
        actorUid: uid,
        repairId: repairRef.id,
        repairCode: String(repairData?.code),
        createdAt: now,
      });
      transaction.create(requestRef, {
        ...response, createdAt: now, createdBy: uid,
      });
      return response;
    });
  },
);

