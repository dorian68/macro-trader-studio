const SITE_URL = 'https://alphalensai.com';
const SITE_NAME = 'AlphaLens';
const LOGO_URL = `${SITE_URL}/alphalens_logo_new.png`;

export const organizationSchema: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: LOGO_URL,
  description:
    'AI-powered financial research and trading intelligence platform delivering institutional-grade trade setups, macro commentary, and research reports.',
  sameAs: [
    'https://www.linkedin.com/company/alphalens-ai',
    'https://x.com/alphalens_ai',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'research@albaricg.com',
    contactType: 'customer support',
    availableLanguage: ['English', 'Spanish'],
  },
};

export const webSiteSchema: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/blog?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

export const siteNavigationSchema: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Site Navigation',
  itemListElement: [
    { '@type': 'SiteNavigationElement', name: 'Features', url: `${SITE_URL}/features` },
    { '@type': 'SiteNavigationElement', name: 'Pricing', url: `${SITE_URL}/pricing` },
    { '@type': 'SiteNavigationElement', name: 'Blog', url: `${SITE_URL}/blog` },
    { '@type': 'SiteNavigationElement', name: 'Documentation', url: `${SITE_URL}/docs` },
    { '@type': 'SiteNavigationElement', name: 'About', url: `${SITE_URL}/about` },
    { '@type': 'SiteNavigationElement', name: 'Contact', url: `${SITE_URL}/contact` },
    { '@type': 'SiteNavigationElement', name: 'Help Center', url: `${SITE_URL}/help` },
    { '@type': 'SiteNavigationElement', name: 'API', url: `${SITE_URL}/api` },
  ],
};

export function webPageSchema(
  name: string,
  path: string,
  description: string,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name,
    url: `${SITE_URL}${path}`,
    description,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
  };
}

export function breadcrumbList(
  pageName: string,
  pagePath: string,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: pageName,
        item: `${SITE_URL}${pagePath}`,
      },
    ],
  };
}

export interface ArticleSchemaInput {
  title: string;
  description: string;
  slug: string;
  author: string;
  publishedAt: string;
  modifiedAt: string;
  coverImage: string | null;
}

export function articleSchema(post: ArticleSchemaInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    author: {
      '@type': 'Person',
      name: post.author,
    },
    publisher: organizationSchema,
    datePublished: post.publishedAt,
    dateModified: post.modifiedAt,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/blog/${post.slug}`,
    },
    ...(post.coverImage ? { image: post.coverImage } : {}),
  };
}

export function faqSchema(
  items: { question: string; answer: string }[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}
