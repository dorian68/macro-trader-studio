import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/contexts/LanguageContext';

const SITE_URL = 'https://macro-trader-studio.lovable.app';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

interface SEOHeadProps {
  titleKey?: string;
  descriptionKey?: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export function SEOHead({
  titleKey = 'seo.defaultTitle',
  descriptionKey = 'seo.defaultDescription',
  canonicalPath,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  jsonLd,
}: SEOHeadProps) {
  const { t } = useTranslation('common');
  const { language } = useLanguage();

  const title = t(titleKey);
  const description = t(descriptionKey);
  const canonicalUrl = canonicalPath ? `${SITE_URL}${canonicalPath}` : undefined;

  const jsonLdScripts = jsonLd
    ? Array.isArray(jsonLd)
      ? jsonLd
      : [jsonLd]
    : [];

  return (
    <Helmet>
      <html lang={language} dir={language === 'fa' ? 'rtl' : 'ltr'} />
      <title>{title}</title>
      <meta name="description" content={description} />

      {/* Canonical */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* hreflang — all point to same URL since routes aren't language-prefixed */}
      <link rel="alternate" hrefLang="en" href={canonicalUrl || SITE_URL} />
      <link rel="alternate" hrefLang="es" href={canonicalUrl || SITE_URL} />
      <link rel="alternate" hrefLang="fa" href={canonicalUrl || SITE_URL} />
      <link rel="alternate" hrefLang="x-default" href={canonicalUrl || SITE_URL} />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:locale" content={language} />
      <meta property="og:site_name" content="alphaLens AI" />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD Structured Data */}
      {jsonLdScripts.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
