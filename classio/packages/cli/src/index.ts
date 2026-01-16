#!/usr/bin/env bun

import { parseArgs } from 'util';
import { build } from 'bun';
import path from 'path';

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    subdomain: { type: 'string', short: 's' },
    username: { type: 'string', short: 'u', default: 'classio' },
  },
  allowPositionals: true,
});

const command = positionals[0];

if (command === 'deploy') {
  await deployApp();
} else {
  console.log('Usage: classio deploy [options]');
  console.log('Options:');
  console.log('  -s, --subdomain   Subdomain to deploy to');
  console.log('  -u, --username    Username (default: classio)');
}

async function deployApp() {
  const projectPath = process.cwd();
  const subdomain = values.subdomain || path.basename(projectPath);

  console.log(`Bundling project...`);

  const result = await build({
    entrypoints: [path.join(projectPath, 'index.ts')],
    outdir: path.join(projectPath, '.classio-build'),
    target: 'bun',
    minify: false,
  });

  if (!result.success) {
    console.error('Build failed');
    process.exit(1);
  }

  const bundledFile = path.join(projectPath, '.classio-build', 'index.js');
  const code = await Bun.file(bundledFile).text();

  console.log(`Deploying to ${subdomain}...`);

  const response = await fetch('http://localhost:3000/deploy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: values.username,
      subdomain,
      code,
    }),
  });

  const result_json = await response.json();

  if (result_json.success) {
    console.log(`Deployed successfully!`);
    console.log(`URL: ${result_json.url}`);
  } else {
    console.error(`Deployment failed: ${result_json.error}`);
  }
}
