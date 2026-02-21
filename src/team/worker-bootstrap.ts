/**
 * Worker initialization and communication for redpen team orchestration.
 *
 * Provides file-based IPC via inbox markdown files and heartbeat state writes.
 * No MCP tools, no file watchers — polling-based inbox reading only.
 */

import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { getTeamDir } from '../state/index.js';
import { registerWorker, recordWorkerHeartbeat, sendMailboxMessage } from './state.js';
import { sendKeys } from './tmux-session.js';
import type { WorkerRegistrationInput } from './types.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAM_OVERLAY_START = '<!-- REDPEN:TEAM:WORKER:START -->';
const TEAM_OVERLAY_END = '<!-- REDPEN:TEAM:WORKER:END -->';

const INSTRUCTIONS_FILE_NAME = 'WORKER_INSTRUCTIONS.md';
const HEARTBEAT_INTERVAL_MS = 30_000;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AssignedTask {
    id: string;
    description: string;
    status: string;
}

export interface WorkerBootstrapConfig {
    /** Role label for the worker (e.g. "executor", "verifier") */
    role: string;
    /** Tasks pre-assigned to this worker at boot */
    tasks: AssignedTask[];
    /** Tmux session target (e.g. "redpen-team-foo:0") */
    tmuxSession: string;
    /** Tmux pane ID or index for this worker */
    pane: string | number;
    /** Working directory for inbox files */
    cwd: string;
}

export interface HeartbeatHandle {
    /** Stop the heartbeat interval */
    stop: () => void;
}

// ─── Overlay generation ───────────────────────────────────────────────────────

/**
 * Generate AGENTS.md overlay content for team workers.
 * Markers allow the lead to inject/remove this block without mutating AGENTS.md.
 */
export function generateWorkerOverlay(teamName: string): string {
    return `${TEAM_OVERLAY_START}
<team_worker_protocol>
You are a team worker in team "${teamName}". Your identity and assigned tasks are in your inbox file.

## Protocol

1. Read your inbox file at the path provided in the trigger message
2. Send an ACK to the lead once initialized (write to your task file)
3. Read your task from \`.redpen/state/team/${teamName}/tasks/task-<id>.json\`
4. Do the work using your tools
5. On completion: update the task file with \`{"status": "completed", "result": "summary"}\`
6. Wait for new instructions via your inbox or mailbox

## File Paths

- **Inbox**: \`.redpen/state/team/${teamName}/workers/<workerId>/inbox.md\`
- **Mailbox**: \`.redpen/state/team/${teamName}/mailbox/<workerId>.json\`
- **Tasks**: \`.redpen/state/team/${teamName}/tasks/task-<id>.json\`
- **Worker state**: \`.redpen/state/team/${teamName}/workers/<workerId>/state.json\`

## Rules

- Do NOT edit files outside your task description
- If blocked on a dependency, report to the lead via your task file result field
- Do NOT spawn sub-agents
- Poll your inbox for new instructions (do not use file watchers)
- Update your heartbeat state regularly so the lead knows you are alive
</team_worker_protocol>
${TEAM_OVERLAY_END}`;
}

// ─── Instructions file ────────────────────────────────────────────────────────

/**
 * Write a team-scoped worker instructions file in the cwd.
 * Does NOT mutate the project's AGENTS.md.
 */
export async function writeWorkerInstructionsFile(teamName: string, cwd: string, overlay: string): Promise<void> {
    const filePath = join(cwd, INSTRUCTIONS_FILE_NAME);
    const content = [
        `# Redpen Team Worker Instructions — ${teamName}`,
        '',
        `> Generated: ${new Date().toISOString()}`,
        `> Team: ${teamName}`,
        '',
        overlay,
        '',
    ].join('\n');
    await writeFile(filePath, content, 'utf-8');
}

/**
 * Remove the worker instructions file from the cwd on cleanup.
 * Tolerates missing files.
 */
export async function removeWorkerInstructionsFile(teamName: string, cwd: string): Promise<void> {
    void teamName; // included for symmetry / future per-team naming
    const filePath = join(cwd, INSTRUCTIONS_FILE_NAME);
    if (existsSync(filePath)) {
        await unlink(filePath);
    }
}

// ─── Inbox generation ─────────────────────────────────────────────────────────

/**
 * Generate the initial worker inbox markdown written at bootstrap.
 */
export function generateInitialInbox(
    workerName: string,
    teamName: string,
    role: string,
    tasks: AssignedTask[]
): string {
    const taskList =
        tasks.length > 0
            ? tasks.map((t) => `- **Task ${t.id}**: ${t.description}\n  Status: ${t.status}`).join('\n')
            : '_No tasks assigned yet — await instructions._';

    return [
        `# Worker Assignment: ${workerName}`,
        '',
        `**Team:** ${teamName}`,
        `**Role:** ${role}`,
        `**Initialized:** ${new Date().toISOString()}`,
        '',
        '## Your Assigned Tasks',
        '',
        taskList,
        '',
        '## Instructions',
        '',
        '1. Start with the first non-blocked task',
        '2. Complete the work using your available tools',
        `3. Write results to \`.redpen/state/team/${teamName}/tasks/task-<id>.json\``,
        '4. Wait for the next instruction via inbox or mailbox',
    ].join('\n');
}

/**
 * Generate a follow-up task assignment inbox message.
 */
