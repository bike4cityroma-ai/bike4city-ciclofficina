import { createHash } from "node:crypto";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { HttpsError, onCall } from "firebase-functions/v2/https";

const permittedRoles = new Set(["admin", "workshop_manager", "operator"]);
const repairStatusTransitions = new Map<string, Set<string>>([
  ["Accettata", new Set(["In attesa autorizzazione"])],
  ["Diagnosticata", new Set(["In attesa autorizzazione"])],
  ["In attesa autorizzazione", new Set(["Annullata"])],
  ["In attesa ricambi", new Set(["In lavorazione"])],
  ["In lavorazione", new Set(["In attesa ricambi", "Pronta"])],
  ["Pronta", new Set(["In lavorazione"])],
]);

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

function privateDocumentBucket() {
  const projectId =
    process.env.GCLOUD_PROJECT || "demo-bike4city-ciclofficina";
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET ||
    `${projectId}.firebasestorage.app`;
  return getStorage().bucket(bucketName);
}

async function requireEvidenceRetentionConfiguration(
  db: ReturnType<typeof getFirestore>,
) {
  const projectId =
    process.env.GCLOUD_PROJECT || "demo-bike4city-ciclofficina";
  if (projectId.startsWith("demo-")) {
    return {
      status: "active_until_review",
      retentionMonths: 24,
      policyVersion: "ACC-008-v1",
    };
  }
  const setting = await db.doc(
    "settings/authorization-evidence-retention",
  ).get();
  const months = Number(setting.data()?.retentionMonths);
  if (setting.data()?.status !== "active" ||
      !Number.isInteger(months) || months < 1) {
    throw new HttpsError(
      "failed-precondition",
      "Configurazione di conservazione delle evidenze non approvata.",
    );
  }
  return {
    status: "active_until_review",
    retentionMonths: months,
    policyVersion: String(setting.data()?.policyVersion ?? "ACC-008-v1"),
  };
}

function addUtcMonths(timestamp: Timestamp, months: number) {
  const date = timestamp.toDate();
  date.setUTCMonth(date.getUTCMonth() + months);
  return Timestamp.fromDate(date);
}

interface RepairInput {
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
  if (customerType !== "Socio" && customerType !== "Non socio" &&
      customerType !== "Organizzazione") {
    throw new HttpsError("invalid-argument", "Tipologia utente non valida.");
  }
  const organizationName = nullableText("organizationName", 160);
  if (customerType === "Organizzazione" && !organizationName) {
    throw new HttpsError(
      "invalid-argument",
      "Il nome dell'organizzazione è obbligatorio.",
    );
  }
  const requestedWork = data.requestedWork;
  if (!Array.isArray(requestedWork) || requestedWork.length === 0 ||
      requestedWork.length > 20 ||
      requestedWork.some((item) => typeof item !== "string" || !item.trim() ||
        item.length > 160)) {
    throw new HttpsError("invalid-argument", "Interventi richiesti non validi.");
  }
  const deliveredAccessories = data.deliveredAccessories;
  if (!Array.isArray(deliveredAccessories) ||
      deliveredAccessories.length > 20 ||
      deliveredAccessories.some((item) =>
        typeof item !== "string" || !item.trim() || item.length > 80)) {
    throw new HttpsError("invalid-argument", "Accessori consegnati non validi.");
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
    organizationName: customerType === "Organizzazione"
      ? organizationName
      : null,
    bikeLabel: text("bikeLabel"),
    frameNumber: nullableText("frameNumber"),
    declaredIssue: text("declaredIssue", 1000),
    visibleCondition: text("visibleCondition", 1000),
    deliveredAccessories: deliveredAccessories.map((item) => item.trim()),
    requestedWork: requestedWork.map((item) => item.trim()),
    expectedDeliveryDate,
    notes: text("notes", 1000),
  };
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

const authorizationMethods = new Set([
  "Modulo firmato", "Firma su dispositivo",
]);

function requireRepairAuthorizationInput(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new HttpsError("invalid-argument", "Dati autorizzazione mancanti.");
  }
  const data = value as Record<string, unknown>;
  const text = (name: string, max: number) => {
    const field = data[name];
    if (typeof field !== "string" || !field.trim() || field.length > max) {
      throw new HttpsError("invalid-argument", `Il campo ${name} non è valido.`);
    }
    return field.trim();
  };
  const authorizedWork = Array.isArray(data.authorizedWork)
    ? data.authorizedWork.filter(
        (item): item is string => typeof item === "string",
      ).map((item) => item.trim()).filter(Boolean)
    : [];
  if (authorizedWork.length === 0 || authorizedWork.length > 20 ||
      authorizedWork.some((item) => item.length > 160)) {
    throw new HttpsError(
      "invalid-argument",
      "Gli interventi autorizzati non sono validi.",
    );
  }
  const method = text("method", 40);
  if (!authorizationMethods.has(method)) {
    throw new HttpsError(
      "invalid-argument",
      "Modalità di autorizzazione non valida.",
    );
  }
  const nextStatus = text("nextStatus", 40);
  if (nextStatus !== "In lavorazione" &&
      nextStatus !== "In attesa ricambi") {
    throw new HttpsError("invalid-argument", "Stato successivo non valido.");
  }
  const reason = text("reason", 500);
  if (reason.length < 10) {
    throw new HttpsError(
      "invalid-argument",
      "La motivazione deve contenere almeno 10 caratteri.",
    );
  }
  const communicatedAmount = Number(data.communicatedAmount);
  if (!Number.isFinite(communicatedAmount) ||
      communicatedAmount < 0 || communicatedAmount > 1_000_000 ||
      data.amountAccepted !== true) {
    throw new HttpsError(
      "failed-precondition",
      "L'importo comunicato deve essere valido e accettato esplicitamente.",
    );
  }
  return {
    repairId: text("repairId", 160),
    authorizedWork,
    method,
    evidenceNote: text("evidenceNote", 500),
    evidenceStoragePath: text("evidenceStoragePath", 500),
    communicatedAmount,
    amountAccepted: true,
    currency: "EUR",
    nextStatus,
    reason,
    idempotencyKey: text("idempotencyKey", 80),
  };
}

