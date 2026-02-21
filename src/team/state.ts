import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { atomicReadJSON, atomicWriteJSON, getTeamDir, withLock } from '../state/index.js';
import type {
    ClaimOptions,
    CreateTaskInput,
    MailboxMessage,
    MailboxMessageInput,
    MailboxState,
    PersistedTeamState,
    StoredTask,
    TaskClaim,
    TaskClaimResult,
    TeamDirectories,
    TeamManifest,
    TeamManifestInput,
    TeamPhase,
    TeamStateWithDetails,
    WorkerRecord,
    WorkerRegistrationInput,
    WorkerStalenessOptions,
} from './types.js';
import type { TaskState, TeamState, WorkerState } from '../types/index.js';

const TASK_FILE_PREFIX = 'task-';
const TASK_FILE_REGEX = /^task-(\d+)\.json$/;
const DEFAULT_CLAIM_LEASE_MS = 15 * 60 * 1000;
const DEFAULT_STALE_WORKER_MS = 2 * 60 * 1000;
const TEAM_PHASE_SEQUENCE: TeamPhase[] = ['plan', 'prd', 'exec', 'verify', 'fix'];
const TEAM_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{2,32}$/;

const PHASE_TO_PUBLIC: Record<TeamPhase, TeamState['phase']> = {
    plan: 'planning',
    prd: 'planning',
    exec: 'execution',
    verify: 'review',
    fix: 'teardown',
};

async function resolveTeamDirectories(teamName: string): Promise<TeamDirectories> {
    const rootBase = await getTeamDir();
    const root = join(rootBase, teamName);
    const manifest = join(root, 'manifest.json');
    const state = join(root, 'state.json');
    const tasks = join(root, 'tasks');
    const workers = join(root, 'workers');
    const mailbox = join(root, 'mailbox');
    const locks = join(root, '.locks');

    await Promise.all([
        mkdir(root, { recursive: true }),
        mkdir(tasks, { recursive: true }),
        mkdir(workers, { recursive: true }),
        mkdir(mailbox, { recursive: true }),
        mkdir(locks, { recursive: true }),
    ]);

    return { root, manifest, state, tasks, workers, mailbox, locks };
}

function ensureValidTeamName(name: string): void {
    if (!TEAM_NAME_PATTERN.test(name)) {
        throw new Error('Team name must be lowercase alphanumeric with optional hyphens (min 3 chars).');
    }
}

export function validateTeamManifest(manifest: TeamManifestInput | TeamManifest): void {
    ensureValidTeamName(manifest.name);
    if (!manifest.goal.trim()) {
        throw new Error('Team goal must not be empty.');
    }
    if (!manifest.leaderId.trim()) {
        throw new Error('Leader ID must not be empty.');
    }
    if ('tmuxSession' in manifest && manifest.tmuxSession && !manifest.tmuxSession.trim()) {
        throw new Error('tmuxSession, when provided, must not be blank.');
    }
}

export async function createTeamManifest(input: TeamManifestInput): Promise<TeamManifest> {
    validateTeamManifest(input);
    const paths = await resolveTeamDirectories(input.name);
    if (existsSync(paths.manifest)) {
        throw new Error(`Team ${input.name} already exists.`);
    }

    const manifest: TeamManifest = {
        name: input.name,
        goal: input.goal,
        leaderId: input.leaderId,
        tmuxSession: input.tmuxSession ?? `redpen-team-${input.name}`,
        createdAt: new Date().toISOString(),
    };

    await atomicWriteJSON(paths.manifest, manifest);
    await atomicWriteJSON<PersistedTeamState>(paths.state, {
        name: manifest.name,
        phase: 'plan',
        nextTaskId: 1,
    });
    return manifest;
}

export async function readTeamManifest(teamName: string): Promise<TeamManifest | null> {
    const paths = await resolveTeamDirectories(teamName);
    if (!existsSync(paths.manifest)) return null;
    return atomicReadJSON<TeamManifest | null>(paths.manifest, null);
}

