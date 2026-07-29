import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

const permittedRoles = new Set(["admin", "workshop_manager", "operator"]);
const requiredTestChecks = [
  "wheels",
  "tires",
  "brakes",
  "steering",
  "drivetrain",
  "gears",
  "pedals",
  "saddle",
  "lights",
  "bell",
  "road",
];

function hasPermittedProfile(data: Record<string, unknown> | undefined) {
  const roles = Array.isArray(data?.roles) ? data.roles : [];
  return data?.active === true && roles.some((role) =>
    typeof role === "string" && permittedRoles.has(role));
}

function requireWorkshopTestInput(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new HttpsError("invalid-argument", "Dati collaudo mancanti.");
  }
  const data = value as Record<string, unknown>;
  const text = (name: string, max: number) => {
    const field = data[name];
    if (typeof field !== "string" || !field.trim() || field.length > max) {
      throw new HttpsError("invalid-argument", `Il campo ${name} non è valido.`);
    }
    return field.trim();
  };
  if (!data.checks || typeof data.checks !== "object") {
    throw new HttpsError("invalid-argument", "Checklist mancante.");
  }
  const source = data.checks as Record<string, unknown>;
  const checks: Record<string, { result: string; note: string | null }> = {};
  for (const id of requiredTestChecks) {
    const raw = source[id];
    if (!raw || typeof raw !== "object") {
      throw new HttpsError("invalid-argument", `Controllo ${id} mancante.`);
    }
    const check = raw as Record<string, unknown>;
    const result = String(check.result);
    if (!["Conforme", "Non conforme", "Non applicabile"].includes(result)) {
      throw new HttpsError("invalid-argument", `Esito ${id} non valido.`);
    }
    const note = typeof check.note === "string" && check.note.trim()
      ? check.note.trim().slice(0, 500)
      : null;
    if (result !== "Conforme" && (!note || note.length < 5)) {
      throw new HttpsError(
        "invalid-argument",
        `Il controllo ${id} richiede una nota.`,
      );
    }
    checks[id] = { result, note };
  }
  if (!data.roadTestDetails || typeof data.roadTestDetails !== "object") {
    throw new HttpsError(
      "invalid-argument",
      "Dettagli della prova dinamica mancanti.",
    );
  }
  const road = data.roadTestDetails as Record<string, unknown>;
  const roadPerformed = road.performed === true;
  const roadText = (name: string, max: number) => {
    const field = road[name];
    if (typeof field !== "string" || !field.trim() || field.length > max) {
      throw new HttpsError(
        "invalid-argument",
        `Il campo prova dinamica ${name} non è valido.`,
      );
    }
    return field.trim();
  };
  let roadTestDetails: Record<string, unknown>;
  if (roadPerformed) {
    const durationMinutes = Number(road.durationMinutes);
    if (road.routeType !== "controlled_area" ||
        road.publicRoad === true ||
        road.helmetUsed !== true ||
        road.highVisibilityUsed !== true ||
        road.operatorAuthorized !== true ||
        road.authorizedWorkConfirmed !== true ||
        !Number.isInteger(durationMinutes) ||
        durationMinutes < 1 || durationMinutes > 120 ||
        ["wheels", "tires", "brakes", "steering"].some(
          (id) => checks[id]?.result !== "Conforme",
        ) ||
        checks.road.result === "Non applicabile") {
      throw new HttpsError(
        "failed-precondition",
        "La prova dinamica richiede area controllata, protezioni, autorizzazione e controlli preliminari conformi.",
      );
    }
    roadTestDetails = {
      performed: true,
      routeType: "controlled_area",
      publicRoad: false,
      durationMinutes,
      conditions: roadText("conditions", 500),
      operatorAuthorized: true,
      authorizedWorkConfirmed: true,
      helmetUsed: true,
      highVisibilityUsed: true,
      gpsTracking: false,
      policyVersion: "ACC-018-v1",
    };
  } else {
    if (checks.road.result !== "Non applicabile") {
      throw new HttpsError(
        "failed-precondition",
        "Senza prova dinamica il controllo deve essere Non applicabile.",
      );
    }
    roadTestDetails = {
      performed: false,
      reason: checks.road.note,
      publicRoad: false,
      gpsTracking: false,
      policyVersion: "ACC-018-v1",
    };
  }
  return {
    repairId: text("repairId", 160),
    checks,
    roadTestDetails,
    notes: text("notes", 1000),
    idempotencyKey: text("idempotencyKey", 80),
  };
}

