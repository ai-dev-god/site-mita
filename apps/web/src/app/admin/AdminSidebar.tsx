"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard",             icon: "⌂",  label: "Dashboard" },
  { href: "/dashboard#reservations",icon: "📋", label: "Rezervări" },
  { href: "/dashboard",             icon: "⚑",  label: "Floor View" },
  { href: "/dashboard#queue",       icon: "⏱",  label: "Coadă Walk-in" },
];

const ADMIN_NAV = [
  { href: "/admin/hospitality", icon: "🏨", label: "Ospitalitate" },
  { href: "/admin/guests",      icon: "👤", label: "Oaspeți" },
  { href: "/admin/analytics",   icon: "📊", label: "Analytics" },
  { href: "/admin/campaigns",   icon: "📣", label: "Marketing" },
  { href: "/admin/events",      icon: "🎫", label: "Evenimente" },
  { href: "/admin/membership",  icon: "🚲", label: "Membership" },
  { href: "/admin/editorial",   icon: "📖", label: "Editorial" },
  { href: "/admin/shifts",      icon: "⏰", label: "Ture" },
];

function NavItem({ href, icon, label, onClick }: { href: string; icon: string; label: string; onClick?: () => void }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  return (
    <Link
      key={href + label}
      href={href}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        height: 44, padding: "0 20px",
        fontSize: 14, fontWeight: isActive ? 700 : 500,
        color: isActive ? "#fff" : "rgba(255,255,255,0.75)",
        textDecoration: "none",
        borderLeft: isActive ? "3px solid var(--color-accent)" : "3px solid transparent",
        background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
        transition: "background 0.15s, color 0.15s",
      }}
    >
      <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{icon}</span>
      {label}
    </Link>
  );
}

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  return (
    <>
      {/* Logo */}
      <div style={{
        height: 64, display: "flex", alignItems: "center",
        padding: "0 20px",
        borderBottom: "1px solid rgba(255,255,255,0.12)",
      }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>
            La Mița Biciclista
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 2 }}>
            Hospitality Platform
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", textTransform: "uppercase", padding: "20px 20px 8px" }}>
          Principal
        </div>
        {NAV.map(item => (
          <NavItem key={item.href + item.label} {...item} onClick={onNavClick} />
        ))}

        <div style={{ height: 1, background: "rgba(255,255,255,0.12)", margin: "8px 0" }} />

        <div style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", textTransform: "uppercase", padding: "20px 20px 8px" }}>
          Administrare
        </div>
        {ADMIN_NAV.map(item => (
          <NavItem key={item.href} {...item} onClick={onNavClick} />
        ))}

        <div style={{ height: 1, background: "rgba(255,255,255,0.12)", margin: "8px 0" }} />
        <NavItem href="/admin/settings" icon="⚙" label="Setări" onClick={onNavClick} />
      </nav>
    </>
  );
}

export default function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* ── Desktop sidebar (md+) ── */}
      <aside className="hidden md:flex" style={{
        width: 240,
        minHeight: "100vh",
        background: "var(--color-primary)",
        flexDirection: "column",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        height: "100vh",
      }}>
        <SidebarContent />
      </aside>

      {/* ── Mobile topbar (< md) ── */}
      <div className="flex md:hidden" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 40,
        height: 56,
        background: "var(--color-primary)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px",
        boxShadow: "var(--shadow-md)",
      }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "#fff" }}>
            La Mița Biciclista
          </div>
        </Link>
        <button
          onClick={() => setMobileOpen(o => !o)}
          aria-label="Toggle navigation"
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#fff", fontSize: 22, padding: "4px 8px",
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div
          className="md:hidden"
          style={{ position: "fixed", inset: 0, zIndex: 39 }}
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div
        className="md:hidden"
        style={{
          position: "fixed", top: 56, left: 0, bottom: 0, zIndex: 39,
          width: 260,
          background: "var(--color-primary)",
          display: "flex", flexDirection: "column",
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.22s ease",
          boxShadow: mobileOpen ? "var(--shadow-lg)" : "none",
          overflowY: "auto",
        }}
      >
        <SidebarContent onNavClick={() => setMobileOpen(false)} />
      </div>
    </>
  );
}
