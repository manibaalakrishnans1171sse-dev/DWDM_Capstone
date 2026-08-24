const TABLEAU_URL = import.meta.env.VITE_TABLEAU_EMBED_URL || "";

export default function TableauEmbed({ height = 600 }) {
  if (!TABLEAU_URL) {
    return (
      <div
        className="w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-2 text-center px-6"
        style={{ height }}
      >
        <svg viewBox="0 0 24 24" className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 3v18h18M7 15l4-6 3 4 5-8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-sm font-medium text-slate-500">Tableau dashboard will be embedded here</p>
        <p className="text-xs text-slate-400 max-w-sm">
          Publish your dashboard to Tableau Public, then set{" "}
          <code className="bg-slate-200 px-1 rounded">VITE_TABLEAU_EMBED_URL</code> in frontend/.env.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl overflow-hidden border border-slate-200" style={{ height }}>
      <iframe src={TABLEAU_URL} width="100%" height={height} frameBorder="0" title="Tableau Dashboard" />
    </div>
  );
}
