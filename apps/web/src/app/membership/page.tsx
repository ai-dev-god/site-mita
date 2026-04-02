"use client";

import Link from "next/link";

const TIERS = [
  {
    id: "free",
    name: "Liber",
    priceLabel: "Gratuit",
    tagline: "Primul pas în comunitate.",
    benefits: [
      "Newsletter lunar cu noutăți",
      "Acces la evenimentele publice",
      "Profil în comunitatea LMBSC",
    ],
    cta: "Înregistrează-te",
    featured: false,
  },
  {
    id: "friend",
    name: "Prieten",
    priceLabel: "15 RON / lună",
    tagline: "Fă parte din cercul interior al Miței.",
    benefits: [
      "Tot ce include Liber",
      "Acces prioritar la evenimentele exclusive",
      "10% reducere la rezervări",
      "Preview-uri și invitații la vernisaje",
      "Badge de Prieten",
    ],
    cta: "Devino Prieten",
    featured: true,
  },
  {
    id: "patron",
    name: "Patron",
    priceLabel: "35 RON / lună",
    tagline: "Susținătorul artei, culturii și bicicliștilor.",
    benefits: [
      "Tot ce include Prieten",
      "Acces VIP la toate vernisajele",
      "Print semnat — cadou anual",
      "Masă rezervată la evenimentele speciale",
      "Badge de Patron + recunoaștere în spațiu",
    ],
    cta: "Devino Patron",
    featured: false,
  },
];

