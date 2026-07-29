import { useEffect, useState, type FormEvent } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../firebase/client";

interface UserAccess {
  uid: string;
  displayName: string;
  active: boolean;
  roles: string[];
}

const roleLabels: Record<string, string> = {
  admin: "Amministratore",
  workshop_manager: "Responsabile ciclofficina",
  operator: "Operatore",
  volunteer: "Volontario",
  treasurer: "Tesoriere",
  read_only: "Sola lettura",
};

export function UserAccessRegistry() {
  const [users, setUsers] = useState<UserAccess[]>([]);
  const [selected, setSelected] = useState<UserAccess | null>(null);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState(false);
  useEffect(() => onSnapshot(
    query(collection(db, "users"), orderBy("displayName")),
    (snapshot) => {
      const nextUsers = snapshot.docs.map((item) => ({
        uid: item.id,
        displayName: String(item.data().displayName ?? "Utente senza nome"),
        active: item.data().active === true,
        roles: Array.isArray(item.data().roles) ? item.data().roles : [],
      }));
      if (nextUsers.length > 0 || !snapshot.metadata.fromCache) {
        setUsers(nextUsers);
      }
      setLoadError(snapshot.metadata.fromCache);
    },
    () => setLoadError(true),
  ), []);
  return <section aria-labelledby="users-title">
    <div className="section-heading"><div>
      <p className="eyebrow">Accessi e revoche</p>
      <h2 id="users-title">Utenti e ruoli</h2>
    </div></div>
    <p className="intro">
      Ogni modifica è applicata ad Authentication e Firestore e viene
      registrata nell’audit. Gli account disabilitati perdono l’accesso.
    </p>
    {loadError && <p className="notice-banner" role="alert">
      Connessione agli account non disponibile. I dati visibili possono
      provenire dalla cache: verifica gli emulatori prima di modificarli.
    </p>}
    {message && <p role="status">{message}</p>}
    <div className="registry-table-wrap"><table className="registry-table">
      <thead><tr><th>Utente</th><th>Ruoli</th><th>Account</th><th /></tr></thead>
      <tbody>{users.map((item) => <tr key={item.uid}>
        <td>{item.displayName}</td>
        <td>{item.roles.map((role) => roleLabels[role] ?? role).join(", ")}</td>
        <td>{item.active ? "Attivo" : "Disabilitato"}</td>
        <td><button className="text-button" type="button"
          onClick={() => setSelected(item)}>Gestisci</button></td>
      </tr>)}</tbody>
    </table></div>
    {selected && <AccessDialog user={selected}
      onClose={() => setSelected(null)}
      onSaved={() => {
        setSelected(null);
        setMessage("Accesso aggiornato e registrato nell’audit.");
      }} />}
  </section>;
}

function AccessDialog({ user, onClose, onSaved }: {
  user: UserAccess; onClose: () => void; onSaved: () => void;
}) {
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await httpsCallable(functions, "manageUserAccess")({
        targetUid: user.uid,
        active: data.get("active") === "on",
        roles: data.getAll("roles"),
        reason: String(data.get("reason")),
      });
      onSaved();
    } catch {
      setError("Aggiornamento negato o non riuscito.");
    }
  };
  return <div className="modal-backdrop"><div className="registration-dialog"
    role="dialog" aria-modal="true" aria-label="Gestisci accesso">
    <h2>Gestisci {user.displayName}</h2>
    <form onSubmit={submit}>
      <label><input type="checkbox" name="active"
        defaultChecked={user.active} /> Account attivo</label>
      <fieldset><legend>Ruoli autorizzati</legend>
        {Object.entries(roleLabels).map(([role, label]) =>
          <label key={role}><input type="checkbox" name="roles" value={role}
            defaultChecked={user.roles.includes(role)} /> {label}</label>)}
      </fieldset>
      <label>Motivazione<textarea name="reason" required minLength={10}
        maxLength={500} /></label>
      {error && <p role="alert">{error}</p>}
      <div className="dialog-actions">
        <button className="secondary-button" type="button"
          onClick={onClose}>Annulla</button>
        <button className="primary-button">Applica accesso</button>
      </div>
    </form>
  </div></div>;
}
