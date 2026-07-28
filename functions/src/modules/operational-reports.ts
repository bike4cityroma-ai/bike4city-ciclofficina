import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

const permittedRoles = new Set([
  "admin",
  "workshop_manager",
  "treasurer",
]);

const reportCollections = [
  "bikes",
  "repairs",
  "parts",
  "tests",
  "deliveries",
] as const;

type ReportCollection = typeof reportCollections[number];
type ReportFormat = "csv" | "json";

interface ReportInput {
  year: number;
  format: ReportFormat;
  idempotencyKey: string;
}

function requireReportInput(value: unknown): ReportInput {
  if (!value || typeof value !== "object") {
    throw new HttpsError("invalid-argument", "Richiesta report mancante.");
  }
  const data = value as Record<string, unknown>;
  const year = Number(data.year);
  const format = data.format;
  const idempotencyKey = typeof data.idempotencyKey === "string"
    ? data.idempotencyKey.trim()
    : "";
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new HttpsError("invalid-argument", "Anno del report non valido.");
  }
  if (format !== "csv" && format !== "json") {
    throw new HttpsError("invalid-argument", "Formato del report non valido.");
  }
  if (!idempotencyKey || idempotencyKey.length > 80) {
    throw new HttpsError(
      "invalid-argument",
      "Chiave di idempotenza non valida.",
    );
  }
  return { year, format, idempotencyKey };
}

function escapeCsv(value: string | number) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function countByStatus(
  documents: FirebaseFirestore.QueryDocumentSnapshot[],
) {
  const counts: Record<string, number> = {};
  for (const document of documents) {
    const status = String(
      document.data().status ?? document.data().result ?? "Non specificato",
    );
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return counts;
}

function createCsv(
  year: number,
  totals: Record<ReportCollection, number>,
  statuses: Record<ReportCollection, Record<string, number>>,
) {
  const rows: Array<Array<string | number>> = [
    ["anno", "ambito", "indicatore", "valore", "natura"],
  ];
  for (const collection of reportCollections) {
    rows.push([year, collection, "totale", totals[collection], "conteggio"]);
    for (const [status, count] of Object.entries(statuses[collection])) {
      rows.push([year, collection, status, count, "conteggio"]);
    }
  }
  return rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
}

export const exportOperationalReport = onCall(
  { region: "europe-west1", enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Accesso richiesto.");
    }
    const input = requireReportInput(request.data);
    const db = getFirestore();
    const uid = request.auth.uid;
    const user = await db.doc(`users/${uid}`).get();
    const roles = Array.isArray(user.data()?.roles)
      ? user.data()?.roles as unknown[]
      : [];
    if (user.data()?.active !== true ||
        !roles.some((role) => permittedRoles.has(String(role)))) {
      throw new HttpsError(
        "permission-denied",
        "Ruolo non autorizzato all’esportazione operativa.",
      );
    }

    const requestRef = db.doc(
      `idempotencyKeys/operational-report_${uid}_${input.idempotencyKey}`,
    );
    const existing = await requestRef.get();
    if (existing.exists) {
      return existing.data()?.response;
    }

    const start = Timestamp.fromDate(new Date(`${input.year}-01-01T00:00:00Z`));
    const end = Timestamp.fromDate(
      new Date(`${input.year + 1}-01-01T00:00:00Z`),
    );
    const snapshots = await Promise.all(
      reportCollections.map((collection) =>
        db.collection(collection)
          .where("createdAt", ">=", start)
          .where("createdAt", "<", end)
          .get()),
    );
    const totals = {} as Record<ReportCollection, number>;
    const statuses = {} as Record<
      ReportCollection,
      Record<string, number>
    >;
    reportCollections.forEach((collection, index) => {
      totals[collection] = snapshots[index].size;
      statuses[collection] = countByStatus(snapshots[index].docs);
    });

    const generatedAt = Timestamp.now();
    const payload = {
      schemaVersion: "operational-report-v1",
      year: input.year,
      generatedAt: generatedAt.toDate().toISOString(),
      dataScope: "aggregated_no_personal_data",
      environmentalMetrics: {
        included: false,
        reason: "Metodo di stima non ancora approvato.",
      },
      totals,
      statuses,
    };
    const content = input.format === "csv"
      ? createCsv(input.year, totals, statuses)
      : JSON.stringify(payload, null, 2);
    const response = {
      year: input.year,
      format: input.format,
      contentType: input.format === "csv"
        ? "text/csv; charset=utf-8"
        : "application/json",
      fileName: `report-operativo-${input.year}.${input.format}`,
      dataBase64: Buffer.from(content, "utf8").toString("base64"),
      dataScope: payload.dataScope,
    };

    await db.runTransaction(async (transaction) => {
      const repeated = await transaction.get(requestRef);
      if (repeated.exists) return;
      transaction.create(db.collection("auditLogs").doc(), {
        action: "report.operational.export",
        entityType: "operationalReport",
        entityId: String(input.year),
        actorUid: uid,
        format: input.format,
        dataScope: payload.dataScope,
        createdAt: generatedAt,
      });
      transaction.create(requestRef, {
        response,
        createdAt: generatedAt,
        createdBy: uid,
      });
    });
    return response;
  },
);
