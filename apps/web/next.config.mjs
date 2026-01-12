/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/sitemap-:provider.xml",
        destination: "/sitemap/provider/:provider",
      },
    ];
  },
};

export default nextConfig;
