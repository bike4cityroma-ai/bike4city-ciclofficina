// @vitest-environment node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
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
    await setDoc(doc(adminDb, "users", "operator-demo"), {
      active: true,
      roles: ["operator"],
    });
    await setDoc(doc(adminDb, "bikes", "bike-demo"), {
      code: "BICI-DEMO-0001",
      status: "Da valutare",
      createdAt: "demo-created-at",
      createdBy: "manager-demo",
    });
    await setDoc(doc(adminDb, "members", "member-demo"), {
      membershipNumber: "DEMO-001",
    });
    await setDoc(doc(adminDb, "memberPrivateProfiles", "member-demo"), {
      email: "socio@example.test",
    });
    await setDoc(doc(adminDb, "repairs", "repair-demo"), {
      code: "RIP-DEMO-0001",
      status: "Accettata",
      createdAt: "demo-created-at",
      createdBy: "manager-demo",
    });
    await setDoc(doc(adminDb, "parts", "part-demo"), {
      code: "RIC-DEMO-0001",
      quantityOnHand: 3,
    });
    await setDoc(doc(adminDb, "authorizationEvidence", "evidence-demo"), {
      repairId: "repair-demo",
      storagePath:
        "authorizationEvidence/repair-demo/manager-demo/evidence-demo",
      checksumSha256: "demo-checksum",
    });
    await uploadBytes(
      ref(
        context.storage(),
        "documents/acceptance/repair-demo/document-demo.pdf",
      ),
      new TextEncoder().encode("%PDF-1.7 demo"),
      { contentType: "application/pdf" },
    );
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

  it("nega al tesoriere i contatti privati del socio", async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users", "treasurer-demo"), {
        active: true,
        roles: ["treasurer"],
      });
    });
    const db = testEnvironment
      .authenticatedContext("treasurer-demo")
      .firestore();
    await assertSucceeds(getDoc(doc(db, "members", "member-demo")));
    await assertFails(
      getDoc(doc(db, "memberPrivateProfiles", "member-demo")),
    );
  });

  it("nega al responsabile le scritture dirette sui soci", async () => {
    const db = testEnvironment
      .authenticatedContext("manager-demo")
      .firestore();
    await assertFails(setDoc(doc(db, "members", "member-new"), {
      membershipNumber: "SOC-2026-9999",
    }));
    await assertFails(updateDoc(doc(db, "members", "member-demo"), {
      status: "Sospeso",
    }));
  });

  it("limita i metadati delle evidenze al responsabile", async () => {
    const managerDb = testEnvironment
      .authenticatedContext("manager-demo")
      .firestore();
    const operatorDb = testEnvironment
      .authenticatedContext("operator-demo")
      .firestore();
    await assertSucceeds(getDoc(doc(
      managerDb, "authorizationEvidence", "evidence-demo",
    )));
    await assertFails(getDoc(doc(
      operatorDb, "authorizationEvidence", "evidence-demo",
    )));
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

  it("nega la modifica diretta dello stato bicicletta", async () => {
    const db = testEnvironment
      .authenticatedContext("manager-demo")
      .firestore();

    await assertFails(
      updateDoc(doc(db, "bikes", "bike-demo"), {
        status: "Da riparare",
      }),
    );
  });

  it("nega la scrittura client dello storico stato", async () => {
    const db = testEnvironment
      .authenticatedContext("manager-demo")
      .firestore();

    await assertFails(
      setDoc(
        doc(db, "bikes", "bike-demo", "statusHistory", "event-demo"),
        {
          from: "Da valutare",
          to: "Da riparare",
          reason: "Tentativo client dimostrativo.",
        },
      ),
    );
  });

  it("nega la creazione diretta di una riparazione", async () => {
    const db = testEnvironment
      .authenticatedContext("manager-demo")
      .firestore();

    await assertFails(
      setDoc(doc(db, "repairs", "repair-demo"), {
        code: "RIP-2026-0001",
        status: "Accettata",
      }),
    );
  });

  it("nega aggiornamento e storico riparazione dal client", async () => {
    const db = testEnvironment
      .authenticatedContext("manager-demo")
      .firestore();
    await assertFails(updateDoc(doc(db, "repairs", "repair-demo"), {
      status: "Diagnosticata",
    }));
    await assertFails(setDoc(
      doc(db, "repairs", "repair-demo", "statusHistory", "event-demo"),
      { from: "Accettata", to: "Diagnosticata" },
    ));
  });

  it("nega scarico ricambi e movimenti diretti dal client", async () => {
    const db = testEnvironment
      .authenticatedContext("manager-demo")
      .firestore();
    await assertFails(updateDoc(doc(db, "parts", "part-demo"), {
      quantityOnHand: 2,
    }));
    await assertFails(setDoc(doc(db, "parts", "new-part-demo"), {
      code: "RIC-2026-9999",
      quantityOnHand: 1,
    }));
    await assertFails(setDoc(doc(db, "partMovements", "movement-demo"), {
      partId: "part-demo",
      type: "use",
      quantity: -1,
    }));
  });

  it("nega la creazione diretta di un collaudo", async () => {
    const db = testEnvironment
      .authenticatedContext("manager-demo")
      .firestore();
    await assertFails(setDoc(doc(db, "tests", "test-demo"), {
      code: "COL-2026-9999",
      result: "Positivo",
    }));
  });

  it("nega la creazione diretta di una consegna", async () => {
    const db = testEnvironment
      .authenticatedContext("manager-demo")
      .firestore();
    await assertFails(setDoc(doc(db, "deliveries", "delivery-demo"), {
      code: "CON-2026-9999",
    }));
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

  it("nega la lettura diretta del PDF anche al responsabile", async () => {
    const storage = testEnvironment
      .authenticatedContext("manager-demo", {
        active: true,
        roles: ["workshop_manager"],
      })
      .storage();
    await assertFails(getBytes(ref(
      storage,
      "documents/acceptance/repair-demo/document-demo.pdf",
    )));
  });

  it("nega la scrittura diretta dei PDF operativi", async () => {
    const storage = testEnvironment
      .authenticatedContext("manager-demo", {
        active: true,
        roles: ["workshop_manager"],
      })
      .storage();
    await assertFails(uploadBytes(
      ref(storage, "documents/acceptance/repair-demo/client-write.pdf"),
      new TextEncoder().encode("%PDF-1.7 tentativo"),
      { contentType: "application/pdf" },
    ));
  });

  it("consente un modulo firmato nel percorso vincolato all'utente", async () => {
    const storage = testEnvironment
      .authenticatedContext("manager-demo", {
        active: true,
        roles: ["workshop_manager"],
      })
      .storage();
    await assertSucceeds(uploadBytes(
      ref(
        storage,
        `authorizationEvidence/repair-demo/manager-demo/${crypto.randomUUID()}`,
      ),
      new TextEncoder().encode("%PDF-1.7 modulo dimostrativo"),
      {
        contentType: "application/pdf",
        customMetadata: {
          repairId: "repair-demo",
          uploaderUid: "manager-demo",
          method: "Modulo firmato",
          originalPaperRetained: "true",
        },
      },
    ));
  });

  it("nega email e percorsi di evidenza appartenenti ad altri utenti", async () => {
    const storage = testEnvironment
      .authenticatedContext("manager-demo", {
        active: true,
        roles: ["workshop_manager"],
      })
      .storage();
    await assertFails(uploadBytes(
      ref(
        storage,
        "authorizationEvidence/repair-demo/other-user/email-demo",
      ),
      new TextEncoder().encode("From: demo@example.test"),
      {
        contentType: "message/rfc822",
        customMetadata: {
          repairId: "repair-demo",
          uploaderUid: "other-user",
          method: "Email esplicita",
          originalPaperRetained: "false",
        },
      },
    ));
  });

  it("consente ricevute di revisione private e non sovrascrivibili", async () => {
    const storage = testEnvironment
      .authenticatedContext("manager-demo", {
        active: true,
        roles: ["workshop_manager"],
      })
      .storage();
    const proofRef = ref(
      storage,
      `authorizationReviewEvidence/evidence-demo/manager-demo/${crypto.randomUUID()}`,
    );
    const options = {
      contentType: "application/pdf",
      customMetadata: {
        evidenceId: "evidence-demo",
        uploaderUid: "manager-demo",
        outcome: "return_paper",
      },
    };
    await assertSucceeds(uploadBytes(
      proofRef,
      new TextEncoder().encode("%PDF-1.7 ricevuta demo"),
      options,
    ));
    await assertFails(uploadBytes(
      proofRef,
      new TextEncoder().encode("%PDF-1.7 sovrascrittura"),
      options,
    ));
  });

  it("consente un'evidenza di firma accettazione senza lettura diretta", async () => {
    const storage = testEnvironment
      .authenticatedContext("manager-demo", {
        active: true,
        roles: ["workshop_manager"],
      })
      .storage();
    const evidenceRef = ref(
      storage,
      `acceptanceSignatureEvidence/document-demo/manager-demo/${crypto.randomUUID()}`,
    );
    await assertSucceeds(uploadBytes(
      evidenceRef,
      new TextEncoder().encode("%PDF-1.7 firma accettazione demo"),
      {
        contentType: "application/pdf",
        customMetadata: {
          documentId: "document-demo",
          uploaderUid: "manager-demo",
          method: "Modulo firmato",
        },
      },
    ));
    await assertFails(getBytes(evidenceRef));
  });

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
