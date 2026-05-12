import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);
const API = "http://localhost:8000";

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token    = localStorage.getItem("ts_token");
    const userData = localStorage.getItem("ts_user");
    if (token && userData) {
      try { setUser(JSON.parse(userData)); } catch {}
    }
    setLoading(false);
  }, []);

  const _save = (token, userData) => {
    localStorage.setItem("ts_token", token);
    localStorage.setItem("ts_user", JSON.stringify(userData));
    setUser(userData);
  };

  const login = async (username, password) => {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Login failed");
    _save(data.access_token, data.user);
    return data;
  };

  const register = async (username, email, password, confirmPassword) => {
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username, email,
        password, confirm_password: confirmPassword,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Registration failed");
    _save(data.access_token, data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("ts_token");
    localStorage.removeItem("ts_user");
    setUser(null);
  };

  const getToken = () => localStorage.getItem("ts_token");

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
