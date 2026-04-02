"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

interface EditorialPost {
  id: string;
  title: string;
  slug: string;
  body: string;
  published_at: string | null;
  tags: string[];
}

export default function StoriesPage() {
  const [posts, setPosts] = useState<EditorialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState<string>("all");

  useEffect(() => {
    fetch(`${API_URL}/api/v1/editorial`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setPosts(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const allTags = Array.from(new Set(posts.flatMap(p => p.tags ?? [])));
  const filtered = activeTag === "all" ? posts : posts.filter(p => p.tags?.includes(activeTag));

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface)", fontFamily: "var(--font-body)" }}>
      {/* Nav */}
      <header style={{
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surface-raised)",
        padding: "0 40px",
        display: "flex", alignItems: "center", height: 64,
      }}>
        <Link href="/" style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--color-primary)", textDecoration: "none" }}>
          La Mița Biciclista
        </Link>
        <nav style={{ marginLeft: "auto", display: "flex", gap: 24 }}>
          <Link href="/events" style={{ fontSize: 14, color: "var(--color-text-secondary)", textDecoration: "none" }}>Evenimente</Link>
          <Link href="/stories" style={{ fontSize: 14, color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>Povești</Link>
          <Link href="/membership" style={{ fontSize: 14, color: "var(--color-text-secondary)", textDecoration: "none" }}>Membership</Link>
        </nav>
      </header>

      {/* Hero */}
      <div style={{
        background: "var(--color-primary)", color: "#fff",
        padding: "48px 40px", textAlign: "center",
      }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 700, margin: 0 }}>
          Povești & Editoriale
        </h1>
        <p style={{ fontSize: 16, opacity: 0.8, marginTop: 12, maxWidth: 520, margin: "12px auto 0" }}>
          Istoria Micului Paris, oameni pe biciclete și cultura locală văzută prin ochii Miței.
        </p>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 40px 64px" }}>
        {/* Tag filters */}
        {allTags.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
            <button
              onClick={() => setActiveTag("all")}
              style={{
                padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 500,
                border: "1px solid var(--color-border)", cursor: "pointer",
                background: activeTag === "all" ? "var(--color-primary)" : "var(--color-surface-raised)",
                color: activeTag === "all" ? "#fff" : "var(--color-text-secondary)",
              }}
            >
              Toate
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                style={{
                  padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 500,
                  border: "1px solid var(--color-border)", cursor: "pointer",
                  background: activeTag === tag ? "var(--color-primary)" : "var(--color-surface-raised)",
                  color: activeTag === tag ? "#fff" : "var(--color-text-secondary)",
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: 15, padding: "48px 0" }}>
            Se încarcă poveștile...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            background: "var(--color-surface-raised)", borderRadius: 16,
            border: "1px solid var(--color-border)", padding: "64px 40px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📖</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--color-text)", margin: "0 0 8px" }}>
              Nicio poveste publicată
            </h2>
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
              Revino în curând — poveștile Miței sunt pe drum.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 28 }}>
            {filtered.map(post => {
              const excerpt = post.body ? post.body.replace(/[#*`>\-]/g, "").slice(0, 140).trim() + "…" : "";
              return (
                <Link key={post.id} href={`/stories/${post.slug}`} style={{ textDecoration: "none" }}>
                  <article style={{
                    background: "var(--color-surface-raised)", borderRadius: 16,
                    border: "1px solid var(--color-border)",
                    padding: "24px 24px 20px",
                    cursor: "pointer",
                    display: "flex", flexDirection: "column", gap: 12,
                    height: "100%",
                  }}>
                    {/* Color accent */}
                    <div style={{ height: 4, background: "var(--color-accent)", borderRadius: 2, width: 40 }} />

                    {post.published_at && (
                      <div style={{
                        fontSize: 12, color: "var(--color-text-muted)",
                        display: "flex", alignItems: "center", gap: 6,
                      }}>
                        📅 {new Date(post.published_at).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })}
                      </div>
                    )}

                    <h2 style={{
                      fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700,
                      color: "var(--color-text)", margin: 0, lineHeight: 1.3,
                    }}>
                      {post.title}
                    </h2>

                    {excerpt && (
                      <p style={{
                        fontSize: 13, color: "var(--color-text-secondary)",
                        lineHeight: 1.6, margin: 0, flex: 1,
                      }}>
                        {excerpt}
                      </p>
                    )}

                    {post.tags?.length > 0 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: "auto" }}>
                        {post.tags.map(t => (
                          <span key={t} style={{
                            fontSize: 11, fontWeight: 600, color: "var(--color-primary)",
                            background: "var(--color-primary-muted)",
                            borderRadius: 12, padding: "2px 8px",
                          }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-primary)", marginTop: 4 }}>
                      Citește →
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
