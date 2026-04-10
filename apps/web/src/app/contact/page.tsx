"use client";

import { useState } from "react";
import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";

const INFO_CARDS = [
  {
    title: "Adresă",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
    body: "Str. Biserica Amzei 9, Sector 1, București 010527\n\nIntrare și din Str. Mendeleev 10.",
    link: { label: "Deschide în Maps", href: "https://maps.google.com/?q=Str+Biserica+Amzei+9+Bucuresti" },
  },
  {
    title: "Telefon",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
    body: "Rezervări și informații:\n\n+40 21 XXX XXXX\nLun–Dum, 09:00–21:00",
    link: { label: "Sună acum", href: "tel:+4021XXXXXXX" },
  },
  {
    title: "Email",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
    body: "General: hello@lamitabiciclista.ro\n\nMembership: membership@lamitabiciclista.ro",
    link: { label: "Trimite email", href: "mailto:hello@lamitabiciclista.ro" },
  },
  {
    title: "Transport public",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>,
    body: "Metro Piața Romană (300m)\nMetro Piața Victoriei (400m)\n\nSTB: liniile 131, 226, 368 — stația Amzei",
    link: null,
  },
];

const HOURS = [
  ["Luni", "08:00 – 23:00"],
  ["Marți", "08:00 – 23:00"],
  ["Miercuri", "08:00 – 23:00"],
  ["Joi", "08:00 – 23:00"],
  ["Vineri", "08:00 – 23:00"],
  ["Sâmbătă", "09:00 – 24:00"],
  ["Duminică", "09:00 – 22:00"],
];

const SUBJECTS = [
  "Rezervare pentru grup mare (10+ persoane)",
  "Eveniment privat / corporate",
  "Colaborare & parteneriat",
  "Presă & media",
  "Feedback",
  "Altele",
];

