"use client";

import { useState } from "react";
import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";

const MENU_TABS = ["Mic Dejun", "Prânz", "Cină", "Băuturi & Cocktailuri", "Deserturi"];

const MIC_DEJUN = [
  { tags: ["Semnatură", "Vegetarian"], name: "Œufs Bénédicte cu somon afumat", desc: "Ouă poșate pe english muffin artizanal, somon afumat local, sos hollandaise cu unt brun și capere.", price: 52, allergens: "ou, gluten, pește" },
  { tags: ["Vegetarian"], name: "Croissant beurre cu gem de caise", desc: "Croissant din unt AOP, crocant la exterior, pufos interior. Cu gem artizanal de caise și unt nesărat.", price: 28, allergens: "gluten, lactate, ou" },
  { tags: ["Clasic"], name: "Plat de Charcuterie & Brânzeturi", desc: "Selecție de mezeluri artizanale, brânzeturi maturate, miere de flori, nuci și pâine de casă prăjită.", price: 68, allergens: "lactate, gluten, nuci" },
  { tags: ["Sezonier", "Vegetarian"], name: "Porridge de ovăz cu fructe de pădure", desc: "Ovăz lent, lapte de ovăz, compot de fructe de pădure, granola caramelizată și semințe de chia.", price: 36, allergens: "gluten, poate conține nuci" },
  { tags: ["Semnatură"], name: "Omletă à la française cu trufe", desc: "Omletă roulée, gălbenuș intens, cremă de brânză și ulei de trufe negre. Servită cu salată de rucola și rădăcini murate.", price: 58, allergens: "ou, lactate, gluten" },
  { tags: ["Vegetarian"], name: "Tartă cu brânză de capră & legume coapte", desc: "Bază sablée, crème de fromage de chèvre, roșii cherry confit, dovlecel marinat și busuioc proaspăt.", price: 44, allergens: "gluten, lactate, ou" },
];

const WINES = [
  { type: "Alb", name: "Fetească Albă", region: "Crama Gîrboiu, Vrancea", price: 56 },
  { type: "Roșu", name: "Pinot Noir Rezervă", region: "Davino, Dealu Mare", price: 72 },
  { type: "Orange", name: "Riesling de Rhin", region: "Cramele Halewood, Prahova", price: 64 },
];

