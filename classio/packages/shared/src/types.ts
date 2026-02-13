export type AppFramework = 'fetch' | 'express';

export interface DeployRequest {
    username: string;
    subdomain: string;
    code: string;
    framework?: AppFramework;
    entrypoint?: string;
}

export interface DeployResponse {
    success: boolean;
    url?: string;
    framework?: AppFramework;
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

export interface DeploymentMetadata {
    subdomain: string;
    code: string;
    framework: AppFramework;
    updatedAt: string;
}
