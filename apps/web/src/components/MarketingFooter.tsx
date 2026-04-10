import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer style={{
      background: "#1E3A20",
      padding: "64px 64px 40px",
      color: "rgba(255,255,255,0.75)",
    }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr 1.4fr 1.6fr",
        gap: 48,
        maxWidth: 1152,
        margin: "0 auto 56px",
      }}>
        {/* Brand */}
        <div>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 12 }}>
            La Mița Biciclista
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.65, color: "rgba(255,255,255,0.6)", marginBottom: 16 }}>
            Braserie, salon cultural și spațiu expozițional în inima Bucureștiului.
          </p>
          <address style={{ fontSize: 12, lineHeight: 1.7, color: "rgba(255,255,255,0.5)", fontStyle: "normal" }}>
            Str. Biserica Amzei 9, Sector 1, București<br />
            +40 21 XXX XXXX
          </address>
        </div>

        {/* Nav */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 20 }}>
            Navigare
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { href: "/brasserie", label: "Brasserie & Meniu" },
              { href: "/evenimente", label: "Evenimente" },
              { href: "/membership", label: "Membership" },
              { href: "/despre", label: "Despre Noi" },
              { href: "/contact", label: "Contact" },
            ].map(({ href, label }) => (
              <li key={href}>
                <Link href={href} style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Hours */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 20 }}>
            Program
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              ["Luni – Vineri", "08:00–23:00"],
              ["Sâmbătă", "09:00–24:00"],
              ["Duminică", "09:00–22:00"],
            ].map(([day, time]) => (
              <div key={day} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "rgba(255,255,255,0.5)" }}>{day}</span>
                <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>{time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reservations */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 20 }}>
            Rezervări
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 14, lineHeight: 1.55 }}>
            Rezervați online sau sunați-ne direct pentru mese mari și ocazii speciale.
          </p>
          <Link href="/hospitality/reserve" style={{
            display: "inline-flex",
            alignItems: "center",
            height: 38,
            padding: "0 20px",
            background: "var(--color-accent)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            borderRadius: "var(--radius-sm)",
            textDecoration: "none",
          }}>
            Rezervă online
          </Link>
        </div>
      </div>

      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.10)",
        paddingTop: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        maxWidth: 1152,
        margin: "0 auto",
      }}>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
          © 2025 La Mița Biciclista. Toate drepturile rezervate.
        </p>
        <nav style={{ display: "flex", gap: 24 }}>
          {[
            { href: "/politica-confidentialitate", label: "Politică confidențialitate" },
            { href: "/termeni", label: "Termeni" },
          ].map(({ href, label }) => (
            <Link key={href} href={href} style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
