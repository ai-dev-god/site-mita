"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

const TIERS: Record<string, { name: string; price: number; description: string }> = {
  friend: { name: "Prieten", price: 15, description: "Acces la evenimentele exclusive, 10% reducere la rezervări, badge de Prieten." },
  patron: { name: "Patron", price: 35, description: "Acces VIP, print semnat anual, masă rezervată la evenimentele speciale." },
};

function JoinForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAuth();

  const tierParam = searchParams.get("tier") ?? "friend";
  const tier = TIERS[tierParam] ?? TIERS.friend;

  const [selectedTier, setSelectedTier] = useState(tierParam);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace(`/login?redirect_url=/membership/join?tier=${selectedTier}`);
    }
  }, [isLoaded, isSignedIn, router, selectedTier]);

  async function handleSubscribe() {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken({ template: "default" });
      const res = await fetch(`${API_URL}/api/v1/membership/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tier: selectedTier }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err?.detail ?? "A apărut o eroare. Încearcă din nou.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      // Backend returns checkout_url for Stripe redirect
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        // Subscription activated directly (free tier or promo)
        router.push("/membership/dashboard");
      }
    } catch {
      setError("Conexiune eșuată. Încearcă din nou.");
      setLoading(false);
    }
  }

  if (!isLoaded) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--color-text-muted)", fontSize: 15 }}>Se încarcă...</div>
      </div>
    );
  }

  const currentTier = TIERS[selectedTier] ?? tier;

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface)", fontFamily: "var(--font-body)" }}>
      {/* Nav */}
      <header style={{
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surface-raised)",
        padding: "0 40px",
        display: "flex", alignItems: "center", height: 64,
      }}>
        <Link href="/membership" style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--color-primary)", textDecoration: "none" }}>
          ← Membership
        </Link>
      </header>

      <div style={{ maxWidth: 740, margin: "0 auto", padding: "48px 24px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 700, color: "var(--color-text)", margin: "0 0 8px" }}>
          Abonament Membership
        </h1>
        <p style={{ fontSize: 15, color: "var(--color-text-secondary)", margin: "0 0 36px" }}>
          Alege planul potrivit și alătură-te comunității LMBSC.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 36 }}>
          {Object.entries(TIERS).map(([id, t]) => (
            <button
              key={id}
              onClick={() => setSelectedTier(id)}
              style={{
                background: selectedTier === id ? "var(--color-primary)" : "var(--color-surface-raised)",
                border: selectedTier === id ? "2px solid var(--color-primary)" : "2px solid var(--color-border)",
                borderRadius: 14, padding: "20px 20px",
                cursor: "pointer", textAlign: "left",
                transition: "all 0.15s",
              }}
            >
              <div style={{
                fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700,
                color: selectedTier === id ? "#fff" : "var(--color-text)",
                marginBottom: 4,
              }}>
                {t.name}
              </div>
              <div style={{
                fontSize: 22, fontWeight: 800,
                color: selectedTier === id ? "var(--color-accent-light)" : "var(--color-accent)",
                marginBottom: 8,
              }}>
                {t.price} RON / lună
              </div>
              <div style={{
                fontSize: 12, lineHeight: 1.5,
                color: selectedTier === id ? "rgba(255,255,255,0.75)" : "var(--color-text-secondary)",
              }}>
                {t.description}
              </div>
            </button>
          ))}
        </div>

        {/* Order summary card */}
        <div style={{
          background: "var(--color-surface-raised)", borderRadius: 16,
          border: "1px solid var(--color-border)",
          padding: "28px 32px", marginBottom: 24,
        }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 16px" }}>
            Rezumat comandă
          </h3>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 15, color: "var(--color-text)" }}>
              Membership {currentTier.name}
            </span>
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>
              {currentTier.price} RON
            </span>
          </div>
          <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 20 }}>
            Facturat lunar — poți anula oricând.
          </div>
          <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>Total / lună</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: "var(--color-accent)" }}>
              {currentTier.price} RON
            </span>
          </div>
        </div>

        {error && (
          <div style={{
            background: "var(--color-error-bg)", color: "var(--color-error)",
            borderRadius: "var(--radius-md)", padding: "12px 16px",
            fontSize: 14, marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubscribe}
          disabled={loading}
          style={{
            width: "100%", padding: "16px", fontSize: 16, fontWeight: 700,
            background: "var(--color-primary)", color: "#fff",
            border: "none", borderRadius: "var(--radius-md)",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            marginBottom: 12,
          }}
        >
          {loading ? "Se procesează..." : "Continuă la plată →"}
        </button>

        <p style={{ fontSize: 12, color: "var(--color-text-muted)", textAlign: "center" }}>
          Plată securizată prin Stripe. Datele cardului nu sunt stocate pe serverele noastre.
        </p>
      </div>
    </div>
  );
}

export default function MembershipJoinPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "var(--color-surface)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-body)" }}>
        <div style={{ color: "var(--color-text-muted)" }}>Se încarcă...</div>
      </div>
    }>
      <JoinForm />
    </Suspense>
  );
}
