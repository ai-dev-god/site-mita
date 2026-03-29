"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ZoneOption {
  id: string;
  name: string;
  slug: string;
  reservation_policy: string;
  max_party_size: number;
}

interface VenueOption {
  id: string;
  name: string;
  slug: string;
}

const ZONE_ICONS: Record<string, string> = {
  brasserie:     "🍽️",
  salon_istoric: "🏛️",
  expozitie:     "🎨",
};

const OCCASIONS = [
  { id: "birthday",    emoji: "🎂", label: "Zi de naștere" },
  { id: "anniversary", emoji: "💍", label: "Aniversare" },
  { id: "business",    emoji: "💼", label: "Business" },
  { id: "engagement",  emoji: "💐", label: "Logodnă" },
  { id: "other",       emoji: "✨", label: "Altele" },
];

const TIMES = ["12:00", "12:30", "13:00", "13:30", "14:00", "19:00", "19:30", "20:00", "20:30", "21:00"];

function getCalendarDays(year: number, month: number) {
  const first = new Date(year, month, 1).getDay();
  const days  = new Date(year, month + 1, 0).getDate();
  return { firstDay: first === 0 ? 6 : first - 1, days };
}

const MONTH_RO = ["Ianuarie","Februarie","Martie","Aprilie","Mai","Iunie","Iulie","August","Septembrie","Octombrie","Noiembrie","Decembrie"];

