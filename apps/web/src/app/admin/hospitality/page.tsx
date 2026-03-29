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
  status: EventStatus;
  starts_at: string;
  total_capacity: number;
  tickets_sold: number;
  ticket_price_ron: number | null;
  is_free: boolean;
}

interface ReservationItem {
  id: string;
  confirmation_code: string;
  status: string;
  reserved_at: string;
  party_size: number;
  special_occasion: string | null;
}

interface ZoneItem {
  id: string;
  name: string;
  slug: string;
  total_capacity: number;
  zone_type: string;
}

const EVENT_STATUS_STYLE: Record<EventStatus, { bg: string; color: string }> = {
  draft:     { bg: "var(--color-blocked-bg)",  color: "var(--color-blocked)" },
  published: { bg: "var(--color-success-bg)",  color: "var(--color-success)" },
  sold_out:  { bg: "var(--color-reserved-bg)", color: "var(--color-reserved)" },
  cancelled: { bg: "var(--color-error-bg)",    color: "var(--color-error)" },
  completed: { bg: "#E0E7FF",                  color: "#3730A3" },
};

const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  draft: "Ciornă", published: "Publicat", sold_out: "Sold Out",
  cancelled: "Anulat", completed: "Finalizat",
};

const RES_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  pending:    { bg: "var(--color-reserved-bg)", color: "var(--color-reserved)" },
  confirmed:  { bg: "var(--color-success-bg)",  color: "var(--color-success)" },
  checked_in: { bg: "var(--color-seated-bg)",   color: "var(--color-seated)" },
  completed:  { bg: "#E0E7FF",                  color: "#3730A3" },
  cancelled_by_guest: { bg: "var(--color-error-bg)", color: "var(--color-error)" },
  cancelled_by_venue: { bg: "var(--color-error-bg)", color: "var(--color-error)" },
  no_show:    { bg: "var(--color-blocked-bg)",  color: "var(--color-blocked)" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div style={{
      background: accent ? "var(--color-primary)" : "var(--color-surface-raised)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-lg)",
      padding: "24px",
      boxShadow: "var(--shadow-sm)",
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: accent ? "rgba(255,255,255,0.6)" : "var(--color-text-muted)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: accent ? "#fff" : "var(--color-text)", fontFamily: "var(--font-display)", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, marginTop: 6, color: accent ? "rgba(255,255,255,0.5)" : "var(--color-text-muted)" }}>{sub}</div>}
    </div>
  );
}

export default function AdminHospitalityPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();

  const [roleOk, setRoleOk] = useState<boolean | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [resLoading, setResLoading] = useState(true);

  const [zones, setZones] = useState<ZoneItem[]>([]);

  const [tab, setTab] = useState<"overview" | "events" | "reservations">("overview");

  // Auth check
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { router.replace("/login"); return; }
    getToken({ template: "default" }).then(async (t) => {
      if (!t) { setRoleOk(false); return; }
      try {
        const payload = JSON.parse(atob(t.split(".")[1]));
        const role = payload?.metadata?.role ?? payload?.publicMetadata?.role;
        setRoleOk(role === "admin" || role === "manager");
        setToken(t);
      } catch { setRoleOk(false); }
    });
  }, [isLoaded, isSignedIn, getToken, router]);

  // Load data
  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    // Events
    fetch(`${API_URL}/api/v1/events?venue_id=${VENUE_ID}&limit=50`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then((d: EventItem[]) => setEvents(Array.isArray(d) ? d : []))
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false));

    // Reservations (today's)
    const today = new Date().toISOString().split("T")[0];
    fetch(`${API_URL}/api/v1/reservations?venue_id=${VENUE_ID}&date=${today}&limit=50`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then((d: ReservationItem[]) => setReservations(Array.isArray(d) ? d : []))
      .catch(() => setReservations([]))
      .finally(() => setResLoading(false));

    // Zones
    fetch(`${API_URL}/api/v1/venues/${VENUE_ID}/zones`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then((d: ZoneItem[]) => setZones(Array.isArray(d) ? d : []))
      .catch(() => setZones([]));
  }, [token]);

  if (!isLoaded || roleOk === null) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "var(--color-text-muted)" }}>
        Se încarcă...
      </div>
    );
  }

  if (roleOk === false) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
        <div style={{ fontWeight: 700, color: "var(--color-text)", marginBottom: 8 }}>Acces restricționat</div>
        <div style={{ fontSize: 14, color: "var(--color-text-muted)" }}>Această pagină necesită rol de admin sau manager.</div>
      </div>
    );
  }

  const publishedEvents = events.filter(e => e.status === "published");
  const totalCapacityEvents = publishedEvents.reduce((s, e) => s + e.total_capacity, 0);
  const totalSold = publishedEvents.reduce((s, e) => s + e.tickets_sold, 0);
  const todayReservations = reservations.filter(r => ["confirmed", "checked_in", "pending"].includes(r.status));
  const totalZoneCapacity = zones.reduce((s, z) => s + z.total_capacity, 0);

  return (
    <div style={{ padding: "32px 32px 64px", maxWidth: 1100, fontFamily: "var(--font-body)" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-accent)", fontFamily: "var(--font-mono)", marginBottom: 6 }}>
          Administrare
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: "var(--color-text)", margin: 0 }}>
          Ospitalitate
        </h1>
        <div style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 4 }}>
          Vizualizare centralizată — evenimente, rezervări și spații
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 36 }}>
        <StatCard label="Evenimente active" value={publishedEvents.length} sub={`din ${events.length} total`} accent />
        <StatCard label="Bilete vândute" value={totalSold} sub={`din ${totalCapacityEvents} locuri`} />
        <StatCard label="Rezervări azi" value={todayReservations.length} sub="confirmate + în așteptare" />
        <StatCard label="Capacitate sală" value={totalZoneCapacity} sub={`${zones.length} zone active`} />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 28, borderBottom: "1px solid var(--color-border)", paddingBottom: 0 }}>
        {(["overview", "events", "reservations"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "10px 20px", fontSize: 14, fontWeight: tab === t ? 700 : 500,
            color: tab === t ? "var(--color-primary)" : "var(--color-text-secondary)",
            background: "transparent", border: "none", cursor: "pointer",
            borderBottom: tab === t ? "2px solid var(--color-primary)" : "2px solid transparent",
            marginBottom: -1, letterSpacing: "0.01em",
          }}>
            {t === "overview" ? "Privire generală" : t === "events" ? "Evenimente" : "Rezervări azi"}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <div style={{ display: "grid", gap: 24 }}>

          {/* Zones */}
          <div style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "24px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--color-text)", marginBottom: 16 }}>Spații disponibile</div>
            {zones.length === 0 ? (
              <div style={{ color: "var(--color-text-muted)", fontSize: 14 }}>Se încarcă spațiile...</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {zones.map(z => (
                  <div key={z.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--color-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "var(--color-text)" }}>{z.name}</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)", textTransform: "capitalize" }}>{z.zone_type}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: "var(--color-primary)" }}>{z.total_capacity}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>LOCURI</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Next events preview */}
          <div style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "24px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--color-text)" }}>Următoarele evenimente</div>
              <button onClick={() => setTab("events")} style={{ fontSize: 13, color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                Vezi toate →
              </button>
            </div>
            {eventsLoading ? (
              <div style={{ color: "var(--color-text-muted)", fontSize: 14 }}>Se încarcă...</div>
            ) : publishedEvents.length === 0 ? (
              <div style={{ color: "var(--color-text-muted)", fontSize: 14 }}>Niciun eveniment publicat momentan.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {publishedEvents.slice(0, 4).map(ev => (
                  <div key={ev.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--color-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.name}</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{formatDate(ev.starts_at)}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-primary)" }}>{ev.tickets_sold}/{ev.total_capacity}</div>
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>BILETE</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: "var(--radius-full)", ...EVENT_STATUS_STYLE[ev.status] }}>
                        {EVENT_STATUS_LABEL[ev.status]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's reservations preview */}
          <div style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "24px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--color-text)" }}>Rezervări astăzi</div>
              <button onClick={() => setTab("reservations")} style={{ fontSize: 13, color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                Vezi toate →
              </button>
            </div>
            {resLoading ? (
              <div style={{ color: "var(--color-text-muted)", fontSize: 14 }}>Se încarcă...</div>
            ) : todayReservations.length === 0 ? (
              <div style={{ color: "var(--color-text-muted)", fontSize: 14 }}>Nicio rezervare activă pentru azi.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {todayReservations.slice(0, 5).map(r => {
                  const style = RES_STATUS_STYLE[r.status] ?? { bg: "var(--color-surface)", color: "var(--color-text-muted)" };
                  return (
                    <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--color-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--color-text)", fontFamily: "var(--font-mono)" }}>{r.confirmation_code}</div>
                        <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{formatDate(r.reserved_at)} · {r.party_size} pers.</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: "var(--radius-full)", background: style.bg, color: style.color }}>
                        {r.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Events tab */}
      {tab === "events" && (
        <div style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
          {eventsLoading ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-muted)" }}>Se încarcă...</div>
          ) : events.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🎭</div>
              <div style={{ fontWeight: 600, color: "var(--color-text)", marginBottom: 6 }}>Niciun eveniment</div>
              <div style={{ fontSize: 14, color: "var(--color-text-muted)" }}>Creează un eveniment din secțiunea Evenimente.</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
                  {["Eveniment", "Data", "Bilete", "Preț", "Status"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((ev, i) => (
                  <tr key={ev.id} style={{ borderBottom: i < events.length - 1 ? "1px solid var(--color-border)" : "none" }}>
                    <td style={{ padding: "14px 16px", fontWeight: 600, color: "var(--color-text)" }}>{ev.name}</td>
                    <td style={{ padding: "14px 16px", color: "var(--color-text-secondary)" }}>{formatDate(ev.starts_at)}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-primary)" }}>{ev.tickets_sold}/{ev.total_capacity}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                        {Math.round((ev.tickets_sold / ev.total_capacity) * 100)}% ocupat
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", color: "var(--color-text-secondary)" }}>
                      {ev.is_free ? "Gratuit" : `${ev.ticket_price_ron} RON`}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: "var(--radius-full)", ...EVENT_STATUS_STYLE[ev.status] }}>
                        {EVENT_STATUS_LABEL[ev.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Reservations tab */}
      {tab === "reservations" && (
        <div style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
          {resLoading ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-muted)" }}>Se încarcă...</div>
          ) : reservations.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
              <div style={{ fontWeight: 600, color: "var(--color-text)", marginBottom: 6 }}>Nicio rezervare azi</div>
              <div style={{ fontSize: 14, color: "var(--color-text-muted)" }}>Nu există rezervări pentru data curentă.</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
                  {["Cod", "Ora", "Persoane", "Ocazie", "Status"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reservations.map((r, i) => {
                  const style = RES_STATUS_STYLE[r.status] ?? { bg: "var(--color-surface)", color: "var(--color-text-muted)" };
                  return (
                    <tr key={r.id} style={{ borderBottom: i < reservations.length - 1 ? "1px solid var(--color-border)" : "none" }}>
                      <td style={{ padding: "14px 16px", fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-text)" }}>{r.confirmation_code}</td>
                      <td style={{ padding: "14px 16px", color: "var(--color-text-secondary)" }}>{formatDate(r.reserved_at)}</td>
                      <td style={{ padding: "14px 16px", color: "var(--color-text)" }}>{r.party_size}</td>
                      <td style={{ padding: "14px 16px", color: "var(--color-text-secondary)", textTransform: "capitalize" }}>
                        {r.special_occasion?.replace(/_/g, " ") ?? "—"}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: "var(--radius-full)", background: style.bg, color: style.color }}>
                          {r.status.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
