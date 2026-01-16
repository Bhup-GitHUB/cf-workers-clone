import { config } from './config';
import * as cache from './cache';
import { execute } from './sandbox';

async function fetchCode(subdomain: string): Promise<string | null> {
  const response = await fetch(`${config.apiUrl}/code/${subdomain}`);
  if (!response.ok) {
    return null;
  }
  return response.text();
}

function extractSubdomain(host: string): string | null {
  const parts = host.split('.');
  if (parts.length < 2) {
    return null;
  }
  const subdomain = parts[0];
  if (subdomain === 'localhost' || subdomain.includes(':')) {
    return null;
  }
  return subdomain;
}

const server = Bun.serve({
  port: config.port,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/invalidate' && req.method === 'POST') {
      try {
        const body = await req.json() as { subdomain: string };
        cache.invalidate(body.subdomain);
        return Response.json({ success: true });
      } catch {
        return Response.json({ error: 'Invalid request' }, { status: 400 });
      }
    }

    const host = req.headers.get('host') || '';
    const subdomain = extractSubdomain(host);

    if (!subdomain) {
      return new Response('Subdomain required', { status: 400 });
    }

    let code = cache.get(subdomain);

    if (!code) {
      code = await fetchCode(subdomain) ?? undefined;
      if (!code) {
        return new Response(`App not found: ${subdomain}`, { status: 404 });
      }
      cache.set(subdomain, code);
    }

    try {
      return await execute(code, req);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const stack = err instanceof Error ? err.stack : '';
      console.error(`Execution error for ${subdomain}:`, message);
      if (stack) {
        console.error('Stack trace:', stack);
      }
      return new Response(`Execution error: ${message}`, { status: 500 });
    }
  },
});

console.log(`Runtime worker running on port ${server.port}`);
