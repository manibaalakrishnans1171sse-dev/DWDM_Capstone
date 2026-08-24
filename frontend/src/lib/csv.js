export function downloadCsv(filename, columns, rows) {
  const header = columns.map((c) => `"${c.name.replace(/"/g, '""')}"`).join(",");
  const body = rows
    .map((row) =>
      row
        .map((cell) => {
          if (cell === null || cell === undefined) return "";
          const s = String(cell).replace(/"/g, '""');
          return `"${s}"`;
        })
        .join(","),
    )
    .join("\n");

  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
