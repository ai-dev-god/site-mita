"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/brasserie", label: "Brasserie" },
  { href: "/evenimente", label: "Evenimente" },
  { href: "/membership", label: "Membership" },
  { href: "/despre", label: "Despre Noi" },
  { href: "/contact", label: "Contact" },
];

export function MarketingNav() {
  const pathname = usePathname();
  return (
    <nav style={{
      position: "sticky",
      top: 0,
      zIndex: 200,
      background: "rgba(250,246,240,0.96)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--color-border)",
      height: 68,
      display: "flex",
      alignItems: "center",
      padding: "0 64px",
      gap: 0,
    }}>
      <Link href="/" style={{
        fontFamily: "var(--font-display)",
        fontSize: 20,
        fontWeight: 700,
        color: "var(--color-primary)",
        letterSpacing: "-0.01em",
        whiteSpace: "nowrap",
        marginRight: "auto",
        textDecoration: "none",
      }}>
        La Mița Biciclista
      </Link>

      <ul style={{
        display: "flex",
        alignItems: "center",
        gap: 36,
        listStyle: "none",
        margin: 0,
        marginRight: 40,
        padding: 0,
      }}>
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link href={href} style={{
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
                textDecoration: "none",
                letterSpacing: "0.01em",
              }}>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      <Link href="/hospitality/reserve" style={{
        display: "inline-flex",
        alignItems: "center",
        height: 38,
        padding: "0 20px",
        background: "var(--color-primary)",
        color: "#fff",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        borderRadius: "var(--radius-sm)",
        textDecoration: "none",
      }}>
        Rezervă
      </Link>
    </nav>
  );
}
