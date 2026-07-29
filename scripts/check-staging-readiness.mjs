import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const envPath = resolve(root, ".env.staging.local");
const requiredFiles = [
  "firebase.json",
  "firestore.rules",
  "firestore.indexes.json",
  "storage.rules",
  "package-lock.json",
];
const requiredVariables = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_APP_ID",
  "VITE_FIREBASE_APPCHECK_SITE_KEY",
];
const errors = [];

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) {
    errors.push(`File richiesto mancante: ${file}`);
  }
}

if (!existsSync(envPath)) {
  errors.push(
    "Configurazione mancante: copiare .env.staging.example in " +
      ".env.staging.local e compilare i valori del progetto staging.",
  );
} else {
  const variables = parseEnv(readFileSync(envPath, "utf8"));

  for (const name of requiredVariables) {
    if (!variables[name]) errors.push(`Variabile staging mancante: ${name}`);
  }

  const projectId = variables.VITE_FIREBASE_PROJECT_ID ?? "";
  if (projectId.startsWith("demo-")) {
    errors.push("Il progetto staging non può usare un project ID demo.");
  }

  if (variables.VITE_USE_FIREBASE_EMULATORS !== "false") {
    errors.push(
      "VITE_USE_FIREBASE_EMULATORS deve essere false nello staging.",
    );
  }

  const authDomain = variables.VITE_FIREBASE_AUTH_DOMAIN ?? "";
  if (projectId && !authDomain.includes(projectId)) {
    errors.push(
      "VITE_FIREBASE_AUTH_DOMAIN non sembra appartenere al progetto staging.",
    );
  }

  const storageBucket = variables.VITE_FIREBASE_STORAGE_BUCKET ?? "";
  if (projectId && !storageBucket.includes(projectId)) {
    errors.push(
      "VITE_FIREBASE_STORAGE_BUCKET non sembra appartenere al progetto staging.",
    );
  }
}

if (errors.length > 0) {
  console.error("Staging non pronto:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.info(
  "Controllo staging superato: configurazione presente, progetto non demo, " +
    "emulatori disattivati e App Check configurato.",
);

function parseEnv(content) {
  const result = {};
  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const name = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim()
      .replace(/^(['"])(.*)\1$/u, "$2");
    result[name] = value;
  }
  return result;
}
