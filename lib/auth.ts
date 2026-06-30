import { betterAuth } from "better-auth";
import { Pool } from "pg";
import Database from "better-sqlite3";

let databaseConfig: any;

const isSupabase = process.env.DATABASE_URL && process.env.DATABASE_URL.includes("supabase.co");

if (process.env.DATABASE_URL) {
  // Use Supabase PostgreSQL
  databaseConfig = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
  });
} else {
  // Fallback to local SQLite database in the workspace
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