export default function ReservePage() {
  const router = useRouter();
  const today  = new Date();

  const [venueId,    setVenueId]    = useState<string | null>(null);
  const [zones,      setZones]      = useState<ZoneOption[]>([]);
  const [zonesError, setZonesError] = useState(false);

  const [zone,      setZone]      = useState<string | null>(null);  // zone UUID
  const [month,     setMonth]     = useState(today.getMonth());
  const [year,      setYear]      = useState(today.getFullYear());
  const [day,       setDay]       = useState<number | null>(null);
  const [time,      setTime]      = useState<string | null>(null);
  const [covers,    setCovers]    = useState(2);
  const [occasion,  setOccasion]  = useState<string | null>(null);
  const [name,      setName]      = useState("");
  const [phone,     setPhone]     = useState("");
  const [email,     setEmail]     = useState("");
  const [notes,     setNotes]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  // Load venue + zones on mount
  useEffect(() => {
    async function loadZones() {
      try {
        const venueRes = await fetch("/api/v1/venues");
        if (!venueRes.ok) { setZonesError(true); return; }
        const venues: VenueOption[] = await venueRes.json();
        if (!venues.length) { setZonesError(true); return; }
        const vid = venues[0].id;
        setVenueId(vid);

        const zonesRes = await fetch(`/api/v1/venues/${vid}/zones`);
        if (!zonesRes.ok) { setZonesError(true); return; }
        const zoneList: ZoneOption[] = await zonesRes.json();
        setZones(zoneList);
      } catch {
        setZonesError(true);
      }
    }
    loadZones();
  }, []);

  const { firstDay, days } = getCalendarDays(year, month);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setDay(null);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setDay(null);
  }

  const selectedZone = zones.find(z => z.id === zone);
  const isValid = zone && day && time && name.trim() && phone.trim() && venueId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      // Step 1 — create/upsert guest
      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName  = nameParts.slice(1).join(" ") || undefined;

      const guestRes = await fetch("/api/v1/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venue_id:            venueId,
          first_name:          firstName,
          last_name:           lastName,
          phone:               phone.trim(),
          email:               email.trim() || undefined,
          language_preference: "ro",
          gdpr_consent_given:  true,
          gdpr_consent_scope:  "reservations",
        }),
      });
      if (!guestRes.ok) {
        const body = await guestRes.json();
        setError(body.detail ?? "Eroare la înregistrare. Încearcă din nou.");
        return;
      }
      const guest = await guestRes.json();

      // Step 2 — create reservation
      const reserved_at = new Date(year, month, day!, parseInt(time!.split(":")[0]), parseInt(time!.split(":")[1]));
      const reservationRes = await fetch("/api/v1/reservations/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venue_id:         venueId,
          zone_id:          zone,
          guest_id:         guest.id,
          reserved_at:      reserved_at.toISOString(),
          party_size:       covers,
          special_occasion: occasion,
          guest_notes:      notes.trim() || undefined,
          language:         "ro",
          source:           "widget",
        }),
      });
      if (!reservationRes.ok) {
        const body = await reservationRes.json();
        const detail = body.detail;
        setError(
          typeof detail === "object" && detail?.message
            ? detail.message
            : typeof detail === "string"
            ? detail
            : "Eroare la trimitere. Încearcă din nou."
        );
        return;
      }
      const data = await reservationRes.json();
      router.push(`/reserve/confirm?id=${data.id}&code=${data.confirmation_code}`);
    } catch {
      setError("Eroare de rețea. Verifică conexiunea.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--color-surface)" }}>
      <div className="w-full max-w-[420px] rounded-[12px] overflow-hidden shadow-[var(--shadow-lg)]" style={{ background: "var(--color-surface-raised)" }}>

        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: "var(--color-border)" }}>
          <span className="text-sm" style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>← Înapoi</span>
          <div className="text-center">
            <div className="text-base font-bold" style={{ color: "var(--color-primary)", fontFamily: "var(--font-display)" }}>La Mița Biciclista</div>
            <div className="text-[11px] uppercase tracking-[0.1em]" style={{ color: "var(--color-text-muted)" }}>Rezervare masă</div>
          </div>
          <button className="text-xs font-medium px-2 py-1 rounded border" style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>RO</button>
        </div>

        {/* Hero */}
        <div className="px-5 py-4" style={{ background: "var(--color-primary)" }}>
          <div className="text-white font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem" }}>Rezervă o masă</div>
          <div className="text-[13px] mt-0.5" style={{ color: "rgba(255,255,255,0.7)" }}>Str. Biserica Amzei 9, București</div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-6">

          {/* Zone */}
          <section>
            <label className="block text-[11px] font-medium uppercase tracking-[0.08em] mb-2" style={{ color: "var(--color-text-secondary)" }}>Alege zona</label>
            {zonesError ? (
              <div className="text-sm px-3 py-2 rounded-[4px]" style={{ background: "var(--color-error-bg)", color: "var(--color-error)" }}>
                Nu s-au putut încărca zonele. Reîncarcă pagina.
              </div>
            ) : zones.length === 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-[72px] rounded-[8px] border animate-pulse" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {zones.map(z => (
                  <button type="button" key={z.id}
                    onClick={() => setZone(z.id)}
                    className="flex flex-col items-center gap-1 p-3 rounded-[8px] border text-center transition-all"
                    style={{
                      borderColor: zone === z.id ? "var(--color-primary)" : "var(--color-border)",
                      background:  zone === z.id ? "var(--color-primary-muted)" : "white",
                    }}
                  >
                    <span className="text-xl">{ZONE_ICONS[z.slug] ?? "🏠"}</span>
                    <span className="text-[11px] font-semibold leading-tight" style={{ color: zone === z.id ? "var(--color-primary)" : "var(--color-text)" }}>{z.name}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Date */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--color-text-secondary)" }}>Dată</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={prevMonth} className="text-lg w-7 h-7 flex items-center justify-center rounded" style={{ color: "var(--color-primary)" }}>‹</button>
                <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{MONTH_RO[month]} {year}</span>
                <button type="button" onClick={nextMonth} className="text-lg w-7 h-7 flex items-center justify-center rounded" style={{ color: "var(--color-primary)" }}>›</button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {["L","Ma","Mi","J","V","S","D"].map(d => (
                <span key={d} className="text-[10px] uppercase font-medium" style={{ color: "var(--color-text-muted)" }}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: days }, (_, i) => i + 1).map(d => {
                const isPast = new Date(year, month, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const isSel  = day === d;
                const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                return (
                  <button type="button" key={d}
                    disabled={isPast}
                    onClick={() => setDay(d)}
                    className="h-8 w-full rounded-[4px] text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      background:  isSel ? "var(--color-primary)" : isToday ? "var(--color-primary-muted)" : "transparent",
                      color:       isSel ? "white" : isToday ? "var(--color-primary)" : "var(--color-text)",
                      fontWeight:  isToday ? 700 : undefined,
                    }}
                  >{d}</button>
                );
              })}
            </div>
          </section>

          {/* Time */}
          <section>
            <label className="block text-[11px] font-medium uppercase tracking-[0.08em] mb-2" style={{ color: "var(--color-text-secondary)" }}>Ora</label>
            <div className="grid grid-cols-5 gap-2">
              {TIMES.map(t => (
                <button type="button" key={t}
                  onClick={() => setTime(t)}
                  className="py-2 rounded-[4px] text-sm font-medium border transition-all"
                  style={{
                    borderColor: time === t ? "var(--color-primary)" : "var(--color-border)",
                    background:  time === t ? "var(--color-primary)" : "white",
                    color:       time === t ? "white" : "var(--color-text)",
                  }}
                >{t}</button>
              ))}
            </div>
          </section>

          {/* Covers */}
          <section>
            <label className="block text-[11px] font-medium uppercase tracking-[0.08em] mb-2" style={{ color: "var(--color-text-secondary)" }}>
              Persoane{selectedZone ? ` (max ${selectedZone.max_party_size})` : ""}
            </label>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setCovers(c => Math.max(1, c - 1))}
                className="w-10 h-10 rounded-[4px] border text-xl font-bold flex items-center justify-center transition-colors"
                style={{ borderColor: "var(--color-border)", color: "var(--color-primary)" }}>−</button>
              <div className="flex-1 text-center">
                <div className="text-2xl font-bold" style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}>{covers}</div>
                <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>persoane</div>
              </div>
              <button type="button" onClick={() => setCovers(c => Math.min(selectedZone?.max_party_size ?? 20, c + 1))}
                className="w-10 h-10 rounded-[4px] border text-xl font-bold flex items-center justify-center transition-colors"
                style={{ borderColor: "var(--color-border)", color: "var(--color-primary)" }}>+</button>
            </div>
          </section>

          {/* Occasion */}
          <section>
            <label className="block text-[11px] font-medium uppercase tracking-[0.08em] mb-2" style={{ color: "var(--color-text-secondary)" }}>Ocazie specială <span style={{ color: "var(--color-text-muted)" }}>(opțional)</span></label>
            <div className="flex flex-wrap gap-2">
              {OCCASIONS.map(o => (
                <button type="button" key={o.id}
                  onClick={() => setOccasion(occasion === o.id ? null : o.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all"
                  style={{
                    borderColor: occasion === o.id ? "var(--color-primary)" : "var(--color-border)",
                    background:  occasion === o.id ? "var(--color-primary-muted)" : "white",
                    color:       occasion === o.id ? "var(--color-primary)" : "var(--color-text-secondary)",
                    fontWeight:  occasion === o.id ? 600 : 400,
                  }}
                >{o.emoji} {o.label}</button>
              ))}
            </div>
          </section>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
            <span className="text-[11px] uppercase tracking-[0.1em]" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>Date contact</span>
            <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
          </div>

          {/* Guest info */}
          <section className="space-y-3">
            {[
              { id: "name",  label: "Nume *",   value: name,  set: setName,  type: "text",  placeholder: "Popescu Ion" },
              { id: "phone", label: "Telefon *", value: phone, set: setPhone, type: "tel",   placeholder: "+40 7xx xxx xxx" },
              { id: "email", label: "Email",      value: email, set: setEmail, type: "email", placeholder: "ion@exemplu.ro" },
            ].map(f => (
              <div key={f.id}>
                <label htmlFor={f.id} className="block text-[11px] font-medium uppercase tracking-[0.08em] mb-1" style={{ color: "var(--color-text-secondary)" }}>{f.label}</label>
                <input id={f.id} type={f.type} value={f.value} onChange={e => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full h-10 px-3 rounded-[4px] border text-sm outline-none transition-all"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  onFocus={e => (e.target.style.borderColor = "var(--color-primary)")}
                  onBlur={e  => (e.target.style.borderColor = "var(--color-border)")}
                />
              </div>
            ))}
            <div>
              <label htmlFor="notes" className="block text-[11px] font-medium uppercase tracking-[0.08em] mb-1" style={{ color: "var(--color-text-secondary)" }}>Mențiuni</label>
              <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Alergii, preferințe de loc, mesaj de aniversare..."
                rows={3}
                className="w-full px-3 py-2 rounded-[4px] border text-sm outline-none resize-none transition-all"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                onFocus={e => (e.target.style.borderColor = "var(--color-primary)")}
                onBlur={e  => (e.target.style.borderColor = "var(--color-border)")}
              />
            </div>
          </section>

          {/* Summary */}
          {zone && day && time && (
            <div className="rounded-[8px] border overflow-hidden" style={{ borderColor: "var(--color-border)" }}>
              {(
                [
                  ["Zona",     selectedZone?.name ?? ""],
                  ["Data",     `${day} ${MONTH_RO[month]} ${year}`],
                  ["Ora",      time],
                  ["Persoane", `${covers} persoane`],
                  ...(occasion ? [["Ocazie", OCCASIONS.find(o => o.id === occasion)?.label ?? ""]] : []),
                ] as [string, string][]
              ).map(([k, v], i) => (
                <div key={k} className="flex justify-between px-4 py-2.5 text-sm" style={{
                  borderTop: i > 0 ? `1px solid var(--color-border)` : undefined,
                }}>
                  <span style={{ color: "var(--color-text-secondary)" }}>{k}</span>
                  <span className="font-medium" style={{ color: "var(--color-text)" }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="text-sm px-3 py-2 rounded-[4px]" style={{ background: "var(--color-error-bg)", color: "var(--color-error)" }}>{error}</div>
          )}

          <button type="submit" disabled={!isValid || loading}
            className="w-full h-11 rounded-[4px] text-white font-semibold text-sm uppercase tracking-[0.05em] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "var(--color-primary)" }}
          >
            {loading ? "Se trimite..." : "Confirmă rezervarea"}
          </button>

          <p className="text-[11px] text-center" style={{ color: "var(--color-text-muted)" }}>
            Prin confirmare, accepți <span className="underline">termenii</span> și <span className="underline">politica GDPR</span>.
          </p>
        </form>
      </div>
    </div>
  );
}
