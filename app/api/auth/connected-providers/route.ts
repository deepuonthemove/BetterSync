import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    // Await headers as required by Next.js 16
    const activeHeaders = await headers();
    const session = await auth.api.getSession({
      headers: activeHeaders,
    });

    if (!session) {
      return NextResponse.json({ providers: [] });
    }

    const userId = session.user.id;
    let providers: string[] = [];

    if (process.env.DATABASE_URL) {
      // Connect to Supabase PostgreSQL - loaded dynamically
      const { Pool } = require("pg");
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
      });
      const res = await pool.query('SELECT provider FROM account WHERE "userId" = $1', [userId]);
      providers = res.rows.map((r: any) => r.provider);
      await pool.end();
    } else {
      // Connect to local SQLite fallback database - loaded dynamically
      const Database = require("better-sqlite3");
      const db = new Database("sqlite.db");
      try {
        const stmt = db.prepare("SELECT provider FROM account WHERE userId = ?");
        const rows = stmt.all(userId) as { provider: string }[];
        providers = rows.map((r) => r.provider);
      } catch (e) {
        // Table account might not exist if Better Auth has not initialized yet
        providers = [];
      }
      db.close();
    }

    return NextResponse.json({ providers });
  } catch (err: any) {
    console.error("Failed to fetch connected providers:", err);
    return NextResponse.json({ providers: [], error: err.message }, { status: 500 });
  }
}
