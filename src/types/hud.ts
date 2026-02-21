/**
 * Available presets for the HUD layout.
 */
export enum HudPreset {
  /** Bare minimum information (one-liner) */
  Minimal = 'minimal',
  /** Key metrics and current status */
  Focused = 'focused',
  /** Detailed multi-lane status and performance data */
  Full = 'full'
}

/**
 * Booleans indicating which HUD components are enabled.
 */
export interface HudFlags {
  /** Show git branch information */
  showGit: boolean;
  /** Show token usage metrics */
  showMetrics: boolean;
  /** Show active agent count */
  showAgents: boolean;
  /** Show current task/phase */
  showStatus: boolean;
  /** Enable colors and styling */
  enableColors: boolean;
}

/**
 * Contextual data gathered for rendering the HUD.
 */
export interface HudContext {
  /** Current git branch name */
  branch: string | null;
  /** Active team phase or agent status */
  status: string | null;
  /** Counts of active/idle agents */
  agentStats?: {
    active: number;
    total: number;
  };
  /** Performance and token metrics */
  metrics?: {
    inputTokens: number;
    outputTokens: number;
    costEstimate: number;
  };
  /** Current session identifier */
  sessionId: string;
}

/**
 * The internal state of the HUD renderer.
 */
export interface HudState {
  /** The currently active preset */
  preset: HudPreset;
  /** Configuration flags */
  flags: HudFlags;
  /** ISO timestamp of the last render */
  lastUpdate: string;
  /** Visibility toggle */
  visible: boolean;
}
