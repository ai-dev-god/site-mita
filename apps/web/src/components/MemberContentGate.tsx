"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

interface MembershipStatus {
  tier: string;
  status: string;
}

interface MemberContentGateProps {
  children: React.ReactNode;
}

/**
 * MemberContentGate — wraps member-only content with a blur overlay and
 * upgrade CTA for non-authenticated or non-member users.
 *
 * Active members see the full `children`. Everyone else sees a blurred
 * preview of the content followed by a prompt to join or sign in.
 */
export function MemberContentGate({ children }: MemberContentGateProps) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [membership, setMembership] = useState<MembershipStatus | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setChecking(false);
      return;
    }
    getToken({ template: "default" })
      .then(token =>
        fetch(`${API_URL}/api/v1/membership/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        setMembership(data);
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [isLoaded, isSignedIn, getToken]);

  // Still resolving auth/membership — render nothing to avoid layout flash
  if (!isLoaded || checking) return null;

  const isActiveMember = membership?.status === "active";

  // Active member — show full content
  if (isActiveMember) return <>{children}</>;

  // Non-member or unauthenticated — show blur gate
  return (
    <div>
      {/* Blurred content preview */}
      <div style={{ position: "relative", maxHeight: 260, overflow: "hidden" }}>
        {children}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 180,
            background:
              "linear-gradient(to bottom, transparent, var(--color-surface))",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Upgrade CTA */}
      <div
        style={{
          marginTop: 8,
          padding: "36px 40px",
          background: "var(--color-surface-raised)",
          border: "1px solid var(--color-border)",
          borderRadius: 12,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 12 }}>🔒</div>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 700,
            color: "var(--color-text)",
            margin: "0 0 10px",
          }}
        >
          Conținut exclusiv pentru membri
        </h3>
        <p
          style={{
            fontSize: 15,
            color: "var(--color-text-secondary)",
            margin: "0 0 24px",
            lineHeight: 1.6,
            maxWidth: 440,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {isSignedIn
            ? "Această poveste este disponibilă doar pentru membrii activi La Mița Biciclista. Alătură-te pentru acces complet."
            : "Această poveste este disponibilă doar pentru membrii La Mița Biciclista. Autentifică-te sau alătură-te pentru acces complet."}
        </p>
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {!isSignedIn && (
            <Link
              href="/login"
              style={{
                display: "inline-block",
                padding: "10px 24px",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--color-text-secondary)",
                background: "transparent",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              Autentifică-te
            </Link>
          )}
          <Link
            href="/membership"
            style={{
              display: "inline-block",
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 700,
              color: "#fff",
              background: "var(--color-primary)",
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            Devino membru →
          </Link>
        </div>
      </div>
    </div>
  );
}
