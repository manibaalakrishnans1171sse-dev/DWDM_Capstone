import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isTokenValid, logout, getStoredUser } from "../api/auth";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { NAV_ITEMS, ADMIN_NAV_ITEMS } from "./icons";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!isTokenValid()) {
    logout();
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  const role = getStoredUser()?.role;

  // "patient" accounts exist only to use MediFind — every other protected
  // page bounces them straight back there (also enforced server-side by
  // require_roles on each router, so this isn't just a UI-level restriction).
  if (role === "patient") {
    return <Navigate to="/chatbot" replace />;
  }

  // Admin-only pages (e.g. patient registration) bounce analysts back to
  // the dashboard — also enforced server-side via require_roles("admin").
  if (adminOnly && role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  const navItems = role === "admin" ? ADMIN_NAV_ITEMS : NAV_ITEMS;

  return (
    <div className="min-h-screen bg-page">
      <Navbar onMenuClick={() => setMobileOpen(true)} navItems={navItems} />
      <div className="flex">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          navItems={navItems}
        />
        <main className="flex-1 min-w-0 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
