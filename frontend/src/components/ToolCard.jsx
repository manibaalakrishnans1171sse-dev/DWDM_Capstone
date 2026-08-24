const CATEGORY_COLORS = {
  Database: "bg-blue-100 text-blue-700",
  "ETL / Data Processing": "bg-amber-100 text-amber-700",
  "Machine Learning": "bg-purple-100 text-purple-700",
  "Data Mining": "bg-pink-100 text-pink-700",
  Backend: "bg-teal-100 text-teal",
  "Frontend / Visualization": "bg-indigo-100 text-indigo-700",
  Geolocation: "bg-emerald-100 text-emerald-700",
};

export default function ToolCard({ name, initial, category, purpose, output, accent = "#0F2557" }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span
            className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-lg shrink-0"
            style={{ backgroundColor: accent }}
          >
            {initial}
          </span>
          <h3 className="text-sm font-semibold text-slate-800 leading-tight">{name}</h3>
        </div>
      </div>
      <span
        className={`self-start text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded ${
          CATEGORY_COLORS[category] || "bg-slate-100 text-slate-600"
        }`}
      >
        {category}
      </span>
      <p className="text-xs text-slate-600 leading-relaxed flex-1">{purpose}</p>
      <div className="border-t border-slate-100 pt-2">
        <p className="text-[11px] font-semibold text-teal">Output</p>
        <p className="text-xs text-slate-500">{output}</p>
      </div>
    </div>
  );
}
