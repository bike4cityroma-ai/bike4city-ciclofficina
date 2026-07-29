interface AppCheckDebugTarget {
  FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string;
}

interface AppCheckDebugOptions {
  debugToken?: string;
  isDevelopment: boolean;
  useEmulators: boolean;
  target?: AppCheckDebugTarget;
}

export function configureAppCheckDebug({
  debugToken,
  isDevelopment,
  useEmulators,
  target = globalThis as AppCheckDebugTarget,
}: AppCheckDebugOptions): boolean {
  const normalizedToken = debugToken?.trim();
  if (!normalizedToken) return false;

  if (!isDevelopment || useEmulators) {
    throw new Error(
      "Il debug token App Check è ammesso soltanto nello sviluppo collegato allo staging.",
    );
  }

  if (normalizedToken !== "true" && normalizedToken.length < 32) {
    throw new Error("Il debug token App Check non è valido.");
  }

  target.FIREBASE_APPCHECK_DEBUG_TOKEN =
    normalizedToken === "true" ? true : normalizedToken;
  return true;
}
