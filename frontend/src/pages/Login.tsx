import { FormEvent, useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import AuthLayout from "../components/AuthLayout";

export default function Login() {
  const { login, token } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("analyst");
  const [password, setPassword] = useState("analyst123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (token) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="sign in to your SOC workspace">
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
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <div className="text-xs text-gray-500 text-center pt-3 border-t border-border space-y-1">
          <div>
            Need an account?{" "}
            <Link to="/signup" className="text-accent hover:underline">
              Sign up
            </Link>
          </div>
        </div>
      </form>
    </AuthLayout>
  );
}
