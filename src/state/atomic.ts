import { readFile, writeFile, rename, mkdir, rm, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';

export async function atomicWriteJSON<T>(filePath: string, data: T): Promise<void> {
    const parent = dirname(filePath);
    await mkdir(parent, { recursive: true });

    const suffix = randomBytes(6).toString('hex');
    const tmpPath = `${filePath}.tmp.${process.pid}.${suffix}`;
    await writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');

    try {
        await rename(tmpPath, filePath);
    } catch (err) {
        const e = err as NodeJS.ErrnoException;
        try {
            await rm(tmpPath, { force: true });
        } catch {
            /* ignore */
        }
        throw e;
    }
}

export async function atomicReadJSON<T>(filePath: string, fallback: T): Promise<T> {
    try {
        const raw = await readFile(filePath, 'utf8');
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

export interface LockHandle {
    release: () => Promise<void>;
}

export interface FileLockOptions {
    staleMs?: number;
}

export async function fileLock(lockPath: string, options?: FileLockOptions): Promise<LockHandle> {
    const staleMs = options?.staleMs ?? 30_000;

    for (;;) {
        try {
            await mkdir(lockPath, { recursive: false });
            await writeFile(
                `${lockPath}/info.json`,
                JSON.stringify({ pid: process.pid, timestamp: Date.now() }),
                'utf8'
            );
            break;
        } catch (err) {
            const e = err as NodeJS.ErrnoException;
            if (e.code !== 'EEXIST') throw e;

            let isStale = false;
            try {
                const s = await stat(lockPath);
                isStale = Date.now() - s.mtimeMs > staleMs;
            } catch {
                isStale = true;
            }

            if (isStale) {
                try {
                    await rm(lockPath, { recursive: true, force: true });
                } catch {
                    /* ignore */
                }
            } else {
                await new Promise<void>((resolve) => setTimeout(resolve, 50 + Math.random() * 50));
            }
        }
    }

    return {
        release: async (): Promise<void> => {
            try {
                await rm(lockPath, { recursive: true, force: true });
            } catch {
                /* ignore */
            }
        },
    };
}

export async function withLock<T>(lockPath: string, fn: () => Promise<T>): Promise<T> {
    const lock = await fileLock(lockPath);
    try {
        return await fn();
    } finally {
        await lock.release();
    }
}
