import { createContext, useContext, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Nav from "./components/Nav";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ShoppingList from "./pages/ShoppingList";
import Pantry from "./pages/Pantry";
import PantryItem from "./pages/PantryItem";
import Users from "./pages/Users";
import Events from "./pages/admin/Events";
import Database from "./pages/admin/Database";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  setUser: (u: User | null) => void;
}

export const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  setUser: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500">Loading…</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/" replace />;

  return <>{children}</>;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/get-session", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.user) setUser(data.user as User);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser }}>
      <div className="min-h-screen bg-gray-50">
        {user && <Nav />}
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/list" element={<ProtectedRoute><ShoppingList /></ProtectedRoute>} />
          <Route path="/pantry" element={<ProtectedRoute><Pantry /></ProtectedRoute>} />
          <Route path="/pantry/:id" element={<ProtectedRoute><PantryItem /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute adminOnly><Users /></ProtectedRoute>} />
          <Route path="/admin/events" element={<ProtectedRoute adminOnly><Events /></ProtectedRoute>} />
          <Route path="/admin/database" element={<ProtectedRoute adminOnly><Database /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AuthContext.Provider>
  );
}