export const createWorkshopTest = onCall(
  { region: "europe-west1", enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== "true" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Accesso richiesto.");
    }
    const uid = request.auth.uid;
    const input = requireWorkshopTestInput(request.data);
    const db = getFirestore();
    const userRef = db.doc(`users/${uid}`);
    const repairRef = db.doc(`repairs/${input.repairId}`);
    const year = Number(new Intl.DateTimeFormat("en", {
      timeZone: "Europe/Rome", year: "numeric",
    }).format(new Date()));
    const counterRef = db.doc(`counters/tests-${year}`);
    const requestRef = db.doc(
      `idempotencyKeys/test-create_${uid}_${input.idempotencyKey}`,
    );
    const testRef = db.collection("tests").doc();
    const historyRef = repairRef.collection("statusHistory").doc();
    const auditRef = db.collection("auditLogs").doc();

    return db.runTransaction(async (transaction) => {
      const [user, repair, counter, existingRequest] = await Promise.all([
        transaction.get(userRef),
        transaction.get(repairRef),
        transaction.get(counterRef),
        transaction.get(requestRef),
      ]);
      if (!hasPermittedProfile(user.data())) {
        throw new HttpsError(
          "permission-denied",
          "Ruolo non autorizzato al collaudo.",
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
          result: String(existing?.result),
        };
      }
      const repairData = repair.data();
      if (repairData?.status !== "Pronta") {
        throw new HttpsError(
          "failed-precondition",
          "La riparazione deve essere pronta per il collaudo.",
        );
      }
      const result = Object.values(input.checks).some(
        (check) => check.result === "Non conforme",
      ) ? "Negativo" : "Positivo";
      const nextRepairStatus = result === "Positivo"
        ? "Collaudata"
        : "In lavorazione";
      const nextValue = Number(counter.data()?.lastValue ?? 0) + 1;
      const code = `COL-${year}-${String(nextValue).padStart(4, "0")}`;
      const now = Timestamp.now();
      const response = { id: testRef.id, code, result };
      const profile = user.data();
      transaction.set(counterRef, { lastValue: nextValue, updatedAt: now });
      transaction.create(testRef, {
        code,
        repairId: repairRef.id,
        repairCode: String(repairData?.code),
        bikeId: repairData?.bikeId ?? null,
        bikeCode: repairData?.bikeCode ?? null,
        bikeLabel: String(repairData?.bikeLabel),
        checks: input.checks,
        roadTest: input.roadTestDetails,
        result,
        notes: input.notes,
        performedAt: now,
        performedBy: uid,
        operatorLabel: String(profile?.displayName ?? "Operatore autorizzato"),
        createdAt: now,
        createdBy: uid,
        updatedAt: now,
        updatedBy: uid,
        version: 1,
      });
      transaction.update(repairRef, {
        status: nextRepairStatus,
        testId: testRef.id,
        updatedAt: now,
        updatedBy: uid,
        version: Number(repairData?.version ?? 0) + 1,
      });
      transaction.create(historyRef, {
        from: "Pronta",
        to: nextRepairStatus,
        reason: `Collaudo ${code}: esito ${result}.`,
        changedAt: now,
        changedBy: uid,
      });
      transaction.create(auditRef, {
        action: "test.create",
        entityType: "test",
        entityId: testRef.id,
        entityCode: code,
        actorUid: uid,
        repairId: repairRef.id,
        repairCode: String(repairData?.code),
        result,
        createdAt: now,
      });
      transaction.create(requestRef, {
        ...response, createdAt: now, createdBy: uid,
      });
      return response;
    });
  },
);
