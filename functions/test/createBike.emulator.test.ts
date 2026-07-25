import { deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const projectId =
  process.env.GCLOUD_PROJECT || "demo-bike4city-ciclofficina";
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
const functionsHost =
  process.env.FUNCTIONS_EMULATOR_HOST || "127.0.0.1:5001";
const app = initializeApp({ projectId }, "functions-integration-test");
const auth = getAuth(app);
const db = getFirestore(app);
const email = "responsabile-functions@example.test";
const password = "Demo-Functions-2026!";
let idToken = "";
let volunteerToken = "";

beforeAll(async () => {
  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch {
    user = await auth.createUser({
      email,
      password,
      displayName: "Responsabile Functions Demo",
    });
  }
  await auth.setCustomUserClaims(user.uid, {
    active: true,
    roles: ["workshop_manager"],
  });
  await db.doc(`users/${user.uid}`).set({
    displayName: "Responsabile Functions Demo",
    active: true,
    roles: ["workshop_manager"],
    demo: true,
    updatedAt: Timestamp.now(),
  });

  const response = await fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    },
  );
  const result = (await response.json()) as { idToken?: string };
  if (!result.idToken) throw new Error("Token Auth Emulator non disponibile.");
  idToken = result.idToken;

  let volunteer;
  const volunteerEmail = "volontario-functions@example.test";
  try {
    volunteer = await auth.getUserByEmail(volunteerEmail);
  } catch {
    volunteer = await auth.createUser({
      email: volunteerEmail,
      password,
      displayName: "Volontario Functions Demo",
    });
  }
  await auth.setCustomUserClaims(volunteer.uid, {
    active: true,
    roles: ["volunteer"],
  });
  await db.doc(`users/${volunteer.uid}`).set({
    displayName: "Volontario Functions Demo",
    active: true,
    roles: ["volunteer"],
    demo: true,
    updatedAt: Timestamp.now(),
  });
  const volunteerResponse = await fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: volunteerEmail,
        password,
        returnSecureToken: true,
      }),
    },
  );
  const volunteerResult = (await volunteerResponse.json()) as {
    idToken?: string;
  };
  if (!volunteerResult.idToken) {
    throw new Error("Token volontario Auth Emulator non disponibile.");
  }
  volunteerToken = volunteerResult.idToken;
}, 20_000);

afterAll(async () => {
  await deleteApp(app);
});

describe("createBike", () => {
  it("nega una richiesta non autenticata", async () => {
    const response = await invoke(createInput("senza-auth"), false);
    expect(response.status).toBe(401);
  }, 15_000);

  it("nega uno stato iniziale diverso da Da valutare", async () => {
    const response = await invokeFunction("createBike", {
      ...createInput("stato-iniziale-illegale"),
      status: "Consegnata",
    });
    expect(response.status).toBe(400);
  }, 15_000);

  it("assegna progressivi univoci con richieste concorrenti e resta idempotente", async () => {
    const year = Number(
      new Intl.DateTimeFormat("en", {
        timeZone: "Europe/Rome",
        year: "numeric",
      }).format(new Date()),
    );
    await db.doc(`counters/bikes-${year}`).set({
      lastValue: 20,
      updatedAt: Timestamp.now(),
    });

    const requests = Array.from({ length: 6 }, (_, index) =>
      invoke(createInput(`parallela-${index}`)),
    );
    const responses = await Promise.all(requests);
    const results = await Promise.all(
      responses.map(async (response) => {
        expect(response.ok).toBe(true);
        return (await response.json()) as {
          result: { id: string; code: string };
        };
      }),
    );
    const codes = results.map(({ result }) => result.code).sort();
    expect(new Set(codes).size).toBe(6);
    expect(codes).toEqual(
      Array.from(
        { length: 6 },
        (_, index) => `BICI-${year}-${String(index + 21).padStart(4, "0")}`,
      ),
    );

    const repeated = await invoke(createInput("parallela-0"));
    const repeatedResult = (await repeated.json()) as {
      result: { id: string; code: string };
    };
    expect(repeatedResult.result).toEqual(results[0].result);
  }, 30_000);
});

