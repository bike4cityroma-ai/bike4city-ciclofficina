import { useState } from "react";
import { Dashboard } from "../features/dashboard/Dashboard";
import { DemoLogin } from "../features/auth/DemoLogin";

export interface DemoUser {
  name: string;
  role: "Responsabile ciclofficina";
}

export function App() {
  const [user, setUser] = useState<DemoUser | null>(null);

  if (!user) {
    return <DemoLogin onLogin={setUser} />;
  }

  return <Dashboard user={user} onLogout={() => setUser(null)} />;
}
