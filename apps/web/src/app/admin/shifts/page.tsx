"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";
const VENUE_ID = process.env.NEXT_PUBLIC_VENUE_ID ?? "146fd211-ae20-5ebe-a7af-3c195ab89ae8";

// ── Types ─────────────────────────────────────────────────────────────────────

type ShiftType = "morning" | "afternoon" | "evening" | "full_day";

interface StaffSummary { id: string; first_name: string; last_name: string; role: string; }

interface ShiftAssignment {
  id: string;
  shift_id: string;
  staff_member_id: string;
  zone_id: string | null;
  section_label: string | null;
  staff_member: StaffSummary | null;
}

interface Shift {
  id: string;
  zone_id: string;
  shift_date: string;
  shift_type: ShiftType;
  starts_at: string;
  ends_at: string;
  cover_target: number | null;
  briefing_notes: string | null;
  incident_log: string | null;
  assignments: ShiftAssignment[];
}

interface PacingBucket {
  bucket_start: string;
  bucket_end: string;
  covers: number;
  reservations: number;
}

interface PacingResponse {
  shift_id: string;
  window_start: string;
  window_end: string;
  buckets: PacingBucket[];
  total_covers: number;
}

interface StaffMember { id: string; first_name: string; last_name: string; role: string; is_active: boolean; }

// ── Constants ─────────────────────────────────────────────────────────────────

const SHIFT_LABELS: Record<ShiftType, string> = {
  morning: "Dimineață (08–15)",
  afternoon: "Prânz (12–19)",
  evening: "Seară (17–01)",
  full_day: "Zi completă",
};

