"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth, UserButton } from "@clerk/nextjs";
import Badge from "@/components/Badge";
import FloorCanvas from "@/components/FloorCanvas";
import { loadFloorPlan, FloorPlan } from "@/lib/floor-plan-store";

// ── Config ──────────────────────────────────────────────────────────────────
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";
const VENUE_ID =
  process.env.NEXT_PUBLIC_VENUE_ID ?? "146fd211-ae20-5ebe-a7af-3c195ab89ae8";

// ── Types ────────────────────────────────────────────────────────────────────

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

interface TableData {
  id: string;
  label: string;
  zone: string;
  status: TableStatus;
  guestName?: string;
  partySize?: number;
  seatedAt?: Date;
  reservedAt?: string;
  covers?: number;
}

interface ApiTable {
  id: string;
  zone_id: string;
  zone_name: string;
  label: string;
  shape: string;
  status: string;
  min_covers: number;
  max_covers: number;
  is_accessible: boolean;
  is_outdoor: boolean;
  pos_x: number | null;
  pos_y: number | null;
  rotation: number;
}

function apiTableToData(t: ApiTable): TableData {
  return {
    id: t.id,
    label: t.label,
    zone: t.zone_name,
    status: t.status as TableStatus,
    covers: t.max_covers,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function elapsed(d: Date): string {
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const statusLabel: Record<TableStatus, string> = {
  available: "Liber",
  seated: "Ocupat",
  reserved: "Rezervat",
  turning: "Eliberare",
  blocked: "Blocat",
  ordering: "Comandă",
  mains_out: "Felul Principal",
  last_round: "Ultimul Rând",
  bill_requested: "Notă",
};

// Status values that use the same badge variant as "seated"
const SEATED_VARIANTS = new Set<TableStatus>([
  "seated",
  "ordering",
  "mains_out",
  "last_round",
  "bill_requested",
]);

type BadgeVariant = "seated" | "available" | "reserved" | "turning" | "blocked" | "success" | "accent";

function badgeVariant(s: TableStatus): BadgeVariant {
  if (SEATED_VARIANTS.has(s)) return "seated";
  return s as BadgeVariant;
}

const ZONE_FILTERS = ["Toate", "Brasserie", "Salon Istoric"];

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const now = useNow();
  const { getToken } = useAuth();
  const [zone, setZone] = useState("Toate");
  const [tab, setTab] = useState<"floor" | "queue">("floor");
  const [sel, setSel] = useState<TableData | null>(null);
  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null);

  // ── Load floor plan layout ──────────────────────────────────────────────
  useEffect(() => {
    setFloorPlan(loadFloorPlan());
  }, []);

  // ── Initial table load ───────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = await getToken();
        const resp = await fetch(
          `${API_URL}/api/v1/tables?venue_id=${VENUE_ID}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!resp.ok || cancelled) return;
        const data: ApiTable[] = await resp.json();
        setTables(data.map(apiTableToData));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── WebSocket live sync ─────────────────────────────────────────────────
  useEffect(() => {
    let ws: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retries = 0;
    let stopped = false;

    function connect() {
      if (stopped) return;
      const wsBase = API_URL.replace(/^http/, "ws");
      ws = new WebSocket(`${wsBase}/ws/floor/${VENUE_ID}`);

      ws.onopen = () => {
        retries = 0;
      };

      ws.onmessage = (e: MessageEvent) => {
        try {
          const updated: ApiTable = JSON.parse(e.data as string);
          setTables((ts) =>
            ts.map((t) => (t.id === updated.id ? apiTableToData(updated) : t))
          );
          setSel((s) => (s?.id === updated.id ? apiTableToData(updated) : s));
        } catch {
          // malformed frame — ignore
        }
      };

      ws.onclose = () => {
        if (stopped) return;
        const delay = Math.min(1000 * 2 ** retries, 30_000);
        retries++;
        retryTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws?.close();
      };
    }

    connect();
    return () => {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      ws?.close();
    };
  }, []);

  // ── Status update (API + local optimistic update) ─────────────────────────
  async function updateStatus(id: string, newStatus: TableStatus) {
    // Optimistic update so UI feels instant
    setTables((ts) =>
      ts.map((t) =>
        t.id === id
          ? {
              ...t,
              status: newStatus,
              seatedAt: newStatus === "seated" ? new Date() : t.seatedAt,
            }
          : t
      )
    );
    setSel((s) =>
      s?.id === id
        ? {
            ...s,
            status: newStatus,
            seatedAt: newStatus === "seated" ? new Date() : s.seatedAt,
          }
        : s
    );

    try {
      const token = await getToken();
      await fetch(`${API_URL}/api/v1/tables/${id}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      // WebSocket broadcast will reconcile all connected tabs
    } catch {
      // Network error — optimistic state stands until next WS sync
    }
  }

  // ── Derived state ────────────────────────────────────────────────────────
  const visible = tables.filter((t) => zone === "Toate" || t.zone === zone);
  const stats = {
    seated: tables
      .filter((t) => SEATED_VARIANTS.has(t.status))
      .reduce((s, t) => s + (t.covers ?? 0), 0),
    reserved: tables.filter((t) => t.status === "reserved").length,
    available: tables.filter((t) => t.status === "available").length,
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: "var(--color-surface)" }}
    >
      {/* Top bar */}
      <div
        className="h-16 flex items-center gap-4 px-6 border-b shrink-0"
        style={{ background: "white", borderColor: "var(--color-border)" }}
      >
        <div
          className="font-bold text-lg shrink-0"
          style={{
            color: "var(--color-primary)",
            fontFamily: "var(--font-display)",
          }}
        >
          La Mița Biciclista
        </div>
        <div
          className="w-px h-6 mx-2"
          style={{ background: "var(--color-border)" }}
        />
        <div
          className="text-sm"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {now.toLocaleDateString("ro-RO", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </div>
        <div className="flex gap-2 ml-2">
          {[
            { label: `${stats.seated} covers`, color: "var(--color-primary)" },
            {
              label: `${stats.available} libere`,
              color: "var(--color-available)",
            },
            {
              label: `${stats.reserved} rezervate`,
              color: "var(--color-reserved)",
            },
          ].map((p) => (
            <span
              key={p.label}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "var(--color-surface)", color: p.color }}
            >
              {p.label}
            </span>
          ))}
        </div>
        <div
          className="ml-auto font-mono text-sm font-semibold"
          style={{ color: "var(--color-primary)" }}
        >
          {now.toLocaleTimeString("ro-RO", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
        <button
          className="ml-2 px-4 h-9 rounded-[4px] text-white text-sm font-semibold"
          style={{ background: "var(--color-primary)" }}
        >
          Check-in
        </button>
        <div className="ml-3 flex items-center">
          <UserButton />
        </div>
      </div>

      {/* Nav tabs */}
      <div
        className="flex border-b shrink-0"
        style={{ background: "white", borderColor: "var(--color-border)" }}
      >
        {(
          [
            ["floor", "Plan Sală"],
            ["queue", "Coadă Walk-in"],
          ] as const
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-6 h-11 text-sm font-medium transition-all relative"
            style={{
              color:
                tab === t
                  ? "var(--color-primary)"
                  : "var(--color-text-secondary)",
            }}
          >
            {label}
            {tab === t && (
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ background: "var(--color-primary)" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Floor panel */}
        <div className="flex-1 p-5 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-lg font-semibold"
              style={{
                color: "var(--color-text)",
                fontFamily: "var(--font-display)",
              }}
            >
              {tab === "floor" ? "Vedere sală" : "Coadă walk-in"}
            </h2>
            <div className="flex gap-2">
              {ZONE_FILTERS.map((z) => (
                <button
                  key={z}
                  onClick={() => setZone(z)}
                  className="px-3 h-8 rounded-full text-[12px] font-medium border transition-all"
                  style={{
                    borderColor:
                      zone === z
                        ? "var(--color-primary)"
                        : "var(--color-border)",
                    background:
                      zone === z ? "var(--color-primary)" : "white",
                    color:
                      zone === z
                        ? "white"
                        : "var(--color-text-secondary)",
                  }}
                >
                  {z}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-4 mb-4 flex-wrap">
            {(
              [
                "available",
                "seated",
                "reserved",
                "turning",
                "blocked",
              ] as TableStatus[]
            ).map((s) => (
              <span
                key={s}
                className="flex items-center gap-1.5 text-[12px]"
                style={{ color: "var(--color-text-secondary)" }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    background: ({
                      available: "var(--color-available)",
                      seated: "var(--color-seated)",
                      reserved: "var(--color-reserved)",
                      turning: "var(--color-turning)",
                      blocked: "var(--color-blocked)",
                    } as Record<string, string>)[s],
                  }}
                />
                {statusLabel[s]}
              </span>
            ))}
          </div>

          {/* Loading state */}
          {loading && (
            <div
              className="text-sm py-8 text-center"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Se încarcă mesele…
            </div>
          )}

          {/* Floor canvas (when layout data exists and we're on floor tab) */}
          {!loading && tab === "floor" && floorPlan && floorPlan.tables.some((t) => t.x > 0 || t.y > 0) && (
            <div className="mb-5">
              <FloorCanvas
                plan={floorPlan}
                tableStatuses={Object.fromEntries(
                  tables.map((t) => [t.id, t.status])
                )}
                mode="view"
                onTableClick={(tableId) => {
                  const t = tables.find((tb) => tb.id === tableId);
                  setSel(t ? (sel?.id === t.id ? null : t) : null);
                }}
              />
            </div>
          )}

          {/* Table grid */}
          {!loading && (
            <div className="grid grid-cols-4 gap-3">
              {visible.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSel(sel?.id === t.id ? null : t)}
                  className="text-left p-3 rounded-[8px] border transition-all"
                  style={{
                    borderColor:
                      sel?.id === t.id
                        ? "var(--color-primary)"
                        : {
                            available: "rgba(74,122,76,0.2)",
                            seated: "rgba(44,74,46,0.35)",
                            ordering: "rgba(44,74,46,0.35)",
                            mains_out: "rgba(44,74,46,0.35)",
                            last_round: "rgba(44,74,46,0.35)",
                            bill_requested: "rgba(44,74,46,0.35)",
                            reserved: "rgba(184,150,46,0.35)",
                            turning: "rgba(217,119,6,0.35)",
                            blocked: "rgba(107,114,128,0.2)",
                          }[t.status] ?? "rgba(107,114,128,0.2)",
                    background: {
                      available: "#FCFFFE",
                      seated: "#FAFDFB",
                      ordering: "#FAFDFB",
                      mains_out: "#FAFDFB",
                      last_round: "#FAFDFB",
                      bill_requested: "#FAFDFB",
                      reserved: "#FFFDF7",
                      turning: "#FFFEF5",
                      blocked: "#FAFAFA",
                    }[t.status] ?? "#FAFAFA",
                    boxShadow:
                      sel?.id === t.id ? "var(--shadow-md)" : undefined,
                    opacity: t.status === "blocked" ? 0.65 : 1,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-base font-bold"
                      style={{
                        color: "var(--color-text)",
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      {t.label}
                    </span>
                    <Badge variant={badgeVariant(t.status)}>
                      {statusLabel[t.status] ?? t.status}
                    </Badge>
                  </div>
                  {t.guestName && (
                    <div
                      className="text-sm font-medium truncate"
                      style={{ color: "var(--color-text)" }}
                    >
                      {t.guestName}
                    </div>
                  )}
                  {t.reservedAt && (
                    <div
                      className="text-[12px]"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      ⏰ {t.reservedAt}
                    </div>
                  )}
                  {t.seatedAt && (
                    <div
                      className="text-[12px] font-mono mt-1"
                      style={{
                        color:
                          t.status === "turning"
                            ? "var(--color-turning)"
                            : "var(--color-text-muted)",
                      }}
                    >
                      {elapsed(t.seatedAt)} · {t.partySize}pers
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {sel && (
          <div
            className="w-72 border-l flex flex-col shrink-0"
            style={{ background: "white", borderColor: "var(--color-border)" }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: "var(--color-border)" }}
            >
              <div>
                <span
                  className="font-bold"
                  style={{
                    color: "var(--color-text)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  Masa {sel.label}
                </span>
                <Badge className="ml-2" variant="accent">
                  {sel.zone}
                </Badge>
              </div>
              <button
                onClick={() => setSel(null)}
                className="text-lg w-8 h-8 flex items-center justify-center rounded"
                style={{ color: "var(--color-text-muted)" }}
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {sel.guestName && (
                <div
                  className="flex items-center gap-3 p-3 rounded-[8px]"
                  style={{ background: "var(--color-surface)" }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                    style={{ background: "var(--color-primary)" }}
                  >
                    {sel.guestName[0]}
                  </div>
                  <div>
                    <div
                      className="font-medium"
                      style={{ color: "var(--color-text)" }}
                    >
                      {sel.guestName}
                    </div>
                    <Badge variant={badgeVariant(sel.status)}>
                      {statusLabel[sel.status]}
                    </Badge>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  ["Covers", sel.covers ?? "—"],
                  ["Check-ins", "—"],
                  ["Timp", sel.seatedAt ? elapsed(sel.seatedAt) : "—"],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="py-2 rounded-[8px]"
                    style={{ background: "var(--color-surface)" }}
                  >
                    <div
                      className="text-lg font-bold"
                      style={{
                        color: "var(--color-primary)",
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      {v}
                    </div>
                    <div
                      className="text-[11px] uppercase tracking-[0.05em]"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {k}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {SEATED_VARIANTS.has(sel.status) && (
                  <button
                    onClick={() => updateStatus(sel.id, "turning")}
                    className="w-full h-10 rounded-[4px] border font-semibold text-sm"
                    style={{
                      borderColor: "var(--color-turning)",
                      color: "var(--color-turning)",
                    }}
                  >
                    Eliberare masă
                  </button>
                )}
                {(sel.status === "turning" || sel.status === "available") && (
                  <button
                    onClick={() => updateStatus(sel.id, "seated")}
                    className="w-full h-10 rounded-[4px] text-white font-semibold text-sm"
                    style={{ background: "var(--color-primary)" }}
                  >
                    Ocupă masa
                  </button>
                )}
                {sel.status === "reserved" && (
                  <button
                    onClick={() => updateStatus(sel.id, "seated")}
                    className="w-full h-10 rounded-[4px] text-white font-semibold text-sm"
                    style={{ background: "var(--color-primary)" }}
                  >
                    Check-in
                  </button>
                )}
                <button
                  onClick={() =>
                    updateStatus(
                      sel.id,
                      sel.status === "blocked" ? "available" : "blocked"
                    )
                  }
                  className="w-full h-10 rounded-[4px] border font-semibold text-sm"
                  style={{
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {sel.status === "blocked" ? "Deblocare" : "Blocare masă"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
