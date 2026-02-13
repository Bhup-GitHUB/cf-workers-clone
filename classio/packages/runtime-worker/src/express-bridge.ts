import { createServer } from 'node:http';

interface ExpressInstance {
    port: number;
    close: () => Promise<void>;
}

const REQUEST_HEADER_ALLOWLIST = new Set([
    'authorization',
    'cookie',
    'content-type',
    'accept',
    'user-agent',
]);

export async function startExpressInstance(app: unknown): Promise<ExpressInstance> {
    if (typeof app !== 'function') {
        throw new Error('Express app export is not callable');
    }

    const server = createServer((req, res) => {
        try {
            (app as (req: unknown, res: unknown, next: (err?: Error) => void) => void)(req, res, (err?: Error) => {
                if (!res.headersSent) {
                    if (err) {
                        res.statusCode = 500;
                        res.end(err.message || 'Express app error');
                        return;
                    }
                    res.statusCode = 404;
                    res.end('Not Found');
                }
            });
        } catch (err) {
            if (!res.headersSent) {
                res.statusCode = 500;
                res.end(err instanceof Error ? err.message : 'Express app error');
            }
        }
    });

    let selectedPort: number | null = null;
    for (let attempts = 0; attempts < 10 && selectedPort === null; attempts += 1) {
        const port = 20000 + Math.floor(Math.random() * 30000);
        const started = await new Promise<boolean>((resolve, reject) => {
            const onError = (err: Error & { code?: string }) => {
                server.off('error', onError);
                if (err.code === 'EADDRINUSE') {
                    resolve(false);
                    return;
                }
                reject(err);
            };

            server.once('error', onError);
            server.listen(port, '127.0.0.1', () => {
                server.off('error', onError);
                resolve(true);
            });
        });

        if (started) {
            selectedPort = port;
        }
    }

    if (selectedPort === null) {
        server.close();
        throw new Error('Failed to allocate port for Express instance');
    }

    const address = server.address();
    if (!address || typeof address === 'string') {
        server.close();
        throw new Error('Failed to determine Express instance port');
    }

    return {
        port: address.port,
        close: () =>
            new Promise<void>((resolve, reject) => {
                server.close((err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                });
            }),
    };
}

function buildForwardHeaders(request: Request): Headers {
    const forward = new Headers();
    request.headers.forEach((value, key) => {
        const lower = key.toLowerCase();
        if (REQUEST_HEADER_ALLOWLIST.has(lower) || lower.startsWith('x-forwarded-')) {
            forward.set(key, value);
        }
    });

    const host = request.headers.get('host') ?? '';
    const ip = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for') ?? '';
    const proto = new URL(request.url).protocol.replace(':', '');

    if (ip) {
        forward.set('x-forwarded-for', ip);
    }
    if (host) {
        forward.set('x-forwarded-host', host);
    }
    forward.set('x-forwarded-proto', proto);

    return forward;
}

function copyResponseHeaders(source: Headers, target: Headers): void {
    source.forEach((value, key) => {
        target.append(key, value);
    });

    const getSetCookie = (source as unknown as { getSetCookie?: () => string[] }).getSetCookie;
    if (typeof getSetCookie === 'function') {
        const cookies = getSetCookie.call(source);
        if (Array.isArray(cookies)) {
            target.delete('set-cookie');
            for (const cookie of cookies) {
                target.append('set-cookie', cookie);
            }
        }
    }
}

export async function proxyToExpressInstance(
    port: number,
    request: Request,
    timeoutMs: number
): Promise<Response> {
    const url = new URL(request.url);
    const targetUrl = `http://127.0.0.1:${port}${url.pathname}${url.search}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort('Express request timeout'), timeoutMs);

    try {
        const headers = buildForwardHeaders(request);
        const method = request.method.toUpperCase();
        const init: RequestInit & { duplex?: 'half' } = {
            method,
            headers,
            signal: controller.signal,
        };

        if (method !== 'GET' && method !== 'HEAD') {
            init.body = request.body;
            init.duplex = 'half';
        }

        const proxied = await fetch(targetUrl, init);
        const responseHeaders = new Headers();
        copyResponseHeaders(proxied.headers, responseHeaders);

        return new Response(proxied.body, {
            status: proxied.status,
            headers: responseHeaders,
        });
    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            return new Response('Express handler timeout', { status: 504 });
        }
        const message = err instanceof Error ? err.message : 'Unknown proxy error';
        return new Response(`Express bridge error: ${message}`, { status: 502 });
    } finally {
        clearTimeout(timeout);
    }
}
