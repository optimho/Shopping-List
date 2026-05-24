import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../app";

export default function Nav() {
  const { user, setUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const isAdmin = user?.role === "admin";

  async function handleSignOut() {
    await fetch("/api/auth/sign-out", { method: "POST", credentials: "include" });
    setUser(null);
    navigate("/login");
  }

  const linkClass = (path: string) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      location.pathname === path || (path !== "/" && location.pathname.startsWith(path))
        ? "bg-indigo-700 text-white"
        : "text-indigo-100 hover:bg-indigo-600 hover:text-white"
    }`;

  return (
    <nav className="bg-indigo-800 shadow-md">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-1">
            <Link to="/" className="text-white font-bold text-lg mr-4">
              Shopping List
            </Link>
            <div className="hidden sm:flex items-center gap-1">
              <Link to="/" className={linkClass("/")}>Dashboard</Link>
              <Link to="/list" className={linkClass("/list")}>Shopping List</Link>
              <Link to="/cupboard" className={linkClass("/cupboard")}>Cupboard</Link>
              <Link to="/store" className={linkClass("/store")}>Store</Link>
              {isAdmin && (
                <>
                  <Link to="/users" className={linkClass("/users")}>Users</Link>
                  <Link to="/admin/events" className={linkClass("/admin/events")}>Events</Link>
                  <Link to="/admin/database" className={linkClass("/admin/database")}>Database</Link>
                </>
              )}
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <span className="text-indigo-200 text-sm">{user?.name}</span>
            <button
              onClick={handleSignOut}
              className="text-indigo-200 hover:text-white text-sm px-3 py-1 rounded border border-indigo-500 hover:border-indigo-300 transition-colors"
            >
              Sign out
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="sm:hidden text-indigo-100 hover:text-white p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="sm:hidden pb-3 flex flex-col gap-1">
            <Link to="/" className={linkClass("/")} onClick={() => setMenuOpen(false)}>Dashboard</Link>
            <Link to="/list" className={linkClass("/list")} onClick={() => setMenuOpen(false)}>Shopping List</Link>
            <Link to="/cupboard" className={linkClass("/cupboard")} onClick={() => setMenuOpen(false)}>Cupboard</Link>
            <Link to="/store" className={linkClass("/store")} onClick={() => setMenuOpen(false)}>Store</Link>
            {isAdmin && (
              <>
                <Link to="/users" className={linkClass("/users")} onClick={() => setMenuOpen(false)}>Users</Link>
                <Link to="/admin/events" className={linkClass("/admin/events")} onClick={() => setMenuOpen(false)}>Events</Link>
                <Link to="/admin/database" className={linkClass("/admin/database")} onClick={() => setMenuOpen(false)}>Database</Link>
              </>
            )}
            <div className="border-t border-indigo-600 mt-2 pt-2 flex items-center justify-between">
              <span className="text-indigo-200 text-sm">{user?.name}</span>
              <button onClick={handleSignOut} className="text-indigo-200 text-sm hover:text-white">
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