export default function ContactPage() {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <div style={{ background: "var(--color-surface)", minHeight: "100vh" }}>
      <MarketingNav />

      {/* PAGE HERO */}
      <section style={{
        background: "linear-gradient(160deg, #1a2e1b 0%, #2c4a2e 60%, #3d5e3f 100%)",
        padding: "96px 64px 80px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 80% 40%, rgba(184,150,46,0.10) 0%, transparent 60%)" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1152, margin: "0 auto" }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
            <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>Acasă</Link>
            <span>›</span>
            <span style={{ color: "rgba(255,255,255,0.65)" }}>Contact</span>
          </div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(184,150,46,0.85)", marginBottom: 16 }}>
            Contact & Locație
          </p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px, 5vw, 64px)", fontWeight: 400, fontStyle: "italic", color: "#fff", lineHeight: 1.1, marginBottom: 20 }}>
            Suntem aproape.<br />Scrie-ne.
          </h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.68)", maxWidth: 520, lineHeight: 1.65 }}>
            Pentru rezervări online folosiți sistemul direct. Pentru întrebări, colaborări sau grupuri mari — suntem bucuroși să vorbim.
          </p>
        </div>
      </section>

      {/* MAP + FORM GRID */}
      <section style={{ background: "#fff", padding: "0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 480px", maxWidth: 1280, margin: "0 auto" }}>
          {/* Map placeholder */}
          <div style={{
            background: "linear-gradient(145deg, #d4c9b8 0%, #c2b59f 100%)",
            minHeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 12,
            color: "rgba(100,80,60,0.7)",
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
            <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.1em" }}>Str. Biserica Amzei 9, București</p>
            <a href="https://maps.google.com/?q=Str+Biserica+Amzei+9+Bucuresti" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--color-primary)", textDecoration: "underline" }}>
              Deschide în Google Maps
            </a>
          </div>

          {/* Contact form */}
          <div style={{ padding: "48px 40px", borderLeft: "1px solid var(--color-border)" }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--color-primary)", marginBottom: 8 }}>
              Trimite un mesaj
            </p>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600, color: "var(--color-text)", marginBottom: 28 }}>
              Cum te putem ajuta?
            </h2>

            {sent ? (
              <div style={{ background: "var(--color-primary-muted)", border: "1px solid var(--color-primary)", borderRadius: "var(--radius-md)", padding: 24, textAlign: "center" }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--color-primary)", marginBottom: 8 }}>Mesaj trimis!</p>
                <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>Îți răspundem în maxim 24 de ore în zilele lucrătoare.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Prenume</label>
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                      placeholder="Andrei"
                      required
                      style={{ width: "100%", height: 40, padding: "0 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 14, background: "#fff", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Nume</label>
                    <input
                      type="text"
                      value={form.lastName}
                      onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                      placeholder="Ionescu"
                      required
                      style={{ width: "100%", height: 40, padding: "0 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 14, background: "#fff", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Adresă de email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="andrei@email.ro"
                    required
                    style={{ width: "100%", height: 40, padding: "0 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 14, background: "#fff", outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Telefon (opțional)</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+40 7XX XXX XXX"
                    style={{ width: "100%", height: 40, padding: "0 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 14, background: "#fff", outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Subiect</label>
                  <select
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    required
                    style={{ width: "100%", height: 40, padding: "0 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 14, background: "#fff", outline: "none", boxSizing: "border-box" }}
                  >
                    <option value="">Selectează un subiect</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Mesaj</label>
                  <textarea
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Cu ce te putem ajuta?"
                    required
                    rows={5}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 14, background: "#fff", outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
                  />
                </div>

                <button type="submit" style={{
                  height: 44,
                  background: "var(--color-primary)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                }}>
                  Trimite Mesajul
                </button>
                <p style={{ fontSize: 11, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
                  Îți răspundem în maxim 24 de ore în zilele lucrătoare. Datele tale sunt procesate conform GDPR.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* INFO CARDS */}
      <section style={{ background: "var(--color-surface)", padding: "64px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, maxWidth: 1152, margin: "0 auto" }}>
          {INFO_CARDS.map((card) => (
            <div key={card.title} style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "28px 24px" }}>
              <div style={{ width: 44, height: 44, background: "var(--color-primary-muted)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary)", marginBottom: 16 }}>
                {card.icon}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)", marginBottom: 10 }}>{card.title}</h3>
              <p style={{ fontSize: 13, lineHeight: 1.65, color: "var(--color-text-secondary)", whiteSpace: "pre-line", marginBottom: card.link ? 16 : 0 }}>
                {card.body}
              </p>
              {card.link && (
                <a href={card.link.href} target={card.link.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--color-primary)", textDecoration: "none" }}>
                  {card.link.label}
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* HOURS + SOCIAL */}
      <section style={{ background: "#fff", padding: "64px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, maxWidth: 1152, margin: "0 auto" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--color-primary)", marginBottom: 12 }}>
              Program
            </p>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600, color: "var(--color-text)", marginBottom: 24 }}>
              Când ne găsești
            </h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {HOURS.map(([day, time]) => (
                  <tr key={day} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "10px 0", fontSize: 14, color: "var(--color-text-secondary)" }}>{day}</td>
                    <td style={{ padding: "10px 0", fontSize: 14, fontWeight: 500, color: "var(--color-text)", textAlign: "right" }}>{time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 16, lineHeight: 1.55 }}>
              Bucătăria se închide cu 45 min înainte de ora de închidere.
            </p>
          </div>

          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--color-primary)", marginBottom: 12 }}>
              Rețele Sociale
            </p>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600, color: "var(--color-text)", marginBottom: 16 }}>
              Urmărește-ne
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--color-text-secondary)", marginBottom: 28 }}>
              Postăm zilnic — din bucătărie, din culisele evenimentelor, din galeria de artă și din povestea vie a locului.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { handle: "@lamitabiciclista", followers: "4.200 urmăritori pe Instagram", abbr: "IG", color: "#E1306C" },
                { handle: "La Mița Biciclista", followers: "6.800 urmăritori pe Facebook", abbr: "f", color: "#1877F2" },
              ].map((s) => (
                <a key={s.abbr} href="#" style={{ display: "flex", alignItems: "center", gap: 16, textDecoration: "none", padding: "16px 20px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "var(--radius-sm)", background: s.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                    {s.abbr}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", marginBottom: 2 }}>{s.handle}</p>
                    <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{s.followers}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* RESERVE CTA */}
      <section style={{ background: "var(--color-primary)", padding: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 40 }}>
        <div style={{ maxWidth: 560 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px, 2.5vw, 32px)", fontWeight: 400, fontStyle: "italic", color: "#fff", marginBottom: 12 }}>
            Vrei să rezervi o masă sau un eveniment privat?
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.72)", lineHeight: 1.65 }}>
            Sistemul nostru de rezervări online îți permite să alegi data, ora și numărul de persoane direct. Pentru grupuri mari sau evenimente private, sună-ne sau scrie-ne.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
          <Link href="/hospitality/reserve" style={{ display: "inline-flex", alignItems: "center", height: 48, padding: "0 28px", background: "var(--color-accent)", color: "#fff", fontSize: 14, fontWeight: 600, borderRadius: "var(--radius-sm)", textDecoration: "none" }}>
            Rezervă Online
          </Link>
          <a href="tel:+4021XXXXXXX" style={{ display: "inline-flex", alignItems: "center", height: 48, padding: "0 28px", border: "1.5px solid rgba(255,255,255,0.4)", color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: 500, borderRadius: "var(--radius-sm)", textDecoration: "none" }}>
            Sună-ne
          </a>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
