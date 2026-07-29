import { describe, expect, it } from "vitest";
import {
  prepareBikePhoto,
  validateBikePhoto,
} from "./bikePhotoService";

describe("fotografie biciclette", () => {
  it("accetta JPEG, PNG e WebP sotto 10 MB", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(() => validateBikePhoto(
        new File([new Uint8Array([1, 2, 3])], "foto-demo", { type }),
      )).not.toThrow();
    }
  });

  it("rifiuta formati non immagine", () => {
    expect(() => validateBikePhoto(
      new File(["contenuto fittizio"], "nota.txt", { type: "text/plain" }),
    )).toThrow("JPEG, PNG o WebP");
  });

  it("rifiuta file da 10 MB o superiori", () => {
    expect(() => validateBikePhoto(
      new File(
        [new Uint8Array(10 * 1024 * 1024)],
        "foto-grande.jpg",
        { type: "image/jpeg" },
      ),
    )).toThrow("più piccola di 10 MB");
  });

  it("mantiene il file piccolo senza ricomprimerlo", async () => {
    const file = new File(
      [new Uint8Array([1, 2, 3])],
      "foto-demo.jpg",
      { type: "image/jpeg" },
    );
    await expect(prepareBikePhoto(file)).resolves.toBe(file);
  });
});
