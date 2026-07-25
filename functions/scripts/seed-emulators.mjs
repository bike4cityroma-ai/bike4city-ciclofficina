import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

process.env.GCLOUD_PROJECT ??= "demo-bike4city-ciclofficina";
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";

const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT });
const auth = getAuth(app);
const db = getFirestore(app);
const email = "responsabile@example.test";
const password = "Demo-Ciclofficina-2026!";

let user;
try {
  user = await auth.getUserByEmail(email);
  await auth.updateUser(user.uid, {
    password,
    displayName: "Giulia Demo",
    disabled: false,
  });
} catch (error) {
  if (error?.code !== "auth/user-not-found") throw error;
  user = await auth.createUser({
    email,
    password,
    displayName: "Giulia Demo",
    emailVerified: true,
  });
}

const roles = ["workshop_manager"];
await auth.setCustomUserClaims(user.uid, { active: true, roles });
await db.doc(`users/${user.uid}`).set({
  displayName: "Giulia Demo",
  email,
  active: true,
  roles,
  demo: true,
  updatedAt: Timestamp.now(),
});

await deleteTestArtifacts();

const now = Timestamp.now();
const demoBikes = [
  {
    id: "bike-demo-0014",
    code: "BICI-2026-0014",
    brand: "Atala",
    model: "City Tour",
    color: "Verde",
    type: "City bike",
    frameSize: "M",
    frameNumber: "DEMO-A14",
    condition: "Buona base, freni da verificare",
    status: "Da valutare",
    location: "Zona accettazione",
    intendedDestination: "Da definire",
    accessories: ["Portapacchi", "Campanello"],
    notes: "Bicicletta e dati interamente fittizi per il prototipo.",
  },
  {
    id: "bike-demo-0013",
    code: "BICI-2026-0013",
    brand: "Bianchi",
    model: "Spillo Demo",
    color: "Blu",
    type: "City bike",
    frameSize: "L",
    frameNumber: "DEMO-B13",
    condition: "Trasmissione usurata",
    status: "In lavorazione",
    location: "Cavalletto 2",
    intendedDestination: "Cessione",
    accessories: ["Luci", "Cavalletto"],
    notes: "In corso sostituzione della catena e regolazione del cambio.",
  },
];

const batch = db.batch();
for (const bike of demoBikes) {
  batch.set(db.doc(`bikes/${bike.id}`), {
    ...bike,
    receivedAt: now,
    createdAt: now,
    createdBy: user.uid,
    updatedAt: now,
    updatedBy: user.uid,
    archivedAt: null,
    version: 1,
  });
}
await batch.commit();

const demoRepairs = [
  {
    id: "repair-demo-0009",
    code: "RIP-2026-0009",
    customerType: "Socio",
    customerLabel: "Socio Demo 104",
    bikeLabel: "Trekking blu · telaio M",
    frameNumber: "DEMO-R09",
    declaredIssue: "Il cambio salta sotto sforzo.",
    diagnosis: null,
    proposedWork: [],
    requestedWork: ["Controllo trasmissione", "Regolazione cambio"],
    authorizedWork: [],
    completedWork: [],
    parts: [],
    partUsages: [],
    assignedTo: [],
    minutesSpent: 0,
    expectedDeliveryAt: null,
    status: "Accettata",
    activityClassification: "Da classificare",
    notes: "Dati interamente fittizi.",
  },
  {
    id: "repair-demo-ready-0008",
    code: "RIP-2026-0008",
    customerType: "Socio",
    customerLabel: "Socio Demo 208",
    bikeLabel: "City bike verde · telaio M",
    frameNumber: "DEMO-COL08",
    declaredIssue: "Freno posteriore poco efficace.",
    diagnosis: "Pattini usurati e cavo da registrare.",
    proposedWork: ["Sostituzione pattini", "Registrazione cavo"],
    requestedWork: ["Controllo impianto frenante"],
    authorizedWork: ["Sostituzione pattini"],
    completedWork: ["Sostituzione pattini", "Regolazione freno"],
    parts: ["RIC-2026-0042 · Coppia pattini freno V-brake × 1"],
    partUsages: [],
    assignedTo: ["Giulia Demo"],
    assignedUserIds: [user.uid],
    minutesSpent: 45,
    expectedDeliveryAt: null,
    status: "Pronta",
    activityClassification: "Da classificare",
    notes: "Riparazione pronta fittizia per il collaudo.",
  },
  {
    id: "repair-demo-tested-0007",
    code: "RIP-2026-0007",
    customerType: "Socio",
    customerLabel: "Socio Demo 307",
    bikeLabel: "Trekking blu · telaio L",
    frameNumber: "DEMO-CON07",
    declaredIssue: "Controllo trasmissione.",
    diagnosis: "Cavo cambio usurato.",
    proposedWork: ["Sostituzione cavo cambio"],
    requestedWork: ["Controllo trasmissione"],
    authorizedWork: ["Sostituzione cavo cambio"],
    completedWork: ["Sostituzione cavo cambio", "Regolazione cambio"],
    parts: ["RIC-2026-0039 · Cavo cambio universale × 1"],
    partUsages: [],
    assignedTo: ["Giulia Demo"],
    assignedUserIds: [user.uid],
    minutesSpent: 40,
    expectedDeliveryAt: null,
    status: "Collaudata",
    testId: "test-demo-positive-0007",
    activityClassification: "Da classificare",
    notes: "Riparazione collaudata fittizia per la consegna.",
  },
];
const repairBatch = db.batch();
for (const repair of demoRepairs) {
  repairBatch.set(db.doc(`repairs/${repair.id}`), {
    ...repair,
    acceptedAt: now,
    createdAt: now,
    createdBy: user.uid,
    updatedAt: now,
    updatedBy: user.uid,
    archivedAt: null,
    version: 1,
  });
}
repairBatch.set(db.doc("tests/test-demo-positive-0007"), {
  code: "COL-2026-0007",
  repairId: "repair-demo-tested-0007",
  repairCode: "RIP-2026-0007",
  bikeId: null,
  bikeCode: null,
  bikeLabel: "Trekking blu · telaio L",
  checks: Object.fromEntries([
    "wheels", "tires", "brakes", "steering", "drivetrain", "gears",
    "pedals", "saddle", "lights", "bell", "road",
  ].map((id) => [id, { result: "Conforme", note: null }])),
  roadTest: { result: "Conforme", note: null },
  result: "Positivo",
  notes: "Collaudo positivo dimostrativo.",
  performedAt: now,
  performedBy: user.uid,
  operatorLabel: "Giulia Demo",
  createdAt: now,
  createdBy: user.uid,
  updatedAt: now,
  updatedBy: user.uid,
  version: 1,
});
repairBatch.set(db.doc("counters/repairs-2026"), {
  lastValue: 9,
  updatedAt: now,
}, { merge: true });
await repairBatch.commit();

