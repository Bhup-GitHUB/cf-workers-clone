const RUNTIME_PORT = parseInt(process.env.RUNTIME_PORT || '3001', 10);
const API_URL = process.env.API_URL || 'http://localhost:3000';
const SANDBOX_TIMEOUT = parseInt(process.env.SANDBOX_TIMEOUT || '5000', 10);

export const config = {
    port: RUNTIME_PORT,
    apiUrl: API_URL,
    sandboxTimeout: SANDBOX_TIMEOUT,
};
