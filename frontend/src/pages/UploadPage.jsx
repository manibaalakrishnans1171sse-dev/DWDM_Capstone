import { useState, useCallback, useEffect, useRef } from "react";
import { uploadDataset, getUploadHistory } from "../api/upload";
import { getErrorMessage } from "../api/axios";
import { formatNumber } from "../lib/format";

const REQUIRED_COLUMNS = [
  "patient_id", "doctor_id", "dept_id", "treatment_id", "time_id",
  "amount_billed", "amount_paid", "outstanding", "length_of_stay",
  "visit_type", "payment_mode",
];

const MAX_SIZE_BYTES = 50 * 1024 * 1024;

function parseCsvPreview(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = lines[0] ? lines[0].split(",").map((h) => h.trim()) : [];
  const previewRows = lines.slice(1, 6).map((line) => line.split(","));
  return { header, previewRows, estimatedRows: Math.max(lines.length - 1, 0) };
}

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null); // { steps, rows_inserted, ... }
  const [resultError, setResultError] = useState(null); // { message, steps }
  const [history, setHistory] = useState(null);
  const [historyError, setHistoryError] = useState("");
  const inputRef = useRef(null);

  const loadHistory = useCallback(() => {
    getUploadHistory()
      .then(setHistory)
      .catch((err) => setHistoryError(getErrorMessage(err)));
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  function handleFile(f) {
    setResult(null);
    setResultError(null);
    setFileError("");

    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".csv")) {
      setFileError("Only .csv files are accepted");
      setFile(null);
      setPreview(null);
      return;
    }
    if (f.size > MAX_SIZE_BYTES) {
      setFileError("File exceeds the 50MB limit");
      setFile(null);
      setPreview(null);
      return;
    }

    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(parseCsvPreview(e.target.result));
    reader.readAsText(f);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  const missingColumns = preview ? REQUIRED_COLUMNS.filter((c) => !preview.header.includes(c)) : [];
  const canUpload = file && preview && missingColumns.length === 0;

  async function handleProcess() {
    setProcessing(true);
    setResult(null);
    setResultError(null);
    try {
      const data = await uploadDataset(file);
      setResult(data);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (detail && typeof detail === "object" && detail.steps) {
        setResultError(detail);
      } else {
        setResultError({ message: getErrorMessage(err), steps: [] });
      }
    } finally {
      setProcessing(false);
      loadHistory();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Upload Dataset</h1>
        <p className="text-sm text-slate-500">Add new billing data — processed by the KNIME ETL + mining pipeline</p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
          dragging ? "border-teal bg-teal-50" : "border-slate-300 bg-white hover:border-teal"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <svg viewBox="0 0 24 24" className="w-10 h-10 mx-auto text-slate-400 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 16V4m0 0L7 9m5-5l5 5M4 20h16" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-sm font-medium text-slate-600">Drag &amp; drop a CSV file here, or click to browse</p>
        <p className="text-xs text-slate-400 mt-1">.csv only, max 50MB</p>
      </div>

      {fileError && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-coral text-sm px-4 py-3">{fileError}</div>
      )}

      {/* Preview */}
      {file && preview && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-semibold text-slate-800">{file.name}</span>
            <span className="text-slate-400">{(file.size / 1024).toFixed(1)} KB</span>
            <span className="text-slate-400">~{formatNumber(preview.estimatedRows)} rows</span>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">Column Validation</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {REQUIRED_COLUMNS.map((col) => {
                const present = preview.header.includes(col);
                return (
                  <div key={col} className="flex items-center gap-1.5 text-xs">
                    <span>{present ? "✅" : "❌"}</span>
                    <span className={present ? "text-slate-600" : "text-coral font-medium"}>{col}</span>
                  </div>
                );
              })}
            </div>
            {missingColumns.length > 0 && (
              <p className="text-xs text-coral mt-2">
                Missing required columns: {missingColumns.join(", ")}. Upload is disabled until these are present.
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">First 5 Rows</p>
            <div className="overflow-x-auto thin-scrollbar border border-slate-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    {preview.header.map((h) => (
                      <th key={h} className="text-left px-3 py-2 font-semibold text-slate-600 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.previewRows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-1.5 text-slate-600 whitespace-nowrap">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            onClick={handleProcess}
            disabled={!canUpload || processing}
            className="w-full sm:w-auto rounded-lg bg-navy hover:bg-navy-light text-white font-semibold px-6 py-2.5 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {processing ? "Processing..." : "Process Dataset"}
          </button>
        </div>
      )}

      {/* Progress / result */}
      {(result || resultError) && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">Processing Steps</h3>
          <ul className="space-y-2">
            {(result?.steps || resultError?.steps || []).map((s) => (
              <li key={s.step} className="flex items-start gap-2.5 text-sm">
                <span>{s.status === "success" ? "✅" : s.status === "skipped" ? "⏭️" : "❌"}</span>
                <div>
                  <span className={s.status === "error" ? "text-coral font-medium" : "text-slate-700"}>
                    Step {s.step}: {s.label}
                  </span>
                  {s.detail && <p className="text-xs text-slate-400">{s.detail}</p>}
                </div>
              </li>
            ))}
          </ul>

          {resultError && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-coral text-sm px-4 py-3">
              {resultError.message}
            </div>
          )}

          {result && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-sage text-sm px-4 py-3 space-y-1">
              <p>
                <strong>{formatNumber(result.rows_inserted)}</strong> rows inserted ·{" "}
                <strong>{result.dt_accuracy != null ? `${(result.dt_accuracy * 100).toFixed(0)}%` : "—"}</strong> DT
                accuracy · <strong>{result.kmeans_silhouette != null ? result.kmeans_silhouette.toFixed(2) : "—"}</strong>{" "}
                silhouette · <strong>{result.rules_found ?? "—"}</strong> rules found
              </p>
              <p className="text-xs text-emerald-700">
                After upload completes, refresh your Tableau dashboard to see updated visualizations.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Upload history */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Upload History</h2>
        {historyError && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-coral text-sm px-4 py-3">{historyError}</div>
        )}
        {!historyError && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto thin-scrollbar">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {["Filename", "Uploaded", "Rows Inserted", "DT Accuracy", "KMeans Silhouette", "Rules Found", "Status"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-slate-600 border-b border-slate-200 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!history &&
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="skeleton h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))}
                {history?.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-slate-400 py-8 text-sm">
                      No uploads yet.
                    </td>
                  </tr>
                )}
                {history?.map((h, i) => (
                  <tr key={h.upload_id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                    <td className="px-4 py-2.5 text-slate-700">{h.filename}</td>
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                      {h.upload_datetime ? new Date(h.upload_datetime).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">{formatNumber(h.rows_inserted || 0)}</td>
                    <td className="px-4 py-2.5 tabular-nums">{h.dt_accuracy != null ? `${(h.dt_accuracy * 100).toFixed(0)}%` : "—"}</td>
                    <td className="px-4 py-2.5 tabular-nums">{h.kmeans_silhouette != null ? h.kmeans_silhouette.toFixed(2) : "—"}</td>
                    <td className="px-4 py-2.5 tabular-nums">{h.rules_found ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          h.status === "success" ? "bg-emerald-100 text-sage" : "bg-red-100 text-coral"
                        }`}
                      >
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
