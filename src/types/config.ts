import { HudPreset } from './hud.js';

/**
 * Technical stack classification.
 */
export interface StackConfig {
  /** Target platform (e.g., web, mobile, desktop) */
  platform: 'web' | 'mobile' | 'desktop' | 'none';
  /** UI framework or library */
  frontend: string;
  /** Backend service or framework */
  backend: string;
  /** Overall language or meta-framework (e.g., flutter, nextjs) */
  framework?: string;
}

/**
 * Settings specific to a project instance.
 */
export interface ProjectConfig {
  /** Unique project identifier or hash */
  id: string;
  /** Human-readable project name */
  name: string;
  /** Detected or override stack configuration */
  stack: StackConfig;
  /** Project-specific exclusions for analysis */
  exclude?: string[];
}

/**
 * Root configuration for Redpen.
 */
export interface RedpenConfig {
  /** Global platform default */
  platform: 'web' | 'mobile' | 'desktop';
  /** Default frontend framework */
  frontend: string;
  /** Default backend framework */
  backend: string;
  /** Meta-framework identifier */
  framework?: string;

  /** Default model tier to use for standard tasks */
  modelTier: 'primary' | 'secondary' | 'tertiary';
  /** Initial HUD layout preference */
  hudPreset: HudPreset;

  /** Default values for newly created teams */
  teamDefaults: {
    /** Max concurrent workers */
    maxWorkers: number;
    /** Whether to use tmux by default */
    useTmux: boolean;
    /** Health check interval (ms) */
    heartbeatInterval: number;
  };

  /** Registered projects and their specific settings */
  projects?: Record<string, ProjectConfig>;
}
