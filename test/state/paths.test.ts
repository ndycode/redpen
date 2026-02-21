import { describe, it, expect } from 'vitest';
import { getStateDir, getTeamDir, getSkillsDir } from '../../src/state/paths.js';

describe('paths', () => {
    it('resolves state directory', () => {
        const dir = getStateDir();
        expect(typeof dir).toBe('string');
        expect(dir.length).toBeGreaterThan(0);
    });

    it('resolves team directory', async () => {
        const dir = await getTeamDir();
        expect(typeof dir).toBe('string');
        expect(dir.length).toBeGreaterThan(0);
    });

    it('resolves skills directory', async () => {
        const dir = await getSkillsDir();
        expect(typeof dir).toBe('string');
        expect(dir.length).toBeGreaterThan(0);
    });
});
