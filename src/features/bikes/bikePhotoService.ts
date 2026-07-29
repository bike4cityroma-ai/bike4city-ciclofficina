import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import {
  getBlob,
  ref,
  uploadBytes,
} from "firebase/storage";
import { auth, db, functions, storage } from "../../firebase/client";

export const bikePhotoTypes = [
  "Ingresso",
  "Dettaglio tecnico",
  "Lavorazione",
  "Risultato finale",
] as const;

export type BikePhotoType = (typeof bikePhotoTypes)[number];

export interface BikePhoto {
  id: string;
  storagePath: string;
  photoType: BikePhotoType;
  description: string | null;
  contentType: string;
  size: number;
  createdLabel: string;
}

const maximumPhotoSize = 10 * 1024 * 1024;

export function validateBikePhoto(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Seleziona un’immagine JPEG, PNG o WebP.");
  }
  if (file.size <= 0 || file.size >= maximumPhotoSize) {
    throw new Error("La fotografia deve essere più piccola di 10 MB.");
  }
}

export async function prepareBikePhoto(file: File) {
  validateBikePhoto(file);
  if (file.size <= 2 * 1024 * 1024 ||
      typeof createImageBitmap !== "function") {
    return file;
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85)
  );
  if (!blob || blob.size >= file.size) return file;
  const prepared = new File(
    [blob],
    file.name.replace(/\.[^.]+$/, "") + ".jpg",
    { type: "image/jpeg", lastModified: file.lastModified },
  );
  validateBikePhoto(prepared);
  return prepared;
}

export async function uploadBikePhoto(input: {
  bikeId: string;
  file: File;
  photoType: BikePhotoType;
  description: string;
}) {
  const file = await prepareBikePhoto(input.file);
  const photoId = crypto.randomUUID();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Accesso richiesto.");
  const storagePath =
    `bikes/${input.bikeId}/photos/${currentUser.uid}_${photoId}`;
  await uploadBytes(ref(storage, storagePath), file, {
    contentType: file.type,
    cacheControl: "private, max-age=0, no-store",
    customMetadata: {
      bikeId: input.bikeId,
      uploaderUid: currentUser.uid,
      photoType: input.photoType,
    },
  });
  const callable = httpsCallable(functions, "registerBikePhoto");
  await callable({
    bikeId: input.bikeId,
    photoId,
    storagePath,
    photoType: input.photoType,
    description: input.description.trim(),
    idempotencyKey: photoId,
  });
  return photoId;
}

export function observeBikePhotos(
  bikeId: string,
  onData: (photos: BikePhoto[]) => void,
  onError: () => void,
) {
  const photosQuery = query(
    collection(db, "bikes", bikeId, "photos"),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    photosQuery,
    (snapshot) => onData(snapshot.docs.map((photo) => {
      const data = photo.data();
      const createdAt = data.createdAt as Timestamp | undefined;
      return {
        id: photo.id,
        storagePath: String(data.storagePath),
        photoType: data.photoType as BikePhotoType,
        description:
          typeof data.description === "string" ? data.description : null,
        contentType: String(data.contentType),
        size: Number(data.size),
        createdLabel: createdAt
          ? new Intl.DateTimeFormat("it-IT", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(createdAt.toDate())
          : "Data non disponibile",
      };
    })),
    onError,
  );
}

export async function loadBikePhotoBlob(storagePath: string) {
  return getBlob(ref(storage, storagePath));
}
