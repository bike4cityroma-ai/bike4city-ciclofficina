import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createHash } from "node:crypto";

initializeApp();

const permittedRoles = new Set(["admin", "workshop_manager", "operator"]);
const repairStatusTransitions = new Map<string, Set<string>>([
  ["Accettata", new Set(["In attesa autorizzazione"])],
  ["Diagnosticata", new Set(["In attesa autorizzazione"])],
  ["In attesa autorizzazione", new Set(["Annullata"])],
  ["In attesa ricambi", new Set(["In lavorazione"])],
  ["In lavorazione", new Set(["In attesa ricambi", "Pronta"])],
  ["Pronta", new Set(["In lavorazione"])],
]);
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

function requireAuthorizedUser(auth: {
  uid: string;
  token: Record<string, unknown>;
} | undefined) {
  if (!auth) {
    throw new HttpsError("unauthenticated", "Accesso richiesto.");
  }

  const roles = Array.isArray(auth.token.roles) ? auth.token.roles : [];
  if (
    auth.token.active !== true ||
    !roles.some((role) => typeof role === "string" && permittedRoles.has(role))
  ) {
    throw new HttpsError(
      "permission-denied",
      "Ruolo non autorizzato alla registrazione.",
    );
  }
  return auth.uid;
}

function hasPermittedProfile(data: Record<string, unknown> | undefined) {
  const roles = Array.isArray(data?.roles) ? data.roles : [];
  return (
    data?.active === true &&
    roles.some(
      (role) => typeof role === "string" && permittedRoles.has(role),
    )
  );
}

function hasDeliveryProfile(data: Record<string, unknown> | undefined) {
  const roles = Array.isArray(data?.roles) ? data.roles : [];
  return data?.active === true && roles.some(
    (role) => role === "admin" || role === "workshop_manager",
  );
}

const operationalDocumentTypes = new Set([
  "acceptance", "workshop_test", "delivery_report",
]);

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

function requireDocumentInput(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new HttpsError("invalid-argument", "Dati documento mancanti.");
  }
  const data = value as Record<string, unknown>;
  const type = typeof data.type === "string" ? data.type.trim() : "";
  const entityId = typeof data.entityId === "string"
    ? data.entityId.trim()
    : "";
  const idempotencyKey = typeof data.idempotencyKey === "string"
    ? data.idempotencyKey.trim()
    : "";
  if (!operationalDocumentTypes.has(type) || !entityId ||
      entityId.length > 160 || !idempotencyKey ||
      idempotencyKey.length > 80) {
    throw new HttpsError("invalid-argument", "Richiesta documento non valida.");
  }
  return { type, entityId, idempotencyKey };
}

function requireDocumentAccessInput(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new HttpsError("invalid-argument", "Richiesta documento mancante.");
  }
  const data = value as Record<string, unknown>;
  const documentId = typeof data.documentId === "string"
    ? data.documentId.trim()
    : "";
  const action = typeof data.action === "string" ? data.action.trim() : "";
  if (!documentId || documentId.length > 160 ||
      !["view", "copy_download", "reprint"].includes(action)) {
    throw new HttpsError("invalid-argument", "Accesso documento non valido.");
  }
  return { documentId, action };
}

function requireAcceptanceCopyInput(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new HttpsError("invalid-argument", "Consegna copia mancante.");
  }
  const data = value as Record<string, unknown>;
  const text = (name: string, max: number) => {
    const field = data[name];
    if (typeof field !== "string" || !field.trim() || field.length > max) {
      throw new HttpsError("invalid-argument", `Il campo ${name} non è valido.`);
    }
    return field.trim();
  };
  const outcome = text("outcome", 20);
  const method = text("method", 30);
  if (!["delivered", "refused"].includes(outcome) ||
      (outcome === "delivered" &&
        !["paper", "device_download"].includes(method)) ||
      (outcome === "refused" && method !== "refused")) {
    throw new HttpsError("invalid-argument", "Esito copia non valido.");
  }
  return {
    documentId: text("documentId", 160),
    outcome,
    method,
    recipientLabel: text("recipientLabel", 160),
    reason: text("reason", 500),
    idempotencyKey: text("idempotencyKey", 80),
  };
}

function requireAcceptanceCorrectionInput(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new HttpsError("invalid-argument", "Correzione documento mancante.");
  }
  const data = value as Record<string, unknown>;
  const text = (name: string, max: number) => {
    const field = data[name];
    if (typeof field !== "string" || !field.trim() || field.length > max) {
      throw new HttpsError("invalid-argument", `Il campo ${name} non è valido.`);
    }
    return field.trim();
  };
  const action = text("action", 20);
  if (action !== "propose" && action !== "confirm") {
    throw new HttpsError("invalid-argument", "Azione correzione non valida.");
  }
  const correctedFields = Array.isArray(data.correctedFields)
    ? data.correctedFields.filter(
        (item): item is string => typeof item === "string",
      ).map((item) => item.trim()).filter(Boolean)
    : [];
  if (correctedFields.length === 0 || correctedFields.length > 20 ||
      correctedFields.some((item) => item.length > 80)) {
    throw new HttpsError("invalid-argument", "Campi corretti non validi.");
  }
  const subjectChanged = data.subjectChanged === true;
  const correctedSubjectLabel = typeof data.correctedSubjectLabel === "string"
    ? data.correctedSubjectLabel.trim()
    : "";
  if (subjectChanged && !correctedSubjectLabel) {
    throw new HttpsError(
      "invalid-argument",
      "Il nuovo soggetto registrato è obbligatorio.",
    );
  }
  const reason = text("reason", 500);
  if (reason.length < 10) {
    throw new HttpsError(
      "invalid-argument",
      "La motivazione deve contenere almeno 10 caratteri.",
    );
  }
  return {
    documentId: text("documentId", 160),
    action,
    correctedFields,
    correctionSummary: text("correctionSummary", 1000),
    subjectChanged,
    correctedSubjectLabel: subjectChanged ? correctedSubjectLabel : null,
    reason,
    idempotencyKey: text("idempotencyKey", 80),
  };
}

function requireAcceptanceConsolidationInput(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new HttpsError("invalid-argument", "Consolidamento mancante.");
  }
  const data = value as Record<string, unknown>;
  const text = (name: string, max: number) => {
    const field = data[name];
    if (typeof field !== "string" || !field.trim() || field.length > max) {
      throw new HttpsError("invalid-argument", `Il campo ${name} non è valido.`);
    }
    return field.trim();
  };
  const signatureMethod = text("signatureMethod", 40);
  if (!authorizationMethods.has(signatureMethod)) {
    throw new HttpsError(
      "invalid-argument",
      "Modalità di firma non ammessa.",
    );
  }
  return {
    documentId: text("documentId", 160),
    signatureMethod,
    signatureStoragePath: text("signatureStoragePath", 500),
    reason: text("reason", 500),
    idempotencyKey: text("idempotencyKey", 80),
  };
}

async function requireAcceptanceConsolidationPolicies(
  db: ReturnType<typeof getFirestore>,
) {
  const [privacy, conditions] = await Promise.all([
    db.doc("settings/acceptance-privacy-policy").get(),
    db.doc("settings/acceptance-service-conditions").get(),
  ]);
  const privacyVersion = String(privacy.data()?.version ?? "");
  const conditionsVersion = String(conditions.data()?.version ?? "");
  if (privacy.data()?.status !== "active" || !privacyVersion ||
      conditions.data()?.status !== "active" || !conditionsVersion) {
    throw new HttpsError(
      "failed-precondition",
      "ACC-001 e ACC-002 devono essere approvate prima del consolidamento.",
    );
  }
  return {
    privacyVersion,
    conditionsVersion,
    demoOnly: privacy.data()?.demo === true &&
      conditions.data()?.demo === true,
  };
}

async function createMarkedDocumentCopy(
  bytes: Buffer,
  documentId: string,
  actorUid: string,
  createdAt: Timestamp,
) {
  const pdf = await PDFDocument.load(bytes);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const label =
    `COPIA | documento ${documentId} | ${createdAt.toDate().toISOString()} | utente ${actorUid}`;
  for (const page of pdf.getPages()) {
    page.drawText(label.replace(/[^\x20-\x7E]/g, " ").slice(0, 180), {
      x: 24, y: 32, size: 8, font, color: rgb(0.45, 0.08, 0.08),
      maxWidth: page.getWidth() - 48,
    });
  }
  return Buffer.from(await pdf.save());
}

