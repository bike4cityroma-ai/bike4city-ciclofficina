import { type FormEvent, useState } from "react";
import type { DemoUser } from "../../app/App";
import { signInDemo } from "./authService";

interface DemoLoginProps {
  onLogin: (user: DemoUser) => void;
}

export function DemoLogin({ onLogin }: DemoLoginProps) {
  const [email, setEmail] = useState("responsabile@example.test");
  const [password, setPassword] = useState("Demo-Ciclofficina-2026!");
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
        "Accesso non riuscito. Controlla le credenziali demo e verifica che gli emulatori e l’account fittizio siano disponibili.",
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
          <strong>Ambiente demo</strong>
          <span>L’accesso usa Firebase Auth Emulator, solo in locale.</span>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email dimostrativa</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">Password dimostrativa</label>
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
            {pending ? "Accesso in corso…" : "Entra nel prototipo"}
          </button>
        </form>

        <p className="login-help">
          Le credenziali visualizzate sono fittizie e funzionano soltanto per
          questa dimostrazione locale.
        </p>
      </section>
    </main>
  );
}
