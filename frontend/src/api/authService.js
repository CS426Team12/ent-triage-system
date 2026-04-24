import axios from "axios";

const authClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

let accessToken = null; // store in memory (safe)

export const authService = {
  setAccessToken: (t) => (accessToken = t),
  getAccessToken: () => accessToken,

  async refreshToken() {
    const res = await authClient.post("/auth/refresh");
    accessToken = res.data.access_token;
    return accessToken;
  },

  logout() {
    accessToken = null;
  },
};
