import { Database } from 'bun:sqlite';
import { config } from './config';
import type { AppFramework, DeploymentMetadata } from '../../shared/src';

interface DeploymentRow {
    id: number;
    username: string;
    subdomain: string;
    code: string;
    framework: AppFramework;
    updated_at: string;
    created_at: string;
}

const db = new Database(config.dbPath);

function hasColumn(column: string): boolean {
    const rows = db.query('PRAGMA table_info(deployments)').all() as Array<{ name: string }>;
    return rows.some((row) => row.name === column);
}

function runMigrations(): void {
    db.run(`
      CREATE TABLE IF NOT EXISTS deployments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        subdomain TEXT UNIQUE NOT NULL,
        code TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    if (!hasColumn('framework')) {
        db.run("ALTER TABLE deployments ADD COLUMN framework TEXT NOT NULL DEFAULT 'fetch'");
    }
    if (!hasColumn('updated_at')) {
        db.run('ALTER TABLE deployments ADD COLUMN updated_at DATETIME');
    }

    db.run('UPDATE deployments SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)');
}

runMigrations();

export function saveDeployment(
    username: string,
    subdomain: string,
    code: string,
    framework: AppFramework
): void {
    db.run(
        `
        INSERT INTO deployments (username, subdomain, code, framework, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(subdomain) DO UPDATE SET
          username = excluded.username,
          code = excluded.code,
          framework = excluded.framework,
          updated_at = CURRENT_TIMESTAMP
        `,
        [username, subdomain, code, framework]
    );
}

export function getDeploymentCode(subdomain: string): string | null {
    const row = db.query('SELECT code FROM deployments WHERE subdomain = ?')
        .get(subdomain) as Pick<DeploymentRow, 'code'> | null;

    return row?.code ?? null;
}

export function getDeploymentMetadata(subdomain: string): DeploymentMetadata | null {
    const row = db.query(`
      SELECT subdomain, code, framework, COALESCE(updated_at, created_at, CURRENT_TIMESTAMP) AS updated_at
      FROM deployments
      WHERE subdomain = ?
    `).get(subdomain) as Pick<DeploymentRow, 'subdomain' | 'code' | 'framework' | 'updated_at'> | null;

    if (!row) {
        return null;
    }

    return {
        subdomain: row.subdomain,
        code: row.code,
        framework: row.framework,
        updatedAt: row.updated_at,
    };
}

export function deploymentExists(subdomain: string): boolean {
    const row = db.query('SELECT 1 AS exists_flag FROM deployments WHERE subdomain = ? LIMIT 1')
        .get(subdomain) as { exists_flag: number } | null;
    return Boolean(row);
}
