import { describe, expect, it } from "vitest";
import { configureAppCheckDebug } from "./appCheckDebug";

describe("configureAppCheckDebug", () => {
  const registeredToken = "debug-token-for-test-only-000000000000";

  it("non abilita il debug senza token", () => {
    const target = {};

    expect(configureAppCheckDebug({
      isDevelopment: true,
      useEmulators: false,
      target,
    })).toBe(false);
    expect(target).toEqual({});
  });

  it("richiede la generazione locale quando il valore è true", () => {
    const target = {};

    expect(configureAppCheckDebug({
      debugToken: "true",
      isDevelopment: true,
      useEmulators: false,
      target,
    })).toBe(true);
    expect(target).toEqual({ FIREBASE_APPCHECK_DEBUG_TOKEN: true });
  });

  it("accetta un token registrato per sviluppo o CI", () => {
    const target = {};

    configureAppCheckDebug({
      debugToken: registeredToken,
      isDevelopment: true,
      useEmulators: false,
      target,
    });

    expect(target).toEqual({
      FIREBASE_APPCHECK_DEBUG_TOKEN: registeredToken,
    });
  });

  it("rifiuta il debug token negli emulatori", () => {
    expect(() => configureAppCheckDebug({
      debugToken: "true",
      isDevelopment: true,
      useEmulators: true,
      target: {},
    })).toThrow("soltanto nello sviluppo collegato allo staging");
  });

  it("rifiuta il debug token nelle build", () => {
    expect(() => configureAppCheckDebug({
      debugToken: registeredToken,
      isDevelopment: false,
      useEmulators: false,
      target: {},
    })).toThrow("soltanto nello sviluppo collegato allo staging");
  });

  it("rifiuta valori diversi da true che non sembrano token", () => {
    expect(() => configureAppCheckDebug({
      debugToken: "token-corto",
      isDevelopment: true,
      useEmulators: false,
      target: {},
    })).toThrow("non è valido");
  });
});
