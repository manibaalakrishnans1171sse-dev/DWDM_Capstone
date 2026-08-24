import { useEffect, useState, useCallback, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import ErrorState from "../components/ErrorState";
import { getModelLog, getLatestStats } from "../api/monitoring";
import { getErrorMessage } from "../api/axios";
import { formatNumber } from "../lib/format";

const MODEL_ROW_STYLES = {
  decision_tree: "bg-blue-50",
  kmeans: "bg-emerald-50",
  association_rules: "bg-amber-50",
};

const MODEL_LABELS = {
  decision_tree: "Decision Tree",
  kmeans: "K-Means",
  association_rules: "Association Rules",
};

function shortDate(iso) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" }) : "—";
}

export default function MonitoringPage() {
  const [log, setLog] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([getModelLog(), getLatestStats()])
      .then(([l, s]) => {
        setLog(l);
        setStats(s);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Two charts, not one dual-axis chart: accuracy & silhouette share a 0-1
  // scale, but rules count is a very different magnitude (0-30) — plotting it
  // on the same axis would flatten it to an unreadable line near zero.
  const { qualityData, rulesData } = useMemo(() => {
    if (!log) return { qualityData: [], rulesData: [] };

    const qualityPoints = log
      .filter((r) => r.model_name === "decision_tree" || r.model_name === "kmeans")
      .sort((a, b) => new Date(a.run_timestamp) - new Date(b.run_timestamp))
      .map((r) => ({
        label: shortDate(r.run_timestamp),
        accuracy: r.model_name === "decision_tree" ? r.accuracy : null,
        silhouette: r.model_name === "kmeans" ? r.silhouette : null,
      }));

    const rulesPoints = log
      .filter((r) => r.model_name === "association_rules")
      .sort((a, b) => new Date(a.run_timestamp) - new Date(b.run_timestamp))
      .map((r) => ({ label: shortDate(r.run_timestamp), num_rules: r.num_rules }));

    return { qualityData: qualityPoints, rulesData: rulesPoints };
  }, [log]);

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Monitoring</h1>
        <p className="text-sm text-slate-500">Model performance tracked across pipeline runs</p>
      </div>

      <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2.5">
        Model performance tracked across <strong>KNIME workflow runs</strong>. Each row below = one KNIME pipeline
        execution.
      </div>

      {/* Latest stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          loading={loading}
          color="#2653A6"
          label="Decision Tree"
          value={stats ? `${(stats.decision_tree.accuracy * 100).toFixed(0)}%` : ""}
          sub={stats ? `Trained on ${formatNumber(stats.decision_tree.rows_trained)} rows` : ""}
          date={stats?.decision_tree.last_run}
        />
        <StatCard
          loading={loading}
          color="#10B981"
          label="K-Means"
          value={stats ? stats.kmeans.silhouette.toFixed(2) : ""}
          sub={stats ? `Trained on ${formatNumber(stats.kmeans.rows_trained)} rows` : ""}
          date={stats?.kmeans.last_run}
        />
        <StatCard
          loading={loading}
          color="#F59E0B"
          label="Association Rules"
          value={stats ? `${stats.association_rules.num_rules} rules` : ""}
          sub={stats ? `Trained on ${formatNumber(stats.association_rules.rows_trained)} rows` : ""}
          date={stats?.association_rules.last_run}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Model Quality Over Time</h3>
          <p className="text-xs text-slate-400 mb-2">Decision Tree accuracy &amp; K-Means silhouette (0-1 scale)</p>
          {loading || !log ? (
            <div className="skeleton h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={qualityData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis domain={[0, 1]} tick={{ fill: "#64748b", fontSize: 12 }} width={36} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="accuracy" name="DT Accuracy" stroke="#2653A6" strokeWidth={2} connectNulls dot={{ r: 4 }} />
                <Line type="monotone" dataKey="silhouette" name="KMeans Silhouette" stroke="#10B981" strokeWidth={2} connectNulls dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Association Rules Count Over Time</h3>
          <p className="text-xs text-slate-400 mb-2">Number of rules discovered per run</p>
          {loading || !log ? (
            <div className="skeleton h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={rulesData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis domain={[0, 30]} tick={{ fill: "#64748b", fontSize: 12 }} width={36} />
                <Tooltip />
                <Line type="monotone" dataKey="num_rules" name="Rules Found" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Model log table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto thin-scrollbar">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Model", "Run Timestamp", "Accuracy", "Silhouette", "Rules", "Rows Trained", "Notes"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-semibold text-slate-600 border-b border-slate-200 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading || !log
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="skeleton h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              : log.map((r) => (
                  <tr key={r.log_id} className={MODEL_ROW_STYLES[r.model_name] || "bg-white"}>
                    <td className="px-4 py-2.5 font-medium text-slate-800 whitespace-nowrap">
                      {MODEL_LABELS[r.model_name] || r.model_name}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{shortDate(r.run_timestamp)}</td>
                    <td className="px-4 py-2.5 tabular-nums">{r.accuracy !== null ? `${(r.accuracy * 100).toFixed(0)}%` : "—"}</td>
                    <td className="px-4 py-2.5 tabular-nums">{r.silhouette !== null ? r.silhouette.toFixed(2) : "—"}</td>
                    <td className="px-4 py-2.5 tabular-nums">{r.num_rules ?? "—"}</td>
                    <td className="px-4 py-2.5 tabular-nums">{formatNumber(r.rows_trained)}</td>
                    <td className="px-4 py-2.5 text-slate-500 max-w-xs truncate" title={r.notes}>
                      {r.notes}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, date, color, loading }) {
  if (loading) {
    return (
      <div className="rounded-xl bg-white border border-slate-200 p-4">
        <div className="skeleton h-3 w-24 mb-3" />
        <div className="skeleton h-6 w-20 mb-2" />
        <div className="skeleton h-3 w-32" />
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-4 border-l-4" style={{ borderLeftColor: color }}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1 tabular-nums">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
      <p className="text-[11px] text-slate-400 mt-1">Last run: {shortDate(date)}</p>
    </div>
  );
}
