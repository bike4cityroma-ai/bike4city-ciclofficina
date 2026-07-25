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

await Promise.all(["createBike", "updateBikeStatus"].map(warmFunction));

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
