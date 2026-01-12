import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";

export async function getCountryByCode(code: string) {
  if (!isDatabaseConfigured) return null;

  const db = getDb();
  const upper = code.toUpperCase();

  const result = await db.execute(sql`
    SELECT iso_code, name
    FROM countries
    WHERE iso_code = ${upper}
    LIMIT 1
  `);

  const row = result[0] as { iso_code: string; name: string } | undefined;
  if (!row) return null;

  return { code: row.iso_code, name: row.name, slug: slugify(row.name) };
}

export async function getCountryBySlug(slug: string) {
  if (!isDatabaseConfigured) return null;

  const db = getDb();
  const normalized = slug.toLowerCase();

  const result = await db.execute(sql`
    SELECT iso_code, name
    FROM countries
    WHERE lower(replace(name, ' ', '-')) = ${normalized}
    LIMIT 1
  `);

  const row = result[0] as { iso_code: string; name: string } | undefined;
  if (!row) return null;

  return { code: row.iso_code, name: row.name, slug: slugify(row.name) };
}

export async function getTopCountries(limit = 20) {
  if (!isDatabaseConfigured) return [];

  const db = getDb();
  const result = await db.execute(sql`
    SELECT co.iso_code, co.name, COUNT(DISTINCT s.id) AS server_count
    FROM countries co
    JOIN cities c ON c.country_id = co.id
    JOIN servers s ON s.city_id = c.id AND s.is_active = true
    GROUP BY co.iso_code, co.name
    ORDER BY server_count DESC
    LIMIT ${limit}
  `);

  return (result as unknown as { iso_code: string; name: string }[]).map(
    (row) => ({
      code: row.iso_code,
      name: row.name,
      slug: slugify(row.name),
    }),
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
