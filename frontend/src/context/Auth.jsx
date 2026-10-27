import { createContext, useContext, useEffect, useState } from "react";
import api from "../api";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem("fc_token"));

  useEffect(() => {
    if (!localStorage.getItem("fc_token")) return;
    api.get("/auth/me").then((r) => setUser(r.data.user)).catch(() => localStorage.removeItem("fc_token")).finally(() => setLoading(false));
  }, []);

  const login = async (email, password, role) => {
    const { data } = await api.post("/auth/login", { email, password, role });
    localStorage.setItem("fc_token", data.token);
    setUser(data.user);
    return data.user;
  };
  const logout = () => { localStorage.removeItem("fc_token"); setUser(null); };

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}
