import { useMemo } from "react";
import ReactFlow, { Background, Controls, MiniMap } from "reactflow";
import TableNode from "./schema/TableNode";

const nodeTypes = { table: TableNode };
const EDGE_COLOR = "#F59E0B";

// Positions roughly arranged in a circle around the central fact table, matching
// the named compass positions from the backend (top-left/top-right/bottom-right/
// bottom-left/top-center).
const DIM_COORDS = {
  "top-left": { x: 40, y: 40 },
  "top-right": { x: 780, y: 40 },
  "bottom-right": { x: 780, y: 520 },
  "bottom-left": { x: 40, y: 520 },
  "top-center": { x: 410, y: -140 },
};

export default function StarSchemaGraph({ schema }) {
  const { nodes, edges } = useMemo(() => {
    if (!schema) return { nodes: [], edges: [] };

    const factNode = {
      id: schema.fact.name,
      type: "table",
      position: { x: 380, y: 220 },
      data: { label: schema.fact.name, columns: schema.fact.columns, kind: "fact" },
      draggable: true,
    };

    const dimNodes = schema.dimensions.map((dim) => ({
      id: dim.name,
      type: "table",
      position: DIM_COORDS[dim.position] || { x: 0, y: 0 },
      data: { label: dim.name, columns: dim.columns, kind: "dim" },
      draggable: true,
    }));

    const dimEdges = schema.dimensions.map((dim) => ({
      id: `${dim.name}-${schema.fact.name}`,
      source: dim.name,
      target: schema.fact.name,
      label: dim.fk,
      animated: true,
      style: { stroke: EDGE_COLOR, strokeWidth: 2 },
      labelStyle: { fill: "#92400e", fontSize: 11, fontWeight: 600 },
      labelBgStyle: { fill: "#fffbeb" },
      labelBgPadding: [4, 2],
      markerEnd: { type: "arrowclosed", color: EDGE_COLOR },
    }));

    return { nodes: [factNode, ...dimNodes], edges: dimEdges };
  }, [schema]);

  return (
    <div className="h-[560px] rounded-xl border border-slate-200 bg-slate-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#cbd5e1" gap={20} />
        <Controls />
        <MiniMap
          position="bottom-right"
          nodeColor={(n) => (n.data?.kind === "fact" ? "#0F2557" : "#0D9488")}
          maskColor="rgba(15, 37, 87, 0.06)"
        />
      </ReactFlow>
    </div>
  );
}
