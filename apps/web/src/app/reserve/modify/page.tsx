"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const TIMES = ["12:00", "12:30", "13:00", "13:30", "14:00", "19:00", "19:30", "20:00", "20:30", "21:00"];

function ModifyContent() {
  const params = useSearchParams();
  const token  = params.get("token") ?? "";
  const [covers,  setCovers]  = useState(2);
  const [time,    setTime]    = useState<string | null>(null);
  const [notes,   setNotes]   = useState("");
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/reservations/modify/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ party_size: covers, time_slot: time, guest_notes: notes || undefined }),
      });
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
          <div className="text-[11px] uppercase tracking-[0.1em]" style={{ color: "var(--color-text-muted)" }}>Modifică rezervarea</div>
        </div>

        <div className="p-5">
          {done ? (
            <div className="text-center py-8 space-y-4">
              <div className="text-5xl">✓</div>
              <div className="text-xl font-bold" style={{ color: "var(--color-primary)", fontFamily: "var(--font-display)" }}>Rezervare actualizată</div>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Vei primi un SMS cu noile detalii.</p>
              <Link href="/reserve"
                className="block w-full h-11 rounded-[4px] text-center leading-[44px] text-white text-sm font-semibold uppercase tracking-[0.05em]"
                style={{ background: "var(--color-primary)" }}>
                Înapoi la rezervări
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Covers */}
              <section>
                <label className="block text-[11px] font-medium uppercase tracking-[0.08em] mb-2" style={{ color: "var(--color-text-secondary)" }}>Număr persoane</label>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => setCovers(c => Math.max(1, c - 1))}
                    className="w-10 h-10 rounded-[4px] border text-xl font-bold"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-primary)" }}>−</button>
                  <div className="flex-1 text-center text-2xl font-bold" style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}>{covers}</div>
                  <button type="button" onClick={() => setCovers(c => Math.min(20, c + 1))}
                    className="w-10 h-10 rounded-[4px] border text-xl font-bold"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-primary)" }}>+</button>
                </div>
              </section>

              {/* Time */}
              <section>
                <label className="block text-[11px] font-medium uppercase tracking-[0.08em] mb-2" style={{ color: "var(--color-text-secondary)" }}>Oră nouă <span style={{ color: "var(--color-text-muted)" }}>(opțional)</span></label>
                <div className="grid grid-cols-5 gap-2">
                  {TIMES.map(t => (
                    <button type="button" key={t}
                      onClick={() => setTime(time === t ? null : t)}
                      className="py-2 rounded-[4px] text-sm font-medium border transition-all"
                      style={{
                        borderColor: time === t ? "var(--color-primary)" : "var(--color-border)",
                        background:  time === t ? "var(--color-primary)" : "white",
                        color:       time === t ? "white" : "var(--color-text)",
                      }}>{t}</button>
                  ))}
                </div>
              </section>

              {/* Notes */}
              <section>
                <label htmlFor="notes" className="block text-[11px] font-medium uppercase tracking-[0.08em] mb-1" style={{ color: "var(--color-text-secondary)" }}>Mențiuni actualizate</label>
                <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Actualizează alergii, preferințe..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-[4px] border text-sm outline-none resize-none"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                />
              </section>

              {error && (
                <div className="text-sm px-3 py-2 rounded-[4px]" style={{ background: "var(--color-error-bg)", color: "var(--color-error)" }}>{error}</div>
              )}

              <button type="submit" disabled={loading}
                className="w-full h-11 rounded-[4px] text-white font-semibold text-sm uppercase tracking-[0.05em] disabled:opacity-40"
                style={{ background: "var(--color-primary)" }}>
                {loading ? "Se salvează..." : "Salvează modificările"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ModifyPage() {
  return <Suspense><ModifyContent /></Suspense>;
}
