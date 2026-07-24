import { type FormEvent, useState } from "react";
import type { DemoUser } from "../../app/App";

interface DemoLoginProps {
  onLogin: (user: DemoUser) => void;
}

export function DemoLogin({ onLogin }: DemoLoginProps) {
  const [email, setEmail] = useState("responsabile@example.test");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onLogin({
      name: "Giulia Demo",
      role: "Responsabile ciclofficina",
    });
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
          <span>L'accesso è locale e non è collegato a Firebase.</span>
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
            defaultValue="prototipo"
            required
          />

          <button className="primary-button" type="submit">
            Entra nel prototipo
          </button>
        </form>

        <p className="login-help">
          Le credenziali visualizzate sono fittizie e funzionano soltanto per
          questa dimostrazione.
        </p>
      </section>
    </main>
  );
}
