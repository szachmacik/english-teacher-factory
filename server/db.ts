import { eq } from "drizzle-orm";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: any | null = null;

function isMySQL(url: string): boolean {
  return url.startsWith("mysql://") || url.startsWith("mysql2://");
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const url = process.env.DATABASE_URL;
      if (isMySQL(url)) {
        const { drizzle } = await import("drizzle-orm/mysql2");
        _db = drizzle(url);
      } else {
        // Postgres / Supabase pooler
        const { drizzle } = await import("drizzle-orm/node-postgres");
        const { Pool } = await import("pg");
        const pool = new Pool({ connectionString: url });
        _db = drizzle(pool);
      }
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db
      .insert(users)
      .values(user)
      .onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
  } catch (error) {
    console.warn("[Database] upsertUser failed:", error);
  }
}

export async function getUserByOpenId(openId: string) {
  try {
    const db = await getDb();
    if (!db) return null;
    const result = await db.select().from(users).where(eq(users.openId, openId));
    return result[0] ?? null;
  } catch (error) {
    console.warn("[Database] getUserByOpenId failed:", error);
    return null;
  }
}
