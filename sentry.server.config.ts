import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,

  // Track performance metrics for API routing and serverside processing
  tracesSampleRate: 1.0,

  // Enable verbose debug logs to trace connection issues
  debug: true,
});
