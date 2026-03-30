"use client";

import { useEffect } from "react";

export default function PwaLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/hospitality/sw.js", { scope: "/hospitality/" })
        .catch(() => {});
    }
  }, []);

  return (
    <div
      style={{
        maxWidth: 390,
        margin: "0 auto",
        minHeight: "100dvh",
        background: "#FBFAF3",
        fontFamily: "var(--font-manrope, Manrope, sans-serif)",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {children}
    </div>
  );
}
