export function getSecureUpstream(urlEnvironmentVariable: string): {
  url: string;
  secret: string;
} {
  const rawUrl = Deno.env.get(urlEnvironmentVariable);
  const secret = Deno.env.get('ALPHALENS_BACKEND_SECRET');
  if (!rawUrl || !secret) {
    throw new Error(`${urlEnvironmentVariable} or ALPHALENS_BACKEND_SECRET is not configured`);
  }

  const url = new URL(rawUrl);
  if (url.protocol !== 'https:') {
    throw new Error(`${urlEnvironmentVariable} must use HTTPS`);
  }

  return { url: url.toString(), secret };
}
