import { HOOK_EVENTS } from '../types/index.js';
import type {
    HookEvent,
    HookHandler,
    HookHandlerMap,
    NormalizedHookMap,
    PluginDefinition,
    PluginFactoryInput,
} from '../types/index.js';

const EVENT_SET = new Set<HookEvent>(HOOK_EVENTS);

function toArray(handler: HookHandler | HookHandler[] | undefined): HookHandler[] {
    if (!handler) return [];
    return Array.isArray(handler) ? handler : [handler];
}

function normalizeHooks(hooks: HookHandlerMap | undefined): NormalizedHookMap {
    const normalized: NormalizedHookMap = {};
    if (!hooks) return normalized;

    for (const [event, handler] of Object.entries(hooks)) {
        if (!isHookEvent(event)) continue;
        const entries = toArray(handler).filter((fn): fn is HookHandler => typeof fn === 'function');
        if (entries.length > 0) {
            normalized[event] = entries;
        }
    }

    return normalized;
}

export function isHookEvent(value: string): value is HookEvent {
    return EVENT_SET.has(value as HookEvent);
}

export function normalizePluginDefinition(input: PluginFactoryInput | PluginDefinition): PluginDefinition {
    if (!input || typeof input !== 'object') {
        throw new Error('invalid plugin definition');
    }

    const id = typeof input.id === 'string' ? input.id.trim() : '';
    if (!id) {
        throw new Error('plugin id is required');
    }

    const { hooks, ...rest } = input as PluginFactoryInput;

    const definition: PluginDefinition = {
        ...rest,
        id,
        name: input.name ?? id,
        enabled: input.enabled ?? true,
        hooks: normalizeHooks(hooks),
    };

    return definition;
}

export function definePlugin(config: PluginFactoryInput): PluginDefinition {
    return normalizePluginDefinition(config);
}
