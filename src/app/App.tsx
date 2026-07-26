import { useEffect, useState } from "react";
import { Dashboard } from "../features/dashboard/Dashboard";
import { DemoLogin } from "../features/auth/DemoLogin";
import { observeDemoSession, signOutDemo } from "../features/auth/authService";

export interface DemoUser {
  name: string;
  role: string;
  roles: string[];
}

export function App() {
  const [user, setUser] = useState<DemoUser | null>(null);

  useEffect(() => observeDemoSession(setUser), []);

  if (!user) {
    return <DemoLogin onLogin={setUser} />;
  }

  return (
    <Dashboard
      user={user}
      onLogout={() => {
        void signOutDemo();
        setUser(null);
      }}
    />
  );
}
