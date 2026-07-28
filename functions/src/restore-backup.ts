import { createHash } from "node:crypto";
import {
  FieldPath,
  Firestore,
  GeoPoint,
  Timestamp,
} from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

interface BackupRecord {
  path: string;
  data: unknown;
}

interface JsonBackup {
  manifest: Record<string, unknown>;
  records: BackupRecord[];
}

export interface RestoreResult {
  projectId: string;
  restoredRecords: number;
  verifiedRecords: number;
  checksumSha256: string;
}

function checksum(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function requireValidBackup(value: unknown): {
  backup: JsonBackup;
  checksumSha256: string;
} {
  if (!value || typeof value !== "object") {
    throw new Error("Backup JSON mancante.");
  }
  const backup = value as JsonBackup;
  if (!backup.manifest || !Array.isArray(backup.records) ||
      backup.manifest.schemaVersion !== "bike4city-backup-v1") {
    throw new Error("Formato del backup non supportato.");
  }
  const {
    checksumSha256: storedChecksum,
    status: _status,
    ...unsignedManifest
  } = backup.manifest;
  if (typeof storedChecksum !== "string") {
    throw new Error("Checksum del backup mancante.");
  }
  const actualChecksum = checksum(JSON.stringify({
    ...unsignedManifest,
    records: backup.records,
  }));
  if (actualChecksum !== storedChecksum) {
    throw new Error("Checksum del backup non valido.");
  }
  const paths = new Set<string>();
  for (const record of backup.records) {
    if (!record || typeof record.path !== "string" ||
        !record.path || record.path.split("/").length % 2 !== 0 ||
        paths.has(record.path)) {
      throw new Error("Percorso duplicato o non valido nel backup.");
    }
    paths.add(record.path);
  }
  return { backup, checksumSha256: actualChecksum };
}

function decodeValue(value: unknown, db: Firestore): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => decodeValue(item, db));
  }
  if (value && typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    if (candidate.$type === "timestamp" &&
        typeof candidate.value === "string") {
      return Timestamp.fromDate(new Date(candidate.value));
    }
    if (candidate.$type === "bytes" &&
        typeof candidate.value === "string") {
      return Buffer.from(candidate.value, "base64");
    }
    if (candidate.$type === "geopoint" &&
        typeof candidate.latitude === "number" &&
        typeof candidate.longitude === "number") {
      return new GeoPoint(candidate.latitude, candidate.longitude);
    }
    if (candidate.$type === "reference" &&
        typeof candidate.path === "string") {
      return db.doc(candidate.path);
    }
    return Object.fromEntries(
      Object.entries(candidate).map(([key, item]) => [
        key,
        decodeValue(item, db),
      ]),
    );
  }
  return value;
}

export async function restoreJsonBackupToEmulator(
  db: Firestore,
  projectId: string,
  value: unknown,
): Promise<RestoreResult> {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new HttpsError(
      "failed-precondition",
      "Il ripristino è consentito soltanto con Firestore Emulator.",
    );
  }
  if (!projectId.startsWith("demo-")) {
    throw new HttpsError(
      "failed-precondition",
      "Il progetto di ripristino deve essere esplicitamente dimostrativo.",
    );
  }
  const { backup, checksumSha256 } = requireValidBackup(value);

  for (let index = 0; index < backup.records.length; index += 400) {
    const records = backup.records.slice(index, index + 400);
    const existing = await db.getAll(
      ...records.map((record) => db.doc(record.path)),
    );
    if (existing.some((document) => document.exists)) {
      throw new HttpsError(
        "already-exists",
        "Ripristino bloccato: la destinazione contiene già documenti.",
      );
    }
    const batch = db.batch();
    for (const record of records) {
      batch.create(
        db.doc(record.path),
        decodeValue(record.data, db) as FirebaseFirestore.DocumentData,
      );
    }
    await batch.commit();
  }

  const restored = await db.getAll(
    ...backup.records.map((record) => db.doc(record.path)),
  );
  if (restored.some((document) => !document.exists)) {
    throw new Error(
      "Verifica del ripristino non riuscita: documenti mancanti.",
    );
  }
  const rootCollections = Array.isArray(backup.manifest.collections)
    ? backup.manifest.collections.filter(
        (item): item is string => typeof item === "string",
      )
    : [];
  let verifiedRootRecords = 0;
  for (const collection of rootCollections) {
    const snapshot = await db.collection(collection)
      .orderBy(FieldPath.documentId()).get();
    verifiedRootRecords += snapshot.size;
  }
  const expectedRootRecords = backup.records.filter(
    (record) => record.path.split("/").length === 2,
  ).length;
  if (verifiedRootRecords !== expectedRootRecords) {
    throw new Error(
      "Verifica del ripristino non riuscita: conteggi radice discordanti.",
    );
  }
  return {
    projectId,
    restoredRecords: backup.records.length,
    verifiedRecords: restored.length,
    checksumSha256,
  };
}
