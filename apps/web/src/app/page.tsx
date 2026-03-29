import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8" style={{ background: "var(--color-surface)" }}>
      <div className="text-center">
        <div className="text-4xl font-bold mb-2" style={{ color: "var(--color-primary)", fontFamily: "var(--font-display)" }}>
          La Mița Biciclista
        </div>
        <div className="text-sm uppercase tracking-[0.15em]" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
          Hospitality Platform
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link href="/reserve"
          className="flex items-center justify-between px-5 h-12 rounded-[8px] text-white font-semibold transition-all hover:opacity-90"
          style={{ background: "var(--color-primary)" }}>
          <span>Rezervare masă</span>
          <span>→</span>
        </Link>
        <Link href="/hospitality"
          className="flex items-center justify-between px-5 h-12 rounded-[8px] font-semibold border transition-all hover:shadow-sm"
          style={{ borderColor: "var(--color-accent)", color: "var(--color-accent)" }}>
          <span>Ospitalitate & Evenimente</span>
          <span>→</span>
        </Link>
        <Link href="/dashboard"
          className="flex items-center justify-between px-5 h-12 rounded-[8px] font-semibold border transition-all hover:shadow-sm"
          style={{ borderColor: "var(--color-primary)", color: "var(--color-primary)" }}>
          <span>Vedere sală — Host</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
}
