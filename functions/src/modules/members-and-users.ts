import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

const memberStatuses = new Set([
  "Attivo",
  "Scaduto",
  "Sospeso",
  "Archiviato",
]);

const userRoles = new Set([
  "admin",
  "workshop_manager",
  "operator",
  "volunteer",
  "treasurer",
  "read_only",
]);

function requireMemberInput(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new HttpsError("invalid-argument", "Dati socio mancanti.");
  }
  const data = value as Record<string, unknown>;
  const text = (name: string, max: number, required = true) => {
    const field = data[name];
    if (typeof field !== "string" || field.length > max ||
        (required && !field.trim())) {
      throw new HttpsError(
        "invalid-argument",
        `Il campo ${name} non è valido.`,
      );
    }
    return field.trim();
  };
  const date = (name: string) => {
    const result = text(name, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) {
      throw new HttpsError(
        "invalid-argument",
        `La data ${name} non è valida.`,
      );
    }
    return result;
  };
  const status = text("status", 20);
  if (!memberStatuses.has(status)) {
    throw new HttpsError("invalid-argument", "Stato socio non valido.");
  }
  const reason = text("reason", 500);
  if (reason.length < 10) {
    throw new HttpsError(
      "invalid-argument",
      "La motivazione deve contenere almeno 10 caratteri.",
    );
  }
  const email = text("email", 160, false);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError("invalid-argument", "Email non valida.");
  }
  return {
    idempotencyKey: text("idempotencyKey", 80),
    memberId: typeof data.memberId === "string" && data.memberId.trim()
      ? data.memberId.trim()
      : null,
    firstName: text("firstName", 80),
    lastName: text("lastName", 80),
    email,
    phone: text("phone", 40, false),
    joinedOn: date("joinedOn"),
    expiresOn: date("expiresOn"),
    status,
    privacyConsent: data.privacyConsent === true,
    reason,
  };
}

function requireUserAccessInput(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new HttpsError("invalid-argument", "Dati account mancanti.");
  }
  const data = value as Record<string, unknown>;
  const targetUid = typeof data.targetUid === "string"
    ? data.targetUid.trim()
    : "";
  const reason = typeof data.reason === "string" ? data.reason.trim() : "";
  const submittedRoles = Array.isArray(data.roles) ? data.roles : [];
  const roles = Array.isArray(data.roles)
    ? [...new Set(data.roles.filter(
        (role): role is string =>
          typeof role === "string" && userRoles.has(role),
      ))]
    : [];
  if (!targetUid || targetUid.length > 160 || reason.length < 10 ||
      reason.length > 500 || roles.length !== submittedRoles.length) {
    throw new HttpsError("invalid-argument", "Dati account non validi.");
  }
  return {
    targetUid,
    roles,
    active: data.active === true,
    reason,
  };
}

