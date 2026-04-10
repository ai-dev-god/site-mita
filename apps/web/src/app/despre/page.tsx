import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";

export const metadata = {
  title: "Despre Noi — La Mița Biciclista",
  description: "Povestea, filosofia și echipa din spatele La Mița Biciclista. Un spațiu de patrimoniu transformat în braserie, salon cultural și galerie de artă.",
};

const TIMELINE = [
  { year: "1934", title: "Clădirea — o capodoperă eclectică", desc: "Imobilul de pe Str. Biserica Amzei 9 este construit după planurile arhitectului Ion Berindei, în stil eclectic cu influențe neoromânești și Art Deco. Devine rapid un punct de întâlnire al intelectualilor și artiștilor Bucureștiului interbelic." },
  { year: "1948–2010", title: "Șapte decenii de transformări", desc: "Naționalizat în 1948, clădirea trece prin multiple utilizări în perioada comunistă — depozit, birouri, apartamente de stat. Deteriorată semnificativ, ajunge în stare avansată de degradare la începutul anilor 2000." },
  { year: "2016", title: "Achiziția și începutul restaurării", desc: "Fondatorii La Mița Biciclista achiziționează clădirea și lansează un proiect de restaurare atentă, în colaborare cu arhitecți specializați în patrimoniu și Ministerul Culturii." },
  { year: "2021", title: "Deschiderea La Mița Biciclista", desc: "Restaurarea se finalizează. Braseria, Salonul Historic și prima galerie de artă se deschid publicului. În prima lună, peste 3.000 de oaspeți ne trec pragul." },
  { year: "2023", title: "Lansarea programului de Membership", desc: "Comunitatea La Mița Biciclista ia naștere oficial, cu primii 80 de membri fondatori. Programul cultural se extinde la 4 evenimente pe lună." },
];

const PHILOSOPHY = [
  { num: "01", title: "Patrimoniul trăiește în prezent", desc: "Un spațiu istoric nu e muzeu — e un organism viu care trebuie să respire. Restaurăm cu grijă, dar folosim cu bucurie." },
  { num: "02", title: "Mâncarea e un act cultural", desc: "Ce mâncăm, cum mâncăm și cu cine mâncăm spune ceva despre cine suntem. Bucătăria noastră este o afirmație culturală." },
  { num: "03", title: "Arta aparține tuturor", desc: "Expozițiile noastre sunt deschise publicului larg. Credința că arta e pentru inițiați ne este profund străină." },
  { num: "04", title: "Comunitatea e mai valoroasă decât traficul", desc: "Preferăm 200 de oameni care revin cu drag în fiecare săptămână față de 2.000 de trecători ocazionali." },
];

const TEAM = [
  { name: "Elena Dumitrescu", role: "Co-fondatoare & Director Artistic", desc: "Fostă curatoare la MNAC, Elena aduce pasiunea pentru patrimoniu și arta contemporană în fiecare decizie editorială a locului." },
  { name: "Mihai Ionescu", role: "Co-fondator & Director General", desc: "Cu background în restaurare arhitecturală, Mihai a condus proiectul de reabilitare a clădirii și gestionează relațiile cu comunitatea." },
  { name: "Andrei Dumitrescu", role: "Chef Executiv", desc: "Format la Paris și Lyon, revenit în România convins că bucătăria franco-română e o sinteză unică ce merită celebrată." },
  { name: "Ioana Popescu", role: "Manager Cultură & Evenimente", desc: "Programatoarea culturală a locului, cu o ureche pentru muzică bună și un ochi pentru arta vizuală care surprinde." },
];

