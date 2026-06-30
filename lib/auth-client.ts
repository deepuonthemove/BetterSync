import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // If running client-side, it automatically infers window.location.origin, 
  // but we can specify the fallback for server-side rendering environments.
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});
