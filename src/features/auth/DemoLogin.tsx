import { type FormEvent, useState } from "react";
import type { DemoUser } from "../../app/App";
import { signInDemo } from "./authService";

interface DemoLoginProps {
  onLogin: (user: DemoUser) => void;
}

export function DemoLogin({ onLogin }: DemoLoginProps) {
  const usesEmulators =
    import.meta.env.VITE_USE_FIREBASE_EMULATORS !== "false";
  const [email, setEmail] = useState(
    usesEmulators ? "responsabile@example.test" : "",
  );
  const [password, setPassword] = useState(
    usesEmulators ? "Demo-Ciclofficina-2026!" : "",
  );
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      onLogin(await signInDemo(email, password));
    } catch {
      setError(
        usesEmulators
          ? "Accesso non riuscito. Controlla le credenziali demo e verifica che gli emulatori e l’account fittizio siano disponibili."
          : "Accesso non riuscito. Controlla le credenziali dell’account fittizio di staging.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true">
          B4C
        </div>
        <p className="eyebrow">InControPedale</p>
        <h1 id="login-title">Gestionale ciclofficina</h1>
        <p className="intro">
          Accedi al prototipo dimostrativo. In questa fase non vengono usati o
          salvati dati personali reali.
        </p>

        <div className="demo-notice" role="note">
          <strong>
            {usesEmulators ? "Ambiente demo" : "Ambiente staging"}
          </strong>
          <span>
            {usesEmulators
              ? "L’accesso usa Firebase Auth Emulator, solo in locale."
              : "Usare esclusivamente account fittizi autorizzati per il collaudo."}
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">
            {usesEmulators ? "Email dimostrativa" : "Email account fittizio"}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">
            {usesEmulators ? "Password dimostrativa" : "Password"}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error && <p role="alert">{error}</p>}

          <button className="primary-button" type="submit" disabled={pending}>
            {pending
              ? "Accesso in corso…"
              : usesEmulators
                ? "Entra nel prototipo"
                : "Accedi allo staging"}
          </button>
        </form>

        <p className="login-help">
          {usesEmulators
            ? "Le credenziali visualizzate sono fittizie e funzionano soltanto per questa dimostrazione locale."
            : "Non inserire dati personali reali durante il collaudo."}
        </p>
      </section>
    </main>
  );
}