function documentSource(type: string) {
  if (type === "acceptance") {
    return { collection: "repairs", codePrefix: "ACC", title: "Scheda di accettazione" };
  }
  if (type === "workshop_test") {
    return { collection: "tests", codePrefix: "SCO", title: "Scheda di collaudo" };
  }
  return { collection: "deliveries", codePrefix: "VER", title: "Verbale di consegna" };
}

async function createDraftPdf(
  title: string,
  code: string,
  source: Record<string, unknown>,
) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const draw = (text: string, x: number, y: number, size = 10, useBold = false) =>
    page.drawText(text.replace(/[^\x20-\x7EÀ-ÿ]/g, " "), {
      x, y, size, font: useBold ? bold : regular, color: rgb(0.09, 0.2, 0.17),
      maxWidth: 495,
    });
  draw("APS Bike4City ETS - InControPedale", 50, 790, 12, true);
  draw("BOZZA DIMOSTRATIVA - TESTI NON APPROVATI", 50, 760, 13, true);
  draw(title, 50, 720, 20, true);
  draw(`Documento: ${code}   Modello: demo-v1`, 50, 695);
  draw(`Entità collegata: ${String(source.code ?? source.repairCode ?? "")}`, 50, 675);
  const fields = [
    ["Utente / ricevente", source.customerLabel ?? source.recipientLabel],
    ["Organizzazione", source.organizationName],
    ["Bicicletta", source.bikeLabel],
    ["Problema dichiarato", source.declaredIssue],
    ["Condizioni visibili", source.visibleCondition],
    ["Accessori consegnati", Array.isArray(source.deliveredAccessories)
      ? source.deliveredAccessories.join(", ") : null],
    ["Autorizzazione lavori", source.acceptanceSnapshot
      ? "Richiesta iniziale non autorizzante; conferma separata dopo diagnosi (ACC-003-v1)."
      : null],
    ["Evidenza autorizzazione", source.workAuthorization &&
      typeof source.workAuthorization === "object"
      ? `${String((source.workAuthorization as Record<string, unknown>).method ?? "")} - stato operativo valido (ACC-004-v1)`
      : null],
    ["Soggetto autorizzante", source.authorizationSubject &&
      typeof source.authorizationSubject === "object"
      ? `${String((source.authorizationSubject as Record<string, unknown>).label ?? "")} (${String((source.authorizationSubject as Record<string, unknown>).type ?? "")})`
      : null],
    ["Condizioni", source.conditionSnapshot],
    ["Esito collaudo", source.result],
    ["Documento collegato", source.documentCode],
    ["Note", source.notes],
    ["Correzioni documento", source.correctionSummary],
  ].filter(([, value]) => typeof value === "string" && value.trim());
  let y = 635;
  for (const [label, value] of fields) {
    draw(String(label), 50, y, 10, true);
    draw(String(value).slice(0, 500), 190, y);
    y -= 34;
  }
  draw("Le dichiarazioni, le condizioni del servizio e i testi privacy devono essere approvati.", 50, 250, 9);
  draw("Firma dell'interessato", 50, 155, 10, true);
  page.drawLine({ start: { x: 50, y: 115 }, end: { x: 260, y: 115 } });
  draw("Firma dell'operatore autorizzato", 330, 155, 10, true);
  page.drawLine({ start: { x: 330, y: 115 }, end: { x: 545, y: 115 } });
  draw("Spazi firma grafici: non costituiscono firma elettronica.", 50, 70, 8);
  return pdf.save();
}

async function createAuditedEvidenceExport(
  bytes: Buffer,
  contentType: string,
  evidenceId: string,
  actorUid: string,
  exportedAt: Timestamp,
) {
  let pdf: PDFDocument;
  if (contentType === "application/pdf") {
    pdf = await PDFDocument.load(bytes);
  } else {
    pdf = await PDFDocument.create();
    const image = contentType === "image/png"
      ? await pdf.embedPng(bytes)
      : await pdf.embedJpg(bytes);
    const page = pdf.addPage([595.28, 841.89]);
    const scaled = image.scaleToFit(515, 741);
    page.drawImage(image, {
      x: 40 + (515 - scaled.width) / 2,
      y: 70 + (741 - scaled.height) / 2,
      width: scaled.width,
      height: scaled.height,
    });
  }
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const label =
    `Evidenza ${evidenceId} | export ${exportedAt.toDate().toISOString()} | utente ${actorUid}`;
  for (const page of pdf.getPages()) {
    page.drawRectangle({
      x: 20, y: 12, width: page.getWidth() - 40, height: 18,
      color: rgb(1, 1, 1), opacity: 0.9,
    });
    page.drawText(label.replace(/[^\x20-\x7E]/g, " ").slice(0, 180), {
      x: 24, y: 18, size: 7, font, color: rgb(0.2, 0.2, 0.2),
      maxWidth: page.getWidth() - 48,
    });
  }
  return Buffer.from(await pdf.save());
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

function requireEvidenceAccessInput(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new HttpsError("invalid-argument", "Richiesta evidenza mancante.");
  }
  const data = value as Record<string, unknown>;
  const evidenceId = typeof data.evidenceId === "string"
    ? data.evidenceId.trim()
    : "";
  const action = data.action === "export" ? "export" : "view";
  if (!evidenceId || evidenceId.length > 160) {
    throw new HttpsError("invalid-argument", "ID evidenza non valido.");
  }
  return { evidenceId, action };
}

function requireEvidenceReplacementInput(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new HttpsError("invalid-argument", "Sostituzione prova mancante.");
  }
  const data = value as Record<string, unknown>;
  const text = (name: string, max: number) => {
    const field = data[name];
    if (typeof field !== "string" || !field.trim() || field.length > max) {
      throw new HttpsError("invalid-argument", `Il campo ${name} non è valido.`);
    }
    return field.trim();
  };
  const reason = text("reason", 500);
  if (reason.length < 10) {
    throw new HttpsError(
      "invalid-argument",
      "La motivazione deve contenere almeno 10 caratteri.",
    );
  }
  return {
    evidenceId: text("evidenceId", 160),
    storagePath: text("storagePath", 500),
    reason,
    incidentId: typeof data.incidentId === "string"
      ? data.incidentId.trim().slice(0, 160)
      : "",
    idempotencyKey: text("idempotencyKey", 80),
  };
}

const evidenceIncidentTypes = new Set([
  "missing_file", "checksum_mismatch", "metadata_mismatch", "unreadable_file",
]);

function requireEvidenceIncidentInput(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new HttpsError("invalid-argument", "Dati incidente mancanti.");
  }
  const data = value as Record<string, unknown>;
  const text = (name: string, max: number) => {
    const field = data[name];
    if (typeof field !== "string" || !field.trim() || field.length > max) {
      throw new HttpsError("invalid-argument", `Il campo ${name} non è valido.`);
    }
    return field.trim();
  };
  const action = text("action", 20);
  if (!["report", "open", "resolve"].includes(action)) {
    throw new HttpsError("invalid-argument", "Azione incidente non valida.");
  }
  const incidentType = text("incidentType", 40);
  if (!evidenceIncidentTypes.has(incidentType)) {
    throw new HttpsError("invalid-argument", "Tipo incidente non valido.");
  }
  const resolution = typeof data.resolution === "string"
    ? data.resolution.trim()
    : "";
  if (action === "resolve" &&
      !["recovered", "replaced", "unrecoverable"].includes(resolution)) {
    throw new HttpsError("invalid-argument", "Esito incidente non valido.");
  }
  const reason = text("reason", 500);
  if (reason.length < 10) {
    throw new HttpsError(
      "invalid-argument",
      "La motivazione deve contenere almeno 10 caratteri.",
    );
  }
  return {
    evidenceId: text("evidenceId", 160),
    incidentId: typeof data.incidentId === "string"
      ? data.incidentId.trim().slice(0, 160)
      : "",
    action,
    incidentType,
    resolution: action === "resolve" ? resolution : null,
    reason,
    idempotencyKey: text("idempotencyKey", 80),
  };
}

