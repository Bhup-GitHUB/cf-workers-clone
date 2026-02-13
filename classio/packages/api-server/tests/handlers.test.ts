import { describe, expect, test } from 'bun:test';
import { isValidDeployRequest } from '../src/handlers';

describe('deploy request validation', () => {
    test('accepts valid payload', () => {
        expect(isValidDeployRequest({
            username: 'user1',
            subdomain: 'my-app',
            code: 'export default () => new Response("ok")',
            framework: 'fetch',
        })).toBe(true);
    });

    test('rejects reserved subdomain', () => {
        expect(isValidDeployRequest({
            username: 'user1',
            subdomain: 'api',
            code: 'x',
        })).toBe(false);
    });

    test('rejects invalid framework', () => {
        expect(isValidDeployRequest({
            username: 'user1',
            subdomain: 'app1',
            code: 'x',
            framework: 'koa',
        })).toBe(false);
    });
});
