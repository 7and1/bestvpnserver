import "dotenv/config";
import { sql } from "drizzle-orm";

import { closeDb, getDb } from "@/lib/db";

async function run() {
  const db = getDb();

  await db.execute(sql`SELECT create_next_partition()`);
  await db.execute(sql`CALL rollup_performance_logs()`);
  await db.execute(
    sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_server_latest_performance`,
  );
  await db.execute(
    sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_server_daily_stats`,
  );

  console.log("Maintenance complete: partitions, rollups, materialized views.");
}

run()
  .then(async () => {
    await closeDb();
  })
  .catch(async (error) => {
    console.error("Maintenance failed:", error);
    await closeDb();
    process.exit(1);
  });