async function registerDetectedEvidenceAnomaly(
  db: ReturnType<typeof getFirestore>,
  evidenceId: string,
  incidentType: string,
  actorUid: string,
) {
  const now = Timestamp.now();
  const evidenceRef = db.doc(`authorizationEvidence/${evidenceId}`);
  await db.runTransaction(async (transaction) => {
    const evidence = await transaction.get(evidenceRef);
    if (!evidence.exists) return;
    transaction.update(evidenceRef, {
      documentAnomaly: {
        status: "detected",
        incidentType,
        detectedAt: now,
        detectedBy: actorUid,
        policyVersion: "ACC-012-v1",
      },
      updatedAt: now,
      updatedBy: actorUid,
      version: Number(evidence.data()?.version ?? 1) + 1,
    });
    transaction.create(db.collection("auditLogs").doc(), {
      action: "authorization.evidence.anomaly.detect",
      entityType: "authorizationEvidence",
      entityId: evidenceId,
      incidentType,
      actorUid,
      policyVersion: "ACC-012-v1",
      createdAt: now,
    });
  });
}

const evidenceReviewOutcomes = new Set([
  "extend", "return_paper", "destroy_paper", "no_paper",
]);

function requireEvidenceReviewInput(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new HttpsError("invalid-argument", "Revisione evidenza mancante.");
  }
  const data = value as Record<string, unknown>;
  const text = (name: string, max: number) => {
    const field = data[name];
    if (typeof field !== "string" || !field.trim() || field.length > max) {
      throw new HttpsError("invalid-argument", `Il campo ${name} non è valido.`);
    }
    return field.trim();
  };
  const action = text("action", 20);
  if (action !== "propose" && action !== "confirm") {
    throw new HttpsError("invalid-argument", "Azione di revisione non valida.");
  }
  const outcome = text("outcome", 30);
  if (!evidenceReviewOutcomes.has(outcome)) {
    throw new HttpsError("invalid-argument", "Esito di revisione non valido.");
  }
  const reason = text("reason", 500);
  if (reason.length < 10) {
    throw new HttpsError(
      "invalid-argument",
      "La motivazione deve contenere almeno 10 caratteri.",
    );
  }
  const newReviewDate = typeof data.newReviewDate === "string"
    ? data.newReviewDate.trim()
    : "";
  if (outcome === "extend" && !/^\d{4}-\d{2}-\d{2}$/.test(newReviewDate)) {
    throw new HttpsError(
      "invalid-argument",
      "La proroga richiede una nuova data di revisione.",
    );
  }
  const actionDate = typeof data.actionDate === "string"
    ? data.actionDate.trim()
    : "";
  const subjectLabel = typeof data.subjectLabel === "string"
    ? data.subjectLabel.trim()
    : "";
  const proofStoragePath = typeof data.proofStoragePath === "string"
    ? data.proofStoragePath.trim()
    : "";
  const requiresProof = outcome === "return_paper" ||
    outcome === "destroy_paper";
  if (requiresProof &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(actionDate) ||
        !subjectLabel || subjectLabel.length > 160 || !proofStoragePath)) {
    throw new HttpsError(
      "invalid-argument",
      "Data, soggetto e documento di prova sono obbligatori.",
    );
  }
  return {
    evidenceId: text("evidenceId", 160),
    action,
    outcome,
    reason,
    details: typeof data.details === "string"
      ? data.details.trim().slice(0, 500)
      : "",
    newReviewDate: outcome === "extend" ? newReviewDate : null,
    actionDate: requiresProof ? actionDate : null,
    subjectLabel: requiresProof ? subjectLabel : null,
    proofStoragePath: requiresProof ? proofStoragePath : null,
    idempotencyKey: text("idempotencyKey", 80),
  };
}

function effectiveEvidenceRetentionStatus(
  evidence: FirebaseFirestore.DocumentData,
  now: Timestamp,
) {
  const dueAt = evidence.reviewDueAt;
  if (evidence.retentionStatus === "active_until_review" &&
      dueAt instanceof Timestamp && dueAt.toMillis() <= now.toMillis()) {
    return "review_overdue";
  }
  return String(evidence.retentionStatus ?? "unknown");
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

export { createBike, updateBikeStatus } from "./modules/bikes.js";
export const createRepair = onCall(
  { region: "europe-west1", enforceAppCheck: false },
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
  { region: "europe-west1", enforceAppCheck: false },
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
  { region: "europe-west1", enforceAppCheck: false },
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

export const accessAuthorizationEvidence = onCall(
  { region: "europe-west1", enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Accesso richiesto.");
    }
    const input = requireEvidenceAccessInput(request.data);
    const db = getFirestore();
    const profile = await db.doc(`users/${request.auth.uid}`).get();
    const roles = Array.isArray(profile.data()?.roles)
      ? profile.data()?.roles as unknown[]
      : [];
    if (profile.data()?.active !== true ||
        !roles.some((role) =>
          role === "admin" || role === "workshop_manager")) {
      throw new HttpsError(
        "permission-denied",
        "Ruolo non autorizzato all’accesso alle evidenze.",
      );
    }
    const evidenceRef = db.doc(`authorizationEvidence/${input.evidenceId}`);
    const evidence = await evidenceRef.get();
    if (!evidence.exists || typeof evidence.data()?.storagePath !== "string") {
      throw new HttpsError("not-found", "Evidenza non trovata.");
    }
    let bytes: Buffer;
    try {
      [bytes] = await privateDocumentBucket()
        .file(String(evidence.data()?.storagePath))
        .download();
    } catch {
      await registerDetectedEvidenceAnomaly(
        db, input.evidenceId, "missing_file", request.auth.uid,
      );
      throw new HttpsError("data-loss", "File mancante: accesso bloccato.");
    }
    const actualChecksum = createHash("sha256").update(bytes).digest("hex");
    if (actualChecksum !== String(evidence.data()?.checksumSha256)) {
      await registerDetectedEvidenceAnomaly(
        db, input.evidenceId, "checksum_mismatch", request.auth.uid,
      );
      throw new HttpsError(
        "data-loss",
        "Integrità del file non verificata: accesso bloccato.",
      );
    }
    await db.collection("auditLogs").add({
      action: `authorization.evidence.${input.action}`,
      entityType: "authorizationEvidence",
      entityId: input.evidenceId,
      actorUid: request.auth.uid,
      repairId: evidence.data()?.repairId ?? null,
      createdAt: Timestamp.now(),
    });
    return {
      evidenceId: input.evidenceId,
      contentType: String(evidence.data()?.contentType),
      fileName: `evidenza-${input.evidenceId}`,
      dataBase64: bytes.toString("base64"),
      checksumSha256: String(evidence.data()?.checksumSha256),
      retentionStatus: effectiveEvidenceRetentionStatus(
        evidence.data() ?? {},
        Timestamp.now(),
      ),
    };
  },
);

export const accessAuthorizationReviewEvidence = onCall(
  { region: "europe-west1", enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Accesso richiesto.");
    }
    const input = requireEvidenceAccessInput(request.data);
    const db = getFirestore();
    const profile = await db.doc(`users/${request.auth.uid}`).get();
    const roles = Array.isArray(profile.data()?.roles)
      ? profile.data()?.roles as unknown[]
      : [];
    if (profile.data()?.active !== true ||
        !roles.some((role) =>
          role === "admin" || role === "workshop_manager")) {
      throw new HttpsError(
        "permission-denied",
        "Ruolo non autorizzato all’accesso alla prova di revisione.",
      );
    }
    const evidence = await db.doc(
      `authorizationEvidence/${input.evidenceId}`,
    ).get();
    const proof = evidence.data()?.reviewProof;
    if (!evidence.exists || !proof ||
        typeof proof.storagePath !== "string") {
      throw new HttpsError("not-found", "Prova di revisione non trovata.");
    }
    let sourceBytes: Buffer;
    try {
      [sourceBytes] = await privateDocumentBucket()
        .file(String(proof.storagePath)).download();
    } catch {
      await registerDetectedEvidenceAnomaly(
        db, input.evidenceId, "missing_file", request.auth.uid,
      );
      throw new HttpsError("data-loss", "Prova mancante: accesso bloccato.");
    }
    const actualChecksum =
      createHash("sha256").update(sourceBytes).digest("hex");
    if (actualChecksum !== String(proof.checksumSha256)) {
      await registerDetectedEvidenceAnomaly(
        db, input.evidenceId, "checksum_mismatch", request.auth.uid,
      );
      throw new HttpsError(
        "data-loss",
        "Integrità della prova non verificata: accesso bloccato.",
      );
    }
    const now = Timestamp.now();
    const bytes = input.action === "export"
      ? await createAuditedEvidenceExport(
          sourceBytes,
          String(proof.contentType),
          input.evidenceId,
          request.auth.uid,
          now,
        )
      : sourceBytes;
    await db.collection("auditLogs").add({
      action: `authorization.review-proof.${input.action}`,
      entityType: "authorizationEvidence",
      entityId: input.evidenceId,
      proofId: proof.proofId ?? null,
      actorUid: request.auth.uid,
      createdAt: now,
      policyVersion: "ACC-011-v1",
    });
    return {
      evidenceId: input.evidenceId,
      contentType: input.action === "export"
        ? "application/pdf"
        : String(proof.contentType),
      fileName: input.action === "export"
        ? `prova-revisione-${input.evidenceId}.pdf`
        : `prova-revisione-${input.evidenceId}`,
      dataBase64: bytes.toString("base64"),
      checksumSha256:
        createHash("sha256").update(bytes).digest("hex"),
      sourceChecksumSha256: String(proof.checksumSha256),
    };
  },
);

