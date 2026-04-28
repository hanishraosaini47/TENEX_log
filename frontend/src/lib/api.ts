import axios from "axios";

// Points to the FastAPI backend. Override with VITE_API_URL if needed.
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({ baseURL });

// Attach token from localStorage on every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("soc_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, drop the token so the user is forced back to /login.
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("soc_token");
      localStorage.removeItem("soc_user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);
