import { useState } from "react";

export default function RankingExplainer() {
  const [open, setOpen] = useState(false);

  return (
    <div className="max-w-[680px] mx-auto bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <span className="flex items-center gap-2">
          <span>ℹ️</span>
          How hospitals are ranked
        </span>
        <span className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
      </button>

      {open && (
        <div className="px-4 pb-4 text-sm text-slate-600 space-y-3 border-t border-slate-100 pt-3">
          <p>Our ranking combines three factors:</p>
          <ul className="space-y-1.5">
            <li className="flex items-center gap-2">
              <span>⭐</span>
              <span><strong>Rating (40%)</strong> — hospital rating out of 5 stars</span>
            </li>
            <li className="flex items-center gap-2">
              <span>📍</span>
              <span><strong>Distance (40%)</strong> — Closer hospitals ranked higher</span>
            </li>
            <li className="flex items-center gap-2">
              <span>🕐</span>
              <span><strong>Availability (20%)</strong> — Open hospitals ranked higher</span>
            </li>
          </ul>
          <code className="block text-xs bg-slate-50 border border-slate-200 rounded-md p-2.5 text-slate-500">
            Score = (Rating/5 × 40) + (Proximity score × 40) + (Open × 20)
          </code>
        </div>
      )}
    </div>
  );
}
