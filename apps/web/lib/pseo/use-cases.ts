export type UseCase = {
  slug: string;
  label: string;
  description: string;
  primaryMetric: "speed" | "latency" | "privacy" | "streaming";
  streamingSlug?: string;
};

export const USE_CASES: UseCase[] = [
  {
    slug: "netflix",
    label: "Netflix",
    description:
      "Stream Netflix libraries reliably with low buffering and consistent speeds.",
    primaryMetric: "streaming",
    streamingSlug: "netflix-us",
  },
  {
    slug: "streaming",
    label: "Streaming",
    description:
      "Optimize for fast throughput and unlock major streaming platforms.",
    primaryMetric: "streaming",
  },
  {
    slug: "gaming",
    label: "Gaming",
    description:
      "Prioritize low latency and consistent ping for competitive gaming.",
    primaryMetric: "latency",
  },
  {
    slug: "torrenting",
    label: "Torrenting",
    description:
      "Focus on stable connections and high sustained download speeds.",
    primaryMetric: "speed",
  },
  {
    slug: "privacy",
    label: "Privacy",
    description:
      "Balanced performance with strong privacy posture and steady uptime.",
    primaryMetric: "privacy",
  },
  {
    slug: "travel",
    label: "Travel",
    description:
      "Reliable connectivity across regions with strong global coverage.",
    primaryMetric: "speed",
  },
  {
    slug: "remote-work",
    label: "Remote Work",
    description:
      "Consistent performance for video calls, file sync, and collaboration.",
    primaryMetric: "speed",
  },
  {
    slug: "sports",
    label: "Sports",
    description:
      "Stable connections for live sports streaming and geo-unblocking.",
    primaryMetric: "streaming",
  },
];

export function getUseCase(slug: string) {
  return USE_CASES.find((item) => item.slug === slug) ?? null;
}
