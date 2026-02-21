import { describe, it, expect } from 'vitest';
import { createOrchestrationState, transitionPhase, isValidTransition } from '../../src/team/orchestrator.js';

describe('orchestrator', () => {
    it('creates initial state correctly', () => {
        const state = createOrchestrationState('Test goal');
        expect(state.phase).toBe('plan');
        expect(state.active).toBe(true);
    });

    it('validates transitions correctly', () => {
        expect(isValidTransition('plan', 'prd')).toBe(true);
        expect(isValidTransition('plan', 'exec')).toBe(false);
        expect(isValidTransition('verify', 'fix')).toBe(true);
    });

    it('handles phase transitions', () => {
        let state = createOrchestrationState('Test goal');
        state = transitionPhase(state, 'prd');
        expect(state.phase).toBe('prd');
        state = transitionPhase(state, 'exec');
        expect(state.phase).toBe('exec');
    });
});
