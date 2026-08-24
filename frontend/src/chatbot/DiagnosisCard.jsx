const SEVERITY_STYLES = {
  Mild: "bg-emerald-100 text-sage border-emerald-200",
  Moderate: "bg-amber-100 text-amber-700 border-amber-200",
  Severe: "bg-red-100 text-coral border-red-200",
};

export default function DiagnosisCard({ result, emergency, onReset, onFindHospitals }) {
  const confidencePct = Math.round((result.confidence || 0) * 100);

  return (
    <div className="max-w-[680px] mx-auto space-y-4">
      {emergency && (
        <div className="bg-red-600 text-white rounded-lg p-4 mb-4 border-l-4 border-red-900">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🚨</span>
            <span className="font-bold text-lg">EMERGENCY — Seek Help Immediately</span>
          </div>
          <p className="text-sm mb-3">
            Your symptoms may indicate a life-threatening condition.
            Call emergency services or go to the nearest hospital RIGHT NOW.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <a
              href="tel:112"
              className="bg-white text-red-600 font-bold text-center py-2 px-3 rounded-lg text-sm hover:bg-red-50"
            >
              📞 112 — National Emergency
            </a>
            <a
              href="tel:108"
              className="bg-white text-red-600 font-bold text-center py-2 px-3 rounded-lg text-sm hover:bg-red-50"
            >
              🚑 108 — Ambulance (EMRI)
            </a>
            <a
              href="tel:102"
              className="bg-white text-red-600 font-bold text-center py-2 px-3 rounded-lg text-sm hover:bg-red-50"
            >
              🚑 102 — Ambulance
            </a>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-2 text-sage font-semibold text-sm">
          <span>✅</span>
          <span>Analysis Complete</span>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Possible Condition</p>
          <h2 className="text-2xl font-bold text-navy">{result.disease}</h2>
          {result.source === 'local_model' && (
            <span className="inline-block mt-2 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
              🔄 Analyzed by Local AI Model
            </span>
          )}
          {result.source === 'gemini' && (
            <span className="inline-block mt-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
              ✨ Analyzed by Gemini AI
            </span>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Confidence</span>
            <span className="font-semibold">{confidencePct}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-teal rounded-full transition-all" style={{ width: `${confidencePct}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Severity:</span>
          <span
            className={`text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full border ${
              SEVERITY_STYLES[result.severity] || SEVERITY_STYLES.Moderate
            }`}
          >
            {result.severity}
          </span>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1">About this condition</p>
          <p className="text-sm text-slate-600 leading-relaxed">{result.description}</p>
        </div>

        {result.specialist && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">Recommended Specialist</p>
            <p className="text-sm font-medium text-navy">{result.specialist}</p>
          </div>
        )}

        {result.precautions?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">Precautions</p>
            <ul className="space-y-1.5">
              {result.precautions.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="text-sage mt-0.5">✓</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-400 italic flex items-start gap-1.5">
            <span>⚠️</span>
            <span>{result.disclaimer}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onReset}
          className="flex-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2.5 text-sm transition-colors"
        >
          🔄 Analyze Different Symptoms
        </button>
        <button
          onClick={onFindHospitals}
          className="flex-1 rounded-lg bg-teal hover:bg-teal-light text-white font-semibold py-2.5 text-sm transition-colors"
        >
          📍 Find Nearby Hospitals ↓
        </button>
      </div>
    </div>
  );
}
