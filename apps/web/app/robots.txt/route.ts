export async function GET() {
  const body = `User-agent: *
Disallow: /*?*
Disallow: /api/
Disallow: /admin/
Disallow: /_next/

User-agent: AhrefsBot
Crawl-delay: 10

User-agent: SemrushBot
Crawl-delay: 10

Sitemap: https://bestvpnserver.com/sitemap-index.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