function requireSafetyReviewInput(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new HttpsError("invalid-argument", "Dati di sicurezza mancanti.");
  }
  const data = value as Record<string, unknown>;
  const text = (name: string, max: number, required = true) => {
    const field = data[name];
    if (typeof field !== "string" ||
        (required && !field.trim()) || field.length > max) {
      throw new HttpsError("invalid-argument", `Il campo ${name} non è valido.`);
    }
    return field.trim();
  };
  const action = text("action", 20);
  if (!["report", "resolve"].includes(action)) {
    throw new HttpsError("invalid-argument", "Azione di sicurezza non valida.");
  }
  const riskType = text("riskType", 50);
  if (![
    "damaged_battery",
    "leak",
    "unstable_component",
    "other_hazard",
  ].includes(riskType)) {
    throw new HttpsError("invalid-argument", "Tipo di rischio non valido.");
  }
  const outcome = text("outcome", 50, false);
  if (action === "resolve" &&
      !["risk_mitigated", "authorized_provider"].includes(outcome)) {
    throw new HttpsError("invalid-argument", "Esito di sicurezza non valido.");
  }
  const documentationReference = text(
    "documentationReference",
    300,
    false,
  );
  if (outcome === "authorized_provider" && !documentationReference) {
    throw new HttpsError(
      "failed-precondition",
      "Il soggetto autorizzato richiede un riferimento documentale.",
    );
  }
  return {
    repairId: text("repairId", 160),
    action: action as "report" | "resolve",
    riskType,
    description: text("description", 1000),
    protectiveMeasures: text("protectiveMeasures", 1000),
    protectedLocation: text("protectedLocation", 160),
    outcome: outcome || null,
    documentationReference: documentationReference || null,
    idempotencyKey: text("idempotencyKey", 80),
  };
}

