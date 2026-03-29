"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";
const VENUE_ID = process.env.NEXT_PUBLIC_VENUE_ID ?? "146fd211-ae20-5ebe-a7af-3c195ab89ae8";

type EventStatus = "draft" | "published" | "sold_out" | "cancelled" | "completed";

interface EventItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: EventStatus;
  starts_at: string;
  ends_at: string;
  doors_open_at: string | null;
  total_capacity: number;
  tickets_sold: number;
  ticket_price_ron: number | null;
  is_free: boolean;
  external_ticket_url: string | null;
  zone_id: string | null;
}

interface TicketItem {
  id: string;
  ticket_number: string;
  status: string;
  qr_code: string;
  amount_paid_ron: number | null;
  checked_in_at: string | null;
}

const STATUS_COLORS: Record<EventStatus, { bg: string; color: string }> = {
  draft:     { bg: "#F3F4F6", color: "#6B7280" },
  published: { bg: "#D1FAE5", color: "#065F46" },
  sold_out:  { bg: "#FEF3C7", color: "#92400E" },
  cancelled: { bg: "#FEE2E2", color: "#991B1B" },
  completed: { bg: "#E0E7FF", color: "#3730A3" },
};

const STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Ciornă", published: "Publicat", sold_out: "Sold Out",
  cancelled: "Anulat", completed: "Finalizat",
};

const EMPTY_FORM = {
  name: "", slug: "", description: "", starts_at: "", ends_at: "",
  doors_open_at: "", total_capacity: 100, ticket_price_ron: "",
  is_free: false, external_ticket_url: "",
};

