/**
 * Priority levels for tasks.
 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Possible states for a task in the lifecycle.
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked' | 'cancelled';

/**
 * State of a single task within a team.
 */
export interface TaskState {
  /** Unique task identifier */
  id: string;
  /** Current status of the task */
  status: TaskStatus;
  /** Worker ID currently assigned to the task */
  assignee?: string;
  /** Importance level */
  priority: TaskPriority;
  /** Brief description of what needs to be done */
  description: string;
  /** Detailed summary of results or errors */
  result?: string;
  /** Task IDs that this task depends on */
  depends_on?: string[];
}

/**
 * State of an individual worker in the team.
 */
export interface WorkerState {
  /** Unique worker identifier */
  id: string;
  /** Current operational status */
  status: 'idle' | 'working' | 'offline';
  /** ISO timestamp of the last heartbeat */
  heartbeat: string;
  /** ID of the task currently being processed */
  currentTask?: string;
  /** Agent role assigned to this worker */
  role: string;
}

/**
 * Message in a worker's incoming queue.
 */
export interface WorkerInboxMessage {
  /** Unique message identifier */
  id: string;
  /** ID of the sending worker or leader */
  from: string;
  /** Content of the message */
  body: string;
  /** ISO timestamp */
  timestamp: string;
}

/**
 * Collection of messages for a worker.
 */
export interface WorkerInbox {
  /** Worker ID */
  workerId: string;
  /** List of unread or historical messages */
  messages: WorkerInboxMessage[];
}

/**
 * Heartbeat data sent by workers to indicate health.
 */
export interface Heartbeat {
  /** Worker ID */
  workerId: string;
  /** System process ID */
  pid: number;
  /** ISO timestamp */
  timestamp: string;
}

/**
 * High-level phase of the team orchestration.
 */
export type PhaseState = 'planning' | 'execution' | 'review' | 'teardown';

/**
 * Shared state of a multi-agent team.
 */
export interface TeamState {
  /** Overall team name or mission */
  name: string;
  /** Current operational phase */
  phase: PhaseState;
  /** All tasks defined for the mission */
  tasks: TaskState[];
  /** Current state of all joined workers */
  workers: WorkerState[];
  /** Task ID to follow next */
  nextTaskId: number;
}

/**
 * Static manifest describing a team's permanent properties.
 */
export interface TeamManifest {
  /** Team name */
  name: string;
  /** The primary task or goal */
  goal: string;
  /** The leader's worker ID */
  leaderId: string;
  /** Tmux session name where the team operates */
  tmuxSession: string;
  /** When the team was initiated */
  createdAt: string;
}

/**
 * Configuration options for spawning a team.
 */
export interface TeamConfig {
  /** Maximum number of concurrent workers */
  maxWorkers: number;
  /** Default agent types to use if not specified */
  defaultRoles: string[];
  /** Whether to use a dedicated tmux session */
  useTmux: boolean;
  /** Interval for worker health checks (ms) */
  heartbeatInterval: number;
}
