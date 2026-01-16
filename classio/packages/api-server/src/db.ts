import { Database } from 'bun:sqlite';
import { config } from './config';

interface DeploymentRow {
    id: number;
    username: string;
    subdomain: string;
    code: string;
    created_at: string;
}

const db = new Database(config.dbPath);

db.run(`
  CREATE TABLE IF NOT EXISTS deployments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    code TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export function saveDeployment(username: string, subdomain: string, code: string): void {
    db.run(
        'INSERT OR REPLACE INTO deployments (username, subdomain, code) VALUES (?, ?, ?)',
        [username, subdomain, code]
    );
}

export function getDeploymentCode(subdomain: string): string | null {
    const row = db.query('SELECT code FROM deployments WHERE subdomain = ?')
        .get(subdomain) as Pick<DeploymentRow, 'code'> | null;

    return row?.code ?? null;
}
