import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);
const API = import.meta.env.VITE_API_URL;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("ts_token");
    const userData = localStorage.getItem("ts_user");

    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error("Failed to parse user data:", error);
      }
    }

    setLoading(false);
  }, []);

  const saveAuthData = (token, userData) => {
    localStorage.setItem("ts_token", token);
    localStorage.setItem("ts_user", JSON.stringify(userData));
    setUser(userData);
  };

  const login = async (username, password) => {
    const response = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Login failed");
    }

    saveAuthData(data.access_token, data.user);

    return data;
  };

  const register = async (
    username,
    email,
    password,
    confirmPassword
  ) => {
    const response = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        email,
        password,
        confirm_password: confirmPassword,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Registration failed");
    }

    saveAuthData(data.access_token, data.user);

    return data;
  };

  const logout = () => {
    localStorage.removeItem("ts_token");
    localStorage.removeItem("ts_user");
    setUser(null);
  };

  const getToken = () => {
    return localStorage.getItem("ts_token");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        loading,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);