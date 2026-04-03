"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MemberContentGate } from "@/components/MemberContentGate";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";
const VENUE_ID = process.env.NEXT_PUBLIC_VENUE_ID ?? "146fd211-ae20-5ebe-a7af-3c195ab89ae8";

interface EditorialPost {
  id: string;
  title: string;
  slug: string;
  body: string;
  published_at: string | null;
  tags: string[];
}

export default function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState<string | null>(null);
  const [post, setPost] = useState<EditorialPost | null>(null);
  const [loading, setLoading] = useState(true);

  // Resolve async params (Next.js 16)
  useEffect(() => {
    params.then(p => setSlug(p.slug));
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    fetch(`${API_URL}/api/v1/editorial/${slug}?venue_id=${VENUE_ID}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setPost(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-surface)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-body)" }}>
        <div style={{ color: "var(--color-text-muted)" }}>Se încarcă...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-surface)", fontFamily: "var(--font-body)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>😕</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--color-text)", margin: "0 0 8px" }}>Poveste negăsită</h2>
          <Link href="/stories" style={{ fontSize: 14, color: "var(--color-primary)", textDecoration: "none" }}>← Înapoi la povești</Link>
        </div>
      </div>
    );
  }

  // Render markdown-like body as structured paragraphs
  const sections = post.body
    .split("\n")
    .reduce<string[][]>((acc, line) => {
      if (line.trim() === "") {
        if (acc[acc.length - 1]?.length) acc.push([]);
      } else {
        if (!acc.length) acc.push([]);
        acc[acc.length - 1].push(line);
      }
      return acc;
    }, [[]]);

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

      <article style={{ maxWidth: 720, margin: "0 auto", padding: "56px 32px 80px" }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 28 }}>
          <Link href="/stories" style={{ color: "var(--color-primary)", textDecoration: "none" }}>Povești</Link>
          {" / "}
          <span>{post.title}</span>
        </div>

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {post.tags.map(t => (
              <span key={t} style={{
                fontSize: 11, fontWeight: 600, color: "var(--color-primary)",
                background: "var(--color-primary-muted)",
                borderRadius: 12, padding: "3px 10px",
              }}>
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 style={{
          fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 700,
          color: "var(--color-text)", margin: "0 0 16px", lineHeight: 1.2,
        }}>
          {post.title}
        </h1>

        {/* Published date */}
        {post.published_at && (
          <div style={{ fontSize: 14, color: "var(--color-text-muted)", marginBottom: 40, display: "flex", alignItems: "center", gap: 8 }}>
            <span>📅</span>
            <span>
              {new Date(post.published_at).toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
        )}

        {/* Decorative rule */}
        <div style={{ height: 3, background: "var(--color-accent)", width: 48, borderRadius: 2, marginBottom: 40 }} />

        {/* Body — gated for members only */}
        <MemberContentGate>
          <div style={{ fontSize: 16, lineHeight: 1.8, color: "var(--color-text)" }}>
            {sections.filter(s => s.length > 0).map((block, i) => {
              const text = block.join(" ");
              // Simple heading detection
              if (text.startsWith("# ")) {
                return (
                  <h2 key={i} style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: "var(--color-text)", margin: "40px 0 16px", lineHeight: 1.3 }}>
                    {text.replace(/^#+\s*/, "")}
                  </h2>
                );
              }
              if (text.startsWith("## ")) {
                return (
                  <h3 key={i} style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--color-text)", margin: "32px 0 12px" }}>
                    {text.replace(/^#+\s*/, "")}
                  </h3>
                );
              }
              return (
                <p key={i} style={{ margin: "0 0 24px" }}>
                  {text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1")}
                </p>
              );
            })}
          </div>
        </MemberContentGate>

        {/* Footer */}
        <div style={{ marginTop: 56, paddingTop: 32, borderTop: "1px solid var(--color-border)" }}>
          <Link href="/stories" style={{
            fontSize: 14, fontWeight: 600, color: "var(--color-primary)",
            textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            ← Înapoi la toate poveștile
          </Link>
        </div>
      </article>
    </div>
  );
}
