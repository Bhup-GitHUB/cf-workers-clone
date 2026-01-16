import { config } from './config';
import { handleDeploy, handleGetCode } from './handlers';

const server = Bun.serve({
  port: config.port,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/deploy' && req.method === 'POST') {
      return handleDeploy(req);
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
