"use client";

import { useRef, useState, useCallback } from "react";
import { FloorPlan, TableLayout } from "@/lib/floor-plan-store";

type TableStatus =
  | "available"
  | "seated"
  | "reserved"
  | "turning"
  | "blocked"
  | "ordering"
  | "mains_out"
  | "last_round"
  | "bill_requested";

interface Props {
  plan: FloorPlan;
  tableStatuses?: Record<string, TableStatus>;
  mode: "view" | "edit";
  onPlanChange?: (plan: FloorPlan) => void;
  onTableClick?: (tableId: string) => void;
}

const STATUS_COLOR: Record<TableStatus, string> = {
  available: "#4A7A4C",
  seated: "#2C4A2E",
  reserved: "#B8962E",
  turning: "#D97706",
  blocked: "#6B7280",
  ordering: "#2C4A2E",
  mains_out: "#2C4A2E",
  last_round: "#2C4A2E",
  bill_requested: "#2C4A2E",
};

const STATUS_BG: Record<TableStatus, string> = {
  available: "#F0F7F0",
  seated: "#EAF0EA",
  reserved: "#FBF4E3",
  turning: "#FEF3C7",
  blocked: "#F3F4F6",
  ordering: "#EAF0EA",
  mains_out: "#EAF0EA",
  last_round: "#EAF0EA",
  bill_requested: "#EAF0EA",
};

interface AddTableDialog {
  x: number; // % where double-click happened
  y: number;
}

