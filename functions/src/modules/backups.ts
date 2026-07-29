import { createHash } from "node:crypto";
import {
  FieldPath,
  getFirestore,
  Timestamp,
} from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { HttpsError, onCall } from "firebase-functions/v2/https";

const rootCollections = [
  "users",
  "members",
  "memberPrivateProfiles",
  "bikes",
  "bikeDonations",
  "repairs",
  "repairTasks",
  "parts",
  "partMovements",
  "tests",
  "deliveries",
  "receipts",
  "documents",
  "authorizationEvidence",
  "settings",
  "counters",
  "auditLogs",
] as const;

const maxBackupBytes = 20 * 1024 * 1024;

function privateBackupBucket() {
  const projectId =
    process.env.GCLOUD_PROJECT || "demo-bike4city-ciclofficina";
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET ||
    `${projectId}.firebasestorage.app`;
  return getStorage().bucket(bucketName);
}

function requireIdempotencyKey(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new HttpsError("invalid-argument", "Richiesta backup mancante.");
  }
  const key = (value as Record<string, unknown>).idempotencyKey;
  if (typeof key !== "string" || !key.trim() || key.length > 80) {
    throw new HttpsError(
      "invalid-argument",
      "Chiave di idempotenza non valida.",
    );
  }
  return key.trim();
}

function requireBackupAccessInput(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new HttpsError("invalid-argument", "Richiesta backup mancante.");
  }
  const data = value as Record<string, unknown>;
  const backupId = typeof data.backupId === "string"
    ? data.backupId.trim()
    : "";
  const action = data.action === "download" ? "download" : "verify";
  if (!backupId || backupId.length > 160) {
    throw new HttpsError("invalid-argument", "ID backup non valido.");
  }
  return { backupId, action };
}

async function requireAdmin(uid: string) {
  const profile = await getFirestore().doc(`users/${uid}`).get();
  const roles = Array.isArray(profile.data()?.roles)
    ? profile.data()?.roles as unknown[]
    : [];
  if (profile.data()?.active !== true || !roles.includes("admin")) {
    throw new HttpsError(
      "permission-denied",
      "Solo l’amministratore può gestire i backup.",
    );
  }
}

function encodeValue(value: unknown): unknown {
  if (value instanceof Timestamp) {
    return { $type: "timestamp", value: value.toDate().toISOString() };
  }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return {
      $type: "bytes",
      value: Buffer.from(value).toString("base64"),
    };
  }
  if (Array.isArray(value)) {
    return value.map(encodeValue);
  }
  if (value && typeof value === "object") {
    const candidate = value as Record<string, unknown> & {
      latitude?: number;
      longitude?: number;
      path?: string;
    };
    if (typeof candidate.latitude === "number" &&
        typeof candidate.longitude === "number") {
      return {
        $type: "geopoint",
        latitude: candidate.latitude,
        longitude: candidate.longitude,
      };
    }
    if (typeof candidate.path === "string" &&
        "firestore" in candidate) {
      return { $type: "reference", path: candidate.path };
    }
    return Object.fromEntries(
      Object.keys(candidate).sort().map((key) => [
        key,
        encodeValue(candidate[key]),
      ]),
    );
  }
  return value;
}

interface BackupRecord {
  path: string;
  data: unknown;
}

async function collectDocument(
  document: FirebaseFirestore.QueryDocumentSnapshot,
  records: BackupRecord[],
) {
  records.push({ path: document.ref.path, data: encodeValue(document.data()) });
  const subcollections = await document.ref.listCollections();
  subcollections.sort((left, right) => left.path.localeCompare(right.path));
  for (const collection of subcollections) {
    const snapshot = await collection.orderBy(FieldPath.documentId()).get();
    for (const child of snapshot.docs) {
      await collectDocument(child, records);
    }
  }
}

async function collectRecords() {
  const db = getFirestore();
  const records: BackupRecord[] = [];
  const counts: Record<string, number> = {};
  for (const collectionName of rootCollections) {
    const snapshot = await db.collection(collectionName)
      .orderBy(FieldPath.documentId()).get();
    counts[collectionName] = snapshot.size;
    for (const document of snapshot.docs) {
      await collectDocument(document, records);
    }
  }
  records.sort((left, right) => left.path.localeCompare(right.path));
  return { records, counts };
}

