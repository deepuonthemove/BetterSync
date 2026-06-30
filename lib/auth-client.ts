import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Dynamically resolve base URL on the client to query your active Vercel domain instead of localhost:3000
  baseURL: typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});
