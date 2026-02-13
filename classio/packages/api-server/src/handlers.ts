import { config } from './config';
import { saveDeployment, getDeploymentCode, getDeploymentMetadata } from './db';
import type { AppFramework, DeployRequest } from '../../shared/src';

const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/;
const RESERVED_SUBDOMAINS = new Set(['api', 'www', 'admin']);
const MAX_CODE_BYTES = 5 * 1024 * 1024;

export function isValidDeployRequest(body: unknown): body is DeployRequest {
    if (typeof body !== 'object' || body === null) {
        return false;
    }
    const req = body as DeployRequest;

    if (typeof req.username !== 'string' || req.username.trim().length === 0 || req.username.length > 64) {
        return false;
    }
    if (typeof req.subdomain !== 'string' || !SUBDOMAIN_PATTERN.test(req.subdomain)) {
        return false;
    }
    if (RESERVED_SUBDOMAINS.has(req.subdomain)) {
        return false;
    }
    if (typeof req.code !== 'string' || req.code.length === 0) {
        return false;
    }
    if (new TextEncoder().encode(req.code).byteLength > MAX_CODE_BYTES) {
        return false;
    }
    if (req.framework !== undefined && req.framework !== 'fetch' && req.framework !== 'express') {
        return false;
    }

    return true;
}

export async function handleDeploy(req: Request): Promise<Response> {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!isValidDeployRequest(body)) {
        return Response.json(
            { error: 'Invalid deployment payload' },
            { status: 400 }
        );
    }

    const { username, subdomain, code } = body;
    const framework: AppFramework = body.framework ?? 'fetch';

    try {
        saveDeployment(username, subdomain, code, framework);

        await fetch(`${config.runtimeUrl}/invalidate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subdomain }),
        });

        // Determine the protocol based on the base domain
        const protocol = config.baseDomain.includes('localhost') ? 'http' : 'https';
        
        return Response.json({
            success: true,
            url: `${protocol}://${subdomain}.${config.baseDomain}`,
            framework,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return Response.json({ error: message }, { status: 500 });
    }
}

export function handleGetCode(subdomain: string): Response {
    const code = getDeploymentCode(subdomain);

    if (!code) {
        return new Response('Not found', { status: 404 });
    }

    return new Response(code, {
        headers: { 'Content-Type': 'application/javascript' },
    });
}

export function handleGetDeployment(subdomain: string): Response {
    const metadata = getDeploymentMetadata(subdomain);

    if (!metadata) {
        return Response.json({ error: 'Not found' }, { status: 404 });
    }

    return Response.json(metadata);
}
