import { createContext, useContext, useState, ReactNode } from "react";
import { api } from "../lib/api";

interface AuthContextValue {
  username: string | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("soc_token")
  );
  const [username, setUsername] = useState<string | null>(() =>
    localStorage.getItem("soc_user")
  );

  const login = async (u: string, p: string) => {
    const { data } = await api.post("/auth/login", { username: u, password: p });
    localStorage.setItem("soc_token", data.access_token);
    localStorage.setItem("soc_user", data.username);
    setToken(data.access_token);
    setUsername(data.username);
  };

  const logout = () => {
    localStorage.removeItem("soc_token");
    localStorage.removeItem("soc_user");
    setToken(null);
    setUsername(null);
  };

  return (
    <AuthContext.Provider value={{ token, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
