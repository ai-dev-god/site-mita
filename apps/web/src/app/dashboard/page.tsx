"use client";

import { useState, useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import Badge from "@/components/Badge";

type TableStatus = "available" | "seated" | "reserved" | "turning" | "blocked";

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

const MOCK_TABLES: TableData[] = [
  { id: "t1",  label: "B01", zone: "Brasserie",    status: "seated",    guestName: "Popescu",  partySize: 4, seatedAt: new Date(Date.now() - 45 * 60000), covers: 4 },
  { id: "t2",  label: "B02", zone: "Brasserie",    status: "reserved",  reservedAt: "20:00",  covers: 2 },
  { id: "t3",  label: "B03", zone: "Brasserie",    status: "available" },
  { id: "t4",  label: "B04", zone: "Brasserie",    status: "turning",   guestName: "Ionescu", partySize: 3 },
  { id: "t5",  label: "B05", zone: "Brasserie",    status: "available" },
  { id: "t6",  label: "B06", zone: "Brasserie",    status: "seated",    guestName: "Dumitrescu", partySize: 6, seatedAt: new Date(Date.now() - 20 * 60000), covers: 6 },
  { id: "t7",  label: "S01", zone: "Salon Istoric", status: "seated",   guestName: "Stanescu", partySize: 2, seatedAt: new Date(Date.now() - 75 * 60000), covers: 2 },
  { id: "t8",  label: "S02", zone: "Salon Istoric", status: "reserved", reservedAt: "19:30",  covers: 4 },
  { id: "t9",  label: "S03", zone: "Salon Istoric", status: "blocked" },
  { id: "t10", label: "S04", zone: "Salon Istoric", status: "available" },
];

function elapsed(d: Date): string {
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  return now;
}

const statusLabel: Record<TableStatus, string> = {
  available: "Liber", seated: "Ocupat", reserved: "Rezervat", turning: "Eliberare", blocked: "Blocat",
};

const ZONE_FILTERS = ["Toate", "Brasserie", "Salon Istoric"];

export default function DashboardPage() {
  const now = useNow();
  const [zone, setZone]   = useState("Toate");
  const [tab,  setTab]    = useState<"floor" | "queue">("floor");
  const [sel,  setSel]    = useState<TableData | null>(null);
  const [tables, setTables] = useState<TableData[]>(MOCK_TABLES);

  const visible = tables.filter(t => zone === "Toate" || t.zone === zone);

  const stats = {
    seated:    tables.filter(t => t.status === "seated").reduce((s, t) => s + (t.covers ?? 0), 0),
    reserved:  tables.filter(t => t.status === "reserved").length,
    available: tables.filter(t => t.status === "available").length,
  };

  function updateStatus(id: string, status: TableStatus) {
    setTables(ts => ts.map(t => t.id === id ? { ...t, status, seatedAt: status === "seated" ? new Date() : t.seatedAt } : t));
    setSel(s => s?.id === id ? { ...s, status } : s);
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--color-surface)" }}>

      {/* Top bar */}
      <div className="h-16 flex items-center gap-4 px-6 border-b shrink-0" style={{ background: "white", borderColor: "var(--color-border)" }}>
        <div className="font-bold text-lg shrink-0" style={{ color: "var(--color-primary)", fontFamily: "var(--font-display)" }}>La Mița Biciclista</div>
        <div className="w-px h-6 mx-2" style={{ background: "var(--color-border)" }} />
        <div className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {now.toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <div className="flex gap-2 ml-2">
          {[
            { label: `${stats.seated} covers`, color: "var(--color-primary)" },
            { label: `${stats.available} libere`, color: "var(--color-available)" },
            { label: `${stats.reserved} rezervate`, color: "var(--color-reserved)" },
          ].map(p => (
            <span key={p.label} className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "var(--color-surface)", color: p.color }}>{p.label}</span>
          ))}
        </div>
        <div className="ml-auto font-mono text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
          {now.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <button className="ml-2 px-4 h-9 rounded-[4px] text-white text-sm font-semibold"
          style={{ background: "var(--color-primary)" }}>Check-in</button>
        <div className="ml-3 flex items-center">
          <UserButton afterSignOutUrl="/login" />
        </div>
      </div>

      {/* Nav tabs */}
      <div className="flex border-b shrink-0" style={{ background: "white", borderColor: "var(--color-border)" }}>
        {([["floor", "Plan Sală"], ["queue", "Coadă Walk-in"]] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className="px-6 h-11 text-sm font-medium transition-all relative"
            style={{ color: tab === t ? "var(--color-primary)" : "var(--color-text-secondary)" }}>
            {label}
            {tab === t && <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "var(--color-primary)" }} />}
          </button>
        ))}
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* Floor panel */}
        <div className="flex-1 p-5 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}>
              {tab === "floor" ? "Vedere sală" : "Coadă walk-in"}
            </h2>
            <div className="flex gap-2">
              {ZONE_FILTERS.map(z => (
                <button key={z} onClick={() => setZone(z)}
                  className="px-3 h-8 rounded-full text-[12px] font-medium border transition-all"
                  style={{
                    borderColor: zone === z ? "var(--color-primary)" : "var(--color-border)",
                    background:  zone === z ? "var(--color-primary)" : "white",
                    color:       zone === z ? "white" : "var(--color-text-secondary)",
                  }}>{z}</button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-4 mb-4 flex-wrap">
            {(["available", "seated", "reserved", "turning", "blocked"] as TableStatus[]).map(s => (
              <span key={s} className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{
                  background: { available: "var(--color-available)", seated: "var(--color-seated)", reserved: "var(--color-reserved)", turning: "var(--color-turning)", blocked: "var(--color-blocked)" }[s]
                }} />{statusLabel[s]}
              </span>
            ))}
          </div>

          {/* Table grid */}
          <div className="grid grid-cols-4 gap-3">
            {visible.map(t => (
              <button key={t.id} onClick={() => setSel(sel?.id === t.id ? null : t)}
                className="text-left p-3 rounded-[8px] border transition-all"
                style={{
                  borderColor: sel?.id === t.id ? "var(--color-primary)" : {
                    available: "rgba(74,122,76,0.2)", seated: "rgba(44,74,46,0.35)",
                    reserved: "rgba(184,150,46,0.35)", turning: "rgba(217,119,6,0.35)", blocked: "rgba(107,114,128,0.2)"
                  }[t.status],
                  background: {
                    available: "#FCFFFE", seated: "#FAFDFB", reserved: "#FFFDF7", turning: "#FFFEF5", blocked: "#FAFAFA"
                  }[t.status],
                  boxShadow: sel?.id === t.id ? "var(--shadow-md)" : undefined,
                  opacity: t.status === "blocked" ? 0.65 : 1,
                }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base font-bold" style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}>{t.label}</span>
                  <Badge variant={t.status}>{statusLabel[t.status]}</Badge>
                </div>
                {t.guestName && <div className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>{t.guestName}</div>}
                {t.reservedAt && <div className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>⏰ {t.reservedAt}</div>}
                {t.seatedAt && (
                  <div className="text-[12px] font-mono mt-1" style={{ color: t.status === "turning" ? "var(--color-turning)" : "var(--color-text-muted)" }}>
                    {elapsed(t.seatedAt)} ·{t.partySize}pers
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        {sel && (
          <div className="w-72 border-l flex flex-col shrink-0" style={{ background: "white", borderColor: "var(--color-border)" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
              <div>
                <span className="font-bold" style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}>Masa {sel.label}</span>
                <Badge className="ml-2" variant="accent">{sel.zone}</Badge>
              </div>
              <button onClick={() => setSel(null)} className="text-lg w-8 h-8 flex items-center justify-center rounded"
                style={{ color: "var(--color-text-muted)" }}>✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {sel.guestName && (
                <div className="flex items-center gap-3 p-3 rounded-[8px]" style={{ background: "var(--color-surface)" }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                    style={{ background: "var(--color-primary)" }}>
                    {sel.guestName[0]}
                  </div>
                  <div>
                    <div className="font-medium" style={{ color: "var(--color-text)" }}>{sel.guestName}</div>
                    <Badge variant={sel.status}>{statusLabel[sel.status]}</Badge>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  ["Covers", sel.covers ?? "—"],
                  ["Check-ins", "—"],
                  ["Timp", sel.seatedAt ? elapsed(sel.seatedAt) : "—"],
                ].map(([k, v]) => (
                  <div key={k} className="py-2 rounded-[8px]" style={{ background: "var(--color-surface)" }}>
                    <div className="text-lg font-bold" style={{ color: "var(--color-primary)", fontFamily: "var(--font-display)" }}>{v}</div>
                    <div className="text-[11px] uppercase tracking-[0.05em]" style={{ color: "var(--color-text-muted)" }}>{k}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {sel.status === "seated" && (
                  <button onClick={() => updateStatus(sel.id, "turning")}
                    className="w-full h-10 rounded-[4px] border font-semibold text-sm"
                    style={{ borderColor: "var(--color-turning)", color: "var(--color-turning)" }}>
                    Eliberare masă
                  </button>
                )}
                {(sel.status === "turning" || sel.status === "available") && (
                  <button onClick={() => updateStatus(sel.id, "seated")}
                    className="w-full h-10 rounded-[4px] text-white font-semibold text-sm"
                    style={{ background: "var(--color-primary)" }}>
                    Ocupă masa
                  </button>
                )}
                {sel.status === "reserved" && (
                  <button onClick={() => updateStatus(sel.id, "seated")}
                    className="w-full h-10 rounded-[4px] text-white font-semibold text-sm"
                    style={{ background: "var(--color-primary)" }}>
                    Check-in
                  </button>
                )}
                <button onClick={() => updateStatus(sel.id, sel.status === "blocked" ? "available" : "blocked")}
                  className="w-full h-10 rounded-[4px] border font-semibold text-sm"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
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