describe("updateBikeStatus", () => {
  it("aggiorna stato e storico, resta idempotente e nega ruoli insufficienti", async () => {
    const bikeId = `bike-status-${crypto.randomUUID()}`;
    await db.doc(`bikes/${bikeId}`).set({
      ...createInput("seed-status"),
      code: "BICI-2026-0900",
      status: "Da valutare",
      createdAt: Timestamp.now(),
      createdBy: "seed",
      updatedAt: Timestamp.now(),
      updatedBy: "seed",
      archivedAt: null,
      version: 1,
    });
    const data = {
      bikeId,
      newStatus: "Da riparare",
      reason: "Valutazione tecnica dimostrativa completata.",
      idempotencyKey: `status-${crypto.randomUUID()}`,
    };

    const response = await invokeFunction("updateBikeStatus", data);
    expect(response.ok).toBe(true);
    const firstResult = (await response.json()) as {
      result: {
        bikeId: string;
        previousStatus: string;
        newStatus: string;
      };
    };
    expect(firstResult.result).toEqual({
      bikeId,
      previousStatus: "Da valutare",
      newStatus: "Da riparare",
    });

    const repeated = await invokeFunction("updateBikeStatus", data);
    expect((await repeated.json()) as unknown).toEqual(firstResult);
    const bike = await db.doc(`bikes/${bikeId}`).get();
    const history = await db
      .collection(`bikes/${bikeId}/statusHistory`)
      .get();
    const audit = await db
      .collection("auditLogs")
      .where("entityId", "==", bikeId)
      .where("action", "==", "bike.status.update")
      .get();
    expect(bike.data()?.status).toBe("Da riparare");
    expect(bike.data()?.version).toBe(2);
    expect(history.size).toBe(1);
    expect(audit.size).toBe(1);

    const forbidden = await invokeFunction(
      "updateBikeStatus",
      {
        ...data,
        newStatus: "In lavorazione",
        idempotencyKey: `status-volontario-${crypto.randomUUID()}`,
      },
      volunteerToken,
    );
    expect(forbidden.status).toBe(403);
  }, 30_000);

  it("nega una transizione non consentita", async () => {
    const bikeId = "bike-status-invalid-demo";
    await db.doc(`bikes/${bikeId}`).set({
      ...createInput("seed-invalid"),
      code: "BICI-2026-0901",
      status: "Da valutare",
      createdAt: Timestamp.now(),
      createdBy: "seed",
      updatedAt: Timestamp.now(),
      updatedBy: "seed",
      archivedAt: null,
      version: 1,
    });
    const response = await invokeFunction("updateBikeStatus", {
      bikeId,
      newStatus: "Consegnata",
      reason: "Tentativo dimostrativo non consentito.",
      idempotencyKey: "status-illegale",
    });
    expect(response.status).toBe(400);
    expect((await db.doc(`bikes/${bikeId}`).get()).data()?.status).toBe(
      "Da valutare",
    );
  }, 15_000);
});

