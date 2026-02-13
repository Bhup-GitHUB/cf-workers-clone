import { build } from 'bun';
import path from 'path';
import { config } from './config';
import { detectFramework, resolveEntrypoint } from './detect-framework';
import { runNativeModuleCheck, validateEntrypointExport } from './preflight';
import type { AppFramework, DeployResponse } from '../../shared/src';

interface DeployOptions {
    subdomain: string;
    username: string;
    entry?: string;
}

interface BuildArtifact {
    code: string;
    bundledFile: string;
}

async function bundleProject(projectPath: string, entryFile: string): Promise<BuildArtifact> {
    const outputDir = path.join(projectPath, '.classio-build');
    const outputFile = path.join(outputDir, path.basename(entryFile).replace(/\.(ts|tsx|mts)$/, '.js'));

    console.log('Bundling project...');
    const buildResult = await build({
        entrypoints: [entryFile],
        outdir: outputDir,
        target: 'bun',
        minify: false,
    });

    if (!buildResult.success) {
        throw new Error('Build failed');
    }

    const code = await Bun.file(outputFile).text();
    return { code, bundledFile: outputFile };
}

export async function deploy(options: DeployOptions): Promise<void> {
    const projectPath = process.cwd();
    const entryFile = resolveEntrypoint(projectPath, options.entry);
    const framework: AppFramework = detectFramework(projectPath);

    console.log(`Detected entry: ${path.relative(projectPath, entryFile)}`);
    console.log(`Detected framework: ${framework}`);

    runNativeModuleCheck(projectPath);
    console.log('Preflight: native dependency check passed');

    const { code, bundledFile } = await bundleProject(projectPath, entryFile);
    await validateEntrypointExport(bundledFile, framework);
    console.log('Preflight: export compatibility check passed');

    console.log(`Deploying to ${options.subdomain}...`);

    const response = await fetch(`${config.apiUrl}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: options.username,
            subdomain: options.subdomain,
            code,
            framework,
            entrypoint: path.relative(projectPath, entryFile),
        }),
    });

    const result: DeployResponse = await response.json();

    if (result.success) {
        console.log('Deployed successfully');
        console.log(`URL: ${result.url}`);
        console.log(`Framework: ${result.framework ?? framework}`);
    } else {
        console.error(`Deployment failed: ${result.error}`);
        process.exit(1);
    }
}
