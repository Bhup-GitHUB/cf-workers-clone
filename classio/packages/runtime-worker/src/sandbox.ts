import { config } from './config';
import { isExpressApp, executeExpressApp } from './express-adapter';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

type RequestHandler = (request: Request) => Promise<Response> | Response;

export async function execute(code: string, request: Request): Promise<Response> {
    const tempFile = join(tmpdir(), `classio-${randomUUID()}.js`);

    try {
        await writeFile(tempFile, code);

        const module = await import(tempFile);
        const userHandler = module.default || module.handler || module.app;

        if (!userHandler) {
            throw new Error('No handler exported. Export a default function, handler, or app.');
        }

        if (typeof userHandler !== 'function') {
            throw new Error(`Handler is not a function. Got: ${typeof userHandler}`);
        }

        if (isExpressApp(userHandler)) {
            return await executeExpressApp(userHandler, request, config.sandboxTimeout);
        }

        const result = await (userHandler as RequestHandler)(request);

        if (!(result instanceof Response)) {
            throw new Error('Handler must return a Response object');
        }

        return result;
    } catch (err) {
        if (err instanceof Error) {
            throw err;
        }
        throw new Error(`Unknown error during execution: ${String(err)}`);
    } finally {
        try {
            await unlink(tempFile);
        } catch {
        }
    }
}