export default function AdminEventsPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleOk, setRoleOk] = useState<boolean | null>(null);
  const [modal, setModal] = useState<"create" | "edit" | "tickets" | null>(null);
  const [selected, setSelected] = useState<EventItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  async function fetchEvents() {
    const token = await getToken({ template: "default" });
    const params = new URLSearchParams({ venue_id: VENUE_ID });
    if (statusFilter !== "all") params.set("status", statusFilter);
    const res = await fetch(`${API_URL}/api/v1/events?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setEvents(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    if (roleOk) fetchEvents();
  }, [roleOk, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setForm(EMPTY_FORM);
    setSelected(null);
    setError(null);
    setModal("create");
  }

  function openEdit(e: EventItem) {
    setSelected(e);
    setError(null);
    setForm({
      name: e.name,
      slug: e.slug,
      description: e.description ?? "",
      starts_at: e.starts_at.slice(0, 16),
      ends_at: e.ends_at.slice(0, 16),
      doors_open_at: e.doors_open_at ? e.doors_open_at.slice(0, 16) : "",
      total_capacity: e.total_capacity,
      ticket_price_ron: e.ticket_price_ron !== null ? String(e.ticket_price_ron) : "",
      is_free: e.is_free,
      external_ticket_url: e.external_ticket_url ?? "",
    });
    setModal("edit");
  }

  async function openTickets(e: EventItem) {
    setSelected(e);
    setModal("tickets");
    setTicketsLoading(true);
    const token = await getToken({ template: "default" });
    const res = await fetch(`${API_URL}/api/v1/events/${e.id}/tickets`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setTickets(await res.json());
    setTicketsLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const token = await getToken({ template: "default" });
    const body = {
      venue_id: VENUE_ID,
      name: form.name,
      slug: form.slug,
      description: form.description || null,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      doors_open_at: form.doors_open_at ? new Date(form.doors_open_at).toISOString() : null,
      total_capacity: Number(form.total_capacity),
      ticket_price_ron: form.is_free ? null : (form.ticket_price_ron ? Number(form.ticket_price_ron) : null),
      is_free: form.is_free,
      external_ticket_url: form.external_ticket_url || null,
      zone_id: null,
    };

    const url = modal === "create"
      ? `${API_URL}/api/v1/events`
      : `${API_URL}/api/v1/events/${selected!.id}`;
    const method = modal === "create" ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err?.detail ?? "A apărut o eroare.");
      setSaving(false);
      return;
    }
    setModal(null);
    setSaving(false);
    fetchEvents();
  }

  async function handlePublish(e: EventItem) {
    const token = await getToken({ template: "default" });
    const newStatus = e.status === "published" ? "draft" : "published";
    await fetch(`${API_URL}/api/v1/events/${e.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchEvents();
  }

  async function handleDelete(e: EventItem) {
    if (!confirm(`Anulezi evenimentul "${e.name}"?`)) return;
    const token = await getToken({ template: "default" });
    await fetch(`${API_URL}/api/v1/events/${e.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchEvents();
  }

  async function handleCheckin(ticket: TicketItem) {
    const token = await getToken({ template: "default" });
    const res = await fetch(
      `${API_URL}/api/v1/tickets/checkin?qr_token=${encodeURIComponent(ticket.qr_code)}`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.ok) {
      const updated = await res.json();
      setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
    }
  }

  if (!isLoaded || roleOk === null) {
    return <div style={{ padding: 48, color: "var(--color-text-sec)" }}>Se încarcă...</div>;
  }
  if (roleOk === false) {
    return <div style={{ padding: 48, color: "var(--color-error)" }}>Acces restricționat.</div>;
  }

  const checkedIn = tickets.filter(t => t.status === "checked_in").length;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: "var(--color-text)", margin: 0 }}>
            Evenimente
          </h1>
          <p style={{ fontSize: 14, color: "var(--color-text-sec)", margin: "4px 0 0" }}>
            Expoziție Anuală și alte evenimente ticketate
          </p>
        </div>
        <button onClick={openCreate} style={{
          background: "var(--color-primary)", color: "#fff",
          border: "none", borderRadius: 8, padding: "10px 20px",
          fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>
          + Eveniment nou
        </button>
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["all", "draft", "published", "sold_out", "completed", "cancelled"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500,
            border: "1px solid var(--color-border)", cursor: "pointer",
            background: statusFilter === s ? "var(--color-primary)" : "var(--color-raised)",
            color: statusFilter === s ? "#fff" : "var(--color-text-sec)",
          }}>
            {s === "all" ? "Toate" : STATUS_LABELS[s as EventStatus] ?? s}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ color: "var(--color-text-muted)", fontSize: 14 }}>Se încarcă...</div>
      ) : events.length === 0 ? (
        <div style={{
          background: "var(--color-raised)", borderRadius: 12, border: "1px solid var(--color-border)",
          padding: 48, textAlign: "center", color: "var(--color-text-muted)", fontSize: 14,
        }}>
          Niciun eveniment. Creează primul eveniment.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {events.map(evt => {
            const sc = STATUS_COLORS[evt.status] ?? STATUS_COLORS.draft;
            const pct = evt.total_capacity > 0 ? Math.round((evt.tickets_sold / evt.total_capacity) * 100) : 0;
            return (
              <div key={evt.id} style={{
                background: "var(--color-raised)", border: "1px solid var(--color-border)",
                borderRadius: 12, padding: "18px 24px",
                display: "flex", alignItems: "center", gap: 20,
              }}>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 16, color: "var(--color-text)" }}>{evt.name}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 12,
                      background: sc.bg, color: sc.color,
                    }}>
                      {STATUS_LABELS[evt.status]}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--color-text-sec)" }}>
                    {new Date(evt.starts_at).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" })}
                    {" → "}
                    {new Date(evt.ends_at).toLocaleString("ro-RO", { timeStyle: "short" })}
                  </div>
                  {evt.description && (
                    <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 400 }}>
                      {evt.description}
                    </div>
                  )}
                </div>

                {/* Capacity */}
                <div style={{ textAlign: "center", minWidth: 100 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>
                    {evt.tickets_sold}/{evt.total_capacity}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 6 }}>bilete</div>
                  <div style={{ height: 6, background: "var(--color-border)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: pct >= 90 ? "#DC2626" : "var(--color-primary)", borderRadius: 3 }} />
                  </div>
                </div>

                {/* Price */}
                <div style={{ textAlign: "center", minWidth: 80 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-accent)" }}>
                    {evt.is_free ? "Gratuit" : evt.ticket_price_ron ? `${evt.ticket_price_ron} RON` : "—"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>bilet</div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => openTickets(evt)} style={btnSecondary}>Bilete</button>
                  <button onClick={() => openEdit(evt)} style={btnSecondary}>Editează</button>
                  {evt.status !== "cancelled" && (
                    <button onClick={() => handlePublish(evt)} style={{
                      ...btnSecondary,
                      background: evt.status === "published" ? "var(--color-primary-muted)" : "var(--color-primary)",
                      color: evt.status === "published" ? "var(--color-primary)" : "#fff",
                      border: "none",
                    }}>
                      {evt.status === "published" ? "Unpublish" : "Publică"}
                    </button>
                  )}
                  {evt.status !== "cancelled" && (
                    <button onClick={() => handleDelete(evt)} style={{ ...btnSecondary, color: "var(--color-error)", borderColor: "#FCA5A5" }}>
                      Anulează
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(modal === "create" || modal === "edit") && (
        <div style={overlay} onClick={() => setModal(null)}>
          <div style={modalCard} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
              {modal === "create" ? "Eveniment nou" : "Editează eveniment"}
            </h2>

            {error && (
              <div style={{ background: "#FEE2E2", color: "#991B1B", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Nume eveniment *</label>
                <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ex. Expoziție Anuală 2026" />
              </div>
              <div>
                <label style={labelStyle}>Slug (URL) *</label>
                <input style={inputStyle} value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))} placeholder="ex. expozitie-anuala-2026" />
              </div>
              <div>
                <label style={labelStyle}>Capacitate totală *</label>
                <input style={inputStyle} type="number" min={1} value={form.total_capacity} onChange={e => setForm(f => ({ ...f, total_capacity: Number(e.target.value) }))} />
              </div>
              <div>
                <label style={labelStyle}>Data & ora începere *</label>
                <input style={inputStyle} type="datetime-local" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Data & ora sfârșit *</label>
                <input style={inputStyle} type="datetime-local" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Deschidere uși</label>
                <input style={inputStyle} type="datetime-local" value={form.doors_open_at} onChange={e => setForm(f => ({ ...f, doors_open_at: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Preț bilet (RON)</label>
                <input style={inputStyle} type="number" min={0} step="0.01" value={form.ticket_price_ron} onChange={e => setForm(f => ({ ...f, ticket_price_ron: e.target.value }))} disabled={form.is_free} placeholder="ex. 50.00" />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 22 }}>
                <input type="checkbox" id="is_free" checked={form.is_free} onChange={e => setForm(f => ({ ...f, is_free: e.target.checked }))} />
                <label htmlFor="is_free" style={{ fontSize: 14, cursor: "pointer" }}>Eveniment gratuit</label>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>URL bilete externe</label>
                <input style={inputStyle} value={form.external_ticket_url} onChange={e => setForm(f => ({ ...f, external_ticket_url: e.target.value }))} placeholder="https://bilete.lamitabiciclista.ro/..." />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Descriere</label>
                <textarea style={{ ...inputStyle, height: 80, resize: "vertical" }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descriere eveniment..." />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
              <button onClick={() => setModal(null)} style={btnSecondary}>Anulează</button>
              <button onClick={handleSave} disabled={saving} style={{
                background: "var(--color-primary)", color: "#fff",
                border: "none", borderRadius: 8, padding: "10px 24px",
                fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}>
                {saving ? "Se salvează..." : modal === "create" ? "Creează" : "Salvează"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tickets Modal */}
      {modal === "tickets" && selected && (
        <div style={overlay} onClick={() => setModal(null)}>
          <div style={{ ...modalCard, maxWidth: 780 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, margin: 0 }}>
                  Bilete — {selected.name}
                </h2>
                <p style={{ fontSize: 13, color: "var(--color-text-sec)", marginTop: 4 }}>
                  {checkedIn}/{tickets.length} check-in-uri
                </p>
              </div>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--color-text-muted)" }}>✕</button>
            </div>

            {ticketsLoading ? (
              <div style={{ color: "var(--color-text-muted)", fontSize: 14 }}>Se încarcă biletele...</div>
            ) : tickets.length === 0 ? (
              <div style={{ color: "var(--color-text-muted)", fontSize: 14, textAlign: "center", padding: 32 }}>
                Niciun bilet înregistrat.
              </div>
            ) : (
              <div style={{ maxHeight: 420, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
                      {["Nr. bilet", "Status", "Plătit (RON)", "Check-in la", "Acțiune"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "var(--color-text-sec)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map(t => (
                      <tr key={t.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                        <td style={{ padding: "10px 12px", fontFamily: "monospace", fontWeight: 600 }}>{t.ticket_number}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 12,
                            background: t.status === "checked_in" ? "#D1FAE5" : t.status === "cancelled" ? "#FEE2E2" : "#F3F4F6",
                            color: t.status === "checked_in" ? "#065F46" : t.status === "cancelled" ? "#991B1B" : "#374151",
                          }}>
                            {t.status}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px" }}>{t.amount_paid_ron ?? "—"}</td>
                        <td style={{ padding: "10px 12px", color: "var(--color-text-sec)" }}>
                          {t.checked_in_at ? new Date(t.checked_in_at).toLocaleString("ro-RO", { timeStyle: "short", dateStyle: "short" }) : "—"}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          {t.status !== "checked_in" && t.status !== "cancelled" && (
                            <button onClick={() => handleCheckin(t)} style={{
                              background: "var(--color-primary)", color: "#fff",
                              border: "none", borderRadius: 6, padding: "4px 12px",
                              fontSize: 12, fontWeight: 600, cursor: "pointer",
                            }}>
                              Check-in
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const btnSecondary: React.CSSProperties = {
  background: "var(--color-raised)",
  color: "var(--color-text)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 1000, padding: 24,
};

const modalCard: React.CSSProperties = {
  background: "var(--color-raised)",
  borderRadius: 16,
  padding: 32,
  width: "100%",
  maxWidth: 640,
  maxHeight: "90vh",
  overflowY: "auto",
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--color-text-sec)",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 14,
  background: "var(--color-surface)",
  color: "var(--color-text)",
  outline: "none",
  boxSizing: "border-box",
};
