"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface KPIs {
  total_covers: number;
  avg_spend_per_cover_ron: number;
  occupancy_pct: number;
  new_guests: number;
  total_spend_ron: number;
  no_shows: number;
}

interface TrendPoint { day: string; covers: number; bookings: number; }

interface ZonePerf {
  zone_name: string;
  zone_slug: string;
  covers: number;
  spend_ron: number;
}

interface TopGuest {
  guest_id: string;
  name: string;
  is_vip: boolean;
  vip_tags: string[];
  visits: number;
  spend_ron: number;
  last_visit: string | null;
}

// ── Chart helpers ─────────────────────────────────────────────────────────────

const DAYS_OPTIONS = [
  { label: "Azi", value: 1 },
  { label: "7 zile", value: 7 },
  { label: "30 zile", value: 30 },
  { label: "90 zile", value: 90 },
];

const DAY_LABELS_RO: Record<number, string> = { 0: "Dum", 1: "Lun", 2: "Mar", 3: "Mie", 4: "Joi", 5: "Vin", 6: "Sâm" };

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]}`;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]}, ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function CoversTrendChart({ data }: { data: TrendPoint[] }) {
  if (!data.length) {
    return (
      <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
        Nu există date pentru această perioadă.
      </div>
    );
  }

  const maxCovers = Math.max(...data.map(d => d.covers), 1);
  const W = 640, H = 200, PL = 60, PR = 20, PT = 20, PB = 36;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;

  const pts = data.map((d, i) => {
    const x = PL + (i / Math.max(data.length - 1, 1)) * chartW;
    const y = PT + (1 - d.covers / maxCovers) * chartH;
    return { x, y, d };
  });

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = linePath + ` L${pts[pts.length - 1].x},${PT + chartH} L${pts[0].x},${PT + chartH} Z`;

  const yLabels = [maxCovers, Math.round(maxCovers * 0.66), Math.round(maxCovers * 0.33), 0];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 200 }}>
      <defs>
        <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2C4A2E" stopOpacity={0.18} />
          <stop offset="100%" stopColor="#2C4A2E" stopOpacity={0.02} />
        </linearGradient>
      </defs>
      {yLabels.map((v, i) => {
        const y = PT + (i / 3) * chartH;
        return (
          <g key={i}>
            <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="var(--color-border)" strokeWidth={1} strokeDasharray="4,4" />
            <text x={PL - 8} y={y + 4} textAnchor="end" fontSize={11} fill="var(--color-text-muted)" fontFamily="Inter, sans-serif">{v}</text>
          </g>
        );
      })}
      <path d={areaPath} fill="url(#ag)" />
      <path d={linePath} stroke="var(--color-primary)" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill="white" stroke="var(--color-primary)" strokeWidth={2} />
          <text x={p.x} y={H - 4} textAnchor="middle" fontSize={11} fill="var(--color-text-muted)" fontFamily="Inter, sans-serif">
            {DAY_LABELS_RO[new Date(p.d.day).getDay()] ?? formatDate(p.d.day)}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── CSV export ────────────────────────────────────────────────────────────────

function exportCSV(kpis: KPIs | null, trend: TrendPoint[], zones: ZonePerf[], guests: TopGuest[]) {
  const lines: string[] = ["LMBSC Analytics Export\n"];
  lines.push("KPIs");
  lines.push("Metric,Valoare");
  if (kpis) {
    lines.push(`Total Covers,${kpis.total_covers}`);
    lines.push(`Cheltuială medie / cover (RON),${kpis.avg_spend_per_cover_ron}`);
    lines.push(`Venit total (RON),${kpis.total_spend_ron}`);
    lines.push(`Ocupare rezervări (%),${kpis.occupancy_pct}`);
    lines.push(`Oaspeți noi,${kpis.new_guests}`);
  }
  lines.push("\nTrend Covers");
  lines.push("Data,Covers,Rezervări");
  trend.forEach(t => lines.push(`${t.day},${t.covers},${t.bookings}`));
  lines.push("\nPerformanță Zonă");
  lines.push("Zonă,Covers,Venit (RON)");
  zones.forEach(z => lines.push(`${z.zone_name},${z.covers},${z.spend_ron.toFixed(2)}`));
  lines.push("\nTop Oaspeți");
  lines.push("Nume,VIP,Vizite,Cheltuială (RON),Ultima vizită");
  guests.forEach(g => lines.push(`${g.name},${g.is_vip ? "Da" : "Nu"},${g.visits},${g.spend_ron.toFixed(2)},${g.last_visit ? formatDateTime(g.last_visit) : ""}`));

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lmbsc-analytics-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [days, setDays] = useState(7);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [zones, setZones] = useState<ZonePerf[]>([]);
  const [guests, setGuests] = useState<TopGuest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [k, t, z, g] = await Promise.all([
        fetch(`/api/v1/analytics/kpis?days=${days}`).then(r => r.json()),
        fetch(`/api/v1/analytics/covers-trend?days=${days}`).then(r => r.json()),
        fetch(`/api/v1/analytics/zone-performance?days=${days}`).then(r => r.json()),
        fetch(`/api/v1/analytics/top-guests?days=${days}&limit=10`).then(r => r.json()),
      ]);
      setKpis(k);
      setTrend(Array.isArray(t) ? t : []);
      setZones(Array.isArray(z) ? z : []);
      setGuests(Array.isArray(g) ? g : []);
    } catch { /* silently degrade */ }
    setLoading(false);
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const maxZoneCovers = Math.max(...zones.map(z => z.covers), 1);

  return (
    <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "var(--color-primary)" }}>Analytics</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Period selector */}
          <div style={{ display: "flex", background: "white", border: "1.5px solid var(--color-border)", borderRadius: 4, overflow: "hidden" }}>
            {DAYS_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setDays(opt.value)}
                style={{
                  height: 36, padding: "0 14px", fontSize: 13, fontWeight: 500,
                  background: days === opt.value ? "var(--color-primary)" : "transparent",
                  color: days === opt.value ? "white" : "var(--color-text)",
                  border: "none", cursor: "pointer", fontFamily: "var(--font-body)",
                }}>
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => exportCSV(kpis, trend, zones, guests)}
            style={{
              height: 36, padding: "0 16px", fontSize: 13, fontWeight: 600,
              background: "var(--color-accent)", color: "white",
              border: "none", borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              fontFamily: "var(--font-body)",
            }}>
            ↓ Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <KpiCard
          label="Total Covers"
          value={loading ? "—" : kpis?.total_covers.toLocaleString("ro-RO") ?? "0"}
          sub={`ultimele ${days} zile`}
          trend={null}
        />
        <KpiCard
          label="Cheltuială medie / cover"
          value={loading ? "—" : `${(kpis?.avg_spend_per_cover_ron ?? 0).toFixed(0)} RON`}
          sub={kpis?.total_spend_ron ? `Total: ${(kpis.total_spend_ron / 1000).toFixed(1)}k RON` : "—"}
          trend={null}
        />
        <KpiCard
          label="Rata de ocupare rezervări"
          value={loading ? "—" : `${kpis?.occupancy_pct ?? 0}%`}
          progressPct={kpis?.occupancy_pct ?? 0}
          trend={null}
        />
        <KpiCard
          label="Oaspeți noi"
          value={loading ? "—" : `${kpis?.new_guests ?? 0}`}
          sub={`înregistrați în ultimele ${days} zile`}
          trend={null}
        />
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16 }}>
        {/* Line Chart */}
        <div style={{ background: "white", border: "1px solid var(--color-border)", borderRadius: 8, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)" }}>Trend Covers</span>
            <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              {trend.length > 0 ? `${formatDate(trend[0].day)} – ${formatDate(trend[trend.length - 1].day)}` : `Ultimele ${days} zile`}
            </span>
          </div>
          {loading ? (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)" }}>Se încarcă...</div>
          ) : (
            <CoversTrendChart data={trend} />
          )}
        </div>

        {/* Bar Chart — Zone Performance */}
        <div style={{ background: "white", border: "1px solid var(--color-border)", borderRadius: 8, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)" }}>Performanță pe Zonă</span>
            <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Covers totale</span>
          </div>
          {loading ? (
            <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)" }}>Se încarcă...</div>
          ) : zones.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 8 }}>Nu există date.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {zones.map(z => (
                <div key={z.zone_slug} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--color-text)" }}>
                    <span>{z.zone_name}</span>
                    <span style={{ fontWeight: 600, color: "var(--color-primary)" }}>{z.covers}</span>
                  </div>
                  <div style={{ height: 8, background: "var(--color-border)", borderRadius: 100, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 100, background: "linear-gradient(90deg, var(--color-primary) 0%, var(--color-accent) 100%)", width: `${(z.covers / maxZoneCovers) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Estimated revenue */}
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--color-border)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", marginBottom: 6 }}>Venit estimat</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "var(--color-accent)" }}>
              {loading ? "—" : `${(zones.reduce((s, z) => s + z.spend_ron, 0) / 1000).toFixed(1)}k RON`}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>ultimele {days} zile · toate zonele</div>
          </div>
        </div>
      </div>

      {/* Top Guests Table */}
      <div style={{ background: "white", border: "1px solid var(--color-border)", borderRadius: 8, padding: 0 }}>
        <div style={{ padding: "20px 20px 0" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)", marginBottom: 12 }}>Top Oaspeți</div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
              {["#", "Oaspete", "Vizite", "Cheltuială totală", "Ultima vizită", "Statut"].map(h => (
                <th key={h} style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", padding: "10px 16px", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--color-text-muted)" }}>Se încarcă...</td></tr>
            ) : guests.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--color-text-muted)" }}>Nu există date pentru această perioadă.</td></tr>
            ) : (
              guests.map((g, i) => (
                <tr key={g.guest_id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 24, height: 24, borderRadius: "100px",
                      fontSize: 11, fontWeight: 700,
                      background: i === 0 ? "var(--color-accent-light)" : i === 1 ? "#F1F5F9" : i === 2 ? "#FEF3C7" : "var(--color-surface)",
                      color: i === 0 ? "var(--color-accent)" : i === 1 ? "#64748B" : i === 2 ? "#D97706" : "var(--color-text-muted)",
                    }}>{i + 1}</span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <strong style={{ fontSize: 13 }}>{g.name}</strong>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--color-text)" }}>{g.visits}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "var(--color-accent)" }}>
                    {g.spend_ron > 0 ? `${g.spend_ron.toFixed(0)} RON` : "—"}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--color-text-muted)" }}>
                    {g.last_visit ? formatDateTime(g.last_visit) : "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {g.is_vip ? (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
                        padding: "3px 8px", borderRadius: 4,
                        background: "var(--color-accent-light)", color: "var(--color-accent)",
                        border: "1px solid rgba(184,150,46,0.3)",
                      }}>★ {g.vip_tags?.[0] ?? "VIP"}</span>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Regular</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── KPI Card component ────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, progressPct, trend,
}: {
  label: string;
  value: string;
  sub?: string;
  progressPct?: number;
  trend: { dir: "up" | "down" | "neutral"; label: string } | null;
}) {
  return (
    <div style={{ background: "white", border: "1px solid var(--color-border)", borderRadius: 8, padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 700, color: "var(--color-primary)", lineHeight: 1 }}>{value}</div>
      {progressPct !== undefined ? (
        <div style={{ marginTop: 4 }}>
          <div style={{ height: 6, background: "var(--color-border)", borderRadius: 100, overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 100, background: "var(--color-accent)", width: `${progressPct}%`, transition: "width 0.5s" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>
            <span>0%</span><span>100%</span>
          </div>
        </div>
      ) : sub ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{sub}</span>
          {trend && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 100,
              background: trend.dir === "up" ? "#EAF0EA" : trend.dir === "down" ? "#FEE2E2" : "#FBF4E3",
              color: trend.dir === "up" ? "var(--color-primary)" : trend.dir === "down" ? "#DC2626" : "var(--color-accent)",
            }}>{trend.label}</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
