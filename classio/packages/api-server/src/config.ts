const API_PORT = parseInt(process.env.API_PORT || '3000', 10);
const RUNTIME_URL = process.env.RUNTIME_URL || 'http://localhost:3001';
const DB_PATH = process.env.DB_PATH || 'deployments.db';
const BASE_DOMAIN = process.env.BASE_DOMAIN || 'localhost:3001';

export const config = {
    port: API_PORT,
    runtimeUrl: RUNTIME_URL,
    dbPath: DB_PATH,
    baseDomain: BASE_DOMAIN,
};