const demoParts = [
  {
    id: "part-demo-0042",
    code: "RIC-2026-0042",
    category: "Freni",
    description: "Coppia pattini freno V-brake",
    originType: "recovered",
    origin: "Recuperato",
    condition: "Buono",
    locationId: "Cassettiera F-2",
    location: "Cassettiera F-2",
    quantityOnHand: 4,
    compatibility: "Freni V-brake",
    notes: "Ricambio dimostrativo.",
  },
  {
    id: "part-demo-0040",
    code: "RIC-2026-0040",
    category: "Trasmissione",
    description: "Catena 7/8 velocità",
    originType: "purchased",
    origin: "Acquistato",
    condition: "Nuovo",
    locationId: "Cassettiera T-1",
    location: "Cassettiera T-1",
    quantityOnHand: 2,
    compatibility: "Trasmissioni 7 o 8 velocità",
    notes: "Ricambio dimostrativo.",
  },
  {
    id: "part-demo-0039",
    code: "RIC-2026-0039",
    category: "Trasmissione",
    description: "Cavo cambio universale",
    originType: "recovered",
    origin: "Recuperato",
    condition: "Buono",
    locationId: "Cassettiera T-2",
    location: "Cassettiera T-2",
    quantityOnHand: 5,
    compatibility: "Cambi meccanici standard",
    notes: "Ricambio dimostrativo.",
  },
];
const partBatch = db.batch();
for (const part of demoParts) {
  partBatch.set(db.doc(`parts/${part.id}`), {
    ...part,
    createdAt: now,
    createdBy: user.uid,
    updatedAt: now,
    updatedBy: user.uid,
    archivedAt: null,
    version: 1,
  });
  partBatch.set(db.doc(`partMovements/seed-${part.id}`), {
    partId: part.id,
    partCode: part.code,
    type: "in",
    quantity: part.quantityOnHand,
    repairId: null,
    bikeId: null,
    relatedCode: null,
    reason: "Carico iniziale dimostrativo.",
    occurredAt: now,
    performedBy: user.uid,
  });
}
partBatch.set(db.doc("counters/parts-2026"), {
  lastValue: 42,
  updatedAt: now,
}, { merge: true });
await partBatch.commit();

const bikeSnapshots = await db.collection("bikes").get();
const highestBikeNumber = bikeSnapshots.docs.reduce((highest, snapshot) => {
  const match = /^BICI-2026-(\d+)$/.exec(String(snapshot.data().code));
  return match ? Math.max(highest, Number(match[1])) : highest;
}, 14);
const counterRef = db.doc("counters/bikes-2026");
await db.runTransaction(async (transaction) => {
  const counter = await transaction.get(counterRef);
  transaction.set(counterRef, {
    lastValue: Math.max(
      highestBikeNumber,
      Number(counter.data()?.lastValue ?? 0),
    ),
    updatedAt: Timestamp.now(),
  });
});

await Promise.all(
  [
    "createBike",
    "updateBikeStatus",
    "createRepair",
    "updateRepairWorkflow",
    "useRepairPart",
    "createPart",
    "recordPartMovement",
    "createWorkshopTest",
    "createDelivery",
  ].map(warmFunction),
);

console.info(`Demo locale pronta: ${email}`);

async function warmFunction(functionName) {
  const endpoint =
    `http://127.0.0.1:5001/${process.env.GCLOUD_PROJECT}` +
    `/europe-west1/${functionName}`;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ data: {} }),
        signal: AbortSignal.timeout(45_000),
      });
      if (response.status < 500) return;
    } catch {
      // Il primo avvio del runtime locale può superare il timeout.
    }
  }

  throw new Error(`Function locale non pronta: ${functionName}.`);
}

async function deleteTestArtifacts() {
  const targets = [
    ["parts", "code", "RIC-DEMO-"],
    ["repairs", "code", "RIP-DEMO-"],
    ["partMovements", "partCode", "RIC-DEMO-"],
    ["auditLogs", "entityCode", "RIC-DEMO-"],
    ["tests", "repairCode", "RIP-DEMO-"],
  ];
  for (const [collectionName, field, prefix] of targets) {
    const snapshot = await db.collection(collectionName)
      .where(field, ">=", prefix)
      .where(field, "<=", `${prefix}\uf8ff`)
      .get();
    if (snapshot.empty) continue;
    const cleanupBatch = db.batch();
    snapshot.docs.forEach((item) => cleanupBatch.delete(item.ref));
    await cleanupBatch.commit();
  }
}