export const saveMember = onCall(
  { region: "europe-west1", enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== "true" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Accesso richiesto.");
    }
    const uid = request.auth.uid;
    const input = requireMemberInput(request.data);
    const db = getFirestore();
    const userRef = db.doc(`users/${uid}`);
    const requestRef = db.doc(
      `idempotencyKeys/member-save_${uid}_${input.idempotencyKey}`,
    );
    const year = Number(input.joinedOn.slice(0, 4));
    const counterRef = db.doc(`counters/members-${year}`);
    const memberRef = input.memberId
      ? db.doc(`members/${input.memberId}`)
      : db.collection("members").doc();
    const privateRef = db.doc(`memberPrivateProfiles/${memberRef.id}`);
    const auditRef = db.collection("auditLogs").doc();

    return db.runTransaction(async (transaction) => {
      const [profile, existingRequest, existingMember, counter] =
        await Promise.all([
          transaction.get(userRef),
          transaction.get(requestRef),
          transaction.get(memberRef),
          transaction.get(counterRef),
        ]);
      const roles = Array.isArray(profile.data()?.roles)
        ? profile.data()?.roles as unknown[]
        : [];
      if (profile.data()?.active !== true ||
          !roles.some((role) => role === "admin" ||
            role === "workshop_manager")) {
        throw new HttpsError(
          "permission-denied",
          "Ruolo non autorizzato alla gestione dei soci.",
        );
      }
      if (existingRequest.exists) {
        return {
          id: String(existingRequest.data()?.id),
          membershipNumber: String(
            existingRequest.data()?.membershipNumber,
          ),
        };
      }
      if (input.memberId && !existingMember.exists) {
        throw new HttpsError("not-found", "Socio non trovato.");
      }

      const now = Timestamp.now();
      let membershipNumber = String(
        existingMember.data()?.membershipNumber ?? "",
      );
      if (!existingMember.exists) {
        const nextValue = Number(counter.data()?.lastValue ?? 0) + 1;
        membershipNumber =
          `SOC-${year}-${String(nextValue).padStart(4, "0")}`;
        transaction.set(counterRef, {
          lastValue: nextValue,
          updatedAt: now,
        });
      }
      const publicData = {
        membershipNumber,
        displayLabel: `${input.firstName} ${input.lastName}`,
        joinedOn: input.joinedOn,
        expiresOn: input.expiresOn,
        status: input.status,
        privacyConsent: input.privacyConsent,
        updatedAt: now,
        updatedBy: uid,
        version: Number(existingMember.data()?.version ?? 0) + 1,
        archivedAt: input.status === "Archiviato"
          ? existingMember.data()?.archivedAt ?? now
          : null,
      };
      if (existingMember.exists) {
        transaction.update(memberRef, publicData);
      } else {
        transaction.create(memberRef, {
          ...publicData,
          createdAt: now,
          createdBy: uid,
        });
      }
      transaction.set(privateRef, {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email || null,
        phone: input.phone || null,
        updatedAt: now,
        updatedBy: uid,
      }, { merge: true });
      transaction.create(auditRef, {
        action: existingMember.exists ? "member.update" : "member.create",
        entityType: "member",
        entityId: memberRef.id,
        entityCode: membershipNumber,
        actorUid: uid,
        changes: {
          status: {
            from: existingMember.data()?.status ?? null,
            to: input.status,
          },
        },
        reason: input.reason,
        createdAt: now,
      });
      const response = {
        id: memberRef.id,
        membershipNumber,
      };
      transaction.create(requestRef, {
        ...response,
        createdAt: now,
        createdBy: uid,
      });
      return response;
    });
  },
);

export const manageUserAccess = onCall(
  { region: "europe-west1", enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== "true" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Accesso richiesto.");
    }
    const input = requireUserAccessInput(request.data);
    const db = getFirestore();
    const actor = await db.doc(`users/${request.auth.uid}`).get();
    if (actor.data()?.active !== true ||
        !Array.isArray(actor.data()?.roles) ||
        !actor.data()?.roles.includes("admin")) {
      throw new HttpsError(
        "permission-denied",
        "Solo un amministratore può gestire gli accessi.",
      );
    }
    if (input.targetUid === request.auth.uid && !input.active) {
      throw new HttpsError(
        "failed-precondition",
        "Non è possibile disabilitare il proprio account.",
      );
    }
    const targetRef = db.doc(`users/${input.targetUid}`);
    const target = await targetRef.get();
    if (!target.exists) {
      throw new HttpsError("not-found", "Profilo utente non trovato.");
    }

    const auth = getAuth();
    const authUser = await auth.getUser(input.targetUid);
    await auth.updateUser(input.targetUid, {
      disabled: !input.active,
    });
    await auth.setCustomUserClaims(input.targetUid, {
      ...(authUser.customClaims ?? {}),
      active: input.active,
      roles: input.roles,
    });

    const now = Timestamp.now();
    const batch = db.batch();
    batch.update(targetRef, {
      active: input.active,
      roles: input.roles,
      updatedAt: now,
      updatedBy: request.auth.uid,
      accessVersion: Number(target.data()?.accessVersion ?? 0) + 1,
    });
    batch.create(db.collection("auditLogs").doc(), {
      action: input.active ? "user.access.update" : "user.access.revoke",
      entityType: "user",
      entityId: input.targetUid,
      actorUid: request.auth.uid,
      changes: {
        active: {
          from: target.data()?.active ?? null,
          to: input.active,
        },
        roles: {
          from: target.data()?.roles ?? [],
          to: input.roles,
        },
      },
      reason: input.reason,
      createdAt: now,
    });
    await batch.commit();
    return {
      uid: input.targetUid,
      active: input.active,
      roles: input.roles,
    };
  },
);
