import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";

export const metadata = {
  title: "La Mița Biciclista — Braserie · Artă · Patrimoniu · București",
  description: "Braserie franco-română, salon cultural și spațiu expozițional în inima Bucureștiului. Str. Biserica Amzei 9, Sector 1.",
};

const SPACES = [
  {
    num: "01",
    title: "Brasserie",
    desc: "Bucătărie franco-română clasică, preparate din ingrediente locale și sezoniere, vin natural și cocktailuri de autor. Servit la parter, în ambient cald și luminos.",
    linkHref: "/brasserie",
    linkLabel: "Vezi meniul",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 11h18M3 11a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2M3 11v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4M12 7V5M8 7V5M16 7V5" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Salon Historic",
    desc: "La etaj, un salon cu tavane înalte și ornamente originale. Gazda evenimentelor culturale, lansărilor de carte, concertelor intime și expozițiilor de artă contemporană.",
    linkHref: "/evenimente",
    linkLabel: "Evenimente",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M8 2v4M16 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Expoziție",
    desc: "Spațiul expozițional din incintă găzduiește artiști vizuali români și internaționali. Acces gratuit, schimbare trimestrială. Artă care locuiește alături de masă și conversație.",
    linkHref: "/evenimente",
    linkLabel: "Programul galeriei",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
];

const EVENTS_PREVIEW = [
  { day: "18", month: "APR", cat: "Muzică", title: "Jazz & Vin Natural", desc: "Seară de jazz cu Quartet Petrov și selecție de vinuri biodynamice din Moldova și Dealu Mare.", href: "/evenimente" },
  { day: "25", month: "APR", cat: "Expoziție", title: 'Vernisaj: \u201EMemoria Pietrei\u201D', desc: "Lucrări sculpturale ale artistei Ana-Maria Voinea — o meditație asupra patrimoniului urban bucureștean.", href: "/evenimente" },
  { day: "02", month: "MAI", cat: "Cultură", title: 'Lansare de carte: \u201EBoemul interbelic\u201D', desc: "Dialoguri cu autoarea Ioana Pârvulescu despre viața culturală a Bucureștiului în perioada interbelică.", href: "/evenimente" },
];

export default function HomePage() {
  return (
    <div style={{ background: "var(--color-surface)", minHeight: "100vh" }}>
      <MarketingNav />

      {/* ── HERO ── */}
      <section style={{
        position: "relative",
        height: "100vh",
        minHeight: 720,
        background: "linear-gradient(160deg, #1a2e1b 0%, #2c4a2e 45%, #3d6640 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}>
        {/* bg radials */}
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: [
            "radial-gradient(circle at 20% 50%, rgba(184,150,46,0.08) 0%, transparent 50%)",
            "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.04) 0%, transparent 40%)",
            "radial-gradient(circle at 60% 80%, rgba(44,74,46,0.3) 0%, transparent 50%)",
          ].join(","),
        }} />
        {/* arch motifs */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -55%)",
          width: 560,
          height: 680,
          border: "1px solid rgba(184,150,46,0.18)",
          borderRadius: "50% 50% 0 0 / 60% 60% 0 0",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -55%)",
          width: 480,
          height: 600,
          border: "1px solid rgba(184,150,46,0.10)",
          borderRadius: "50% 50% 0 0 / 60% 60% 0 0",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0 80px" }}>
          <p style={{
            fontFamily: "var(--font-body)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "rgba(184,150,46,0.9)",
            marginBottom: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}>
            <span style={{ display: "block", width: 48, height: 1, background: "rgba(184,150,46,0.5)" }} />
            Str. Biserica Amzei 9, Sector 1, București
            <span style={{ display: "block", width: 48, height: 1, background: "rgba(184,150,46,0.5)" }} />
          </p>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(56px, 7vw, 88px)",
            fontWeight: 400,
            fontStyle: "italic",
            color: "#fff",
            letterSpacing: "-0.02em",
            lineHeight: 1.0,
            marginBottom: 28,
          }}>
            La Mița Biciclista
          </h1>
          <p style={{
            fontFamily: "var(--font-body)",
            fontSize: 13,
            fontWeight: 300,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.65)",
            marginBottom: 48,
          }}>
            Braserie · Artă · Patrimoniu · București
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <Link href="/despre" style={{
              display: "inline-flex",
              alignItems: "center",
              height: 48,
              padding: "0 32px",
              background: "var(--color-accent)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "0.04em",
              borderRadius: "var(--radius-sm)",
              textDecoration: "none",
            }}>
              Descoperă Povestea
            </Link>
            <Link href="/hospitality/reserve" style={{
              display: "inline-flex",
              alignItems: "center",
              height: 48,
              padding: "0 32px",
              border: "1.5px solid rgba(255,255,255,0.4)",
              color: "rgba(255,255,255,0.85)",
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: "0.02em",
              borderRadius: "var(--radius-sm)",
              textDecoration: "none",
            }}>
              Rezervă o Masă
            </Link>
          </div>
        </div>

        <div style={{
          position: "absolute",
          bottom: 36,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          color: "rgba(255,255,255,0.4)",
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontWeight: 500,
        }}>
          <div style={{ width: 1, height: 40, background: "linear-gradient(to bottom, rgba(184,150,46,0.6), transparent)" }} />
          <span>Continuă</span>
        </div>
      </section>

      {/* ── BRAND STORY ── */}
      <section style={{ background: "var(--color-surface)", padding: "112px 64px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 420px",
          gap: 80,
          alignItems: "center",
          maxWidth: 1152,
          margin: "0 auto",
        }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--color-primary)", marginBottom: 20 }}>
              Povestea Noastră
            </p>
            <div style={{ width: 40, height: 2, background: "var(--color-accent)", marginBottom: 24 }} />
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 42, fontWeight: 600, lineHeight: 1.18, letterSpacing: "-0.02em", color: "var(--color-text)", marginBottom: 28 }}>
              O poveste veche<br />de decenii, vie și astăzi
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.75, color: "var(--color-text-secondary)", marginBottom: 16 }}>
              La Mița Biciclista s-a născut dintr-o dorință profundă de a aduce în prezent spiritul boem al Bucureștiului interbelic. Spațiul nostru de pe Strada Biserica Amzei 9 este mai mult decât un restaurant — este un loc unde istoria, arta și gastronomia se întâlnesc.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.75, color: "var(--color-text-secondary)", marginBottom: 16 }}>
              Braseria noastră celebrează tradițiile culinare francoromâne, cu un meniu care onorează ingredientele locale și tehnicile clasice. Salonul nostru istoric găzduiește expoziții, lansări de carte și serate muzicale, păstrând viu spiritul cultural al orașului.
            </p>
            <Link href="/despre" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: "var(--color-primary)", textDecoration: "none", marginTop: 12, letterSpacing: "0.02em" }}>
              Citește întreaga poveste
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
            </Link>
          </div>
          <div style={{
            width: "100%",
            aspectRatio: "4/5",
            background: "linear-gradient(145deg, #d4c9b8 0%, #bfb3a2 50%, #a8997d 100%)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.18em",
            color: "rgba(255,255,255,0.6)",
          }}>
            FOTOGRAFIE VENUE
          </div>
        </div>
      </section>

      {/* ── THREE SPACES ── */}
      <section style={{ background: "#F4EFE8", padding: "80px 64px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--color-primary)", marginBottom: 12 }}>
            Spațiile Noastre
          </p>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 600, color: "var(--color-text)" }}>
            Trei lumi, un singur loc
          </h2>
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          maxWidth: 1152,
          margin: "0 auto",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          background: "#fff",
        }}>
          {SPACES.map((space, i) => (
            <div key={space.num} style={{
              padding: "40px 36px 36px",
              borderRight: i < SPACES.length - 1 ? "1px solid var(--color-border)" : "none",
            }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", color: "var(--color-text-muted)", marginBottom: 20 }}>
                {space.num}
              </p>
              <div style={{
                width: 44,
                height: 44,
                background: "var(--color-primary-muted)",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                color: "var(--color-primary)",
              }}>
                {space.icon}
              </div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, color: "var(--color-text)", marginBottom: 12 }}>
                {space.title}
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--color-text-secondary)", marginBottom: 24 }}>
                {space.desc}
              </p>
              <Link href={space.linkHref} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--color-primary)", textDecoration: "none", letterSpacing: "0.02em" }}>
                {space.linkLabel}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── EVENTS PREVIEW ── */}
      <section style={{ background: "#fff", padding: "96px 64px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", maxWidth: 1152, margin: "0 auto 48px" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--color-primary)", marginBottom: 8 }}>
              Programul Cultural
            </p>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 600, color: "var(--color-text)" }}>
              Evenimente în curând
            </h2>
          </div>
          <Link href="/evenimente" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: "var(--color-primary)", textDecoration: "none", paddingBottom: 4, borderBottom: "1.5px solid var(--color-primary)" }}>
            Vezi toate
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
          </Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28, maxWidth: 1152, margin: "0 auto" }}>
          {EVENTS_PREVIEW.map((ev) => (
            <Link key={ev.title} href={ev.href} style={{ textDecoration: "none" }}>
              <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", background: "linear-gradient(135deg, #c8bcaa 0%, #b5a690 100%)" }}>
                  <div style={{
                    position: "absolute",
                    top: 16,
                    left: 16,
                    background: "var(--color-accent)",
                    color: "#fff",
                    width: 48,
                    height: 56,
                    borderRadius: "var(--radius-sm)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <span style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{ev.day}</span>
                    <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.85 }}>{ev.month}</span>
                  </div>
                </div>
                <div style={{ padding: "20px 20px 24px" }}>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    height: 22,
                    padding: "0 10px",
                    border: "1px solid var(--color-primary)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--color-primary)",
                    marginBottom: 10,
                  }}>
                    {ev.cat}
                  </span>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "var(--color-text)", lineHeight: 1.3, marginBottom: 8 }}>
                    {ev.title}
                  </h3>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--color-text-secondary)" }}>
                    {ev.desc}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── MEMBERSHIP CTA ── */}
      <section style={{ background: "var(--color-primary)", padding: "80px 64px", textAlign: "center" }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(184,150,46,0.9)", marginBottom: 20 }}>
          Comunitatea Noastră
        </p>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 400, fontStyle: "italic", color: "#fff", lineHeight: 1.15, marginBottom: 20 }}>
          Devino parte din cercul interior al Miței
        </h2>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.72)", maxWidth: 560, margin: "0 auto 40px", lineHeight: 1.65 }}>
          Membership-ul La Mița Biciclista îți oferă acces prioritar la evenimente, reduceri la rezervări, preview-uri la vernisaje și o comunitate de oameni care cred în cultură și bun gust.
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <Link href="/hospitality/membership" style={{
            display: "inline-flex",
            alignItems: "center",
            height: 48,
            padding: "0 32px",
            background: "var(--color-accent)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "0.04em",
            borderRadius: "var(--radius-sm)",
            textDecoration: "none",
          }}>
            Explorează Membership
          </Link>
          <Link href="/membership" style={{
            display: "inline-flex",
            alignItems: "center",
            height: 48,
            padding: "0 32px",
            border: "1.5px solid rgba(255,255,255,0.4)",
            color: "rgba(255,255,255,0.85)",
            fontSize: 14,
            fontWeight: 500,
            borderRadius: "var(--radius-sm)",
            textDecoration: "none",
          }}>
            Află mai multe
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
