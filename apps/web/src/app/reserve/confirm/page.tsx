"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function ConfirmContent() {
  const params = useSearchParams();
  const code   = params.get("code") ?? "—";

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--color-surface)" }}>
      <div className="w-full max-w-[420px] rounded-[12px] overflow-hidden shadow-[var(--shadow-lg)]" style={{ background: "var(--color-surface-raised)" }}>

        {/* Success hero */}
        <div className="px-6 py-10 text-center" style={{ background: "var(--color-primary)" }}>
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-3xl mb-4"
            style={{ background: "rgba(255,255,255,0.15)" }}>✓</div>
          <div className="text-white text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>Rezervare confirmată</div>
          <div className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.75)" }}>Vei primi un SMS și un email de confirmare</div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
            style={{ background: "rgba(255,255,255,0.15)", color: "white" }}>
            <span className="text-[11px] uppercase tracking-[0.08em] opacity-70">Cod</span>
            <span className="font-mono text-base">{code}</span>
          </div>
        </div>

        {/* Notification pills */}
        <div className="flex gap-2 px-5 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
          {["✓ SMS trimis", "✓ Email trimis"].map(p => (
            <span key={p} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-medium"
              style={{ background: "var(--color-primary-muted)", color: "var(--color-primary)" }}>{p}</span>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {/* Notification banner */}
          <div className="flex gap-3 px-4 py-3 rounded-[8px]" style={{ background: "var(--color-primary-muted)" }}>
            <span className="text-xl">📅</span>
            <p className="text-sm" style={{ color: "var(--color-primary)" }}>
              Cu <strong>24 de ore înainte</strong> vei primi un reminder cu opțiunea de a modifica sau anula rezervarea.
            </p>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/reserve/modify"
              className="flex flex-col items-center gap-1 px-4 py-4 rounded-[8px] border text-center transition-all hover:shadow-sm"
              style={{ borderColor: "var(--color-border)" }}>
              <span className="text-2xl">✏️</span>
              <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>Modifică</span>
            </Link>
            <Link href="/reserve/cancel"
              className="flex flex-col items-center gap-1 px-4 py-4 rounded-[8px] border text-center transition-all hover:shadow-sm"
              style={{ borderColor: "var(--color-border)" }}>
              <span className="text-2xl">✕</span>
              <span className="text-sm font-medium" style={{ color: "var(--color-error)" }}>Anulează</span>
            </Link>
          </div>

          <Link href="/reserve"
            className="block w-full h-11 rounded-[4px] text-center leading-[44px] text-sm font-semibold uppercase tracking-[0.05em] transition-all border"
            style={{ borderColor: "var(--color-primary)", color: "var(--color-primary)" }}>
            Rezervare nouă
          </Link>

          <p className="text-[11px] text-center" style={{ color: "var(--color-text-muted)" }}>
            Datele tale sunt prelucrate conform <span className="underline">Politicii GDPR</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmContent />
    </Suspense>
  );
}
