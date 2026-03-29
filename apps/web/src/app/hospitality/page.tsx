"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";
const VENUE_ID = process.env.NEXT_PUBLIC_VENUE_ID ?? "146fd211-ae20-5ebe-a7af-3c195ab89ae8";

interface EventItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  starts_at: string;
  is_free: boolean;
  ticket_price_ron: number | null;
  total_capacity: number;
  tickets_sold: number;
}

const SPACES = [
  {
    slug: "brasserie",
    icon: "🍽️",
    name: "Brasserie",
    desc: "Spațiu de dining cu atmosferă warm, ideal pentru dineuri private și întâlniri de afaceri. Până la 60 de persoane.",
    capacity: 60,
    tags: ["Dining privat", "Business", "Cocteil"],
  },
  {
    slug: "salon_istoric",
    icon: "🏛️",
    name: "Salon Istoric",
    desc: "Salon cu elemente arhitecturale originale, perfect pentru lansări de carte, conferințe culturale și celebrări.",
    capacity: 40,
    tags: ["Conferință", "Lansare", "Aniversare"],
  },
  {
    slug: "expozitie",
    icon: "🎨",
    name: "Spațiu Expoziție",
    desc: "Spațiu versatil pentru expoziții de artă, instalații și evenimente culturale cu iluminat dedicat.",
    capacity: 80,
    tags: ["Expoziție", "Instalație", "Vernisaj"],
  },
];

const OFFERINGS = [
  { icon: "🥂", title: "Evenimente Private", desc: "Organizăm evenimente private personalizate — de la dineuri intime la recepții de până la 150 persoane." },
  { icon: "🎭", title: "Hub Cultural", desc: "Găzduim lansări, spectacole, workshop-uri și expoziții ca spațiu cultural activ în București." },
  { icon: "🏢", title: "Corporate", desc: "Pachete complete pentru team building, conferințe și prezentări în inima Bucureștiului." },
  { icon: "🎵", title: "Live Music & Arte", desc: "Seral cu muzică live, jazz, folk și arte performative — agenda lunară disponibilă." },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" });
}