function checksum(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

export const createJsonBackup = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
    timeoutSeconds: 300,
    memory: "1GiB",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Accesso richiesto.");
    }
    const idempotencyKey = requireIdempotencyKey(request.data);
    const uid = request.auth.uid;
    await requireAdmin(uid);
    const db = getFirestore();
    const requestRef = db.doc(
      `idempotencyKeys/json-backup_${uid}_${idempotencyKey}`,
    );
    const existing = await requestRef.get();
    if (existing.exists) return existing.data()?.response;

    const backupRef = db.collection("backupManifests").doc();
    const createdAt = Timestamp.now();
    const projectId =
      process.env.GCLOUD_PROJECT || "demo-bike4city-ciclofficina";
    const { records, counts } = await collectRecords();
    const unsigned = {
      schemaVersion: "bike4city-backup-v1",
      projectId,
      environment: projectId.startsWith("demo-") ? "demo" : "configured",
      createdAt: createdAt.toDate().toISOString(),
      applicationVersion: "0.1.0",
      collections: [...rootCollections],
      counts,
      recordCount: records.length,
      storageFilesIncluded: false,
      records,
    };
    const unsignedJson = JSON.stringify(unsigned);
    const checksumSha256 = checksum(unsignedJson);
    const backup = {
      manifest: {
        ...unsigned,
        records: undefined,
        checksumSha256,
        status: "complete",
      },
      records,
    };
    const bytes = Buffer.from(JSON.stringify(backup, null, 2), "utf8");
    if (bytes.length > maxBackupBytes) {
      throw new HttpsError(
        "resource-exhausted",
        "Il backup supera il limite previsto per l’esportazione applicativa.",
      );
    }
    const storagePath = `backups/${backupRef.id}.json`;
    await privateBackupBucket().file(storagePath).save(bytes, {
      resumable: false,
      contentType: "application/json",
      metadata: {
        cacheControl: "private, max-age=0, no-store",
        metadata: {
          backupId: backupRef.id,
          checksumSha256,
          createdBy: uid,
        },
      },
    });
    const response = {
      backupId: backupRef.id,
      storagePath,
      checksumSha256,
      size: bytes.length,
      recordCount: records.length,
      counts,
      status: "complete",
    };
    await db.runTransaction(async (transaction) => {
      const repeated = await transaction.get(requestRef);
      if (repeated.exists) return;
      transaction.create(backupRef, {
        ...response,
        schemaVersion: unsigned.schemaVersion,
        projectId,
        environment: unsigned.environment,
        collections: unsigned.collections,
        storageFilesIncluded: false,
        createdAt,
        createdBy: uid,
      });
      transaction.create(db.collection("auditLogs").doc(), {
        action: "backup.json.create",
        entityType: "backup",
        entityId: backupRef.id,
        actorUid: uid,
        recordCount: records.length,
        checksumSha256,
        createdAt,
      });
      transaction.create(requestRef, {
        response,
        createdAt,
        createdBy: uid,
      });
    });
    return response;
  },
);

export const accessJsonBackup = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Accesso richiesto.");
    }
    const input = requireBackupAccessInput(request.data);
    const uid = request.auth.uid;
    await requireAdmin(uid);
    const db = getFirestore();
    const manifest = await db.doc(`backupManifests/${input.backupId}`).get();
    if (!manifest.exists || typeof manifest.data()?.storagePath !== "string") {
      throw new HttpsError("not-found", "Backup non trovato.");
    }
    const [bytes] = await privateBackupBucket()
      .file(String(manifest.data()?.storagePath)).download();
    const parsed = JSON.parse(bytes.toString("utf8")) as {
      manifest: Record<string, unknown>;
      records: BackupRecord[];
    };
    const { checksumSha256: storedChecksum, status: _status, ...unsignedManifest } =
      parsed.manifest;
    const actualChecksum = checksum(JSON.stringify({
      ...unsignedManifest,
      records: parsed.records,
    }));
    const valid = actualChecksum === storedChecksum &&
      actualChecksum === manifest.data()?.checksumSha256;
    const now = Timestamp.now();
    await db.collection("auditLogs").add({
      action: `backup.json.${input.action}`,
      entityType: "backup",
      entityId: input.backupId,
      actorUid: uid,
      checksumValid: valid,
      createdAt: now,
    });
    if (!valid) {
      throw new HttpsError(
        "data-loss",
        "Il checksum del backup non è valido.",
      );
    }
    return {
      backupId: input.backupId,
      checksumSha256: actualChecksum,
      checksumValid: true,
      size: bytes.length,
      recordCount: parsed.records.length,
      ...(input.action === "download"
        ? {
            contentType: "application/json",
            fileName: `backup-bike4city-${input.backupId}.json`,
            dataBase64: bytes.toString("base64"),
          }
        : {}),
    };
  },
);
