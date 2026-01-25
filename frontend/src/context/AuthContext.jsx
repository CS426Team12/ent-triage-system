import { createContext, useContext, useState, useEffect } from "react";
import apiClient from "../api/axios";
import { authService } from "../api/authService";
import LoadingSpinner from "../components/LoadingSpinner";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, try to restore session
  useEffect(() => {
    const restoreSession = async () => {
      // If access token exists, fetch user
      if (authService.getAccessToken()) {
        await fetchUser();
        setLoading(false);
        return;
      }
      // Otherwise, try to refresh token
      try {
        const token = await authService.refreshToken(); // refresh token from cookie
        authService.setAccessToken(token);
        await fetchUser();
      } catch (err) {
        console.log("Not logged in:", err);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  // Login
  const login = async (email, password) => {
    const response = await apiClient.post("/auth/login", { email, password });
    const accessToken = response.data.access_token;
    authService.setAccessToken(accessToken);
    await fetchUser();
  };

  const fetchUser = async () => {
    const user = await apiClient.get("/auth/me");
    setUser(user.data);
  };

  // Logout
  const logout = async () => {
    await apiClient.post("/auth/logout");
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {loading ? <LoadingSpinner /> : children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
