import { describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { detectFramework, resolveEntrypoint } from '../src/detect-framework';
import { runNativeModuleCheck } from '../src/preflight';

describe('framework detection', () => {
    test('detects express from dependencies', () => {
        const dir = mkdtempSync(join(tmpdir(), 'classio-cli-express-'));
        try {
            writeFileSync(join(dir, 'package.json'), JSON.stringify({
                dependencies: { express: '^5.0.0' },
            }));
            writeFileSync(join(dir, 'index.ts'), 'export default () => new Response("ok")');

            expect(detectFramework(dir)).toBe('express');
            expect(resolveEntrypoint(dir)).toBe(join(dir, 'index.ts'));
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    test('fails when native dependencies are detected', () => {
        const dir = mkdtempSync(join(tmpdir(), 'classio-cli-native-'));
        try {
            writeFileSync(join(dir, 'package.json'), JSON.stringify({
                dependencies: { bcrypt: '^5.1.1' },
            }));
            mkdirSync(join(dir, 'node_modules', 'bcrypt'), { recursive: true });
            writeFileSync(join(dir, 'node_modules', 'bcrypt', 'binding.gyp'), 'dummy');

            expect(() => runNativeModuleCheck(dir)).toThrow(/Unsupported native dependencies/);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});