export default function DesprePage() {
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
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 60%, rgba(184,150,46,0.10) 0%, transparent 60%)" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1152, margin: "0 auto" }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
            <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>Acasă</Link>
            <span>›</span>
            <span style={{ color: "rgba(255,255,255,0.65)" }}>Despre Noi</span>
          </div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(184,150,46,0.85)", marginBottom: 16 }}>
            Povestea & Patrimoniul
          </p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px, 5vw, 64px)", fontWeight: 400, fontStyle: "italic", color: "#fff", lineHeight: 1.1, marginBottom: 20 }}>
            Un loc cu suflet,<br />o clădire cu memorie
          </h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.68)", maxWidth: 560, lineHeight: 1.65 }}>
            Povestea La Mița Biciclista este povestea unei clădiri recuperate, a unui spirit reinventat și a unei comunități construite în jurul artei, gastronomiei și patrimoniului.
          </p>
        </div>
      </section>

      {/* EDITORIAL INTRO */}
      <section style={{ background: "var(--color-surface)", padding: "96px 64px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 480px", gap: 80, maxWidth: 1152, margin: "0 auto", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--color-primary)", marginBottom: 20 }}>
              Cine Suntem
            </p>
            <div style={{ width: 40, height: 2, background: "var(--color-accent)", marginBottom: 24 }} />
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 600, lineHeight: 1.2, color: "var(--color-text)", marginBottom: 28 }}>
              Nu am deschis un restaurant.<br />Am recuperat un loc.
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.8, color: "var(--color-text-secondary)", marginBottom: 16 }}>
              Când am intrat pentru prima oară în clădirea de pe Strada Biserica Amzei 9, am găsit ziduri cu cornișe sculptate ascunse sub straturi de tencuială, pardoseli de parchet sub linoleum sovietic și o curte interioară cu un castan centenar.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.8, color: "var(--color-text-secondary)", marginBottom: 16 }}>
              Cinci ani de restaurare mai târziu, La Mița Biciclista a devenit ceea ce simțeam că poate fi: un loc unde trecutul și prezentul coexistă cu naturalețe, unde o masă bună se poate termina cu un vernisaj, unde bicicleta ta poate sta alături de un Braque original.
            </p>
          </div>
          <div style={{ background: "linear-gradient(145deg, #d4c9b8 0%, #bfb3a2 50%, #a8997d 100%)", borderRadius: "var(--radius-md)", aspectRatio: "4/5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", color: "rgba(255,255,255,0.6)" }}>
            FOTOGRAFIE CLĂDIRE
          </div>
        </div>
      </section>

      {/* TIMELINE */}
      <section style={{ background: "#F4EFE8", padding: "80px 64px" }}>
        <div style={{ maxWidth: 1152, margin: "0 auto" }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--color-primary)", marginBottom: 12 }}>
            Cronologie
          </p>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 600, color: "var(--color-text)", marginBottom: 56 }}>
            Nouăzeci de ani de poveste
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {TIMELINE.map((item, i) => (
              <div key={item.year} style={{ display: "grid", gridTemplateColumns: "120px 40px 1fr", gap: 24, position: "relative", paddingBottom: i < TIMELINE.length - 1 ? 40 : 0 }}>
                <div style={{ textAlign: "right", paddingTop: 4 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, color: "var(--color-accent)" }}>{item.year}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--color-primary)", border: "2px solid var(--color-accent)", flexShrink: 0, marginTop: 6 }} />
                  {i < TIMELINE.length - 1 && <div style={{ flex: 1, width: 2, background: "var(--color-border)", marginTop: 8 }} />}
                </div>
                <div style={{ paddingBottom: i < TIMELINE.length - 1 ? 16 : 0 }}>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, color: "var(--color-text)", marginBottom: 8 }}>{item.title}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--color-text-secondary)" }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PHILOSOPHY */}
      <section style={{ background: "var(--color-surface)", padding: "80px 64px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "400px 1fr", gap: 80, maxWidth: 1152, margin: "0 auto", alignItems: "start" }}>
          <div style={{ background: "linear-gradient(145deg, #2c4a2e 0%, #1e3a20 100%)", borderRadius: "var(--radius-md)", aspectRatio: "4/5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", color: "rgba(255,255,255,0.4)" }}>
            FOTOGRAFIE INTERIOR
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--color-primary)", marginBottom: 12 }}>
              Filosofia Noastră
            </p>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 600, color: "var(--color-text)", marginBottom: 20 }}>
              Patru convingeri care ne ghidează
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--color-text-secondary)", marginBottom: 40 }}>
              Nu am deschis La Mița Biciclista pentru a face un business de restaurație. Am deschis-o pentru că simțeam că Bucureștiul are nevoie de un loc care să creadă sincer în câteva lucruri.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              {PHILOSOPHY.map((p) => (
                <div key={p.num} style={{ display: "flex", gap: 20 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "var(--color-primary-muted)", flexShrink: 0, lineHeight: 1 }}>{p.num}</div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)", marginBottom: 6 }}>{p.title}</p>
                    <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--color-text-secondary)" }}>{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section style={{ background: "#fff", padding: "80px 64px" }}>
        <div style={{ maxWidth: 1152, margin: "0 auto" }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--color-primary)", marginBottom: 12 }}>
            Echipa
          </p>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 600, color: "var(--color-text)", marginBottom: 48 }}>
            Oamenii din spatele locului
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 28 }}>
            {TEAM.map((member) => (
              <div key={member.name}>
                <div style={{ width: "100%", aspectRatio: "1", background: "linear-gradient(145deg, #d4c9b8 0%, #bfb3a2 100%)", borderRadius: "var(--radius-md)", marginBottom: 16 }} />
                <p style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "var(--color-text)", marginBottom: 4 }}>{member.name}</p>
                <p style={{ fontSize: 12, color: "var(--color-accent)", fontWeight: 500, marginBottom: 8, letterSpacing: "0.01em" }}>{member.role}</p>
                <p style={{ fontSize: 13, lineHeight: 1.65, color: "var(--color-text-secondary)" }}>{member.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section style={{ background: "var(--color-primary)", padding: "80px 64px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 3vw, 40px)", fontWeight: 400, fontStyle: "italic", color: "#fff", marginBottom: 16 }}>
          Vino să ne cunoști
        </h2>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.72)", maxWidth: 520, margin: "0 auto 36px", lineHeight: 1.65 }}>
          Fie că vii pentru micul dejun, pentru un eveniment sau pur și simplu din curiozitate — ușa noastră e mereu deschisă.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <Link href="/hospitality/reserve" style={{ display: "inline-flex", alignItems: "center", height: 48, padding: "0 32px", background: "var(--color-accent)", color: "#fff", fontSize: 14, fontWeight: 600, borderRadius: "var(--radius-sm)", textDecoration: "none", letterSpacing: "0.04em" }}>
            Rezervă o Masă
          </Link>
          <Link href="/contact" style={{ display: "inline-flex", alignItems: "center", height: 48, padding: "0 32px", border: "1.5px solid rgba(255,255,255,0.4)", color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: 500, borderRadius: "var(--radius-sm)", textDecoration: "none" }}>
            Contactează-ne
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
