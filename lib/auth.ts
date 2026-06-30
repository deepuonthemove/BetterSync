import { betterAuth } from "better-auth";

let databaseConfig: any;

if (process.env.DATABASE_URL) {
  // Use Supabase PostgreSQL - loaded dynamically to bypass Vercel binary errors
  const { Pool } = require("pg");
  const isSupabase = process.env.DATABASE_URL.includes("supabase.co");
  databaseConfig = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
  });
} else {
  // In production serverless Vercel deployments, local SQLite files cannot be written or persisted
  if (process.env.VERCEL === "1") {
    throw new Error(
      "Missing DATABASE_URL environment variable. Production hosting on Vercel requires a persistent " +
      "cloud database (e.g. Supabase PostgreSQL). Please configure your DATABASE_URL in your Vercel Project Settings."
    );
  }
  // Fallback to local SQLite database in the workspace - loaded dynamically
  const Database = require("better-sqlite3");
  databaseConfig = new Database("sqlite.db");
}

export const auth = betterAuth({
  database: databaseConfig,
  emailAndPassword: {
    enabled: true,
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "spotify"],
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "placeholder_google_id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder_google_secret",
      scope: ["https://www.googleapis.com/auth/youtube.readonly"],
    },
    spotify: {
      clientId: process.env.SPOTIFY_CLIENT_ID || "placeholder_spotify_id",
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "placeholder_spotify_secret",
      scope: ["playlist-modify-public", "playlist-modify-private", "user-read-private"],
    },
  },
});
