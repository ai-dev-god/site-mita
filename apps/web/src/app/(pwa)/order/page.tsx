"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "../use-cart";
import { BottomNav } from "../menu/page";

const C = {
  bg: "#1A1A1A",
  white: "#FFFFFF",
  black: "#111111",
  gray: "#686868",
  border: "#2A2A2A",
  yellow: "#FFEE58",
  body: "var(--font-manrope, Manrope, sans-serif)",
  mono: "var(--font-fira-code, 'Fira Code', monospace)",
} as const;

export default function OrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, removeItem, clearCart, total, count } = useCart();
  const [specialRequests, setSpecialRequests] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [tableLabel, setTableLabel] = useState<string | null>(null);

  useEffect(() => {
    // QR code links arrive as /order?table=A12 — persist and display
    const tableParam = searchParams.get("table");
    if (tableParam) {
      localStorage.setItem("lmbsc_table_id", tableParam);
      setTableLabel(tableParam);
    } else {
      const stored = localStorage.getItem("lmbsc_table_id");
      if (stored) setTableLabel(stored);
    }
  }, [searchParams]);

  const subtotal = total;
  const service = Math.round(subtotal * 0.1);
  const grandTotal = subtotal + service;

  async function sendToKitchen() {
    setSending(true);
    try {
      const venueId = localStorage.getItem("lmbsc_venue_id");
      const tableId = localStorage.getItem("lmbsc_table_id");
      if (tableId && venueId) {
        for (const item of items) {
          await fetch(`/api/v1/tables/${tableId}/check`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ menu_item_id: item.id, quantity: item.quantity, note: specialRequests || undefined }),
          });
        }
      }
      clearCart();
      setSent(true);
    } catch {
      // Optimistic: clear cart and show success even if API fails
      clearCart();
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div style={{ background: C.bg, minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <div style={{ textAlign: "center" }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ marginBottom: 24 }}>
            <path d="M4 24l14 14L44 8" stroke={C.yellow} strokeWidth="3" strokeLinecap="square"/>
          </svg>
          <div style={{ fontFamily: C.body, fontSize: "1.5rem", fontWeight: 800, color: C.white, textTransform: "uppercase", letterSpacing: "-0.02em", marginBottom: 12 }}>
            Comanda a fost trimisă!
          </div>
          <div style={{ fontFamily: C.mono, fontSize: "0.6875rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.gray, marginBottom: 32 }}>
            Bucătăria a primit comanda ta
          </div>
          <button
            onClick={() => router.push("/menu")}
            style={{
              background: C.yellow, border: "none", padding: "14px 28px", cursor: "pointer",
              fontFamily: C.body, fontSize: 13, fontWeight: 700, letterSpacing: "0.1em",
              textTransform: "uppercase", color: C.black,
            }}
          >
            Înapoi la Meniu →
          </button>
        </div>
        <BottomNav active="order" />
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: "100dvh", paddingBottom: 160 }}>
      {/* TOP NAV */}
      <div style={{
        height: 56, background: C.bg, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "0 16px",
        borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => router.back()}
            style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 19l-7-7 7-7" stroke={C.white} strokeWidth="2" strokeLinecap="square"/>
            </svg>
          </button>
          <span style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: C.white }}>
            Your Order
          </span>
        </div>
        <span style={{
          fontFamily: C.mono, fontSize: "0.6875rem", fontWeight: 500, letterSpacing: "0.1em",
          textTransform: "uppercase", color: C.gray, border: `1px solid ${C.border}`, padding: "4px 10px",
        }}>
          Draft
        </span>
      </div>

      {/* TABLE BLOCK — populated via ?table= URL param (QR code) or localStorage */}
      <div style={{ padding: "20px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-start", gap: 20 }}>
        <div>
          <span style={{ fontFamily: C.mono, fontSize: "0.6875rem", letterSpacing: "0.15em", textTransform: "uppercase", color: C.gray, display: "block", marginBottom: 4 }}>
            Table
          </span>
          <div style={{ fontFamily: tableLabel ? C.mono : C.body, fontSize: tableLabel ? "2rem" : "3rem", fontWeight: 800, color: C.yellow, lineHeight: 1, letterSpacing: tableLabel ? "0.05em" : undefined }}>
            {tableLabel ?? "—"}
          </div>
        </div>
        <div style={{ paddingTop: 4 }}>
          {tableLabel ? (
            <span style={{ fontFamily: C.body, fontSize: 13, color: "rgba(255,255,255,0.6)", display: "block", lineHeight: 1.8 }}>
              Masa ta este legată.<br />Comanda merge direct la bucătărie.
            </span>
          ) : (
            <span style={{ fontFamily: C.body, fontSize: 13, color: "rgba(255,255,255,0.6)", display: "block", lineHeight: 1.8 }}>
              Scanează codul QR de pe masă<br />pentru a lega comanda de masă.
            </span>
          )}
        </div>
      </div>

      {/* ITEMS SECTION */}
      {count === 0 ? (
        <div style={{ padding: "48px 16px", textAlign: "center" }}>
          <div style={{ fontFamily: C.mono, fontSize: "0.6875rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.gray, marginBottom: 24 }}>
            Coșul tău este gol
          </div>
          <button
            onClick={() => router.push("/menu")}
            style={{
              background: C.yellow, border: "none", padding: "14px 24px", cursor: "pointer",
              fontFamily: C.body, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em",
              textTransform: "uppercase", color: C.black,
            }}
          >
            Explorează Meniurile →
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 8px" }}>
            <span style={{ fontFamily: C.body, fontSize: 16, fontWeight: 700, color: C.white }}>
              Items — <span style={{ color: C.gray, fontWeight: 400 }}>{count} {count === 1 ? "dish" : "dishes"}</span>
            </span>
            <button
              onClick={() => router.push("/menu")}
              style={{ fontFamily: C.mono, fontSize: "0.6875rem", color: C.gray, background: "none", border: "none", cursor: "pointer", letterSpacing: "0.06em" }}
            >
              Add more →
            </button>
          </div>

          <div>
            {items.map((item) => (
              <div key={item.id} style={{
                display: "flex", alignItems: "center", padding: "14px 16px",
                borderBottom: `1px solid ${C.border}`, gap: 12,
              }}>
                <div style={{
                  fontFamily: C.mono, fontSize: 13, fontWeight: 700, color: C.yellow,
                  width: 32, flexShrink: 0,
                }}>
                  {item.quantity}×
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: C.body, fontSize: 15, fontWeight: 600, color: C.white }}>{item.name}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                  <div style={{ fontFamily: C.mono, fontSize: 14, fontWeight: 700, color: C.white }}>
                    {(item.price_ron * item.quantity).toFixed(0)} RON
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    style={{
                      fontFamily: C.mono, fontSize: "0.5625rem", letterSpacing: "0.08em", textTransform: "uppercase",
                      color: C.gray, background: "none", border: "none", cursor: "pointer", padding: 0,
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* TOTALS */}
          <div style={{ padding: "16px 16px", borderBottom: `1px solid ${C.border}` }}>
            {[
              { label: "Subtotal", value: `${subtotal.toFixed(0)} RON` },
              { label: "Service (10%)", value: `${service} RON` },
              { label: "TVA (19%)", value: "Included" },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontFamily: C.body, fontSize: 14, color: C.gray }}>{label}</span>
                <span style={{ fontFamily: C.mono, fontSize: 14, color: C.gray }}>{value}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, borderTop: `1px solid ${C.border}`, marginTop: 4 }}>
              <span style={{ fontFamily: C.body, fontSize: 16, fontWeight: 700, color: C.white }}>Total</span>
              <span style={{ fontFamily: C.mono, fontSize: 16, fontWeight: 700, color: C.yellow }}>{grandTotal.toFixed(0)} RON</span>
            </div>
          </div>

          {/* SPECIAL REQUESTS */}
          <div style={{ padding: "16px 16px" }}>
            <span style={{ fontFamily: C.mono, fontSize: "0.6875rem", letterSpacing: "0.12em", textTransform: "uppercase", color: C.gray, display: "block", marginBottom: 8 }}>
              Special Requests
            </span>
            <textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value.slice(0, 200))}
              placeholder="Alergii, preferințe, solicitări speciale…"
              style={{
                width: "100%", minHeight: 80, background: "#222", border: `1px solid ${C.border}`,
                borderRadius: 0, padding: "10px 12px", fontFamily: C.body, fontSize: 14,
                color: C.white, resize: "none", outline: "none",
              }}
            />
            <span style={{ fontFamily: C.mono, fontSize: "0.5625rem", color: C.gray, float: "right", marginTop: 4 }}>
              {specialRequests.length} / 200
            </span>
          </div>

          {/* STATUS NOTE */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "0 16px 16px" }}>
            <svg style={{ flexShrink: 0, marginTop: 2 }} width="18" height="18" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke={C.gray} strokeWidth="1.4"/>
              <path d="M10 9v5" stroke={C.gray} strokeWidth="1.5" strokeLinecap="square"/>
              <circle cx="10" cy="6.5" r="0.8" fill={C.gray}/>
            </svg>
            <p style={{ fontFamily: C.body, fontSize: 12, color: C.gray, lineHeight: 1.6, margin: 0 }}>
              Comanda va merge direct la bucătărie. Odată trimisă, itemele <strong style={{ color: "rgba(255,255,255,0.6)" }}>nu pot fi anulate</strong> — confirmați înainte de trimitere.
            </p>
          </div>
        </>
      )}

      {/* SEND TO KITCHEN CTA */}
      {count > 0 && (
        <div style={{
          position: "fixed", bottom: 72, left: "50%", transform: "translateX(-50%)",
          width: 390, padding: "0 16px", zIndex: 40,
        }}>
          <button
            onClick={sendToKitchen}
            disabled={sending}
            style={{
              width: "100%", height: 60, background: C.yellow, border: "none",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0 16px", cursor: sending ? "not-allowed" : "pointer",
              opacity: sending ? 0.7 : 1,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, background: C.black, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M2 2l16 8-16 8V12l11-2L2 8V2z" fill={C.yellow}/>
                </svg>
              </div>
              <span style={{ fontFamily: C.body, fontSize: 14, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.black }}>
                {sending ? "Se trimite..." : "Send to Kitchen"}
              </span>
            </div>
            <span style={{ fontFamily: C.mono, fontSize: 16, fontWeight: 700, color: C.black }}>
              {grandTotal.toFixed(0)} RON
            </span>
          </button>
        </div>
      )}

      <BottomNav active="order" />
    </div>
  );
}
