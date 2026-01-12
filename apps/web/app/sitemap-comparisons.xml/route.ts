import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { USE_CASES } from "@/lib/pseo/use-cases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PROVIDERS = 12;

export async function GET() {
  if (!isDatabaseConfigured) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
      { headers: { "Content-Type": "application/xml" } },
    );
  }

  const rows = await getDb().execute(sql`
    SELECT p.slug, COUNT(DISTINCT s.id) AS server_count
    FROM providers p
    JOIN servers s ON s.provider_id = p.id AND s.is_active = true
    WHERE p.is_active = true
    GROUP BY p.id
    ORDER BY server_count DESC
    LIMIT ${MAX_PROVIDERS}
  `);

  const providers = (rows as unknown as { slug: string }[]).map(
    (row) => row.slug,
  );
  const lastUpdate = new Date().toISOString();

  const urls: {
    loc: string;
    lastmod: string;
    changefreq: string;
    priority: number;
  }[] = [];

  for (let i = 0; i < providers.length; i += 1) {
    for (let j = i + 1; j < providers.length; j += 1) {
      const left = providers[i];
      const right = providers[j];
      urls.push({
        loc: `/${left}-vs-${right}`,
        lastmod: lastUpdate,
        changefreq: "daily",
        priority: 0.6,
      });

      for (const useCase of USE_CASES) {
        urls.push({
          loc: `/${left}-vs-${right}-${useCase.slug}`,
          lastmod: lastUpdate,
          changefreq: "daily",
          priority: 0.5,
        });
      }
    }
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