export async function updateTeamManifest(
    teamName: string,
    updates: Partial<Omit<TeamManifest, 'name' | 'createdAt'>>
): Promise<TeamManifest> {
    const current = await readTeamManifest(teamName);
    if (!current) {
        throw new Error(`Team ${teamName} not found.`);
    }

    const merged: TeamManifest = {
        ...current,
        ...updates,
        name: current.name,
        createdAt: current.createdAt,
    };
    validateTeamManifest(merged);
    const paths = await resolveTeamDirectories(teamName);
    await atomicWriteJSON(paths.manifest, merged);
    return merged;
}

async function readPersistedState(paths: TeamDirectories): Promise<PersistedTeamState> {
    const fallback: PersistedTeamState = {
        name: basename(paths.root),
        phase: 'plan',
        nextTaskId: 1,
    };
    return atomicReadJSON(paths.state, fallback);
}

async function writePersistedState(paths: TeamDirectories, state: PersistedTeamState): Promise<void> {
    await atomicWriteJSON(paths.state, state);
}

function toPublicTask(task: StoredTask): TaskState {
    const { createdAt: _c, updatedAt: _u, claim: _claim, ...rest } = task;
    return rest;
}

function toPublicWorker(worker: WorkerRecord): WorkerState {
    const { registeredAt: _r, ...rest } = worker;
    return rest;
}

function getTaskFilePath(paths: TeamDirectories, taskId: string): string {
    return join(paths.tasks, `${TASK_FILE_PREFIX}${taskId}.json`);
}

async function readTaskRecord(paths: TeamDirectories, taskId: string): Promise<StoredTask | null> {
    const filePath = getTaskFilePath(paths, taskId);
    if (!existsSync(filePath)) return null;
    return atomicReadJSON<StoredTask | null>(filePath, null);
}

async function writeTaskRecord(paths: TeamDirectories, task: StoredTask): Promise<void> {
    await atomicWriteJSON(getTaskFilePath(paths, task.id), task);
}

async function listTaskRecords(paths: TeamDirectories): Promise<StoredTask[]> {
    const entries = await readdir(paths.tasks, { withFileTypes: true });
    const ids = entries
        .map((entry) => entry.name.match(TASK_FILE_REGEX)?.[1])
        .filter((id): id is string => Boolean(id))
        .sort((a, b) => Number(a) - Number(b));

    const tasks: StoredTask[] = [];
    for (const id of ids) {
        const record = await readTaskRecord(paths, id);
        if (record) tasks.push(record);
    }
    return tasks;
}

function sanitizeTaskInput(input: CreateTaskInput): CreateTaskInput {
    return {
        ...input,
        priority: input.priority ?? 'medium',
        depends_on: input.depends_on ?? [],
    };
}

function isClaimActive(claim?: TaskClaim | null): boolean {
    if (!claim) return false;
    const expiry = Date.parse(claim.leasedUntil);
    if (!Number.isFinite(expiry)) return false;
    return expiry > Date.now();
}

function nextPhase(current: TeamPhase, target: TeamPhase): void {
    const currentIdx = TEAM_PHASE_SEQUENCE.indexOf(current);
    const targetIdx = TEAM_PHASE_SEQUENCE.indexOf(target);
    if (targetIdx === -1) {
        throw new Error(`Unknown phase: ${target}`);
    }
    if (targetIdx < currentIdx) {
        throw new Error(`Cannot move backwards from ${current} to ${target}.`);
    }
    if (targetIdx > currentIdx + 1) {
        throw new Error(`Cannot skip phases: ${current} -> ${target}.`);
    }
}

async function withResourceLock<T>(
    teamName: string,
    resource: string,
    fn: (paths: TeamDirectories) => Promise<T>
): Promise<T> {
    const paths = await resolveTeamDirectories(teamName);
    const lockPath = join(paths.locks, `${resource}.lock`);
    return withLock(lockPath, () => fn(paths));
}

export async function getTeamState(teamName: string): Promise<TeamStateWithDetails> {
    const manifest = await readTeamManifest(teamName);
    if (!manifest) {
        throw new Error(`Team ${teamName} not found.`);
    }
    const paths = await resolveTeamDirectories(teamName);
    const persisted = await readPersistedState(paths);
    const tasks = await listTaskRecords(paths);
    const workers = await listWorkerRecords(paths);

    return {
        name: manifest.name,
        phase: PHASE_TO_PUBLIC[persisted.phase],
        tasks: tasks.map(toPublicTask),
        workers: workers.map(toPublicWorker),
        nextTaskId: persisted.nextTaskId,
        phaseDetail: persisted.phase,
    };
}