const SHIFT_COLORS: Record<ShiftType, { bg: string; border: string; label: string }> = {
  morning:   { bg: "#FFFBEB", border: "#FCD34D", label: "#92400E" },
  afternoon: { bg: "#EFF6FF", border: "#93C5FD", label: "#1E40AF" },
  evening:   { bg: "#F5F3FF", border: "#A78BFA", label: "#4C1D95" },
  full_day:  { bg: "#F0FDF4", border: "#6EE7B7", label: "#065F46" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ── Pacing chart (SVG) ────────────────────────────────────────────────────────

function PacingChart({ pacing }: { pacing: PacingResponse }) {
  const max = Math.max(...pacing.buckets.map(b => b.covers), 1);
  const BAR_W = 28;
  const BAR_GAP = 4;
  const CHART_H = 120;
  const LABEL_H = 20;
  const width = pacing.buckets.length * (BAR_W + BAR_GAP);

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={width} height={CHART_H + LABEL_H} style={{ display: "block" }}>
        {pacing.buckets.map((b, i) => {
          const barH = b.covers === 0 ? 2 : Math.max(4, (b.covers / max) * CHART_H);
          const x = i * (BAR_W + BAR_GAP);
          const y = CHART_H - barH;
          const isHour = new Date(b.bucket_start).getMinutes() === 0;
          return (
            <g key={b.bucket_start}>
              <rect
                x={x} y={y} width={BAR_W} height={barH}
                fill={b.covers > 0 ? "var(--color-primary)" : "var(--color-border)"}
                rx={2}
              />
              {b.covers > 0 && (
                <text x={x + BAR_W / 2} y={y - 3} textAnchor="middle" fontSize={9} fill="var(--color-text-muted)">
                  {b.covers}
                </text>
              )}
              {isHour && (
                <text x={x + BAR_W / 2} y={CHART_H + 14} textAnchor="middle" fontSize={9} fill="var(--color-text-muted)">
                  {formatTime(b.bucket_start)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
        Total coperți estimați: <strong>{pacing.total_covers}</strong>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminShiftsPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();

  const [roleOk, setRoleOk] = useState<boolean | null>(null);
  const [shiftDate, setShiftDate] = useState(todayISO());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [pacing, setPacing] = useState<PacingResponse | null>(null);
  const [pacingLoading, setPacingLoading] = useState(false);

  // Staff for assignment dropdown
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [addSection, setAddSection] = useState("");
  const [addStaffId, setAddStaffId] = useState("");
  const [addingAssignment, setAddingAssignment] = useState(false);

  // Briefing regeneration
  const [briefingLoading, setBriefingLoading] = useState(false);

  // Incident log editing
  const [editingIncident, setEditingIncident] = useState(false);
  const [incidentDraft, setIncidentDraft] = useState("");

  // Create shift form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    shift_type: "evening" as ShiftType,
    zone_id: "",
    starts_at: "",
    ends_at: "",
    cover_target: "",
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // ── Auth check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { router.replace("/login"); return; }
    getToken({ template: "default" }).then(async (token) => {
      if (!token) { setRoleOk(false); return; }
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const role = payload?.metadata?.role ?? payload?.publicMetadata?.role;
        setRoleOk(role === "admin" || role === "manager");
      } catch { setRoleOk(false); }
    });
  }, [isLoaded, isSignedIn, getToken, router]);

  // ── Fetch shifts for date ───────────────────────────────────────────────────
  const fetchShifts = useCallback(async () => {
    if (!roleOk) return;
    setLoading(true);
    const token = await getToken({ template: "default" });
    const params = new URLSearchParams({ venue_id: VENUE_ID, shift_date: shiftDate });
    const res = await fetch(`${API_URL}/api/v1/shifts?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data: Shift[] = await res.json();
      setShifts(data);
      if (data.length > 0 && !selectedShift) setSelectedShift(data[0]);
    }
    setLoading(false);
  }, [roleOk, shiftDate, getToken, selectedShift]);

  useEffect(() => { fetchShifts(); }, [roleOk, shiftDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch pacing for selected shift ────────────────────────────────────────
  useEffect(() => {
    if (!selectedShift) return;
    setPacingLoading(true);
    getToken({ template: "default" }).then(async (token) => {
      const res = await fetch(`${API_URL}/api/v1/shifts/${selectedShift.id}/pacing`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setPacing(await res.json());
      setPacingLoading(false);
    });
  }, [selectedShift, getToken]);

  // ── Fetch staff list ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!roleOk) return;
    getToken({ template: "default" }).then(async (token) => {
      const res = await fetch(`${API_URL}/api/v1/staff?venue_id=${VENUE_ID}&is_active=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setStaffList(await res.json());
    });
  }, [roleOk, getToken]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function regenerateBriefing() {
    if (!selectedShift) return;
    setBriefingLoading(true);
    const token = await getToken({ template: "default" });
    const res = await fetch(`${API_URL}/api/v1/shifts/${selectedShift.id}/briefing`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const updated: Shift = await res.json();
      setSelectedShift(updated);
      setShifts(prev => prev.map(s => s.id === updated.id ? updated : s));
    }
    setBriefingLoading(false);
  }

  async function saveIncidentLog() {
    if (!selectedShift) return;
    const token = await getToken({ template: "default" });
    const res = await fetch(`${API_URL}/api/v1/shifts/${selectedShift.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ incident_log: incidentDraft }),
    });
    if (res.ok) {
      const updated: Shift = await res.json();
      setSelectedShift(updated);
      setShifts(prev => prev.map(s => s.id === updated.id ? updated : s));
    }
    setEditingIncident(false);
  }

  async function addAssignment() {
    if (!selectedShift || !addStaffId) return;
    setAddingAssignment(true);
    const token = await getToken({ template: "default" });
    const res = await fetch(`${API_URL}/api/v1/shifts/${selectedShift.id}/assignments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        staff_member_id: addStaffId,
        section_label: addSection || null,
      }),
    });
    if (res.ok) {
      // Reload full shift to get updated assignments
      const shiftRes = await fetch(`${API_URL}/api/v1/shifts/${selectedShift.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (shiftRes.ok) {
        const updated: Shift = await shiftRes.json();
        setSelectedShift(updated);
        setShifts(prev => prev.map(s => s.id === updated.id ? updated : s));
      }
      setAddSection("");
      setAddStaffId("");
    }
    setAddingAssignment(false);
  }

  async function removeAssignment(assignmentId: string) {
    if (!selectedShift) return;
    const token = await getToken({ template: "default" });
    await fetch(`${API_URL}/api/v1/shifts/${selectedShift.id}/assignments/${assignmentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const shiftRes = await fetch(`${API_URL}/api/v1/shifts/${selectedShift.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (shiftRes.ok) {
      const updated: Shift = await shiftRes.json();
      setSelectedShift(updated);
      setShifts(prev => prev.map(s => s.id === updated.id ? updated : s));
    }
  }

  async function handleCreateShift() {
    setCreating(true);
    setCreateError(null);
    const token = await getToken({ template: "default" });
    const body = {
      venue_id: VENUE_ID,
      zone_id: createForm.zone_id,
      shift_date: shiftDate,
      shift_type: createForm.shift_type,
      starts_at: createForm.starts_at ? new Date(createForm.starts_at).toISOString() : null,
      ends_at: createForm.ends_at ? new Date(createForm.ends_at).toISOString() : null,
      cover_target: createForm.cover_target ? Number(createForm.cover_target) : null,
    };
    const res = await fetch(`${API_URL}/api/v1/shifts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setShowCreateForm(false);
      await fetchShifts();
    } else {
      const err = await res.json();
      setCreateError(err?.detail ?? "Eroare la creare.");
    }
    setCreating(false);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!isLoaded || roleOk === null) {
    return (
      <div style={{ padding: 40, color: "var(--color-text-muted)", fontSize: 14 }}>
        Se verifică permisiunile…
      </div>
    );
  }

  if (roleOk === false) {
    return (
      <div style={{ padding: 40, color: "var(--color-error)", fontSize: 14 }}>
        Acces restricționat. Această pagină necesită rol de manager sau admin.
      </div>
    );
  }

  const shiftColors = selectedShift ? SHIFT_COLORS[selectedShift.shift_type] : null;

  return (
    <div style={{ padding: "32px 40px", fontFamily: "var(--font-body)" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--color-text)", margin: 0 }}>
            Gestionare Ture
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "4px 0 0" }}>
            Briefing pre-tură, asignare serveri, ritm bucătărie
          </p>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="date"
            value={shiftDate}
            onChange={e => { setShiftDate(e.target.value); setSelectedShift(null); }}
            style={{
              border: "1px solid var(--color-border)", borderRadius: 6,
              padding: "6px 10px", fontSize: 13, background: "var(--color-surface)",
              color: "var(--color-text)", cursor: "pointer",
            }}
          />
          <button
            onClick={() => setShowCreateForm(v => !v)}
            style={{
              background: "var(--color-primary)", color: "#fff",
              border: "none", borderRadius: 6, padding: "7px 14px",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            + Tură nouă
          </button>
        </div>
      </div>

      {/* ── Create shift form ── */}
      {showCreateForm && (
        <div style={{
          background: "var(--color-raised)", border: "1px solid var(--color-border)",
          borderRadius: 10, padding: 20, marginBottom: 24,
        }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Creare tură nouă — {shiftDate}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            <label style={{ fontSize: 12 }}>
              Tip tură
              <select
                value={createForm.shift_type}
                onChange={e => setCreateForm(f => ({ ...f, shift_type: e.target.value as ShiftType }))}
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 8px", fontSize: 13, border: "1px solid var(--color-border)", borderRadius: 5 }}
              >
                {(Object.keys(SHIFT_LABELS) as ShiftType[]).map(k => (
                  <option key={k} value={k}>{SHIFT_LABELS[k]}</option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: 12 }}>
              Zone ID
              <input
                value={createForm.zone_id}
                onChange={e => setCreateForm(f => ({ ...f, zone_id: e.target.value }))}
                placeholder="uuid zonă"
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 8px", fontSize: 13, border: "1px solid var(--color-border)", borderRadius: 5 }}
              />
            </label>
            <label style={{ fontSize: 12 }}>
              Început
              <input
                type="datetime-local"
                value={createForm.starts_at}
                onChange={e => setCreateForm(f => ({ ...f, starts_at: e.target.value }))}
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 8px", fontSize: 13, border: "1px solid var(--color-border)", borderRadius: 5 }}
              />
            </label>
            <label style={{ fontSize: 12 }}>
              Sfârșit
              <input
                type="datetime-local"
                value={createForm.ends_at}
                onChange={e => setCreateForm(f => ({ ...f, ends_at: e.target.value }))}
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 8px", fontSize: 13, border: "1px solid var(--color-border)", borderRadius: 5 }}
              />
            </label>
            <label style={{ fontSize: 12 }}>
              Țintă coperți
              <input
                type="number"
                value={createForm.cover_target}
                onChange={e => setCreateForm(f => ({ ...f, cover_target: e.target.value }))}
                placeholder="opțional"
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 8px", fontSize: 13, border: "1px solid var(--color-border)", borderRadius: 5 }}
              />
            </label>
          </div>
          {createError && <div style={{ color: "var(--color-error)", fontSize: 12, marginTop: 8 }}>{createError}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button
              onClick={handleCreateShift}
              disabled={creating}
              style={{ background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: 5, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              {creating ? "Se creează…" : "Crează"}
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              style={{ background: "transparent", color: "var(--color-text-muted)", border: "1px solid var(--color-border)", borderRadius: 5, padding: "7px 16px", fontSize: 13, cursor: "pointer" }}
            >
              Anulează
            </button>
          </div>
        </div>
      )}

      {/* ── Shift tabs ── */}
      {loading ? (
        <div style={{ color: "var(--color-text-muted)", fontSize: 13, padding: 16 }}>Se încarcă turele…</div>
      ) : shifts.length === 0 ? (
        <div style={{
          background: "var(--color-raised)", borderRadius: 10, padding: 32,
          textAlign: "center", color: "var(--color-text-muted)", fontSize: 14,
        }}>
          Nu există ture pentru {shiftDate}. Creează una cu butonul de mai sus.
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
            {shifts.map(s => {
              const c = SHIFT_COLORS[s.shift_type];
              const isActive = selectedShift?.id === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedShift(s)}
                  style={{
                    background: isActive ? c.bg : "var(--color-raised)",
                    border: `2px solid ${isActive ? c.border : "var(--color-border)"}`,
                    borderRadius: 8, padding: "8px 16px",
                    fontSize: 13, fontWeight: isActive ? 700 : 500,
                    color: isActive ? c.label : "var(--color-text)",
                    cursor: "pointer", transition: "all .15s",
                  }}
                >
                  {SHIFT_LABELS[s.shift_type]}
                  <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>
                    {s.assignments.length} serveri
                  </span>
                </button>
              );
            })}
          </div>

          {selectedShift && shiftColors && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* ── Left column: briefing + incident ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Briefing card */}
                <div style={{
                  background: "var(--color-raised)", border: "1px solid var(--color-border)",
                  borderRadius: 10, padding: 20,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "var(--color-text)" }}>
                      Briefing Pre-Tură
                    </div>
                    <button
                      onClick={regenerateBriefing}
                      disabled={briefingLoading}
                      style={{
                        background: "var(--color-accent-light)", color: "var(--color-primary)",
                        border: "1px solid var(--color-primary)", borderRadius: 5,
                        padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      {briefingLoading ? "Se generează…" : "↻ Regenerează"}
                    </button>
                  </div>

                  {selectedShift.briefing_notes ? (
                    <pre style={{
                      fontSize: 12, lineHeight: 1.65,
                      color: "var(--color-text)", whiteSpace: "pre-wrap",
                      fontFamily: "var(--font-body)", margin: 0,
                    }}>
                      {selectedShift.briefing_notes}
                    </pre>
                  ) : (
                    <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                      Niciun briefing generat. Apasă „Regenerează" pentru a crea unul din rezervările existente.
                    </div>
                  )}
                </div>

                {/* Incident log */}
                <div style={{
                  background: "var(--color-raised)", border: "1px solid var(--color-border)",
                  borderRadius: 10, padding: 20,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "var(--color-text)" }}>
                      Jurnal Incidente
                    </div>
                    {!editingIncident && (
                      <button
                        onClick={() => { setIncidentDraft(selectedShift.incident_log ?? ""); setEditingIncident(true); }}
                        style={{ fontSize: 12, color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                      >
                        Editează
                      </button>
                    )}
                  </div>

                  {editingIncident ? (
                    <>
                      <textarea
                        value={incidentDraft}
                        onChange={e => setIncidentDraft(e.target.value)}
                        rows={5}
                        style={{
                          width: "100%", boxSizing: "border-box",
                          border: "1px solid var(--color-border)", borderRadius: 6,
                          padding: "8px 10px", fontSize: 13, lineHeight: 1.6,
                          fontFamily: "var(--font-body)", resize: "vertical",
                        }}
                      />
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button
                          onClick={saveIncidentLog}
                          style={{ background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: 5, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                        >
                          Salvează
                        </button>
                        <button
                          onClick={() => setEditingIncident(false)}
                          style={{ background: "none", color: "var(--color-text-muted)", border: "1px solid var(--color-border)", borderRadius: 5, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}
                        >
                          Anulează
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 13, color: selectedShift.incident_log ? "var(--color-text)" : "var(--color-text-muted)", lineHeight: 1.6 }}>
                      {selectedShift.incident_log || "Nicio notă de incident înregistrată."}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Right column: assignments + pacing ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Server assignments */}
                <div style={{
                  background: "var(--color-raised)", border: "1px solid var(--color-border)",
                  borderRadius: 10, padding: 20,
                }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "var(--color-text)", marginBottom: 14 }}>
                    Asignare Serveri
                  </div>

                  {selectedShift.assignments.length === 0 ? (
                    <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 14 }}>
                      Niciun server asignat acestei ture.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                      {selectedShift.assignments.map(a => (
                        <div key={a.id} style={{
                          display: "flex", alignItems: "center",
                          background: "var(--color-surface)", border: "1px solid var(--color-border)",
                          borderRadius: 7, padding: "8px 12px", gap: 8,
                        }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%",
                            background: "var(--color-primary)", color: "#fff",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 700, flexShrink: 0,
                          }}>
                            {a.staff_member ? a.staff_member.first_name[0] + a.staff_member.last_name[0] : "?"}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>
                              {a.staff_member ? `${a.staff_member.first_name} ${a.staff_member.last_name}` : a.staff_member_id}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                              {a.staff_member?.role}
                              {a.section_label && ` · Secțiunea ${a.section_label}`}
                            </div>
                          </div>
                          <button
                            onClick={() => removeAssignment(a.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-error)", fontSize: 16, padding: "0 4px" }}
                            title="Elimină"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add assignment form */}
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 4 }}>Server</div>
                      <select
                        value={addStaffId}
                        onChange={e => setAddStaffId(e.target.value)}
                        style={{ width: "100%", padding: "6px 8px", fontSize: 13, border: "1px solid var(--color-border)", borderRadius: 5 }}
                      >
                        <option value="">— selectează —</option>
                        {staffList.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.first_name} {s.last_name} ({s.role})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ width: 80 }}>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 4 }}>Secțiune</div>
                      <input
                        value={addSection}
                        onChange={e => setAddSection(e.target.value)}
                        placeholder="A, B…"
                        style={{ width: "100%", padding: "6px 8px", fontSize: 13, border: "1px solid var(--color-border)", borderRadius: 5 }}
                      />
                    </div>
                    <button
                      onClick={addAssignment}
                      disabled={addingAssignment || !addStaffId}
                      style={{
                        background: "var(--color-primary)", color: "#fff",
                        border: "none", borderRadius: 5, padding: "7px 12px",
                        fontSize: 13, fontWeight: 600, cursor: "pointer",
                        opacity: !addStaffId ? 0.5 : 1,
                      }}
                    >
                      {addingAssignment ? "…" : "Adaugă"}
                    </button>
                  </div>
                </div>

                {/* Kitchen pacing */}
                <div style={{
                  background: "var(--color-raised)", border: "1px solid var(--color-border)",
                  borderRadius: 10, padding: 20,
                }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "var(--color-text)", marginBottom: 4 }}>
                    Ritm Bucătărie
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 14 }}>
                    Coperți estimați per interval de 15 minute
                  </div>
                  {pacingLoading ? (
                    <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Se calculează…</div>
                  ) : pacing ? (
                    <PacingChart pacing={pacing} />
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
