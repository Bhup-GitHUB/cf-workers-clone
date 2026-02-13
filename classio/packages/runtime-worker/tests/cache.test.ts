import { describe, expect, test } from 'bun:test';
import { getCode, getMetadata, invalidate, setMetadata } from '../src/cache';

describe('runtime cache', () => {
    test('stores and invalidates metadata/code together', () => {
        const metadata = {
            subdomain: 'demo-app',
            framework: 'express' as const,
            code: 'export default () => null',
            updatedAt: new Date().toISOString(),
        };

        setMetadata(metadata);
        expect(getMetadata('demo-app')?.framework).toBe('express');
        expect(getCode('demo-app')).toContain('export default');

        invalidate('demo-app');
        expect(getMetadata('demo-app')).toBeUndefined();
        expect(getCode('demo-app')).toBeUndefined();
    });
});
