# Classio

A lightweight serverless function deployment platform inspired by Cloudflare Workers. Deploy JavaScript/TypeScript handlers to your own infrastructure with a simple CLI.

## Architecture

The platform consists of three main components:

- **API Server** - Handles deployment requests and stores code in SQLite
- **Runtime Worker** - Executes user code in isolated sandboxes  
- **CLI** - Bundles and deploys projects from the command line

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.0+

### Installation

```bash
bun install
```

### Running the Platform

Start both servers:

```bash
bun run dev
```

Or run them separately:

```bash
bun run dev:api      # API server on port 3000
bun run dev:runtime  # Runtime worker on port 3001
```

### Deploying an App

1. Create a project with an `index.ts` that exports a handler:

```typescript
const handler = async (req: Request): Promise<Response> => {
  return new Response('Hello from Classio!');
};

export default handler;
```

2. Deploy using the CLI:

```bash
cd your-project
bun run ../packages/cli/src/index.ts deploy -s myapp
```

3. Access your app at `http://myapp.localhost:3001`

### Deploying Express in One Shot

Classio auto-detects Express apps and deploys them without a framework flag.

```typescript
import express from 'express';

const app = express();
app.use(express.json());

app.post('/login', (_req, res) => {
  res.json({ token: 'demo-token' });
});

app.get('/protected', (req, res) => {
  if (!req.headers.authorization) {
    return res.status(401).json({ error: 'missing auth' });
  }
  return res.json({ ok: true });
});

export default app;
```

Deploy it:

```bash
bun run ../packages/cli/src/index.ts deploy -s my-auth-app
```

Entrypoint detection order:
1. `--entry`
2. `package.json` (`module` then `main`)
3. `src/index.ts`
4. `index.ts`

Framework detection:
- `express` in dependencies/devDependencies/peerDependencies => Express mode
- otherwise => fetch mode

### Compatibility Matrix

| Capability | Status |
|---|---|
| Fetch-style handlers | Supported |
| Express 4 backends | Supported |
| Express 5 backends | Supported |
| JWT/Bearer middleware flows | Supported |
| JSON + URL-encoded parsing | Supported |
| Cookie forwarding | Supported |
| Multi `Set-Cookie` pass-through | Supported |
| Native Node addons (`bcrypt`, `sharp`, etc.) | Not supported (blocked by preflight) |
| Platform-managed secrets/env store | Not supported in v1 |

### Redeploy and Invalidation

Redeploying to the same subdomain updates stored code and immediately invalidates runtime cache + warm Express instance.
The next request serves the latest deployment.

## Project Structure

```
classio/
├── packages/
│   ├── api-server/     # Deployment API
│   ├── cli/            # Command line tool
│   ├── runtime-worker/ # Code execution runtime
│   └── shared/         # Shared types and constants
├── fixtures/           # Express auth fixtures (v4 + v5)
├── test-app/           # Example application
└── infrastructure/     # Deployment configs (optional)
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `API_PORT` | `3000` | API server port |
| `RUNTIME_PORT` | `3001` | Runtime worker port |
| `CLASSIO_API_URL` | `http://localhost:3000` | API URL for CLI |
| `ENABLE_EXPRESS_BRIDGE` | `true` | Enables real HTTP bridge for Express apps |
| `INSTANCE_MAX` | `100` | Max warm Express instances |
| `INSTANCE_IDLE_MS` | `600000` | Idle shutdown timeout for warm Express instances |
| `EXPRESS_REQUEST_TIMEOUT_MS` | `30000` | Timeout for proxied Express requests |

## License

MIT
