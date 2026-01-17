/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  swcMinify: true,
  experimental: {
    optimizePackageImports: ['lucide-react', '@tanstack/react-table'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
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
