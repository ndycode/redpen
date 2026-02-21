const DEFAULT_MAX_FIX_ATTEMPTS = 3;

export type OrchestratorPhase = 'plan' | 'prd' | 'exec' | 'verify' | 'fix';
export type TerminalPhase = 'complete' | 'failed' | 'cancelled';
export type Phase = OrchestratorPhase | TerminalPhase;

export interface PhaseTransition {
    from: Phase;
    to: Phase;
    at: string;
    reason?: string;
}

export interface OrchestrationState {
    active: boolean;
    phase: Phase;
    taskDescription: string;
    createdAt: string;
    phaseTransitions: PhaseTransition[];
    maxFixAttempts: number;
    currentFixAttempt: number;
}

const TERMINAL_PHASES: readonly TerminalPhase[] = ['complete', 'failed', 'cancelled'];

const TRANSITIONS: Record<OrchestratorPhase, ReadonlyArray<Phase>> = {
    plan: ['prd'],
    prd: ['exec'],
    exec: ['verify'],
    verify: ['fix', 'complete', 'failed'],
    fix: ['exec', 'verify', 'complete', 'failed'],
};

const PHASE_AGENT_MAP: Record<OrchestratorPhase, readonly string[]> = {
    plan: ['analyst', 'planner', 'architect'],
    prd: ['product-manager', 'analyst', 'ux-researcher', 'information-architect'],
    exec: ['executor', 'designer', 'test-engineer', 'qa-tester'],
    verify: ['verifier', 'quality-reviewer', 'security-reviewer', 'qa-tester'],
    fix: ['debugger', 'executor', 'build-fixer', 'test-engineer'],
};

const PHASE_INSTRUCTION_MAP: Record<Phase, string> = {
    plan: 'Synthesize requirements, surface constraints, and outline acceptance criteria before drafting the PRD.',
    prd: 'Produce a crisp PRD with personas, user stories, and success metrics that guide execution scope.',
    exec: 'Implement the agreed plan with high-discipline commits, keeping work small and traceable.',
    verify: 'Exhaustively test, collect evidence, and challenge assumptions before approving delivery.',
    fix: 'Address regressions uncovered in verify, coordinate retests, and keep the loop tight.',
    complete: 'Archive artifacts, summarize outcomes, and release all resources.',
    failed: 'Document the failure, capture diagnostics, and escalate for follow-up.',
    cancelled: 'Stop all work, record rationale, and release partial results if safe.',
};

export function createOrchestrationState(
    taskDescription: string,
    maxFixAttempts = DEFAULT_MAX_FIX_ATTEMPTS
): OrchestrationState {
    if (!taskDescription.trim()) {
        throw new Error('taskDescription must not be empty.');
    }
    if (maxFixAttempts < 1) {
        throw new Error('maxFixAttempts must be at least 1.');
    }
    const now = new Date().toISOString();
    return {
        active: true,
        phase: 'plan',
        taskDescription,
        createdAt: now,
        phaseTransitions: [],
        maxFixAttempts,
        currentFixAttempt: 0,
    };
}

export function isTerminalPhase(phase: Phase): phase is TerminalPhase {
    return TERMINAL_PHASES.includes(phase as TerminalPhase);
}

export function isValidTransition(from: Phase, to: Phase): boolean {
    if (isTerminalPhase(from)) return false;
    const allowed = TRANSITIONS[from];
    return allowed?.includes(to) ?? false;
}

export function transitionPhase(state: OrchestrationState, targetPhase: Phase, reason?: string): OrchestrationState {
    const from = state.phase;
    if (isTerminalPhase(from)) {
        throw new Error(`Cannot transition from terminal phase: ${from}`);
    }
    if (!isValidTransition(from, targetPhase)) {
        throw new Error(`Invalid transition: ${from} -> ${targetPhase}`);
    }

    const timestamp = new Date().toISOString();
    const nextFixAttempt = targetPhase === 'fix' ? state.currentFixAttempt + 1 : state.currentFixAttempt;

    if (targetPhase === 'fix' && nextFixAttempt > state.maxFixAttempts) {
        const failureReason = reason ?? `fix loop limit reached (${state.maxFixAttempts})`;
        return {
            ...state,
            active: false,
            phase: 'failed',
            phaseTransitions: [...state.phaseTransitions, { from, to: 'failed', at: timestamp, reason: failureReason }],
        };
    }

    const isTerminal = isTerminalPhase(targetPhase);
    return {
        ...state,
        phase: targetPhase,
        active: !isTerminal,
        currentFixAttempt: nextFixAttempt,
        phaseTransitions: [...state.phaseTransitions, { from, to: targetPhase, at: timestamp, reason }],
    };
}

export function canResume(state: OrchestrationState): boolean {
    if (!state.active) return false;
    if (isTerminalPhase(state.phase)) return false;
    return true;
}

export function getPhaseAgents(phase: Phase): string[] {
    if (isTerminalPhase(phase)) {
        return [];
    }
    return [...PHASE_AGENT_MAP[phase]];
}

export function getPhaseInstructions(phase: Phase): string {
    return PHASE_INSTRUCTION_MAP[phase];
}
