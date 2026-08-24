export default function KPICard({ label, value, sub, tone = "navy", loading }) {
  const toneClasses = {
    navy: "bg-navy text-white",
    teal: "bg-teal text-white",
    coral: "bg-red-50 text-coral border border-red-200",
    white: "bg-white text-slate-800 border border-slate-200",
  };

  if (loading) {
    return (
      <div className="rounded-xl p-5 bg-white border border-slate-200">
        <div className="skeleton h-3 w-24 mb-3" />
        <div className="skeleton h-7 w-32" />
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-5 shadow-sm ${toneClasses[tone] || toneClasses.white}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-2xl font-bold mt-2 tabular-nums">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-80">{sub}</p>}
    </div>
  );
}
