import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import KPICard from "../components/KPICard";
import ChartCard from "../components/ChartCard";
import TableauEmbed from "../components/TableauEmbed";
import ChartSkeleton from "../components/ChartSkeleton";
import ErrorState from "../components/ErrorState";
import {
  getKpis,
  getRevenueByDept,
  getMonthlyTrend,
  getVisitTypes,
  getPaymentModes,
  getAgeGroups,
  getSummaryStats,
} from "../api/dashboard";
import { getErrorMessage } from "../api/axios";
import { formatCrore, formatCompactINR, formatNumber, CHART_COLORS, CHART_PALETTE } from "../lib/format";

const GRID_STROKE = "#e2e8f0";
const AXIS_TICK = { fill: "#64748b", fontSize: 12 };

function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      {label && <p className="font-semibold text-slate-700 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.payload?.fill }} className="font-medium">
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [revByDept, setRevByDept] = useState(null);
  const [monthlyTrend, setMonthlyTrend] = useState(null);
  const [visitTypes, setVisitTypes] = useState(null);
  const [paymentModes, setPaymentModes] = useState(null);
  const [ageGroups, setAgeGroups] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [k, r, m, v, p, a, s] = await Promise.all([
        getKpis(),
        getRevenueByDept(),
        getMonthlyTrend(),
        getVisitTypes(),
        getPaymentModes(),
        getAgeGroups(),
        getSummaryStats(),
      ]);
      setKpis(k);
      setRevByDept(r);
      setMonthlyTrend(m);
      setVisitTypes(v);
      setPaymentModes(p);
      setAgeGroups(a);
      setSummary(s);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-navy mb-4">Dashboard</h1>
        <ErrorState message={error} onRetry={loadAll} />
      </div>
    );
  }

  const outstandingIsHigh = kpis && kpis.outstanding_pct > 20;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Dashboard</h1>
        <p className="text-sm text-slate-500">Hospital revenue, billing, and patient overview</p>
      </div>

      <TableauEmbed height={600} />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Revenue" value={kpis ? formatCrore(kpis.total_revenue) : ""} tone="navy" loading={loading} />
        <KPICard label="Total Collected" value={kpis ? formatCrore(kpis.total_collected) : ""} tone="teal" loading={loading} />
        <KPICard
          label="Outstanding"
          value={kpis ? formatCrore(kpis.outstanding) : ""}
          sub={kpis ? `${kpis.outstanding_pct}% of billed` : ""}
          tone={outstandingIsHigh ? "coral" : "white"}
          loading={loading}
        />
        <KPICard label="Total Patients" value={kpis ? formatNumber(kpis.total_patients) : ""} tone="white" loading={loading} />
      </div>

      {/* Tool attribution strip */}
      <div className="rounded-lg bg-slate-100 border border-slate-200 px-4 py-2.5 text-xs text-slate-500 text-center">
        Powered by:{" "}
        <span className="font-semibold text-slate-600">KNIME</span> (ETL &amp; Mining) &nbsp;|&nbsp;{" "}
        <span className="font-semibold text-slate-600">Orange</span> (Visual Analytics) &nbsp;|&nbsp;{" "}
        <span className="font-semibold text-slate-600">Tableau</span> (BI Dashboard) &nbsp;|&nbsp;{" "}
        <span className="font-semibold text-slate-600">PostgreSQL</span> (Data Warehouse)
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Revenue by Department" subtitle="Total amount billed, all-time">
          {loading || !revByDept ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revByDept} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="dept_name" tick={AXIS_TICK} interval={0} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={AXIS_TICK} tickFormatter={formatCompactINR} width={70} />
                <Tooltip content={<ChartTooltip formatter={formatCompactINR} />} cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="revenue" name="Revenue" fill={CHART_COLORS.navy} radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Monthly Revenue Trend" subtitle="All departments combined">
          {loading || !monthlyTrend ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyTrend} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="label" tick={AXIS_TICK} interval={2} />
                <YAxis tick={AXIS_TICK} tickFormatter={formatCompactINR} width={70} />
                <Tooltip content={<ChartTooltip formatter={formatCompactINR} />} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke={CHART_COLORS.teal}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Visit Type" subtitle="Share of billing records">
          {loading || !visitTypes ? (
            <ChartSkeleton height={260} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={visitTypes}
                  dataKey="count"
                  nameKey="visit_type"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {visitTypes.map((_, i) => (
                    <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip formatter={formatNumber} />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Payment Mode" subtitle="Count of transactions">
          {loading || !paymentModes ? (
            <ChartSkeleton height={260} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={paymentModes} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="payment_mode" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} width={40} />
                <Tooltip content={<ChartTooltip formatter={formatNumber} />} cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="count" name="Transactions" fill={CHART_COLORS.gold} radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Age Group Distribution" subtitle="Patients by age bracket">
          {loading || !ageGroups ? (
            <ChartSkeleton height={260} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ageGroups} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="age_group" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} width={40} />
                <Tooltip content={<ChartTooltip formatter={formatNumber} />} cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="count" name="Patients" fill={CHART_COLORS.sage} radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryStat
          loading={loading}
          label="Most Visited Department"
          value={summary?.most_visited_dept?.name}
          sub={summary ? `${formatNumber(summary.most_visited_dept.visits)} visits` : ""}
        />
        <SummaryStat
          loading={loading}
          label="Top Treatment by Revenue"
          value={summary?.top_treatment?.name}
          sub={summary ? formatCompactINR(summary.top_treatment.revenue) : ""}
        />
        <SummaryStat
          loading={loading}
          label="Highest Patient Cluster"
          value={summary?.top_cluster?.name}
          sub={summary ? `${formatNumber(summary.top_cluster.patient_count)} patients` : ""}
        />
      </div>
    </div>
  );
}

function SummaryStat({ label, value, sub, loading }) {
  if (loading) {
    return (
      <div className="rounded-xl bg-white border border-slate-200 p-4">
        <div className="skeleton h-3 w-32 mb-3" />
        <div className="skeleton h-5 w-40 mb-2" />
        <div className="skeleton h-3 w-20" />
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-base font-semibold text-navy mt-1 truncate" title={value}>
        {value || "N/A"}
      </p>
      <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
    </div>
  );
}
