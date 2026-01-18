import { config } from './config';
import { handleDeploy, handleGetCode } from './handlers';

const server = Bun.serve({
  port: config.port,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/deploy' && req.method === 'POST') {
      return handleDeploy(req);
    }

    if (url.pathname === '/tls-check' && req.method === 'GET') {
      const domain = url.searchParams.get('domain');
      
      if (!domain || !domain.endsWith('.bhup-workers.space')) {
        return new Response('Denied', { status: 403 });
      }
      
      // Extract subdomain (e.g., "nndsdn" from "nndsdn.bhup-workers.space")
      const subdomain = domain.replace('.bhup-workers.space', '');
      
      // Don't allow 'api' subdomain (that's for the API server)
      if (subdomain === 'api') {
        return new Response('Denied', { status: 403 });
      }
      
      // TODO: Check if subdomain exists in your database (optional security)
      // For now, allow all non-api subdomains
      return new Response('OK', { status: 200 });
    }

    if (url.pathname.startsWith('/code/')) {
      const subdomain = url.pathname.split('/')[2];
      if (subdomain) {
        return handleGetCode(subdomain);
      }
      return new Response('Subdomain required', { status: 400 });
    }

    return new Response('Classio API Server', { status: 200 });
  },
});

console.log(`API server running on port ${server.port}`);
