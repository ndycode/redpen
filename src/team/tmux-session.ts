/**
 * tmux session and pane management for redpen team orchestration.
 *
 * All tmux operations are async via util.promisify(execFile).
 * Session naming convention: `redpen-team-{teamName}`
 */

import { execFile } from 'child_process';
import { readFile } from 'fs/promises';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// ─── Constants ────────────────────────────────────────────────────────────────

const SESSION_PREFIX = 'redpen-team-';
const TMUX_NOT_INSTALLED_ERROR = 'tmux is not installed. Install tmux to use team orchestration.';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Describes an active redpen team tmux session.
 */
export interface TeamSession {
    /** Tmux target in "session:window" form, e.g. "redpen-team-foo:0" */
    name: string;
    /** Number of worker panes spawned */
    workerCount: number;
    /** Working directory for the session */
    cwd: string;
    /** Tmux pane IDs for each worker (starts with %) */
    workerPaneIds: string[];
    /** Leader's own pane ID — must never be targeted by worker cleanup routines */
    leaderPaneId: string;
    /** HUD pane spawned below the leader column, or null if creation failed */
    hudPaneId: string | null;
}

/**
 * Configuration for creating a new team session.
 */
export interface SessionConfig {
    /** Number of worker panes to create (>= 1) */
    workerCount: number;
    /** Working directory for all panes */
    cwd: string;
    /** Optional extra args to forward to worker launch commands */
    workerLaunchArgs?: string[];
}

/**
 * Direction to split a pane.
 */
export type SplitDirection = 'h' | 'v';

/**
 * Information about a tmux pane.
 */
export interface TmuxPaneInfo {
    paneId: string;
    currentCommand: string;
    startCommand: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

interface TmuxSuccess {
    ok: true;
    stdout: string;
}
interface TmuxFailure {
    ok: false;
    stderr: string;
}
type TmuxResult = TmuxSuccess | TmuxFailure;

/**
 * Run a tmux command asynchronously via execFile (no shell).
 */
async function runTmux(args: string[]): Promise<TmuxResult> {
    try {
        const { stdout, stderr } = await execFileAsync('tmux', args, { encoding: 'utf-8' });
        if (typeof stdout === 'string') {
            return { ok: true, stdout: stdout.trim() };
        }
        // stderr non-empty but exit 0 — still ok
        return { ok: true, stdout: (stderr ?? '').trim() };
    } catch (err: unknown) {
        const error = err as NodeJS.ErrnoException & { stderr?: string; code?: number };
        if (error.code === 'ENOENT') {
            throw new Error(TMUX_NOT_INSTALLED_ERROR);
        }
        const stderr = typeof error.stderr === 'string' ? error.stderr.trim() : String(error.message ?? err);
        return { ok: false, stderr };
    }
}

/**
 * Extract session name from "session:window" target.
 */
function baseSessionName(target: string): string {
    return target.split(':')[0] ?? target;
}

/**
 * Build the tmux pane target string.
 * Prefers the explicit pane ID if it starts with `%`, otherwise falls back to
 * index-based addressing.
 */
function paneTarget(sessionName: string, paneIndex: number, paneId?: string): string {
    if (paneId && paneId.startsWith('%')) return paneId;
    if (sessionName.includes(':')) {
        return `${sessionName}.${paneIndex}`;
    }
    return `${sessionName}:${paneIndex}`;
}

// ─── tmux availability check ──────────────────────────────────────────────────

/** Cache the availability check to avoid repeated subprocess spawns */
let tmuxAvailableCache: boolean | undefined;

/**
 * Check whether tmux is installed and reachable.
 * Result is cached after the first call.
 */
export async function isTmuxAvailable(): Promise<boolean> {
    if (tmuxAvailableCache !== undefined) return tmuxAvailableCache;
    try {
        await execFileAsync('tmux', ['-V'], { encoding: 'utf-8' });
        tmuxAvailableCache = true;
    } catch {
        tmuxAvailableCache = false;
    }
    return tmuxAvailableCache;
}

/**
 * Assert tmux is installed; throw a helpful error if not.
 */
async function requireTmux(): Promise<void> {
    if (!(await isTmuxAvailable())) {
        throw new Error(TMUX_NOT_INSTALLED_ERROR);
    }
}

// ─── Session naming ───────────────────────────────────────────────────────────

/**
 * Sanitize a team name: lowercase, alphanumeric + hyphens, max 30 chars.
 */
export function sanitizeTeamName(name: string): string {
    const lowered = name.toLowerCase();
    const replaced = lowered
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-/, '')
        .replace(/-$/, '');

