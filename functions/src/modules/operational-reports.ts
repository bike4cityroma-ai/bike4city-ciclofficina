import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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
type ReportFormat = "csv" | "json" | "pdf" | "xlsx";

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
  if (!["csv", "json", "pdf", "xlsx"].includes(String(format))) {
    throw new HttpsError("invalid-argument", "Formato del report non valido.");
  }
  if (!idempotencyKey || idempotencyKey.length > 80) {
    throw new HttpsError(
      "invalid-argument",
      "Chiave di idempotenza non valida.",
    );
  }
  return { year, format: format as ReportFormat, idempotencyKey };
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
  return createRows(year, totals, statuses)
    .map((row) => row.map(escapeCsv).join(",")).join("\r\n");
}

function createRows(
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
  return rows;
}

function escapeXml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

async function createXlsx(rows: Array<Array<string | number>>) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const sheetRows = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      const reference =
        `${String.fromCharCode(65 + columnIndex)}${rowIndex + 1}`;
      return typeof value === "number"
        ? `<c r="${reference}"><v>${value}</v></c>`
        : `<c r="${reference}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
    }).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");
  zip.file("[Content_Types].xml",
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
    "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">" +
    "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>" +
    "<Default Extension=\"xml\" ContentType=\"application/xml\"/>" +
    "<Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/>" +
    "<Override PartName=\"/xl/worksheets/sheet1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>" +
    "</Types>");
  zip.file("_rels/.rels",
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
    "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
    "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/>" +
    "</Relationships>");
  zip.file("xl/workbook.xml",
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
    "<workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" " +
    "xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\">" +
    "<sheets><sheet name=\"Report operativo\" sheetId=\"1\" r:id=\"rId1\"/></sheets></workbook>");
  zip.file("xl/_rels/workbook.xml.rels",
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
    "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
    "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet1.xml\"/>" +
    "</Relationships>");
  zip.file("xl/worksheets/sheet1.xml",
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
    "<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">" +
    `<sheetData>${sheetRows}</sheetData></worksheet>`);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

async function createPdf(
  year: number,
  rows: Array<Array<string | number>>,
) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595.28, 841.89]);
  let y = 790;
  const draw = (text: string, size = 9, useBold = false) => {
    page.drawText(text.replace(/[^\x20-\x7E]/g, " "), {
      x: 45,
      y,
      size,
      font: useBold ? bold : regular,
      color: rgb(0.09, 0.2, 0.17),
      maxWidth: 505,
    });
    y -= size + 8;
  };
  draw("APS Bike4City ETS - InControPedale", 12, true);
  draw(`Report operativo aggregato ${year}`, 18, true);
  draw("Nessun dato personale. Metriche ambientali non incluse.", 9);
  y -= 8;
  for (const row of rows) {
    if (y < 55) {
      page = pdf.addPage([595.28, 841.89]);
      y = 790;
    }
    draw(row.map(String).join(" | ").slice(0, 150), 8, row === rows[0]);
  }
  return Buffer.from(await pdf.save());
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
    const rows = createRows(input.year, totals, statuses);
    const content = input.format === "csv"
      ? Buffer.from(createCsv(input.year, totals, statuses), "utf8")
      : input.format === "json"
        ? Buffer.from(JSON.stringify(payload, null, 2), "utf8")
        : input.format === "xlsx"
          ? await createXlsx(rows)
          : await createPdf(input.year, rows);
    const contentTypes: Record<ReportFormat, string> = {
      csv: "text/csv; charset=utf-8",
      json: "application/json",
      pdf: "application/pdf",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
    const response = {
      year: input.year,
      format: input.format,
      contentType: contentTypes[input.format],
      fileName: `report-operativo-${input.year}.${input.format}`,
      dataBase64: content.toString("base64"),
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
