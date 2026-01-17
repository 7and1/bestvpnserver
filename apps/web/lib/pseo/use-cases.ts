export type UseCase = {
  slug: string;
  label: string;
  title: string;
  description: string;
  keywords: string[];
  icon: string;
  primaryMetric: "speed" | "latency" | "privacy" | "streaming";
  streamingSlug?: string;
};

export const USE_CASES: UseCase[] = [
  {
    slug: "netflix",
    label: "Netflix",
    title: "Best VPN for Netflix - Stream Any Library with Zero Buffering",
    description:
      "Stream Netflix libraries reliably with low buffering and consistent speeds.",
    keywords: [
      "vpn for netflix",
      "netflix vpn",
      "watch us netflix abroad",
      "netflix unblock",
      "best vpn for streaming",
    ],
    icon: "Play",
    primaryMetric: "streaming",
    streamingSlug: "netflix-us",
  },
  {
    slug: "streaming",
    label: "Streaming",
    title: "Best VPN for Streaming - Unlock All Platforms in 4K",
    description:
      "Optimize for fast throughput and unlock major streaming platforms.",
    keywords: [
      "vpn for streaming",
      "streaming vpn",
      "best vpn for streaming services",
      "unblock streaming",
      "4k streaming vpn",
    ],
    icon: "Cast",
    primaryMetric: "streaming",
  },
  {
    slug: "gaming",
    label: "Gaming",
    title: "Best VPN for Gaming - Lowest Latency for Competitive Play",
    description:
      "Prioritize low latency and consistent ping for competitive gaming.",
    keywords: [
      "vpn for gaming",
      "gaming vpn",
      "low ping vpn",
      "vpn for competitive gaming",
      "reduce lag vpn",
    ],
    icon: "Gamepad2",
    primaryMetric: "latency",
  },
  {
    slug: "torrenting",
    label: "Torrenting",
    title: "Best VPN for Torrenting - Fast P2P Downloads with Privacy",
    description:
      "Focus on stable connections and high sustained download speeds.",
    keywords: [
      "vpn for torrenting",
      "torrenting vpn",
      "p2p vpn",
      "best vpn for downloading",
      "anonymous torrenting",
    ],
    icon: "Download",
    primaryMetric: "speed",
  },
  {
    slug: "privacy",
    label: "Privacy",
    title: "Best VPN for Privacy - No-Logs & Maximum Security",
    description:
      "Balanced performance with strong privacy posture and steady uptime.",
    keywords: [
      "vpn for privacy",
      "privacy vpn",
      "no logs vpn",
      "anonymous browsing",
      "secure vpn",
    ],
    icon: "ShieldCheck",
    primaryMetric: "privacy",
  },
  {
    slug: "travel",
    label: "Travel",
    title: "Best VPN for Travel - Stay Connected Globally",
    description:
      "Reliable connectivity across regions with strong global coverage.",
    keywords: [
      "vpn for travel",
      "travel vpn",
      "vpn abroad",
      "international vpn",
      "roaming vpn",
    ],
    icon: "Plane",
    primaryMetric: "speed",
  },
  {
    slug: "remote-work",
    label: "Remote Work",
    title: "Best VPN for Remote Work - Secure Home Office Connections",
    description:
      "Consistent performance for video calls, file sync, and collaboration.",
    keywords: [
      "vpn for remote work",
      "work from home vpn",
      "secure remote access",
      "office vpn",
      "corporate vpn alternative",
    ],
    icon: "Laptop",
    primaryMetric: "speed",
  },
  {
    slug: "sports",
    label: "Sports",
    title: "Best VPN for Sports - Live Games Without Blackouts",
    description:
      "Stable connections for live sports streaming and geo-unblocking.",
    keywords: [
      "vpn for sports",
      "sports streaming vpn",
      "watch live sports abroad",
      "nfl vpn",
      "premier league vpn",
    ],
    icon: " Trophy",
    primaryMetric: "streaming",
  },
  {
    slug: "china",
    label: "China",
    title: "Best VPN for China - Bypass the Great Firewall 翻墙",
    description:
      "Reliable VPNs that work in China with obfuscation technology to bypass the Great Firewall and access blocked services.",
    keywords: [
      "vpn for china",
      "china vpn",
      "great firewall bypass",
      "翻墙 vpn",
      "vpn that works in china",
      "china internet access",
    ],
    icon: "Globe",
    primaryMetric: "privacy",
  },
  {
    slug: "cheap",
    label: "Cheap",
    title: "Best Cheap VPN - Affordable VPNs That Don't Compromise Quality",
    description:
      "Budget-friendly VPN providers offering strong security, decent speeds, and essential features at competitive prices.",
    keywords: [
      "cheap vpn",
      "affordable vpn",
      "budget vpn",
      "best vpn deals",
      "low cost vpn",
      "vpn under $5",
      "discount vpn",
    ],
    icon: "DollarSign",
    primaryMetric: "speed",
  },
  {
    slug: "fast",
    label: "Fast",
    title: "Fastest VPN Services - Blazing Speeds for 4K Streaming",
    description:
      "High-performance VPNs with the fastest download speeds, minimal speed loss, and optimized servers for bandwidth-intensive tasks.",
    keywords: [
      "fastest vpn",
      "high speed vpn",
      "vpn speed test",
      "no speed loss vpn",
      "gigabit vpn",
      "fast vpn download",
    ],
    icon: "Zap",
    primaryMetric: "speed",
  },
  {
    slug: "dedicated-ip",
    label: "Dedicated IP",
    title: "Best VPN with Dedicated IP - Static IP Address Service",
    description:
      "VPN providers offering dedicated IP addresses for consistent access, reduced CAPTCHAs, and running private servers.",
    keywords: [
      "dedicated ip vpn",
      "static ip vpn",
      "vpn with dedicated ip",
      "private ip address",
      "fixed ip vpn service",
    ],
    icon: "Fingerprint",
    primaryMetric: "privacy",
  },
  {
    slug: "port-forwarding",
    label: "Port Forwarding",
    title: "Best VPN with Port Forwarding - P2P & Gaming Enabled",
    description:
      "VPN services with port forwarding support for enhanced P2P performance, gaming, and running public services.",
    keywords: [
      "vpn port forwarding",
      "port forwarding vpn",
      "p2p port forwarding",
      "vpn with static port",
      "gaming port forwarding",
    ],
    icon: "Network",
    primaryMetric: "speed",
  },
];

export function getUseCase(slug: string) {
  return USE_CASES.find((item) => item.slug === slug) ?? null;
}