    const truncated = replaced.slice(0, 30).replace(/-$/, '');
    if (truncated.trim() === '') {
        throw new Error('sanitizeTeamName: empty after sanitization');
    }
    return truncated;
}

/**
 * Build the full tmux session name for a team.
 */
export function teamSessionName(teamName: string): string {
    return `${SESSION_PREFIX}${sanitizeTeamName(teamName)}`;
}

// ─── WSL2 detection ───────────────────────────────────────────────────────────

/**
 * Detect whether the process is running inside a WSL2 environment.
 * WSL2 always sets WSL_DISTRO_NAME; fallback: check /proc/version.
 */
export async function isWsl2(): Promise<boolean> {
    if (process.env['WSL_DISTRO_NAME'] ?? process.env['WSL_INTEROP']) {
        return true;
    }
    try {
        const version = await readFile('/proc/version', 'utf-8');
        return /microsoft/i.test(version);
    } catch {
        return false;
    }
}

// ─── Pane listing ─────────────────────────────────────────────────────────────

/**
 * List all panes within a tmux target (session or window).
 */
async function listPanes(target: string): Promise<TmuxPaneInfo[]> {
    const result = await runTmux([
        'list-panes',
        '-t',
        target,
        '-F',
        '#{pane_id}\t#{pane_current_command}\t#{pane_start_command}',
    ]);
    if (!result.ok) return [];
    return result.stdout
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
            const [paneId = '', currentCommand = '', startCommand = ''] = line.split('\t');
            return { paneId, currentCommand, startCommand };
        })
        .filter((pane) => pane.paneId.startsWith('%'));
}

// ─── Core public API ──────────────────────────────────────────────────────────

/**
 * Create a new detached tmux session with the given window/pane layout.
 * The session is named `redpen-team-{teamName}`.
 *
 * @param name     - Team name (will be sanitized)
 * @param config   - Session configuration
 * @returns        TeamSession descriptor
 */
export async function createSession(name: string, config: SessionConfig): Promise<TeamSession> {
    await requireTmux();

    const { workerCount, cwd } = config;
    if (!Number.isInteger(workerCount) || workerCount < 1) {
        throw new Error(`workerCount must be >= 1 (got ${workerCount})`);
    }

    const sessionName = teamSessionName(name);

    // Create the detached session
    const newSession = await runTmux(['new-session', '-d', '-s', sessionName, '-c', cwd]);
    if (!newSession.ok) {
        throw new Error(`Failed to create tmux session "${sessionName}": ${newSession.stderr}`);
    }

    // Capture the leader pane ID
    const leaderPaneResult = await runTmux(['display-message', '-t', sessionName, '-p', '#{pane_id}']);
    if (!leaderPaneResult.ok || !leaderPaneResult.stdout.startsWith('%')) {
        throw new Error(`Failed to capture leader pane ID for session "${sessionName}"`);
    }
    const leaderPaneId = leaderPaneResult.stdout.split('\n')[0]?.trim() ?? '';

    const workerPaneIds: string[] = [];
    let rightStackRootPaneId: string | null = null;

    for (let i = 1; i <= workerCount; i++) {
        const splitDirection = i === 1 ? '-h' : '-v';
        const splitTarget = i === 1 ? leaderPaneId : (rightStackRootPaneId ?? leaderPaneId);

        const split = await runTmux([
            'split-window',
            splitDirection,
            '-t',
            splitTarget,
            '-d',
            '-P',
            '-F',
            '#{pane_id}',
            '-c',
            cwd,
        ]);
        if (!split.ok) {
            throw new Error(`Failed to create worker pane ${i}: ${split.stderr}`);
        }
        const paneId = split.stdout.split('\n')[0]?.trim() ?? '';
        if (!paneId.startsWith('%')) {
            throw new Error(`Failed to capture pane ID for worker ${i}`);
        }
        workerPaneIds.push(paneId);
        if (i === 1) rightStackRootPaneId = paneId;
    }

    // Apply main-vertical layout (leader left, workers stacked right)
    const teamTarget = `${sessionName}:0`;
    await runTmux(['select-layout', '-t', teamTarget, 'main-vertical']);

    // Set leader pane width to half the window
    const windowWidthResult = await runTmux(['display-message', '-p', '-t', teamTarget, '#{window_width}']);
    if (windowWidthResult.ok) {
        const width = Number.parseInt(windowWidthResult.stdout.split('\n')[0]?.trim() ?? '', 10);
        if (Number.isFinite(width) && width >= 40) {
            const half = String(Math.floor(width / 2));
            await runTmux(['set-window-option', '-t', teamTarget, 'main-pane-width', half]);
            await runTmux(['select-layout', '-t', teamTarget, 'main-vertical']);
        }
    }

    // Re-focus leader pane
    await runTmux(['select-pane', '-t', leaderPaneId]);

    return {
        name: teamTarget,
        workerCount,
        cwd,
        workerPaneIds,
        leaderPaneId,
        hudPaneId: null,
    };
}

