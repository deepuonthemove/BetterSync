import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

async function getSpotifyProfile(token: string) {
  try {
    const res = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      return {
        name: data.display_name || data.id,
        avatar: data.images?.[0]?.url || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=80&h=80&q=80"
      };
    }
  } catch (e) {
    console.error("Failed fetching Spotify profile:", e);
  }
  return null;
}

async function getGoogleProfile(token: string) {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      return {
        name: data.name || data.email,
        avatar: data.picture || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80"
      };
    }
  } catch (e) {
    console.error("Failed fetching Google profile:", e);
  }
  return null;
}

export async function GET() {
  try {
    // Await headers as required by Next.js 16
    const activeHeaders = await headers();
    const session = await auth.api.getSession({
      headers: activeHeaders,
    });

    if (!session) {
      return NextResponse.json({ providers: [], profiles: {} });
    }

    const userId = session.user.id;
    let rows: { providerId: string; accessToken: string }[] = [];

    if (process.env.DATABASE_URL) {
      // Connect to Supabase PostgreSQL - loaded dynamically
      const { Pool } = require("pg");
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
      });
      const res = await pool.query('SELECT "providerId", "accessToken" FROM account WHERE "userId" = $1', [userId]);
      rows = res.rows;
      await pool.end();
    } else {
      // Connect to local SQLite fallback database - loaded dynamically
      if (process.env.VERCEL === "1") {
        return NextResponse.json({ providers: [], profiles: {}, error: "Missing DATABASE_URL" }, { status: 500 });
      }
      const Database = require("better-sqlite3");
      const db = new Database("sqlite.db");
      try {
        const stmt = db.prepare("SELECT providerId, accessToken FROM account WHERE userId = ?");
        rows = stmt.all(userId) as { providerId: string; accessToken: string }[];
      } catch (e) {
        // Table account might not exist if Better Auth has not initialized yet
        rows = [];
      }
      db.close();
    }

    const providers: string[] = [];
    const profiles: Record<string, { name: string; avatar: string }> = {};

    for (const row of rows) {
      providers.push(row.providerId);
      if (row.providerId === "spotify") {
        const profile = await getSpotifyProfile(row.accessToken);
        if (profile) {
          profiles.spotify = profile;
        }
      } else if (row.providerId === "google") {
        const profile = await getGoogleProfile(row.accessToken);
        if (profile) {
          profiles.google = profile;
        }
      }
    }

    return NextResponse.json({ providers, profiles });
  } catch (err: any) {
    console.error("Failed to fetch connected providers:", err);
    return NextResponse.json({ providers: [], profiles: {}, error: err.message }, { status: 500 });
  }
}
