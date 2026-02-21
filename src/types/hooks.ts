/**
 * Significant events in the Redpen lifecycle that can trigger hooks.
 */
export enum HookEvent {
  /** When a new session is initialized */
  SessionStart = 'session-start',
  /** When a session finishes or is terminated */
  SessionEnd = 'session-end',
  /** After an LLM turn completes successfully */
  TurnComplete = 'turn-complete',
  /** Before a tool is invoked by an agent */
  PreToolUse = 'pre-tool-use',
  /** After a tool returns a result */
  PostToolUse = 'post-tool-use',
  /** When a background task finishes */
  TaskComplete = 'task-complete'
}

/**
 * Signature for a function that handles hook events.
 */
export type HookHandler = (event: HookEvent, context: Record<string, unknown>) => Promise<void> | void;

/**
 * Metadata for a Redpen plugin.
 */
export interface PluginManifest {
  /** Unique plugin identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Version of the plugin */
  version: string;
  /** Minimum Redpen version required */
  minRedpenVersion: string;
  /** Entry point file path */
  main: string;
}

/**
 * Definition of a plugin and its capabilities.
 */
export interface PluginDefinition {
  /** Metadata from the manifest */
  manifest: PluginManifest;
  /** Full filesystem path to the plugin directory */
  path: string;
  /** Whether the plugin is currently active */
  enabled: boolean;
  /** List of events this plugin listens to */
  events: HookEvent[];
}
