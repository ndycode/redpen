import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
    createTeamManifest,
    readTeamManifest,
    getTeamState,
    registerWorker,
    claimTask,
    listTasks,
    unclaimStaleTasks,
    sendMailboxMessage,
    detectNonReportingWorkers,
    listWorkers,
    advanceTeamPhase,
} from './state.js';
import {
    createSession,
    killSession,
    listSessions,
    sendKeys,
    teamSessionName,
    type TeamSession,
} from './tmux-session.js';
import { emit } from '../hooks/index.js';
import { getTeamDir } from '../state/index.js';
import type { TaskState } from '../types/index.js';
import type { TeamManifest, TeamPhase, TeamStateWithDetails, StoredTask } from './types.js';

const TERMINAL_STATUSES: ReadonlySet<TaskState['status']> = new Set(['completed', 'failed', 'blocked', 'cancelled']);

const PHASE_FROM_DETAIL: Record<TeamPhase, TeamStateWithDetails['phase']> = {
    plan: 'planning',
    prd: 'planning',
    exec: 'execution',
    verify: 'review',
    fix: 'teardown',
};

const DEFAULT_SHUTDOWN_WAIT_MS = 2_000;
const DEFAULT_SIGNAL_FROM = 'leader';

interface MonitorOptions {
    intervalMs: number;
    staleWorkerThresholdMs: number;
    autoAdvancePhase: boolean;
    archiveOnTick: boolean;
}

const DEFAULT_MONITOR: MonitorOptions = {
    intervalMs: 15_000,
    staleWorkerThresholdMs: 2 * 60 * 1000,
    autoAdvancePhase: true,
    archiveOnTick: true,
};

export interface WorkerLaunchConfig {
    id: string;
    role: string;
    command?: string;
}

export interface TeamStartConfig {
    name: string;
    goal: string;
    leaderId: string;
    cwd: string;
    workers: WorkerLaunchConfig[];
    tmuxSession?: string;
    monitor?: Partial<MonitorOptions>;
}

export interface TeamShutdownOptions {
    reason?: string;
    waitMs?: number;
    archiveSnapshot?: boolean;
    signalFrom?: string;
}

export interface TeamSnapshot {
    teamName: string;
    phase: string;
    workers: Array<{ id: string; alive: boolean; status: string; heartbeat: string; currentTask?: string }>; 
    tasks: { total: number; pending: number; inProgress: number; completed: number; failed: number };
    allTasksTerminal: boolean;
    staleWorkers: string[];
    recommendations: string[];
}

export interface TeamRuntime {
    teamName: string;
    sessionName: string;
    cwd: string;
    monitorInterval?: ReturnType<typeof setInterval>;
}

const runtimeRegistry = new Map<string, TeamRuntime>();
const monitorOptionsRegistry = new Map<string, MonitorOptions>();
const latestSnapshots = new Map<string, TeamSnapshot>();
function mergeMonitorOptions(teamName: string, overrides?: Partial<MonitorOptions>): MonitorOptions {
    const merged: MonitorOptions = { ...DEFAULT_MONITOR, ...overrides };
    monitorOptionsRegistry.set(teamName, merged);
    return merged;
}

function getMonitorOptions(teamName: string): MonitorOptions {
    return monitorOptionsRegistry.get(teamName) ?? DEFAULT_MONITOR;
}

function scheduleMonitor(teamName: string): ReturnType<typeof setInterval> {
    const options = getMonitorOptions(teamName);
    return setInterval(() => {
        monitorTeam(teamName).catch((error) => {
            console.error(`[team:${teamName}] monitor loop failed`, error);
        });
    }, options.intervalMs);
}

async function ensureSession(manifest: TeamManifest, cwd: string, workerCount: number): Promise<TeamSession | null> {
    const desiredName = teamSessionName(manifest.name);
    const sessions = await listSessions();
    if (sessions.includes(desiredName)) {
        return null;
    }
    return createSession(manifest.name, { workerCount: Math.max(1, workerCount), cwd });
}

async function bootstrapWorkers(session: TeamSession | null, workers: WorkerLaunchConfig[]): Promise<void> {
    if (!session || workers.length === 0) return;
    const { workerPaneIds, name } = session;
    const limit = Math.min(workerPaneIds.length, workers.length);
    for (let index = 0; index < limit; index += 1) {
        const cfg = workers[index];
        const paneId = workerPaneIds[index];
        if (!cfg || !paneId || !cfg.command) continue;
        await sendKeys(name, paneId, cfg.command);
        await sendKeys(name, paneId, 'Enter');
    }
}

