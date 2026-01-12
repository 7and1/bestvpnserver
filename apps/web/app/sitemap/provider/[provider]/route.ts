import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function GET(
  _request: Request,
  { params }: { params: { provider: string } },
) {
  const provider = params.provider.toLowerCase();
  if (!isDatabaseConfigured) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
      { headers: { "Content-Type": "application/xml" } },
    );
  }

  const db = getDb();

  const rows = await db.execute(sql`
    SELECT DISTINCT
      c.name AS city_name,
      co.iso_code AS country_code
    FROM servers s
    JOIN providers p ON s.provider_id = p.id
    JOIN cities c ON s.city_id = c.id
    JOIN countries co ON c.country_id = co.id
    WHERE s.is_active = true AND p.slug = ${provider}
  `);

  const lastUpdate = new Date().toISOString();
  const countrySet = new Set<string>();

  const urls = [
    {
      loc: `/servers/${provider}`,
      lastmod: lastUpdate,
      changefreq: "hourly",
      priority: 0.8,
    },
  ];

  for (const row of rows as unknown as {
    city_name: string;
    country_code: string;
  }[]) {
    const country = row.country_code.toLowerCase();
    const city = slugify(row.city_name);
    if (country && city) {
      urls.push({
        loc: `/servers/${provider}/${country}/${city}`,
        lastmod: lastUpdate,
        changefreq: "hourly",
        priority: 0.6,
      });
    }
    if (country) {
      countrySet.add(country);
    }
  }

  for (const country of countrySet) {
    urls.push({
      loc: `/servers/${provider}/${country}`,
      lastmod: lastUpdate,
      changefreq: "hourly",
      priority: 0.7,
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (page) => `  <url>
    <loc>https://bestvpnserver.com${page.loc}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority.toFixed(1)}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
