"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

interface EditorialPost {
  id: string;
  title: string;
  slug: string;
  body: string;
  published_at: string | null;
  tags: string[];
}

const EMPTY_FORM = {
  title: "",
  slug: "",
  body: "",
  tags: "",
  published_at: "",
};

const btnSecondary: React.CSSProperties = {
  background: "var(--color-surface-raised)",
  color: "var(--color-text)",
  border: "1px solid var(--color-border)",
  borderRadius: 8, padding: "8px 14px",
  fontSize: 13, fontWeight: 500, cursor: "pointer",
};

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 1000, padding: 24,
};

const modalCard: React.CSSProperties = {
  background: "var(--color-surface-raised)",
  borderRadius: 16, padding: 32,
  width: "100%", maxWidth: 720,
  maxHeight: "90vh", overflowY: "auto",
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600,
  color: "var(--color-text-secondary)", marginBottom: 6,
  textTransform: "uppercase", letterSpacing: "0.06em",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px",
  border: "1px solid var(--color-border)", borderRadius: 8,
  fontSize: 14, background: "var(--color-surface)",
  color: "var(--color-text)", outline: "none", boxSizing: "border-box",
};

export default function AdminEditorialPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();

  const [posts, setPosts] = useState<EditorialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleOk, setRoleOk] = useState<boolean | null>(null);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<EditorialPost | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { router.replace("/login"); return; }
    getToken({ template: "default" }).then(async (token) => {
      if (!token) { setRoleOk(false); return; }
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const role = payload?.metadata?.role ?? payload?.publicMetadata?.role;
        setRoleOk(role === "admin" || role === "manager");
      } catch { setRoleOk(false); }
    });
  }, [isLoaded, isSignedIn, getToken, router]);

  async function fetchPosts() {
    const token = await getToken({ template: "default" });
    const res = await fetch(`${API_URL}/api/v1/editorial`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setPosts(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    if (roleOk) fetchPosts();
  }, [roleOk]); // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setForm(EMPTY_FORM);
    setSelected(null);
    setError(null);
    setModal("create");
  }

  function openEdit(post: EditorialPost) {
    setSelected(post);
    setError(null);
    setForm({
      title: post.title,
      slug: post.slug,
      body: post.body,
      tags: post.tags?.join(", ") ?? "",
      published_at: post.published_at ? post.published_at.slice(0, 16) : "",
    });
    setModal("edit");
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const token = await getToken({ template: "default" });
    const body = {
      title: form.title,
      slug: form.slug,
      body: form.body,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
    };

    const url = modal === "create"
      ? `${API_URL}/api/v1/editorial`
      : `${API_URL}/api/v1/editorial/${selected!.id}`;
    const method = modal === "create" ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err?.detail ?? "A apărut o eroare.");
      setSaving(false);
      return;
    }
    setModal(null);
    setSaving(false);
    fetchPosts();
  }

  async function handlePublishToggle(post: EditorialPost) {
    const token = await getToken({ template: "default" });
    const published_at = post.published_at ? null : new Date().toISOString();
    await fetch(`${API_URL}/api/v1/editorial/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ published_at }),
    });
    fetchPosts();
  }

  async function handleDelete(post: EditorialPost) {
    if (!confirm(`Ștergi articolul "${post.title}"?`)) return;
    const token = await getToken({ template: "default" });
    await fetch(`${API_URL}/api/v1/editorial/${post.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchPosts();
  }

  if (!isLoaded || roleOk === null) {
    return <div style={{ padding: 48, color: "var(--color-text-muted)" }}>Se încarcă...</div>;
  }
  if (roleOk === false) {
    return <div style={{ padding: 48, color: "var(--color-error)" }}>Acces restricționat.</div>;
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: "var(--color-text)", margin: 0 }}>
            Editorial
          </h1>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
            Povești, articole și conținut de patrimoniu
          </p>
        </div>
        <button onClick={openCreate} style={{
          background: "var(--color-primary)", color: "#fff",
          border: "none", borderRadius: 8, padding: "10px 20px",
          fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>
          + Articol nou
        </button>
      </div>

      {loading ? (
        <div style={{ color: "var(--color-text-muted)", fontSize: 14 }}>Se încarcă articolele...</div>
      ) : posts.length === 0 ? (
        <div style={{
          background: "var(--color-surface-raised)", borderRadius: 12, border: "1px solid var(--color-border)",
          padding: 48, textAlign: "center", color: "var(--color-text-muted)", fontSize: 14,
        }}>
          Niciun articol. Creează primul articol editorial.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {posts.map(post => (
            <div key={post.id} style={{
              background: "var(--color-surface-raised)", border: "1px solid var(--color-border)",
              borderRadius: 12, padding: "18px 24px",
              display: "flex", alignItems: "center", gap: 20,
            }}>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, fontSize: 16, color: "var(--color-text)" }}>{post.title}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 12,
                    background: post.published_at ? "#D1FAE5" : "#F3F4F6",
                    color: post.published_at ? "#065F46" : "#6B7280",
                  }}>
                    {post.published_at ? "Publicat" : "Ciornă"}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>
                  /{post.slug}
                  {post.published_at && (
                    <> · {new Date(post.published_at).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })}</>
                  )}
                </div>
                {post.tags?.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {post.tags.map(t => (
                      <span key={t} style={{
                        fontSize: 11, fontWeight: 500,
                        background: "var(--color-primary-muted)", color: "var(--color-primary)",
                        borderRadius: 10, padding: "1px 7px",
                      }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Word count */}
              <div style={{ textAlign: "center", minWidth: 80 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>
                  {post.body ? post.body.trim().split(/\s+/).length : 0}
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>cuvinte</div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => openEdit(post)} style={btnSecondary}>Editează</button>
                <button onClick={() => handlePublishToggle(post)} style={{
                  ...btnSecondary,
                  background: post.published_at ? "var(--color-primary-muted)" : "var(--color-primary)",
                  color: post.published_at ? "var(--color-primary)" : "#fff",
                  border: "none",
                }}>
                  {post.published_at ? "Retrage" : "Publică"}
                </button>
                <button onClick={() => handleDelete(post)} style={{ ...btnSecondary, color: "var(--color-error)", borderColor: "#FCA5A5" }}>
                  Șterge
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(modal === "create" || modal === "edit") && (
        <div style={overlay} onClick={() => setModal(null)}>
          <div style={modalCard} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
              {modal === "create" ? "Articol nou" : "Editează articol"}
            </h2>

            {error && (
              <div style={{ background: "#FEE2E2", color: "#991B1B", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Titlu *</label>
                <input
                  style={inputStyle}
                  value={form.title}
                  onChange={e => setForm(f => ({
                    ...f,
                    title: e.target.value,
                    slug: f.slug || e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
                  }))}
                  placeholder="ex. Istoria bicicliștilor din Micul Paris"
                />
              </div>
              <div>
                <label style={labelStyle}>Slug (URL) *</label>
                <input
                  style={inputStyle}
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") }))}
                  placeholder="ex. istoria-biciclistilor-micul-paris"
                />
              </div>
              <div>
                <label style={labelStyle}>Taguri (separate prin virgulă)</label>
                <input
                  style={inputStyle}
                  value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="ex. patrimoniu, biciclete, cultură"
                />
              </div>
              <div>
                <label style={labelStyle}>Data publicării</label>
                <input
                  style={inputStyle}
                  type="datetime-local"
                  value={form.published_at}
                  onChange={e => setForm(f => ({ ...f, published_at: e.target.value }))}
                />
                <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>
                  Lasă gol pentru a salva ca ciornă.
                </div>
              </div>
              <div>
                <label style={labelStyle}>Conținut (Markdown) *</label>
                <textarea
                  style={{ ...inputStyle, height: 280, resize: "vertical", fontFamily: "var(--font-mono)", fontSize: 13, lineHeight: 1.6 }}
                  value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  placeholder={"# Titlu secțiune\n\nScrie conținutul articolului tău în Markdown...\n\n## Subsecțiune\n\nParagraf de text."}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
              <button onClick={() => setModal(null)} style={btnSecondary}>Anulează</button>
              <button onClick={handleSave} disabled={saving} style={{
                background: "var(--color-primary)", color: "#fff",
                border: "none", borderRadius: 8, padding: "10px 24px",
                fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}>
                {saving ? "Se salvează..." : modal === "create" ? "Creează" : "Salvează"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
