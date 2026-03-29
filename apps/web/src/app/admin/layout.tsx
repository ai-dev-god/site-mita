import Link from "next/link";

const NAV = [
  { href: "/dashboard",        icon: "⌂",  label: "Dashboard" },
  { href: "/dashboard#reservations", icon: "📋", label: "Rezervări" },
  { href: "/dashboard",        icon: "⚑",  label: "Floor View" },
  { href: "/dashboard#queue",  icon: "⏱",  label: "Coadă Walk-in" },
];

const ADMIN_NAV = [
  { href: "/admin/guests",     icon: "👤", label: "Oaspeți" },
  { href: "/admin/analytics",  icon: "📊", label: "Analytics" },
  { href: "/admin/campaigns",  icon: "📣", label: "Marketing" },
  { href: "/admin/events",     icon: "🎫", label: "Evenimente" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-surface)", fontFamily: "var(--font-body)" }}>
      {/* Sidebar */}
      <aside style={{
        width: 240,
        minHeight: "100vh",
        background: "var(--color-primary)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        position: "sticky",
        top: 0,
      }}>
        {/* Logo */}
        <div style={{ height: 64, display: "flex", alignItems: "center", padding: "0 20px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>La Mița Biciclista</div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 2 }}>Hospitality Platform</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "8px 0" }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", textTransform: "uppercase", padding: "20px 20px 8px" }}>Principal</div>
          {NAV.map(item => (
            <Link key={item.href + item.label} href={item.href} style={{
              display: "flex", alignItems: "center", gap: 12,
              height: 44, padding: "0 20px",
              fontSize: 14, fontWeight: 500,
              color: "rgba(255,255,255,0.75)",
              textDecoration: "none",
              borderLeft: "3px solid transparent",
            }}>
              <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}

          <div style={{ height: 1, background: "rgba(255,255,255,0.12)", margin: "8px 0" }} />

          <div style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", textTransform: "uppercase", padding: "20px 20px 8px" }}>Administrare</div>
          {ADMIN_NAV.map(item => (
            <Link key={item.href} href={item.href} style={{
              display: "flex", alignItems: "center", gap: 12,
              height: 44, padding: "0 20px",
              fontSize: 14, fontWeight: 500,
              color: "rgba(255,255,255,0.75)",
              textDecoration: "none",
              borderLeft: "3px solid transparent",
            }}>
              <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}

          <div style={{ height: 1, background: "rgba(255,255,255,0.12)", margin: "8px 0" }} />
          <Link href="/admin/settings" style={{
            display: "flex", alignItems: "center", gap: 12,
            height: 44, padding: "0 20px",
            fontSize: 14, fontWeight: 500,
            color: "rgba(255,255,255,0.75)",
            textDecoration: "none",
            borderLeft: "3px solid transparent",
          }}>
            <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>⚙</span>
            Setări
          </Link>
        </nav>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
}
