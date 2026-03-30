"use client";

import { useState } from "react";
import { BottomNav } from "../menu/page";

const C = {
  bg: "#FBFAF3",
  white: "#FFFFFF",
  black: "#111111",
  gray: "#686868",
  border: "#EEEEEE",
  yellow: "#FFEE58",
  purple: "#503AA8",
  pink: "#F6CFF4",
  dark: "#1A1A1A",
  body: "var(--font-manrope, Manrope, sans-serif)",
  mono: "var(--font-fira-code, 'Fira Code', monospace)",
} as const;

const VISITS = [
  { day: "27", month: "Mar", venue: "Brasserie — Parter", items: "Confit de Canard, Tartine Saumon, Kir Royal ×2", tags: ["Lunch", "Party of 2"], spend: 244, pts: 244 },
  { day: "15", month: "Mar", venue: "Salon Istoric — Etaj 1", items: "Menu Dégustation 5-course, wine flight", tags: ["Salon", "Dinner"], spend: 580, pts: 580, tagAccent: "Salon" },
  { day: "08", month: "Mar", venue: "Brasserie — Terasă", items: "Œufs Bénédicte, Croissant ×2, Café Viennois", tags: ["Brunch", "Weekend"], spend: 118, pts: 118 },
];

export default function GuestPage() {
  const [notifReservations, setNotifReservations] = useState(true);
  const [notifOrders, setNotifOrders] = useState(true);
  const [notifOffers, setNotifOffers] = useState(false);

  const points = 2450;
  const nextTier = 3000;
  const progress = Math.round((points / nextTier) * 100);

  return (
    <div style={{ background: C.bg, minHeight: "100dvh", paddingBottom: 88 }}>
      {/* TOP NAV */}
      <div style={{
        height: 56, background: C.white, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "0 16px",
        borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 50,
      }}>
        <span style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Profile
        </span>
        <button style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer" }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="3" stroke={C.black} strokeWidth="1.6"/>
            <path d="M11 2v2M11 18v2M2 11h2M18 11h2M4.22 4.22l1.42 1.42M16.36 16.36l1.42 1.42M4.22 17.78l1.42-1.42M16.36 5.64l1.42-1.42" stroke={C.black} strokeWidth="1.5" strokeLinecap="square"/>
          </svg>
        </button>
      </div>

      {/* GUEST HERO */}
      <div style={{ padding: "24px 16px", background: C.dark, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontFamily: C.mono, fontSize: "0.6875rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 6 }}>
            Bun venit înapoi
          </span>
          <div style={{ fontFamily: C.body, fontSize: "2rem", fontWeight: 800, color: C.white, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
            Maria<br />Popescu
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 10, background: "rgba(246,207,244,0.15)", padding: "4px 10px" }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1l1.5 3 3.5.5-2.5 2.5.5 3.5L6 9l-3 1.5.5-3.5L1 4.5 4.5 4z" fill={C.pink}/>
            </svg>
            <span style={{ fontFamily: C.mono, fontSize: "0.625rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: C.pink }}>
              Gold Member · Tier 3
            </span>
          </div>
        </div>
        <div style={{
          width: 64, height: 64, background: C.purple, display: "flex",
          alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <span style={{ fontFamily: C.body, fontSize: 20, fontWeight: 800, color: C.white, letterSpacing: "0.05em" }}>
            MP
          </span>
        </div>
      </div>

      {/* POINTS BLOCK */}
      <div style={{ background: C.white, padding: "20px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontFamily: C.mono, fontSize: "0.6875rem", letterSpacing: "0.15em", textTransform: "uppercase", color: C.gray, display: "block", marginBottom: 4 }}>
            Loyalty Points
          </span>
          <span style={{ fontFamily: C.body, fontSize: "2rem", fontWeight: 800, color: C.black, letterSpacing: "-0.02em", display: "block" }}>
            2,450
          </span>
          <span style={{ fontFamily: C.mono, fontSize: "0.625rem", color: C.gray, display: "block", marginTop: 2 }}>
            ≈ 24.50 RON value
          </span>
        </div>
        <button style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          background: C.yellow, border: "none", padding: "14px 18px", cursor: "pointer",
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 10h14M10 3l7 7-7 7" stroke={C.black} strokeWidth="1.6" strokeLinecap="square"/>
          </svg>
          <span style={{ fontFamily: C.body, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.black }}>
            Redeem<br />Points
          </span>
        </button>
      </div>

      {/* TIER PROGRESS */}
      <div style={{ background: C.white, padding: "16px 16px 20px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <span style={{ fontFamily: C.body, fontSize: 14, fontWeight: 700, color: C.black }}>Gold · Tier 3</span>
          <span style={{ fontFamily: C.mono, fontSize: "0.625rem", color: C.gray }}>550 pts → Platinum</span>
        </div>
        <div style={{ width: "100%", height: 6, background: C.border }}>
          <div style={{ width: `${progress}%`, height: "100%", background: C.yellow }} />
        </div>
        <span style={{ fontFamily: C.mono, fontSize: "0.5625rem", letterSpacing: "0.08em", color: C.gray, display: "block", marginTop: 8 }}>
          3,000 pts needed for Platinum tier · earn 1 pt per 1 RON spent
        </span>
      </div>

      {/* VISIT HISTORY */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 8px" }}>
        <span style={{ fontFamily: C.body, fontSize: 16, fontWeight: 700, color: C.black }}>Visit History</span>
        <span style={{ fontFamily: C.mono, fontSize: "0.625rem", letterSpacing: "0.06em", color: C.gray }}>All visits →</span>
      </div>

      <div style={{ background: C.white }}>
        {VISITS.map((v, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", padding: "16px 16px", borderBottom: `1px solid ${C.border}`, gap: 12 }}>
            <div style={{ width: 36, flexShrink: 0, textAlign: "center" }}>
              <div style={{ fontFamily: C.body, fontSize: 20, fontWeight: 800, color: C.black, lineHeight: 1 }}>{v.day}</div>
              <div style={{ fontFamily: C.mono, fontSize: "0.5625rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.gray, marginTop: 2 }}>{v.month}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: C.body, fontSize: 14, fontWeight: 700, color: C.black }}>{v.venue}</div>
              <div style={{ fontFamily: C.body, fontSize: 12, color: C.gray, lineHeight: 1.5, marginTop: 2 }}>{v.items}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                {v.tags.map((tag) => (
                  <span key={tag} style={{
                    fontFamily: C.mono, fontSize: "0.5625rem", letterSpacing: "0.08em", textTransform: "uppercase",
                    padding: "2px 6px",
                    border: tag === v.tagAccent ? `1px solid ${C.purple}` : `1px solid ${C.border}`,
                    color: tag === v.tagAccent ? C.purple : C.gray,
                    background: tag === v.tagAccent ? "rgba(80,58,168,0.06)" : "transparent",
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ flexShrink: 0, textAlign: "right" }}>
              <div style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 700, color: C.black }}>{v.spend} RON</div>
              <div style={{ fontFamily: C.mono, fontSize: "0.5625rem", color: C.gray, marginTop: 2 }}>+{v.pts} pts</div>
              <div style={{ fontFamily: C.mono, fontSize: "0.5625rem", letterSpacing: "0.04em", color: C.gray, marginTop: 6, cursor: "pointer" }}>Repeat →</div>
            </div>
          </div>
        ))}
      </div>

      {/* NOTIFICATIONS */}
      <div style={{ display: "flex", alignItems: "center", padding: "16px 16px 8px" }}>
        <span style={{ fontFamily: C.body, fontSize: 16, fontWeight: 700, color: C.black }}>Notifications</span>
      </div>

      <div style={{ background: C.white, margin: "0 0 16px", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, background: "rgba(80,58,168,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2a6 6 0 016 6v3l2 2H2l2-2V8a6 6 0 016-6z" stroke={C.purple} strokeWidth="1.5" fill="none" strokeLinecap="square"/>
              <path d="M8 16a2 2 0 004 0" stroke={C.purple} strokeWidth="1.5" fill="none"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: C.body, fontSize: 14, fontWeight: 700, color: C.black }}>Stay in the loop</div>
            <div style={{ fontFamily: C.body, fontSize: 13, color: C.gray, lineHeight: 1.5, marginTop: 2 }}>
              Enable push notifications to get reservation reminders, order updates, and exclusive member offers.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { label: "Reservation Reminders", sub: "1h before your booking", value: notifReservations, set: setNotifReservations },
            { label: "Order Status", sub: "Kitchen updates in real-time", value: notifOrders, set: setNotifOrders },
            { label: "Member Offers", sub: "Exclusive gold member deals", value: notifOffers, set: setNotifOffers },
          ].map(({ label, sub, value, set }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontFamily: C.body, fontSize: 14, fontWeight: 500, color: C.black }}>{label}</div>
                <div style={{ fontFamily: C.mono, fontSize: "0.5625rem", letterSpacing: "0.08em", textTransform: "uppercase", color: C.gray, marginTop: 2 }}>{sub}</div>
              </div>
              <button
                onClick={() => set(!value)}
                style={{
                  width: 44, height: 24, background: value ? C.black : C.border, position: "relative",
                  border: "none", cursor: "pointer", borderRadius: 0, flexShrink: 0,
                }}
              >
                <div style={{
                  position: "absolute", top: 4,
                  left: value ? "auto" : 4, right: value ? 4 : "auto",
                  width: 16, height: 16, background: value ? C.yellow : C.gray,
                }} />
              </button>
            </div>
          ))}
        </div>

        <button style={{
          marginTop: 16, width: "100%", height: 44, background: C.purple,
          border: "none", borderRadius: 0, display: "flex", alignItems: "center",
          justifyContent: "center", cursor: "pointer", gap: 8,
        }}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M10 2a6 6 0 016 6v3l2 2H2l2-2V8a6 6 0 016-6z" stroke="#fff" strokeWidth="1.4" fill="none" strokeLinecap="square"/>
            <path d="M8 16a2 2 0 004 0" stroke="#fff" strokeWidth="1.4" fill="none"/>
          </svg>
          <span style={{ fontFamily: C.body, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#fff" }}>
            Enable Notifications
          </span>
        </button>
      </div>

      <BottomNav active="guest" />
    </div>
  );
}
