"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "../use-cart";

const C = {
  bg: "#FBFAF3",
  white: "#FFFFFF",
  black: "#111111",
  gray: "#686868",
  border: "#EEEEEE",
  yellow: "#FFEE58",
  purple: "#503AA8",
  pink: "#F6CFF4",
  body: "var(--font-manrope, Manrope, sans-serif)",
  mono: "var(--font-fira-code, 'Fira Code', monospace)",
} as const;

interface MenuItem {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price_ron: number;
  unit: string;
  is_available: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  viennoiserie: "Viennoiserie",
  cofetarie: "Cofetărie",
  beverage: "Băuturi",
  other: "Alte",
};

export default function MenuPage() {
  const router = useRouter();
  const { items: cartItems, addItem, count: cartCount, total: cartTotal } = useCart();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInstall, setShowInstall] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const vRes = await fetch("/api/v1/venues");
        if (!vRes.ok) throw new Error("Could not load venues");
        const venues = await vRes.json();
        if (!venues.length) throw new Error("No venues found");
        const venueId = venues[0].id;
        localStorage.setItem("lmbsc_venue_id", venueId);

        const mRes = await fetch(`/api/v1/menu/items?venue_id=${venueId}&available_only=true`);
        if (!mRes.ok) throw new Error("Could not load menu");
        setMenuItems(await mRes.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load menu");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const categories = ["all", ...Array.from(new Set(menuItems.map((i) => i.category)))];
  const filtered = activeCategory === "all" ? menuItems : menuItems.filter((i) => i.category === activeCategory);
  const featured = filtered.slice(0, 3);

  const cartItemQty = (id: string) => cartItems.find((i) => i.id === id)?.quantity ?? 0;

  return (
    <div style={{ background: C.bg, minHeight: "100dvh", paddingBottom: 88 }}>
      {/* TOP NAV */}
      <div style={{
        height: 56, background: C.white, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "0 16px",
        borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 50,
      }}>
        <span style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Meniu
        </span>
        <Link href="/order" style={{ position: "relative", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke={C.black} strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter"/>
            <line x1="3" y1="6" x2="21" y2="6" stroke={C.black} strokeWidth="1.8"/>
            <path d="M16 10a4 4 0 01-8 0" stroke={C.black} strokeWidth="1.8" strokeLinecap="square"/>
          </svg>
          {cartCount > 0 && (
            <span style={{
              position: "absolute", top: 6, right: 4, background: C.yellow, color: C.black,
              fontFamily: C.body, fontSize: 10, fontWeight: 700, padding: "1px 5px", lineHeight: 1.4,
            }}>
              {cartCount}
            </span>
          )}
        </Link>
      </div>

      {/* HERO IDENTITY */}
      <div style={{ background: C.bg, padding: "40px 16px 32px", borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontFamily: C.body, fontSize: "3rem", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, color: C.black, textTransform: "uppercase", display: "block" }}>
          La Mița<br />Biciclista
        </span>
        <span style={{ fontFamily: C.mono, fontSize: "0.6875rem", fontWeight: 400, letterSpacing: "0.15em", textTransform: "uppercase", color: C.gray, marginTop: 12, display: "block" }}>
          Str. Biserica Amzei 9 · Bucharest · Est. 2019
        </span>
      </div>

      {/* INSTALL BANNER */}
      {showInstall && (
        <div style={{
          width: "100%", height: 48, background: C.yellow, display: "flex",
          alignItems: "center", justifyContent: "space-between", padding: "0 16px",
          borderBottom: `1px solid ${C.border}`,
        }}>
          <span style={{ fontFamily: C.body, fontSize: 13, fontWeight: 600, color: C.black, letterSpacing: "0.01em" }}>
            Adaugă la ecranul principal →
          </span>
          <button
            onClick={() => setShowInstall(false)}
            style={{ background: "none", border: "none", fontFamily: C.body, fontSize: 16, fontWeight: 700, color: C.black, cursor: "pointer", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ×
          </button>
        </div>
      )}

      {/* CATEGORY TABS */}
      <div style={{
        width: "100%", height: 56, background: C.white, display: "flex", alignItems: "stretch",
        overflowX: "auto", scrollbarWidth: "none", borderBottom: `1px solid ${C.border}`,
      }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 18px",
              fontFamily: activeCategory === cat ? C.body : C.mono,
              fontSize: "0.6875rem",
              fontWeight: activeCategory === cat ? 700 : 500,
              letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
              background: "none", border: "none",
              borderBottom: activeCategory === cat ? `2px solid ${C.black}` : "2px solid transparent",
              color: activeCategory === cat ? C.black : C.gray, whiteSpace: "nowrap",
            }}
          >
            {cat === "all" ? "Toate" : (CATEGORY_LABELS[cat] ?? cat)}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      {loading && (
        <div style={{ padding: 32, textAlign: "center", fontFamily: C.mono, fontSize: "0.6875rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.gray }}>
          Se încarcă...
        </div>
      )}
      {error && (
        <div style={{ padding: 32, textAlign: "center", fontFamily: C.mono, fontSize: "0.6875rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.gray }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div style={{ padding: "20px 16px 8px", fontFamily: C.mono, fontSize: "0.6875rem", fontWeight: 400, letterSpacing: "0.2em", textTransform: "uppercase", color: C.gray }}>
            — {activeCategory === "all" ? "Featured Today" : (CATEGORY_LABELS[activeCategory] ?? activeCategory)}
          </div>

          <div style={{ background: C.white }}>
            {featured.map((item) => (
              <div key={item.id} style={{
                display: "flex", alignItems: "flex-start", padding: 16,
                borderBottom: `1px solid ${C.border}`, gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: C.body, fontSize: 16, fontWeight: 700, color: C.black, lineHeight: 1.3, marginBottom: 4 }}>
                    {item.name}
                  </div>
                  {item.description && (
                    <div style={{ fontFamily: C.body, fontSize: 13, fontWeight: 400, color: C.gray, lineHeight: 1.5, marginBottom: 8 }}>
                      {item.description}
                    </div>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    <span style={{
                      fontFamily: C.mono, fontSize: "0.625rem", fontWeight: 500, letterSpacing: "0.08em",
                      textTransform: "uppercase", color: C.gray, border: `1px solid ${C.border}`, padding: "2px 6px",
                    }}>
                      {CATEGORY_LABELS[item.category] ?? item.category}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                  <span style={{ fontFamily: C.mono, fontSize: 17, fontWeight: 700, color: C.black, whiteSpace: "nowrap" }}>
                    {item.price_ron.toFixed(0)} RON
                  </span>
                  {cartItemQty(item.id) > 0 ? (
                    <span style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 700, color: C.black, background: C.yellow, padding: "2px 8px" }}>
                      {cartItemQty(item.id)}×
                    </span>
                  ) : (
                    <button
                      onClick={() => addItem({ id: item.id, name: item.name, price_ron: item.price_ron, category: item.category })}
                      style={{
                        width: 32, height: 32, background: C.yellow, border: "none",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", fontSize: 20, fontWeight: 800, color: C.black, lineHeight: 1,
                      }}
                    >
                      +
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filtered.length > 3 && (
            <div style={{ background: C.white, padding: 16, textAlign: "center", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontFamily: C.mono, fontSize: "0.6875rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.gray }}>
                Showing 3 of {filtered.length} ·{" "}
              </span>
              <Link
                href={`/menu/${activeCategory}`}
                style={{ fontFamily: C.mono, fontSize: "0.6875rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.black, fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 3 }}
              >
                See all →
              </Link>
            </div>
          )}

          {/* Category previews */}
          {categories.filter((c) => c !== "all" && c !== activeCategory).slice(0, 1).map((cat) => (
            <div key={cat} style={{ background: C.bg, padding: "0 0 24px" }}>
              <div style={{ height: 32, background: C.bg }} />
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 16px 16px" }}>
                <div>
                  <div style={{ fontFamily: C.body, fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em", color: C.black, textTransform: "uppercase" }}>
                    {CATEGORY_LABELS[cat] ?? cat}
                  </div>
                  <span style={{ fontFamily: C.mono, fontSize: "0.6875rem", letterSpacing: "0.12em", textTransform: "uppercase", color: C.gray, display: "block", marginTop: 2 }}>
                    {menuItems.filter((i) => i.category === cat).length} items
                  </span>
                </div>
                <Link
                  href={`/menu/${cat}`}
                  style={{ fontFamily: C.mono, fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.black, textDecoration: "underline", textUnderlineOffset: 3 }}
                >
                  See all →
                </Link>
              </div>
              <div style={{ margin: "0 16px", background: C.purple, padding: "24px 20px" }}>
                <span style={{ fontFamily: C.mono, fontSize: "0.6875rem", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: 8, display: "block" }}>
                  Descoperă
                </span>
                <div style={{ fontFamily: C.body, fontSize: "1.5rem", fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: "-0.01em", lineHeight: 1.1, marginBottom: 12 }}>
                  {CATEGORY_LABELS[cat] ?? cat}
                </div>
                <div style={{ fontFamily: C.body, fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.75)", lineHeight: 1.5, marginBottom: 20 }}>
                  {menuItems.filter((i) => i.category === cat).length} preparate disponibile astăzi.
                </div>
                <Link
                  href={`/menu/${cat}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.pink, padding: "10px 16px", textDecoration: "none" }}
                >
                  <span style={{ fontFamily: C.body, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.black }}>
                    Explorează →
                  </span>
                </Link>
              </div>
            </div>
          ))}
        </>
      )}

      {/* VIEW ORDER BAR */}
      {cartCount > 0 && (
        <div
          onClick={() => router.push("/order")}
          style={{
            position: "fixed", bottom: 72, left: "50%", transform: "translateX(-50%)",
            width: 358, height: 56, background: C.black, display: "flex",
            alignItems: "center", justifyContent: "space-between", padding: "0 16px",
            cursor: "pointer", zIndex: 40,
          }}
        >
          <span style={{ fontFamily: C.body, fontSize: 13, fontWeight: 600, color: C.white }}>
            <strong>{cartCount}</strong> {cartCount === 1 ? "item" : "items"} in order
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: C.body, fontSize: 13, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: C.white }}>
              View Order
            </span>
            <span style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 700, color: C.yellow }}>
              {cartTotal.toFixed(0)} RON
            </span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke={C.yellow} strokeWidth="1.5" strokeLinecap="square"/>
            </svg>
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <BottomNav active="menu" />
    </div>
  );
}

export function BottomNav({ active }: { active: "home" | "menu" | "order" | "guest" }) {
  const navStyle = (key: string): React.CSSProperties => ({
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
    cursor: "pointer", paddingTop: 2,
    borderTop: active === key ? `2px solid #FFEE58` : "2px solid transparent",
    textDecoration: "none",
  });
  const labelStyle = (key: string): React.CSSProperties => ({
    fontFamily: "var(--font-fira-code, 'Fira Code', monospace)",
    fontSize: "0.625rem", fontWeight: active === key ? 700 : 500,
    letterSpacing: "0.08em", textTransform: "uppercase",
    color: active === key ? "#111111" : "#686868",
  });
  return (
    <div style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: 390, height: 72, background: "#FFFFFF",
      borderTop: "1px solid #EEEEEE", display: "flex", alignItems: "flex-start",
      paddingTop: 8, zIndex: 100,
    }}>
      <Link href="/hospitality" style={navStyle("home")}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M2 9.5L11 2l9 7.5V20H14v-5H8v5H2V9.5z" stroke={active === "home" ? "#111" : "#686868"} strokeWidth="1.6" fill="none" strokeLinecap="square"/>
        </svg>
        <span style={labelStyle("home")}>Home</span>
      </Link>
      <Link href="/menu" style={navStyle("menu")}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="2" y="2" width="8" height="8" stroke={active === "menu" ? "#111" : "#686868"} strokeWidth="1.6"/>
          <rect x="12" y="2" width="8" height="8" stroke={active === "menu" ? "#111" : "#686868"} strokeWidth="1.6"/>
          <rect x="2" y="12" width="8" height="8" stroke={active === "menu" ? "#111" : "#686868"} strokeWidth="1.6"/>
          <rect x="12" y="12" width="8" height="8" stroke={active === "menu" ? "#111" : "#686868"} strokeWidth="1.6"/>
        </svg>
        <span style={labelStyle("menu")}>Menu</span>
      </Link>
      <Link href="/order" style={navStyle("order")}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="4" y="2" width="14" height="18" rx="0" stroke={active === "order" ? "#111" : "#686868"} strokeWidth="1.6"/>
          <line x1="8" y1="7" x2="14" y2="7" stroke={active === "order" ? "#111" : "#686868"} strokeWidth="1.4"/>
          <line x1="8" y1="11" x2="14" y2="11" stroke={active === "order" ? "#111" : "#686868"} strokeWidth="1.4"/>
          <line x1="8" y1="15" x2="11" y2="15" stroke={active === "order" ? "#111" : "#686868"} strokeWidth="1.4"/>
        </svg>
        <span style={labelStyle("order")}>Orders</span>
      </Link>
      <Link href="/guest" style={navStyle("guest")}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="7" r="4" stroke={active === "guest" ? "#111" : "#686868"} strokeWidth="1.6"/>
          <path d="M3 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={active === "guest" ? "#111" : "#686868"} strokeWidth="1.6" strokeLinecap="square"/>
        </svg>
        <span style={labelStyle("guest")}>Profile</span>
      </Link>
    </div>
  );
}
