import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Upload from "./pages/Upload";
import Results from "./pages/Results";

/**
 * Landing route at "/".
 *  - If a token exists, render the Upload page.
 *  - If not, redirect to /signup (first-time-friendly entry).
 */
function Landing() {
  const { token } = useAuth();
  if (!token) return <Navigate to="/signup" replace />;
  return <Upload />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* "/" decides where to go based on auth state */}
          <Route path="/" element={<Landing />} />

          {/* Authenticated pages go through ProtectedRoute */}
          <Route
            path="/results/:id"
            element={
              <ProtectedRoute>
                <Results />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