async function archiveSnapshot(teamName: string, snapshot: TeamSnapshot): Promise<void> {
    latestSnapshots.set(teamName, snapshot);
    try {
        const dir = join(await getTeamDir(), teamName, 'archives');
        await mkdir(dir, { recursive: true });
        const file = join(dir, `${Date.now()}-snapshot.json`);
        await writeFile(file, JSON.stringify(snapshot, null, 2), 'utf-8');
    } catch (error) {
        console.warn(`[team:${teamName}] snapshot archive failed`, error);
    }
}

function sleep(ms: number): Promise<void> {
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function toPublicTask(task: StoredTask | TaskState): TaskState {
    const { createdAt, updatedAt, claim, ...rest } = task as StoredTask;
    return { ...rest };
}
export async function startTeam(config: TeamStartConfig): Promise<TeamRuntime> {
    if (config.workers.length === 0) {
        throw new Error('startTeam requires at least one worker definition.');
    }

    const manifest = await createTeamManifest({
        name: config.name,
        goal: config.goal,
        leaderId: config.leaderId,
        tmuxSession: config.tmuxSession,
    });

    const session = await ensureSession(manifest, config.cwd, config.workers.length);

    for (const worker of config.workers) {
        await registerWorker(manifest.name, { id: worker.id, role: worker.role });
        await emit('worker:spawn', { teamName: manifest.name, workerId: worker.id, role: worker.role });
    }

    mergeMonitorOptions(manifest.name, config.monitor);
    const monitorInterval = scheduleMonitor(manifest.name);

    const runtime: TeamRuntime = {
        teamName: manifest.name,
        sessionName: teamSessionName(manifest.name),
        cwd: config.cwd,
        monitorInterval,
    };
    runtimeRegistry.set(manifest.name, runtime);

    await emit('team:start', { teamName: manifest.name, goal: manifest.goal, leaderId: manifest.leaderId });
    await bootstrapWorkers(session, config.workers);
    await monitorTeam(manifest.name);

    return runtime;
}

export async function monitorTeam(teamName: string): Promise<TeamSnapshot> {
    const options = getMonitorOptions(teamName);
    const [state, tasks, workers, staleWorkers, reclaimedTasks] = await Promise.all([
        getTeamState(teamName),
        listTasks(teamName),
        listWorkers(teamName),
        detectNonReportingWorkers(teamName, { thresholdMs: options.staleWorkerThresholdMs }),
        unclaimStaleTasks(teamName),
    ]);

    const snapshotTasks = summarizeTasks(tasks);
    const staleSet = new Set(staleWorkers);
    const workerSummary = workers.map((worker) => ({
        id: worker.id,
        alive: !staleSet.has(worker.id),
        status: worker.status,
        heartbeat: worker.heartbeat,
        currentTask: worker.currentTask,
    }));

    const allTasksTerminal = tasks.length > 0 && tasks.every((task) => TERMINAL_STATUSES.has(task.status));
    let phaseDetail = state.phaseDetail;
    let phase = state.phase;

    const recommendations = buildRecommendations({ state, tasks: snapshotTasks, staleWorkers, reclaimedTasks });
    if (options.autoAdvancePhase && allTasksTerminal && phaseDetail !== 'verify' && phaseDetail !== 'fix') {
        phaseDetail = await advanceTeamPhase(teamName, 'verify');
        phase = PHASE_FROM_DETAIL[phaseDetail];
        recommendations.push('Advanced team phase to verify because all tasks are in a terminal state.');
    }

    const snapshot: TeamSnapshot = {
        teamName,
        phase,
        workers: workerSummary,
        tasks: snapshotTasks,
        allTasksTerminal,
        staleWorkers,
        recommendations,
    };

    if (options.archiveOnTick) {
        await archiveSnapshot(teamName, snapshot);
    } else {
        latestSnapshots.set(teamName, snapshot);
    }

    return snapshot;
}

function summarizeTasks(tasks: TaskState[]): TeamSnapshot['tasks'] {
    const summary: TeamSnapshot['tasks'] = {
        total: tasks.length,
        pending: 0,
        inProgress: 0,
        completed: 0,
        failed: 0,
    };

    for (const task of tasks) {
        switch (task.status) {
            case 'pending':
            case 'blocked':
                summary.pending += 1;
                break;
            case 'in_progress':
                summary.inProgress += 1;
                break;
            case 'completed':
                summary.completed += 1;
                break;
            case 'failed':
            case 'cancelled':
                summary.failed += 1;
                break;
        }
    }

    return summary;
}

function buildRecommendations(input: {
    state: TeamStateWithDetails;
    tasks: TeamSnapshot['tasks'];
    staleWorkers: string[];
    reclaimedTasks: string[];
}): string[] {
    const recs: string[] = [];
    if (input.staleWorkers.length > 0) {
        recs.push(`Workers ${input.staleWorkers.join(', ')} missed heartbeats. Consider reassigning their work.`);
    }
    if (input.tasks.pending > 0 && input.state.workers.length === 0) {
        recs.push('Pending tasks exist but no workers are active. Spawn or resume worker panes.');
    }
    if (input.reclaimedTasks.length > 0) {
        recs.push(`Released ${input.reclaimedTasks.length} stale task claim(s). Assign them manually if needed.`);
    }
    if (input.tasks.total === 0) {
        recs.push('Define tasks for the team goal to keep progress measurable.');
    }
    return recs;
}
export async function shutdownTeam(teamName: string, options: TeamShutdownOptions = {}): Promise<TeamSnapshot | null> {
    const runtime = runtimeRegistry.get(teamName);
    if (runtime?.monitorInterval) {
        clearInterval(runtime.monitorInterval);
    }
    runtimeRegistry.delete(teamName);

    const workers = await listWorkers(teamName);
    await Promise.all(
        workers.map((worker) =>
            sendMailboxMessage(teamName, {
                workerId: worker.id,
                from: options.signalFrom ?? DEFAULT_SIGNAL_FROM,
                body: JSON.stringify({ type: 'shutdown', reason: options.reason ?? 'team shutdown' }),
            })
        )
    );

    await sleep(options.waitMs ?? DEFAULT_SHUTDOWN_WAIT_MS);

    const sessionTarget = runtime?.sessionName ?? teamSessionName(teamName);
    await killSession(sessionTarget);

    const snapshot = options.archiveSnapshot === false ? null : await monitorTeam(teamName).catch(() => null);
    if (snapshot) {
        snapshot.recommendations.push('Team shutdown completed.');
    }

    await emit('team:stop', { teamName, reason: options.reason });
    await Promise.all(workers.map((worker) => emit('worker:exit', { teamName, workerId: worker.id })));

    return snapshot;
}

export async function resumeTeam(teamName: string): Promise<TeamRuntime> {
    const manifest = await readTeamManifest(teamName);
    if (!manifest) {
        throw new Error(`Team ${teamName} not found.`);
    }

    const existing = runtimeRegistry.get(teamName);
    if (existing) {
        return existing;
    }

    const workers = await listWorkers(teamName);
    await ensureSession(manifest, process.cwd(), workers.length || 1);

    mergeMonitorOptions(teamName);
    const monitorInterval = scheduleMonitor(teamName);

    const runtime: TeamRuntime = {
        teamName: manifest.name,
        sessionName: teamSessionName(manifest.name),
        cwd: process.cwd(),
        monitorInterval,
    };
    runtimeRegistry.set(manifest.name, runtime);

    await emit('team:start', { teamName: manifest.name, goal: manifest.goal, leaderId: manifest.leaderId, resumed: true });
    await monitorTeam(teamName);

    return runtime;
}

export async function assignTask(teamName: string, taskId: string, workerId: string): Promise<TaskState> {
    const workers = await listWorkers(teamName);
    const worker = workers.find((w) => w.id === workerId);
    if (!worker) {
        throw new Error(`Worker ${workerId} is not registered with team ${teamName}.`);
    }

    const { task, claimToken } = await claimTask(teamName, taskId, workerId);
    await sendMailboxMessage(teamName, {
        workerId,
        from: DEFAULT_SIGNAL_FROM,
        body: JSON.stringify({ type: 'task-assigned', taskId, claimToken }),
    });
    await emit('task:start', { teamName, taskId, workerId });

    return toPublicTask(task);
}

export function getTeamRuntime(teamName: string): TeamRuntime | undefined {
    return runtimeRegistry.get(teamName);
}

export function getLatestSnapshot(teamName: string): TeamSnapshot | undefined {
    return latestSnapshots.get(teamName);
}