/**
 * Split a pane in the given session/direction and optionally run a command.
 *
 * @param session   - Tmux session target (e.g. "redpen-team-foo:0")
 * @param direction - 'h' (horizontal/left-right) or 'v' (vertical/top-bottom)
 * @param command   - Shell command to run in the new pane (optional)
 * @returns         The new pane's ID (starts with %)
 */
export async function splitPane(session: string, direction: SplitDirection, command?: string): Promise<string> {
    await requireTmux();

    const flag = direction === 'h' ? '-h' : '-v';
    const args = ['split-window', flag, '-t', session, '-d', '-P', '-F', '#{pane_id}'];
    if (command) {
        args.push(command);
    }

    const result = await runTmux(args);
    if (!result.ok) {
        throw new Error(`splitPane failed (${direction}): ${result.stderr}`);
    }
    const paneId = result.stdout.split('\n')[0]?.trim() ?? '';
    if (!paneId.startsWith('%')) {
        throw new Error(`splitPane: unexpected pane ID "${paneId}"`);
    }
    return paneId;
}

/**
 * Send keystrokes to a specific pane.
 *
 * @param session - Tmux session target
 * @param pane    - Pane ID (% prefixed) or index
 * @param keys    - Keys to send (tmux key notation, e.g. "C-m", "Enter", or literal text)
 */
export async function sendKeys(session: string, pane: string | number, keys: string): Promise<void> {
    await requireTmux();

    const target = typeof pane === 'string' && pane.startsWith('%') ? pane : `${session}.${pane}`;

    const result = await runTmux(['send-keys', '-t', target, keys]);
    if (!result.ok) {
        throw new Error(`sendKeys to "${target}" failed: ${result.stderr}`);
    }
}

/**
 * List all active tmux sessions matching the `redpen-team-*` prefix.
 *
 * @returns Array of full session names
 */
export async function listSessions(): Promise<string[]> {
    if (!(await isTmuxAvailable())) return [];

    const result = await runTmux(['list-sessions', '-F', '#{session_name}']);
    if (!result.ok) return [];

    return result.stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map(baseSessionName)
        .filter((s) => s.startsWith(SESSION_PREFIX));
}

/**
 * Kill a tmux session by name and terminate all its panes.
 * Tolerates already-dead or non-existent sessions.
 *
 * @param name - Session name or team name (prefixed automatically if needed)
 */
export async function killSession(name: string): Promise<void> {
    await requireTmux();

    const target = name.startsWith(SESSION_PREFIX) ? name : teamSessionName(name);
    try {
        await runTmux(['kill-session', '-t', target]);
    } catch {
        // tolerate — session may already be gone
    }
}

/**
 * Poll a pane's output until a ready signal appears or timeout is reached.
 *
 * @param session      - Tmux session target
 * @param pane         - Pane ID (% prefixed) or index
 * @param readySignal  - String to look for in the pane buffer
 * @param timeoutMs    - Maximum wait time in milliseconds (default: 30 000)
 * @returns            true if ready signal found, false on timeout
 */
export async function waitForReady(
    session: string,
    pane: string | number,
    readySignal: string,
    timeoutMs = 30_000
): Promise<boolean> {
    await requireTmux();

    const target =
        typeof pane === 'string' && pane.startsWith('%')
            ? pane
            : paneTarget(session, typeof pane === 'number' ? pane : 0, typeof pane === 'string' ? pane : undefined);

    const pollIntervalMs = 500;
    const deadline = Date.now() + timeoutMs;

    const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

    while (Date.now() < deadline) {
        const result = await runTmux(['capture-pane', '-t', target, '-p']);
        if (result.ok) {
            const normalized = result.stdout.replace(/\r/g, '');
            if (normalized.includes(readySignal)) return true;
        }
        const remaining = deadline - Date.now();
        if (remaining <= 0) break;
        await wait(Math.min(pollIntervalMs, remaining));
    }

    return false;
}

