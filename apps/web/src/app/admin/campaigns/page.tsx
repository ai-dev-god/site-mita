"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  campaign_type: string;
  channel: string;
  status: string;
  audience_segment: string | null;
  subject_line: string | null;
  body_template: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  recipients_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  unsubscribed_count: number;
  is_automated: boolean;
  created_at: string;
}

interface Segment {
  key: string;
  label: string;
  description: string;
  count: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CAMPAIGN_TYPES: { value: string; label: string }[] = [
  { value: "post_visit_thank_you", label: "Mulțumire post-vizită" },
  { value: "birthday_offer", label: "Ofertă zi de naștere" },
  { value: "win_back", label: "Reactivare (30 zile)" },
  { value: "new_menu", label: "Anunț meniu nou" },
  { value: "event_announcement", label: "Anunț eveniment" },
  { value: "loyalty", label: "Fidelizare" },
  { value: "referral", label: "Referral" },
  { value: "newsletter", label: "Newsletter" },
  { value: "custom", label: "Personalizat" },
];

const CHANNELS: { value: string; label: string }[] = [
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
  { value: "push", label: "Push" },
];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft: { bg: "#f3f4f6", color: "#6b7280" },
  scheduled: { bg: "#eff6ff", color: "#1d4ed8" },
  running: { bg: "#fef9c3", color: "#92400e" },
  completed: { bg: "#dcfce7", color: "#166534" },
  cancelled: { bg: "#fee2e2", color: "#991b1b" },
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Ciornă",
  scheduled: "Programat",
  running: "În curs",
  completed: "Finalizat",
  cancelled: "Anulat",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function typeLabel(t: string): string {
  return CAMPAIGN_TYPES.find((c) => c.value === t)?.label ?? t;
}

function channelLabel(c: string): string {
  return CHANNELS.find((ch) => ch.value === c)?.label ?? c;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] ?? { bg: "#f3f4f6", color: "#374151" };
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-sm font-bold" style={{ color: "#1a1a1a" }}>
        {value}
      </div>
      <div className="text-xs" style={{ color: "#888" }}>
        {label}
      </div>
    </div>
  );
}

// ── Create form ───────────────────────────────────────────────────────────────

