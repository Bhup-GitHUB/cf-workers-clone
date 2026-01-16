const cache = new Map<string, string>();

export function get(subdomain: string): string | undefined {
    return cache.get(subdomain);
}

export function set(subdomain: string, code: string): void {
    cache.set(subdomain, code);
}

export function invalidate(subdomain: string): void {
    cache.delete(subdomain);
}
