"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function CancelContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token  = params.get("token") ?? "";
  const [loading, setLoading]   = useState(false);
  const [done,    setDone]      = useState(false);
  const [error,   setError]     = useState<string | null>(null);

  async function handleCancel() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/reservations/cancel/${token}`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json();
        setError(body.detail ?? "Eroare. Încearcă din nou.");
        return;
      }
      setDone(true);
    } catch {
      setError("Eroare de rețea.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--color-surface)" }}>
      <div className="w-full max-w-[420px] rounded-[12px] overflow-hidden shadow-[var(--shadow-lg)]" style={{ background: "var(--color-surface-raised)" }}>

        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div className="text-base font-bold" style={{ color: "var(--color-primary)", fontFamily: "var(--font-display)" }}>La Mița Biciclista</div>
          <div className="text-[11px] uppercase tracking-[0.1em]" style={{ color: "var(--color-text-muted)" }}>Anulare rezervare</div>
        </div>

        <div className="p-5 space-y-5">
          {done ? (
            <>
              <div className="text-center py-8">
                <div className="text-5xl mb-4">✓</div>
                <div className="text-xl font-bold mb-2" style={{ color: "var(--color-primary)", fontFamily: "var(--font-display)" }}>Rezervare anulată</div>
                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Ne pare rău că nu poți veni. Te așteptăm altă dată!</p>
              </div>
              <Link href="/reserve"
                className="block w-full h-11 rounded-[4px] text-center leading-[44px] text-white text-sm font-semibold uppercase tracking-[0.05em]"
                style={{ background: "var(--color-primary)" }}>
                Rezervare nouă
              </Link>
            </>
          ) : (
            <>
              <div className="px-4 py-3 rounded-[8px]" style={{ background: "var(--color-error-bg)" }}>
                <p className="text-sm font-medium" style={{ color: "var(--color-error)" }}>Ești sigur că dorești să anulezi rezervarea?</p>
                <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>Această acțiune nu poate fi anulată.</p>
              </div>

              {error && (
                <div className="text-sm px-3 py-2 rounded-[4px]" style={{ background: "var(--color-error-bg)", color: "var(--color-error)" }}>{error}</div>
              )}

              <button onClick={handleCancel} disabled={loading || !token}
                className="w-full h-11 rounded-[4px] text-white font-semibold text-sm uppercase tracking-[0.05em] transition-all disabled:opacity-40"
                style={{ background: "var(--color-error)" }}>
                {loading ? "Se procesează..." : "Da, anulează rezervarea"}
              </button>
              <Link href="/"
                className="block w-full h-11 rounded-[4px] text-center leading-[44px] text-sm font-semibold border uppercase tracking-[0.05em]"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                Păstrează rezervarea
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CancelPage() {
  return <Suspense><CancelContent /></Suspense>;
}