export default function FloorCanvas({
  plan,
  tableStatuses,
  mode,
  onPlanChange,
  onTableClick,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{
    tableId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const [addDialog, setAddDialog] = useState<AddTableDialog | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newShape, setNewShape] = useState<"round" | "square" | "rectangle">("round");
  const [newZone, setNewZone] = useState(plan.zones[0]?.id ?? "");

  // Convert SVG client coords → percentage of canvas
  function toPercent(clientX: number, clientY: number): { px: number; py: number } {
    const svg = svgRef.current;
    if (!svg) return { px: 0, py: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      px: ((clientX - rect.left) / rect.width) * 100,
      py: ((clientY - rect.top) / rect.height) * 100,
    };
  }

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, tableId: string) => {
      if (mode !== "edit") return;
      e.preventDefault();
      e.stopPropagation();
      const table = plan.tables.find((t) => t.id === tableId);
      if (!table) return;
      setDragging({
        tableId,
        startX: e.clientX,
        startY: e.clientY,
        origX: table.x,
        origY: table.y,
      });
    },
    [mode, plan.tables]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || mode !== "edit") return;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const dx = ((e.clientX - dragging.startX) / rect.width) * 100;
      const dy = ((e.clientY - dragging.startY) / rect.height) * 100;
      const newX = Math.max(0, Math.min(95, dragging.origX + dx));
      const newY = Math.max(0, Math.min(95, dragging.origY + dy));
      onPlanChange?.({
        ...plan,
        tables: plan.tables.map((t) =>
          t.id === dragging.tableId ? { ...t, x: newX, y: newY } : t
        ),
      });
    },
    [dragging, mode, plan, onPlanChange]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handleSvgDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (mode !== "edit") return;
      const { px, py } = toPercent(e.clientX, e.clientY);
      setAddDialog({ x: px, y: py });
      setNewLabel("");
      setNewShape("round");
      setNewZone(plan.zones[0]?.id ?? "");
    },
    [mode, plan.zones]
  );

  function addTable() {
    if (!addDialog || !newLabel.trim()) return;
    const zone = plan.zones.find((z) => z.id === newZone);
    const newTable: TableLayout = {
      id: `t${Date.now()}`,
      label: newLabel.trim(),
      zone: zone?.label ?? "",
      x: addDialog.x,
      y: addDialog.y,
      w: newShape === "rectangle" ? 12 : 7,
      h: newShape === "rectangle" ? 10 : 7,
      shape: newShape,
      maxCovers: newShape === "rectangle" ? 6 : 4,
    };
    onPlanChange?.({ ...plan, tables: [...plan.tables, newTable] });
    setAddDialog(null);
  }

  function deleteTable(tableId: string) {
    onPlanChange?.({ ...plan, tables: plan.tables.filter((t) => t.id !== tableId) });
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Canvas container */}
      <div style={{ position: "relative", aspectRatio: "1.45", userSelect: "none" }}>
        {/* Floor plan image — prefix with basePath so the path works under /hospitality */}
        <img
          src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/floor-plan-etaj.png`}
          alt="Floor plan"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill", display: "block" }}
          draggable={false}
        />

        {/* SVG overlay */}
        <svg
          ref={svgRef}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleSvgDoubleClick}
        >
          {/* Zones */}
          {plan.zones.map((z) => (
            <rect
              key={z.id}
              x={z.x}
              y={z.y}
              width={z.w}
              height={z.h}
              fill={z.color + "18"}
              stroke={z.color}
              strokeWidth="0.4"
              strokeDasharray="1.5 0.8"
              rx="0.5"
            />
          ))}

          {/* Zone labels */}
          {plan.zones.map((z) => (
            <text
              key={`lbl-${z.id}`}
              x={z.x + z.w / 2}
              y={z.y + 2.5}
              textAnchor="middle"
              fontSize="1.8"
              fill={z.color}
              fontWeight="600"
              style={{ pointerEvents: "none", fontFamily: "var(--font-body)" }}
            >
              {z.label}
            </text>
          ))}

          {/* Tables */}
          {plan.tables.map((t) => {
            const status = tableStatuses?.[t.id] ?? "available";
            const fill = mode === "edit"
              ? (plan.zones.find((z) => z.label === t.zone)?.color ?? "#4A7A4C") + "33"
              : STATUS_BG[status];
            const stroke = mode === "edit"
              ? (plan.zones.find((z) => z.label === t.zone)?.color ?? "#4A7A4C")
              : STATUS_COLOR[status];
            const cx = t.x + t.w / 2;
            const cy = t.y + t.h / 2;
            const rx = t.w / 2;
            const ry = t.h / 2;

            return (
              <g
                key={t.id}
                style={{ cursor: mode === "edit" ? "grab" : "pointer" }}
                onMouseDown={(e) => handleMouseDown(e, t.id)}
                onClick={() => mode === "view" && onTableClick?.(t.id)}
              >
                {t.shape === "round" ? (
                  <ellipse
                    cx={cx}
                    cy={cy}
                    rx={rx}
                    ry={ry}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth="0.5"
                  />
                ) : (
                  <rect
                    x={t.x}
                    y={t.y}
                    width={t.w}
                    height={t.h}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth="0.5"
                    rx={t.shape === "square" ? "0.8" : "0.5"}
                  />
                )}
                <text
                  x={cx}
                  y={cy + 0.7}
                  textAnchor="middle"
                  fontSize="2.2"
                  fontWeight="700"
                  fill={stroke}
                  style={{ pointerEvents: "none", fontFamily: "var(--font-body)" }}
                >
                  {t.label}
                </text>

                {/* Delete button in edit mode */}
                {mode === "edit" && (
                  <g
                    style={{ cursor: "pointer" }}
                    onClick={(e) => { e.stopPropagation(); deleteTable(t.id); }}
                  >
                    <circle cx={t.x + t.w} cy={t.y} r="1.6" fill="#DC2626" />
                    <text x={t.x + t.w} y={t.y + 0.6} textAnchor="middle" fontSize="2" fill="white" style={{ pointerEvents: "none" }}>×</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Add table dialog */}
      {addDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
          onClick={() => setAddDialog(null)}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 24,
              minWidth: 320,
              boxShadow: "var(--shadow-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: "var(--color-text)", fontFamily: "var(--font-display)" }}>
              Adaugă masă nouă
            </div>

            <label style={{ display: "block", marginBottom: 8, fontSize: 13, color: "var(--color-text-secondary)" }}>Etichetă</label>
            <input
              autoFocus
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTable()}
              placeholder="ex: 13"
              style={{
                width: "100%",
                height: 36,
                border: "1px solid var(--color-border)",
                borderRadius: 4,
                padding: "0 10px",
                marginBottom: 12,
                fontSize: 14,
                color: "var(--color-text)",
                boxSizing: "border-box",
              }}
            />

            <label style={{ display: "block", marginBottom: 8, fontSize: 13, color: "var(--color-text-secondary)" }}>Formă</label>
            <select
              value={newShape}
              onChange={(e) => setNewShape(e.target.value as typeof newShape)}
              style={{
                width: "100%",
                height: 36,
                border: "1px solid var(--color-border)",
                borderRadius: 4,
                padding: "0 10px",
                marginBottom: 12,
                fontSize: 14,
                color: "var(--color-text)",
                boxSizing: "border-box",
              }}
            >
              <option value="round">Rotund</option>
              <option value="square">Pătrat</option>
              <option value="rectangle">Dreptunghi</option>
            </select>

            <label style={{ display: "block", marginBottom: 8, fontSize: 13, color: "var(--color-text-secondary)" }}>Salon</label>
            <select
              value={newZone}
              onChange={(e) => setNewZone(e.target.value)}
              style={{
                width: "100%",
                height: 36,
                border: "1px solid var(--color-border)",
                borderRadius: 4,
                padding: "0 10px",
                marginBottom: 20,
                fontSize: 14,
                color: "var(--color-text)",
                boxSizing: "border-box",
              }}
            >
              {plan.zones.map((z) => (
                <option key={z.id} value={z.id}>{z.label}</option>
              ))}
            </select>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={addTable}
                disabled={!newLabel.trim()}
                style={{
                  flex: 1,
                  height: 38,
                  background: "var(--color-primary)",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: newLabel.trim() ? "pointer" : "not-allowed",
                  opacity: newLabel.trim() ? 1 : 0.5,
                }}
              >
                Adaugă
              </button>
              <button
                onClick={() => setAddDialog(null)}
                style={{
                  flex: 1,
                  height: 38,
                  background: "transparent",
                  color: "var(--color-text-secondary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 4,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Anulează
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