describe("createRepair", () => {
  it("crea una riparazione con progressivo, audit e idempotenza", async () => {
    const data = {
      idempotencyKey: `repair-${crypto.randomUUID()}`,
      customerType: "Socio",
      customerLabel: "Socio Demo 501",
      bikeLabel: "City bike demo verde",
      frameNumber: "DEMO-501",
      declaredIssue: "Freno posteriore poco efficace.",
      requestedWork: ["Controllo impianto frenante"],
      expectedDeliveryDate: "2026-08-01",
      notes: "Dati esclusivamente fittizi.",
    };
    const response = await invokeFunction("createRepair", data);
    expect(response.status).toBe(200);
    const body = await response.json() as {
      result: { id: string; code: string };
    };
    expect(body.result.code).toMatch(/^RIP-\d{4}-\d{4}$/);
    const repair = await db.doc(`repairs/${body.result.id}`).get();
    expect(repair.data()?.status).toBe("Accettata");
    expect(repair.data()?.createdBy).toBeTruthy();
    const repeated = await invokeFunction("createRepair", data);
    expect((await repeated.json()).result).toEqual(body.result);
    const audits = await db.collection("auditLogs")
      .where("entityId", "==", body.result.id).get();
    expect(audits.docs.some((item) =>
      item.data().action === "repair.create")).toBe(true);
  }, 20_000);

  it("nega la creazione al volontario", async () => {
    const response = await invokeFunction("createRepair", {
      idempotencyKey: `repair-${crypto.randomUUID()}`,
      customerType: "Non socio",
      customerLabel: "Utente Demo",
      bikeLabel: "Bicicletta Demo",
      frameNumber: null,
      declaredIssue: "Controllo generale richiesto.",
      requestedWork: ["Controllo generale"],
      expectedDeliveryDate: null,
      notes: "Dati fittizi.",
    }, volunteerToken);
    expect(response.status).toBe(403);
  }, 20_000);
});

describe("updateRepairWorkflow", () => {
  it("registra diagnosi, storico e avanzamento consentito", async () => {
    const repairRef = db.collection("repairs").doc();
    await repairRef.set({
      code: "RIP-DEMO-DIAGNOSI",
      status: "Accettata",
      version: 1,
      createdAt: Timestamp.now(),
      createdBy: "demo",
    });
    const data = {
      repairId: repairRef.id,
      newStatus: "Diagnosticata",
      diagnosis: "Cambio posteriore danneggiato e non registrabile.",
      proposedWork: ["Sostituzione cambio posteriore"],
      reason: "Diagnosi tecnica completata in officina.",
      idempotencyKey: `diagnosis-${crypto.randomUUID()}`,
    };
    const response = await invokeFunction("updateRepairWorkflow", data);
    expect(response.status).toBe(200);
    expect((await repairRef.get()).data()?.status).toBe("Diagnosticata");
    expect((await repairRef.get()).data()?.diagnosis).toContain("danneggiato");
    const history = await repairRef.collection("statusHistory").get();
    expect(history.size).toBe(1);
    const repeated = await invokeFunction("updateRepairWorkflow", data);
    expect(repeated.status).toBe(200);
    expect((await repairRef.collection("statusHistory").get()).size).toBe(1);

    const startResponse = await invokeFunction("updateRepairWorkflow", {
      repairId: repairRef.id,
      newStatus: "In lavorazione",
      diagnosis: "",
      proposedWork: [],
      completedWork: [],
      minutesSpent: 0,
      noPartsUsed: false,
      reason: "Lavorazione autorizzata e avviata.",
      idempotencyKey: `start-${crypto.randomUUID()}`,
    });
    expect(startResponse.status).toBe(200);
    expect((await repairRef.get()).data()?.assignedTo).toContain(
      "Responsabile Functions Demo",
    );

    const incomplete = await invokeFunction("updateRepairWorkflow", {
      repairId: repairRef.id,
      newStatus: "Pronta",
      diagnosis: "",
      proposedWork: [],
      completedWork: [],
      minutesSpent: 0,
      noPartsUsed: false,
      reason: "Tentativo di chiusura incompleta.",
      idempotencyKey: `incomplete-${crypto.randomUUID()}`,
    });
    expect(incomplete.status).toBe(400);

    const complete = await invokeFunction("updateRepairWorkflow", {
      repairId: repairRef.id,
      newStatus: "Pronta",
      diagnosis: "",
      proposedWork: [],
      completedWork: ["Sostituzione cambio posteriore"],
      minutesSpent: 45,
      noPartsUsed: true,
      reason: "Lavorazione completata e verificata.",
      idempotencyKey: `complete-${crypto.randomUUID()}`,
    });
    expect(complete.status).toBe(200);
    expect((await repairRef.get()).data()?.minutesSpent).toBe(45);
  }, 20_000);

  it("nega il salto diretto da Accettata a In lavorazione", async () => {
    const repairRef = db.collection("repairs").doc();
    await repairRef.set({
      code: "RIP-DEMO-SALTO",
      status: "Accettata",
      version: 1,
    });
    const response = await invokeFunction("updateRepairWorkflow", {
      repairId: repairRef.id,
      newStatus: "In lavorazione",
      diagnosis: "Diagnosi valida ma transizione non consentita.",
      proposedWork: ["Controllo generale"],
      reason: "Tentativo dimostrativo non consentito.",
      idempotencyKey: `jump-${crypto.randomUUID()}`,
    });
    expect(response.status).toBe(400);
  }, 20_000);
});

