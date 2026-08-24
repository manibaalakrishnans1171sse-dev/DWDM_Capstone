import { useState } from "react";
import { predictSymptoms } from "../api/chatbot";
import { getErrorMessage } from "../api/axios";

const MIN_LOADING_MS = 1500;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function SymptomForm({ onPredicted }) {
  const [symptoms, setSymptoms] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!symptoms.trim()) return;

    if (!navigator.onLine) {
      setError("You appear to be offline. Please check your connection.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const [{ data, emergency }] = await Promise.all([
        predictSymptoms(symptoms.trim(), age ? Number(age) : null, gender || null),
        wait(MIN_LOADING_MS),
      ]);
      onPredicted?.(data, emergency);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 max-w-[680px] mx-auto">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-2xl">🩺</span>
        <h2 className="text-lg font-bold text-navy">Describe Your Symptoms</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          placeholder="e.g. I have fever, headache, body ache since 2 days..."
          rows={4}
          required
          disabled={loading}
          className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent resize-none disabled:bg-slate-50"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Age (optional)</label>
            <input
              type="number"
              min="0"
              max="120"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="30"
              disabled={loading}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Gender (optional)</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent disabled:bg-slate-50"
            >
              <option value="">Prefer not to say</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-coral text-sm px-4 py-3">{error}</div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-4">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-teal animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
            <p className="text-sm text-slate-500">Analyzing your symptoms...</p>
          </div>
        ) : (
          <button
            type="submit"
            disabled={!symptoms.trim()}
            className="w-full rounded-lg bg-navy hover:bg-navy-light text-white font-semibold py-3 text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            🔍 Analyze Symptoms
          </button>
        )}
      </form>
    </div>
  );
}
