import "dotenv/config";
import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const migrations = [
  "001_init_schema.sql",
  "002_add_indexes.sql",
];

async function runMigration(pool: Pool, fileName: string) {
  const migrationPath = join(__dirname, "../../../infrastructure/migrations", fileName);
  const sql = readFileSync(migrationPath, "utf-8");

  console.log(`\nApplying migration: ${fileName}`);
  try {
    await pool.query(sql);
    console.log(`Migration ${fileName} applied successfully`);
  } catch (error) {
    console.error(`Migration ${fileName} failed:`, error);
    throw error;
  }
}

export async function migrate(connectionString?: string) {
  const url = connectionString ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required to run migrations");
  }

  const pool = new Pool({ connectionString: url });

  try {
    console.log("Starting database migrations...");
    for (const migration of migrations) {
      await runMigration(pool, migration);
    }
    console.log("\nAll migrations applied successfully");
  } finally {
    await pool.end();
  }
}

// Run migrations if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate().catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
}
