import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  observeMembers,
  saveMember,
  type Member,
  type MemberStatus,
} from "./memberService";

const demoMembers: Member[] = [
  {
    id: "member-demo-0104",
    membershipNumber: "SOC-2026-0104",
    displayLabel: "Ada Demo",
    joinedOn: "2026-01-15",
    expiresOn: "2026-12-31",
    status: "Attivo",
    privacyConsent: true,
    email: "ada.demo@example.test",
    phone: "+39 000 000 0104",
    updatedLabel: "25 lug 2026, 10:00",
  },
  {
    id: "member-demo-0088",
    membershipNumber: "SOC-2025-0088",
    displayLabel: "Bruno Demo",
    joinedOn: "2025-02-10",
    expiresOn: "2025-12-31",
    status: "Scaduto",
    privacyConsent: true,
    email: "bruno.demo@example.test",
    phone: "",
    updatedLabel: "25 lug 2026, 10:00",
  },
];

export function MemberRegistry() {
  const [members, setMembers] = useState<Member[]>(
    import.meta.env.MODE === "test" ? demoMembers : [],
  );
  const [queryText, setQueryText] = useState("");
  const [status, setStatus] = useState("Tutti");
  const [editing, setEditing] = useState<Member | null | undefined>(undefined);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (import.meta.env.MODE === "test") return;
    return observeMembers(setMembers, () => {
      setMessage("Impossibile caricare il registro soci.");
    });
  }, []);

  const filtered = useMemo(() => members.filter((member) => {
    const matchesText = `${member.membershipNumber} ${member.displayLabel}`
      .toLowerCase().includes(queryText.toLowerCase());
    return matchesText && (status === "Tutti" || member.status === status);
  }), [members, queryText, status]);

  return (
    <section aria-labelledby="members-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Dati associativi minimizzati</p>
          <h2 id="members-title">Soci</h2>
        </div>
        <button className="secondary-button" type="button"
          onClick={() => setEditing(null)}>Registra socio</button>
      </div>
      <p className="intro">
        Tessera e stato sono separati dai contatti. Usare esclusivamente dati
        fittizi finché il modello privacy non sarà approvato.
      </p>
      <div className="registry-toolbar">
        <label>Cerca nel registro
          <input value={queryText} onChange={(event) =>
            setQueryText(event.target.value)} />
        </label>
        <label>Stato
          <select value={status} onChange={(event) =>
            setStatus(event.target.value)}>
            <option>Tutti</option>
            <option>Attivo</option><option>Scaduto</option>
            <option>Sospeso</option><option>Archiviato</option>
          </select>
        </label>
        <span className="result-count" role="status"
          aria-label={`${filtered.length} soci trovati`}>
          {filtered.length} risultati
        </span>
      </div>
      {message && <p role="alert">{message}</p>}
      <div className="registry-table-wrap">
        <table className="registry-table">
          <thead><tr><th>Tessera</th><th>Socio</th><th>Scadenza</th>
            <th>Stato</th><th>Contatti</th><th /></tr></thead>
          <tbody>{filtered.map((member) => (
            <tr key={member.id}>
              <td>{member.membershipNumber}</td><td>{member.displayLabel}</td>
              <td>{member.expiresOn}</td><td>{member.status}</td>
              <td>{member.email || "Non disponibile"}</td>
              <td><button className="text-button" type="button"
                aria-label={`Apri socio ${member.membershipNumber}`}
                onClick={() => setEditing(member)}>Apri</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {editing !== undefined && (
        <MemberDialog member={editing} onClose={() => setEditing(undefined)}
          onSaved={(result) => {
            setMessage(`Socio ${result.membershipNumber} registrato.`);
            setEditing(undefined);
          }} />
      )}
    </section>
  );
}

function MemberDialog({ member, onClose, onSaved }: {
  member: Member | null;
  onClose: () => void;
  onSaved: (result: { id: string; membershipNumber: string }) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true); setError("");
    try {
      const result = await saveMember({
        idempotencyKey: crypto.randomUUID(),
        memberId: member?.id,
        firstName: String(data.get("firstName")),
        lastName: String(data.get("lastName")),
        email: String(data.get("email")),
        phone: String(data.get("phone")),
        joinedOn: String(data.get("joinedOn")),
        expiresOn: String(data.get("expiresOn")),
        status: String(data.get("status")) as MemberStatus,
        privacyConsent: data.get("privacyConsent") === "on",
        reason: String(data.get("reason")),
      });
      onSaved(result);
    } catch {
      setError("Salvataggio non riuscito. Verificare dati e autorizzazioni.");
    } finally { setPending(false); }
  };
  const [firstName = "", ...lastParts] = member?.displayLabel.split(" ") ?? [];
  return <div className="modal-backdrop">
    <div className="registration-dialog" role="dialog" aria-modal="true"
      aria-label={member ? "Modifica socio" : "Registra socio"}>
      <h2>{member ? "Modifica socio" : "Registra socio"}</h2>
      <form className="registration-form" onSubmit={submit}>
        <label>Nome<input name="firstName" required maxLength={80}
          defaultValue={firstName} /></label>
        <label>Cognome<input name="lastName" required maxLength={80}
          defaultValue={lastParts.join(" ")} /></label>
        <label>Email fittizia<input name="email" type="email" maxLength={160}
          defaultValue={member?.email} /></label>
        <label>Telefono fittizio<input name="phone" maxLength={40}
          defaultValue={member?.phone} /></label>
        <label>Data iscrizione<input name="joinedOn" type="date" required
          defaultValue={member?.joinedOn ?? "2026-01-01"} /></label>
        <label>Scadenza tessera<input name="expiresOn" type="date" required
          defaultValue={member?.expiresOn ?? "2026-12-31"} /></label>
        <label>Stato<select name="status" defaultValue={member?.status ?? "Attivo"}>
          <option>Attivo</option><option>Scaduto</option>
          <option>Sospeso</option><option>Archiviato</option>
        </select></label>
        <label><input name="privacyConsent" type="checkbox"
          defaultChecked={member?.privacyConsent ?? false} />
          Consenso privacy registrato</label>
        <label className="wide-field">Motivazione
          <textarea name="reason" required minLength={10} maxLength={500} />
        </label>
        {error && <p className="wide-field" role="alert">{error}</p>}
        <div className="dialog-actions wide-field">
          <button className="secondary-button" type="button"
            onClick={onClose}>Annulla</button>
          <button className="primary-button" disabled={pending}>
            {pending ? "Salvataggio…" : "Salva socio"}
          </button>
        </div>
      </form>
    </div>
  </div>;
}
