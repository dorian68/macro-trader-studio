const SITE_URL = 'https://macro-trader-studio.lovable.app';
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
    target: `${SITE_URL}/dashboard?q={search_term_string}`,
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
    { '@type': 'SiteNavigationElement', name: 'Documentation', url: `${SITE_URL}/docs` },
    { '@type': 'SiteNavigationElement', name: 'About', url: `${SITE_URL}/about` },
    { '@type': 'SiteNavigationElement', name: 'Contact', url: `${SITE_URL}/contact` },
    { '@type': 'SiteNavigationElement', name: 'Help Center', url: `${SITE_URL}/help` },
    { '@type': 'SiteNavigationElement', name: 'API', url: `${SITE_URL}/api` },
  ],
};

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
