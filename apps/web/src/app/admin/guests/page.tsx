"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Guest {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email_masked: string | null;
  phone_masked: string | null;
  is_vip: boolean;
  vip_tags: string[] | null;
  dietary_restrictions: string[] | null;
  allergies: string[] | null;
  seating_preferences: string[] | null;
  total_visits: number;
  total_no_shows: number;
  gdpr_consent_given: boolean;
  language_preference: string | null;
  created_at: string;
}

interface Visit {
  reservation_id: string;
  reserved_at: string;
  party_size: number;
  zone_id: string;
  status: string;
  special_occasion: string | null;
  estimated_spend_ron: number | null;
  confirmation_code: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function guestName(g: Guest): string {
  if (g.first_name || g.last_name) {
    return [g.first_name, g.last_name].filter(Boolean).join(" ");
  }
  return "Oaspete necunoscut";
}

function guestInitials(g: Guest): string {
  const f = g.first_name?.[0] ?? "";
  const l = g.last_name?.[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Guest card ────────────────────────────────────────────────────────────────

function GuestCard({
  guest,
  selected,
  onClick,
}: {
  guest: Guest;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        padding: "12px 16px",
        background: selected ? "#f0f7f0" : "transparent",
        borderLeft: selected ? "3px solid #2C4A2E" : "3px solid transparent",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        borderBottom: "1px solid #f0f0f0",
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: guest.is_vip ? "#B8962E" : "#2C4A2E",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {guestInitials(guest)}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#1a1a1a",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {guestName(guest)}
          </span>
          {guest.is_vip && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                background: "#fef3c7",
                color: "#92400e",
                padding: "1px 6px",
                borderRadius: 99,
                flexShrink: 0,
              }}
            >
              VIP
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: "#888" }}>
          {guest.total_visits} vizite
          {guest.email_masked && ` · ${guest.email_masked}`}
        </div>
      </div>
    </button>
  );
}

// ── Profile panel ─────────────────────────────────────────────────────────────

