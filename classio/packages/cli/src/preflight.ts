import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import type { AppFramework } from '../../shared/src';

const KNOWN_NATIVE_PACKAGES = new Set([
    'bcrypt',
    'sharp',
    'sqlite3',
    'better-sqlite3',
    'argon2',
    'canvas',
]);

interface PackageJsonLike {
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
        return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageJsonLike;
    } catch {
        return null;
    }
}

function detectNativeDependencies(projectPath: string): string[] {
    const packageJson = readPackageJson(projectPath);
    if (!packageJson) {
        return [];
    }

    const deps = Object.keys({
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies,
    });

    const found = new Set<string>();
    for (const dependency of deps) {
        if (KNOWN_NATIVE_PACKAGES.has(dependency)) {
            found.add(dependency);
            continue;
        }

        const depDir = path.join(projectPath, 'node_modules', dependency);
        if (!fs.existsSync(depDir)) {
            continue;
        }
        if (fs.existsSync(path.join(depDir, 'binding.gyp'))) {
            found.add(dependency);
            continue;
        }

        try {
            const files = fs.readdirSync(depDir);
            if (files.some((file) => file.endsWith('.node'))) {
                found.add(dependency);
            }
        } catch {
        }
    }

    return Array.from(found).sort();
}

export function runNativeModuleCheck(projectPath: string): void {
    const nativeDependencies = detectNativeDependencies(projectPath);
    if (nativeDependencies.length === 0) {
        return;
    }

    throw new Error(
        `Unsupported native dependencies detected: ${nativeDependencies.join(', ')}. ` +
        'Native Node addons are not supported in v1 deployment runtime.'
    );
}

export async function validateEntrypointExport(
    bundledFile: string,
    framework: AppFramework
): Promise<void> {
    const moduleUrl = `${pathToFileURL(bundledFile).href}?t=${Date.now()}`;
    const loaded = await import(moduleUrl);
    const exported = loaded.default ?? loaded.handler ?? loaded.app;

    if (typeof exported !== 'function') {
        throw new Error('Bundled module must export a callable default/handler/app.');
    }

    if (framework === 'express') {
        const app = exported as {
            get?: unknown;
            post?: unknown;
            use?: unknown;
            handle?: unknown;
        };
        const expressLike = typeof app.get === 'function' &&
            typeof app.post === 'function' &&
            typeof app.use === 'function' &&
            typeof app.handle === 'function';

        if (!expressLike) {
            throw new Error(
                'Framework was detected as express, but exported app does not look like an Express application.'
            );
        }
    }
}