export const replaceAuthorizationReviewEvidence = onCall(
  { region: "europe-west1", enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Accesso richiesto.");
    }
    const input = requireEvidenceReplacementInput(request.data);
    const db = getFirestore();
    const uid = request.auth.uid;
    const profile = await db.doc(`users/${uid}`).get();
    if (profile.data()?.active !== true ||
        !Array.isArray(profile.data()?.roles) ||
        !profile.data()?.roles.includes("admin")) {
      throw new HttpsError(
        "permission-denied",
        "Solo l’amministratore può sostituire la prova.",
      );
    }
    const expectedPrefix =
      `authorizationReviewEvidence/${input.evidenceId}/${uid}/`;
    if (!input.storagePath.startsWith(expectedPrefix)) {
      throw new HttpsError("invalid-argument", "Percorso sostitutivo non valido.");
    }
    const file = privateDocumentBucket().file(input.storagePath);
    const [exists] = await file.exists();
    if (!exists) {
      throw new HttpsError("failed-precondition", "Nuova prova non archiviata.");
    }
    const [metadata] = await file.getMetadata();
    const [bytes] = await file.download();
    const contentType = String(metadata.contentType ?? "");
    const evidenceRef = db.doc(`authorizationEvidence/${input.evidenceId}`);
    const requestRef = db.doc(
      `idempotencyKeys/evidence-proof-replace_${uid}_${input.idempotencyKey}`,
    );
    return db.runTransaction(async (transaction) => {
      const [evidence, existing] = await Promise.all([
        transaction.get(evidenceRef),
        transaction.get(requestRef),
      ]);
      if (existing.exists) {
        return {
          evidenceId: String(existing.data()?.evidenceId),
          version: Number(existing.data()?.version),
        };
      }
      const oldProof = evidence.data()?.reviewProof;
      if (!evidence.exists || !oldProof) {
        throw new HttpsError("not-found", "Prova precedente non trovata.");
      }
      const anomaly = evidence.data()?.documentAnomaly;
      if (anomaly?.status === "open") {
        if (!input.incidentId ||
            input.incidentId !== String(anomaly.incidentId ?? "")) {
          throw new HttpsError(
            "failed-precondition",
            "La sostituzione deve essere collegata all’incidente aperto.",
          );
        }
      }
      if (!["application/pdf", "image/jpeg", "image/png"].includes(
        contentType,
      ) || metadata.metadata?.evidenceId !== input.evidenceId ||
          metadata.metadata?.uploaderUid !== uid ||
          metadata.metadata?.outcome !== evidence.data()?.reviewOutcome) {
        throw new HttpsError("failed-precondition", "Nuova prova non coerente.");
      }
      const now = Timestamp.now();
      const version = Number(oldProof.version ?? 1) + 1;
      const newProof = {
        storagePath: input.storagePath,
        contentType,
        size: Number(metadata.size ?? bytes.length),
        checksumSha256:
          createHash("sha256").update(bytes).digest("hex"),
        proofId: input.storagePath.split("/").at(-1),
        version,
        replacesProofId: oldProof.proofId ?? null,
        incidentId: input.incidentId || null,
        retentionMonths: 24,
        reviewDueAt: addUtcMonths(now, 24),
        retentionStatus: "active_until_review",
        policyVersion: "ACC-011-v1",
      };
      transaction.create(
        evidenceRef.collection("proofVersionHistory").doc(),
        { ...oldProof, replacedAt: now, replacedBy: uid, reason: input.reason },
      );
      transaction.update(evidenceRef, {
        reviewProof: newProof,
        updatedAt: now,
        updatedBy: uid,
        version: Number(evidence.data()?.version ?? 1) + 1,
      });
      transaction.create(db.collection("auditLogs").doc(), {
        action: "authorization.review-proof.replace",
        entityType: "authorizationEvidence",
        entityId: input.evidenceId,
        actorUid: uid,
        reason: input.reason,
        version,
        policyVersion: "ACC-011-v1",
        createdAt: now,
      });
      transaction.create(requestRef, {
        evidenceId: input.evidenceId, version, createdAt: now, createdBy: uid,
      });
      return { evidenceId: input.evidenceId, version };
    });
  },
);

export const manageAuthorizationEvidenceIncident = onCall(
  { region: "europe-west1", enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Accesso richiesto.");
    }
    const input = requireEvidenceIncidentInput(request.data);
    const db = getFirestore();
    const uid = request.auth.uid;
    const userRef = db.doc(`users/${uid}`);
    const evidenceRef = db.doc(`authorizationEvidence/${input.evidenceId}`);
    const incidentRef = input.incidentId
      ? evidenceRef.collection("documentIncidents").doc(input.incidentId)
      : evidenceRef.collection("documentIncidents").doc();
    const requestRef = db.doc(
      `idempotencyKeys/evidence-incident_${uid}_${input.idempotencyKey}`,
    );
    return db.runTransaction(async (transaction) => {
      const [user, evidence, existing, incident] = await Promise.all([
        transaction.get(userRef),
        transaction.get(evidenceRef),
        transaction.get(requestRef),
        transaction.get(incidentRef),
      ]);
      const roles = Array.isArray(user.data()?.roles)
        ? user.data()?.roles as unknown[]
        : [];
      const isAdmin = roles.includes("admin");
      const isManager = roles.includes("workshop_manager");
      if (user.data()?.active !== true ||
          (input.action === "report" && !isAdmin && !isManager) ||
          (input.action !== "report" && !isAdmin)) {
        throw new HttpsError(
          "permission-denied",
          "Ruolo non autorizzato alla gestione dell’incidente.",
        );
      }
      if (!evidence.exists) {
        throw new HttpsError("not-found", "Evidenza non trovata.");
      }
      if (existing.exists) {
        return {
          evidenceId: String(existing.data()?.evidenceId),
          incidentId: String(existing.data()?.incidentId),
          status: String(existing.data()?.status),
        };
      }
      const now = Timestamp.now();
      const status = input.action === "report"
        ? "reported"
        : input.action === "open" ? "open" : "resolved";
      if (input.action === "resolve" &&
          (!incident.exists || incident.data()?.status !== "open")) {
        throw new HttpsError(
          "failed-precondition",
          "È possibile chiudere soltanto un incidente aperto.",
        );
      }
      const incidentData = {
        evidenceId: input.evidenceId,
        incidentType: input.incidentType,
        status,
        reason: input.reason,
        resolution: input.resolution,
        ...(incident.exists ? {} : {
          reportedAt: now,
          reportedBy: uid,
        }),
        ...(input.action === "open"
          ? { openedAt: now, openedBy: uid }
          : {}),
        ...(input.action === "resolve"
          ? { resolvedAt: now, resolvedBy: uid }
          : {}),
        policyVersion: "ACC-012-v1",
        updatedAt: now,
      };
      if (incident.exists) {
        transaction.update(incidentRef, incidentData);
      } else {
        transaction.create(incidentRef, incidentData);
      }
      transaction.update(evidenceRef, {
        documentAnomaly: {
          status,
          incidentId: incidentRef.id,
          incidentType: input.incidentType,
          resolution: input.resolution,
          updatedAt: now,
          updatedBy: uid,
          policyVersion: "ACC-012-v1",
        },
        updatedAt: now,
        updatedBy: uid,
        version: Number(evidence.data()?.version ?? 1) + 1,
      });
      transaction.create(db.collection("auditLogs").doc(), {
        action: `authorization.evidence.incident.${input.action}`,
        entityType: "authorizationEvidence",
        entityId: input.evidenceId,
        incidentId: incidentRef.id,
        incidentType: input.incidentType,
        resolution: input.resolution,
        actorUid: uid,
        reason: input.reason,
        policyVersion: "ACC-012-v1",
        createdAt: now,
      });
      const response = {
        evidenceId: input.evidenceId,
        incidentId: incidentRef.id,
        status,
      };
      transaction.create(requestRef, {
        ...response, createdAt: now, createdBy: uid,
      });
      return response;
    });
  },
);

