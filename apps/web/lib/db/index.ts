import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as schema from "@bestvpnserver/database";

let sql: postgres.Sql | null = null;
let db: PostgresJsDatabase<typeof schema> | null = null;

export function getDb(): PostgresJsDatabase<typeof schema> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!sql) {
    sql = postgres(process.env.DATABASE_URL, {
      max: Number(process.env.DB_POOL_MAX ?? "5"),
    });
  }

  if (!db) {
    db = drizzle(sql, { schema });
  }

  return db;
}

export async function closeDb() {
  if (sql) {
    await sql.end({ timeout: 5 });
    sql = null;
    db = null;
  }
}
