import type { MetadataRoute } from "next";

// basePath is /hospitality — all manifest URLs must be absolute from root
const BASE = "/hospitality";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "La Mița Biciclista",
    short_name: "La Mița",
    description: "Meniu, comenzi și profil — La Mița Biciclista, București",
    start_url: `${BASE}/menu`,
    scope: `${BASE}/`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#111111",
    theme_color: "#111111",
    icons: [
      {
        src: `${BASE}/icons/icon-192.svg`,
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: `${BASE}/icons/icon-512.svg`,
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
