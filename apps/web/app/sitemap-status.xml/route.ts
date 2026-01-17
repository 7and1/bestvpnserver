import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProviderRow = { slug: string; updated_at: Date | null };

export async function GET() {
  if (!isDatabaseConfigured) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
      { headers: { "Content-Type": "application/xml" } },
    );
  }

  const providerRows = await getDb().execute<ProviderRow>(
    sql`SELECT slug, updated_at FROM providers WHERE is_active = true`,
  );

  const lastUpdate = new Date().toISOString();

  const urls = providerRows.map((provider) => ({
    loc: `/status/${provider.slug}`,
    lastmod: provider.updated_at
      ? new Date(provider.updated_at).toISOString()
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