export default function BrasseriePage() {
  const [activeTab, setActiveTab] = useState(0);

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
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 70% 50%, rgba(184,150,46,0.12) 0%, transparent 60%)" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1152, margin: "0 auto" }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
            <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>Acasă</Link>
            <span>›</span>
            <span style={{ color: "rgba(255,255,255,0.65)" }}>Brasserie</span>
          </div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(184,150,46,0.85)", marginBottom: 16 }}>
            Braserie & Bucătărie
          </p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px, 5vw, 64px)", fontWeight: 400, fontStyle: "italic", color: "#fff", lineHeight: 1.1, marginBottom: 20 }}>
            Savori autentice,<br />în inima orașului
          </h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.68)", maxWidth: 560, lineHeight: 1.65 }}>
            O bucătărie franco-română care celebrează ingredientele locale și sezoniere, preparate cu tehnici clasice și o sensibilitate contemporană.
          </p>
        </div>
      </section>

      {/* RESERVE BAR */}
      <div style={{
        background: "#fff",
        borderBottom: "1px solid var(--color-border)",
        padding: "20px 64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ fontSize: 14, color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 12 }}>
          <span>Program: <strong style={{ color: "var(--color-text)" }}>Lun–Vin 08:00–23:00</strong> · Sâm–Dum 09:00–24:00</span>
          <span style={{ color: "var(--color-border)" }}>|</span>
          <span>Str. Biserica Amzei 9, Sector 1, București</span>
        </div>
        <Link href="/hospitality/reserve" style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          height: 40,
          padding: "0 24px",
          background: "var(--color-primary)",
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          borderRadius: "var(--radius-sm)",
          textDecoration: "none",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
          Rezervă o Masă
        </Link>
      </div>

      {/* MENU SECTION */}
      <div style={{ padding: "64px 64px 80px", maxWidth: 1280, margin: "0 auto" }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--color-primary)", marginBottom: 8 }}>
          Bucătăria Noastră
        </p>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 600, color: "var(--color-text)", marginBottom: 32 }}>
          Meniurile La Mița Biciclista
        </h2>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--color-border)", marginBottom: 40 }}>
          {MENU_TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              style={{
                padding: "12px 20px",
                fontSize: 14,
                fontWeight: activeTab === i ? 600 : 400,
                color: activeTab === i ? "var(--color-primary)" : "var(--color-text-secondary)",
                borderBottom: activeTab === i ? "2px solid var(--color-primary)" : "2px solid transparent",
                marginBottom: -2,
                background: "none",
                border: "none",
                cursor: "pointer",
                letterSpacing: "0.01em",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Menu Items — Mic Dejun shown; others show placeholder */}
        {activeTab === 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {MIC_DEJUN.map((item) => (
              <div key={item.name} style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                <div style={{ width: "100%", aspectRatio: "16/9", background: "linear-gradient(135deg, #d4c9b8 0%, #bfb3a2 100%)" }} />
                <div style={{ padding: "16px 20px 20px" }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                    {item.tags.map((tag) => (
                      <span key={tag} style={{
                        height: 20,
                        padding: "0 8px",
                        background: tag === "Vegetarian" ? "var(--color-primary-muted)" : "var(--color-accent-light)",
                        color: tag === "Vegetarian" ? "var(--color-primary)" : "#7a5c1a",
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                        borderRadius: "var(--radius-sm)",
                        display: "inline-flex",
                        alignItems: "center",
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "var(--color-text)", marginBottom: 8, lineHeight: 1.3 }}>
                    {item.name}
                  </h3>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--color-text-secondary)", marginBottom: 16 }}>
                    {item.desc}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "var(--color-primary)" }}>
                      {item.price} <span style={{ fontSize: 12, fontWeight: 400, color: "var(--color-text-muted)" }}>lei</span>
                    </span>
                    <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{item.allergens}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--color-text-muted)", fontSize: 15 }}>
            Meniu disponibil în local sau la cerere. Contactează-ne la <a href="mailto:hello@lamitabiciclista.ro" style={{ color: "var(--color-primary)" }}>hello@lamitabiciclista.ro</a>.
          </div>
        )}

        <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 24, lineHeight: 1.6 }}>
          Alergeni declarați: gluten (G), ouă (O), lapte (L), pești (P), crustacee (C), arahide (A), nuci (N), soia (S), țelină (Ț), muștar (M), susan (Su). Informații complete la cerere.
        </p>
      </div>

      {/* CHEF'S NOTE */}
      <section style={{ background: "#F4EFE8", padding: "80px 64px", display: "grid", gridTemplateColumns: "1fr 400px", gap: 64, maxWidth: 1280, margin: "0 auto" }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--color-primary)", marginBottom: 12 }}>
            Nota Bucătarului
          </p>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 600, color: "var(--color-text)", marginBottom: 24 }}>
            Filosofia noastră culinară
          </h2>
          <blockquote style={{ fontFamily: "var(--font-display)", fontSize: 20, fontStyle: "italic", lineHeight: 1.55, color: "var(--color-text)", borderLeft: "3px solid var(--color-accent)", paddingLeft: 24, marginBottom: 24 }}>
            „Gătesc cu produse locale nu pentru că e la modă, ci pentru că pământul românesc oferă ingrediente pe care nicio importantă piață pariziană nu le poate replica."
          </blockquote>
          <p style={{ fontSize: 15, lineHeight: 1.75, color: "var(--color-text-secondary)", marginBottom: 24 }}>
            La Mița Biciclista, bucătăria este o conversație între trecut și prezent. Ne inspirăm din rețetele clasice francoromâne ale Bucureștiului interbelic, reinterpretate cu ingrediente contemporane de la fermierii și producătorii artizanali cu care lucrăm direct.
          </p>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>Andrei Dumitrescu</p>
            <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Chef Executiv · La Mița Biciclista</p>
          </div>
        </div>
        <div style={{ background: "linear-gradient(145deg, #c8bcaa 0%, #b5a690 100%)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", color: "rgba(255,255,255,0.6)" }}>
          FOTOGRAFIE CHEF
        </div>
      </section>

      {/* WINE STRIP */}
      <section style={{ background: "#fff", padding: "80px 64px", display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 64, maxWidth: 1280, margin: "0 auto", alignItems: "center" }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--color-primary)", marginBottom: 12 }}>
            Pivnița Noastră
          </p>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 600, color: "var(--color-text)", marginBottom: 16 }}>
            Vinuri naturale & producători de suflet
          </h2>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--color-text-secondary)", marginBottom: 24 }}>
            Selecția noastră de vinuri cuprinde producători naturali și biodynamici din Moldova, Dobrogea, Oltenia și câteva etichete din Franța și Italia selectate cu grijă de somelier-ul nostru.
          </p>
          <Link href="/contact" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            height: 44,
            padding: "0 24px",
            border: "1.5px solid var(--color-primary)",
            color: "var(--color-primary)",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            borderRadius: "var(--radius-sm)",
            textDecoration: "none",
          }}>
            Solicită lista de vinuri
          </Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {WINES.map((wine) => (
            <div key={wine.name} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: 20 }}>
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: 8 }}>{wine.type}</p>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 600, color: "var(--color-text)", marginBottom: 4 }}>{wine.name}</p>
              <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 12 }}>{wine.region}</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: "var(--color-primary)" }}>
                {wine.price} <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 400 }}>lei / pahar</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
