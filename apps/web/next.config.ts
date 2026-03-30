import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: "standalone",
  // Hospitality platform lives at /hospitality — app.lamitabiciclista.ro root is the static marketing site
  basePath: "/hospitality",
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://localhost:8001/api/v1/:path*",
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry build plugin options — only active when SENTRY_AUTH_TOKEN is set
  silent: true,
  disableLogger: true,
  // Disable source-map upload if no auth token is configured
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  autoInstrumentServerFunctions: true,
});
