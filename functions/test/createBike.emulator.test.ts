import { deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { restoreJsonBackupToEmulator } from "../src/restore-backup.js";

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
let adminToken = "";
let managerUid = "";

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
  managerUid = user.uid;
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

  const adminEmail = "amministratore-functions@example.test";
  let admin;
  try {
    admin = await auth.getUserByEmail(adminEmail);
  } catch {
    admin = await auth.createUser({
      email: adminEmail,
      password,
      displayName: "Amministratore Functions Demo",
    });
  }
  await auth.setCustomUserClaims(admin.uid, {
    active: true,
    roles: ["admin"],
  });
  await db.doc(`users/${admin.uid}`).set({
    displayName: "Amministratore Functions Demo",
    active: true,
    roles: ["admin"],
    demo: true,
    updatedAt: Timestamp.now(),
  });
  const adminResponse = await fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: adminEmail,
        password,
        returnSecureToken: true,
      }),
    },
  );
  const adminResult = (await adminResponse.json()) as { idToken?: string };
  if (!adminResult.idToken) {
    throw new Error("Token amministratore Auth Emulator non disponibile.");
  }
  adminToken = adminResult.idToken;
}, 20_000);

afterAll(async () => {
  await deleteApp(app);
});

describe("createBike", () => {
  it("nega una richiesta non autenticata", async () => {
    const response = await invoke(createInput("senza-auth"), false);
    expect(response.status).toBe(401);
  }, 30_000);

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

describe("reviewAuthorizationEvidence", () => {
  it("separa proposta e conferma amministrativa con audit", async () => {
    const evidenceRef = db.collection("authorizationEvidence").doc();
    const repairRef = db.doc("repairs/repair-review-demo");
    await repairRef.set({
      workAuthorization: {
        authorizedByLabel: "Socio Autorizzante Demo",
      },
      demo: true,
    });
    await evidenceRef.set({
      repairId: repairRef.id,
      retentionStatus: "active_until_review",
      reviewDueAt: Timestamp.fromMillis(
        Date.now() + 20 * 24 * 60 * 60 * 1000,
      ),
      originalPaperRetained: true,
      originalFinalDisposition: "pending_manual_review",
      version: 1,
      demo: true,
    });
    const proofId = crypto.randomUUID();
    const proofStoragePath =
      `authorizationReviewEvidence/${evidenceRef.id}/${managerUid}/${proofId}`;
    const proofPdf = await PDFDocument.create();
    proofPdf.addPage([300, 200]);
    await getStorage(app).bucket(`${projectId}.firebasestorage.app`)
      .file(proofStoragePath)
      .save(Buffer.from(await proofPdf.save()), {
        resumable: false,
        contentType: "application/pdf",
        metadata: {
          metadata: {
            evidenceId: evidenceRef.id,
            uploaderUid: managerUid,
            outcome: "return_paper",
          },
        },
      });
    const proposal = {
      evidenceId: evidenceRef.id,
      action: "propose",
      outcome: "return_paper",
      reason: "Restituzione proposta al soggetto registrato.",
      details: "Ricevuta di restituzione da acquisire.",
      newReviewDate: null,
      actionDate: "2026-07-26",
      subjectLabel: "Socio Autorizzante Demo",
      proofStoragePath,
      idempotencyKey: `review-propose-${crypto.randomUUID()}`,
    };
    const proposed = await invokeFunction(
      "reviewAuthorizationEvidence",
      proposal,
    );
    expect(proposed.status).toBe(200);
    expect((await evidenceRef.get()).data()?.retentionStatus)
      .toBe("review_proposed");

    const deniedConfirmation = await invokeFunction(
      "reviewAuthorizationEvidence",
      {
        ...proposal,
        action: "confirm",
        reason: "Conferma tentata dal responsabile ciclofficina.",
        idempotencyKey: `review-denied-${crypto.randomUUID()}`,
      },
    );
    expect(deniedConfirmation.status).toBe(403);

    const confirmation = {
      ...proposal,
      action: "confirm",
      reason: "Restituzione confermata con ricevuta registrata.",
      details: "Ricevuta demo firmata dal destinatario.",
      idempotencyKey: `review-confirm-${crypto.randomUUID()}`,
    };
    const confirmed = await invokeFunction(
      "reviewAuthorizationEvidence",
      confirmation,
      adminToken,
    );
    expect(confirmed.status).toBe(200);
    const evidence = await evidenceRef.get();
    expect(evidence.data()?.retentionStatus).toBe("review_completed");
    expect(evidence.data()?.reviewOutcome).toBe("return_paper");
    expect(evidence.data()?.originalFinalDisposition).toBe("returned");
    expect(evidence.data()?.reviewPolicyVersion).toBe("ACC-009-v1");
    expect(evidence.data()?.reviewProof.policyVersion).toBe("ACC-010-v1");
    expect(evidence.data()?.reviewProof.checksumSha256)
      .toMatch(/^[a-f0-9]{64}$/);
    expect(evidence.data()?.reviewProof.retentionMonths).toBe(24);
    const exported = await invokeFunction(
      "accessAuthorizationReviewEvidence",
      { evidenceId: evidenceRef.id, action: "export" },
    );
    expect(exported.status).toBe(200);
    const exportedBody = await exported.json() as {
      result: { contentType: string; dataBase64: string };
    };
    expect(exportedBody.result.contentType).toBe("application/pdf");
    expect(Buffer.from(exportedBody.result.dataBase64, "base64")
      .subarray(0, 4).toString()).toBe("%PDF");
    const deniedExport = await invokeFunction(
      "accessAuthorizationReviewEvidence",
      { evidenceId: evidenceRef.id, action: "export" },
      volunteerToken,
    );
    expect(deniedExport.status).toBe(403);

    const replacementId = crypto.randomUUID();
    const replacementPath =
      `authorizationReviewEvidence/${evidenceRef.id}/` +
      `${(await auth.getUserByEmail("amministratore-functions@example.test")).uid}/` +
      replacementId;
    const adminUid =
      (await auth.getUserByEmail("amministratore-functions@example.test")).uid;
    await getStorage(app).bucket(`${projectId}.firebasestorage.app`)
      .file(replacementPath)
      .save(Buffer.from(await proofPdf.save()), {
        resumable: false,
        contentType: "application/pdf",
        metadata: {
          metadata: {
            evidenceId: evidenceRef.id,
            uploaderUid: adminUid,
            outcome: "return_paper",
          },
        },
      });
    const replaced = await invokeFunction(
      "replaceAuthorizationReviewEvidence",
      {
        evidenceId: evidenceRef.id,
        storagePath: replacementPath,
        reason: "Sostituzione della ricevuta con versione corretta.",
        idempotencyKey: `proof-replace-${crypto.randomUUID()}`,
      },
      adminToken,
    );
    expect(replaced.status).toBe(200);
    expect((await evidenceRef.get()).data()?.reviewProof.version).toBe(2);
    expect((await evidenceRef.collection("proofVersionHistory").get()).size)
      .toBe(1);
    const repeated = await invokeFunction(
      "reviewAuthorizationEvidence",
      confirmation,
      adminToken,
    );
    expect((await repeated.json()).result)
      .toEqual((await confirmed.json()).result);
  }, 90_000);

  it("blocca una prova con checksum errato e registra l'anomalia", async () => {
    const evidenceRef = db.collection("authorizationEvidence").doc();
    const proofPath =
      `authorizationReviewEvidence/${evidenceRef.id}/${managerUid}/` +
      crypto.randomUUID();
    await getStorage(app).bucket(`${projectId}.firebasestorage.app`)
      .file(proofPath)
      .save(Buffer.from("prova dimostrativa non integra"), {
        resumable: false,
        contentType: "image/png",
      });
    await evidenceRef.set({
      reviewProof: {
        storagePath: proofPath,
        contentType: "image/png",
        checksumSha256: "0".repeat(64),
        proofId: "proof-bad-checksum",
      },
      version: 1,
      demo: true,
    });
    const response = await invokeFunction(
      "accessAuthorizationReviewEvidence",
      { evidenceId: evidenceRef.id, action: "view" },
    );
    expect(response.ok).toBe(false);
    expect((await evidenceRef.get()).data()?.documentAnomaly.status)
      .toBe("detected");
    expect((await evidenceRef.get()).data()?.documentAnomaly.incidentType)
      .toBe("checksum_mismatch");
  }, 20_000);

  it("separa segnalazione, apertura e chiusura dell'incidente", async () => {
    const evidenceRef = db.collection("authorizationEvidence").doc();
    await evidenceRef.set({ version: 1, demo: true });
    const report = await invokeFunction(
      "manageAuthorizationEvidenceIncident",
      {
        evidenceId: evidenceRef.id,
        action: "report",
        incidentType: "missing_file",
        reason: "File dimostrativo non disponibile durante la verifica.",
        idempotencyKey: `incident-report-${crypto.randomUUID()}`,
      },
    );
    expect(report.status).toBe(200);
    const reportBody = await report.json() as {
      result: { incidentId: string };
    };
    const incidentId = reportBody.result.incidentId;
    const deniedOpen = await invokeFunction(
      "manageAuthorizationEvidenceIncident",
      {
        evidenceId: evidenceRef.id,
        incidentId,
        action: "open",
        incidentType: "missing_file",
        reason: "Tentativo di apertura da parte del responsabile.",
        idempotencyKey: `incident-denied-${crypto.randomUUID()}`,
      },
    );
    expect(deniedOpen.status).toBe(403);
    const opened = await invokeFunction(
      "manageAuthorizationEvidenceIncident",
      {
        evidenceId: evidenceRef.id,
        incidentId,
        action: "open",
        incidentType: "missing_file",
        reason: "Apertura amministrativa per ricerca nel backup.",
        idempotencyKey: `incident-open-${crypto.randomUUID()}`,
      },
      adminToken,
    );
    expect(opened.status).toBe(200);
    const resolved = await invokeFunction(
      "manageAuthorizationEvidenceIncident",
      {
        evidenceId: evidenceRef.id,
        incidentId,
        action: "resolve",
        incidentType: "missing_file",
        resolution: "recovered",
        reason: "Documento recuperato dal backup dimostrativo verificato.",
        idempotencyKey: `incident-resolve-${crypto.randomUUID()}`,
      },
      adminToken,
    );
    expect(resolved.status).toBe(200);
    expect((await evidenceRef.get()).data()?.documentAnomaly.status)
      .toBe("resolved");
  }, 60_000);
});

describe("createOperationalDocument", () => {
  it("genera un PDF privato, metadati e audit in modo idempotente", async () => {
    const repairRef = db.collection("repairs").doc();
    await repairRef.set({
      code: "RIP-DEMO-PDF",
      customerLabel: "Socio PDF Demo",
      bikeLabel: "Bicicletta PDF Demo",
      declaredIssue: "Controllo generale dimostrativo.",
      notes: "Dati esclusivamente fittizi.",
      authorizationSubject: {
        type: "registered_holder",
        label: "Socio PDF Demo",
      },
    });
    const data = {
      type: "acceptance",
      entityId: repairRef.id,
      idempotencyKey: `document-${crypto.randomUUID()}`,
    };
    const response = await invokeFunction("createOperationalDocument", data);
    expect(response.status).toBe(200);
    const body = await response.json() as {
      result: { id: string; code: string; storagePath: string };
    };
    expect(body.result.code).toMatch(/^ACC-\d{4}-\d{4}$/);
    const metadata = await db.doc(`documents/${body.result.id}`).get();
    expect(metadata.data()?.status).toBe("draft");
    expect(metadata.data()?.legalValidity).toBe("not_approved");
    const [pdf] = await getStorage(app)
      .bucket(`${projectId}.firebasestorage.app`)
      .file(body.result.storagePath).download();
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    const accessed = await invokeFunction("accessOperationalDocument", {
      documentId: body.result.id,
      action: "view",
    });
    expect(accessed.status).toBe(200);
    const copyRecorded = await invokeFunction("recordAcceptanceCopy", {
      documentId: body.result.id,
      outcome: "delivered",
      method: "paper",
      recipientLabel: "Socio PDF Demo",
      reason: "Copia cartacea dimostrativa consegnata al soggetto registrato.",
      idempotencyKey: `acceptance-copy-${crypto.randomUUID()}`,
    });
    expect(copyRecorded.status).toBe(200);
    expect((await db.doc(`documents/${body.result.id}`).get())
      .data()?.latestCopyEvent.method).toBe("paper");
    expect((await db.doc(`documents/${body.result.id}`)
      .collection("copyHistory").get()).size).toBe(1);
    await db.doc("settings/acceptance-privacy-policy").set({
      status: "draft", version: null, demo: true,
    });
    await db.doc("settings/acceptance-service-conditions").set({
      status: "draft", version: null, demo: true,
    });
    const blockedConsolidation = await invokeFunction(
      "consolidateAcceptanceDocument",
      {
        documentId: body.result.id,
        signatureMethod: "Modulo firmato",
        signatureStoragePath: "non-disponibile",
        reason: "Tentativo con testi ancora non approvati.",
        idempotencyKey: `consolidate-blocked-${crypto.randomUUID()}`,
      },
    );
    expect(blockedConsolidation.status).toBe(400);
    await db.doc("settings/acceptance-privacy-policy").set({
      status: "active", version: "privacy-demo-v1", demo: true,
    });
    await db.doc("settings/acceptance-service-conditions").set({
      status: "active", version: "conditions-demo-v1", demo: true,
    });
    const signaturePath =
      `acceptanceSignatureEvidence/${body.result.id}/${managerUid}/` +
      crypto.randomUUID();
    await getStorage(app).bucket(`${projectId}.firebasestorage.app`)
      .file(signaturePath)
      .save(Buffer.from("%PDF-1.7 firma dimostrativa"), {
        resumable: false,
        contentType: "application/pdf",
        metadata: {
          metadata: {
            documentId: body.result.id,
            uploaderUid: managerUid,
            method: "Modulo firmato",
          },
        },
      });
    const consolidated = await invokeFunction(
      "consolidateAcceptanceDocument",
      {
        documentId: body.result.id,
        signatureMethod: "Modulo firmato",
        signatureStoragePath: signaturePath,
        reason: "Consolidamento dimostrativo con policy fittizie attive.",
        idempotencyKey: `consolidate-${crypto.randomUUID()}`,
      },
    );
    expect(consolidated.status).toBe(200);
    expect((await db.doc(`documents/${body.result.id}`).get()).data()?.status)
      .toBe("consolidated_demo");
    expect((await db.doc(`documents/${body.result.id}`).get())
      .data()?.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
    const repeated = await invokeFunction("createOperationalDocument", data);
    expect((await repeated.json()).result).toEqual(body.result);
    const correction = {
      documentId: body.result.id,
      correctedFields: ["Soggetto registrato"],
      correctionSummary:
        "Correzione dimostrativa del soggetto indicato all'accettazione.",
      subjectChanged: true,
      correctedSubjectLabel: "Socio Corretto Demo",
      reason: "Correzione richiesta per un dato anagrafico errato.",
    };
    const proposedCorrection = await invokeFunction(
      "correctAcceptanceDocument",
      {
        ...correction,
        action: "propose",
        idempotencyKey: `correction-propose-${crypto.randomUUID()}`,
      },
    );
    expect(proposedCorrection.status).toBe(200);
    const confirmedCorrection = await invokeFunction(
      "correctAcceptanceDocument",
      {
        ...correction,
        action: "confirm",
        idempotencyKey: `correction-confirm-${crypto.randomUUID()}`,
      },
    );
    expect(confirmedCorrection.status).toBe(200);
    const correctionBody = await confirmedCorrection.json() as {
      result: { newDocumentId: string };
    };
    expect((await db.doc(`documents/${body.result.id}`).get()).data()?.status)
      .toBe("superseded");
    expect((await db.doc(
      `documents/${correctionBody.result.newDocumentId}`,
    ).get()).data()?.status).toBe("draft");
    expect((await db.doc(`documents/${body.result.id}`)
      .collection("correctionHistory").get()).size).toBe(1);
    expect((await repairRef.get()).data()?.authorizationBlock.status)
      .toBe("reauthorization_required");
  }, 90_000);

  it("nega la generazione al volontario", async () => {
    const response = await invokeFunction("createOperationalDocument", {
      type: "acceptance",
      entityId: "repair-demo",
      idempotencyKey: `document-denied-${crypto.randomUUID()}`,
    }, volunteerToken);
    expect(response.status).toBe(403);
  }, 15_000);
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
      visibleCondition: "Pattini visibilmente consumati; telaio senza danni evidenti.",
      deliveredAccessories: ["Chiave lucchetto demo"],
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
    expect(repair.data()?.acceptanceSnapshot.approvalStatus)
      .toBe("not_approved");
    expect(repair.data()?.additionalWorkAuthorization.status).toBe("pending");
    const repeated = await invokeFunction("createRepair", data);
    expect((await repeated.json()).result).toEqual(body.result);
    const audits = await db.collection("auditLogs")
      .where("entityId", "==", body.result.id).get();
    expect(audits.docs.some((item) =>
      item.data().action === "repair.create")).toBe(true);
  }, 20_000);

  it("fissa il referente autorizzante di un'organizzazione", async () => {
    const response = await invokeFunction("createRepair", {
      idempotencyKey: `repair-org-${crypto.randomUUID()}`,
      customerType: "Organizzazione",
      customerLabel: "Referente Organizzazione Demo",
      organizationName: "Associazione Esempio Demo",
      bikeLabel: "Cargo bike dimostrativa",
      frameNumber: "DEMO-ORG-01",
      declaredIssue: "Controllo generale richiesto.",
      visibleCondition: "Condizioni visibili dimostrative.",
      deliveredAccessories: [],
      requestedWork: ["Controllo generale"],
      expectedDeliveryDate: null,
      notes: "Dati esclusivamente fittizi.",
    });
    expect(response.status).toBe(200);
    const body = await response.json() as { result: { id: string } };
    const repair = await db.doc(`repairs/${body.result.id}`).get();
    expect(repair.data()?.authorizationSubject).toEqual({
      type: "organization_contact",
      label: "Referente Organizzazione Demo",
      organizationName: "Associazione Esempio Demo",
      policyVersion: "ACC-005-v1",
    });
  }, 20_000);

  it("nega la creazione al volontario", async () => {
    const response = await invokeFunction("createRepair", {
      idempotencyKey: `repair-${crypto.randomUUID()}`,
      customerType: "Non socio",
      customerLabel: "Utente Demo",
      bikeLabel: "Bicicletta Demo",
      frameNumber: null,
      declaredIssue: "Controllo generale richiesto.",
      visibleCondition: "Condizioni visibili dimostrative.",
      deliveredAccessories: [],
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
      authorizationSubject: {
        type: "registered_holder",
        label: "Socio Autorizzante Demo",
        organizationName: null,
        policyVersion: "ACC-005-v1",
      },
      version: 1,
      createdAt: Timestamp.now(),
      createdBy: "demo",
    });
    const data = {
      repairId: repairRef.id,
      newStatus: "In attesa autorizzazione",
      diagnosis: "Cambio posteriore danneggiato e non registrabile.",
      proposedWork: ["Sostituzione cambio posteriore"],
      reason: "Diagnosi tecnica completata in officina.",
      idempotencyKey: `diagnosis-${crypto.randomUUID()}`,
    };
    const response = await invokeFunction("updateRepairWorkflow", data);
    expect(response.status).toBe(200);
    expect((await repairRef.get()).data()?.status)
      .toBe("In attesa autorizzazione");
    expect((await repairRef.get()).data()?.diagnosis).toContain("danneggiato");
    const history = await repairRef.collection("statusHistory").get();
    expect(history.size).toBe(1);
    const repeated = await invokeFunction("updateRepairWorkflow", data);
    expect(repeated.status).toBe(200);
    expect((await repairRef.collection("statusHistory").get()).size).toBe(1);

    const directStartResponse = await invokeFunction("updateRepairWorkflow", {
      repairId: repairRef.id,
      newStatus: "In lavorazione",
      diagnosis: "",
      proposedWork: [],
      completedWork: [],
      minutesSpent: 0,
      noPartsUsed: false,
      reason: "Tentativo senza registrare l'autorizzazione.",
      idempotencyKey: `start-${crypto.randomUUID()}`,
    });
    expect(directStartResponse.status).toBe(400);

    const evidenceStoragePath =
      `authorizationEvidence/${repairRef.id}/${managerUid}/${crypto.randomUUID()}`;
    await getStorage(app)
      .bucket(`${projectId}.firebasestorage.app`)
      .file(evidenceStoragePath)
      .save(Buffer.from("%PDF-1.7 autorizzazione dimostrativa"), {
        resumable: false,
        contentType: "application/pdf",
        metadata: {
          metadata: {
            repairId: repairRef.id,
            uploaderUid: managerUid,
            method: "Modulo firmato",
            originalPaperRetained: "true",
            physicalLocationCode: "ARCH-DEMO-01",
            custodianLabel: "Responsabile Archivio Demo",
            depositedOn: "2026-07-26",
          },
        },
      });

    const telephoneResponse = await invokeFunction(
      "authorizeRepairWork",
      {
        repairId: repairRef.id,
        authorizedWork: ["Sostituzione cambio posteriore"],
        method: "Telefono",
        evidenceNote: "Telefonata dimostrativa.",
        evidenceStoragePath,
        communicatedAmount: 25,
        amountAccepted: true,
        nextStatus: "In lavorazione",
        reason: "Tentativo con modalità non valida operativamente.",
        idempotencyKey: `authorize-phone-${crypto.randomUUID()}`,
      },
    );
    expect(telephoneResponse.status).toBe(400);

    const unauthorizedWorkResponse = await invokeFunction(
      "authorizeRepairWork",
      {
        repairId: repairRef.id,
        authorizedWork: ["Intervento mai proposto"],
        method: "Modulo firmato",
        evidenceNote: "Telefonata dimostrativa.",
        evidenceStoragePath,
        communicatedAmount: 25,
        amountAccepted: true,
        nextStatus: "In lavorazione",
        reason: "Tentativo di autorizzare un lavoro non diagnosticato.",
        idempotencyKey: `authorize-invalid-${crypto.randomUUID()}`,
      },
    );
    expect(unauthorizedWorkResponse.status).toBe(400);

    const authorizationData = {
      repairId: repairRef.id,
      authorizedWork: ["Sostituzione cambio posteriore"],
      method: "Modulo firmato",
      evidenceNote: "Modulo dimostrativo archiviato in Storage.",
      evidenceStoragePath,
      communicatedAmount: 25,
      amountAccepted: true,
      nextStatus: "In lavorazione",
      reason: "Autorizzazione separata registrata dopo la diagnosi.",
      idempotencyKey: `authorize-${crypto.randomUUID()}`,
    };
    const authorizationResponse = await invokeFunction(
      "authorizeRepairWork", authorizationData,
    );
    expect(authorizationResponse.status).toBe(200);
    expect((await repairRef.get()).data()?.assignedTo).toContain(
      "Responsabile Functions Demo",
    );
    expect(
      (await repairRef.get()).data()?.workAuthorization
        .evidenceMethodPolicyVersion,
    )
      .toBe("ACC-004-v1");
    expect(
      (await repairRef.get()).data()?.workAuthorization
        .evidenceStoragePolicyVersion,
    )
      .toBe("ACC-006-v1");
    expect(
      (await repairRef.get()).data()?.workAuthorization.subjectPolicyVersion,
    )
      .toBe("ACC-005-v1");
    expect((await repairRef.get()).data()?.workAuthorization.status)
      .toBe("valid_operational");
    const authorizedRepair = await repairRef.get();
    const evidenceId = authorizedRepair.data()?.workAuthorization.evidenceId;
    expect(evidenceId).toBeTruthy();
    expect(authorizedRepair.data()?.workAuthorization.evidenceStoragePath)
      .toBeUndefined();
    const evidence = await db.doc(`authorizationEvidence/${evidenceId}`).get();
    expect(evidence.data()?.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(evidence.data()?.physicalLocationCode).toBe("ARCH-DEMO-01");
    expect(evidence.data()?.accessPolicyVersion).toBe("ACC-007-v1");
    expect(evidence.data()?.retentionStatus).toBe("active_until_review");
    expect(evidence.data()?.retentionMonths).toBe(24);
    expect(evidence.data()?.retentionPolicyVersion).toBe("ACC-008-v1");
    expect(evidence.data()?.reviewDueAt).toBeInstanceOf(Timestamp);
    expect(evidence.data()?.reviewOutcome).toBeNull();
    expect(evidence.data()?.originalFinalDisposition)
      .toBe("pending_manual_review");
    expect(evidence.data()?.legalValidity).toBe("not_determined");
    const accessResponse = await invokeFunction(
      "accessAuthorizationEvidence",
      { evidenceId, action: "view" },
    );
    expect(accessResponse.status).toBe(200);
    const accessResult = await accessResponse.json() as {
      result: { dataBase64: string; checksumSha256: string };
    };
    expect(Buffer.from(accessResult.result.dataBase64, "base64")
      .subarray(0, 4).toString()).toBe("%PDF");
    expect(accessResult.result.checksumSha256)
      .toBe(evidence.data()?.checksumSha256);
    const deniedAccess = await invokeFunction(
      "accessAuthorizationEvidence",
      { evidenceId, action: "export" },
      volunteerToken,
    );
    expect(deniedAccess.status).toBe(403);
    expect((await repairRef.get()).data()?.workAuthorization.authorizedByLabel)
      .toBe("Socio Autorizzante Demo");
    const repeatedAuthorization = await invokeFunction(
      "authorizeRepairWork", authorizationData,
    );
    expect((await repeatedAuthorization.json()).result)
      .toEqual((await authorizationResponse.json()).result);

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
  }, 45_000);

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
    const repair = (await repairRef.get()).data();
    expect(repair?.parts[0]).toContain("× 2");
    expect(repair?.partUsages[0]).toMatchObject({
      partId: partRef.id,
      partCode: "RIC-DEMO-001",
      quantity: 2,
    });
    const movements = await db.collection("partMovements")
      .where("repairId", "==", repairRef.id).get();
    expect(movements.size).toBe(1);
    expect(movements.docs[0].data().quantity).toBe(-2);
    expect(movements.docs[0].data().relatedCode).toBe(
      "RIP-DEMO-RICAMBIO",
    );
    expect(repair?.partUsages[0].movementId).toBe(movements.docs[0].id);

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

describe("createPart", () => {
  it("genera progressivo, carico iniziale, audit e idempotenza", async () => {
    const data = {
      idempotencyKey: `create-part-${crypto.randomUUID()}`,
      category: "Freni",
      description: "Cavo freno dimostrativo",
      brand: null,
      compatibility: "Freni meccanici standard",
      origin: "Recuperato",
      condition: "Buono",
      location: "Cassettiera test",
      quantity: 3,
      recommendedPrice: 7.5,
      sourceBikeCode: "BICI-DEMO-ORIGINE",
      reason: "Carico da recupero dimostrativo.",
      notes: "Dati esclusivamente fittizi.",
    };
    const response = await invokeFunction("createPart", data);
    expect(response.status).toBe(200);
    const body = await response.json() as {
      result: { id: string; code: string; movementId: string };
    };
    expect(body.result.code).toMatch(/^RIC-\d{4}-\d{4}$/);
    const part = await db.doc(`parts/${body.result.id}`).get();
    const movement = await db.doc(
      `partMovements/${body.result.movementId}`,
    ).get();
    expect(part.data()?.quantityOnHand).toBe(3);
    expect(part.data()?.recommendedPriceCents).toBe(750);
    expect(movement.data()?.quantity).toBe(3);
    expect(movement.data()?.type).toBe("in");
    const repeated = await invokeFunction("createPart", data);
    expect((await repeated.json()).result).toEqual(body.result);
  }, 20_000);

  it("nega la registrazione al volontario", async () => {
    const response = await invokeFunction("createPart", {
      idempotencyKey: `create-part-vol-${crypto.randomUUID()}`,
      category: "Freni",
      description: "Ricambio dimostrativo",
      brand: null,
      compatibility: "Compatibilità dimostrativa",
      origin: "Acquistato",
      condition: "Nuovo",
      location: "Area test",
      quantity: 1,
      recommendedPrice: null,
      sourceBikeCode: null,
      reason: "Carico dimostrativo non autorizzato.",
      notes: "Dati fittizi.",
    }, volunteerToken);
    expect(response.status).toBe(403);
  }, 20_000);
});

describe("recordPartMovement", () => {
  it("registra carico, reso e rettifica mantenendo lo storico", async () => {
    const partRef = db.collection("parts").doc();
    await partRef.set({
      code: "RIC-DEMO-MOVIMENTI",
      description: "Ricambio movimenti demo",
      quantityOnHand: 5,
      version: 1,
    });
    for (const [operation, quantity] of [
      ["in", 2],
      ["return", 1],
      ["adjustment", -3],
    ] as const) {
      const response = await invokeFunction("recordPartMovement", {
        partId: partRef.id,
        operation,
        quantity,
        relatedCode: "RIP-DEMO-MOVIMENTI",
        reason: `Movimento ${operation} interamente dimostrativo.`,
        idempotencyKey: `movement-${crypto.randomUUID()}`,
      });
      expect(response.status).toBe(200);
    }
    expect((await partRef.get()).data()?.quantityOnHand).toBe(5);
    const movements = await db.collection("partMovements")
      .where("partId", "==", partRef.id).get();
    expect(movements.size).toBe(3);
  }, 20_000);

  it("nega una rettifica che produrrebbe giacenza negativa", async () => {
    const partRef = db.collection("parts").doc();
    await partRef.set({
      code: "RIC-DEMO-NEGATIVO",
      quantityOnHand: 1,
      version: 1,
    });
    const response = await invokeFunction("recordPartMovement", {
      partId: partRef.id,
      operation: "adjustment",
      quantity: -2,
      relatedCode: null,
      reason: "Rettifica negativa dimostrativa.",
      idempotencyKey: `negative-${crypto.randomUUID()}`,
    });
    expect(response.status).toBe(400);
    expect((await partRef.get()).data()?.quantityOnHand).toBe(1);
  }, 20_000);
});

describe("createWorkshopTest", () => {
  const validChecks = () => Object.fromEntries([
    "wheels", "tires", "brakes", "steering", "drivetrain", "gears",
    "pedals", "saddle", "lights", "bell", "road",
  ].map((id) => [id, { result: "Conforme", note: null }]));
  const validRoadTest = () => ({
    performed: true,
    routeType: "controlled_area",
    publicRoad: false,
    durationMinutes: 5,
    conditions: "Area controllata dimostrativa con fondo asciutto.",
    operatorAuthorized: true,
    authorizedWorkConfirmed: true,
    helmetUsed: true,
    highVisibilityUsed: true,
  });

  it("consolida un esito positivo e collega la riparazione", async () => {
    const repairRef = db.collection("repairs").doc();
    await repairRef.set({
      code: "RIP-DEMO-COLLAUDO",
      bikeLabel: "Bicicletta collaudo demo",
      status: "Pronta",
      version: 1,
    });
    const data = {
      repairId: repairRef.id,
      checks: validChecks(),
      roadTestDetails: validRoadTest(),
      notes: "Collaudo positivo interamente dimostrativo.",
      idempotencyKey: `test-${crypto.randomUUID()}`,
    };
    const response = await invokeFunction("createWorkshopTest", data);
    expect(response.status).toBe(200);
    const body = await response.json() as {
      result: { id: string; code: string; result: string };
    };
    expect(body.result.code).toMatch(/^COL-\d{4}-\d{4}$/);
    expect(body.result.result).toBe("Positivo");
    expect((await repairRef.get()).data()?.status).toBe("Collaudata");
    expect((await db.doc(`tests/${body.result.id}`).get())
      .data()?.repairId).toBe(repairRef.id);
    const repeated = await invokeFunction("createWorkshopTest", data);
    expect((await repeated.json()).result).toEqual(body.result);
  }, 20_000);

  it("riporta in lavorazione dopo un esito negativo", async () => {
    const repairRef = db.collection("repairs").doc();
    await repairRef.set({
      code: "RIP-DEMO-COLLAUDO-NEG",
      bikeLabel: "Bicicletta negativa demo",
      status: "Pronta",
      version: 1,
    });
    const checks = validChecks();
    checks.brakes = {
      result: "Non conforme",
      note: "Il freno non mantiene la regolazione.",
    };
    checks.road = {
      result: "Non applicabile",
      note: "Prova esclusa per controllo preliminare negativo.",
    };
    const response = await invokeFunction("createWorkshopTest", {
      repairId: repairRef.id,
      checks,
      roadTestDetails: {
        ...validRoadTest(),
        performed: false,
      },
      notes: "Collaudo negativo dimostrativo.",
      idempotencyKey: `test-negative-${crypto.randomUUID()}`,
    });
    expect(response.status).toBe(200);
    expect((await response.json()).result.result).toBe("Negativo");
    expect((await repairRef.get()).data()?.status).toBe("In lavorazione");
  }, 20_000);

  it("nega la prova dinamica su strada pubblica", async () => {
    const repairRef = db.collection("repairs").doc();
    await repairRef.set({
      code: "RIP-DEMO-PROVA-PUBBLICA",
      bikeLabel: "Bicicletta prova pubblica demo",
      status: "Pronta",
      version: 1,
    });
    const response = await invokeFunction("createWorkshopTest", {
      repairId: repairRef.id,
      checks: validChecks(),
      roadTestDetails: {
        ...validRoadTest(),
        routeType: "public_road",
        publicRoad: true,
      },
      notes: "Tentativo prova pubblica interamente dimostrativo.",
      idempotencyKey: `test-public-road-${crypto.randomUUID()}`,
    });
    expect(response.status).toBe(400);
    expect((await repairRef.get()).data()?.status).toBe("Pronta");
  }, 20_000);
});

describe("createDelivery", () => {
  it("consegna una riparazione collaudata e resta idempotente", async () => {
    const repairRef = db.collection("repairs").doc();
    const testRef = db.collection("tests").doc();
    await testRef.set({
      code: "COL-DEMO-CONSEGNA",
      result: "Positivo",
    });
    await repairRef.set({
      code: "RIP-DEMO-CONSEGNA",
      bikeLabel: "Bicicletta consegna demo",
      status: "Collaudata",
      testId: testRef.id,
      version: 1,
    });
    const data = {
      repairId: repairRef.id,
      recipientType: "Socio",
      recipientLabel: "Socio Demo Consegna",
      conditionSnapshot: "Riparata e collaudata.",
      accessories: ["Campanello"],
      contributionAmount: null,
      declarationsAccepted: true,
      notes: "Consegna interamente dimostrativa.",
      idempotencyKey: `delivery-${crypto.randomUUID()}`,
    };
    const response = await invokeFunction("createDelivery", data);
    expect(response.status).toBe(200);
    const body = await response.json() as {
      result: { id: string; code: string; documentCode: string };
    };
    expect(body.result.code).toMatch(/^CON-\d{4}-\d{4}$/);
    expect(body.result.documentCode).toMatch(/^VER-\d{4}-\d{4}$/);
    expect((await repairRef.get()).data()?.status).toBe("Consegnata");
    expect((await db.doc(`deliveries/${body.result.id}`).get())
      .data()?.testId).toBe(testRef.id);
    expect((await db.doc(`deliveries/${body.result.id}`).get())
      .data()?.classificationLabel).toBe("Da classificare");
    const repeated = await invokeFunction("createDelivery", data);
    expect((await repeated.json()).result).toEqual(body.result);
  }, 20_000);

  it("nega la consegna senza collaudo positivo", async () => {
    const repairRef = db.collection("repairs").doc();
    await repairRef.set({
      code: "RIP-DEMO-NO-COLLAUDO",
      bikeLabel: "Bicicletta non collaudata",
      status: "Collaudata",
      version: 1,
    });
    const response = await invokeFunction("createDelivery", {
      repairId: repairRef.id,
      recipientType: "Non socio",
      recipientLabel: "Utente Demo",
      conditionSnapshot: "Condizioni dimostrative.",
      accessories: [],
      contributionAmount: null,
      declarationsAccepted: true,
      notes: "Tentativo dimostrativo.",
      idempotencyKey: `delivery-invalid-${crypto.randomUUID()}`,
    });
    expect(response.status).toBe(400);
  }, 20_000);
});

describe("recordPickupContact", () => {
  it("applica il percorso 30 + 15 senza disposizione automatica", async () => {
    const repairRef = db.collection("repairs").doc();
    await repairRef.set({
      code: "RIP-DEMO-MANCATO-RITIRO",
      bikeLabel: "Bicicletta mancato ritiro demo",
      status: "Collaudata",
      version: 1,
    });
    const firstResponse = await invokeFunction("recordPickupContact", {
      repairId: repairRef.id,
      action: "ready_notice",
      channel: "phone",
      note: "Prima comunicazione dimostrativa di disponibilità.",
      idempotencyKey: `pickup-ready-${crypto.randomUUID()}`,
    });
    expect(firstResponse.status).toBe(200);
    const firstBody = await firstResponse.json() as {
      result: { pickupStatus: string };
    };
    expect(firstBody.result.pickupStatus).toBe("awaiting_pickup");

    const fortySixDaysAgo = Timestamp.fromMillis(
      Date.now() - 46 * 24 * 60 * 60 * 1000,
    );
    await repairRef.update({
      "pickupNotice.firstNotifiedAt": fortySixDaysAgo,
      "pickupNotice.reminderDueAt": Timestamp.fromMillis(
        fortySixDaysAgo.toMillis() + 15 * 24 * 60 * 60 * 1000,
      ),
      "pickupNotice.ordinaryDeadlineAt": Timestamp.fromMillis(
        fortySixDaysAgo.toMillis() + 30 * 24 * 60 * 60 * 1000,
      ),
      "pickupNotice.finalDeadlineAt": Timestamp.fromMillis(
        fortySixDaysAgo.toMillis() + 45 * 24 * 60 * 60 * 1000,
      ),
    });
    const reminderResponse = await invokeFunction("recordPickupContact", {
      repairId: repairRef.id,
      action: "reminder",
      channel: "sms",
      note: "Promemoria dimostrativo dopo quindici giorni.",
      idempotencyKey: `pickup-reminder-${crypto.randomUUID()}`,
    });
    expect(reminderResponse.status).toBe(200);
    const finalResponse = await invokeFunction("recordPickupContact", {
      repairId: repairRef.id,
      action: "final_notice",
      channel: "written",
      note: "Preavviso finale dimostrativo con ulteriori quindici giorni.",
      idempotencyKey: `pickup-final-${crypto.randomUUID()}`,
    });
    expect(finalResponse.status).toBe(200);

    const deniedResponse = await invokeFunction("recordPickupContact", {
      repairId: repairRef.id,
      action: "open_overdue_review",
      channel: "internal",
      note: "Tentativo del responsabile dimostrativo.",
      idempotencyKey: `pickup-review-denied-${crypto.randomUUID()}`,
    });
    expect(deniedResponse.status).toBe(403);

    const reviewResponse = await invokeFunction(
      "recordPickupContact",
      {
        repairId: repairRef.id,
        action: "open_overdue_review",
        channel: "internal",
        note: "Apertura amministrativa della revisione dimostrativa.",
        idempotencyKey: `pickup-review-${crypto.randomUUID()}`,
      },
      adminToken,
    );
    expect(reviewResponse.status).toBe(200);
    const repair = (await repairRef.get()).data();
    expect(repair?.pickupStatus).toBe("custody_overdue");
    expect(repair?.uncollectedReview).toMatchObject({
      status: "open",
      ownershipTransferred: false,
      automaticDisposition: false,
      custodyChargesApplied: false,
    });
    expect((await repairRef.collection("pickupHistory").get()).size).toBe(4);
  }, 30_000);
});

describe("manageRepairSafetyReview", () => {
  it("blocca e ripristina la lavorazione con storico ACC-017", async () => {
    const repairRef = db.collection("repairs").doc();
    await repairRef.set({
      code: "RIP-DEMO-SICUREZZA",
      bikeLabel: "Bicicletta sicurezza demo",
      status: "In lavorazione",
      version: 1,
    });
    const reportResponse = await invokeFunction("manageRepairSafetyReview", {
      repairId: repairRef.id,
      action: "report",
      riskType: "damaged_battery",
      description: "Batteria dimostrativa deformata e non utilizzabile.",
      protectiveMeasures: "Lavorazione sospesa e componente isolato.",
      protectedLocation: "Area sicurezza demo",
      outcome: "",
      documentationReference: "",
      idempotencyKey: `safety-report-${crypto.randomUUID()}`,
    });
    expect(reportResponse.status).toBe(200);
    expect((await repairRef.get()).data()).toMatchObject({
      status: "In verifica sicurezza",
      operationalBlock: {
        type: "safety_review",
        policyVersion: "ACC-017-v1",
      },
      safetyReview: {
        status: "open",
        previousStatus: "In lavorazione",
        automaticWasteClassification: false,
        automaticDisposal: false,
      },
    });

    const deniedResponse = await invokeFunction(
      "manageRepairSafetyReview",
      {
        repairId: repairRef.id,
        action: "resolve",
        riskType: "damaged_battery",
        description: "Tentativo di chiusura non autorizzato.",
        protectiveMeasures: "Nessuna misura applicata.",
        protectedLocation: "Area sicurezza demo",
        outcome: "risk_mitigated",
        documentationReference: "",
        idempotencyKey: `safety-denied-${crypto.randomUUID()}`,
      },
      volunteerToken,
    );
    expect(deniedResponse.status).toBe(403);

    const resolveResponse = await invokeFunction(
      "manageRepairSafetyReview",
      {
        repairId: repairRef.id,
        action: "resolve",
        riskType: "damaged_battery",
        description: "Rischio dimostrativo rimosso in sicurezza.",
        protectiveMeasures: "Componente rimosso dalla zona di lavoro.",
        protectedLocation: "Area sicurezza demo",
        outcome: "authorized_provider",
        documentationReference: "VER-SIC-DEMO-001",
        idempotencyKey: `safety-resolve-${crypto.randomUUID()}`,
      },
      adminToken,
    );
    expect(resolveResponse.status).toBe(200);
    expect((await repairRef.get()).data()).toMatchObject({
      status: "In lavorazione",
      operationalBlock: null,
      safetyReview: {
        status: "resolved",
        outcome: "authorized_provider",
        documentationReference: "VER-SIC-DEMO-001",
      },
    });
    expect((await repairRef.collection("safetyHistory").get()).size).toBe(2);
  }, 30_000);
});

describe("members and user access", () => {
  it("salva il socio separando il profilo privato e resta idempotente",
    async () => {
      const idempotencyKey = `member-${crypto.randomUUID()}`;
      const input = {
        idempotencyKey,
        memberId: "",
        firstName: "Mario",
        lastName: "Demo",
        email: "mario.demo@example.test",
        phone: "0000000000",
        joinedOn: "2026-07-27",
        expiresOn: "2027-07-27",
        status: "Attivo",
        privacyConsent: true,
        reason: "Registrazione socio con dati interamente dimostrativi.",
      };
      const firstResponse = await invokeFunction(
        "saveMember",
        input,
        adminToken,
      );
      expect(firstResponse.status).toBe(200);
      const firstBody = await firstResponse.json() as {
        result: { id: string; membershipNumber: string };
      };
      expect(firstBody.result.membershipNumber)
        .toMatch(/^SOC-2026-\d{4}$/);

      const secondResponse = await invokeFunction(
        "saveMember",
        input,
        adminToken,
      );
      expect(secondResponse.status).toBe(200);
      expect((await secondResponse.json()).result).toEqual(firstBody.result);

      const member = (
        await db.doc(`members/${firstBody.result.id}`).get()
      ).data();
      const privateProfile = (
        await db.doc(`memberPrivateProfiles/${firstBody.result.id}`).get()
      ).data();
      expect(member).toMatchObject({
        membershipNumber: firstBody.result.membershipNumber,
        status: "Attivo",
      });
      expect(member).not.toHaveProperty("email");
      expect(member).not.toHaveProperty("phone");
      expect(privateProfile).toMatchObject({
        firstName: "Mario",
        lastName: "Demo",
        email: "mario.demo@example.test",
        phone: "0000000000",
      });
    }, 30_000);

  it("consente soltanto all'admin di aggiornare ruoli e disabilitazione",
    async () => {
      const target = await auth.createUser({
        email: `utente-${crypto.randomUUID()}@example.test`,
        password,
        displayName: "Utente Accessi Demo",
      });
      await auth.setCustomUserClaims(target.uid, {
        active: true,
        roles: ["volunteer"],
      });
      await db.doc(`users/${target.uid}`).set({
        displayName: "Utente Accessi Demo",
        active: true,
        roles: ["volunteer"],
        demo: true,
        updatedAt: Timestamp.now(),
      });
      const input = {
        targetUid: target.uid,
        active: false,
        roles: ["read_only"],
        reason: "Revoca dimostrativa approvata dall'amministratore.",
      };

      const denied = await invokeFunction("manageUserAccess", input);
      expect(denied.status).toBe(403);
      const response = await invokeFunction(
        "manageUserAccess",
        input,
        adminToken,
      );
      expect(response.status).toBe(200);
      expect((await auth.getUser(target.uid)).disabled).toBe(true);
      expect((await db.doc(`users/${target.uid}`).get()).data())
        .toMatchObject({
          active: false,
          roles: ["read_only"],
          accessVersion: 1,
        });
      const audit = await db.collection("auditLogs")
        .where("entityId", "==", target.uid)
        .where("action", "==", "user.access.revoke")
        .get();
      expect(audit.size).toBe(1);
    }, 30_000);
});

describe("receipt drafts", () => {
  it("crea una bozza progressiva e consente l'annullamento solo all'admin",
    async () => {
      const createResponse = await invokeFunction(
        "createReceiptDraft",
        {
          classification: "EROGAZIONE_LIBERALE",
          subjectType: "Non socio",
          subjectLabel: "Donatore Demo Ricevuta",
          subjectTaxCode: "",
          membershipCode: "",
          amount: 15,
          paymentMethod: "paypal",
          paymentReference: "PAYPAL-DEMO-001",
          repairId: "",
          bikeId: "",
          deliveryId: "",
          memberId: "",
          note: "Erogazione liberale interamente dimostrativa.",
          idempotencyKey: `receipt-${crypto.randomUUID()}`,
        },
        adminToken,
      );
      expect(createResponse.status).toBe(200);
      const body = await createResponse.json() as {
        result: { id: string; code: string; status: string };
      };
      expect(body.result.code).toMatch(/^REC-\d{4}-\d{4}$/);
      expect(body.result.status).toBe("draft_demo");
      const receipt = (await db.doc(`receipts/${body.result.id}`).get()).data();
      expect(receipt).toMatchObject({
        status: "draft_demo",
        classification: "EROGAZIONE_LIBERALE",
        taxConfigurationStatus: "incomplete",
        vatStatement: null,
        stampDutyStatement: null,
      });
      expect(receipt?.checksumSha256).toMatch(/^[a-f0-9]{64}$/);

      const denied = await invokeFunction("voidReceiptDraft", {
        receiptId: body.result.id,
        reason: "Tentativo annullamento del responsabile demo.",
        replacementReceiptId: "",
        idempotencyKey: `receipt-void-denied-${crypto.randomUUID()}`,
      });
      expect(denied.status).toBe(403);
      const voided = await invokeFunction(
        "voidReceiptDraft",
        {
          receiptId: body.result.id,
          reason: "Annullamento amministrativo interamente dimostrativo.",
          replacementReceiptId: "",
          idempotencyKey: `receipt-void-${crypto.randomUUID()}`,
        },
        adminToken,
      );
      expect(voided.status).toBe(200);
      expect((await db.doc(`receipts/${body.result.id}`).get()).data()?.status)
        .toBe("void");
    }, 30_000);
});

describe("exportOperationalReport", () => {
  it("esporta aggregati annuali senza dati personali e nega il volontario",
    async () => {
      const createdAt = Timestamp.fromDate(
        new Date("2026-06-15T10:00:00Z"),
      );
      await db.collection("bikes").add({
        status: "Pronta, verificata",
        createdAt,
        customerLabel: "Dato personale da non esportare",
        demo: true,
      });
      const idempotencyKey = `report-${crypto.randomUUID()}`;
      const response = await invokeFunction("exportOperationalReport", {
        year: 2026,
        format: "json",
        idempotencyKey,
      });
      expect(response.status).toBe(200);
      const body = await response.json() as {
        result: {
          dataBase64: string;
          dataScope: string;
          fileName: string;
        };
      };
      const report = JSON.parse(
        Buffer.from(body.result.dataBase64, "base64").toString("utf8"),
      ) as {
        totals: { bikes: number };
        environmentalMetrics: { included: boolean };
      };
      expect(report.totals.bikes).toBeGreaterThanOrEqual(1);
      expect(report.environmentalMetrics.included).toBe(false);
      expect(body.result.dataScope).toBe("aggregated_no_personal_data");
      expect(body.result.fileName).toBe("report-operativo-2026.json");
      expect(JSON.stringify(report)).not.toContain(
        "Dato personale da non esportare",
      );

      const repeated = await invokeFunction("exportOperationalReport", {
        year: 2026,
        format: "json",
        idempotencyKey,
      });
      expect((await repeated.json()).result).toEqual(body.result);

      const csvResponse = await invokeFunction("exportOperationalReport", {
        year: 2026,
        format: "csv",
        idempotencyKey: `report-csv-${crypto.randomUUID()}`,
      });
      const csvBody = await csvResponse.json() as {
        result: { dataBase64: string };
      };
      const csv = Buffer.from(
        csvBody.result.dataBase64,
        "base64",
      ).toString("utf8");
      expect(csv).toContain('"Pronta, verificata"');

      const denied = await invokeFunction(
        "exportOperationalReport",
        {
          year: 2026,
          format: "json",
          idempotencyKey: `report-denied-${crypto.randomUUID()}`,
        },
        volunteerToken,
      );
      expect(denied.status).toBe(403);

      for (const [format, signature] of [
        ["xlsx", "PK"],
        ["pdf", "%PDF"],
      ] as const) {
        const fileResponse = await invokeFunction(
          "exportOperationalReport",
          {
            year: 2026,
            format,
            idempotencyKey: `report-${format}-${crypto.randomUUID()}`,
          },
        );
        expect(fileResponse.status).toBe(200);
        const fileBody = await fileResponse.json() as {
          result: {
            dataBase64: string;
            fileName: string;
          };
        };
        const bytes = Buffer.from(fileBody.result.dataBase64, "base64");
        expect(bytes.subarray(0, signature.length).toString()).toBe(signature);
        expect(fileBody.result.fileName)
          .toBe(`report-operativo-2026.${format}`);
      }
    }, 30_000);
});

describe("createJsonBackup", () => {
  it("crea, verifica e scarica un backup tipizzato solo come admin",
    async () => {
      const sourceRef = db.collection("bikes").doc(
        `bike-backup-${crypto.randomUUID()}`,
      );
      await sourceRef.set({
        status: "Da valutare",
        createdAt: Timestamp.fromDate(new Date("2026-07-28T12:00:00Z")),
        demo: true,
      });
      const created = await invokeFunction(
        "createJsonBackup",
        { idempotencyKey: `backup-${crypto.randomUUID()}` },
        adminToken,
      );
      expect(created.status).toBe(200);
      const createdBody = await created.json() as {
        result: {
          backupId: string;
          checksumSha256: string;
          recordCount: number;
          status: string;
        };
      };
      expect(createdBody.result.status).toBe("complete");
      expect(createdBody.result.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(createdBody.result.recordCount).toBeGreaterThan(0);

      const verified = await invokeFunction(
        "accessJsonBackup",
        {
          backupId: createdBody.result.backupId,
          action: "verify",
        },
        adminToken,
      );
      expect(verified.status).toBe(200);
      expect((await verified.json()).result.checksumValid).toBe(true);

      const downloaded = await invokeFunction(
        "accessJsonBackup",
        {
          backupId: createdBody.result.backupId,
          action: "download",
        },
        adminToken,
      );
      expect(downloaded.status).toBe(200);
      const downloadedBody = await downloaded.json() as {
        result: { dataBase64: string };
      };
      const backup = JSON.parse(
        Buffer.from(
          downloadedBody.result.dataBase64,
          "base64",
        ).toString("utf8"),
      ) as {
        manifest: {
          schemaVersion: string;
          storageFilesIncluded: boolean;
        };
        records: Array<{
          path: string;
          data: { createdAt?: { $type: string; value: string } };
        }>;
      };
      expect(backup.manifest.schemaVersion).toBe("bike4city-backup-v1");
      expect(backup.manifest.storageFilesIncluded).toBe(false);
      const restoredSource = backup.records.find(
        (record) => record.path === sourceRef.path,
      );
      expect(restoredSource?.data.createdAt).toEqual({
        $type: "timestamp",
        value: "2026-07-28T12:00:00.000Z",
      });

      const restoreProjectId =
        `demo-bike4city-restore-${crypto.randomUUID().slice(0, 8)}`;
      const restoreApp = initializeApp(
        { projectId: restoreProjectId },
        `restore-${crypto.randomUUID()}`,
      );
      try {
        const restoreDb = getFirestore(restoreApp);
        const result = await restoreJsonBackupToEmulator(
          restoreDb,
          restoreProjectId,
          backup,
        );
        expect(result.restoredRecords).toBe(backup.records.length);
        expect(result.verifiedRecords).toBe(backup.records.length);
        expect(result.checksumSha256)
          .toBe(createdBody.result.checksumSha256);
        const restoredDocument = await restoreDb.doc(sourceRef.path).get();
        expect(restoredDocument.exists).toBe(true);
        expect(restoredDocument.data()?.createdAt).toBeInstanceOf(Timestamp);
        await expect(
          restoreJsonBackupToEmulator(restoreDb, restoreProjectId, backup),
        ).rejects.toMatchObject({ code: "already-exists" });
      } finally {
        await deleteApp(restoreApp);
      }

      const denied = await invokeFunction(
        "createJsonBackup",
        { idempotencyKey: `backup-denied-${crypto.randomUUID()}` },
        volunteerToken,
      );
      expect(denied.status).toBe(403);
    }, 60_000);
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
