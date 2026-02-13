import type { DeploymentMetadata } from '../../shared/src';

const codeCache = new Map<string, string>();
const metadataCache = new Map<string, DeploymentMetadata>();

export function getCode(subdomain: string): string | undefined {
    return codeCache.get(subdomain);
}

export function setCode(subdomain: string, code: string): void {
    codeCache.set(subdomain, code);
}

export function getMetadata(subdomain: string): DeploymentMetadata | undefined {
    return metadataCache.get(subdomain);
}

export function setMetadata(metadata: DeploymentMetadata): void {
    metadataCache.set(metadata.subdomain, metadata);
    codeCache.set(metadata.subdomain, metadata.code);
}

export function invalidate(subdomain: string): void {
    codeCache.delete(subdomain);
    metadataCache.delete(subdomain);
}