export default function HospitalityPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/events?venue_id=${VENUE_ID}&status=published&limit=4`)
      .then(r => r.ok ? r.json() : [])
      .then((data: EventItem[]) => setEvents(Array.isArray(data) ? data.slice(0, 4) : []))
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface)", fontFamily: "var(--font-body)" }}>

      {/* Nav */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "var(--color-surface-raised)",
        borderBottom: "1px solid var(--color-border)",
        padding: "0 24px", height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "var(--color-primary)", lineHeight: 1.2 }}>
            La Mița Biciclista
          </div>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
            Ospitalitate & Cultură
          </div>
        </Link>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link href="/reserve" style={{
            height: 38, padding: "0 20px", borderRadius: "var(--radius-md)",
            background: "var(--color-primary)", color: "white",
            fontSize: 14, fontWeight: 600, textDecoration: "none",
            display: "flex", alignItems: "center",
          }}>
            Rezervă
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        background: "var(--color-primary)",
        padding: "72px 24px 64px",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{
            display: "inline-block",
            fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.16em",
            color: "var(--color-accent)", fontFamily: "var(--font-mono)",
            marginBottom: 16,
          }}>
            Hub Cultural & Ospitalitate
          </div>
          <h1 style={{
            fontFamily: "var(--font-display)", fontWeight: 700,
            fontSize: "clamp(2rem, 5vw, 3.25rem)", lineHeight: 1.2,
            color: "#fff", margin: "0 0 20px",
          }}>
            Spații cu suflet<br />pentru momente de neuitat
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(255,255,255,0.75)", margin: "0 0 36px" }}>
            La Mița Biciclista este mai mult decât un restaurant — este un spațiu cultural viu
            în inima Bucureștiului. Găzduim cine private, evenimente culturale, expoziții și
            momente care contează.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/reserve" style={{
              height: 48, padding: "0 28px", borderRadius: "var(--radius-md)",
              background: "var(--color-accent)", color: "#fff",
              fontSize: 15, fontWeight: 700, textDecoration: "none",
              display: "inline-flex", alignItems: "center", gap: 8,
            }}>
              Rezervă o masă →
            </Link>
            <a href="#contact" style={{
              height: 48, padding: "0 28px", borderRadius: "var(--radius-md)",
              border: "1.5px solid rgba(255,255,255,0.35)", color: "rgba(255,255,255,0.9)",
              fontSize: 15, fontWeight: 600, textDecoration: "none",
              display: "inline-flex", alignItems: "center", gap: 8,
            }}>
              Solicită ofertă
            </a>
          </div>
        </div>
      </section>

      {/* Offerings */}
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "64px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--color-accent)", fontFamily: "var(--font-mono)", marginBottom: 10 }}>
            Ce oferim
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 3vw, 2rem)", color: "var(--color-text)", margin: 0 }}>
            Ospitalitate cu caracter
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
          {OFFERINGS.map(o => (
            <div key={o.title} style={{
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              padding: "28px 24px",
              boxShadow: "var(--shadow-sm)",
            }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>{o.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--color-text)", marginBottom: 8 }}>{o.title}</div>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--color-text-secondary)" }}>{o.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Spaces */}
      <section style={{ background: "var(--color-primary-muted)", padding: "64px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--color-accent)", fontFamily: "var(--font-mono)", marginBottom: 10 }}>
              Spațiile noastre
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 3vw, 2rem)", color: "var(--color-text)", margin: 0 }}>
              Trei spații, o mie de povești
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {SPACES.map(s => (
              <div key={s.slug} style={{
                background: "var(--color-surface-raised)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
                boxShadow: "var(--shadow-md)",
              }}>
                <div style={{
                  height: 120,
                  background: "var(--color-primary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 52,
                }}>
                  {s.icon}
                </div>
                <div style={{ padding: "24px 24px 28px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 17, color: "var(--color-text)", fontFamily: "var(--font-display)" }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>↑{s.capacity} pers.</div>
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--color-text-secondary)", margin: "0 0 16px" }}>{s.desc}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {s.tags.map(t => (
                      <span key={t} style={{
                        fontSize: 11, fontWeight: 600, padding: "3px 10px",
                        borderRadius: "var(--radius-full)",
                        background: "var(--color-primary-muted)",
                        color: "var(--color-primary)",
                        letterSpacing: "0.05em",
                      }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Events */}
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "64px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 36, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--color-accent)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>
              Agenda
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 3vw, 2rem)", color: "var(--color-text)", margin: 0 }}>
              Evenimente în curând
            </h2>
          </div>
        </div>

        {eventsLoading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ height: 140, borderRadius: "var(--radius-lg)", background: "var(--color-border)", opacity: 0.5 }} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "48px 24px",
            background: "var(--color-surface-raised)", borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-border)",
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
            <div style={{ fontWeight: 600, color: "var(--color-text)", marginBottom: 6 }}>Agenda în pregătire</div>
            <div style={{ fontSize: 14, color: "var(--color-text-muted)" }}>Urmărește-ne pe social media pentru anunțuri.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            {events.map(ev => (
              <div key={ev.id} style={{
                background: "var(--color-surface-raised)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                padding: "20px",
                boxShadow: "var(--shadow-sm)",
              }}>
                <div style={{ fontSize: 12, color: "var(--color-accent)", fontFamily: "var(--font-mono)", fontWeight: 600, marginBottom: 6 }}>
                  {formatDate(ev.starts_at)}
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--color-text)", marginBottom: 8, lineHeight: 1.3 }}>{ev.name}</div>
                {ev.description && (
                  <div style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5, marginBottom: 12,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {ev.description}
                  </div>
                )}
                <div style={{ fontSize: 13, fontWeight: 600, color: ev.is_free ? "var(--color-primary)" : "var(--color-accent)" }}>
                  {ev.is_free ? "Intrare liberă" : `${ev.ticket_price_ron} RON`}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Contact / CTA */}
      <section id="contact" style={{ background: "var(--color-primary)", padding: "72px 24px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 3vw, 2.25rem)", color: "#fff", margin: "0 0 16px" }}>
            Organizezi un eveniment?
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: "rgba(255,255,255,0.75)", margin: "0 0 36px" }}>
            Contactează-ne pentru pachete personalizate de ospitalitate, venue hire și evenimente private.
            Echipa noastră îți răspunde în maxim 24 de ore.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="mailto:events@lamitabiciclista.ro" style={{
              height: 48, padding: "0 28px", borderRadius: "var(--radius-md)",
              background: "var(--color-accent)", color: "#fff",
              fontSize: 15, fontWeight: 700, textDecoration: "none",
              display: "inline-flex", alignItems: "center", gap: 8,
            }}>
              ✉ events@lamitabiciclista.ro
            </a>
            <a href="tel:+40" style={{
              height: 48, padding: "0 28px", borderRadius: "var(--radius-md)",
              border: "1.5px solid rgba(255,255,255,0.35)", color: "rgba(255,255,255,0.9)",
              fontSize: 15, fontWeight: 600, textDecoration: "none",
              display: "inline-flex", alignItems: "center",
            }}>
              📞 Sună-ne
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid var(--color-border)",
        padding: "28px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--color-primary)" }}>
          La Mița Biciclista
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
          Str. Biserica Amzei 9, București · © {new Date().getFullYear()}
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <Link href="/reserve" style={{ fontSize: 13, color: "var(--color-text-secondary)", textDecoration: "none" }}>Rezervări</Link>
          <Link href="/hospitality" style={{ fontSize: 13, color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>Ospitalitate</Link>
        </div>
      </footer>
    </div>
  );
}
