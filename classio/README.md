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

## Project Structure

```
classio/
├── packages/
│   ├── api-server/     # Deployment API
│   ├── cli/            # Command line tool
│   ├── runtime-worker/ # Code execution runtime
│   └── shared/         # Shared types and constants
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

## License

MIT
