import { NavLink, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import Icon, { NAV_ITEMS } from "./icons";
import { getStoredUser, logout } from "../api/auth";

export default function Navbar({ onMenuClick, navItems = NAV_ITEMS }) {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const homeLink = user?.role === "patient" ? "/chatbot" : "/dashboard";

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <header className="sticky top-0 z-50 h-16 bg-navy text-white flex items-center px-4 gap-4 shadow-md">
      <button
        className="md:hidden p-2 -ml-2 rounded hover:bg-white/10"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Icon name="menu" />
      </button>

      <NavLink to={homeLink} className="flex items-center gap-2 shrink-0">
        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-teal">
          <Icon name="upload" className="hidden" />
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 20V10M12 20V4M18 20v-7" strokeLinecap="round" />
          </svg>
        </span>
        <span className="font-bold tracking-tight hidden sm:inline">Adaptive BI</span>
      </NavLink>

      <nav className="hidden lg:flex items-center gap-1 mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive ? "bg-white/15 text-white" : "text-slate-200 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="relative ml-auto" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full hover:bg-white/10 pl-2 pr-1 py-1"
        >
          <span className="hidden sm:inline text-sm text-slate-200">{user?.full_name || "User"}</span>
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gold text-navy text-xs font-bold">
            {initials}
          </span>
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white text-slate-800 rounded-lg shadow-lg border border-slate-200 py-1 overflow-hidden">
            <div className="px-4 py-2 border-b border-slate-100">
              <p className="text-sm font-semibold truncate">{user?.full_name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              <span className="inline-block mt-1 text-[10px] uppercase tracking-wide font-semibold text-teal bg-teal/10 px-2 py-0.5 rounded">
                {user?.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-coral hover:bg-slate-50"
            >
              <Icon name="logout" className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
