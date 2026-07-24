import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const mode = process.argv[2];

if (mode !== "start" && mode !== "exec") {
  throw new Error("Modalità prevista: start oppure exec.");
}

const projectId = "demo-bike4city-ciclofficina";
const firebaseCli = resolve(
  "node_modules",
  "firebase-tools",
  "lib",
  "bin",
  "firebase.js",
);

if (!existsSync(firebaseCli)) {
  throw new Error(
    "Firebase CLI locale non trovata. Eseguire prima npm.cmd install.",
  );
}

const build = spawnSync("npm.cmd", ["--prefix", "functions", "run", "build"], {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: true,
});

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const javaHome = findJavaHome();
const command =
  mode === "start"
    ? [
        firebaseCli,
        "emulators:start",
        "--project",
        projectId,
        "--only",
        "auth,firestore,storage,functions",
      ]
    : [
        firebaseCli,
        "emulators:exec",
        "--project",
        projectId,
        "--only",
        "auth,firestore,storage,functions",
        "npm.cmd run test:emulators",
      ];

if (javaHome) {
  console.info(`Firebase Emulator Suite: Java ${javaHome}`);
}

const result = spawnSync(process.execPath, command, {
  cwd: process.cwd(),
  env: {
    ...process.env,
    ...(javaHome
      ? {
          JAVA_HOME: javaHome,
          PATH: `${join(javaHome, "bin")};${process.env.PATH ?? ""}`,
        }
      : {}),
  },
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);

function findJavaHome() {
  if (process.platform !== "win32") {
    return process.env.JAVA_HOME;
  }

  const configuredJava21 = process.env.JAVA_HOME_21_X64;
  if (
    configuredJava21 &&
    existsSync(join(configuredJava21, "bin", "java.exe"))
  ) {
    return configuredJava21;
  }

  const programFiles = process.env.ProgramFiles ?? "C:\\Program Files";
  const adoptiumRoot = join(programFiles, "Eclipse Adoptium");

  if (existsSync(adoptiumRoot)) {
    const matchingDirectory = readdirSync(adoptiumRoot, {
      withFileTypes: true,
    })
      .filter(
        (entry) => entry.isDirectory() && entry.name.startsWith("jdk-21"),
      )
      .map((entry) => join(adoptiumRoot, entry.name))
      .find((directory) => existsSync(join(directory, "bin", "java.exe")));

    if (matchingDirectory) {
      return matchingDirectory;
    }
  }

  if (
    process.env.JAVA_HOME &&
    existsSync(join(process.env.JAVA_HOME, "bin", "java.exe"))
  ) {
    return process.env.JAVA_HOME;
  }

  return undefined;
}
