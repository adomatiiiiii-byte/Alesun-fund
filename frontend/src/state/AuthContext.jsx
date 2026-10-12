import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api";
import { isTokenExpired } from "../utils/authSession";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("alesun_token"));
  const [user, setUser] = useState(
    localStorage.getItem("alesun_user")
      ? JSON.parse(localStorage.getItem("alesun_user"))
      : null
  );

  useEffect(() => {
    if (!token) return;
    if (isTokenExpired(token)) {
      logout("timeout");
      return;
    }
    api.me(token)
      .then((data) => {
        setUser(data.user);
        localStorage.setItem("alesun_user", JSON.stringify(data.user));
      })
      .catch(() => logout());
  }, [token]);

  const login = (auth) => {
    setToken(auth.token);
    setUser(auth.user);
    localStorage.setItem("alesun_token", auth.token);
    localStorage.setItem("alesun_user", JSON.stringify(auth.user));
  };

  const logout = async (reason = "manual") => {
    if (token) {
      await api.logout(token, { reason }).catch(() => {});
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem("alesun_token");
    localStorage.removeItem("alesun_user");
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
