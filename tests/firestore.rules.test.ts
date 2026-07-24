// @vitest-environment node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  getBytes,
  ref,
  uploadBytes,
} from "firebase/storage";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const projectId = "demo-bike4city-ciclofficina";
let testEnvironment: RulesTestEnvironment;

beforeAll(async () => {
  const storageRules = await readFile(
    resolve(process.cwd(), "storage.rules"),
    "utf8",
  );

  testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: await readFile(
        resolve(process.cwd(), "firestore.rules"),
        "utf8",
      ),
    },
    storage: {
      host: "127.0.0.1",
      port: 9199,
      rules: storageRules,
    },
  });
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
  await testEnvironment.clearStorage();

  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();

    await setDoc(doc(adminDb, "users", "manager-demo"), {
      active: true,
      roles: ["workshop_manager"],
    });
    await setDoc(doc(adminDb, "users", "volunteer-demo"), {
      active: true,
      roles: ["volunteer"],
    });
    await setDoc(doc(adminDb, "users", "inactive-demo"), {
      active: false,
      roles: ["workshop_manager"],
    });
    await setDoc(doc(adminDb, "bikes", "bike-demo"), {
      code: "BICI-DEMO-0001",
    });
    await setDoc(doc(adminDb, "members", "member-demo"), {
      membershipNumber: "DEMO-001",
    });
  });
});

afterAll(async () => {
  await testEnvironment.cleanup();
});

describe("Regole Firestore", () => {
  it("nega la lettura anonima delle biciclette", async () => {
    const db = testEnvironment.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(db, "bikes", "bike-demo")));
  });

  it("consente al responsabile attivo di leggere le biciclette", async () => {
    const db = testEnvironment
      .authenticatedContext("manager-demo")
      .firestore();

    await assertSucceeds(getDoc(doc(db, "bikes", "bike-demo")));
  });

  it("nega al volontario i dati dei soci", async () => {
    const db = testEnvironment
      .authenticatedContext("volunteer-demo")
      .firestore();

    await assertFails(getDoc(doc(db, "members", "member-demo")));
  });

  it("nega ogni accesso operativo a un account disattivato", async () => {
    const db = testEnvironment
      .authenticatedContext("inactive-demo")
      .firestore();

    await assertFails(getDoc(doc(db, "bikes", "bike-demo")));
  });

  it("nega la scrittura diretta dei contatori", async () => {
    const db = testEnvironment
      .authenticatedContext("manager-demo")
      .firestore();

    await assertFails(
      setDoc(doc(db, "counters", "bike-2026"), {
        lastValue: 1,
      }),
    );
  });
});

describe("Regole Storage", () => {
  it("nega la lettura anonima delle fotografie", async () => {
    const storage = testEnvironment.unauthenticatedContext().storage();

    await assertFails(
      getBytes(ref(storage, "bikes/bike-demo/photos/photo-demo")),
    );
  });

  it(
    "consente al responsabile attivo di caricare un'immagine valida",
    async () => {
      const storage = testEnvironment
        .authenticatedContext("manager-demo", {
          active: true,
          roles: ["workshop_manager"],
        })
        .storage();

      await assertSucceeds(
        uploadBytes(
          ref(storage, "bikes/bike-demo/photos/photo-demo"),
          new Uint8Array([137, 80, 78, 71]),
          {
            contentType: "image/png",
          },
        ),
      );
    },
    20_000,
  );

  it(
    "rifiuta tipi di file non ammessi",
    async () => {
      const storage = testEnvironment
        .authenticatedContext("manager-demo", {
          active: true,
          roles: ["workshop_manager"],
        })
        .storage();

      await assertFails(
        uploadBytes(
          ref(storage, "bikes/bike-demo/photos/file-demo"),
          new TextEncoder().encode("contenuto dimostrativo"),
          {
            contentType: "text/plain",
          },
        ),
      );
    },
    20_000,
  );
});
