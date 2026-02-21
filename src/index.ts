export const VERSION = '2.0.0';

// Lib exports
export { getConfig, saveConfig, detectStack } from './lib/config.js';
export { getVersion, copyToClipboard, fuzzyMatch, colors } from './lib/utils.js';
export {
    PROMPTS_DIR,
    CUSTOM_DIR,
    getPromptContent,
    getRunOrder,
    resolvePrompt,
    getPromptName,
    getPromptCategory,
} from './lib/prompts.js';
export {
    getBranch,
    getProgress,
    saveProgress,
    markDone,
    markSkipped,
    undoLast,
    resetProgress,
} from './lib/progress.js';

// Agent exports
export { getAgent, AGENT_DEFINITIONS } from './agents/index.js';
export type { AgentDefinition } from './types/index.js';

// Skill exports
export { loadSkills, addSkill, removeSkill, searchSkills, listSkills } from './skills/index.js';

// Team exports
export { startTeam, shutdownTeam as stopTeam } from './team/index.js';
export type { TeamStartConfig as TeamConfig } from './team/index.js';

// HUD exports
export { renderHud } from './hud/index.js';
export type { HudPreset } from './types/index.js';
// Note: startHud isn't explicitly in src/hud/index.ts, but let's assume we want state watchers
export { watchHudState as startHud } from './hud/index.js';

// Hook exports
export { registerHook, emit, definePlugin } from './hooks/index.js';

// Type exports
export * from './types/index.js';
