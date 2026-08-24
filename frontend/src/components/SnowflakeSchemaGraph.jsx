import { useMemo } from "react";
import ReactFlow, { Background, Controls, MiniMap } from "reactflow";
import TableNode from "./schema/TableNode";

const nodeTypes = { table: TableNode };
const FACT_EDGE_COLOR = "#F59E0B";
const SUB_EDGE_COLOR = "#0D9488";

const DIM_COORDS = {
  "top-left": { x: 260, y: 60 },
  "top-right": { x: 1000, y: 60 },
  "bottom-right": { x: 1000, y: 540 },
  "bottom-left": { x: 260, y: 540 },
  "top-center": { x: 630, y: -160 },
};

const SUBDIM_COORDS = {
  dim_location: { x: 20, y: 60 },
  dim_specialization: { x: 1240, y: 60 },
  dim_category: { x: 1240, y: 540 },
  dim_building: { x: 20, y: 540 },
};

export default function SnowflakeSchemaGraph({ schema }) {
  const { nodes, edges } = useMemo(() => {
    if (!schema) return { nodes: [], edges: [] };

    const factNode = {
      id: schema.fact.name,
      type: "table",
      position: { x: 600, y: 220 },
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

    const subDimNodes = schema.sub_dimensions.map((sub) => ({
      id: sub.name,
      type: "table",
      position: SUBDIM_COORDS[sub.name] || { x: 0, y: 0 },
      data: { label: sub.name, columns: sub.columns, kind: "subdim" },
      draggable: true,
    }));

    const factEdges = schema.dimensions.map((dim) => ({
      id: `${dim.name}-${schema.fact.name}`,
      source: dim.name,
      target: schema.fact.name,
      label: dim.fk,
      animated: true,
      style: { stroke: FACT_EDGE_COLOR, strokeWidth: 2 },
      labelStyle: { fill: "#92400e", fontSize: 11, fontWeight: 600 },
      labelBgStyle: { fill: "#fffbeb" },
      labelBgPadding: [4, 2],
      markerEnd: { type: "arrowclosed", color: FACT_EDGE_COLOR },
    }));

    const subEdges = schema.sub_dimensions.map((sub) => ({
      id: `${sub.name}-${sub.parent}`,
      source: sub.name,
      target: sub.parent,
      animated: false,
      style: { stroke: SUB_EDGE_COLOR, strokeWidth: 1.5, strokeDasharray: "4 3" },
      markerEnd: { type: "arrowclosed", color: SUB_EDGE_COLOR },
    }));

    return { nodes: [factNode, ...dimNodes, ...subDimNodes], edges: [...factEdges, ...subEdges] };
  }, [schema]);

  return (
    <div className="h-[560px] rounded-xl border border-slate-200 bg-slate-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#cbd5e1" gap={20} />
        <Controls />
        <MiniMap
          position="bottom-right"
          nodeColor={(n) => (n.data?.kind === "fact" ? "#0F2557" : n.data?.kind === "subdim" ? "#ffffff" : "#0D9488")}
          maskColor="rgba(15, 37, 87, 0.06)"
        />
      </ReactFlow>
    </div>
  );
}