function ProfilePanel({ guest }: { guest: Guest }) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(true);

  useEffect(() => {
    setLoadingVisits(true);
    fetch(`/api/v1/guests/${guest.id}/visits?limit=20`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setVisits(data))
      .finally(() => setLoadingVisits(false));
  }, [guest.id]);

  const tags = [
    ...(guest.vip_tags ?? []),
    ...(guest.dietary_restrictions ?? []),
    ...(guest.allergies ?? []),
    ...(guest.seating_preferences ?? []),
  ];

  return (
    <div style={{ padding: 24, overflowY: "auto", height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: guest.is_vip ? "#B8962E" : "#2C4A2E",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {guestInitials(guest)}
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>
              {guestName(guest)}
            </h2>
            {guest.is_vip && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  background: "#fef3c7",
                  color: "#92400e",
                  padding: "2px 8px",
                  borderRadius: 99,
                }}
              >
                VIP
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
            Înregistrat {fmtDate(guest.created_at)}
            {guest.language_preference && ` · ${guest.language_preference.toUpperCase()}`}
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[
          { label: "Vizite totale", value: guest.total_visits, color: "#2C4A2E" },
          { label: "No-show-uri", value: guest.total_no_shows, color: guest.total_no_shows > 0 ? "#b91c1c" : "#888" },
          { label: "GDPR", value: guest.gdpr_consent_given ? "Acordat" : "Retras", color: guest.gdpr_consent_given ? "#166534" : "#b91c1c" },
        ].map((k) => (
          <div
            key={k.label}
            style={{
              background: "#f9f9f9",
              borderRadius: 8,
              padding: "12px 14px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Contact */}
      {(guest.email_masked || guest.phone_masked) && (
        <section style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#888",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 8,
            }}
          >
            Contact (mascat)
          </div>
          <div
            style={{
              background: "#f9f9f9",
              borderRadius: 8,
              padding: "12px 14px",
              fontSize: 13,
              color: "#444",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {guest.email_masked && <span>✉ {guest.email_masked}</span>}
            {guest.phone_masked && <span>📱 {guest.phone_masked}</span>}
          </div>
        </section>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#888",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 8,
            }}
          >
            Preferințe & alergii
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {tags.map((tag, i) => (
              <span
                key={i}
                style={{
                  fontSize: 12,
                  padding: "3px 10px",
                  borderRadius: 99,
                  background: "#f0f0f0",
                  color: "#444",
                  fontWeight: 500,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Visit history */}
      <section>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#888",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 8,
          }}
        >
          Istoric vizite ({visits.length})
        </div>

        {loadingVisits ? (
          <div style={{ fontSize: 13, color: "#aaa", padding: "12px 0" }}>Se încarcă…</div>
        ) : visits.length === 0 ? (
          <div style={{ fontSize: 13, color: "#aaa", padding: "12px 0" }}>Nicio vizită înregistrată.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visits.map((v) => (
              <div
                key={v.reservation_id}
                style={{
                  background: "#f9f9f9",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 13,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: "#1a1a1a" }}>
                      {fmtDateTime(v.reserved_at)}
                    </div>
                    <div style={{ color: "#666", marginTop: 2 }}>
                      {v.party_size} pers.
                      {v.special_occasion && ` · ${v.special_occasion}`}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {v.estimated_spend_ron != null && (
                      <div style={{ fontWeight: 600, color: "#2C4A2E" }}>
                        {v.estimated_spend_ron} RON
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
                      #{v.confirmation_code}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Campaign note */}
      <div
        style={{
          marginTop: 24,
          padding: "10px 14px",
          background: "#eff6ff",
          borderRadius: 8,
          fontSize: 12,
          color: "#1d4ed8",
        }}
      >
        Istoricul campaniilor per oaspete va fi disponibil după integrarea Twilio/Resend (LAM-26).
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [vipOnly, setVipOnly] = useState(false);
  const [selected, setSelected] = useState<Guest | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (q: string, vip: boolean) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (q.length >= 2) params.set("q", q);
    if (vip) params.set("is_vip", "true");
    const r = await fetch(`/api/v1/guests?${params}`);
    if (r.ok) setGuests(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load("", false);
  }, [load]);

  function handleSearch(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(val, vipOnly), 350);
  }

  function handleVipToggle() {
    const next = !vipOnly;
    setVipOnly(next);
    load(query, next);
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#FAF6F0", overflow: "hidden" }}>
      {/* Left: guest list */}
      <div
        style={{
          width: 320,
          flexShrink: 0,
          background: "white",
          borderRight: "1px solid #f0f0f0",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 16px 12px", borderBottom: "1px solid #f0f0f0" }}>
          <h1
            style={{
              margin: "0 0 12px",
              fontSize: 18,
              fontWeight: 700,
              color: "#2C4A2E",
              fontFamily: "var(--font-display, Georgia, serif)",
            }}
          >
            CRM Oaspeți
          </h1>
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Caută după nume…"
            style={{
              width: "100%",
              height: 36,
              padding: "0 12px",
              borderRadius: 6,
              border: "1px solid #ddd",
              fontSize: 13,
              color: "#1a1a1a",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                fontSize: 12,
                color: "#555",
              }}
            >
              <input
                type="checkbox"
                checked={vipOnly}
                onChange={handleVipToggle}
                style={{ width: 14, height: 14 }}
              />
              Doar VIP
            </label>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#aaa" }}>
              {guests.length} oaspeți
            </span>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "#aaa" }}>
              Se încarcă…
            </div>
          ) : guests.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "#aaa" }}>
              {query.length >= 2 ? "Niciun rezultat." : "Niciun oaspete înregistrat."}
            </div>
          ) : (
            guests.map((g) => (
              <GuestCard
                key={g.id}
                guest={g}
                selected={selected?.id === g.id}
                onClick={() => setSelected(g)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: profile panel */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {selected ? (
          <ProfilePanel key={selected.id} guest={selected} />
        ) : (
          <div
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 40 }}>👤</div>
            <p style={{ fontSize: 14, color: "#aaa" }}>
              Selectează un oaspete pentru a vedea profilul.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
