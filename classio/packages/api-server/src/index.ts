import { Database } from 'bun:sqlite';

const db = new Database('deployments.db');

db.run(`
  CREATE TABLE IF NOT EXISTS deployments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    code TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/deploy' && req.method === 'POST') {
      const { username, subdomain, code } = await req.json();
      
      try {
        db.run(
          'INSERT OR REPLACE INTO deployments (username, subdomain, code) VALUES (?, ?, ?)',
          [username, subdomain, code]
        );

        await fetch('http://localhost:3001/invalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subdomain }),
        });

        return Response.json({ 
          success: true, 
          url: `http://${subdomain}.localhost:3001` 
        });
      } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
      }
    }

    if (url.pathname.startsWith('/code/')) {
      const subdomain = url.pathname.split('/')[2];
      const row: any = db.query('SELECT code FROM deployments WHERE subdomain = ?').get(subdomain);
      
      if (!row) {
        return new Response('Not found', { status: 404 });
      }
      
      return new Response(row.code, {
        headers: { 'Content-Type': 'application/javascript' },
      });
    }

    return new Response('API Server Running', { status: 200 });
  },
});

console.log(`API Server running on http://localhost:${server.port}`);