export const createRepair = onCall(
  { region: "europe-west1", enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== "true" },
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
        organizationName: input.organizationName,
        authorizationSubject: {
          type: input.customerType === "Organizzazione"
            ? "organization_contact"
            : "registered_holder",
          label: input.customerLabel,
          organizationName: input.organizationName,
          policyVersion: "ACC-005-v1",
        },
        bikeLabel: input.bikeLabel,
        frameNumber: input.frameNumber,
        declaredIssue: input.declaredIssue,
        visibleCondition: input.visibleCondition,
        deliveredAccessories: input.deliveredAccessories,
        acceptanceSnapshot: {
          modelVersion: "acceptance-demo-v1",
          approvalStatus: "not_approved",
          privacyTextVersion: "privacy-demo-v1",
          serviceConditionsVersion: "service-demo-v1",
          additionalWorkPolicy: "separate_confirmation_required",
          signatureMethod: "graphic_space_only",
        },
        additionalWorkAuthorization: {
          status: "pending",
          policy: "separate_confirmation_required",
          authorizedAt: null,
          authorizedBy: null,
        },
        diagnosis: null,
        requestedWork: input.requestedWork,
        authorizedWork: [],
        completedWork: [],
        parts: [],
        partUsages: [],
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
  { region: "europe-west1", enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== "true" },
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
      if (existingRequest.exists) {
        const existing = existingRequest.data();
        return {
          repairId: String(existing?.repairId),
          previousStatus: String(existing?.previousStatus),
          newStatus: String(existing?.newStatus),
        };
      }

      const repairData = repair.data();
      if (repairData?.authorizationBlock?.status ===
          "reauthorization_required") {
        throw new HttpsError(
          "failed-precondition",
          "La correzione del soggetto richiede una nuova autorizzazione.",
        );
      }
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

export const authorizeRepairWork = onCall(
  { region: "europe-west1", enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== "true" },
  async (request) => {
    const uid = requireAuthorizedUser(request.auth);
    const input = requireRepairAuthorizationInput(request.data);
    const db = getFirestore();
    const retention = await requireEvidenceRetentionConfiguration(db);
    const evidenceBucket = privateDocumentBucket();
    const expectedPrefix = `authorizationEvidence/${input.repairId}/${uid}/`;
    if (!input.evidenceStoragePath.startsWith(expectedPrefix)) {
      throw new HttpsError(
        "invalid-argument",
        "Percorso dell’evidenza non valido.",
      );
    }
    const evidenceFile = evidenceBucket.file(input.evidenceStoragePath);
    const [evidenceExists] = await evidenceFile.exists();
    if (!evidenceExists) {
      throw new HttpsError(
        "failed-precondition",
        "Archiviare l’evidenza prima dell’autorizzazione.",
      );
    }
    const [fileMetadata] = await evidenceFile.getMetadata();
    const contentType = String(fileMetadata.contentType ?? "");
    const size = Number(fileMetadata.size ?? 0);
    const allowedTypes = input.method === "Modulo firmato"
      ? new Set(["application/pdf", "image/jpeg", "image/png"])
      : new Set(["image/png"]);
    if (!allowedTypes.has(contentType) || size < 1 ||
        size > 10 * 1024 * 1024 ||
        fileMetadata.metadata?.repairId !== input.repairId ||
        fileMetadata.metadata?.uploaderUid !== uid ||
        fileMetadata.metadata?.method !== input.method) {
      throw new HttpsError(
        "failed-precondition",
        "Evidenza non valida o non coerente con l’autorizzazione.",
      );
    }
    const [evidenceBytes] = await evidenceFile.download();
    const checksum = createHash("sha256").update(evidenceBytes).digest("hex");
    const evidenceId = input.evidenceStoragePath.split("/").at(-1);
    if (!evidenceId) {
      throw new HttpsError("invalid-argument", "ID evidenza non valido.");
    }
    const originalPaperRetained =
      fileMetadata.metadata?.originalPaperRetained === "true";
    const physicalLocationCode =
      String(fileMetadata.metadata?.physicalLocationCode ?? "").trim();
    const custodianLabel =
      String(fileMetadata.metadata?.custodianLabel ?? "").trim();
    const depositedOn =
      String(fileMetadata.metadata?.depositedOn ?? "").trim();
    if (originalPaperRetained &&
        (!physicalLocationCode || !custodianLabel ||
          !/^\d{4}-\d{2}-\d{2}$/.test(depositedOn))) {
      throw new HttpsError(
        "failed-precondition",
        "Dati di custodia dell’originale cartaceo incompleti.",
      );
    }
    const evidenceRef = db.doc(`authorizationEvidence/${evidenceId}`);
    const userRef = db.doc(`users/${uid}`);
    const repairRef = db.doc(`repairs/${input.repairId}`);
    const requestRef = db.doc(
      `idempotencyKeys/repair-authorize_${uid}_${input.idempotencyKey}`,
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
          "Ruolo non autorizzato a registrare l’autorizzazione.",
        );
      }
      if (!repair.exists) {
        throw new HttpsError("not-found", "Riparazione non trovata.");
      }
      if (existingRequest.exists) {
        return {
          repairId: String(existingRequest.data()?.repairId),
          previousStatus: String(existingRequest.data()?.previousStatus),
          newStatus: String(existingRequest.data()?.newStatus),
        };
      }
      const repairData = repair.data();
      if (repairData?.status !== "In attesa autorizzazione") {
        throw new HttpsError(
          "failed-precondition",
          "La riparazione non è in attesa di autorizzazione.",
        );
      }
      const proposedWork = Array.isArray(repairData?.proposedWork)
        ? repairData.proposedWork as unknown[]
        : [];
      if (input.authorizedWork.some((item) => !proposedWork.includes(item))) {
        throw new HttpsError(
          "failed-precondition",
          "È possibile autorizzare soltanto interventi proposti in diagnosi.",
        );
      }
      const authorizationSubject = repairData?.authorizationSubject;
      if (!authorizationSubject ||
          typeof authorizationSubject !== "object" ||
          typeof authorizationSubject.label !== "string" ||
          !["registered_holder", "organization_contact"].includes(
            String(authorizationSubject.type),
          )) {
        throw new HttpsError(
          "failed-precondition",
          "Soggetto autorizzante non definito all'accettazione.",
        );
      }
      const now = Timestamp.now();
      const reviewDueAt = addUtcMonths(now, retention.retentionMonths);
      const profile = user.data();
      const startsWork = input.nextStatus === "In lavorazione";
      const response = {
        repairId: repairRef.id,
        previousStatus: "In attesa autorizzazione",
        newStatus: input.nextStatus,
      };
      transaction.update(repairRef, {
        authorizedWork: input.authorizedWork,
        workAuthorization: {
          status: "valid_operational",
          method: input.method,
          authorizedByLabel: authorizationSubject.label,
          authorizationSubjectType: authorizationSubject.type,
          organizationName: authorizationSubject.organizationName ?? null,
          evidenceNote: input.evidenceNote,
          communicatedAmount: input.communicatedAmount,
          currency: input.currency,
          amountAccepted: input.amountAccepted,
          amountPolicyVersion: "ACC-020-v1",
          evidenceId,
          evidenceStatus: "archived_private",
          authorizedAt: now,
          recordedBy: uid,
          evidenceMethodPolicyVersion: "ACC-004-v1",
          evidenceStoragePolicyVersion: "ACC-006-v1",
          subjectPolicyVersion: "ACC-005-v1",
          legalValidity: "not_determined",
        },
        additionalWorkAuthorization: {
          status: "separate_confirmation_required",
          policy: "separate_confirmation_required",
          authorizedAt: null,
          authorizedBy: null,
        },
        authorizationBlock: null,
        ...(startsWork ? {
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
        } : {}),
        status: input.nextStatus,
        updatedAt: now,
        updatedBy: uid,
        version: Number(repairData?.version ?? 0) + 1,
      });
      transaction.create(evidenceRef, {
        repairId: repairRef.id,
        repairCode: String(repairData?.code),
        storagePath: input.evidenceStoragePath,
        contentType,
        size,
        checksumSha256: checksum,
        method: input.method,
        note: input.evidenceNote,
        originalPaperRetained,
        physicalLocationCode: originalPaperRetained
          ? physicalLocationCode
          : null,
        custodianLabel: originalPaperRetained ? custodianLabel : null,
        depositedOn: originalPaperRetained ? depositedOn : null,
        retentionStatus: retention.status,
        retentionMonths: retention.retentionMonths,
        retentionPolicyVersion: retention.policyVersion,
        reviewDueAt,
        reviewOutcome: null,
        reviewedAt: null,
        reviewedBy: null,
        originalFinalDisposition: originalPaperRetained
          ? "pending_manual_review"
          : "not_applicable",
        legalValidity: "not_determined",
        legalValueNote:
          "Evidenza operativa; non qualificata come firma elettronica qualificata.",
        accessPolicyVersion: "ACC-007-v1",
        createdAt: now,
        createdBy: uid,
        archivedAt: null,
        version: 1,
      });
      transaction.create(historyRef, {
        from: "In attesa autorizzazione",
        to: input.nextStatus,
        reason: input.reason,
        changedAt: now,
        changedBy: uid,
      });
      transaction.create(auditRef, {
        action: "repair.work.authorize",
        entityType: "repair",
        entityId: repairRef.id,
        entityCode: String(repairData?.code),
        actorUid: uid,
        changes: {
          status: {
            from: "In attesa autorizzazione",
            to: input.nextStatus,
          },
          authorizedWorkCount: input.authorizedWork.length,
          method: input.method,
          evidenceChecksumSha256: checksum,
        },
        reason: input.reason,
        createdAt: now,
      });
      transaction.create(requestRef, {
        ...response, createdAt: now, createdBy: uid,
      });
      return response;
    });
  },
);

