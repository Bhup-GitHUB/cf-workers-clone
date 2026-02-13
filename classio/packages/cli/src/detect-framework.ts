import fs from 'fs';
import path from 'path';
import type { AppFramework } from '../../shared/src';

interface PackageJsonLike {
    main?: string;
    module?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
}

function readPackageJson(projectPath: string): PackageJsonLike | null {
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
        return null;
    }

    try {
        const raw = fs.readFileSync(packageJsonPath, 'utf8');
        return JSON.parse(raw) as PackageJsonLike;
    } catch {
        return null;
    }
}

export function resolveEntrypoint(projectPath: string, explicitEntry?: string): string {
    if (explicitEntry) {
        const explicitPath = path.resolve(projectPath, explicitEntry);
        if (fs.existsSync(explicitPath)) {
            return explicitPath;
        }
        throw new Error(`Entry file does not exist: ${explicitEntry}`);
    }

    const packageJson = readPackageJson(projectPath);
    const candidates = [
        packageJson?.module,
        packageJson?.main,
        'src/index.ts',
        'index.ts',
    ].filter((value): value is string => Boolean(value));

    for (const candidate of candidates) {
        const absoluteCandidate = path.resolve(projectPath, candidate);
        if (fs.existsSync(absoluteCandidate)) {
            return absoluteCandidate;
        }
    }

    throw new Error('No entrypoint found. Tried package.json module/main, src/index.ts, and index.ts.');
}

export function detectFramework(projectPath: string): AppFramework {
    const packageJson = readPackageJson(projectPath);
    if (!packageJson) {
        return 'fetch';
    }

    const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies,
    };

    return deps.express ? 'express' : 'fetch';
}
