/**
 * redpen HUD - State reader
 *
 * Reads .redpen/state/hud/ files to compose the HudState for rendering.
 * READ-ONLY from the HUD's perspective — never writes state.
 *
 * Uses polling (setInterval) instead of fs.watch for cross-platform reliability.
 */

import { readFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { getHudDir } from '../state/index.js';
import type { HudState, HudFlags, HudPreset } from '../types/index.js';

// ---------------------------------------------------------------------------
// Internal state file shapes (what lives in .redpen/state/hud/*.json)
// ---------------------------------------------------------------------------

interface ActiveModeFile {
    mode: string;
    startedAt: string;
}

interface CurrentTaskFile {
    task: string;
    phase: string;
    progressPct: number;
}

interface TeamStatusFile {
    workerCount: number;
    activeWorkers: number;
    idleWorkers: number;
    phase: string;
}

interface HudStateFile {
    preset: HudPreset;
    flags: HudFlags;
    visible: boolean;
}

// ---------------------------------------------------------------------------
// Internal JSON reader (returns null on any error — file may not exist yet)
// ---------------------------------------------------------------------------

async function readJsonFile<T>(filePath: string): Promise<T | null> {
    try {
        const content = await readFile(filePath, 'utf-8');
        return JSON.parse(content) as T;
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Default HudState returned when no state files are present
// ---------------------------------------------------------------------------

const DEFAULT_FLAGS: HudFlags = {
    showGit: true,
    showMetrics: false,
    showAgents: false,
    showStatus: true,
    enableColors: true,
};

function makeDefaultState(): HudState {
    return {
        preset: 'focused' as HudPreset,
        flags: DEFAULT_FLAGS,
        lastUpdate: new Date().toISOString(),
        visible: true,
    };
}

// ---------------------------------------------------------------------------
// Composed state shape returned by readHudState()
// ---------------------------------------------------------------------------

export interface ComposedHudState {
    /** The base HUD render configuration (preset, flags, visibility) */
    hud: HudState;
    /** Currently active mode name (e.g. "ralph", "team") or null */
    activeMode: string | null;
    /** Timestamp when active mode started, or null */
    activeModeStartedAt: string | null;
    /** Current task description or null */
    currentTask: string | null;
    /** Current phase label or null */
    phase: string | null;
    /** Progress as 0–100 percentage or null */
    progressPct: number | null;
    /** Total worker count (team mode), or null */
    workerCount: number | null;
    /** Number of active (busy) workers, or null */
    activeWorkers: number | null;
    /** Number of idle workers, or null */
    idleWorkers: number | null;
}

// ---------------------------------------------------------------------------
// Primary reader — composes all state files into a single ComposedHudState
// ---------------------------------------------------------------------------

/**
 * Read all HUD state files from .redpen/state/hud/ and compose into
 * a single ComposedHudState. Safe to call even when no files exist yet.
 */
export async function readHudState(): Promise<ComposedHudState> {
    const hudDir = await getHudDir();

    const [hudFile, activeModeFile, currentTaskFile, teamStatusFile] = await Promise.all([
        readJsonFile<HudStateFile>(join(hudDir, 'hud-state.json')),
        readJsonFile<ActiveModeFile>(join(hudDir, 'active-mode.json')),
        readJsonFile<CurrentTaskFile>(join(hudDir, 'current-task.json')),
        readJsonFile<TeamStatusFile>(join(hudDir, 'team-status.json')),
    ]);

    // Build HudState from file or defaults
    const hud: HudState = hudFile
        ? {
              preset: hudFile.preset,
              flags: hudFile.flags,
              lastUpdate: new Date().toISOString(),
              visible: hudFile.visible,
          }
        : makeDefaultState();

    return {
        hud,
        activeMode: activeModeFile?.mode ?? null,
        activeModeStartedAt: activeModeFile?.startedAt ?? null,
        currentTask: currentTaskFile?.task ?? null,
        phase: activeModeFile
            ? null // phase from active-mode is team-specific; use team-status below
            : null,
        progressPct: currentTaskFile?.progressPct ?? null,
        workerCount: teamStatusFile?.workerCount ?? null,
        activeWorkers: teamStatusFile?.activeWorkers ?? null,
        idleWorkers: teamStatusFile?.idleWorkers ?? null,
    };
}

// ---------------------------------------------------------------------------
// Derive the effective phase from all available sources
// ---------------------------------------------------------------------------

/**
 * Resolve the best-available phase label from the composed state.
 * Priority: currentTaskFile.phase > teamStatusFile.phase > null
 */
export async function readEffectivePhase(): Promise<string | null> {
    const hudDir = await getHudDir();
    const [currentTaskFile, teamStatusFile] = await Promise.all([
        readJsonFile<CurrentTaskFile>(join(hudDir, 'current-task.json')),
        readJsonFile<TeamStatusFile>(join(hudDir, 'team-status.json')),
    ]);
    return currentTaskFile?.phase ?? teamStatusFile?.phase ?? null;
}

// ---------------------------------------------------------------------------
// Directory listing helper — returns names of state files present
// ---------------------------------------------------------------------------

/**
 * List filenames currently in the HUD state directory.
 * Returns an empty array if the directory cannot be read.
 */
export async function listHudStateFiles(): Promise<string[]> {
    try {
        const hudDir = await getHudDir();
        return await readdir(hudDir);
    } catch {
        return [];
    }
}

// ---------------------------------------------------------------------------
// Watcher — polls for changes and invokes callback
// ---------------------------------------------------------------------------

export interface WatchHudStateOptions {
    /** Poll interval in milliseconds. Default: 1000 */
    intervalMs?: number;
}

/**
 * Poll the HUD state directory at the given interval and invoke `callback`
 * with the latest ComposedHudState whenever it is called.
 *
 * Uses setInterval (polling) for cross-platform reliability.
 *
 * @returns A stop function — call it to cancel the watcher.
 *
 * @example
 * ```ts
 * const stop = watchHudState((state) => render(state), { intervalMs: 500 });
 * // ... later:
 * stop();
 * ```
 */
export function watchHudState(
    callback: (state: ComposedHudState) => void,
    options: WatchHudStateOptions = {}
): () => void {
    const intervalMs = options.intervalMs ?? 1000;

    const timer = setInterval(() => {
        readHudState()
            .then(callback)
            .catch(() => {
                // Silently ignore read errors between polls
            });
    }, intervalMs);

    // Immediately invoke once so caller gets state on first tick
    readHudState()
        .then(callback)
        .catch(() => undefined);

    return () => {
        clearInterval(timer);
    };
}
