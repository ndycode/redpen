import type {
    Heartbeat,
    TaskState,
    TaskStatus,
    TeamManifest,
    TeamState as PublicTeamState,
    WorkerInbox,
    WorkerInboxMessage,
    WorkerState,
} from '../types/index.js';

export type TeamPhase = 'plan' | 'prd' | 'exec' | 'verify' | 'fix';

export interface TeamManifestInput {
    name: string;
    goal: string;
    leaderId: string;
    tmuxSession?: string;
}

export interface PersistedTeamState {
    name: string;
    phase: TeamPhase;
    nextTaskId: number;
}

export interface TaskClaim {
    owner: string;
    token: string;
    leasedUntil: string;
}

export interface StoredTask extends TaskState {
    createdAt: string;
    updatedAt: string;
    claim?: TaskClaim;
}

export interface CreateTaskInput extends Omit<TaskState, 'id' | 'status'> {
    status?: TaskStatus;
}

export interface TaskClaimResult {
    task: StoredTask;
    claimToken: string;
}

export interface WorkerRecord extends WorkerState {
    registeredAt: string;
}

export interface WorkerRegistrationInput {
    id: string;
    role: string;
}

export interface WorkerHeartbeatInfo extends Heartbeat {
    status: WorkerState['status'];
}

export interface MailboxMessage extends WorkerInboxMessage {
    readAt?: string;
}

export interface MailboxState extends WorkerInbox {
    messages: MailboxMessage[];
}

export interface TeamDirectories {
    root: string;
    manifest: string;
    state: string;
    tasks: string;
    workers: string;
    mailbox: string;
    locks: string;
}

export interface TeamStateWithDetails extends PublicTeamState {
    phaseDetail: TeamPhase;
}

export interface ClaimOptions {
    leaseDurationMs?: number;
}

export interface WorkerStalenessOptions {
    thresholdMs?: number;
}

export interface MailboxMessageInput {
    workerId: string;
    from: string;
    body: string;
}

export type {
    Heartbeat,
    TaskState,
    TaskStatus,
    TeamManifest,
    WorkerInbox,
    WorkerInboxMessage,
    WorkerState,
    PublicTeamState,
};
