"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useCart } from "../../use-cart";
import { BottomNav } from "../page";

const C = {
  bg: "#FBFAF3",
  white: "#FFFFFF",
  black: "#111111",
  gray: "#686868",
  border: "#EEEEEE",
  yellow: "#FFEE58",
  body: "var(--font-manrope, Manrope, sans-serif)",
  mono: "var(--font-fira-code, 'Fira Code', monospace)",
} as const;

const CATEGORY_LABELS: Record<string, string> = {
  viennoiserie: "Viennoiserie",
  cofetarie: "Cofetărie",
  beverage: "Băuturi",
  other: "Alte",
};

const PHOTO_COLORS = ["#F5E9C4", "#EAF0EA", "#F6CFF4", "#C4DCF5", "#F5C4C4"];

interface MenuItem {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price_ron: number;
  unit: string;
  is_available: boolean;
}

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const category = params.category as string;
  const { items: cartItems, addItem, updateQty, count: cartCount, total: cartTotal } = useCart();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        let venueId = localStorage.getItem("lmbsc_venue_id");
        if (!venueId) {
          const vRes = await fetch("/api/v1/venues");
          if (!vRes.ok) throw new Error("Could not load venues");
          const venues = await vRes.json();
          if (!venues.length) throw new Error("No venues found");
          venueId = venues[0].id;
          localStorage.setItem("lmbsc_venue_id", venueId!);
        }
        const mRes = await fetch(`/api/v1/menu/items?venue_id=${venueId}&available_only=true`);
        if (!mRes.ok) throw new Error("Could not load menu");
        const all: MenuItem[] = await mRes.json();
        setMenuItems(all.filter((i) => i.category === category));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [category]);

  const cartQty = (id: string) => cartItems.find((i) => i.id === id)?.quantity ?? 0;
  const categoryLabel = CATEGORY_LABELS[category] ?? category;

  return (
    <div style={{ background: C.bg, minHeight: "100dvh", paddingBottom: 88 }}>
      {/* TOP NAV */}
      <div style={{
        height: 56, background: C.white, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "0 16px",
        borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => router.back()}
            style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 19l-7-7 7-7" stroke={C.black} strokeWidth="2" strokeLinecap="square"/>
            </svg>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Link href="/menu" style={{ fontFamily: C.mono, fontSize: "0.6875rem", color: C.gray, textDecoration: "none" }}>Menu</Link>
            <span style={{ fontFamily: C.mono, fontSize: "0.6875rem", color: C.gray }}>/</span>
            <span style={{ fontFamily: C.mono, fontSize: "0.6875rem", fontWeight: 700, color: C.black }}>{categoryLabel}</span>
          </div>
        </div>
        <Link href="/order" style={{ position: "relative", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke={C.black} strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter"/>
            <line x1="3" y1="6" x2="21" y2="6" stroke={C.black} strokeWidth="1.8"/>
            <path d="M16 10a4 4 0 01-8 0" stroke={C.black} strokeWidth="1.8" strokeLinecap="square"/>
          </svg>
          {cartCount > 0 && (
            <span style={{
              position: "absolute", top: 6, right: 4, background: C.yellow,
              color: C.black, fontFamily: C.body, fontSize: 10, fontWeight: 700, padding: "1px 5px", lineHeight: 1.4,
            }}>
              {cartCount}
            </span>
          )}
        </Link>
      </div>

      {/* CATEGORY HEADER */}
      <div style={{ padding: "24px 16px 20px", background: C.white, borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontFamily: C.mono, fontSize: "0.6875rem", color: C.gray, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Brasserie · {categoryLabel}
        </span>
        <div style={{ fontFamily: C.body, fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em", color: C.black, textTransform: "uppercase", marginTop: 4 }}>
          {categoryLabel}
        </div>
        <div style={{ fontFamily: C.mono, fontSize: "0.6875rem", color: C.gray, letterSpacing: "0.06em", marginTop: 8 }}>
          <strong>{menuItems.length}</strong> items disponibile
        </div>
      </div>

      {/* ITEMS COUNT */}
      {!loading && !error && (
        <div style={{ padding: "8px 16px", fontFamily: C.mono, fontSize: "0.6875rem", letterSpacing: "0.06em", color: C.gray, background: C.bg }}>
          Showing {menuItems.length} items
        </div>
      )}

      {/* LOADING / ERROR */}
      {loading && (
        <div style={{ padding: 32, textAlign: "center", fontFamily: C.mono, fontSize: "0.6875rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.gray }}>
          Se încarcă...
        </div>
      )}
      {error && (
        <div style={{ padding: 32, textAlign: "center", fontFamily: C.mono, fontSize: "0.6875rem", color: C.gray }}>
          {error}
        </div>
      )}

      {/* ITEMS LIST */}
      {!loading && !error && (
        <div style={{ background: C.white }}>
          {menuItems.map((item, idx) => {
            const qty = cartQty(item.id);
            return (
              <div key={item.id} style={{
                display: "flex", alignItems: "flex-start", padding: 16,
                borderBottom: `1px solid ${C.border}`, gap: 12,
              }}>
                {/* Color photo placeholder */}
                <div style={{
                  width: 72, height: 72, flexShrink: 0,
                  background: PHOTO_COLORS[idx % PHOTO_COLORS.length],
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontFamily: C.mono, fontSize: "0.5625rem", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", color: C.gray, textAlign: "center", lineHeight: 1.4 }}>
                    {item.name.split(" ").slice(0, 2).join("\n")}
                  </span>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ fontFamily: C.body, fontSize: 16, fontWeight: 700, color: C.black, lineHeight: 1.3 }}>
                      {item.name}
                    </div>
                    <div style={{ fontFamily: C.mono, fontSize: 15, fontWeight: 700, color: C.black, whiteSpace: "nowrap", flexShrink: 0 }}>
                      {item.price_ron.toFixed(0)} RON
                    </div>
                  </div>
                  {item.description && (
                    <div style={{ fontFamily: C.body, fontSize: 13, color: C.gray, lineHeight: 1.5, marginTop: 4 }}>
                      {item.description}
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                    {qty > 0 ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                        <button
                          onClick={() => updateQty(item.id, qty - 1)}
                          style={{ width: 32, height: 32, background: C.border, border: "none", cursor: "pointer", fontFamily: C.body, fontSize: 18, fontWeight: 700, color: C.black, display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                          −
                        </button>
                        <div style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.body, fontSize: 14, fontWeight: 700, color: C.black, background: C.white, border: `1px solid ${C.border}` }}>
                          {qty}
                        </div>
                        <button
                          onClick={() => updateQty(item.id, qty + 1)}
                          style={{ width: 32, height: 32, background: C.yellow, border: "none", cursor: "pointer", fontFamily: C.body, fontSize: 18, fontWeight: 700, color: C.black, display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addItem({ id: item.id, name: item.name, price_ron: item.price_ron, category: item.category })}
                        style={{ width: 32, height: 32, background: C.yellow, border: "none", cursor: "pointer", fontFamily: C.body, fontSize: 20, fontWeight: 800, color: C.black, display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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

      <BottomNav active="menu" />
    </div>
  );
}
