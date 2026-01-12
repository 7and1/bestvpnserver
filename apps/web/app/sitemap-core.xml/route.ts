export async function GET() {
  const lastUpdate = new Date().toISOString();
  const pages = [
    { loc: "/", changefreq: "hourly", priority: 1.0 },
    { loc: "/servers", changefreq: "hourly", priority: 0.8 },
    { loc: "/tools", changefreq: "weekly", priority: 0.6 },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `  <url>
    <loc>https://bestvpnserver.com${page.loc}</loc>
    <lastmod>${lastUpdate}</lastmod>
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
