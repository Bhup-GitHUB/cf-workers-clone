# test-express

Sample Express backend for Classio one-shot deploy.

## Install

```bash
bun install
```

## Deploy

From this directory:

```bash
bun run ../packages/cli/src/index.ts deploy -s test-express
```

Then call the deployed app:

```bash
curl -i http://test-express.localhost:3001/
curl -i http://test-express.localhost:3001/api/users
```

## Notes

- Classio auto-detects this project as Express because `express` is in dependencies.
- Routes, query strings, JSON body parsing, and cookies are forwarded through the runtime bridge.
