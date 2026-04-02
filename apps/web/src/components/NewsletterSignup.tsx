"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

interface Props {
  /** Optional heading override */
  heading?: string;
  /** Optional sub-copy override */
  description?: string;
}

/**
 * NewsletterSignup — inline subscribe CTA for the free membership tier.
 *
 * If the user is not signed in, redirect to login first.
 * If already a member (any tier), show a confirmation message.
 * Otherwise POST /api/v1/membership/subscribe with tier=free.
 */
export function NewsletterSignup({
  heading = "Abonează-te la newsletter",
  description = "Primește noutăți despre expoziții, evenimente culturale și povești din comunitate.",
}: Props) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "already" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubscribe() {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.push("/login?redirect_url=/membership");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      const token = await getToken({ template: "default" });
      const res = await fetch(`${API_URL}/api/v1/membership/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tier: "free" }),
      });

      if (res.status === 409) {
        // Already a member
        setStatus("already");
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err?.detail ?? "A apărut o eroare. Încearcă din nou.");
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setErrorMsg("Conexiune eșuată. Încearcă din nou.");
      setStatus("error");
    }
  }

  if (status === "success" || status === "already") {
    return (
      <div style={{
        background: "var(--color-primary)", color: "#fff",
        borderRadius: 20, padding: "40px 48px",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>
          {status === "already" ? "Ești deja abonat!" : "Bun venit în comunitate!"}
        </h3>
        <p style={{ fontSize: 15, opacity: 0.85, margin: 0 }}>
          {status === "already"
            ? "Vei primi în continuare noutățile noastre."
            : "Vei primi newsletterul cultural LMBSC la adresa ta de email."}
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: "linear-gradient(135deg, var(--color-primary) 0%, #1a2e1c 100%)",
      color: "#fff",
      borderRadius: 20,
      padding: "48px 48px",
      textAlign: "center",
    }}>
      <div style={{
        display: "inline-block",
        background: "rgba(184,150,46,0.2)",
        color: "var(--color-accent-light)",
        borderRadius: 20, padding: "4px 16px",
        fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase",
        marginBottom: 16,
      }}>
        Newsletter
      </div>
      <h3 style={{
        fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700,
        margin: "0 0 12px", lineHeight: 1.2,
      }}>
        {heading}
      </h3>
      <p style={{ fontSize: 15, opacity: 0.8, maxWidth: 440, margin: "0 auto 28px", lineHeight: 1.6 }}>
        {description}
      </p>

      {status === "error" && (
        <div style={{
          background: "rgba(220,38,38,0.2)", color: "#FCA5A5",
          borderRadius: 10, padding: "10px 16px",
          fontSize: 13, marginBottom: 16, maxWidth: 360, margin: "0 auto 16px",
        }}>
          {errorMsg}
        </div>
      )}

      <button
        onClick={handleSubscribe}
        disabled={status === "loading" || !isLoaded}
        style={{
          background: "var(--color-accent)", color: "#fff",
          border: "none", borderRadius: 10,
          padding: "14px 32px",
          fontSize: 15, fontWeight: 700,
          cursor: status === "loading" ? "not-allowed" : "pointer",
          opacity: status === "loading" ? 0.7 : 1,
          boxShadow: "0 4px 16px rgba(184,150,46,0.4)",
        }}
      >
        {status === "loading"
          ? "Se procesează..."
          : isSignedIn
            ? "Abonează-te gratuit"
            : "Înscrie-te pentru newsletter →"}
      </button>
      <p style={{ fontSize: 12, opacity: 0.6, margin: "12px 0 0" }}>
        Gratuit · Fără spam · Anulezi oricând
      </p>
    </div>
  );
}
