import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import type { DemoUser } from "../../app/App";
import { auth, db } from "../../firebase/client";

export async function signInDemo(
  email: string,
  password: string,
): Promise<DemoUser> {
  if (import.meta.env.MODE === "test") {
    return { name: "Giulia Demo", role: "Responsabile ciclofficina" };
  }

  const credential = await signInWithEmailAndPassword(auth, email, password);
  const profile = await getDoc(doc(db, "users", credential.user.uid));
  const profileName = profile.data()?.displayName;
  return {
    name:
      typeof profileName === "string"
        ? profileName
        : credential.user.displayName || "Utente demo",
    role: "Responsabile ciclofficina",
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
    onUser({
      name:
        typeof profileName === "string"
          ? profileName
          : firebaseUser.displayName || "Utente demo",
      role: "Responsabile ciclofficina",
    });
  });
}
