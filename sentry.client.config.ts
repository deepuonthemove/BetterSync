import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Track performance metrics for client load times
  tracesSampleRate: 1.0,

  // Replay integration for recording user sessions
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Enable verbose debug logs to trace connection issues
  debug: true,
});
