import { NavLink } from "react-router-dom";
import Icon, { NAV_ITEMS } from "./icons";

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile, navItems = NAV_ITEMS }) {
  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed md:sticky top-0 md:top-16 left-0 z-40
          h-screen md:h-[calc(100vh-4rem)]
          bg-navy-dark text-white flex flex-col
          transition-all duration-200 ease-in-out
          ${collapsed ? "md:w-16" : "md:w-56"}
          ${mobileOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0 w-64"}
        `}
      >
        <div className="flex items-center justify-between px-4 h-16 md:hidden border-b border-white/10">
          <span className="font-semibold">Menu</span>
          <button onClick={onCloseMobile} aria-label="Close menu">
            <Icon name="close" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto thin-scrollbar py-4 px-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                 ${isActive ? "bg-teal text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"}`
              }
              title={item.label}
            >
              <Icon name={item.icon} className="w-5 h-5 shrink-0" />
              <span className={collapsed ? "md:hidden" : ""}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button
          onClick={onToggleCollapse}
          className="hidden md:flex items-center justify-center gap-2 border-t border-white/10 py-3 text-slate-300 hover:text-white hover:bg-white/10 text-sm"
        >
          <Icon
            name="chevron"
            className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
          />
          {!collapsed && <span>Collapse</span>}
        </button>
      </aside>
    </>
  );
}
