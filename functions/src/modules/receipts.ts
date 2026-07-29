import { createHash } from "node:crypto";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const receiptClassifications = new Set([
  "RIPARAZIONE",
  "BICI_RECUPERATA",
  "EROGAZIONE_LIBERALE",
  "QUOTA_ASSOCIATIVA",
]);

const classificationLabels: Record<string, (year: number) => string> = {
  RIPARAZIONE: () => "Riparazione bicicletta",
  BICI_RECUPERATA: () => "Consegna bicicletta recuperata",
  EROGAZIONE_LIBERALE: () => "Erogazione liberale",
  QUOTA_ASSOCIATIVA: (year) => `Quota associativa anno ${year}`,
};

function privateDocumentBucket() {
  const projectId =
    process.env.GCLOUD_PROJECT || "demo-bike4city-ciclofficina";
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET ||
    `${projectId}.firebasestorage.app`;
  return getStorage().bucket(bucketName);
}

function requireText(
  data: Record<string, unknown>,
  name: string,
  max: number,
  required = true,
) {
  const value = data[name];
  if (typeof value !== "string" || value.length > max ||
      (required && !value.trim())) {
    throw new HttpsError(
      "invalid-argument",
      `Il campo ${name} non è valido.`,
    );
  }
  return value.trim();
}

export const createReceiptDraft = onCall(
  { region: "europe-west1", enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== "true" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Accesso richiesto.");
    }
    const data = request.data as Record<string, unknown>;
    const classification = requireText(data, "classification", 40);
    const paymentMethod = requireText(data, "paymentMethod", 20);
    const amount = Number(data.amount);
    if (!receiptClassifications.has(classification) ||
        !["cash", "paypal"].includes(paymentMethod) ||
        !Number.isFinite(amount) || amount < 0 || amount > 1_000_000) {
      throw new HttpsError("invalid-argument", "Dati economici non validi.");
    }
    if (classification === "QUOTA_ASSOCIATIVA" && amount !== 10) {
      throw new HttpsError(
        "failed-precondition",
        "La quota associativa dimostrativa è fissata a 10 euro.",
      );
    }
    const uid = request.auth.uid;
    const input = {
      classification,
      subjectType: requireText(data, "subjectType", 30),
      subjectLabel: requireText(data, "subjectLabel", 160),
      subjectTaxCode: requireText(data, "subjectTaxCode", 32, false) || null,
      membershipCode: requireText(data, "membershipCode", 80, false) || null,
      amount,
      paymentMethod,
      paymentReference:
        requireText(data, "paymentReference", 160, false) || null,
      repairId: requireText(data, "repairId", 160, false) || null,
      bikeId: requireText(data, "bikeId", 160, false) || null,
      deliveryId: requireText(data, "deliveryId", 160, false) || null,
      memberId: requireText(data, "memberId", 160, false) || null,
      note: requireText(data, "note", 500),
      idempotencyKey: requireText(data, "idempotencyKey", 80),
    };
    if (classification === "QUOTA_ASSOCIATIVA" &&
        (!input.memberId || !input.membershipCode)) {
      throw new HttpsError(
        "failed-precondition",
        "La quota associativa richiede socio e tessera.",
      );
    }
    if (classification === "RIPARAZIONE" && !input.repairId ||
        classification === "BICI_RECUPERATA" && !input.deliveryId) {
      throw new HttpsError(
        "failed-precondition",
        "Collegamento operativo obbligatorio.",
      );
    }

    const db = getFirestore();
    const year = Number(new Intl.DateTimeFormat("en", {
      timeZone: "Europe/Rome",
      year: "numeric",
    }).format(new Date()));
    const userRef = db.doc(`users/${uid}`);
    const counterRef = db.doc(`counters/receipts-${year}`);
    const requestRef = db.doc(
      `idempotencyKeys/receipt-draft_${uid}_${input.idempotencyKey}`,
    );
    const receiptRef = db.collection("receipts").doc();
    const auditRef = db.collection("auditLogs").doc();
    const relatedDeliveryRef = input.deliveryId
      ? db.doc(`deliveries/${input.deliveryId}`)
      : null;

    const result = await db.runTransaction(async (transaction) => {
      const [user, counter, existing, delivery] = await Promise.all([
        transaction.get(userRef),
        transaction.get(counterRef),
        transaction.get(requestRef),
        relatedDeliveryRef ? transaction.get(relatedDeliveryRef) : null,
      ]);
      const profile = user.data();
      const roles = Array.isArray(profile?.roles)
        ? profile.roles as string[]
        : [];
      const privileged = profile?.active === true && roles.some((role) =>
        ["admin", "treasurer", "workshop_manager"].includes(role));
      const deliveryOperator = profile?.active === true &&
        roles.includes("operator") && delivery?.exists === true &&
        delivery.data()?.deliveredBy === uid;
      if (!privileged && !deliveryOperator) {
        throw new HttpsError(
          "permission-denied",
          "Ruolo non autorizzato alla bozza di ricevuta.",
        );
      }
      if (existing.exists) {
        return existing.data()?.result as {
          id: string;
          code: string;
          status: string;
          storagePath: string;
        };
      }

      const sequence = Number(counter.data()?.lastValue ?? 0) + 1;
      const code = `REC-${year}-${String(sequence).padStart(4, "0")}`;
      const now = Timestamp.now();
      const storagePath = `receipts/${year}/${receiptRef.id}.pdf`;
      const response = {
        id: receiptRef.id,
        code,
        status: "draft_demo",
        storagePath,
      };
      transaction.set(counterRef, { lastValue: sequence, updatedAt: now });
      transaction.create(receiptRef, {
        code,
        year,
        sequence,
        status: "draft_demo",
        classification,
        classificationLabel: classificationLabels[classification](year),
        subjectSnapshot: {
          type: input.subjectType,
          label: input.subjectLabel,
          taxCode: input.subjectTaxCode,
          membershipCode: input.membershipCode,
        },
        amount,
        currency: "EUR",
        paymentMethod,
        paymentReference: input.paymentReference,
        repairId: input.repairId,
        bikeId: input.bikeId,
        deliveryId: input.deliveryId,
        memberId: input.memberId,
        note: input.note,
        taxConfigurationStatus: "incomplete",
        vatStatement: null,
        stampDutyStatement: null,
        storagePath,
        checksumSha256: null,
        issuedAt: null,
        createdAt: now,
        createdBy: uid,
        createdByLabel: String(profile?.displayName ?? "Utente autorizzato"),
        version: 1,
      });
      transaction.create(auditRef, {
        action: "receipt.draft.create",
        entityType: "receipt",
        entityId: receiptRef.id,
        entityCode: code,
        actorUid: uid,
        classification,
        createdAt: now,
      });
      transaction.create(requestRef, {
        result: response,
        createdAt: now,
        createdBy: uid,
      });
      return response;
    });

    const receiptSnapshot = await db.doc(`receipts/${result.id}`).get();
    if (!receiptSnapshot.data()?.checksumSha256) {
      const receiptData = receiptSnapshot.data();
      const pdf = await PDFDocument.create();
      const page = pdf.addPage([595.28, 841.89]);
      const regular = await pdf.embedFont(StandardFonts.Helvetica);
      const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
      const draw = (value: string, y: number, size = 11, strong = false) =>
        page.drawText(value.replace(/[^\x20-\x7E]/g, " "), {
          x: 50,
          y,
          size,
          font: strong ? bold : regular,
          color: rgb(0.08, 0.18, 0.15),
          maxWidth: 495,
        });
      draw("APS Bike4City ETS - BOZZA DIMOSTRATIVA", 790, 14, true);
      draw("TAX-001 INCOMPLETA - NON EMETTIBILE", 765, 12, true);
      draw(`Ricevuta ${result.code}`, 720, 20, true);
      draw(`Classificazione: ${String(receiptData?.classificationLabel)}`, 680);
      draw(`Soggetto: ${input.subjectLabel}`, 650);
      draw(`Importo: EUR ${amount.toFixed(2)}`, 620, 14, true);
      draw(
        `Pagamento: ${paymentMethod === "cash" ? "Contanti" : "PayPal"}`,
        590,
      );
      draw("Dicitura IVA/art. 86: DA CONFERMARE", 540);
      draw("Imposta di bollo: DA CONFERMARE", 515);
      draw("Questa bozza non costituisce ricevuta definitiva.", 460, 11, true);
      const bytes = Buffer.from(await pdf.save());
      const checksumSha256 = createHash("sha256").update(bytes).digest("hex");
      await privateDocumentBucket().file(result.storagePath).save(bytes, {
        resumable: false,
        contentType: "application/pdf",
        metadata: {
          metadata: {
            receiptId: result.id,
            status: "draft_demo",
          },
        },
      });
      await db.doc(`receipts/${result.id}`).update({
        checksumSha256,
        pdfCreatedAt: Timestamp.now(),
      });
    }
    return result;
  },
);

