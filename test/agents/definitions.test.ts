import { describe, it, expect } from 'vitest';
import { AGENT_DEFINITIONS, getAgent } from '../../src/agents/index.js';

describe('agent definitions', () => {
    it('loads 31 agents', () => {
        expect(AGENT_DEFINITIONS.length).toBe(31);
    });

    it('can fetch specific agent by name', () => {
        const agent = getAgent('executor');
        expect(agent).toBeDefined();
        expect(agent?.name).toBe('executor');
        expect(agent?.category).toBe('execution');
    });
});
