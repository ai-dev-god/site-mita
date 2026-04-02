"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

type MemberTier = "free" | "friend" | "patron";
type MemberStatus = "active" | "cancelled" | "past_due";

interface Member {
  id: string;
  user_id: string;
  email?: string;
  display_name?: string;
  tier: MemberTier;
  status: MemberStatus;
  joined_at: string;
  current_period_end: string | null;
}

const TIER_LABELS: Record<MemberTier, string> = {
  free: "Liber", friend: "Prieten", patron: "Patron",
};

const TIER_COLORS: Record<MemberTier, { bg: string; color: string }> = {
  free:   { bg: "#F3F4F6", color: "#6B7280" },
  friend: { bg: "#FEF3C7", color: "#92400E" },
  patron: { bg: "#D1FAE5", color: "#065F46" },
};

const STATUS_COLORS: Record<MemberStatus, { bg: string; color: string }> = {
  active:    { bg: "#D1FAE5", color: "#065F46" },
  cancelled: { bg: "#FEE2E2", color: "#991B1B" },
  past_due:  { bg: "#FEF3C7", color: "#92400E" },
};

const STATUS_LABELS: Record<MemberStatus, string> = {
  active: "Activ", cancelled: "Anulat", past_due: "Restanță",
};

export default function AdminMembershipPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleOk, setRoleOk] = useState<boolean | null>(null);
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stats, setStats] = useState({ total: 0, friend: 0, patron: 0, mrr: 0 });

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

  async function fetchMembers() {
    const token = await getToken({ template: "default" });
    const params = new URLSearchParams();
    if (tierFilter !== "all") params.set("tier", tierFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    const res = await fetch(`${API_URL}/api/v1/membership/members?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data: Member[] = await res.json();
      setMembers(data);
      // Compute stats
      const friend = data.filter(m => m.tier === "friend" && m.status === "active").length;
      const patron = data.filter(m => m.tier === "patron" && m.status === "active").length;
      setStats({
        total: data.length,
        friend,
        patron,
        mrr: friend * 15 + patron * 35,
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    if (roleOk) fetchMembers();
  }, [roleOk, tierFilter, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleChangeTier(member: Member, tier: MemberTier) {
    const token = await getToken({ template: "default" });
    await fetch(`${API_URL}/api/v1/membership/members/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tier }),
    });
    fetchMembers();
  }

  async function handleExport() {
    const token = await getToken({ template: "default" });
    const res = await fetch(`${API_URL}/api/v1/membership/members/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `members-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  if (!isLoaded || roleOk === null) {
    return <div style={{ padding: 48, color: "var(--color-text-muted)" }}>Se încarcă...</div>;
  }
  if (roleOk === false) {
    return <div style={{ padding: 48, color: "var(--color-error)" }}>Acces restricționat.</div>;
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: "var(--color-text)", margin: 0 }}>
            Membership
          </h1>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
            Gestionează membrii comunității LMBSC
          </p>
        </div>
        <button onClick={handleExport} style={{
          background: "var(--color-surface-raised)", color: "var(--color-text)",
          border: "1px solid var(--color-border)", borderRadius: 8, padding: "10px 20px",
          fontSize: 14, fontWeight: 500, cursor: "pointer",
        }}>
          ↓ Export CSV
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Membri totali",   value: stats.total,       sub: "înregistrați" },
          { label: "Prieteni activi", value: stats.friend,      sub: "15 RON/lună" },
          { label: "Patroni activi",  value: stats.patron,      sub: "35 RON/lună" },
          { label: "MRR estimat",     value: `${stats.mrr} RON`, sub: "venit lunar recurent" },
        ].map(s => (
          <div key={s.label} style={{
            background: "var(--color-surface-raised)", borderRadius: 12,
            border: "1px solid var(--color-border)", padding: "18px 20px",
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "var(--color-text)" }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["all", "free", "friend", "patron"].map(t => (
            <button key={t} onClick={() => setTierFilter(t)} style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500,
              border: "1px solid var(--color-border)", cursor: "pointer",
              background: tierFilter === t ? "var(--color-primary)" : "var(--color-surface-raised)",
              color: tierFilter === t ? "#fff" : "var(--color-text-secondary)",
            }}>
              {t === "all" ? "Toate nivelele" : TIER_LABELS[t as MemberTier]}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["all", "active", "cancelled", "past_due"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500,
              border: "1px solid var(--color-border)", cursor: "pointer",
              background: statusFilter === s ? "var(--color-primary)" : "var(--color-surface-raised)",
              color: statusFilter === s ? "#fff" : "var(--color-text-secondary)",
            }}>
              {s === "all" ? "Toate statusurile" : STATUS_LABELS[s as MemberStatus] ?? s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ color: "var(--color-text-muted)", fontSize: 14, padding: "32px 0" }}>Se încarcă membrii...</div>
      ) : members.length === 0 ? (
        <div style={{
          background: "var(--color-surface-raised)", borderRadius: 12, border: "1px solid var(--color-border)",
          padding: 48, textAlign: "center", color: "var(--color-text-muted)", fontSize: 14,
        }}>
          Niciun membru înregistrat.
        </div>
      ) : (
        <div style={{ background: "var(--color-surface-raised)", borderRadius: 12, border: "1px solid var(--color-border)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--color-border)", background: "var(--color-surface)" }}>
                {["Utilizator", "Nivel", "Status", "Abonat din", "Reînnoire", "Acțiuni"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--color-text-secondary)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => {
                const tc = TIER_COLORS[m.tier] ?? TIER_COLORS.free;
                const sc = STATUS_COLORS[m.status] ?? STATUS_COLORS.active;
                return (
                  <tr key={m.id} style={{ borderBottom: "1px solid var(--color-border)", background: i % 2 === 0 ? "transparent" : "var(--color-surface)" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 600, color: "var(--color-text)" }}>
                        {m.display_name ?? "—"}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{m.email ?? m.user_id}</div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 12,
                        background: tc.bg, color: tc.color,
                      }}>
                        {TIER_LABELS[m.tier]}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 12,
                        background: sc.bg, color: sc.color,
                      }}>
                        {STATUS_LABELS[m.status]}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", color: "var(--color-text-secondary)", fontSize: 13 }}>
                      {new Date(m.joined_at).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td style={{ padding: "14px 16px", color: "var(--color-text-secondary)", fontSize: 13 }}>
                      {m.current_period_end
                        ? new Date(m.current_period_end).toLocaleDateString("ro-RO", { day: "numeric", month: "short" })
                        : "—"}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <select
                        defaultValue={m.tier}
                        onChange={e => handleChangeTier(m, e.target.value as MemberTier)}
                        style={{
                          padding: "5px 10px", borderRadius: 6, fontSize: 12,
                          border: "1px solid var(--color-border)", cursor: "pointer",
                          background: "var(--color-surface)", color: "var(--color-text)",
                        }}
                      >
                        <option value="free">Liber</option>
                        <option value="friend">Prieten</option>
                        <option value="patron">Patron</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