export const reviewAuthorizationEvidence = onCall(
  { region: "europe-west1", enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Accesso richiesto.");
    }
    const input = requireEvidenceReviewInput(request.data);
    const db = getFirestore();
    const uid = request.auth.uid;
    const userRef = db.doc(`users/${uid}`);
    const evidenceRef = db.doc(`authorizationEvidence/${input.evidenceId}`);
    const requestRef = db.doc(
      `idempotencyKeys/evidence-review_${uid}_${input.idempotencyKey}`,
    );
    const auditRef = db.collection("auditLogs").doc();
    let proofMetadata: {
      contentType: string;
      size: number;
      checksumSha256: string;
      proofId: string;
    } | null = null;
    if (input.action === "propose" && input.proofStoragePath) {
      const expectedPrefix =
        `authorizationReviewEvidence/${input.evidenceId}/${uid}/`;
      if (!input.proofStoragePath.startsWith(expectedPrefix)) {
        throw new HttpsError(
          "invalid-argument",
          "Percorso del documento di prova non valido.",
        );
      }
      const proofFile = privateDocumentBucket().file(input.proofStoragePath);
      const [exists] = await proofFile.exists();
      if (!exists) {
        throw new HttpsError(
          "failed-precondition",
          "Archiviare il documento di prova prima della proposta.",
        );
      }
      const [metadata] = await proofFile.getMetadata();
      const contentType = String(metadata.contentType ?? "");
      const size = Number(metadata.size ?? 0);
      if (!["application/pdf", "image/jpeg", "image/png"].includes(
        contentType,
      ) || size < 1 || size > 10 * 1024 * 1024 ||
          metadata.metadata?.evidenceId !== input.evidenceId ||
          metadata.metadata?.uploaderUid !== uid ||
          metadata.metadata?.outcome !== input.outcome) {
        throw new HttpsError(
          "failed-precondition",
          "Documento di prova non valido o non coerente.",
        );
      }
      const [bytes] = await proofFile.download();
      proofMetadata = {
        contentType,
        size,
        checksumSha256:
          createHash("sha256").update(bytes).digest("hex"),
        proofId: input.proofStoragePath.split("/").at(-1) ?? "",
      };
    }

    return db.runTransaction(async (transaction) => {
      const [user, evidence, existingRequest] = await Promise.all([
        transaction.get(userRef),
        transaction.get(evidenceRef),
        transaction.get(requestRef),
      ]);
      const roles = Array.isArray(user.data()?.roles)
        ? user.data()?.roles as unknown[]
        : [];
      const isAdmin = roles.includes("admin");
      const isManager = roles.includes("workshop_manager");
      if (user.data()?.active !== true ||
          (input.action === "propose" && !isAdmin && !isManager) ||
          (input.action === "confirm" && !isAdmin)) {
        throw new HttpsError(
          "permission-denied",
          input.action === "confirm"
            ? "Solo l’amministratore può confermare la revisione."
            : "Ruolo non autorizzato a proporre la revisione.",
        );
      }
      if (!evidence.exists) {
        throw new HttpsError("not-found", "Evidenza non trovata.");
      }
      if (existingRequest.exists) {
        return {
          evidenceId: String(existingRequest.data()?.evidenceId),
          action: String(existingRequest.data()?.action),
          outcome: String(existingRequest.data()?.outcome),
        };
      }
      const now = Timestamp.now();
      const evidenceData = evidence.data() ?? {};
      if (input.action === "confirm" &&
          ["detected", "reported", "open"].includes(
            String(evidenceData.documentAnomaly?.status ?? ""),
          )) {
        throw new HttpsError(
          "failed-precondition",
          "Conferma bloccata da un’anomalia documentale.",
        );
      }
      if (input.action === "propose" && input.outcome === "return_paper") {
        const repairId = String(evidenceData.repairId ?? "");
        const repair = await transaction.get(db.doc(`repairs/${repairId}`));
        const authorizedByLabel = String(
          repair.data()?.workAuthorization?.authorizedByLabel ?? "",
        );
        if (!authorizedByLabel || input.subjectLabel !== authorizedByLabel) {
          throw new HttpsError(
            "failed-precondition",
            "Il destinatario non coincide con il soggetto autorizzante.",
          );
        }
      }
      const reviewDueAt = evidenceData.reviewDueAt;
      const reviewWindowStartsAt = reviewDueAt instanceof Timestamp
        ? reviewDueAt.toMillis() - 30 * 24 * 60 * 60 * 1000
        : Number.POSITIVE_INFINITY;
      if (input.action === "propose" && now.toMillis() < reviewWindowStartsAt) {
        throw new HttpsError(
          "failed-precondition",
          "La revisione è disponibile da 30 giorni prima della scadenza.",
        );
      }

      if (input.action === "propose") {
        transaction.update(evidenceRef, {
          retentionStatus: "review_proposed",
          pendingReviewProposal: {
            outcome: input.outcome,
            reason: input.reason,
            details: input.details || null,
            newReviewDate: input.newReviewDate,
            actionDate: input.actionDate,
            subjectLabel: input.subjectLabel,
            proofStoragePath: input.proofStoragePath,
            proofContentType: proofMetadata?.contentType ?? null,
            proofSize: proofMetadata?.size ?? null,
            proofChecksumSha256: proofMetadata?.checksumSha256 ?? null,
            proofId: proofMetadata?.proofId ?? null,
            proposedAt: now,
            proposedBy: uid,
            policyVersion: "ACC-009-v1",
          },
          updatedAt: now,
          updatedBy: uid,
          version: Number(evidenceData.version ?? 1) + 1,
        });
      } else {
        const proposal = evidenceData.pendingReviewProposal;
        if (!proposal || typeof proposal !== "object" ||
            proposal.outcome !== input.outcome ||
            proposal.proofStoragePath !== input.proofStoragePath ||
            proposal.actionDate !== input.actionDate ||
            proposal.subjectLabel !== input.subjectLabel) {
          throw new HttpsError(
            "failed-precondition",
            "La conferma non corrisponde alla proposta registrata.",
          );
        }
        if (input.outcome === "destroy_paper" &&
            proposal.proposedBy === uid) {
          throw new HttpsError(
            "failed-precondition",
            "L’incaricato non può confermare la propria distruzione.",
          );
        }
        const newDueAt = input.outcome === "extend" && input.newReviewDate
          ? Timestamp.fromDate(new Date(`${input.newReviewDate}T23:59:59Z`))
          : reviewDueAt;
        transaction.update(evidenceRef, {
          retentionStatus: input.outcome === "extend"
            ? "active_until_review"
            : "review_completed",
          reviewDueAt: newDueAt,
          reviewOutcome: input.outcome,
          reviewReason: input.reason,
          reviewDetails: input.details || null,
          reviewActionDate: input.actionDate,
          reviewSubjectLabel: input.subjectLabel,
          reviewProof: proposal.proofStoragePath ? {
            storagePath: proposal.proofStoragePath,
            contentType: proposal.proofContentType,
            size: proposal.proofSize,
            checksumSha256: proposal.proofChecksumSha256,
            proofId: proposal.proofId,
            version: 1,
            retentionMonths: 24,
            reviewDueAt: addUtcMonths(now, 24),
            retentionStatus: "active_until_review",
            policyVersion: "ACC-010-v1",
          } : null,
          reviewedAt: now,
          reviewedBy: uid,
          originalFinalDisposition: input.outcome === "return_paper"
            ? "returned"
            : input.outcome === "destroy_paper"
              ? "destroyed_confidentially"
              : input.outcome === "no_paper"
                ? "not_applicable"
                : evidenceData.originalFinalDisposition,
          pendingReviewProposal: null,
          reviewPolicyVersion: "ACC-009-v1",
          updatedAt: now,
          updatedBy: uid,
          version: Number(evidenceData.version ?? 1) + 1,
        });
      }
      const response = {
        evidenceId: input.evidenceId,
        action: input.action,
        outcome: input.outcome,
      };
      transaction.create(auditRef, {
        action: `authorization.evidence.review.${input.action}`,
        entityType: "authorizationEvidence",
        entityId: input.evidenceId,
        actorUid: uid,
        outcome: input.outcome,
        reason: input.reason,
        policyVersion: "ACC-009-v1",
        createdAt: now,
      });
      transaction.create(requestRef, {
        ...response,
        createdAt: now,
        createdBy: uid,
      });
      return response;
    });
  },
);

