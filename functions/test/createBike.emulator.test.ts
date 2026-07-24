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
}, 20_000);

afterAll(async () => {
  await deleteApp(app);
});

describe("createBike", () => {
  it("nega una richiesta non autenticata", async () => {
    const response = await invoke(createInput("senza-auth"), false);
    expect(response.status).toBe(401);
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
  return fetch(
    `http://${functionsHost}/${projectId}/europe-west1/createBike`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(authenticated ? { authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({ data }),
    },
  );
}
