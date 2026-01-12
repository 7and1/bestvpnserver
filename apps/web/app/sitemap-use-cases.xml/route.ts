import { getTopCountries } from "@/lib/data/locations";
import { USE_CASES } from "@/lib/pseo/use-cases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const lastUpdate = new Date().toISOString();
  const countries = await getTopCountries(30);

  const urls: {
    loc: string;
    lastmod: string;
    changefreq: string;
    priority: number;
  }[] = [];

  for (const useCase of USE_CASES) {
    urls.push({
      loc: `/best-vpn-for-${useCase.slug}`,
      lastmod: lastUpdate,
      changefreq: "daily",
      priority: 0.7,
    });

    for (const country of countries) {
      urls.push({
        loc: `/best-vpn-for-${useCase.slug}-in-${country.slug}`,
        lastmod: lastUpdate,
        changefreq: "daily",
        priority: 0.6,
      });
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