export const voidReceiptDraft = onCall(
  { region: "europe-west1", enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== "true" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Accesso richiesto.");
    }
    const data = request.data as Record<string, unknown>;
    const receiptId = String(data.receiptId ?? "").trim();
    const reason = String(data.reason ?? "").trim();
    const replacementReceiptId =
      String(data.replacementReceiptId ?? "").trim() || null;
    const idempotencyKey = String(data.idempotencyKey ?? "").trim();
    if (!receiptId || reason.length < 10 || reason.length > 500 ||
        !idempotencyKey || idempotencyKey.length > 80) {
      throw new HttpsError("invalid-argument", "Dati annullamento non validi.");
    }

    const uid = request.auth.uid;
    const db = getFirestore();
    const userRef = db.doc(`users/${uid}`);
    const receiptRef = db.doc(`receipts/${receiptId}`);
    const requestRef = db.doc(
      `idempotencyKeys/receipt-void_${uid}_${idempotencyKey}`,
    );
    return db.runTransaction(async (transaction) => {
      const [user, receipt, existing] = await Promise.all([
        transaction.get(userRef),
        transaction.get(receiptRef),
        transaction.get(requestRef),
      ]);
      const roles = Array.isArray(user.data()?.roles)
        ? user.data()?.roles as string[]
        : [];
      if (user.data()?.active !== true || !roles.includes("admin")) {
        throw new HttpsError(
          "permission-denied",
          "Solo l'amministratore può annullare.",
        );
      }
      if (!receipt.exists) {
        throw new HttpsError("not-found", "Ricevuta non trovata.");
      }
      if (existing.exists) {
        return existing.data()?.result;
      }
      if (receipt.data()?.status === "void") {
        throw new HttpsError("already-exists", "Ricevuta già annullata.");
      }

      const now = Timestamp.now();
      const result = { receiptId, status: "void" };
      transaction.update(receiptRef, {
        status: "void",
        voidedAt: now,
        voidedBy: uid,
        voidReason: reason,
        replacementReceiptId,
        updatedAt: now,
        updatedBy: uid,
        version: Number(receipt.data()?.version ?? 0) + 1,
      });
      transaction.create(db.collection("auditLogs").doc(), {
        action: "receipt.void",
        entityType: "receipt",
        entityId: receiptId,
        entityCode: String(receipt.data()?.code),
        actorUid: uid,
        reason,
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
