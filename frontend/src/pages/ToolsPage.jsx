import TableauEmbed from "../components/TableauEmbed";

const PIPELINE_STEPS = [
  { label: "CSV Upload", color: "#64748b" },
  { label: "KNIME ETL", color: "#FFD029", dark: true },
  { label: "PostgreSQL", color: "#2653A6" },
  { label: "Orange Mining", color: "#FF6B35" },
  { label: "Tableau Dashboard", color: "#1F77B4" },
];

const CONCEPTS = [
  "Data Warehouse Design (Star Schema + Snowflake Schema)",
  "ETL Pipeline (Extract from CSV → Transform in KNIME → Load to PostgreSQL)",
  "OLAP Operations (Cube, Roll-up, Drill-down, Slice, Dice via v_olap_cube view)",
  "Association Rule Mining (support, confidence, lift — visualized in Orange)",
  "Clustering (K-Means — 5 patient segments, visualized in Orange)",
  "Classification (Decision Tree — payment prediction)",
  "Model Monitoring (Accuracy tracking across KNIME pipeline runs)",
];

function Arrow() {
  return (
    <svg width="28" height="16" viewBox="0 0 28 16" className="text-slate-300 shrink-0">
      <path
        d="M0 8h22m0 0l-6-6m6 6l-6 6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ToolsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy">Tools</h1>
        <p className="text-sm text-slate-500">The real external tools behind this project's DWDM pipeline</p>
      </div>

      {/* Section 1: Tool pipeline flow */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Tool Pipeline Flow</h2>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-x-auto thin-scrollbar">
          <div className="flex flex-col items-center gap-3 min-w-max">
            <div className="flex items-center gap-2">
              {PIPELINE_STEPS.map((step, i) => (
                <div key={step.label} className="flex items-center gap-2">
                  <div
                    className="flex items-center justify-center rounded-xl text-center px-4 py-4 w-40 h-16 shadow-sm shrink-0 text-sm font-semibold"
                    style={{ backgroundColor: step.color, color: step.dark ? "#1e293b" : "#fff" }}
                  >
                    {step.label}
                  </div>
                  {i < PIPELINE_STEPS.length - 1 && <Arrow />}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1 text-slate-300 text-xs font-mono">↑↓</div>

            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center rounded-xl bg-teal text-white text-center px-4 py-3 w-40 shadow-sm shrink-0 text-sm font-semibold">
                FastAPI
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-300 text-xs font-mono">↑↓</div>

            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center rounded-xl bg-navy text-white text-center px-4 py-3 w-40 shadow-sm shrink-0 text-sm font-semibold">
                React Website
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Tool detail cards */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Tool Details</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* KNIME */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="h-1.5" style={{ backgroundColor: "#FFD029" }} />
            <div className="p-5 flex flex-col gap-3 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-800">KNIME Analytics Platform</h3>
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded bg-amber-100 text-amber-700 shrink-0">
                  ETL + Data Mining
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Reads hospital CSV → cleans data → loads to PostgreSQL → runs K-Means, Decision Tree, and
                Association Rules as visual node workflows.
              </p>
              <div className="rounded-lg bg-slate-50 border border-dashed border-slate-300 h-36 flex items-center justify-center text-center px-4">
                <p className="text-xs text-slate-400">
                  KNIME Workflow Screenshot — <br />[ Insert screenshot of your KNIME workflow here ]
                </p>
              </div>
              <div className="border-t border-slate-100 pt-3 mt-auto">
                <p className="text-[11px] font-semibold text-teal">Outputs Produced</p>
                <p className="text-xs text-slate-500">3 mining tables populated, model_log updated</p>
              </div>
              <a
                href="https://www.knime.com"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-teal hover:underline"
              >
                knime.com ↗
              </a>
            </div>
          </div>

          {/* Orange */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="h-1.5" style={{ backgroundColor: "#FF6B35" }} />
            <div className="p-5 flex flex-col gap-3 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-800">Orange Data Mining</h3>
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded bg-orange-100 text-orange-700 shrink-0">
                  Visual Analytics
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Visualizes decision tree structure, patient cluster scatter plots, and association rule networks
                using drag-drop widgets.
              </p>
              <div className="rounded-lg bg-slate-50 border border-dashed border-slate-300 h-36 flex items-center justify-center text-center px-4">
                <p className="text-xs text-slate-400">
                  Orange Workflow Screenshot — <br />[ Insert screenshot of your Orange workflow here ]
                </p>
              </div>
              <div className="border-t border-slate-100 pt-3 mt-auto">
                <p className="text-[11px] font-semibold text-teal">Outputs Produced</p>
                <p className="text-xs text-slate-500">Decision tree diagram, cluster scatter plot, rule visualization</p>
              </div>
              <a
                href="https://orangedatamining.com"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-teal hover:underline"
              >
                orangedatamining.com ↗
              </a>
            </div>
          </div>

          {/* Tableau */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="h-1.5" style={{ backgroundColor: "#1F77B4" }} />
            <div className="p-5 flex flex-col gap-3 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-800">Tableau Public</h3>
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded bg-blue-100 text-blue-700 shrink-0">
                  BI Dashboard
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Connects directly to PostgreSQL, builds interactive charts and dashboards, published publicly and
                embedded in this website.
              </p>
              <TableauEmbed height={144} />
              <div className="border-t border-slate-100 pt-3 mt-auto">
                <p className="text-[11px] font-semibold text-teal">Outputs Produced</p>
                <p className="text-xs text-slate-500">4 interactive charts, 1 published dashboard</p>
              </div>
              <a
                href="https://public.tableau.com"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-teal hover:underline"
              >
                public.tableau.com ↗
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: DWDM concepts checklist */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">DWDM Concepts Covered</h2>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <ul className="space-y-2.5">
            {CONCEPTS.map((concept) => (
              <li key={concept} className="flex items-start gap-2.5 text-sm text-slate-700">
                <span className="text-sage font-bold mt-0.5">✅</span>
                <span>{concept}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
