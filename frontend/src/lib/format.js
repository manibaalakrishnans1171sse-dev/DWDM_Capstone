export function formatCrore(amount) {
  const value = Number(amount) || 0;
  const crore = value / 1e7;
  return `₹${crore.toFixed(2)} Cr`;
}

export function formatINR(amount) {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompactINR(amount) {
  const value = Number(amount) || 0;
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(2)}Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(2)}L`;
  if (value >= 1e3) return `₹${(value / 1e3).toFixed(1)}K`;
  return `₹${value.toFixed(0)}`;
}

export function formatNumber(n) {
  return new Intl.NumberFormat("en-IN").format(Number(n) || 0);
}

// Brand navy (#0F2557) is near-black at low chroma — great for UI chrome, but it
// fails the categorical chart palette's lightness/chroma checks (reads as gray,
// not "navy"). #2653A6 is the same hue lightened for use as a *data mark* color;
// true navy stays reserved for chrome (Navbar/Sidebar/headings).
export const CHART_COLORS = {
  navy: "#2653A6",
  teal: "#0D9488",
  gold: "#F59E0B",
  coral: "#EF4444",
  sage: "#10B981",
};

// Fixed categorical order — validated with scripts/validate_palette.js (dataviz skill).
// Assign by position, never cycle/reassign when a filter changes series count.
export const CHART_PALETTE = ["#2653A6", "#0D9488", "#F59E0B", "#EF4444", "#10B981", "#6366F1", "#EC4899", "#84CC16"];
