import type { Metadata, Viewport } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Providers } from "@/app/providers";
import { SITE_URL } from "@/lib/site";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ef" },
    { media: "(prefers-color-scheme: dark)", color: "#1e293b" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "BestVPNServer.com - Data-Driven VPN Monitoring",
    template: "%s | BestVPNServer.com",
  },
  description:
    "Data-driven VPN monitoring platform with real-time performance metrics, speed tests, and server rankings from global probe telemetry.",
  keywords: [
    "VPN",
    "VPN servers",
    "VPN speed test",
    "best VPN",
    "VPN performance",
    "VPN monitoring",
  ],
  authors: [{ name: "BestVPNServer" }],
  creator: "BestVPNServer",
  publisher: "BestVPNServer",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "BestVPNServer.com",
    title: "BestVPNServer.com - Data-Driven VPN Monitoring",
    description:
      "Real-time VPN server rankings powered by global probe telemetry. Find the fastest servers for streaming, gaming, and privacy.",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "BestVPNServer.com - VPN Performance Monitoring",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BestVPNServer.com - Data-Driven VPN Monitoring",
    description:
      "Real-time VPN server rankings powered by global probe telemetry.",
    images: ["/og-image.svg"],
  },
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "BestVPNServer.com",
  url: SITE_URL,
  logo: `${SITE_URL}/og-image.svg`,
  description:
    "Data-driven VPN monitoring platform with real-time performance metrics, speed tests, and server rankings from global probe telemetry.",
  sameAs: [
    "https://twitter.com/bestvpnserver",
    "https://github.com/bestvpnserver",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    url: `${SITE_URL}/contact`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${plexMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <Providers>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground"
          >
            Skip to main content
          </a>
          <Header />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
