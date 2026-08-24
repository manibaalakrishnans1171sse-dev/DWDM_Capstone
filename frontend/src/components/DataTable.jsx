import Icon from "./icons";

const TYPE_BADGE_COLORS = {
  INT: "bg-blue-100 text-blue-700",
  NUMERIC: "bg-teal-100 text-teal",
  DATE: "bg-amber-100 text-amber-700",
  BOOLEAN: "bg-purple-100 text-purple-700",
  VARCHAR: "bg-slate-100 text-slate-600",
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function DataTable({
  columns,
  rows,
  totalCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  search,
  onSearchChange,
  sortCol,
  sortDir,
  onSortChange,
  onExport,
  loading,
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startRow = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, totalCount);

  function handleSort(colName) {
    if (sortCol === colName) {
      onSortChange(colName, sortDir === "asc" ? "desc" : "asc");
    } else {
      onSortChange(colName, "asc");
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-slate-200">
        <div className="relative flex-1 max-w-sm">
          <Icon name="tables" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search all columns..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <label className="text-xs text-slate-500 flex items-center gap-1.5">
            Rows:
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="border border-slate-300 rounded-md text-sm px-2 py-1 bg-white"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md bg-navy text-white hover:bg-navy-light"
          >
            <Icon name="upload" className="w-4 h-4 rotate-180" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto thin-scrollbar">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 z-10">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.name}
                  onClick={() => handleSort(col.name)}
                  className="text-left px-4 py-3 font-semibold text-slate-600 border-b border-slate-200 cursor-pointer select-none hover:bg-slate-100 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.name}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${TYPE_BADGE_COLORS[col.type] || TYPE_BADGE_COLORS.VARCHAR}`}
                    >
                      {col.type}
                    </span>
                    {sortCol === col.name && (
                      <Icon
                        name="chevron"
                        className={`w-3 h-3 transition-transform ${sortDir === "asc" ? "-rotate-90" : "rotate-90"}`}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: pageSize }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  {columns.map((col) => (
                    <td key={col.name} className="px-4 py-3">
                      <div className="skeleton h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="text-center text-slate-400 py-10 text-sm">
                  No records found.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row, i) => (
                <tr
                  key={i}
                  className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50/60"} hover:bg-teal-50 transition-colors`}
                >
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                      {cell === null || cell === undefined ? (
                        <span className="text-slate-300 italic">null</span>
                      ) : (
                        String(cell)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-t border-slate-200">
        <p className="text-xs text-slate-500">
          Showing {startRow.toLocaleString()}–{endRow.toLocaleString()} of {totalCount.toLocaleString()} records
        </p>
        <div className="flex items-center gap-1">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
          >
            Previous
          </button>
          <span className="text-xs text-slate-500 px-2">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