function PublicNav() {
  return (
    <header style={{
      borderBottom: "1px solid var(--color-border)",
      background: "var(--color-surface-raised)",
      padding: "0 40px",
      display: "flex", alignItems: "center", height: 64,
      position: "sticky", top: 0, zIndex: 10,
    }}>
      <Link href="/" style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--color-primary)", textDecoration: "none" }}>
        La Mița Biciclista
      </Link>
      <nav style={{ marginLeft: "auto", display: "flex", gap: 24, alignItems: "center" }}>
        <Link href="/events" style={{ fontSize: 14, color: "var(--color-text-secondary)", textDecoration: "none" }}>Evenimente</Link>
        <Link href="/stories" style={{ fontSize: 14, color: "var(--color-text-secondary)", textDecoration: "none" }}>Povești</Link>
        <Link href="/membership" style={{ fontSize: 14, color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>Membership</Link>
        <Link href="/reserve" style={{
          fontSize: 13, fontWeight: 600, color: "#fff",
          background: "var(--color-primary)", borderRadius: 8,
          padding: "8px 16px", textDecoration: "none",
        }}>
          Rezervare
        </Link>
      </nav>
    </header>
  );
}

export default function MembershipPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface)", fontFamily: "var(--font-body)" }}>
      <PublicNav />

      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, var(--color-primary) 0%, #1a2e1c 100%)",
        color: "#fff",
        padding: "72px 40px",
        textAlign: "center",
      }}>
        <div style={{
          display: "inline-block",
          background: "rgba(184,150,46,0.2)",
          color: "var(--color-accent-light)",
          borderRadius: 20, padding: "4px 16px",
          fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase",
          marginBottom: 20,
        }}>
          Comunitate & Cultură
        </div>
        <h1 style={{
          fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 700,
          margin: "0 0 16px", lineHeight: 1.15,
        }}>
          Membership<br />La Mița Biciclista
        </h1>
        <p style={{ fontSize: 18, opacity: 0.8, maxWidth: 540, margin: "0 auto 32px", lineHeight: 1.6 }}>
          Alătură-te comunității noastre de bicicliști, artiști și iubitori ai Micului Paris.
          Acces la expoziții, evenimente culturale și bucătăria brasserie-ului nostru.
        </p>
        <Link href="/membership/join" style={{
          display: "inline-block",
          background: "var(--color-accent)", color: "#fff",
          borderRadius: 10, padding: "14px 32px",
          fontSize: 15, fontWeight: 700, textDecoration: "none",
          boxShadow: "0 4px 16px rgba(184,150,46,0.4)",
        }}>
          Alege planul tău →
        </Link>
      </div>

      {/* Tier cards */}
      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "64px 24px" }}>
        <h2 style={{
          fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700,
          color: "var(--color-text)", textAlign: "center", margin: "0 0 48px",
        }}>
          Alege nivelul tău
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, alignItems: "start" }}>
          {TIERS.map(tier => (
            <div
              key={tier.id}
              style={{
                background: tier.featured ? "var(--color-primary)" : "var(--color-surface-raised)",
                border: tier.featured ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                borderRadius: 20,
                padding: "32px 28px",
                position: "relative",
                boxShadow: tier.featured ? "var(--shadow-lg)" : "var(--shadow-sm)",
              }}
            >
              {tier.featured && (
                <div style={{
                  position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                  background: "var(--color-accent)", color: "#fff",
                  borderRadius: 20, padding: "4px 18px",
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}>
                  Cel mai popular
                </div>
              )}

              <div style={{ marginBottom: 6 }}>
                <span style={{
                  fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700,
                  color: tier.featured ? "#fff" : "var(--color-text)",
                }}>
                  {tier.name}
                </span>
              </div>
              <div style={{
                fontSize: 26, fontWeight: 800, marginBottom: 6,
                color: tier.featured ? "var(--color-accent-light)" : "var(--color-accent)",
              }}>
                {tier.priceLabel}
              </div>
              <p style={{
                fontSize: 13, marginBottom: 24, lineHeight: 1.5,
                color: tier.featured ? "rgba(255,255,255,0.75)" : "var(--color-text-secondary)",
              }}>
                {tier.tagline}
              </p>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 10 }}>
                {tier.benefits.map(b => (
                  <li key={b} style={{
                    fontSize: 14, display: "flex", alignItems: "flex-start", gap: 10,
                    color: tier.featured ? "rgba(255,255,255,0.9)" : "var(--color-text)",
                  }}>
                    <span style={{ color: tier.featured ? "var(--color-accent-light)" : "var(--color-primary)", flexShrink: 0, marginTop: 1 }}>✓</span>
                    {b}
                  </li>
                ))}
              </ul>

              <Link
                href={tier.id === "free" ? "/login" : `/membership/join?tier=${tier.id}`}
                style={{
                  display: "block", textAlign: "center",
                  background: tier.featured ? "var(--color-accent)" : "transparent",
                  color: tier.featured ? "#fff" : "var(--color-primary)",
                  border: tier.featured ? "none" : "2px solid var(--color-primary)",
                  borderRadius: 10, padding: "12px 20px",
                  fontSize: 14, fontWeight: 700, textDecoration: "none",
                }}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ strip */}
        <div style={{
          marginTop: 80,
          background: "var(--color-surface-raised)", borderRadius: 20,
          border: "1px solid var(--color-border)", padding: "40px 48px",
        }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--color-text)", margin: "0 0 28px" }}>
            Întrebări frecvente
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 28 }}>
            {[
              { q: "Pot anula oricând?", a: "Da. Membership-ul se poate anula în orice moment, fără penalități. Accesul rămâne activ până la sfârșitul perioadei plătite." },
              { q: "Cum funcționează plata?", a: "Plata este lunară prin Stripe. Acceptăm carduri Visa, Mastercard și Apple Pay." },
              { q: "Ce se întâmplă cu beneficiile dacă retrogradez?", a: "Beneficiile nivelului superior rămân active până la data reînnoirii. Poți schimba planul oricând din dashboard." },
            ].map(faq => (
              <div key={faq.q}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)", marginBottom: 6 }}>{faq.q}</div>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{faq.a}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 40 }}>
          <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
            Deja membru?{" "}
            <Link href="/membership/dashboard" style={{ color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>
              Accesează dashboard-ul →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
