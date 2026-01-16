import { build } from 'bun';
import path from 'path';
import fs from 'fs';
import { config } from './config';

interface DeployOptions {
    subdomain: string;
    username: string;
}

interface DeployResult {
    success: boolean;
    url?: string;
    error?: string;
}

export async function deploy(options: DeployOptions): Promise<void> {
    const projectPath = process.cwd();
    const entryFile = path.join(projectPath, 'index.ts');

    if (!fs.existsSync(entryFile)) {
        console.error('No index.ts found in current directory');
        process.exit(1);
    }

    console.log('Bundling project...');

    const buildResult = await build({
        entrypoints: [entryFile],
        outdir: path.join(projectPath, '.classio-build'),
        target: 'bun',
        minify: false,
    });

    if (!buildResult.success) {
        console.error('Build failed');
        process.exit(1);
    }

    const bundledFile = path.join(projectPath, '.classio-build', 'index.js');
    const code = await Bun.file(bundledFile).text();

    console.log(`Deploying to ${options.subdomain}...`);

    const response = await fetch(`${config.apiUrl}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: options.username,
            subdomain: options.subdomain,
            code,
        }),
    });

    const result: DeployResult = await response.json();

    if (result.success) {
        console.log('Deployed successfully');
        console.log(`URL: ${result.url}`);
    } else {
        console.error(`Deployment failed: ${result.error}`);
        process.exit(1);
    }
}
