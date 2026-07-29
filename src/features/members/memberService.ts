import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../firebase/client";

export type MemberStatus = "Attivo" | "Scaduto" | "Sospeso" | "Archiviato";

export interface Member {
  id: string;
  membershipNumber: string;
  displayLabel: string;
  joinedOn: string;
  expiresOn: string;
  status: MemberStatus;
  privacyConsent: boolean;
  email: string;
  phone: string;
  updatedLabel: string;
}

export interface SaveMemberInput {
  idempotencyKey: string;
  memberId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  joinedOn: string;
  expiresOn: string;
  status: MemberStatus;
  privacyConsent: boolean;
  reason: string;
}

export function observeMembers(
  onData: (members: Member[], fromCache: boolean) => void,
  onError: () => void,
) {
  return onSnapshot(
    query(collection(db, "members"), orderBy("updatedAt", "desc")),
    async (snapshot) => {
      const privateProfiles = new Map<string, { email: string; phone: string }>();
      // I profili privati sono leggibili solo dai ruoli autorizzati dalle Rules.
      await Promise.all(snapshot.docs.map(async (item) => {
        try {
          const privateProfile = await getDoc(
            doc(db, "memberPrivateProfiles", item.id),
          );
          if (privateProfile.exists()) {
            privateProfiles.set(item.id, {
              email: String(privateProfile.data().email ?? ""),
              phone: String(privateProfile.data().phone ?? ""),
            });
          }
        } catch {
          privateProfiles.set(item.id, { email: "", phone: "" });
        }
      }));
      onData(snapshot.docs.map((item) => {
        const data = item.data();
        const updatedAt = data.updatedAt as Timestamp | undefined;
        const privateProfile = privateProfiles.get(item.id);
        return {
          id: item.id,
          membershipNumber: String(data.membershipNumber),
          displayLabel: String(data.displayLabel),
          joinedOn: String(data.joinedOn),
          expiresOn: String(data.expiresOn),
          status: data.status as MemberStatus,
          privacyConsent: data.privacyConsent === true,
          email: privateProfile?.email ?? "",
          phone: privateProfile?.phone ?? "",
          updatedLabel: updatedAt
            ? new Intl.DateTimeFormat("it-IT", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(updatedAt.toDate())
            : "Data non disponibile",
        };
      }), snapshot.metadata.fromCache);
    },
    onError,
  );
}

export async function saveMember(input: SaveMemberInput) {
  const callable = httpsCallable<
    SaveMemberInput,
    { id: string; membershipNumber: string }
  >(functions, "saveMember");
  return (await callable(input)).data;
}
