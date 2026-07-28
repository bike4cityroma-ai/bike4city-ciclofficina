import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import type { DemoUser } from "../../app/App";
import { auth, db } from "../../firebase/client";

function roleLabel(roles: unknown) {
  if (!Array.isArray(roles)) return "Utente";
  if (roles.includes("admin")) return "Amministratore";
  if (roles.includes("workshop_manager")) return "Responsabile ciclofficina";
  if (roles.includes("operator")) return "Operatore";
  if (roles.includes("volunteer")) return "Volontario";
  if (roles.includes("treasurer")) return "Tesoriere";
  return "Sola lettura";
}

function demoUserFromProfile(
  profile: Record<string, unknown>,
  firebaseUser: User,
): DemoUser {
  const profileName = profile.displayName;
  const roles = Array.isArray(profile.roles) ? profile.roles : [];
  return {
    name:
      typeof profileName === "string"
        ? profileName
        : firebaseUser.displayName || "Utente demo",
    role: roleLabel(roles),
    roles,
  };
}

export async function signInDemo(
  email: string,
  password: string,
): Promise<DemoUser> {
  if (import.meta.env.MODE === "test") {
    return {
      name: "Giulia Demo",
      role: "Responsabile ciclofficina",
      roles: ["workshop_manager"],
    };
  }

  const credential = await signInWithEmailAndPassword(auth, email, password);
  const profile = await getDoc(doc(db, "users", credential.user.uid));
  const profileData = profile.data();
  if (!profile.exists() || profileData?.active !== true) {
    await signOut(auth);
    throw new Error("Account applicativo non attivo.");
  }
  return demoUserFromProfile(profileData, credential.user);
}

export async function signOutDemo() {
  if (import.meta.env.MODE !== "test") {
    await signOut(auth);
  }
}

export function observeDemoSession(
  onUser: (user: DemoUser | null) => void,
) {
  if (import.meta.env.MODE === "test") return () => undefined;

  let stopProfile: () => void = () => undefined;
  const stopAuth = onAuthStateChanged(auth, (firebaseUser) => {
    stopProfile();
    stopProfile = () => undefined;
    if (!firebaseUser) {
      onUser(null);
      return;
    }

    stopProfile = onSnapshot(
      doc(db, "users", firebaseUser.uid),
      (profile) => {
        const profileData = profile.data();
        if (!profile.exists() || profileData?.active !== true) {
          onUser(null);
          void signOut(auth);
          return;
        }
        onUser(demoUserFromProfile(profileData, firebaseUser));
      },
      () => {
        onUser(null);
        void signOut(auth);
      },
    );
  });

  return () => {
    stopProfile();
    stopAuth();
  };
}
