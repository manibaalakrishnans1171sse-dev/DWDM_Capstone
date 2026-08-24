import { Handle, Position } from "reactflow";

const THEME = {
  fact: { bg: "#0F2557", border: "#0a1a3d", text: "#ffffff", sub: "#93c5fd" },
  dim: { bg: "#0D9488", border: "#0b7a70", text: "#ffffff", sub: "#99f6e4" },
  subdim: { bg: "#ffffff", border: "#0D9488", text: "#0f172a", sub: "#0D9488" },
};

export default function TableNode({ data }) {
  const theme = THEME[data.kind] || THEME.dim;
  const isFact = data.kind === "fact";

  return (
    <div
      className="rounded-xl shadow-lg overflow-hidden"
      style={{
        background: theme.bg,
        border: `2px solid ${theme.border}`,
        width: isFact ? 260 : data.kind === "subdim" ? 190 : 210,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />

      <div
        className="px-3 py-2 font-bold text-sm truncate"
        style={{ color: theme.text, background: "rgba(0,0,0,0.15)" }}
      >
        {isFact ? "⭐ " : "▦ "}
        {data.label}
      </div>
      <div className="px-3 py-2 space-y-0.5 max-h-48 overflow-y-auto thin-scrollbar">
        {data.columns.map((col) => (
          <div key={col} className="text-[11px] leading-tight truncate" style={{ color: theme.sub }}>
            {col}
          </div>
        ))}
      </div>
    </div>
  );
}
