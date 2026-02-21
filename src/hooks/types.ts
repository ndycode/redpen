export const HOOK_EVENTS = [
    'session:start',
    'session:end',
    'task:start',
    'task:complete',
    'task:fail',
    'prompt:run',
    'prompt:done',
    'team:start',
    'team:stop',
    'worker:spawn',
    'worker:exit',
] as const;

export type HookEvent = (typeof HOOK_EVENTS)[number];

export type HookPayload = Readonly<Record<string, unknown>>;

export interface HookEventContext<T extends HookEvent = HookEvent> {
    event: T;
    timestamp: string;
    data: HookPayload;
}

export type HookHandler<T extends HookEvent = HookEvent> = (context: HookEventContext<T>) => Promise<void> | void;

export type HookHandlerMap = Partial<Record<HookEvent, HookHandler | HookHandler[]>>;

export type NormalizedHookMap = Partial<Record<HookEvent, HookHandler[]>>;

export type HookDisposer = () => void;

export interface HookRegistrationMetadata {
    pluginId?: string;
    pluginName?: string;
}

export interface HookEmitError {
    event: HookEvent;
    handler: HookHandler;
    error: Error;
    pluginId?: string;
    pluginName?: string;
}

export interface HookEmitResult {
    event: HookEvent;
    invoked: number;
    errors: HookEmitError[];
    durationMs: number;
}

export interface PluginLifecycleContext {
    cwd: string;
    filePath: string;
}

export interface PluginFactoryInput {
    id: string;
    name?: string;
    version?: string;
    description?: string;
    enabled?: boolean;
    hooks?: HookHandlerMap;
    setup?: (context: PluginLifecycleContext) => Promise<void> | void;
    teardown?: () => Promise<void> | void;
}

export interface PluginDefinition extends Omit<PluginFactoryInput, 'hooks'> {
    hooks: NormalizedHookMap;
}

export interface PluginModule {
    default?: PluginFactoryInput | PluginDefinition;
}

export interface LoadedPlugin {
    definition: PluginDefinition;
    filePath: string;
    disposers: Array<() => void>;
}

export interface PluginLoaderOptions {
    cwd?: string;
}

export interface PluginLoadError {
    file: string;
    reason: string;
}

export interface PluginLoaderResult {
    loaded: number;
    skipped: number;
    errors: PluginLoadError[];
}
