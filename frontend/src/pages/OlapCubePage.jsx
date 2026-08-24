import OlapCube3D from "../components/OlapCube3D";

const OPERATIONS = [
  {
    name: "ROLL-UP",
    color: "#2653A6",
    desc: "Aggregating from Month → Quarter → Year",
    query: "SELECT quarter, SUM(revenue) FROM v_olap_cube GROUP BY quarter",
  },
  {
    name: "DRILL-DOWN",
    color: "#0D9488",
    desc: "Expanding from Department → Doctor → Treatment",
    query: "SELECT doctor_name, treatment_name FROM ... WHERE dept_name = 'Cardiology'",
  },
  {
    name: "SLICE",
    color: "#F59E0B",
    desc: "Fixing one dimension (e.g., only Q1 data)",
    query: "SELECT * FROM v_olap_cube WHERE quarter = 'Q1'",
  },
  {
    name: "DICE",
    color: "#EF4444",
    desc: "Selecting a sub-cube (e.g., Cardiology + Q1 + Surgery)",
    query: "SELECT * FROM v_olap_cube WHERE department='Cardiology' AND quarter='Q1' AND category='Surgery'",
  },
];

export default function OlapCubePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">OLAP Cube</h1>
        <p className="text-sm text-slate-500">
          Drag to rotate, scroll to zoom, click any axis label to drill into that dimension
        </p>
      </div>

      <OlapCube3D />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {OPERATIONS.map((op) => (
          <div key={op.name} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <span
              className="inline-block text-xs font-bold px-2.5 py-1 rounded text-white mb-2"
              style={{ backgroundColor: op.color }}
            >
              {op.name}
            </span>
            <p className="text-sm text-slate-600 mb-3">{op.desc}</p>
            <code className="block text-[11px] bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-500 overflow-x-auto whitespace-nowrap">
              {op.query}
            </code>
          </div>
        ))}
      </div>
    </div>
  );
}