export async function getTeamPhase(teamName: string): Promise<TeamPhase> {
    const paths = await resolveTeamDirectories(teamName);
    const persisted = await readPersistedState(paths);
    return persisted.phase;
}

export async function advanceTeamPhase(teamName: string, targetPhase: TeamPhase): Promise<TeamPhase> {
    return withResourceLock(teamName, 'phase', async (paths) => {
        const current = await readPersistedState(paths);
        if (current.phase === targetPhase) return current.phase;
        nextPhase(current.phase, targetPhase);
        const updated: PersistedTeamState = { ...current, phase: targetPhase };
        await writePersistedState(paths, updated);
        return updated.phase;
    });
}

export async function createTask(teamName: string, rawInput: CreateTaskInput): Promise<StoredTask> {
    const input = sanitizeTaskInput(rawInput);
    return withResourceLock(teamName, 'tasks', async (paths) => {
        const persisted = await readPersistedState(paths);
        const id = String(persisted.nextTaskId);
        const now = new Date().toISOString();
        const task: StoredTask = {
            ...input,
            id,
            status: input.status ?? 'pending',
            assignee: input.assignee,
            createdAt: now,
            updatedAt: now,
        };
        await writeTaskRecord(paths, task);
        await writePersistedState(paths, { ...persisted, nextTaskId: persisted.nextTaskId + 1 });
        return task;
    });
}

export async function readTask(teamName: string, taskId: string): Promise<TaskState | null> {
    const paths = await resolveTeamDirectories(teamName);
    const task = await readTaskRecord(paths, taskId);
    return task ? toPublicTask(task) : null;
}

export async function readTaskRecordWithMetadata(teamName: string, taskId: string): Promise<StoredTask | null> {
    const paths = await resolveTeamDirectories(teamName);
    return readTaskRecord(paths, taskId);
}

export async function listTasks(teamName: string): Promise<TaskState[]> {
    const paths = await resolveTeamDirectories(teamName);
    const tasks = await listTaskRecords(paths);
    return tasks.map(toPublicTask);
}

async function assertDependenciesCompleted(paths: TeamDirectories, task: StoredTask): Promise<void> {
    const deps = task.depends_on ?? [];
    for (const depId of deps) {
        const dep = await readTaskRecord(paths, depId);
        if (!dep || dep.status !== 'completed') {
            throw new Error(`Task ${task.id} depends on ${depId} which is not completed.`);
        }
    }
}