export const manageRepairSafetyReview = onCall(
  { region: "europe-west1", enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== "true" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Accesso richiesto.");
    }
    const uid = request.auth.uid;
    const input = requireSafetyReviewInput(request.data);
    const db = getFirestore();
    const userRef = db.doc(`users/${uid}`);
    const repairRef = db.doc(`repairs/${input.repairId}`);
    const requestRef = db.doc(
      `idempotencyKeys/safety-review_${uid}_${input.idempotencyKey}`,
    );
    const historyRef = repairRef.collection("safetyHistory").doc();
    const statusHistoryRef = repairRef.collection("statusHistory").doc();
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
          "Ruolo non autorizzato alla segnalazione di sicurezza.",
        );
      }
      const roles = Array.isArray(user.data()?.roles)
        ? user.data()?.roles as string[]
        : [];
      if (input.action === "resolve" &&
          !roles.some((role) =>
            role === "admin" || role === "workshop_manager")) {
        throw new HttpsError(
          "permission-denied",
          "Solo responsabile o amministratore possono chiudere la verifica.",
        );
      }
      if (!repair.exists) {
        throw new HttpsError("not-found", "Riparazione non trovata.");
      }
      if (existingRequest.exists) {
        return existingRequest.data()?.result;
      }
      const repairData = repair.data();
      const previousStatus = String(repairData?.status ?? "");
      const now = Timestamp.now();
      let nextStatus = "In verifica sicurezza";
      let update: Record<string, unknown>;

      if (input.action === "report") {
        if (["Consegnata", "Annullata"].includes(previousStatus) ||
            previousStatus === "In verifica sicurezza") {
          throw new HttpsError(
            "failed-precondition",
            "La riparazione non può aprire una nuova verifica di sicurezza.",
          );
        }
        update = {
          status: nextStatus,
          safetyReview: {
            status: "open",
            previousStatus,
            riskType: input.riskType,
            description: input.description,
            protectiveMeasures: input.protectiveMeasures,
            protectedLocation: input.protectedLocation,
            reportedAt: now,
            reportedBy: uid,
            photosOptional: true,
            automaticWasteClassification: false,
            automaticDisposal: false,
          },
          operationalBlock: {
            type: "safety_review",
            policyVersion: "ACC-017-v1",
            blockedAt: now,
          },
        };
      } else {
        const review = repairData?.safetyReview as
          Record<string, unknown> | undefined;
        if (previousStatus !== "In verifica sicurezza" ||
            review?.status !== "open" ||
            typeof review.previousStatus !== "string") {
          throw new HttpsError(
            "failed-precondition",
            "Non esiste una verifica di sicurezza aperta.",
          );
        }
        nextStatus = review.previousStatus;
        update = {
          status: nextStatus,
          "safetyReview.status": "resolved",
          "safetyReview.outcome": input.outcome,
          "safetyReview.resolutionDescription": input.description,
          "safetyReview.finalProtectiveMeasures": input.protectiveMeasures,
          "safetyReview.finalLocation": input.protectedLocation,
          "safetyReview.documentationReference":
            input.documentationReference,
          "safetyReview.resolvedAt": now,
          "safetyReview.resolvedBy": uid,
          operationalBlock: null,
        };
      }

      update.updatedAt = now;
      update.updatedBy = uid;
      update.version = Number(repairData?.version ?? 0) + 1;
      const result = {
        repairId: repairRef.id,
        action: input.action,
        previousStatus,
        newStatus: nextStatus,
      };
      transaction.update(repairRef, update);
      transaction.create(historyRef, {
        action: input.action,
        riskType: input.riskType,
        description: input.description,
        protectiveMeasures: input.protectiveMeasures,
        protectedLocation: input.protectedLocation,
        outcome: input.outcome,
        documentationReference: input.documentationReference,
        recordedAt: now,
        recordedBy: uid,
        policyVersion: "ACC-017-v1",
      });
      transaction.create(statusHistoryRef, {
        from: previousStatus,
        to: nextStatus,
        reason: input.action === "report"
          ? `Verifica sicurezza: ${input.description}`
          : `Verifica sicurezza chiusa: ${input.description}`,
        changedAt: now,
        changedBy: uid,
      });
      transaction.create(auditRef, {
        action: `repair.safety.${input.action}`,
        entityType: "repair",
        entityId: repairRef.id,
        entityCode: String(repairData?.code),
        actorUid: uid,
        riskType: input.riskType,
        policyVersion: "ACC-017-v1",
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
