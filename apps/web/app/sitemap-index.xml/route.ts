import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProviderRow = { slug: string; updated_at: Date | null };

export async function GET() {
  const providerRows: ProviderRow[] = isDatabaseConfigured
    ? await getDb().execute<ProviderRow>(
        sql`SELECT slug, updated_at FROM providers WHERE is_active = true`,
      )
    : [];

  const lastUpdate = new Date().toISOString();

  const sitemaps = [
    { loc: "/sitemap-core.xml", lastmod: lastUpdate },
    ...providerRows.map((p) => ({
      loc: `/sitemap-${p.slug}.xml`,
      lastmod: p.updated_at ? new Date(p.updated_at).toISOString() : lastUpdate,
    })),
    { loc: "/sitemap-status.xml", lastmod: lastUpdate },
    { loc: "/sitemap-use-cases.xml", lastmod: lastUpdate },
    { loc: "/sitemap-comparisons.xml", lastmod: lastUpdate },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
  .map(
    (s) => `  <sitemap>
    <loc>https://bestvpnserver.com${s.loc}</loc>
    <lastmod>${s.lastmod}</lastmod>
  </sitemap>`,
  )
  .join("\n")}
</sitemapindex>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