function CreateForm({
  segments,
  onCreated,
  onCancel,
}: {
  segments: Segment[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    campaign_type: "post_visit_thank_you",
    channel: "sms",
    audience_segment: "",
    subject_line: "",
    body_template: "",
    is_automated: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const resp = await fetch("/api/v1/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          campaign_type: form.campaign_type,
          channel: form.channel,
          audience_segment: form.audience_segment || null,
          subject_line: form.subject_line || null,
          body_template: form.body_template || null,
          is_automated: form.is_automated,
        }),
      });
      if (!resp.ok) {
        const d = await resp.json().catch(() => ({}));
        setError(d?.detail ?? "Eroare la creare campanie.");
        return;
      }
      onCreated();
    } catch {
      setError("Conexiune eșuată.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full h-10 px-3 rounded-[6px] border text-sm";
  const inputStyle = { borderColor: "#ddd", color: "#1a1a1a" };
  const labelCls = "block text-xs font-semibold mb-1 uppercase tracking-wide";
  const labelStyle = { color: "#555" };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,.4)" }}
    >
      <div
        className="w-full max-w-lg rounded-[12px] overflow-hidden"
        style={{ background: "white", boxShadow: "0 8px 40px rgba(0,0,0,.16)" }}
      >
        <div className="px-6 py-4" style={{ background: "#2C4A2E" }}>
          <h2 className="text-lg font-bold" style={{ color: "#FAF6F0" }}>
            Campanie nouă
          </h2>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
          <div>
            <label className={labelCls} style={labelStyle}>
              Nume campanie
            </label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex: Mulțumire după vizita de vineri"
              className={inputCls}
              style={inputStyle}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={labelStyle}>
                Tip
              </label>
              <select
                value={form.campaign_type}
                onChange={(e) => set("campaign_type", e.target.value)}
                className={inputCls}
                style={inputStyle}
              >
                {CAMPAIGN_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>
                Canal
              </label>
              <select
                value={form.channel}
                onChange={(e) => set("channel", e.target.value)}
                className={inputCls}
                style={inputStyle}
              >
                {CHANNELS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls} style={labelStyle}>
              Segment audiență
            </label>
            <select
              value={form.audience_segment}
              onChange={(e) => set("audience_segment", e.target.value)}
              className={inputCls}
              style={inputStyle}
            >
              <option value="">— Niciun filtru —</option>
              {segments.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label} ({s.count} oaspeți)
                </option>
              ))}
            </select>
          </div>

          {form.channel === "email" && (
            <div>
              <label className={labelCls} style={labelStyle}>
                Subiect email
              </label>
              <input
                type="text"
                value={form.subject_line}
                onChange={(e) => set("subject_line", e.target.value)}
                placeholder="Linia de subiect..."
                className={inputCls}
                style={inputStyle}
              />
            </div>
          )}

          <div>
            <label className={labelCls} style={labelStyle}>
              Mesaj / template
            </label>
            <textarea
              value={form.body_template}
              onChange={(e) => set("body_template", e.target.value)}
              placeholder="Conținutul mesajului. Poți folosi {guest_name}, {code}, etc."
              rows={4}
              className="w-full px-3 py-2 rounded-[6px] border text-sm"
              style={{ borderColor: "#ddd", color: "#1a1a1a", resize: "vertical" }}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_automated}
              onChange={(e) => set("is_automated", e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm" style={{ color: "#444" }}>
              Campanie automată (trigger-based)
            </span>
          </label>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-[4px]">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-10 rounded-[6px] text-white font-semibold text-sm disabled:opacity-60"
              style={{ background: "#2C4A2E" }}
            >
              {saving ? "Se salvează…" : "Creează campania"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 h-10 rounded-[6px] text-sm font-semibold border"
              style={{ borderColor: "#ddd", color: "#555" }}
            >
              Anulează
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [cRes, sRes] = await Promise.all([
      fetch("/api/v1/campaigns?limit=100"),
      fetch("/api/v1/campaigns/segments"),
    ]);
    if (cRes.ok) setCampaigns(await cRes.json());
    if (sRes.ok) setSegments(await sRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function triggerSend(campaign: Campaign) {
    if (sendingId) return;
    setSendingId(campaign.id);
    try {
      const resp = await fetch(`/api/v1/campaigns/${campaign.id}/send`, { method: "POST" });
      if (resp.ok) await load();
    } finally {
      setSendingId(null);
    }
  }

  const totalRecipients = campaigns.reduce((s, c) => s + c.recipients_count, 0);
  const totalDelivered = campaigns.reduce((s, c) => s + c.delivered_count, 0);
  const activeCampaigns = campaigns.filter((c) => c.status === "running").length;
  const completedCampaigns = campaigns.filter((c) => c.status === "completed").length;

  return (
    <div className="min-h-screen p-6" style={{ background: "#FAF6F0" }}>
      {showCreate && (
        <CreateForm
          segments={segments}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "#2C4A2E", fontFamily: "var(--font-display, Georgia, serif)" }}
          >
            Marketing & Loialitate
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#666" }}>
            Campanii automate și manuale · segmentare audiență · referral
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 h-10 rounded-[6px] text-white font-semibold text-sm"
          style={{ background: "#2C4A2E" }}
        >
          + Campanie nouă
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Campanii active", value: activeCampaigns, color: "#B8962E" },
          { label: "Campanii finalizate", value: completedCampaigns, color: "#2C4A2E" },
          { label: "Total destinatari", value: totalRecipients, color: "#2C4A2E" },
          { label: "Total livrate", value: totalDelivered, color: "#2C4A2E" },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-[10px] p-4"
            style={{ background: "white", boxShadow: "0 1px 6px rgba(0,0,0,.06)" }}
          >
            <div className="text-2xl font-bold" style={{ color: k.color }}>
              {k.value}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "#888" }}>
              {k.label}
            </div>
          </div>
        ))}
      </div>

      {/* Segments */}
      <div
        className="rounded-[10px] p-5 mb-6"
        style={{ background: "white", boxShadow: "0 1px 6px rgba(0,0,0,.06)" }}
      >
        <h2 className="text-sm font-bold mb-3" style={{ color: "#2C4A2E" }}>
          Segmente de audiență
        </h2>
        <div className="flex flex-wrap gap-2">
          {segments.map((s) => (
            <div
              key={s.key}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border"
              style={{ borderColor: "#d4d4d4", color: "#444", background: "#f9f9f9" }}
              title={s.description}
            >
              {s.label}
              <span className="ml-1.5 text-xs font-bold" style={{ color: "#2C4A2E" }}>
                {s.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Campaign list */}
      <div
        className="rounded-[10px] overflow-hidden"
        style={{ background: "white", boxShadow: "0 1px 6px rgba(0,0,0,.06)" }}
      >
        <div
          className="px-5 py-3 border-b text-xs font-semibold uppercase tracking-wide"
          style={{ color: "#888", borderColor: "#f0f0f0" }}
        >
          Campanii ({campaigns.length})
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: "#888" }}>
            Se încarcă…
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: "#888" }}>
              Nicio campanie încă.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 px-4 h-9 rounded-[6px] text-white text-sm font-semibold"
              style={{ background: "#2C4A2E" }}
            >
              Creează prima campanie
            </button>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "#f0f0f0" }}>
            {campaigns.map((c) => (
              <div key={c.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={c.status} />
                      {c.is_automated && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: "#e0f2fe", color: "#0369a1" }}
                        >
                          Auto
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold truncate" style={{ color: "#1a1a1a" }}>
                      {c.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#888" }}>
                      {typeLabel(c.campaign_type)} · {channelLabel(c.channel)}
                      {c.audience_segment && ` · ${c.audience_segment}`}
                    </p>
                    {c.body_template && (
                      <p
                        className="text-xs mt-1 truncate max-w-md"
                        style={{ color: "#aaa" }}
                      >
                        {c.body_template}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-6 flex-shrink-0">
                    <div className="hidden md:flex gap-6">
                      <StatCell label="Dest." value={c.recipients_count} />
                      <StatCell label="Livrate" value={c.delivered_count} />
                      <StatCell label="Deschise" value={c.opened_count} />
                      <StatCell label="Click" value={c.clicked_count} />
                    </div>

                    <div className="text-xs text-right" style={{ color: "#aaa" }}>
                      <div>{c.sent_at ? `Trimis ${fmtDate(c.sent_at)}` : `Creat ${fmtDate(c.created_at)}`}</div>
                      {c.scheduled_at && !c.sent_at && (
                        <div style={{ color: "#1d4ed8" }}>→ {fmtDate(c.scheduled_at)}</div>
                      )}
                    </div>

                    {(c.status === "draft" || c.status === "scheduled") && (
                      <button
                        onClick={() => triggerSend(c)}
                        disabled={sendingId === c.id}
                        className="px-3 h-8 rounded-[6px] text-xs font-semibold text-white disabled:opacity-60"
                        style={{ background: "#B8962E" }}
                      >
                        {sendingId === c.id ? "…" : "Trimite"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