export async function claimTask(
    teamName: string,
    taskId: string,
    workerId: string,
    options?: ClaimOptions
): Promise<TaskClaimResult> {
    return withResourceLock(teamName, `task-${taskId}`, async (paths) => {
        const task = await readTaskRecord(paths, taskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found.`);
        }

        await assertDependenciesCompleted(paths, task);

        if (isClaimActive(task.claim) && task.claim!.owner !== workerId) {
            throw new Error(`Task ${taskId} is already claimed.`);
        }

        const now = new Date().toISOString();
        const leaseMs = options?.leaseDurationMs ?? DEFAULT_CLAIM_LEASE_MS;
        const claim: TaskClaim = {
            owner: workerId,
            token: randomUUID(),
            leasedUntil: new Date(Date.now() + leaseMs).toISOString(),
        };

        const updated: StoredTask = {
            ...task,
            status: 'in_progress',
            assignee: workerId,
            updatedAt: now,
            claim,
        };
        await writeTaskRecord(paths, updated);
        return { task: updated, claimToken: claim.token };
    });
}

export async function renewTaskLease(
    teamName: string,
    taskId: string,
    claimToken: string,
    options?: ClaimOptions
): Promise<StoredTask> {
    return withResourceLock(teamName, `task-${taskId}`, async (paths) => {
        const task = await readTaskRecord(paths, taskId);
        if (!task || !task.claim || task.claim.token !== claimToken) {
            throw new Error('Claim token is invalid or has expired.');
        }
        const leaseMs = options?.leaseDurationMs ?? DEFAULT_CLAIM_LEASE_MS;
        const updated: StoredTask = {
            ...task,
            claim: {
                ...task.claim,
                leasedUntil: new Date(Date.now() + leaseMs).toISOString(),
            },
            updatedAt: new Date().toISOString(),
        };
        await writeTaskRecord(paths, updated);
        return updated;
    });
}

async function resolveClaimedTask(paths: TeamDirectories, taskId: string, claimToken: string): Promise<StoredTask> {
    const task = await readTaskRecord(paths, taskId);
    if (!task || !task.claim || task.claim.token !== claimToken) {
        throw new Error('Claim token is invalid or stale.');
    }
    return task;
}

export async function completeTask(
    teamName: string,
    taskId: string,
    claimToken: string,
    result?: string
): Promise<StoredTask> {
    return withResourceLock(teamName, `task-${taskId}`, async (paths) => {
        const task = await resolveClaimedTask(paths, taskId, claimToken);
        const updated: StoredTask = {
            ...task,
            status: 'completed',
            result,
            claim: undefined,
            assignee: task.assignee,
            updatedAt: new Date().toISOString(),
        };
        await writeTaskRecord(paths, updated);
        return updated;
    });
}

export async function failTask(
    teamName: string,
    taskId: string,
    claimToken: string,
    errorMessage?: string
): Promise<StoredTask> {
    return withResourceLock(teamName, `task-${taskId}`, async (paths) => {
        const task = await resolveClaimedTask(paths, taskId, claimToken);
        const updated: StoredTask = {
            ...task,
            status: 'failed',
            result: errorMessage,
            claim: undefined,
            updatedAt: new Date().toISOString(),
        };
        await writeTaskRecord(paths, updated);
        return updated;
    });
}

export async function releaseTaskClaim(teamName: string, taskId: string, claimToken: string): Promise<StoredTask> {
    return withResourceLock(teamName, `task-${taskId}`, async (paths) => {
        const task = await resolveClaimedTask(paths, taskId, claimToken);
        const updated: StoredTask = {
            ...task,
            status: 'pending',
            assignee: undefined,
            claim: undefined,
            updatedAt: new Date().toISOString(),
        };
        await writeTaskRecord(paths, updated);
        return updated;
    });
}

export async function unclaimStaleTasks(teamName: string): Promise<string[]> {
    const paths = await resolveTeamDirectories(teamName);
    const tasks = await listTaskRecords(paths);
    const released: string[] = [];
    for (const task of tasks) {
        if (!isClaimActive(task.claim) && task.claim) {
            const updated: StoredTask = {
                ...task,
                status: 'pending',
                assignee: undefined,
                claim: undefined,
                updatedAt: new Date().toISOString(),
            };
            await writeTaskRecord(paths, updated);
            released.push(task.id);
        }
    }
    return released;
}

function workerStatePath(paths: TeamDirectories, workerId: string): string {
    return join(paths.workers, workerId, 'state.json');
}

async function readWorkerRecord(paths: TeamDirectories, workerId: string): Promise<WorkerRecord | null> {
    const filePath = workerStatePath(paths, workerId);
    if (!existsSync(filePath)) return null;
    return atomicReadJSON<WorkerRecord | null>(filePath, null);
}

async function writeWorkerRecord(paths: TeamDirectories, worker: WorkerRecord): Promise<void> {
    await atomicWriteJSON(workerStatePath(paths, worker.id), worker);
}

async function listWorkerRecords(paths: TeamDirectories): Promise<WorkerRecord[]> {
    const entries = await readdir(paths.workers, { withFileTypes: true });
    const workers: WorkerRecord[] = [];
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const record = await readWorkerRecord(paths, entry.name);
        if (record) workers.push(record);
    }
    return workers;
}

export async function registerWorker(teamName: string, worker: WorkerRegistrationInput): Promise<WorkerRecord> {
    ensureValidTeamName(teamName);
    return withResourceLock(teamName, `worker-${worker.id}`, async (paths) => {
        const dir = join(paths.workers, worker.id);
        await mkdir(dir, { recursive: true });
        const now = new Date().toISOString();
        const record: WorkerRecord = {
            id: worker.id,
            role: worker.role,
            status: 'idle',
            heartbeat: now,
            currentTask: undefined,
            registeredAt: now,
        };
        await writeWorkerRecord(paths, record);
        return record;
    });
}

export async function updateWorkerStatus(
    teamName: string,
    workerId: string,
    updates: Partial<Pick<WorkerState, 'status' | 'currentTask' | 'role'>>
): Promise<WorkerRecord> {
    return withResourceLock(teamName, `worker-${workerId}`, async (paths) => {
        const current = await readWorkerRecord(paths, workerId);
        if (!current) {
            throw new Error(`Worker ${workerId} not registered.`);
        }
        const updated: WorkerRecord = {
            ...current,
            ...updates,
            heartbeat: updates.status ? new Date().toISOString() : current.heartbeat,
        };
        await writeWorkerRecord(paths, updated);
        return updated;
    });
}

export async function recordWorkerHeartbeat(
    teamName: string,
    workerId: string,
    timestamp = new Date().toISOString()
): Promise<WorkerRecord> {
    return withResourceLock(teamName, `worker-${workerId}`, async (paths) => {
        const current = await readWorkerRecord(paths, workerId);
        if (!current) {
            throw new Error(`Worker ${workerId} not registered.`);
        }
        const updated: WorkerRecord = { ...current, heartbeat: timestamp };
        await writeWorkerRecord(paths, updated);
        return updated;
    });
}

export async function listWorkers(teamName: string): Promise<WorkerState[]> {
    const paths = await resolveTeamDirectories(teamName);
    const workers = await listWorkerRecords(paths);
    return workers.map(toPublicWorker);
}

export async function detectNonReportingWorkers(teamName: string, options?: WorkerStalenessOptions): Promise<string[]> {
    const threshold = options?.thresholdMs ?? DEFAULT_STALE_WORKER_MS;
    const paths = await resolveTeamDirectories(teamName);
    const entries = await readdir(paths.workers, { withFileTypes: true });
    const now = Date.now();
    const stale: string[] = [];

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const workerId = entry.name;
        const filePath = workerStatePath(paths, workerId);
        if (!existsSync(filePath)) continue;
        const info = await stat(filePath);
        if (now - info.mtimeMs > threshold) {
            stale.push(workerId);
        }
    }
    return stale;
}

function mailboxFilePath(paths: TeamDirectories, workerId: string): string {
    return join(paths.mailbox, `${workerId}.json`);
}

async function readMailbox(paths: TeamDirectories, workerId: string): Promise<MailboxState> {
    const filePath = mailboxFilePath(paths, workerId);
    if (!existsSync(filePath)) {
        return { workerId, messages: [] };
    }
    return atomicReadJSON<MailboxState>(filePath, { workerId, messages: [] });
}

async function writeMailbox(paths: TeamDirectories, mailbox: MailboxState): Promise<void> {
    await atomicWriteJSON(mailboxFilePath(paths, mailbox.workerId), mailbox);
}

export async function sendMailboxMessage(teamName: string, message: MailboxMessageInput): Promise<MailboxMessage> {
    return withResourceLock(teamName, `mailbox-${message.workerId}`, async (paths) => {
        const mailbox = await readMailbox(paths, message.workerId);
        const entry: MailboxMessage = {
            id: randomUUID(),
            from: message.from,
            body: message.body,
            timestamp: new Date().toISOString(),
        };
        mailbox.messages.push(entry);
        await writeMailbox(paths, mailbox);
        return entry;
    });
}

export async function listMailboxMessages(teamName: string, workerId: string): Promise<MailboxMessage[]> {
    const paths = await resolveTeamDirectories(teamName);
    const mailbox = await readMailbox(paths, workerId);
    return mailbox.messages;
}

export async function markMailboxMessageRead(teamName: string, workerId: string, messageId: string): Promise<boolean> {
    return withResourceLock(teamName, `mailbox-${workerId}`, async (paths) => {
        const mailbox = await readMailbox(paths, workerId);
        const message = mailbox.messages.find((m) => m.id === messageId);
        if (!message) return false;
        if (!('readAt' in message) || !message.readAt) {
            Object.assign(message, { readAt: new Date().toISOString() });
            await writeMailbox(paths, mailbox);
        }
        return true;
    });
}
