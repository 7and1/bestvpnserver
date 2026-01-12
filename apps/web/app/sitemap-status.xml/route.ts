import { sql } from "drizzle-orm";

import { providers } from "@bestvpnserver/database";
import { getDb } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseConfigured) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
      { headers: { "Content-Type": "application/xml" } },
    );
  }

  const providerRows = await getDb()
    .select({ slug: providers.slug, updatedAt: providers.updatedAt })
    .from(providers)
    .where(sql`${providers.isActive} = true`);

  const lastUpdate = new Date().toISOString();

  const urls = providerRows.map((provider) => ({
    loc: `/status/${provider.slug}`,
    lastmod: provider.updatedAt
      ? new Date(provider.updatedAt).toISOString()
      : lastUpdate,
    changefreq: "hourly",
    priority: 0.5,
  }));

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
