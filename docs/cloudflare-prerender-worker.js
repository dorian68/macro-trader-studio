// ============================================================
// Cloudflare Worker — Bot Prerendering via prerender.io
// ============================================================
// Deploy this as a Cloudflare Worker on your domain.
// It intercepts requests from search engine bots and social
// media crawlers, fetching a pre-rendered HTML version from
// prerender.io instead of serving the React SPA shell.
//
// Human visitors are unaffected and get the normal SPA.
// ============================================================

const BOT_AGENTS = [
  'googlebot',
  'bingbot',
  'yandex',
  'baiduspider',
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'whatsapp',
  'slackbot',
  'telegrambot',
  'applebot',
  'duckduckbot',
  'seznambot',
  'ia_archiver',
  'semrushbot',
  'ahrefsbot',
  'mj12bot',
  'petalbot',
  'dotbot',
];

// File extensions that should never be prerendered
const IGNORED_EXTENSIONS = /\.(js|css|xml|less|png|jpg|jpeg|gif|pdf|doc|txt|ico|svg|webp|woff|woff2|ttf|eot|mp4|webm|json|map)$/i;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const userAgent = (request.headers.get('User-Agent') || '').toLowerCase();
    const pathname = url.pathname;

    // Skip prerendering for static assets
    if (IGNORED_EXTENSIONS.test(pathname)) {
      return fetch(request);
    }

    // Check if the request is from a bot
    const isBot = BOT_AGENTS.some(bot => userAgent.includes(bot));

    if (!isBot) {
      // Human visitor — pass through to origin (Lovable)
      return fetch(request);
    }

    // Bot detected — fetch pre-rendered HTML from prerender.io
    // Replace YOUR_PRERENDER_TOKEN with your actual token
    const prerenderToken = env.PRERENDER_TOKEN || 'YOUR_PRERENDER_TOKEN';
    const prerenderUrl = `https://service.prerender.io/${url.toString()}`;

    try {
      const prerenderResponse = await fetch(prerenderUrl, {
        headers: {
          'X-Prerender-Token': prerenderToken,
          'User-Agent': request.headers.get('User-Agent') || '',
        },
        redirect: 'follow',
      });

      // If prerender.io fails, fall back to origin
      if (!prerenderResponse.ok && prerenderResponse.status !== 304) {
        console.log(`Prerender failed (${prerenderResponse.status}), falling back to origin`);
        return fetch(request);
      }

      // Return pre-rendered HTML with appropriate headers
      const html = await prerenderResponse.text();
      return new Response(html, {
        status: prerenderResponse.status,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Prerendered': 'true',
          'Cache-Control': 'public, max-age=86400', // Cache 24h
        },
      });
    } catch (err) {
      console.error('Prerender error:', err);
      return fetch(request);
    }
  },
};
