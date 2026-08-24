// Minimal hand-written line-icon set (no external icon library needed).
const PATHS = {
  dashboard: "M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6V11h-6v9zm0-16v5h6V4h-6z",
  cube: "M12 2l9 5v10l-9 5-9-5V7l9-5zM3 7l9 5m0 0l9-5m-9 5v10",
  schema: "M12 3a2 2 0 100 4 2 2 0 000-4zM5 17a2 2 0 100 4 2 2 0 000-4zm14 0a2 2 0 100 4 2 2 0 000-4zM12 7v5m0 0l-5.5 4M12 12l5.5 5",
  tables: "M3 5h18M3 12h18M3 19h18M8 5v14M16 5v14",
  tools: "M14.7 6.3a4 4 0 00-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-2.65 2.65a1 1 0 01-1.4 0l-1.35-1.35a1 1 0 010-1.4L14.7 6.3z",
  mining: "M12 2l3 6 6 .9-4.5 4.3 1 6.3L12 16l-5.5 3.5 1-6.3L3 8.9 9 8l3-6z",
  monitoring: "M3 12h4l3 8 4-16 3 8h4",
  upload: "M12 16V4m0 0L7 9m5-5l5 5M4 20h16",
  chat: "M12 6v12M6 12h12M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.826L3 20l1.11-3.33A7.9 7.9 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m6 4l4 4m0 0l-4 4m4-4H9",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 6l12 12M6 18L18 6",
  chevron: "M15 6l-6 6 6 6",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0",
};

export default function Icon({ name, className = "w-5 h-5", strokeWidth = 2 }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

export const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/olap-cube", label: "OLAP Cube", icon: "cube" },
  { to: "/schema", label: "Schema", icon: "schema" },
  { to: "/tables", label: "Tables", icon: "tables" },
  { to: "/tools", label: "Tools", icon: "tools" },
  { to: "/mining", label: "Mining", icon: "mining" },
  { to: "/monitoring", label: "Monitoring", icon: "monitoring" },
  { to: "/upload", label: "Upload", icon: "upload" },
  { to: "/chatbot", label: "MediFind", icon: "chat" },
];

// What a "patient" (chatbot-only) account is allowed to see in the nav.
export const PATIENT_NAV_ITEMS = [{ to: "/chatbot", label: "MediFind", icon: "chat" }];

// Extra nav item shown only to "admin" accounts — analysts never see it,
// and the endpoint it links to is separately gated server-side.
export const ADMIN_NAV_ITEMS = [...NAV_ITEMS, { to: "/admin/patients", label: "Patients", icon: "user" }];
