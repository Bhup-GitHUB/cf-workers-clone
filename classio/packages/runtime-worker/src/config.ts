const RUNTIME_PORT = parseInt(process.env.RUNTIME_PORT || '3001', 10);
const API_URL = process.env.API_URL || 'http://localhost:3000';
const SANDBOX_TIMEOUT = parseInt(process.env.SANDBOX_TIMEOUT || '5000', 10);
const ENABLE_EXPRESS_BRIDGE = process.env.ENABLE_EXPRESS_BRIDGE !== 'false';
const INSTANCE_MAX = parseInt(process.env.INSTANCE_MAX || '100', 10);
const INSTANCE_IDLE_MS = parseInt(process.env.INSTANCE_IDLE_MS || '600000', 10);
const EXPRESS_REQUEST_TIMEOUT_MS = parseInt(process.env.EXPRESS_REQUEST_TIMEOUT_MS || '30000', 10);

export const config = {
    port: RUNTIME_PORT,
    apiUrl: API_URL,
    sandboxTimeout: SANDBOX_TIMEOUT,
    enableExpressBridge: ENABLE_EXPRESS_BRIDGE,
    instanceMax: INSTANCE_MAX,
    instanceIdleMs: INSTANCE_IDLE_MS,
    expressRequestTimeoutMs: EXPRESS_REQUEST_TIMEOUT_MS,
};
