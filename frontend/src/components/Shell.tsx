import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Shell({ children }: { children: ReactNode }) {
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-surface/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-accent/20 border border-accent/40 flex items-center justify-center">
              <span className="text-accent font-mono font-bold text-sm">S</span>
            </div>
            <div>
              <div className="font-semibold tracking-tight">SOC Log Analyzer</div>
              <div className="text-xs text-gray-400 font-mono">
                threat triage · anomaly detection
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            {username && (
              <span className="text-gray-400">
                signed in as <span className="text-gray-200 font-mono">{username}</span>
              </span>
            )}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded border border-border hover:border-accent hover:text-accent text-gray-300 transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">{children}</main>
      <footer className="border-t border-border text-center text-xs text-gray-500 py-4">
        SOC Log Analyzer · built for the Tenex.ai take-home
      </footer>
    </div>
  );
}
