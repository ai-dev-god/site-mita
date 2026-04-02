"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

interface MemberProfile {
  id: string;
  tier: "free" | "friend" | "patron";
  status: "active" | "cancelled" | "past_due";
  joined_at: string;
  current_period_end: string | null;
}

interface CulturalEvent {
  id: string;
  title: string;
  type: "exhibition" | "cinema" | "brasserie";
  date: string;
  description: string | null;
  is_published: boolean;
}

const TIER_LABELS: Record<string, string> = {
  free: "Liber", friend: "Prieten", patron: "Patron",
};

const TIER_COLORS: Record<string, { bg: string; color: string }> = {
  free:   { bg: "var(--color-primary-muted)", color: "var(--color-primary)" },
  friend: { bg: "var(--color-accent-light)",  color: "#92400E" },
  patron: { bg: "var(--color-primary)",        color: "#fff" },
};

const TIER_BENEFITS: Record<string, string[]> = {
  free:   ["Newsletter lunar", "Evenimente publice", "Profil comunitate"],
  friend: ["Acces la evenimente exclusive", "10% reducere rezervări", "Preview vernisaje"],
  patron: ["Acces VIP vernisaje", "Print semnat anual", "Masă rezervată la evenimente speciale"],
};

const EVENT_TYPE_ICONS: Record<string, string> = {
  exhibition: "🖼",
  cinema: "🎬",
  brasserie: "🍽",
};

export default function MembershipDashboardPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();

  const [member, setMember] = useState<MemberProfile | null>(null);
  const [events, setEvents] = useState<CulturalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/login?redirect_url=/membership/dashboard");
      return;
    }

    async function load() {
      const token = await getToken({ template: "default" });
      const [mRes, eRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/membership/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/v1/events?upcoming_only=true&limit=6`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (mRes.ok) setMember(await mRes.json());
      if (eRes.ok) setEvents(await eRes.json());
      setLoading(false);
    }

    load().catch(() => setLoading(false));
  }, [isLoaded, isSignedIn, getToken, router]);

  async function handleCancel() {
    if (!confirm("Ești sigur că vrei să anulezi membership-ul?")) return;
    setCancelLoading(true);
    const token = await getToken({ template: "default" });
    const res = await fetch(`${API_URL}/api/v1/membership/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ cancel_at_period_end: true }),
    });
    if (res.ok) setMember(await res.json());
    setCancelLoading(false);
  }

  if (!isLoaded || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-surface)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-body)" }}>
        <div style={{ color: "var(--color-text-muted)" }}>Se încarcă...</div>
      </div>
    );
  }

  if (!member) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-surface)", fontFamily: "var(--font-body)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 40 }}>
        <div style={{ fontSize: 48 }}>🚲</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--color-text)", margin: 0 }}>
          Nu ești încă membru
        </h2>
        <p style={{ fontSize: 15, color: "var(--color-text-secondary)", textAlign: "center", maxWidth: 360 }}>
          Alătură-te comunității La Mița Biciclista și bucură-te de acces la expoziții, evenimente și mai mult.
        </p>
        <Link href="/membership" style={{
          display: "inline-block", background: "var(--color-primary)", color: "#fff",
          borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, textDecoration: "none",
        }}>
          Descoperă planurile →
        </Link>
      </div>
    );
  }

  const tierColors = TIER_COLORS[member.tier] ?? TIER_COLORS.free;
  const benefits = TIER_BENEFITS[member.tier] ?? [];

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface)", fontFamily: "var(--font-body)" }}>
      {/* Nav */}
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
          <Link href="/membership/dashboard" style={{ fontSize: 14, color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>Dashboard</Link>
        </nav>
      </header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "var(--color-text)", margin: "0 0 32px" }}>
          Contul tău
        </h1>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
          {/* Membership card */}
          <div style={{
            background: "var(--color-surface-raised)", borderRadius: 16,
            border: "1px solid var(--color-border)", padding: "28px",
            gridColumn: "1 / -1",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                  Plan activ
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <span style={{
                    fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "var(--color-text)",
                  }}>
                    Membership {TIER_LABELS[member.tier]}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                    background: tierColors.bg, color: tierColors.color,
                    textTransform: "uppercase", letterSpacing: "0.08em",
                  }}>
                    {member.status === "active" ? "Activ" : member.status === "cancelled" ? "Anulat" : "Restanță"}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                  Membru din {new Date(member.joined_at).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })}
                  {member.current_period_end && (
                    <> · Reînnoire {new Date(member.current_period_end).toLocaleDateString("ro-RO", { day: "numeric", month: "long" })}</>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                {member.tier !== "patron" && (
                  <Link href="/membership/join?tier=patron" style={{
                    background: "var(--color-accent)", color: "#fff",
                    borderRadius: 8, padding: "8px 16px",
                    fontSize: 13, fontWeight: 600, textDecoration: "none",
                  }}>
                    Upgrade
                  </Link>
                )}
                {member.status === "active" && member.tier !== "free" && (
                  <button onClick={handleCancel} disabled={cancelLoading} style={{
                    background: "none", border: "1px solid var(--color-border)",
                    borderRadius: 8, padding: "8px 16px",
                    fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer",
                  }}>
                    {cancelLoading ? "..." : "Anulează"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div style={{
            background: "var(--color-surface-raised)", borderRadius: 16,
            border: "1px solid var(--color-border)", padding: "24px 28px",
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 16px" }}>
              Beneficiile tale
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {benefits.map(b => (
                <li key={b} style={{ fontSize: 14, color: "var(--color-text)", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "var(--color-primary)", fontSize: 12 }}>✓</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Quick links */}
          <div style={{
            background: "var(--color-surface-raised)", borderRadius: 16,
            border: "1px solid var(--color-border)", padding: "24px 28px",
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 16px" }}>
              Acces rapid
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { href: "/events", label: "📅 Calendar evenimente" },
                { href: "/stories", label: "📖 Povești & editoriale" },
                { href: "/reserve", label: "🍽 Rezervare masă" },
              ].map(item => (
                <Link key={item.href} href={item.href} style={{
                  fontSize: 14, color: "var(--color-primary)", textDecoration: "none",
                  fontWeight: 500, display: "block",
                  padding: "8px 12px", borderRadius: 8,
                  background: "var(--color-primary-muted)",
                }}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming events */}
        {events.length > 0 && (
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--color-text)", margin: "0 0 20px" }}>
              Evenimente viitoare
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
              {events.slice(0, 3).map((evt) => {
                const typeOrName = (evt as { type?: string; name?: string; starts_at?: string }).type ?? "";
                const title = (evt as { title?: string; name?: string }).title ?? (evt as { name?: string }).name ?? "";
                const date = (evt as { date?: string; starts_at?: string }).date ?? (evt as { starts_at?: string }).starts_at ?? "";
                return (
                  <Link key={evt.id} href={`/events/${evt.id}`} style={{ textDecoration: "none" }}>
                    <div style={{
                      background: "var(--color-surface-raised)", borderRadius: 12,
                      border: "1px solid var(--color-border)", padding: "16px 20px",
                    }}>
                      <div style={{ fontSize: 20, marginBottom: 8 }}>
                        {EVENT_TYPE_ICONS[typeOrName] ?? "🎫"}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", marginBottom: 4, lineHeight: 1.3 }}>
                        {title}
                      </div>
                      {date && (
                        <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                          {new Date(date).toLocaleDateString("ro-RO", { day: "numeric", month: "short" })}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <Link href="/events" style={{ fontSize: 14, color: "var(--color-primary)", textDecoration: "none", fontWeight: 500 }}>
                Vezi toate evenimentele →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
