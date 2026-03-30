"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";
const VENUE_ID = process.env.NEXT_PUBLIC_VENUE_ID ?? "146fd211-ae20-5ebe-a7af-3c195ab89ae8";

interface EventItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "draft" | "published" | "sold_out" | "cancelled" | "completed";
  starts_at: string;
  ends_at: string;
  doors_open_at: string | null;
  total_capacity: number;
  tickets_sold: number;
  ticket_price_ron: number | null;
  is_free: boolean;
  external_ticket_url: string | null;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ venue_id: VENUE_ID, upcoming_only: "true" });
    fetch(`${API_URL}/api/v1/events?${params}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setEvents(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface)", fontFamily: "var(--font-body)" }}>
      {/* Nav */}
      <header style={{
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surface-raised)",
        padding: "0 40px",
        display: "flex", alignItems: "center", height: 64,
      }}>
        <Link href="/" style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--color-primary)", textDecoration: "none" }}>
          La Mița Biciclista
        </Link>
        <nav style={{ marginLeft: "auto", display: "flex", gap: 24 }}>
          <Link href="/reserve" style={{ fontSize: 14, color: "var(--color-text-secondary)", textDecoration: "none" }}>Rezervări</Link>
          <Link href="/events" style={{ fontSize: 14, color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>Evenimente</Link>
        </nav>
      </header>

      {/* Hero */}
      <div style={{
        background: "var(--color-primary)", color: "#fff",
        padding: "48px 40px", textAlign: "center",
      }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 700, margin: 0 }}>
          Evenimente & Expoziții
        </h1>
        <p style={{ fontSize: 16, opacity: 0.8, marginTop: 12 }}>
          Seri speciale, expoziții de artă și experiențe gastronomice la La Mița Biciclista
        </p>
      </div>

      {/* Events grid */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 40px" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: 15 }}>Se încarcă evenimentele...</div>
        ) : events.length === 0 ? (
          <div style={{
            background: "var(--color-surface-raised)", borderRadius: 16,
            border: "1px solid var(--color-border)", padding: "64px 40px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎫</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--color-text)", margin: "0 0 8px" }}>
              Niciun eveniment programat
            </h2>
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
              Revino în curând pentru a descoperi evenimentele noastre viitoare.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
            {events.map(evt => {
              const soldOut = evt.status === "sold_out";
              const spotsLeft = evt.total_capacity - evt.tickets_sold;
              const pct = evt.total_capacity > 0 ? (evt.tickets_sold / evt.total_capacity) : 0;

              return (
                <Link
                  key={evt.id}
                  href={`/events/${evt.slug}?venue_id=${VENUE_ID}`}
                  style={{ textDecoration: "none" }}
                >
                  <div style={{
                    background: "var(--color-surface-raised)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 16,
                    overflow: "hidden",
                    cursor: "pointer",
                    transition: "box-shadow 0.15s",
                    opacity: soldOut ? 0.75 : 1,
                  }}>
                    {/* Color bar */}
                    <div style={{ height: 6, background: soldOut ? "#D1D5DB" : "var(--color-primary)" }} />

                    <div style={{ padding: "20px 24px 24px" }}>
                      {/* Date badge */}
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        background: "var(--color-primary-muted)",
                        color: "var(--color-primary)",
                        borderRadius: 8, padding: "4px 10px",
                        fontSize: 12, fontWeight: 600, marginBottom: 12,
                      }}>
                        🗓 {new Date(evt.starts_at).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" })}
                      </div>

                      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--color-text)", margin: "0 0 8px", lineHeight: 1.3 }}>
                        {evt.name}
                      </h3>

                      {evt.description && (
                        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 16px", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {evt.description}
                        </p>
                      )}

                      {/* Time */}
                      <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 16 }}>
                        ⏱ {new Date(evt.starts_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                        {" – "}
                        {new Date(evt.ends_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                      </div>

                      {/* Capacity bar */}
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ height: 4, background: "var(--color-border)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct * 100}%`, background: pct > 0.85 ? "#DC2626" : "var(--color-primary)", borderRadius: 2 }} />
                        </div>
                        <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
                          {soldOut ? "Sold out" : `${spotsLeft} locuri disponibile`}
                        </div>
                      </div>

                      {/* Price + CTA */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-accent)" }}>
                          {evt.is_free ? "Gratuit" : evt.ticket_price_ron ? `${evt.ticket_price_ron} RON` : "—"}
                        </div>
                        <div style={{
                          background: soldOut ? "var(--color-border)" : "var(--color-primary)",
                          color: soldOut ? "var(--color-text-muted)" : "#fff",
                          borderRadius: 8, padding: "8px 16px",
                          fontSize: 13, fontWeight: 600,
                        }}>
                          {soldOut ? "Sold Out" : "Vezi detalii"}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
