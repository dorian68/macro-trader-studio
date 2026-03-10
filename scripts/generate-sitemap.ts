/**
 * Build-time sitemap generator.
 * Reads routes from src/seo/sitemapRoutes.ts and writes dist/sitemap.xml.
 * Called automatically by the Vite plugin after production builds.
 */
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

// Re-declare route data here to avoid ESM/TS import issues in the build script.
// Keep in sync with src/seo/sitemapRoutes.ts.
interface SitemapRoute {
  path: string;
  changefreq: string;
  priority: number;
}

const SITE_URL = 'https://macro-trader-studio.lovable.app';

const routes: SitemapRoute[] = [
  { path: '/', changefreq: 'weekly', priority: 1.0 },
  { path: '/features', changefreq: 'monthly', priority: 0.9 },
  { path: '/pricing', changefreq: 'monthly', priority: 0.9 },
  { path: '/product', changefreq: 'monthly', priority: 0.8 },
  { path: '/docs', changefreq: 'monthly', priority: 0.8 },
  { path: '/api', changefreq: 'monthly', priority: 0.7 },
  { path: '/about', changefreq: 'monthly', priority: 0.7 },
  { path: '/contact', changefreq: 'monthly', priority: 0.7 },
  { path: '/help', changefreq: 'monthly', priority: 0.6 },
  { path: '/auth', changefreq: 'monthly', priority: 0.5 },
  { path: '/coming-soon', changefreq: 'monthly', priority: 0.3 },
  { path: '/privacy', changefreq: 'yearly', priority: 0.3 },
  { path: '/terms', changefreq: 'yearly', priority: 0.3 },
];

export function generateSitemapXml(): string {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const urls = routes
    .map(
      (r) => `  <url>
    <loc>${SITE_URL}${r.path === '/' ? '' : r.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority.toFixed(1)}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function writeSitemap(outDir: string) {
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }
  const xml = generateSitemapXml();
  const dest = resolve(outDir, 'sitemap.xml');
  writeFileSync(dest, xml, 'utf-8');
  console.log(`✅ sitemap.xml generated at ${dest} (${routes.length} URLs)`);
}

// Allow direct execution: node scripts/generate-sitemap.ts dist
if (typeof process !== 'undefined' && process.argv[1]?.includes('generate-sitemap')) {
  const outDir = process.argv[2] || 'dist';
  writeSitemap(outDir);
}
