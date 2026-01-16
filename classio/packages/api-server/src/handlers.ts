import { config } from './config';
import { saveDeployment, getDeploymentCode } from './db';

interface DeployRequest {
    username: string;
    subdomain: string;
    code: string;
}

function isValidDeployRequest(body: unknown): body is DeployRequest {
    if (typeof body !== 'object' || body === null) {
        return false;
    }
    const req = body as Record<string, unknown>;
    return (
        typeof req.username === 'string' &&
        typeof req.subdomain === 'string' &&
        typeof req.code === 'string'
    );
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
            { error: 'Missing required fields: username, subdomain, code' },
            { status: 400 }
        );
    }

    const { username, subdomain, code } = body;

    try {
        saveDeployment(username, subdomain, code);

        await fetch(`${config.runtimeUrl}/invalidate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subdomain }),
        });

        return Response.json({
            success: true,
            url: `http://${subdomain}.localhost:${config.port + 1}`,
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
