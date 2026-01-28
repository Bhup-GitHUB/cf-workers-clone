/**
 * Detect if handler is an Express app by checking for Express-specific properties
 */
export function isExpressApp(handler: unknown): boolean {
  if (typeof handler !== 'function') return false;

  const app = handler as any;

  // Express apps have these characteristics:
  // 1. They are functions
  // 2. They have router methods: .get(), .post(), .use(), etc.
  // 3. They have ._router or .router property
  // 4. They have .handle() method

  return (
    typeof app.get === 'function' &&
    typeof app.post === 'function' &&
    typeof app.use === 'function' &&
    (app._router !== undefined || typeof app.handle === 'function')
  );
}

// Mock Request - convert Fetch Request to Express-compatible req
interface MockRequest {
  method: string;
  url: string;
  path: string;
  query: Record<string, string>;
  params: Record<string, string>;
  headers: Record<string, string>;
  body: any;
  protocol: string;
  hostname: string;
  originalUrl: string;
  cookies: Record<string, string>;
  get(name: string): string | undefined;
  header(name: string): string | undefined;
}

// Mock Response - capture Express response calls
interface MockResponse {
  statusCode: number;
  _headers: Map<string, string>;
  _body: any[];
  _ended: boolean;
  _endPromise: Promise<void>;
  _resolveEnd: () => void;

  status(code: number): MockResponse;
  json(data: any): MockResponse;
  send(data: any): MockResponse;
  set(field: string, value: string): MockResponse;
  setHeader(field: string, value: string): MockResponse;
  header(field: string, value: string): MockResponse;
  get(field: string): string | undefined;
  redirect(statusOrUrl: number | string, url?: string): void;
  type(type: string): MockResponse;
  end(data?: any): MockResponse;
  write(chunk: any): boolean;
}

async function createMockRequest(fetchRequest: Request): Promise<MockRequest> {
  const url = new URL(fetchRequest.url);
  const headers: Record<string, string> = {};

  fetchRequest.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  // Parse body based on content type
  let body: any = null;
  const contentType = fetchRequest.headers.get('content-type') || '';

  if (fetchRequest.method !== 'GET' && fetchRequest.method !== 'HEAD') {
    try {
      if (contentType.includes('application/json')) {
        body = await fetchRequest.json();
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const text = await fetchRequest.text();
        body = Object.fromEntries(new URLSearchParams(text));
      } else {
        body = await fetchRequest.text();
      }
    } catch {
      body = null;
    }
  }

  // Parse cookies
  const cookies: Record<string, string> = {};
  const cookieHeader = fetchRequest.headers.get('cookie');
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, ...rest] = cookie.trim().split('=');
      if (name) cookies[name] = rest.join('=');
    });
  }

  // Parse query string
  const query: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  return {
    method: fetchRequest.method,
    url: url.pathname + url.search,
    path: url.pathname,
    query,
    params: {},
    headers,
    body,
    protocol: url.protocol.replace(':', ''),
    hostname: url.hostname,
    originalUrl: url.pathname + url.search,
    cookies,
    get(name: string) { return headers[name.toLowerCase()]; },
    header(name: string) { return this.get(name); },
  };
}

function createMockResponse(): MockResponse {
  let resolveEnd: () => void;
  const endPromise = new Promise<void>((resolve) => {
    resolveEnd = resolve;
  });

  const res: MockResponse = {
    statusCode: 200,
    _headers: new Map(),
    _body: [],
    _ended: false,
    _endPromise: endPromise,
    _resolveEnd: resolveEnd!,

    status(code: number) {
      this.statusCode = code;
      return this;
    },

    set(field: string, value: string) {
      this._headers.set(field.toLowerCase(), value);
      return this;
    },

    setHeader(field: string, value: string) { return this.set(field, value); },
    header(field: string, value: string) { return this.set(field, value); },
    get(field: string) { return this._headers.get(field.toLowerCase()); },

    json(data: any) {
      if (this._ended) return this;
      this._headers.set('content-type', 'application/json; charset=utf-8');
      this._body.push(JSON.stringify(data));
      return this.end();
    },

    send(data: any) {
      if (this._ended) return this;
      if (typeof data === 'object' && data !== null) {
        return this.json(data);
      }
      if (!this._headers.has('content-type')) {
        this._headers.set('content-type', 'text/html; charset=utf-8');
      }
      this._body.push(String(data));
      return this.end();
    },

    redirect(statusOrUrl: number | string, url?: string) {
      if (typeof statusOrUrl === 'string') {
        this.statusCode = 302;
        this._headers.set('location', statusOrUrl);
      } else {
        this.statusCode = statusOrUrl;
        this._headers.set('location', url!);
      }
      this.end();
    },

    type(type: string) {
      const mimeTypes: Record<string, string> = {
        'html': 'text/html',
        'json': 'application/json',
        'text': 'text/plain',
      };
      this._headers.set('content-type', mimeTypes[type] || type);
      return this;
    },

    end(data?: any) {
      if (this._ended) return this;
      if (data !== undefined) this._body.push(data);
      this._ended = true;
      this._resolveEnd();
      return this;
    },

    write(chunk: any) {
      if (this._ended) return false;
      this._body.push(chunk);
      return true;
    },
  };

  return res;
}

function toFetchResponse(mockRes: MockResponse): Response {
  const headers = new Headers();
  mockRes._headers.forEach((value, key) => headers.set(key, value));

  const body = mockRes._body.length > 0
    ? mockRes._body.map(c => String(c)).join('')
    : null;

  return new Response(body, {
    status: mockRes.statusCode,
    headers,
  });
}

export async function executeExpressApp(
  app: any,
  fetchRequest: Request,
  timeout: number = 30000
): Promise<Response> {
  const mockReq = await createMockRequest(fetchRequest);
  const mockRes = createMockResponse();

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Express handler timeout')), timeout);
  });

  try {
    // Express apps can be called directly as (req, res, next)
    app(mockReq, mockRes, () => {
      if (!mockRes._ended) {
        mockRes.status(404).send('Not Found');
      }
    });

    await Promise.race([mockRes._endPromise, timeoutPromise]);
    return toFetchResponse(mockRes);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(`Express error: ${message}`, { status: 500 });
  }
}
