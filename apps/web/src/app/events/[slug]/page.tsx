"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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

interface TicketRead {
  id: string;
  ticket_number: string;
  qr_code: string;
  status: string;
  amount_paid_ron: number | null;
  checked_in_at: string | null;
  event_id: string;
}

type Step = "detail" | "form" | "success";

export default function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const searchParams = useSearchParams();
  const venueId = searchParams.get("venue_id") ?? VENUE_ID;

  const [slug, setSlug] = useState<string | null>(null);
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("detail");
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState<TicketRead | null>(null);
  const [bookError, setBookError] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "" });

  // Resolve params (Next 16 async params)
  useEffect(() => {
    params.then(p => setSlug(p.slug));
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    fetch(`${API_URL}/api/v1/events/by-slug/${slug}?venue_id=${venueId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setEvent(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug, venueId]);

  async function handleBook() {
    if (!event) return;
    setBooking(true);
    setBookError(null);

    // If external ticketing, redirect
    if (event.external_ticket_url) {
      window.open(event.external_ticket_url, "_blank");
      setBooking(false);
      return;
    }

    const res = await fetch(`${API_URL}/api/v1/events/${event.id}/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venue_id: venueId, event_id: event.id, guest_id: null }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setBookError(err?.detail?.message ?? err?.detail ?? "Rezervare eșuată. Încearcă din nou.");
      setBooking(false);
      return;
    }

    const ticket: TicketRead = await res.json();
    setBooked(ticket);
    setStep("success");
    setBooking(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-surface)", fontFamily: "var(--font-body)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--color-text-muted)" }}>Se încarcă evenimentul...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-surface)", fontFamily: "var(--font-body)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>😕</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--color-text)", margin: "0 0 8px" }}>Eveniment negăsit</h2>
          <Link href="/events" style={{ fontSize: 14, color: "var(--color-primary)" }}>← Înapoi la evenimente</Link>
        </div>
      </div>
    );
  }

  const soldOut = event.status === "sold_out";
  const cancelled = event.status === "cancelled";
  const canBook = !soldOut && !cancelled && event.status === "published";
  const spotsLeft = event.total_capacity - event.tickets_sold;
  const pct = event.total_capacity > 0 ? event.tickets_sold / event.total_capacity : 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface)", fontFamily: "var(--font-body)" }}>
      {/* Nav */}
      <header style={{
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-raised)",
        padding: "0 40px",
        display: "flex", alignItems: "center", height: 64,
      }}>
        <Link href="/" style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--color-primary)", textDecoration: "none" }}>
          La Mița Biciclista
        </Link>
        <nav style={{ marginLeft: "auto", display: "flex", gap: 24 }}>
          <Link href="/reserve" style={{ fontSize: 14, color: "var(--color-text-sec)", textDecoration: "none" }}>Rezervări</Link>
          <Link href="/events" style={{ fontSize: 14, color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>Evenimente</Link>
        </nav>
      </header>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "48px 40px" }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 24 }}>
          <Link href="/events" style={{ color: "var(--color-primary)", textDecoration: "none" }}>Evenimente</Link>
          {" / "}
          <span>{event.name}</span>
        </div>

        {step === "success" && booked ? (
          /* ── Success screen ───────────────────────────────── */
          <div style={{
            background: "var(--color-raised)", borderRadius: 20,
            border: "1px solid var(--color-border)",
            padding: "48px 40px", textAlign: "center",
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "#D1FAE5", display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 24px", fontSize: 28,
            }}>✓</div>

            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: "var(--color-text)", margin: "0 0 8px" }}>
              Bilet rezervat!
            </h2>
            <p style={{ fontSize: 15, color: "var(--color-text-sec)", margin: "0 0 32px" }}>
              Biletul tău pentru <strong>{event.name}</strong> a fost confirmat.
            </p>

            {/* Ticket card */}
            <div style={{
              background: "var(--color-surface)", borderRadius: 16,
              border: "2px dashed var(--color-border)",
              padding: "24px 32px", maxWidth: 360, margin: "0 auto 32px",
              textAlign: "left",
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                Nr. bilet
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 700, color: "var(--color-text)", letterSpacing: 2, marginBottom: 20 }}>
                {booked.ticket_number}
              </div>

              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                Cod QR (prezintă la intrare)
              </div>
              <div style={{
                fontFamily: "monospace", fontSize: 9, wordBreak: "break-all",
                background: "var(--color-primary)", color: "#fff",
                borderRadius: 8, padding: "10px 12px", lineHeight: 1.6,
              }}>
                {booked.qr_code}
              </div>

              <div style={{ marginTop: 16, fontSize: 13, color: "var(--color-text-sec)" }}>
                <div>📅 {new Date(event.starts_at).toLocaleString("ro-RO", { dateStyle: "long", timeStyle: "short" })}</div>
                {event.doors_open_at && (
                  <div style={{ marginTop: 4 }}>🚪 Uși deschise: {new Date(event.doors_open_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}</div>
                )}
                {!event.is_free && event.ticket_price_ron && (
                  <div style={{ marginTop: 4 }}>💳 {event.ticket_price_ron} RON</div>
                )}
              </div>
            </div>

            <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 24 }}>
              Prezintă codul QR la intrare pentru check-in.
            </p>

            <Link href="/events" style={{
              display: "inline-block", background: "var(--color-primary)", color: "#fff",
              borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 600, textDecoration: "none",
            }}>
              ← Înapoi la evenimente
            </Link>
          </div>
        ) : (
          /* ── Event detail + booking ───────────────────────── */
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32, alignItems: "start" }}>
            {/* Left: detail */}
            <div>
              {/* Status badge */}
              {(soldOut || cancelled) && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: soldOut ? "#FEF3C7" : "#FEE2E2",
                  color: soldOut ? "#92400E" : "#991B1B",
                  borderRadius: 8, padding: "4px 12px",
                  fontSize: 12, fontWeight: 600, marginBottom: 16,
                }}>
                  {soldOut ? "Sold Out" : "Eveniment anulat"}
                </div>
              )}

              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 700, color: "var(--color-text)", margin: "0 0 16px", lineHeight: 1.2 }}>
                {event.name}
              </h1>

              {/* Meta info */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28, fontSize: 15, color: "var(--color-text-sec)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span>📅</span>
                  <span>
                    {new Date(event.starts_at).toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span>⏱</span>
                  <span>
                    {new Date(event.starts_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                    {" – "}
                    {new Date(event.ends_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {event.doors_open_at && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span>🚪</span>
                    <span>Uși deschise la {new Date(event.doors_open_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span>📍</span>
                  <span>La Mița Biciclista — Salon Expoziție</span>
                </div>
              </div>

              {/* Capacity */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--color-text-muted)", marginBottom: 6 }}>
                  <span>{event.tickets_sold} bilete rezervate</span>
                  <span>{soldOut ? "Sold out" : `${spotsLeft} locuri disponibile`}</span>
                </div>
                <div style={{ height: 8, background: "var(--color-border)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct * 100}%`, background: pct > 0.85 ? "#DC2626" : "var(--color-primary)", borderRadius: 4 }} />
                </div>
              </div>

              {/* Description */}
              {event.description && (
                <div style={{
                  background: "var(--color-raised)", borderRadius: 12,
                  border: "1px solid var(--color-border)",
                  padding: "20px 24px",
                }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-sec)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>
                    Despre eveniment
                  </h3>
                  <p style={{ fontSize: 15, color: "var(--color-text)", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>
                    {event.description}
                  </p>
                </div>
              )}
            </div>

            {/* Right: booking card */}
            <div style={{
              background: "var(--color-raised)", borderRadius: 16,
              border: "1px solid var(--color-border)",
              padding: "24px",
              position: "sticky", top: 24,
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--color-accent)", marginBottom: 4 }}>
                {event.is_free ? "Gratuit" : event.ticket_price_ron ? `${event.ticket_price_ron} RON` : "—"}
              </div>
              <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 20 }}>
                {event.is_free ? "Fără cost" : "per bilet"}
              </div>

              {bookError && (
                <div style={{ background: "#FEE2E2", color: "#991B1B", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
                  {bookError}
                </div>
              )}

              {canBook ? (
                <>
                  {pct > 0.85 && !soldOut && (
                    <div style={{ background: "#FEF3C7", color: "#92400E", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
                      ⚡ Doar {spotsLeft} locuri rămase!
                    </div>
                  )}
                  <button
                    onClick={handleBook}
                    disabled={booking}
                    style={{
                      width: "100%", padding: "14px", fontSize: 15, fontWeight: 700,
                      background: "var(--color-primary)", color: "#fff",
                      border: "none", borderRadius: 10, cursor: booking ? "not-allowed" : "pointer",
                      opacity: booking ? 0.7 : 1, marginBottom: 12,
                    }}
                  >
                    {booking ? "Se rezervă..." : event.external_ticket_url ? "Cumpără bilet ↗" : "Rezervă bilet"}
                  </button>
                  <p style={{ fontSize: 12, color: "var(--color-text-muted)", textAlign: "center", margin: 0 }}>
                    Biletul va fi confirmat instant.
                    {!event.is_free && " Plata se face la intrare."}
                  </p>
                </>
              ) : soldOut ? (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>😔</div>
                  <div style={{ fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>Eveniment Sold Out</div>
                  <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Toate biletele au fost rezervate.</div>
                </div>
              ) : cancelled ? (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>❌</div>
                  <div style={{ fontWeight: 700, color: "var(--color-error)" }}>Eveniment Anulat</div>
                </div>
              ) : null}

              <div style={{ borderTop: "1px solid var(--color-border)", marginTop: 20, paddingTop: 16 }}>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 6 }}>
                  <div>✓ Confirmare imediată</div>
                  <div>✓ QR code pentru check-in</div>
                  <div>✓ Acces la expoziție inclus</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
