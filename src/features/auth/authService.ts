import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
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
  const profileName = profile.data()?.displayName;
  const roles = Array.isArray(profile.data()?.roles) ? profile.data()!.roles : [];
  return {
    name:
      typeof profileName === "string"
        ? profileName
        : credential.user.displayName || "Utente demo",
    role: roleLabel(roles),
    roles,
  };
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

  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      onUser(null);
      return;
    }
    const profile = await getDoc(doc(db, "users", firebaseUser.uid));
    const profileName = profile.data()?.displayName;
    const roles = Array.isArray(profile.data()?.roles)
      ? profile.data()!.roles
      : [];
    onUser({
      name:
        typeof profileName === "string"
          ? profileName
          : firebaseUser.displayName || "Utente demo",
      role: roleLabel(roles),
      roles,
    });
  });
}
