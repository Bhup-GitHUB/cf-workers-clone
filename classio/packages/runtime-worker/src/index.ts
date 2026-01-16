import { VM } from 'vm2';

const codeCache = new Map<string, string>();

const server = Bun.serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/invalidate' && req.method === 'POST') {
      const { subdomain } = await req.json();
      codeCache.delete(subdomain);
      return Response.json({ success: true });
    }

    const host = req.headers.get('host') || '';
    const subdomain = host.split('.')[0];

    if (!subdomain || subdomain === 'localhost:3001') {
      return new Response('Runtime Worker - Specify subdomain', { status: 400 });
    }

    try {
      let code = codeCache.get(subdomain);
      
      if (!code) {
        const response = await fetch(`http://localhost:3000/code/${subdomain}`);
        if (!response.ok) {
          return new Response(`App not found: ${subdomain}`, { status: 404 });
        }
        code = await response.text();
        codeCache.set(subdomain, code);
      }

      const result = await executeInSandbox(code, req);
      return result;

    } catch (error: any) {
      console.error(`Error executing ${subdomain}:`, error);
      return new Response(`Execution error: ${error.message}`, { status: 500 });
    }
  },
});

async function executeInSandbox(code: string, request: Request): Promise<Response> {
  const vm = new VM({
    timeout: 5000,
    sandbox: {
      console,
      fetch,
      Request,
      Response,
      URL,
    },
  });

  try {
    const userHandler = vm.run(`
      ${code}
      (typeof handler !== 'undefined' ? handler : (typeof app !== 'undefined' ? app : null))
    `);

    if (!userHandler) {
      throw new Error('No handler exported from user code');
    }

    return await userHandler(request);
  } catch (error: any) {
    throw new Error(`Sandbox execution failed: ${error.message}`);
  }
}

console.log(`Runtime Worker running on http://localhost:${server.port}`);
