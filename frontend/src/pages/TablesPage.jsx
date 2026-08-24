import { useEffect, useState, useCallback } from "react";
import DataTable from "../components/DataTable";
import ErrorState from "../components/ErrorState";
import { getTableList, getTableData } from "../api/tables";
import { getErrorMessage } from "../api/axios";
import { downloadCsv } from "../lib/csv";

export default function TablesPage() {
  const [tableList, setTableList] = useState([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortCol, setSortCol] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  // Debounce search input so we don't fire a request on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Load the table dropdown once.
  useEffect(() => {
    getTableList()
      .then((list) => {
        setTableList(list);
        if (list.length > 0) setSelectedTable(list[0].name);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const loadData = useCallback(() => {
    if (!selectedTable) return;
    setLoading(true);
    setError("");
    getTableData(selectedTable, { page, pageSize, search: debouncedSearch, sortCol, sortDir })
      .then(setData)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [selectedTable, page, pageSize, debouncedSearch, sortCol, sortDir]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleTableChange(name) {
    setSelectedTable(name);
    setPage(1);
    setSearch("");
    setSortCol("");
    setSortDir("asc");
  }

  function handleSearchChange(value) {
    setSearch(value);
    setPage(1);
  }

  function handleSort(col, dir) {
    setSortCol(col);
    setSortDir(dir);
    setPage(1);
  }

  async function handleExport() {
    if (!selectedTable || !data) return;
    setExporting(true);
    try {
      const full = await getTableData(selectedTable, {
        page: 1,
        pageSize: Math.max(data.total_count, 1),
        search: debouncedSearch,
        sortCol,
        sortDir,
      });
      downloadCsv(`${selectedTable}.csv`, full.columns, full.rows);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">Data Tables</h1>
          <p className="text-sm text-slate-500">Browse the warehouse's fact, dimension, mining, and view tables</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Table</label>
          <select
            value={selectedTable}
            onChange={(e) => handleTableChange(e.target.value)}
            className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm bg-white min-w-[240px] focus:outline-none focus:ring-2 focus:ring-teal"
          >
            {tableList.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name} {t.is_view ? "(view)" : ""} — {t.row_count.toLocaleString()} rows
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={loadData} />}

      {!error && data && (
        <DataTable
          columns={data.columns}
          rows={data.rows}
          totalCount={data.total_count}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
          search={search}
          onSearchChange={handleSearchChange}
          sortCol={sortCol}
          sortDir={sortDir}
          onSortChange={handleSort}
          onExport={handleExport}
          loading={loading || exporting}
        />
      )}
    </div>
  );
}
