import type {
    HookEmitError,
    HookEmitResult,
    HookEvent,
    HookEventContext,
    HookHandler,
    HookPayload,
    HookRegistrationMetadata,
} from '../types/index.js';

const registry = new Map<HookEvent, Set<HookHandler>>();
let metadata = new WeakMap<HookHandler, HookRegistrationMetadata>();

function clonePayload(payload: Record<string, unknown>): HookPayload {
    return Object.freeze({ ...payload });
}

function buildContext<T extends HookEvent>(event: T, payload: Record<string, unknown>): HookEventContext<T> {
    return {
        event,
        timestamp: new Date().toISOString(),
        data: clonePayload(payload),
    };
}

function asError(value: unknown): Error {
    if (value instanceof Error) {
        return value;
    }
    return new Error(String(value));
}

export function registerHook(
    event: HookEvent,
    handler: HookHandler,
    details: HookRegistrationMetadata = {}
): () => void {
    const handlers = registry.get(event) ?? new Set<HookHandler>();
    handlers.add(handler);
    registry.set(event, handlers);
    metadata.set(handler, details);
    return () => removeHook(event, handler);
}

export function removeHook(event: HookEvent, handler: HookHandler): void {
    const handlers = registry.get(event);
    if (!handlers) return;
    handlers.delete(handler);
    metadata.delete(handler);
    if (handlers.size === 0) {
        registry.delete(event);
    }
}

export function resetHooks(): void {
    registry.clear();
    metadata = new WeakMap<HookHandler, HookRegistrationMetadata>();
}

export async function emit(event: HookEvent, payload: Record<string, unknown> = {}): Promise<HookEmitResult> {
    const handlers = registry.get(event);
    if (!handlers || handlers.size === 0) {
        return { event, invoked: 0, errors: [], durationMs: 0 };
    }

    const context = buildContext(event, payload);
    const errors: HookEmitError[] = [];
    const allHandlers = Array.from(handlers);
    const start = Date.now();

    for (const handler of allHandlers) {
        try {
            await Promise.resolve(handler(context));
        } catch (error) {
            const info = metadata.get(handler);
            errors.push({
                event,
                handler,
                error: asError(error),
                pluginId: info?.pluginId,
                pluginName: info?.pluginName,
            });
        }
    }

    return {
        event,
        invoked: allHandlers.length,
        errors,
        durationMs: Date.now() - start,
    };
}
