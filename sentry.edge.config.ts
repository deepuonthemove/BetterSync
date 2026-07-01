import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,

  // Track performance metrics for Edge middleware execution
  tracesSampleRate: 1.0,

  // Suppress initialization debug logs
  debug: false,
});
