import { config } from './config';

type RequestHandler = (request: Request) => Promise<Response> | Response;

export async function execute(code: string, request: Request): Promise<Response> {
    try {
        // Remove ES module export statements to make code executable
        // Convert "export { x as default }" to just defining the variable
        let executableCode = code
            .replace(/export\s*\{[^}]*\};?\s*$/gm, '') // Remove export { ... }
            .replace(/export\s+default\s+/g, 'var __default_export = ') // Convert export default
            .replace(/export\s+/g, ''); // Remove other export keywords
        
        // Execute the code and extract the handler
        const userHandler = eval(`
            (function() {
                ${executableCode}
                
                // Try to find the exported handler in various forms
                return typeof __default_export !== 'undefined' ? __default_export :
                       typeof test_app_default !== 'undefined' ? test_app_default :
                       typeof handler !== 'undefined' ? handler : 
                       typeof app !== 'undefined' ? app : 
                       typeof default_export !== 'undefined' ? default_export :
                       null;
            })()
        `) as RequestHandler | null;

        if (!userHandler) {
            throw new Error('No handler exported. Export a default function, handler, or app.');
        }

        if (typeof userHandler !== 'function') {
            throw new Error(`Handler is not a function. Got: ${typeof userHandler}`);
        }

        const result = await userHandler(request);
        
        if (!(result instanceof Response)) {
            throw new Error('Handler must return a Response object');
        }

        return result;
    } catch (err) {
        // Re-throw with more detailed error information
        if (err instanceof Error) {
            throw err;
        }
        throw new Error(`Unknown error during execution: ${String(err)}`);
    }
}
