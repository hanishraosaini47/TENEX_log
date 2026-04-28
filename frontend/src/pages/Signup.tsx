import { FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import AuthLayout from "../components/AuthLayout";

export default function Signup() {
  const { token } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already logged in? Bounce home.
  if (token) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Hit the signup endpoint
      const { data } = await api.post("/auth/signup", { username, password });
      // Auto-login: persist the returned token + username
      localStorage.setItem("soc_token", data.access_token);
      localStorage.setItem("soc_user", data.username);
      // Hard reload so AuthContext picks up the new token cleanly
      window.location.href = "/";
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        // Pydantic 422 returns a list of issues
        setError(detail.map((d: any) => d.msg).join("; "));
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError("Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create an account" subtitle="register to upload and analyze logs">
      <form
        onSubmit={onSubmit}
        className="bg-surface/80 backdrop-blur border border-border rounded-xl p-6 space-y-4 shadow-2xl"
      >
        <div>
          <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">
            Username
          </label>
          <input
            className="w-full bg-panel border border-border rounded-lg px-3.5 py-2.5 font-mono text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="3-64 chars · letters, digits, _ . -"
            autoFocus
            required
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">
            Password
          </label>
          <input
            type="password"
            className="w-full bg-panel border border-border rounded-lg px-3.5 py-2.5 font-mono text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="at least 6 characters"
            required
          />
        </div>

        {error && (
          <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2.5 flex items-start gap-2">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-accent to-blue-500 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition shadow-lg shadow-accent/20"
        >
          {loading ? "Creating account…" : "Sign up"}
        </button>

        <div className="text-xs text-gray-500 text-center pt-3 border-t border-border">
          Already have an account?{" "}
          <Link to="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
