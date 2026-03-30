import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "La Mița Biciclista",
    short_name: "La Mița",
    description: "Meniu, comenzi și profil — La Mița Biciclista, București",
    start_url: "/menu",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FBFAF3",
    theme_color: "#FBFAF3",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