export {
  createPart,
  recordPartMovement,
  useRepairPart,
} from "./modules/parts.js";
export { createWorkshopTest } from "./modules/workshop-tests.js";
export const manageRepairSafetyReview = onCall(
  { region: "europe-west1", enforceAppCheck: false },
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

export { createReceiptDraft, voidReceiptDraft } from "./modules/receipts.js";
export {
  manageUserAccess,
  saveMember,
} from "./modules/members-and-users.js";
export const accessOperationalDocument = onCall(
  { region: "europe-west1", enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Accesso richiesto.");
    }
    const input = requireDocumentAccessInput(request.data);
    const db = getFirestore();
    const uid = request.auth.uid;
    const [profile, document] = await Promise.all([
      db.doc(`users/${uid}`).get(),
      db.doc(`documents/${input.documentId}`).get(),
    ]);
    const roles = Array.isArray(profile.data()?.roles)
      ? profile.data()?.roles as unknown[]
      : [];
    if (profile.data()?.active !== true ||
        !roles.some((role) =>
          role === "admin" || role === "workshop_manager" ||
          role === "operator")) {
      throw new HttpsError(
        "permission-denied",
        "Ruolo non autorizzato all’accesso al documento.",
      );
    }
    if (!document.exists ||
        typeof document.data()?.storagePath !== "string") {
      throw new HttpsError("not-found", "Documento non trovato.");
    }
    const [sourceBytes] = await privateDocumentBucket()
      .file(String(document.data()?.storagePath)).download();
    const now = Timestamp.now();
    const isCopy = input.action !== "view";
    const bytes = isCopy
      ? await createMarkedDocumentCopy(
          sourceBytes, input.documentId, uid, now,
        )
      : sourceBytes;
    await db.collection("auditLogs").add({
      action: `document.${input.action}`,
      entityType: "document",
      entityId: input.documentId,
      entityCode: document.data()?.code ?? null,
      actorUid: uid,
      policyVersion: input.action === "view" ? null : "ACC-013-v1",
      createdAt: now,
    });
    return {
      documentId: input.documentId,
      contentType: "application/pdf",
      fileName: isCopy
        ? `copia-${String(document.data()?.code)}.pdf`
        : `${String(document.data()?.code)}.pdf`,
      dataBase64: bytes.toString("base64"),
      status: String(document.data()?.status),
      legalValidity: String(document.data()?.legalValidity),
    };
  },
);

export const recordAcceptanceCopy = onCall(
  { region: "europe-west1", enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Accesso richiesto.");
    }
    const input = requireAcceptanceCopyInput(request.data);
    const db = getFirestore();
    const uid = request.auth.uid;
    const userRef = db.doc(`users/${uid}`);
    const documentRef = db.doc(`documents/${input.documentId}`);
    const requestRef = db.doc(
      `idempotencyKeys/acceptance-copy_${uid}_${input.idempotencyKey}`,
    );
    return db.runTransaction(async (transaction) => {
      const [user, document, existing] = await Promise.all([
        transaction.get(userRef),
        transaction.get(documentRef),
        transaction.get(requestRef),
      ]);
      const roles = Array.isArray(user.data()?.roles)
        ? user.data()?.roles as unknown[]
        : [];
      if (user.data()?.active !== true ||
          !roles.some((role) =>
            role === "admin" || role === "workshop_manager" ||
            role === "operator")) {
        throw new HttpsError(
          "permission-denied",
          "Ruolo non autorizzato a registrare la copia.",
        );
      }
      if (!document.exists || document.data()?.type !== "acceptance") {
        throw new HttpsError(
          "failed-precondition",
          "La registrazione è ammessa solo per la scheda di accettazione.",
        );
      }
      if (existing.exists) {
        return {
          documentId: String(existing.data()?.documentId),
          eventId: String(existing.data()?.eventId),
          outcome: String(existing.data()?.outcome),
        };
      }
      const repair = await transaction.get(db.doc(
        `repairs/${String(document.data()?.relatedEntityId)}`,
      ));
      const registeredSubject = String(
        repair.data()?.authorizationSubject?.label ?? "",
      );
      if (!registeredSubject || input.recipientLabel !== registeredSubject) {
        throw new HttpsError(
          "failed-precondition",
          "Il soggetto non coincide con quello registrato all’accettazione.",
        );
      }
      const now = Timestamp.now();
      const eventRef = documentRef.collection("copyHistory").doc();
      const event = {
        outcome: input.outcome,
        method: input.method,
        recipientLabel: registeredSubject,
        reason: input.reason,
        occurredAt: now,
        recordedBy: uid,
        policyVersion: "ACC-013-v1",
      };
      transaction.create(eventRef, event);
      transaction.update(documentRef, {
        latestCopyEvent: { ...event, eventId: eventRef.id },
        updatedAt: now,
        updatedBy: uid,
        version: Number(document.data()?.version ?? 1) + 1,
      });
      transaction.create(db.collection("auditLogs").doc(), {
        action: `document.acceptance-copy.${input.outcome}`,
        entityType: "document",
        entityId: input.documentId,
        entityCode: document.data()?.code ?? null,
        actorUid: uid,
        method: input.method,
        reason: input.reason,
        policyVersion: "ACC-013-v1",
        createdAt: now,
      });
      const response = {
        documentId: input.documentId,
        eventId: eventRef.id,
        outcome: input.outcome,
      };
      transaction.create(requestRef, {
        ...response, createdAt: now, createdBy: uid,
      });
      return response;
    });
  },
);

