"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface ZoneOption {
  id: string;
  name: string;
  slug: string;
  reservation_policy: string;
}

interface VenueOption {
  id: string;
  name: string;
}

export default function WalkInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedZone = searchParams.get("zone_id");

  const [venueId, setVenueId] = useState<string | null>(null);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [zoneId, setZoneId] = useState<string>(preselectedZone ?? "");
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingZones, setLoadingZones] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const venueRes = await fetch("/api/v1/venues");
        if (!venueRes.ok) return;
        const venues: VenueOption[] = await venueRes.json();
        if (!venues.length) return;
        const vid = venues[0].id;
        setVenueId(vid);

        const zonesRes = await fetch(`/api/v1/venues/${vid}/zones`);
        if (!zonesRes.ok) return;
        const zoneList: ZoneOption[] = await zonesRes.json();
        // Only show walk-in eligible zones
        const walkInZones = zoneList.filter(
          (z) => z.reservation_policy === "walk_in_only" || z.reservation_policy === "walk_in_only"
        );
        setZones(walkInZones.length ? walkInZones : zoneList);
        if (!preselectedZone && zoneList.length) {
          setZoneId(zoneList[0].id);
        }
      } finally {
        setLoadingZones(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!venueId || !zoneId) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/v1/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venue_id: venueId,
          zone_id: zoneId,
          guest_name: guestName || null,
          phone: phone || null,
          party_size: partySize,
          notes: notes || null,
        }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setError(data?.detail ?? "A apărut o eroare. Încearcă din nou.");
        return;
      }
      const entry = await resp.json();
      setPosition(entry.queue_position);
    } catch {
      setError("Conexiune eșuată. Verifică rețeaua și încearcă din nou.");
    } finally {
      setLoading(false);
    }
  }

  // ── Success state ────────────────────────────────────────────────────────
  if (position !== null) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "var(--color-surface, #FAF6F0)" }}
      >
        <div
          className="w-full max-w-sm text-center p-8 rounded-[12px]"
          style={{ background: "white", boxShadow: "0 4px 24px rgba(0,0,0,.08)" }}
        >
          <div className="text-5xl mb-4">🪑</div>
          <h1
            className="text-2xl font-bold mb-2"
            style={{
              color: "var(--color-primary, #2C4A2E)",
              fontFamily: "var(--font-display, Georgia, serif)",
            }}
          >
            Ești în coadă!
          </h1>
          <p className="text-lg font-semibold mb-1" style={{ color: "var(--color-primary, #2C4A2E)" }}>
            Poziția ta: #{position}
          </p>
          <p className="text-sm mt-3" style={{ color: "#666" }}>
            Vei fi anunțat prin SMS când masa ta este gata.
            <br />
            Te rugăm să rămâi în apropierea restaurantului.
          </p>
          <p className="text-xs mt-4" style={{ color: "#999" }}>
            La Mița Biciclista · Str. Biserica Amzei 9, București
          </p>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--color-surface, #FAF6F0)" }}
    >
      <div
        className="w-full max-w-sm rounded-[12px] overflow-hidden"
        style={{ background: "white", boxShadow: "0 4px 24px rgba(0,0,0,.08)" }}
      >
        {/* Header */}
        <div className="px-6 py-5" style={{ background: "#2C4A2E" }}>
          <h1
            className="text-xl font-bold"
            style={{ color: "#FAF6F0", fontFamily: "var(--font-display, Georgia, serif)" }}
          >
            La Mița Biciclista
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#B8962E" }}>
            Intră în coada walk-in
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Zone */}
          {!loadingZones && zones.length > 1 && (
            <div>
              <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: "#555" }}>
                Zona
              </label>
              <select
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-[6px] border text-sm"
                style={{ borderColor: "#ddd", color: "#1a1a1a" }}
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Guest name */}
          <div>
            <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: "#555" }}>
              Nume <span style={{ color: "#aaa", fontWeight: 400 }}>(opțional)</span>
            </label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Ex: Ion Popescu"
              className="w-full h-10 px-3 rounded-[6px] border text-sm"
              style={{ borderColor: "#ddd", color: "#1a1a1a" }}
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: "#555" }}>
              Telefon <span style={{ color: "#aaa", fontWeight: 400 }}>(pentru SMS)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+40 7xx xxx xxx"
              className="w-full h-10 px-3 rounded-[6px] border text-sm"
              style={{ borderColor: "#ddd", color: "#1a1a1a" }}
            />
          </div>

          {/* Party size */}
          <div>
            <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: "#555" }}>
              Nr. persoane
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPartySize((n) => Math.max(1, n - 1))}
                className="w-9 h-9 rounded-full border font-bold text-lg flex items-center justify-center"
                style={{ borderColor: "#2C4A2E", color: "#2C4A2E" }}
              >
                −
              </button>
              <span className="text-xl font-bold w-8 text-center" style={{ color: "#1a1a1a" }}>
                {partySize}
              </span>
              <button
                type="button"
                onClick={() => setPartySize((n) => Math.min(20, n + 1))}
                className="w-9 h-9 rounded-full border font-bold text-lg flex items-center justify-center"
                style={{ borderColor: "#2C4A2E", color: "#2C4A2E" }}
              >
                +
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: "#555" }}>
              Observații <span style={{ color: "#aaa", fontWeight: 400 }}>(opțional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: alergie gluten, loc outdoor…"
              className="w-full h-10 px-3 rounded-[6px] border text-sm"
              style={{ borderColor: "#ddd", color: "#1a1a1a" }}
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-[4px]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !zoneId}
            className="w-full h-11 rounded-[6px] text-white font-semibold text-sm mt-2 disabled:opacity-60"
            style={{ background: "#2C4A2E" }}
          >
            {loading ? "Se adaugă…" : "Intră în coadă"}
          </button>
        </form>
      </div>
    </div>
  );
}
