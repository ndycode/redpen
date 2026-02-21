import fs from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { registerHook } from './dispatcher.js';
import { normalizePluginDefinition } from './sdk.js';
import type {
    HookEvent,
    HookHandler,
    HookRegistrationMetadata,
    LoadedPlugin,
    PluginDefinition,
    PluginFactoryInput,
    PluginLifecycleContext,
    PluginLoadError,
    PluginLoaderOptions,
    PluginLoaderResult,
} from '../types/index.js';

const SUPPORTED_EXTENSIONS = new Set(['.js', '.mjs', '.cjs']);
const activePlugins = new Map<string, LoadedPlugin>();

function hooksDirectory(cwd: string): string {
    return path.join(cwd, '.redpen', 'hooks');
}

function shouldLoad(fileName: string): boolean {
    return SUPPORTED_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function registerPluginHandlers(definition: PluginDefinition): Array<() => void> {
    const disposers: Array<() => void> = [];
    for (const [event, handlers] of Object.entries(definition.hooks) as Array<[HookEvent, HookHandler[] | undefined]>) {
        if (!handlers) continue;
        for (const handler of handlers) {
            const metadata: HookRegistrationMetadata = {
                pluginId: definition.id,
                pluginName: definition.name ?? definition.id,
            };
            disposers.push(registerHook(event, handler, metadata));
        }
    }
    return disposers;
}

async function importPluginModule(filePath: string): Promise<PluginFactoryInput | PluginDefinition | null> {
    const url = `${pathToFileURL(filePath).href}?v=${Date.now()}`;
    const mod = await import(url);
    const candidate = (mod?.default ?? null) as PluginFactoryInput | PluginDefinition | null;
    if (!candidate || typeof candidate !== 'object') {
        return null;
    }
    return candidate;
}

export async function loadPlugins(options: PluginLoaderOptions = {}): Promise<PluginLoaderResult> {
    await shutdownPlugins();

    const cwd = options.cwd ?? process.cwd();
    const dir = hooksDirectory(cwd);
    if (!fs.existsSync(dir)) {
        return { loaded: 0, skipped: 0, errors: [] };
    }

    const entries = await readdir(dir).catch(() => [] as string[]);
    const files = entries.filter(shouldLoad).sort((a, b) => a.localeCompare(b));
    const errors: PluginLoadError[] = [];
    let loaded = 0;
    let skipped = 0;

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await stat(filePath).catch(() => null);
        if (!stats || !stats.isFile()) continue;

        try {
            const raw = await importPluginModule(filePath);
            if (!raw) {
                errors.push({ file, reason: 'missing default plugin export' });
                continue;
            }

            const definition = normalizePluginDefinition(raw);
            if (definition.enabled === false) {
                skipped++;
                continue;
            }

            const lifecycleContext: PluginLifecycleContext = { cwd, filePath };
            await Promise.resolve(definition.setup?.(lifecycleContext));

            const disposers = registerPluginHandlers(definition);
            activePlugins.set(filePath, { definition, filePath, disposers });
            loaded++;
        } catch (error) {
            errors.push({ file, reason: error instanceof Error ? error.message : String(error) });
        }
    }

    return { loaded, skipped, errors };
}

export async function shutdownPlugins(): Promise<void> {
    const plugins = Array.from(activePlugins.values());
    activePlugins.clear();

    for (const plugin of plugins) {
        for (const dispose of plugin.disposers) {
            try {
                dispose();
            } catch (error) {
                console.warn('[redpen:hooks] Failed to remove handler', error);
            }
        }

        if (typeof plugin.definition.teardown === 'function') {
            try {
                await Promise.resolve(plugin.definition.teardown());
            } catch (error) {
                console.warn(`[redpen:hooks] Failed to teardown plugin ${plugin.definition.id}`, error);
            }
        }
    }
}

export function getLoadedPlugins(): LoadedPlugin[] {
    return Array.from(activePlugins.values());
}
