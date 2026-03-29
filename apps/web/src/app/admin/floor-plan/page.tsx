"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { FloorPlan, loadFloorPlan, saveFloorPlan } from "@/lib/floor-plan-store";
import FloorCanvas from "@/components/FloorCanvas";

export default function FloorPlanEditorPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const [plan, setPlan] = useState<FloorPlan | null>(null);
  const [saved, setSaved] = useState(false);
  const [roleOk, setRoleOk] = useState<boolean | null>(null);

  // Role check
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { router.replace("/login"); return; }
    getToken({ template: "default" }).then(async (token) => {
      if (!token) { setRoleOk(false); return; }
      try {
        // Decode the JWT payload to check role claim
        const payload = JSON.parse(atob(token.split(".")[1]));
        const role = payload?.metadata?.role ?? payload?.publicMetadata?.role;
        setRoleOk(role === "admin" || role === "manager");
      } catch {
        setRoleOk(false);
      }
    });
  }, [isLoaded, isSignedIn, getToken, router]);

  // Load plan on mount
  useEffect(() => {
    setPlan(loadFloorPlan());
  }, []);

  function handleSave() {
    if (!plan) return;
    saveFloorPlan(plan);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    if (!confirm("Resetezi planul la valorile implicite?")) return;
    localStorage.removeItem("lmbsc_floor_plan");
    setPlan(loadFloorPlan());
  }

  if (!isLoaded || roleOk === null || !plan) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary)" }}>
        Se încarcă…
      </div>
    );
  }

  if (!roleOk) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: "var(--color-error)" }}>Acces interzis</div>
        <div style={{ color: "var(--color-text-secondary)" }}>Această pagină este disponibilă doar pentru administratori.</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ height: 56, background: "white", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: 16, padding: "0 24px", flexShrink: 0 }}>
        <button
          onClick={() => router.push("/dashboard")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 20, padding: "0 4px" }}
        >
          ←
        </button>
        <div style={{ fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--color-primary)", fontSize: 17 }}>
          Editor Plan Sală
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={handleReset}
            style={{ height: 34, padding: "0 16px", borderRadius: 4, border: "1px solid var(--color-border)", background: "white", color: "var(--color-text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Resetează
          </button>
          <button
            onClick={handleSave}
            style={{
              height: 34,
              padding: "0 20px",
              borderRadius: 4,
              border: "none",
              background: saved ? "var(--color-available)" : "var(--color-primary)",
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            {saved ? "Salvat ✓" : "Salvează"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", gap: 0, overflow: "hidden" }}>
        {/* Canvas area */}
        <div style={{ flex: 1, padding: 24, overflow: "auto" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ marginBottom: 12, fontSize: 13, color: "var(--color-text-muted)" }}>
              Trage mesele pentru a le repoziția · Dublu-clic pe spațiu gol pentru a adăuga o masă · Apasă × pe masă pentru a o șterge
            </div>
            <FloorCanvas
              plan={plan}
              mode="edit"
              onPlanChange={setPlan}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ width: 240, borderLeft: "1px solid var(--color-border)", background: "white", overflowY: "auto", padding: "16px 12px" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Saloane
          </div>
          {plan.zones.map((z) => (
            <div
              key={z.id}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 6px", borderRadius: 6, marginBottom: 4 }}
            >
              <div style={{ width: 12, height: 12, borderRadius: 3, background: z.color, flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: "var(--color-text)", fontWeight: 500 }}>{z.label}</div>
              <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--color-text-muted)" }}>
                {plan.tables.filter((t) => t.zone === z.label).length} mese
              </div>
            </div>
          ))}

          <div style={{ height: 1, background: "var(--color-border)", margin: "16px 0" }} />

          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Mese ({plan.tables.length})
          </div>
          {plan.tables.map((t) => (
            <div
              key={t.id}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 6px", borderRadius: 6, marginBottom: 2, fontSize: 12, color: "var(--color-text-secondary)" }}
            >
              <div style={{ fontWeight: 600, color: "var(--color-text)", minWidth: 28 }}>
                {t.label}
              </div>
              <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.zone}</div>
              <div style={{ color: "var(--color-text-muted)" }}>{t.maxCovers}px</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
