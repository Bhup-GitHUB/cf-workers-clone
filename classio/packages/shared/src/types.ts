export interface DeployRequest {
    username: string;
    subdomain: string;
    code: string;
}

export interface DeployResponse {
    success: boolean;
    url?: string;
    error?: string;
}

export interface DeploymentRecord {
    id: number;
    username: string;
    subdomain: string;
    code: string;
    createdAt: string;
}

export interface InvalidateRequest {
    subdomain: string;
}