/**
 * Capture and return the current output buffer of a pane.
 *
 * @param session - Tmux session target
 * @param pane    - Pane ID (% prefixed) or index
 * @returns       Raw pane buffer text, or empty string on failure
 */
export async function getPaneOutput(session: string, pane: string | number): Promise<string> {
    await requireTmux();

    const target =
        typeof pane === 'string' && pane.startsWith('%')
            ? pane
            : paneTarget(session, typeof pane === 'number' ? pane : 0, typeof pane === 'string' ? pane : undefined);

    const result = await runTmux(['capture-pane', '-t', target, '-p']);
    if (!result.ok) return '';
    return result.stdout;
}

// ─── Additional utility exports ───────────────────────────────────────────────

/**
 * Enable tmux mouse mode for scrolling on a session.
 * On WSL2, also adds the XT terminal capability override.
 *
 * @returns true if mouse was enabled, false otherwise
 */
export async function enableMouseScrolling(sessionTarget: string): Promise<boolean> {
    const result = await runTmux(['set-option', '-t', sessionTarget, 'mouse', 'on']);
    if (!result.ok) return false;

    if (await isWsl2()) {
        await runTmux(['set-option', '-ga', 'terminal-overrides', ',xterm*:XT']);
    }

    return true;
}

/**
 * Get the PID of the shell process running in a pane.
 *
 * @returns PID number, or null if unavailable
 */
export async function getPanePid(session: string, pane: string | number): Promise<number | null> {
    await requireTmux();

    const target =
        typeof pane === 'string' && pane.startsWith('%')
            ? pane
            : paneTarget(session, typeof pane === 'number' ? pane : 0, typeof pane === 'string' ? pane : undefined);

    const result = await runTmux(['list-panes', '-t', target, '-F', '#{pane_pid}']);
    if (!result.ok) return null;

    const firstLine = result.stdout.split('\n')[0]?.trim();
    if (!firstLine) return null;

    const pid = Number.parseInt(firstLine, 10);
    return Number.isFinite(pid) ? pid : null;
}

/**
 * Check whether a pane is still alive (not dead/exited).
 *
 * @returns true if the pane process is running, false otherwise
 */
export async function isPaneAlive(session: string, pane: string | number): Promise<boolean> {
    await requireTmux();

    const target =
        typeof pane === 'string' && pane.startsWith('%')
            ? pane
            : paneTarget(session, typeof pane === 'number' ? pane : 0, typeof pane === 'string' ? pane : undefined);

    const result = await runTmux(['list-panes', '-t', target, '-F', '#{pane_dead} #{pane_pid}']);
    if (!result.ok) return false;

    const line = result.stdout.split('\n')[0]?.trim();
    if (!line) return false;

    const parts = line.split(/\s+/);
    if (parts.length < 2) return false;

    const paneDead = parts[0];
    const pid = Number.parseInt(parts[1] ?? '', 10);

    if (paneDead === '1') return false;
    if (!Number.isFinite(pid)) return false;

    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

/**
 * Kill a specific pane by ID.
 * Sends C-c, then C-d, then kill-pane if still alive.
 * The leaderPaneId guard prevents accidentally killing the leader.
 *
 * @param paneId       - Pane ID (must start with %)
 * @param leaderPaneId - Optional leader pane guard
 */
export async function killPane(paneId: string, leaderPaneId?: string): Promise<void> {
    if (!paneId.startsWith('%')) return;
    if (leaderPaneId && paneId === leaderPaneId) return;

    await runTmux(['send-keys', '-t', paneId, 'C-c']);
    await new Promise<void>((resolve) => setTimeout(resolve, 500));

    const sessionPlaceholder = paneId; // pane ID is a valid target
    if (await isPaneAlive(sessionPlaceholder, paneId)) {
        await runTmux(['send-keys', '-t', paneId, 'C-d']);
        await new Promise<void>((resolve) => setTimeout(resolve, 500));
    }

    if (await isPaneAlive(sessionPlaceholder, paneId)) {
        await runTmux(['kill-pane', '-t', paneId]);
    }
}

/**
 * List all pane infos in a session.
 *
 * @param session - Tmux session target
 * @returns Array of TmuxPaneInfo
 */
export async function getSessionPanes(session: string): Promise<TmuxPaneInfo[]> {
    await requireTmux();
    return listPanes(session);
}

/**
 * Normalize tmux capture output: collapse whitespace, trim.
 */
export function normalizeTmuxCapture(value: string): string {
    return value.replace(/\r/g, '').replace(/\s+/g, ' ').trim();
}