describe("useRepairPart", () => {
  it("scarica il ricambio, crea il movimento e resta idempotente", async () => {
    const repairRef = db.collection("repairs").doc();
    const partRef = db.collection("parts").doc();
    await repairRef.set({
      code: "RIP-DEMO-RICAMBIO",
      status: "In lavorazione",
      parts: [],
      version: 1,
      createdAt: Timestamp.now(),
      createdBy: "demo",
    });
    await partRef.set({
      code: "RIC-DEMO-001",
      description: "Cavo cambio dimostrativo",
      quantityOnHand: 3,
      version: 1,
      createdAt: Timestamp.now(),
      createdBy: "demo",
    });
    const data = {
      repairId: repairRef.id,
      partId: partRef.id,
      quantity: 2,
      reason: "Montaggio sulla riparazione dimostrativa.",
      idempotencyKey: `part-${crypto.randomUUID()}`,
    };
    const response = await invokeFunction("useRepairPart", data);
    expect(response.status).toBe(200);
    expect((await partRef.get()).data()?.quantityOnHand).toBe(1);
    expect((await repairRef.get()).data()?.parts[0]).toContain("× 2");
    const movements = await db.collection("partMovements")
      .where("repairId", "==", repairRef.id).get();
    expect(movements.size).toBe(1);
    expect(movements.docs[0].data().quantity).toBe(-2);

    const repeated = await invokeFunction("useRepairPart", data);
    expect(repeated.status).toBe(200);
    expect((await partRef.get()).data()?.quantityOnHand).toBe(1);
    expect((await db.collection("partMovements")
      .where("repairId", "==", repairRef.id).get()).size).toBe(1);
  }, 20_000);

  it("nega quantità superiore alla giacenza", async () => {
    const repairRef = db.collection("repairs").doc();
    const partRef = db.collection("parts").doc();
    await repairRef.set({ status: "In lavorazione", parts: [], version: 1 });
    await partRef.set({
      code: "RIC-DEMO-SCARSO",
      description: "Ricambio con scorta limitata",
      quantityOnHand: 1,
      version: 1,
    });
    const response = await invokeFunction("useRepairPart", {
      repairId: repairRef.id,
      partId: partRef.id,
      quantity: 2,
      reason: "Tentativo oltre la disponibilità.",
      idempotencyKey: `part-stock-${crypto.randomUUID()}`,
    });
    expect(response.status).toBe(400);
    expect((await partRef.get()).data()?.quantityOnHand).toBe(1);
  }, 20_000);
});

function createInput(idempotencyKey: string) {
  return {
    idempotencyKey,
    brand: "Marca Demo",
    model: "Modello Demo",
    color: "Verde",
    type: "City bike",
    frameSize: "M",
    frameNumber: null,
    condition: "Condizione fittizia",
    status: "Da valutare",
    location: "Zona test",
    intendedDestination: "Da definire",
    accessories: ["Campanello"],
    notes: "Dato esclusivamente dimostrativo.",
  };
}

function invoke(data: ReturnType<typeof createInput>, authenticated = true) {
  return invokeFunction(
    "createBike",
    data,
    authenticated ? idToken : null,
  );
}

function invokeFunction(
  functionName: string,
  data: unknown,
  token: string | null | undefined = idToken,
) {
  return fetch(
    `http://${functionsHost}/${projectId}/europe-west1/${functionName}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ data }),
    },
  );
}
