import { config } from './config';
import * as cache from './cache';
import { execute } from './sandbox';
import { InstanceManager } from './instance-manager';
import { proxyToExpressInstance } from './express-bridge';
import type { DeploymentMetadata } from '../../shared/src';

const instanceManager = new InstanceManager({
  maxInstances: config.instanceMax,
  idleMs: config.instanceIdleMs,
});

async function fetchDeployment(subdomain: string): Promise<DeploymentMetadata | null> {
  const response = await fetch(`${config.apiUrl}/deployment/${subdomain}`);
  if (!response.ok) {
    return null;
  }
  return response.json() as Promise<DeploymentMetadata>;
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
  async fetch(req: Request) {
    const url = new URL(req.url);

    if (url.pathname === '/invalidate' && req.method === 'POST') {
      try {
        const body = await req.json() as { subdomain: string };
        cache.invalidate(body.subdomain);
        await instanceManager.stop(body.subdomain);
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

    let deployment = cache.getMetadata(subdomain);
    if (!deployment) {
      deployment = await fetchDeployment(subdomain) ?? undefined;
      if (!deployment) {
        return new Response(`App not found: ${subdomain}`, { status: 404 });
      }
      cache.setMetadata(deployment);
    }

    try {
      if (deployment.framework === 'express') {
        if (!config.enableExpressBridge) {
          return new Response('Express bridge is disabled', { status: 503 });
        }
        const instance = await instanceManager.getOrStart(subdomain, deployment);
        return await proxyToExpressInstance(instance.port, req, config.expressRequestTimeoutMs);
      }

      if (deployment.framework === 'fetch') {
        const code = cache.getCode(subdomain) ?? deployment.code;
        return await execute(code, req);
      }

      return new Response(`Unsupported framework: ${deployment.framework}`, { status: 500 });
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
