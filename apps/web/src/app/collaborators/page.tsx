"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";
const VENUE_ID = process.env.NEXT_PUBLIC_VENUE_ID ?? "146fd211-ae20-5ebe-a7af-3c195ab89ae8";

interface Collaborator {
  id: string;
  name: string;
  discipline: string;
  bio: string | null;
  image_url: string | null;
  website_url: string | null;
}

export default function CollaboratorsPage() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDiscipline, setActiveDiscipline] = useState<string>("all");

  useEffect(() => {
    const params = new URLSearchParams({ venue_id: VENUE_ID });
    if (activeDiscipline !== "all") params.set("discipline", activeDiscipline);
    fetch(`${API_URL}/api/v1/collaborators?${params}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setCollaborators(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [activeDiscipline]);

  // Collect unique disciplines from all collaborators for the filter
  const [allCollaborators, setAllCollaborators] = useState<Collaborator[]>([]);
  useEffect(() => {
    fetch(`${API_URL}/api/v1/collaborators?venue_id=${VENUE_ID}&limit=100`)
      .then(r => r.ok ? r.json() : [])
      .then(setAllCollaborators)
      .catch(() => {});
  }, []);

  const disciplines = Array.from(new Set(allCollaborators.map(c => c.discipline))).sort();

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
        <nav style={{ marginLeft: "auto", display: "flex", gap: 24 }}>
          <Link href="/events" style={{ fontSize: 14, color: "var(--color-text-secondary)", textDecoration: "none" }}>Evenimente</Link>
          <Link href="/stories" style={{ fontSize: 14, color: "var(--color-text-secondary)", textDecoration: "none" }}>Povești</Link>
          <Link href="/collaborators" style={{ fontSize: 14, color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>Colaboratori</Link>
          <Link href="/membership" style={{ fontSize: 14, color: "var(--color-text-secondary)", textDecoration: "none" }}>Membership</Link>
        </nav>
      </header>

      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, var(--color-primary) 0%, #1a2e1c 100%)",
        color: "#fff",
        padding: "56px 40px",
        textAlign: "center",
      }}>
        <div style={{
          display: "inline-block",
          background: "rgba(184,150,46,0.2)",
          color: "var(--color-accent-light)",
          borderRadius: 20, padding: "4px 16px",
          fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase",
          marginBottom: 16,
        }}>
          Comunitate creativă
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 700, margin: "0 0 14px" }}>
          Colaboratori creativi
        </h1>
        <p style={{ fontSize: 16, opacity: 0.8, maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
          Artiști, muzicieni, fotografi și creatori care fac parte din comunitatea La Mița Biciclista.
        </p>
      </div>

      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "40px 40px 80px" }}>
        {/* Discipline filters */}
        {disciplines.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 36 }}>
            <button
              onClick={() => setActiveDiscipline("all")}
              style={{
                padding: "7px 18px", borderRadius: 20, fontSize: 13, fontWeight: 500,
                border: "1px solid var(--color-border)", cursor: "pointer",
                background: activeDiscipline === "all" ? "var(--color-primary)" : "var(--color-surface-raised)",
                color: activeDiscipline === "all" ? "#fff" : "var(--color-text-secondary)",
              }}
            >
              Toți
            </button>
            {disciplines.map(d => (
              <button
                key={d}
                onClick={() => setActiveDiscipline(d)}
                style={{
                  padding: "7px 18px", borderRadius: 20, fontSize: 13, fontWeight: 500,
                  border: "1px solid var(--color-border)", cursor: "pointer",
                  background: activeDiscipline === d ? "var(--color-primary)" : "var(--color-surface-raised)",
                  color: activeDiscipline === d ? "#fff" : "var(--color-text-secondary)",
                }}
              >
                {d}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: 15, padding: "64px 0" }}>
            Se încarcă colaboratorii...
          </div>
        ) : collaborators.length === 0 ? (
          <div style={{
            background: "var(--color-surface-raised)", borderRadius: 16,
            border: "1px solid var(--color-border)", padding: "64px 40px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎨</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--color-text)", margin: "0 0 8px" }}>
              Niciun colaborator găsit
            </h2>
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
              Revino în curând — comunitatea creativă LMBSC este în creștere.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
            {collaborators.map(c => (
              <div
                key={c.id}
                style={{
                  background: "var(--color-surface-raised)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 16,
                  overflow: "hidden",
                  display: "flex", flexDirection: "column",
                }}
              >
                {/* Avatar / image */}
                <div style={{
                  height: 160,
                  background: "linear-gradient(135deg, var(--color-primary-muted) 0%, var(--color-border) 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  overflow: "hidden",
                  flexShrink: 0,
                }}>
                  {c.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.image_url}
                      alt={c.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{
                      width: 72, height: 72, borderRadius: "50%",
                      background: "var(--color-primary)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "#fff",
                    }}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div style={{ padding: "20px 20px 24px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  {/* Discipline badge */}
                  <span style={{
                    alignSelf: "flex-start",
                    fontSize: 11, fontWeight: 600,
                    color: "var(--color-primary)",
                    background: "var(--color-primary-muted)",
                    borderRadius: 12, padding: "2px 10px",
                    textTransform: "capitalize",
                  }}>
                    {c.discipline}
                  </span>

                  <h3 style={{
                    fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700,
                    color: "var(--color-text)", margin: 0, lineHeight: 1.2,
                  }}>
                    {c.name}
                  </h3>

                  {c.bio && (
                    <p style={{
                      fontSize: 13, color: "var(--color-text-secondary)",
                      lineHeight: 1.6, margin: 0, flex: 1,
                      overflow: "hidden", display: "-webkit-box",
                      WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
                    }}>
                      {c.bio}
                    </p>
                  )}

                  {c.website_url && (
                    <a
                      href={c.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 13, fontWeight: 600, color: "var(--color-primary)",
                        textDecoration: "none", marginTop: "auto",
                        display: "inline-flex", alignItems: "center", gap: 4,
                      }}
                    >
                      Site web ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