export const consolidateAcceptanceDocument = onCall(
  { region: "europe-west1", enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Accesso richiesto.");
    }
    const input = requireAcceptanceConsolidationInput(request.data);
    const db = getFirestore();
    const uid = request.auth.uid;
    const actor = await db.doc(`users/${uid}`).get();
    const actorRoles = Array.isArray(actor.data()?.roles)
      ? actor.data()?.roles as unknown[]
      : [];
    if (actor.data()?.active !== true ||
        !actorRoles.some((role) =>
          role === "admin" || role === "workshop_manager")) {
      throw new HttpsError(
        "permission-denied",
        "Solo responsabile o amministratore possono consolidare.",
      );
    }
    const policies = await requireAcceptanceConsolidationPolicies(db);
    const projectId =
      process.env.GCLOUD_PROJECT || "demo-bike4city-ciclofficina";
    if (policies.demoOnly && !projectId.startsWith("demo-")) {
      throw new HttpsError(
        "failed-precondition",
        "Configurazioni dimostrative non ammesse fuori dagli emulatori.",
      );
    }
    const expectedPrefix =
      `acceptanceSignatureEvidence/${input.documentId}/${uid}/`;
    if (!input.signatureStoragePath.startsWith(expectedPrefix)) {
      throw new HttpsError(
        "invalid-argument",
        "Percorso dell’evidenza di firma non valido.",
      );
    }
    const bucket = privateDocumentBucket();
    const signatureFile = bucket.file(input.signatureStoragePath);
    const [signatureExists] = await signatureFile.exists();
    if (!signatureExists) {
      throw new HttpsError(
        "failed-precondition",
        "Archiviare l’evidenza di firma prima del consolidamento.",
      );
    }
    const [signatureMetadata] = await signatureFile.getMetadata();
    const signatureContentType = String(signatureMetadata.contentType ?? "");
    const signatureSize = Number(signatureMetadata.size ?? 0);
    if (!["application/pdf", "image/jpeg", "image/png"].includes(
      signatureContentType,
    ) || signatureSize < 1 || signatureSize > 10 * 1024 * 1024 ||
        signatureMetadata.metadata?.documentId !== input.documentId ||
        signatureMetadata.metadata?.uploaderUid !== uid ||
        signatureMetadata.metadata?.method !== input.signatureMethod ||
        (input.signatureMethod === "Firma su dispositivo" &&
          signatureContentType !== "image/png")) {
      throw new HttpsError(
        "failed-precondition",
        "Evidenza di firma non valida o non coerente.",
      );
    }
    const [signatureBytes] = await signatureFile.download();
    const signatureChecksum =
      createHash("sha256").update(signatureBytes).digest("hex");
    const userRef = db.doc(`users/${uid}`);
    const documentRef = db.doc(`documents/${input.documentId}`);
    const requestRef = db.doc(
      `idempotencyKeys/acceptance-consolidate_${uid}_${input.idempotencyKey}`,
    );
    const documentSnapshot = await documentRef.get();
    if (!documentSnapshot.exists ||
        typeof documentSnapshot.data()?.storagePath !== "string") {
      throw new HttpsError("not-found", "Scheda di accettazione non trovata.");
    }
    const [documentBytes] = await bucket.file(
      String(documentSnapshot.data()?.storagePath),
    ).download();
    const documentChecksum =
      createHash("sha256").update(documentBytes).digest("hex");
    return db.runTransaction(async (transaction) => {
      const [user, document, existing] = await Promise.all([
        transaction.get(userRef),
        transaction.get(documentRef),
        transaction.get(requestRef),
      ]);
      const roles = Array.isArray(user.data()?.roles)
        ? user.data()?.roles as unknown[]
        : [];
      if (user.data()?.active !== true ||
          !roles.some((role) =>
            role === "admin" || role === "workshop_manager")) {
        throw new HttpsError(
          "permission-denied",
          "Solo responsabile o amministratore possono consolidare.",
        );
      }
      if (existing.exists) {
        return {
          documentId: String(existing.data()?.documentId),
          status: String(existing.data()?.status),
        };
      }
      const data = document.data() ?? {};
      if (!document.exists || data.type !== "acceptance" ||
          data.status !== "draft" || data.pendingCorrection ||
          data.documentAnomaly ||
          !data.latestCopyEvent ||
          !["delivered", "refused"].includes(
            String(data.latestCopyEvent.outcome),
          )) {
        throw new HttpsError(
          "failed-precondition",
          "Requisiti di consolidamento non soddisfatti.",
        );
      }
      const repair = await transaction.get(db.doc(
        `repairs/${String(data.relatedEntityId)}`,
      ));
      const subjectLabel = String(
        repair.data()?.authorizationSubject?.label ?? "",
      );
      if (!subjectLabel ||
          subjectLabel !== String(data.latestCopyEvent.recipientLabel)) {
        throw new HttpsError(
          "failed-precondition",
          "Soggetto o consegna della copia non coerenti.",
        );
      }
      const now = Timestamp.now();
      const status = policies.demoOnly
        ? "consolidated_demo"
        : "consolidated";
      transaction.update(documentRef, {
        status,
        immutable: true,
        privacyPolicyVersion: policies.privacyVersion,
        serviceConditionsVersion: policies.conditionsVersion,
        acceptanceSignatureEvidence: {
          method: input.signatureMethod,
          storagePath: input.signatureStoragePath,
          contentType: signatureContentType,
          size: signatureSize,
          checksumSha256: signatureChecksum,
          subjectLabel,
          archivedAt: now,
          archivedBy: uid,
          legalValidity: "not_determined",
          policyVersion: "ACC-015-v1",
        },
        checksumSha256: documentChecksum,
        consolidatedAt: now,
        consolidatedBy: uid,
        legalValidity: "not_determined",
        consolidationPolicyVersion: "ACC-015-v1",
        updatedAt: now,
        updatedBy: uid,
        version: Number(data.version ?? 1) + 1,
      });
      transaction.create(db.collection("auditLogs").doc(), {
        action: "document.acceptance.consolidate",
        entityType: "document",
        entityId: input.documentId,
        entityCode: data.code ?? null,
        actorUid: uid,
        status,
        checksumSha256: documentChecksum,
        signatureChecksumSha256: signatureChecksum,
        reason: input.reason,
        policyVersion: "ACC-015-v1",
        createdAt: now,
      });
      const response = { documentId: input.documentId, status };
      transaction.create(requestRef, {
        ...response, createdAt: now, createdBy: uid,
      });
      return response;
    });
  },
);

export const correctAcceptanceDocument = onCall(
  { region: "europe-west1", enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Accesso richiesto.");
    }
    const input = requireAcceptanceCorrectionInput(request.data);
    const db = getFirestore();
    const uid = request.auth.uid;
    const userRef = db.doc(`users/${uid}`);
    const oldRef = db.doc(`documents/${input.documentId}`);
    const requestRef = db.doc(
      `idempotencyKeys/acceptance-correct_${uid}_${input.idempotencyKey}`,
    );
    const newRef = db.collection("documents").doc();
    const result = await db.runTransaction(async (transaction) => {
      const [user, oldDocument, existing] = await Promise.all([
        transaction.get(userRef),
        transaction.get(oldRef),
        transaction.get(requestRef),
      ]);
      const roles = Array.isArray(user.data()?.roles)
        ? user.data()?.roles as unknown[]
        : [];
      const canPropose = roles.some((role) =>
        role === "admin" || role === "workshop_manager" || role === "operator");
      const canConfirm = roles.some((role) =>
        role === "admin" || role === "workshop_manager");
      if (user.data()?.active !== true ||
          (input.action === "propose" && !canPropose) ||
          (input.action === "confirm" && !canConfirm)) {
        throw new HttpsError(
          "permission-denied",
          "Ruolo non autorizzato alla correzione del documento.",
        );
      }
      if (!oldDocument.exists || oldDocument.data()?.type !== "acceptance") {
        throw new HttpsError(
          "failed-precondition",
          "È correggibile soltanto una scheda di accettazione.",
        );
      }
      if (existing.exists) {
        return {
          oldDocumentId: String(existing.data()?.oldDocumentId),
          newDocumentId: existing.data()?.newDocumentId
            ? String(existing.data()?.newDocumentId)
            : null,
          action: String(existing.data()?.action),
          storagePath: existing.data()?.storagePath
            ? String(existing.data()?.storagePath)
            : null,
          shouldCreateFile: false,
        };
      }
      const now = Timestamp.now();
      if (input.action === "propose") {
        const proposal = {
          correctedFields: input.correctedFields,
          correctionSummary: input.correctionSummary,
          subjectChanged: input.subjectChanged,
          correctedSubjectLabel: input.correctedSubjectLabel,
          reason: input.reason,
          proposedAt: now,
          proposedBy: uid,
          policyVersion: "ACC-014-v1",
        };
        transaction.update(oldRef, {
          pendingCorrection: proposal,
          updatedAt: now,
          updatedBy: uid,
          version: Number(oldDocument.data()?.version ?? 1) + 1,
        });
        transaction.create(db.collection("auditLogs").doc(), {
          action: "document.acceptance-correction.propose",
          entityType: "document",
          entityId: input.documentId,
          actorUid: uid,
          reason: input.reason,
          correctedFields: input.correctedFields,
          policyVersion: "ACC-014-v1",
          createdAt: now,
        });
        const response = {
          oldDocumentId: input.documentId,
          newDocumentId: null,
          action: input.action,
          storagePath: null,
          shouldCreateFile: false,
        };
        transaction.create(requestRef, {
          ...response, createdAt: now, createdBy: uid,
        });
        return response;
      }
      const proposal = oldDocument.data()?.pendingCorrection;
      if (!proposal || proposal.correctionSummary !== input.correctionSummary ||
          proposal.subjectChanged !== input.subjectChanged ||
          JSON.stringify(proposal.correctedFields) !==
            JSON.stringify(input.correctedFields)) {
        throw new HttpsError(
          "failed-precondition",
          "La conferma non corrisponde alla correzione proposta.",
        );
      }
      const repairRef = db.doc(
        `repairs/${String(oldDocument.data()?.relatedEntityId)}`,
      );
      const repair = input.subjectChanged
        ? await transaction.get(repairRef)
        : null;
      if (input.subjectChanged && !repair?.exists) {
        throw new HttpsError("not-found", "Riparazione collegata non trovata.");
      }
      const nextVersion = Number(oldDocument.data()?.documentVersion ?? 1) + 1;
      const storagePath =
        `documents/acceptance/${String(oldDocument.data()?.relatedEntityId)}/` +
        `${newRef.id}.pdf`;
      transaction.create(newRef, {
        ...oldDocument.data(),
        code: String(oldDocument.data()?.code),
        status: "generating",
        immutable: false,
        storagePath,
        size: null,
        documentVersion: nextVersion,
        replacesDocumentId: oldRef.id,
        correctionSummary: input.correctionSummary,
        correctedFields: input.correctedFields,
        signatureRequired: true,
        copyDeliveryRequired: true,
        latestCopyEvent: null,
        pendingCorrection: null,
        acceptanceSignatureEvidence: null,
        checksumSha256: null,
        consolidatedAt: null,
        consolidatedBy: null,
        consolidationPolicyVersion: null,
        createdAt: now,
        createdBy: uid,
        updatedAt: now,
        updatedBy: uid,
        version: 1,
      });
      transaction.update(oldRef, {
        status: "superseded",
        supersededByDocumentId: newRef.id,
        pendingCorrection: null,
        updatedAt: now,
        updatedBy: uid,
        version: Number(oldDocument.data()?.version ?? 1) + 1,
      });
      transaction.create(oldRef.collection("correctionHistory").doc(), {
        newDocumentId: newRef.id,
        newDocumentVersion: nextVersion,
        correctedFields: input.correctedFields,
        correctionSummary: input.correctionSummary,
        subjectChanged: input.subjectChanged,
        reason: input.reason,
        confirmedAt: now,
        confirmedBy: uid,
        policyVersion: "ACC-014-v1",
      });
      if (input.subjectChanged) {
        const hadAuthorization = Boolean(repair?.data()?.workAuthorization);
        transaction.update(repairRef, {
          authorizationSubject: {
            ...(repair?.data()?.authorizationSubject ?? {}),
            label: input.correctedSubjectLabel,
          },
          authorizationBlock: {
            status: "reauthorization_required",
            reason: "Soggetto autorizzante corretto nel documento.",
            documentId: newRef.id,
            createdAt: now,
            policyVersion: "ACC-014-v1",
          },
          ...(hadAuthorization ? {
            status: "In attesa autorizzazione",
            workAuthorization: {
              ...repair?.data()?.workAuthorization,
              status: "superseded_subject_correction",
            },
          } : {}),
          updatedAt: now,
          updatedBy: uid,
          version: Number(repair?.data()?.version ?? 1) + 1,
        });
      }
      transaction.create(db.collection("auditLogs").doc(), {
        action: "document.acceptance-correction.confirm",
        entityType: "document",
        entityId: newRef.id,
        previousDocumentId: oldRef.id,
        actorUid: uid,
        reason: input.reason,
        correctedFields: input.correctedFields,
        policyVersion: "ACC-014-v1",
        createdAt: now,
      });
      const response = {
        oldDocumentId: oldRef.id,
        newDocumentId: newRef.id,
        action: input.action,
        storagePath,
        shouldCreateFile: true,
      };
      transaction.create(requestRef, {
        ...response, createdAt: now, createdBy: uid,
      });
      return response;
    });
    if (result.shouldCreateFile && result.storagePath &&
        result.newDocumentId) {
      const oldDocument = await oldRef.get();
      const repair = await db.doc(
        `repairs/${String(oldDocument.data()?.relatedEntityId)}`,
      ).get();
      const source = {
        ...(repair.data() ?? {}),
        correctionSummary: input.correctionSummary,
        ...(input.subjectChanged ? {
          customerLabel: input.correctedSubjectLabel,
        } : {}),
      };
      const bytes = await createDraftPdf(
        "Scheda di accettazione",
        `${String(oldDocument.data()?.code)} / versione corretta`,
        source,
      );
      await privateDocumentBucket().file(result.storagePath).save(
        Buffer.from(bytes),
        {
          resumable: false,
          contentType: "application/pdf",
          metadata: {
            cacheControl: "private, max-age=0, no-store",
            metadata: {
              documentId: result.newDocumentId,
              status: "draft",
              modelVersion: "demo-v1",
              replacesDocumentId: input.documentId,
            },
          },
        },
      );
      await db.doc(`documents/${result.newDocumentId}`).update({
        size: bytes.length,
        status: "draft",
        updatedAt: Timestamp.now(),
      });
    }
    return {
      oldDocumentId: result.oldDocumentId,
      newDocumentId: result.newDocumentId,
      action: result.action,
    };
  },
);

