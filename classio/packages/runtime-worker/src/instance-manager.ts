import type { DeploymentMetadata } from '../../shared/src';
import { startExpressInstance } from './express-bridge';
import { isExpressApp } from './express-adapter';
import { loadUserHandler } from './sandbox';

interface InstanceOptions {
    maxInstances: number;
    idleMs: number;
}

interface ManagedInstance {
    subdomain: string;
    port: number;
    close: () => Promise<void>;
    lastUsedAt: number;
    idleTimer: ReturnType<typeof setTimeout>;
}

export class InstanceManager {
    private readonly instances = new Map<string, ManagedInstance>();
    private readonly pending = new Map<string, Promise<ManagedInstance>>();

    constructor(private readonly options: InstanceOptions) {}

    async getOrStart(subdomain: string, deployment: DeploymentMetadata): Promise<ManagedInstance> {
        const existing = this.instances.get(subdomain);
        if (existing) {
            this.touch(existing);
            return existing;
        }

        const existingPending = this.pending.get(subdomain);
        if (existingPending) {
            return existingPending;
        }

        const pending = this.start(subdomain, deployment);
        this.pending.set(subdomain, pending);
        try {
            const started = await pending;
            this.instances.set(subdomain, started);
            this.evictIfNeeded();
            return started;
        } finally {
            this.pending.delete(subdomain);
        }
    }

    async stop(subdomain: string): Promise<void> {
        const instance = this.instances.get(subdomain);
        if (!instance) {
            return;
        }

        clearTimeout(instance.idleTimer);
        this.instances.delete(subdomain);
        await instance.close();
    }

    async stopAll(): Promise<void> {
        await Promise.all(Array.from(this.instances.keys()).map((subdomain) => this.stop(subdomain)));
    }

    private async start(subdomain: string, deployment: DeploymentMetadata): Promise<ManagedInstance> {
        const exported = await loadUserHandler(deployment.code);
        if (!isExpressApp(exported)) {
            throw new Error(`Deployment ${subdomain} is not a valid Express app export`);
        }

        const instance = await startExpressInstance(exported);
        const managed: ManagedInstance = {
            subdomain,
            port: instance.port,
            close: instance.close,
            lastUsedAt: Date.now(),
            idleTimer: setTimeout(() => {
                void this.stop(subdomain);
            }, this.options.idleMs),
        };
        return managed;
    }

    private touch(instance: ManagedInstance): void {
        instance.lastUsedAt = Date.now();
        clearTimeout(instance.idleTimer);
        instance.idleTimer = setTimeout(() => {
            void this.stop(instance.subdomain);
        }, this.options.idleMs);
    }

    private evictIfNeeded(): void {
        if (this.instances.size <= this.options.maxInstances) {
            return;
        }

        const oldest = Array.from(this.instances.values())
            .sort((a, b) => a.lastUsedAt - b.lastUsedAt)[0];

        if (oldest) {
            void this.stop(oldest.subdomain);
        }
    }
}
