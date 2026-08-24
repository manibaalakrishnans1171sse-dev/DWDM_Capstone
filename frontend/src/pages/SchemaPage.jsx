import { useEffect, useState, useCallback } from "react";
import { ReactFlowProvider } from "reactflow";
import StarSchemaGraph from "../components/StarSchemaGraph";
import SnowflakeSchemaGraph from "../components/SnowflakeSchemaGraph";
import ErrorState from "../components/ErrorState";
import { getStarSchemaInfo } from "../api/schema";
import { getErrorMessage } from "../api/axios";

const TABS = [
  { id: "star", label: "Star Schema" },
  { id: "snowflake", label: "Snowflake Schema" },
];

export default function SchemaPage() {
  const [tab, setTab] = useState("star");
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getStarSchemaInfo();
      setSchema(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-navy">Schema</h1>
        <p className="text-sm text-slate-500">Interactive star &amp; snowflake schema diagrams of the data warehouse</p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? "border-teal text-teal"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      {loading && !error && (
        <div className="skeleton h-[560px] w-full rounded-xl" />
      )}

      {!loading && !error && schema && (
        <ReactFlowProvider>
          {tab === "star" ? <StarSchemaGraph schema={schema} /> : <SnowflakeSchemaGraph schema={schema} />}
        </ReactFlowProvider>
      )}

      {tab === "star" ? (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-navy mb-2">What is a Star Schema?</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            In a Star Schema, one central fact table (<code className="text-navy font-medium">fact_billing</code>)
            connects directly to multiple dimension tables. This enables fast aggregation queries for analytics —
            each dimension joins to the fact table through a single foreign key, keeping query plans simple and
            performant.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-navy mb-2">What is a Snowflake Schema?</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            The Snowflake Schema is a normalized form of the Star Schema. Sub-dimensions reduce data redundancy
            but require more JOIN operations. This project implements the Star Schema in the actual database for
            query performance — the diagram above is illustrative of how the dimensions could be further normalized.
          </p>
        </div>
      )}
    </div>
  );
}
