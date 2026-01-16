#!/usr/bin/env bun

import { parseArgs } from 'util';
import path from 'path';
import { deploy } from './deploy';

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    subdomain: { type: 'string', short: 's' },
    username: { type: 'string', short: 'u', default: 'classio' },
    help: { type: 'boolean', short: 'h' },
  },
  allowPositionals: true,
});

function printUsage(): void {
  console.log('Usage: classio <command> [options]');
  console.log('');
  console.log('Commands:');
  console.log('  deploy    Deploy current project');
  console.log('');
  console.log('Options:');
  console.log('  -s, --subdomain   Subdomain to deploy to');
  console.log('  -u, --username    Username (default: classio)');
  console.log('  -h, --help        Show help');
}

async function main(): Promise<void> {
  const command = positionals[0];

  if (values.help || !command) {
    printUsage();
    return;
  }

  if (command === 'deploy') {
    const subdomain = values.subdomain || path.basename(process.cwd());
    const username = values.username || 'classio';

    await deploy({ subdomain, username });
  } else {
    console.error(`Unknown command: ${command}`);
    printUsage();
    process.exit(1);
  }
}

main();