export function generateTaskAssignmentInbox(
    workerName: string,
    teamName: string,
    taskId: string,
    description: string
): string {
    return [
        `# New Task Assignment: ${workerName}`,
        '',
        `**Team:** ${teamName}`,
        `**Task ID:** ${taskId}`,
        `**Assigned:** ${new Date().toISOString()}`,
        '',
        '## Task Description',
        '',
        description,
        '',
        '## Instructions',
        '',
        `1. Read full task details from \`.redpen/state/team/${teamName}/tasks/task-${taskId}.json\``,
        '2. Complete the work',
        '3. Update task status to `completed` with your result summary',
    ].join('\n');
}

/**
 * Generate a shutdown request inbox message.
 */
export function generateShutdownInbox(teamName: string, workerName: string): string {
    return [
        `# Shutdown Request: ${workerName}`,
        '',
        `**Team:** ${teamName}`,
        `**Requested:** ${new Date().toISOString()}`,
        '',
        '## Instructions',
        '',
        '1. Complete or suspend any in-progress work',
        '2. Write final status to your task file',
        '3. You may now exit',
    ].join('\n');
}

// ─── Trigger messages ─────────────────────────────────────────────────────────

/**
 * Generate a short send-keys trigger message (<200 chars).
 * Sent via tmux to boot the worker agent.
 */
export function generateTriggerMessage(workerName: string, teamName: string): string {
    return `Read and follow instructions in .redpen/state/team/${teamName}/workers/${workerName}/inbox.md`;
}

/**
 * Generate a mailbox notification trigger message (<200 chars).
 */
export function generateMailboxTriggerMessage(workerName: string, teamName: string, count: number): string {
    const noun = count === 1 ? 'message' : 'messages';
    return `You have ${count} new ${noun} in .redpen/state/team/${teamName}/mailbox/${workerName}.json — check and respond.`;
}

// ─── Inbox file I/O ───────────────────────────────────────────────────────────

async function resolveWorkerInboxDir(teamName: string, workerId: string): Promise<string> {
    const teamBase = await getTeamDir();
    const inboxDir = join(teamBase, teamName, 'workers', workerId);
    await mkdir(inboxDir, { recursive: true });
    return inboxDir;
}

async function writeInboxFile(inboxDir: string, content: string): Promise<void> {
    await writeFile(join(inboxDir, 'inbox.md'), content, 'utf-8');
}

/** Read the current inbox markdown for a worker (returns empty string if not found). */
export async function readWorkerInbox(teamName: string, workerId: string): Promise<string> {
    const teamBase = await getTeamDir();
    const inboxPath = join(teamBase, teamName, 'workers', workerId, 'inbox.md');
    if (!existsSync(inboxPath)) return '';
    return readFile(inboxPath, 'utf-8');
}

// ─── Heartbeat ────────────────────────────────────────────────────────────────

/**
 * Start a repeating heartbeat that writes the worker's timestamp to state.
 * Returns a handle with a `stop()` method to cancel on teardown.
 */
export function startHeartbeat(teamName: string, workerId: string): HeartbeatHandle {
    const interval = setInterval(() => {
        recordWorkerHeartbeat(teamName, workerId).catch(() => {
            // Swallow — worker may have been deregistered; heartbeat is best-effort
        });
    }, HEARTBEAT_INTERVAL_MS);

    return {
        stop: () => clearInterval(interval),
    };
}

// ─── Full bootstrap ───────────────────────────────────────────────────────────

export interface BootstrapResult {
    /** Absolute path to the written inbox file */
    inboxPath: string;
    /** Heartbeat handle — call .stop() on teardown */
    heartbeat: HeartbeatHandle;
}

/**
 * Full worker bootstrap:
 * 1. Ensure inbox directory exists
 * 2. Register worker in team state
 * 3. Generate AGENTS.md overlay and write instructions file
 * 4. Write initial assignment inbox
 * 5. Send tmux trigger to the worker pane
 * 6. Start heartbeat interval
 */
export async function bootstrapWorker(
    teamName: string,
    workerId: string,
    config: WorkerBootstrapConfig
): Promise<BootstrapResult> {
    const { role, tasks, tmuxSession, pane, cwd } = config;

    // 1. Ensure inbox directory
    const inboxDir = await resolveWorkerInboxDir(teamName, workerId);
    const inboxPath = join(inboxDir, 'inbox.md');

    // 2. Register worker in team state
    const registration: WorkerRegistrationInput = { id: workerId, role };
    await registerWorker(teamName, registration);

    // 3. Write AGENTS.md overlay as instructions file (does NOT touch AGENTS.md)
    const overlay = generateWorkerOverlay(teamName);
    await writeWorkerInstructionsFile(teamName, cwd, overlay);

    // 4. Write initial assignment inbox
    const inboxContent = generateInitialInbox(workerId, teamName, role, tasks);
    await writeInboxFile(inboxDir, inboxContent);

    // 5. Send ACK notification to lead mailbox
    await sendMailboxMessage(teamName, {
        workerId: 'lead',
        from: workerId,
        body: `Worker ${workerId} (${role}) initialized. Inbox ready at .redpen/state/team/${teamName}/workers/${workerId}/inbox.md`,
    }).catch(() => {
        // Non-fatal — lead mailbox may not exist yet
    });

    // 6. Send tmux trigger to worker pane
    const trigger = generateTriggerMessage(workerId, teamName);
    await sendKeys(tmuxSession, pane, trigger);
    await sendKeys(tmuxSession, pane, 'Enter');

    // 7. Start heartbeat
    const heartbeat = startHeartbeat(teamName, workerId);

    return { inboxPath, heartbeat };
}
