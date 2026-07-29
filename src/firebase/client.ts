import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";
import {
  connectAuthEmulator,
  getAuth,
  type Auth,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import {
  connectStorageEmulator,
  getStorage,
  type FirebaseStorage,
} from "firebase/storage";
import {
  connectFunctionsEmulator,
  getFunctions,
  type Functions,
} from "firebase/functions";

const demoProjectId = "demo-bike4city-ciclofficina";

function getFirebaseOptions(): FirebaseOptions {
  if (import.meta.env.DEV && useEmulators()) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
      authDomain:
        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
        `${demoProjectId}.firebaseapp.com`,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || demoProjectId,
      storageBucket:
        import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
        `${demoProjectId}.firebasestorage.app`,
      appId: import.meta.env.VITE_FIREBASE_APP_ID || "demo-app-id",
    };
  }

  const requiredValues = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  const missingKeys = Object.entries(requiredValues)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    throw new Error(
      `Configurazione Firebase incompleta: ${missingKeys.join(", ")}.`,
    );
  }

  return requiredValues;
}

function useEmulators() {
  return import.meta.env.VITE_USE_FIREBASE_EMULATORS !== "false";
}

const app = getApps().length === 0
  ? initializeApp(getFirebaseOptions())
  : getApp();

if (!useEmulators()) {
  const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;
  if (!appCheckSiteKey) {
    throw new Error("Configurazione App Check mancante.");
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export const functions: Functions = getFunctions(app, "europe-west1");

if (import.meta.env.DEV && useEmulators()) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", {
    disableWarnings: true,
  });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}
