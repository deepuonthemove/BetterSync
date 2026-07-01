import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  // Suppresses source map uploading logs during bundling
  silent: true,

  // Route browser requests through Vercel serverless to bypass client-side adblockers
  tunnelRoute: "/monitoring",
});