export const createOperationalDocument = onCall(
  { region: "europe-west1", enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Accesso richiesto.");
    }
    const uid = request.auth.uid;
    const input = requireDocumentInput(request.data);
    const db = getFirestore();
    const profile = await db.doc(`users/${uid}`).get();
    const roles = Array.isArray(profile.data()?.roles)
      ? profile.data()?.roles as unknown[]
      : [];
    if (profile.data()?.active !== true ||
        !roles.some((role) => role === "admin" ||
          role === "workshop_manager" || role === "operator")) {
      throw new HttpsError(
        "permission-denied",
        "Ruolo non autorizzato alla generazione dei documenti.",
      );
    }
    const descriptor = documentSource(input.type);
    const sourceRef = db.doc(`${descriptor.collection}/${input.entityId}`);
    const requestRef = db.doc(
      `idempotencyKeys/document-create_${uid}_${input.idempotencyKey}`,
    );
    const [source, existingRequest] = await Promise.all([
      sourceRef.get(), requestRef.get(),
    ]);
    if (!source.exists) {
      throw new HttpsError("not-found", "Entità collegata non trovata.");
    }
    const year = Number(new Intl.DateTimeFormat("en", {
      timeZone: "Europe/Rome", year: "numeric",
    }).format(new Date()));
    const counterRef = db.doc(`counters/documents-${year}`);
    const documentRef = db.collection("documents").doc();
    const auditRef = db.collection("auditLogs").doc();
    const result = await db.runTransaction(async (transaction) => {
      const [counter, duplicate] = await Promise.all([
        transaction.get(counterRef), transaction.get(requestRef),
      ]);
      if (duplicate.exists) {
        return {
          id: String(duplicate.data()?.id),
          code: String(duplicate.data()?.code),
          storagePath: String(duplicate.data()?.storagePath),
          shouldCreateFile: false,
        };
      }
      const nextValue = Number(counter.data()?.lastValue ?? 0) + 1;
      const code =
        `${descriptor.codePrefix}-${year}-${String(nextValue).padStart(4, "0")}`;
      const storagePath =
        `documents/${input.type}/${input.entityId}/${documentRef.id}.pdf`;
      const now = Timestamp.now();
      const response = {
        id: documentRef.id, code, storagePath, shouldCreateFile: true,
      };
      transaction.set(counterRef, { lastValue: nextValue, updatedAt: now });
      transaction.create(documentRef, {
        code,
        type: input.type,
        title: descriptor.title,
        status: "generating",
        modelVersion: "demo-v1",
        legalValidity: "not_approved",
        storagePath,
        contentType: "application/pdf",
        size: null,
        relatedEntityType: descriptor.collection,
        relatedEntityId: input.entityId,
        sourceCode: String(source.data()?.code ?? source.data()?.repairCode ?? ""),
        visibility: "restricted",
        createdAt: now,
        createdBy: uid,
        updatedAt: now,
        updatedBy: uid,
        archivedAt: null,
        version: 1,
      });
      transaction.create(auditRef, {
        action: "document.draft.create",
        entityType: "document",
        entityId: documentRef.id,
        entityCode: code,
        actorUid: uid,
        relatedEntityType: descriptor.collection,
        relatedEntityId: input.entityId,
        createdAt: now,
      });
      transaction.create(requestRef, {
        id: documentRef.id, code, storagePath,
        createdAt: now, createdBy: uid,
      });
      return response;
    });
    const bucket = privateDocumentBucket();
    const file = bucket.file(result.storagePath);
    const [fileExists] = await file.exists();
    if (result.shouldCreateFile || !fileExists) {
      const bytes = await createDraftPdf(
        descriptor.title, result.code, source.data() ?? {},
      );
      await file.save(Buffer.from(bytes), {
        resumable: false,
        contentType: "application/pdf",
        metadata: {
          cacheControl: "private, max-age=0, no-store",
          metadata: {
            documentId: result.id,
            status: "draft",
            modelVersion: "demo-v1",
          },
        },
      });
      await db.doc(`documents/${result.id}`).update({
        size: bytes.length,
        status: "draft",
        updatedAt: Timestamp.now(),
      });
    }
    return {
      id: result.id, code: result.code, storagePath: result.storagePath,
    };
  },
);
