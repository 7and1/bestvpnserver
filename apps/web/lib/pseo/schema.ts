import { SITE_URL } from "@/lib/site";

export type BreadcrumbItem = {
  label: string;
  href: string;
};

export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: `${SITE_URL}${item.href}`,
    })),
  };
}

export function buildWebPageSchema({
  name,
  description,
  url,
}: {
  name: string;
  description: string;
  url: string;
}) {
  return {
    "@type": "WebPage",
    name,
    description,
    url: `${SITE_URL}${url}`,
  };
}

export function buildServiceSchema({
  providerName,
  areaName,
  url,
}: {
  providerName: string;
  areaName: string;
  url: string;
}) {
  return {
    "@type": "Service",
    name: `${providerName} VPN in ${areaName}`,
    provider: {
      "@type": "Organization",
      name: providerName,
    },
    serviceType: "VPN Service",
    areaServed: {
      "@type": "Place",
      name: areaName,
    },
    url: `${SITE_URL}${url}`,
  };
}

export function buildFAQSchema(items: { question: string; answer: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
